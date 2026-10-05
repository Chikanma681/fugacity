import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

import { getUnitDefinition } from '@src/flowsheet/registry'
import type { FlowNode, FlowsheetState, UnitType } from '@src/flowsheet/types'
import { TaskQueue } from '@src/lib/store/queue'

type NodeRow = {
  id: string
  tag: string
  node_type: string
  unit_operation: UnitType | null
  layout_json: string
}

type PortRow = {
  name: string
  direction: 'inlet' | 'outlet'
  medium: 'material' | 'energy'
}

export class FlowsheetStore {
  private readonly flowsheetId: string
  private readonly queue: TaskQueue<{ state: FlowsheetState }, void>

  constructor(
    private readonly database: Database.Database,
    private readonly name: string
  ) {
    const flowsheet = database
      .prepare('SELECT id FROM flowsheets ORDER BY created_at, id LIMIT 1')
      .get() as { id: string } | undefined
    this.flowsheetId = flowsheet?.id ?? randomUUID()
    this.queue = new TaskQueue(({ state }, done) => {
      try {
        this.write(state)
        done(null)
      } catch (error) {
        done(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  private readNode(row: NodeRow): FlowNode {
    const unitType =
      row.node_type === 'material_stream'
        ? 'MaterialStream'
        : row.node_type === 'energy_stream'
          ? 'EnergyStream'
          : row.unit_operation
    const definition = unitType && getUnitDefinition(unitType)
    if (!unitType || !definition) {
      // eslint-disable-next-line suggest-no-throw/suggest-no-throw -- Unsupported persisted nodes must fail loading rather than be silently lost.
      throw new Error(`Unsupported unit operation for node ${row.tag}`)
    }
    const layout = JSON.parse(row.layout_json) as Partial<FlowNode>
    const savedPorts = layout.ports ?? definition.ports
    const portRows = this.database
      .prepare(
        'SELECT name, direction, medium FROM node_ports WHERE node_id = ? ORDER BY rowid'
      )
      .all(row.id) as PortRow[]
    const ports = portRows.length
      ? portRows.map((port, index) => {
          const saved = savedPorts.find(
            (item) => item.id === port.name || item.label === port.name
          )
          return {
            ...(saved ?? {
              label: port.name,
              direction: port.direction === 'inlet' ? 'left' : 'right',
              x: port.direction === 'inlet' ? 0 : 1,
              y: (index + 1) / (portRows.length + 1),
              index,
            }),
            id: port.name,
            type:
              saved?.type ??
              (port.medium === 'energy' && unitType !== 'EnergyStream'
                ? 'energy'
                : port.direction === 'inlet'
                  ? 'in'
                  : 'out'),
          } as FlowNode['ports'][number]
        })
      : savedPorts.map((port) => ({ ...port }))
    return {
      id: row.id,
      tag: row.tag,
      name: layout.name ?? `${definition.namePrefix}-${row.id}`,
      label: layout.label ?? definition.label,
      x: layout.x ?? 0,
      y: layout.y ?? 0,
      width: layout.width ?? definition.width,
      height: layout.height ?? definition.height,
      unitType,
      dwsimObjectType: unitType,
      ports,
    }
  }

  read(): FlowsheetState | null {
    return this.database.transaction(() => {
      const flowsheet = this.database
        .prepare('SELECT viewport_json FROM flowsheets WHERE id = ?')
        .get(this.flowsheetId) as { viewport_json: string | null } | undefined
      if (!flowsheet) {
        return null
      }
      const rows = this.database
        .prepare(
          'SELECT id, tag, node_type, unit_operation, layout_json FROM nodes WHERE flowsheet_id = ? ORDER BY rowid'
        )
        .all(this.flowsheetId) as NodeRow[]
      const edges = this.database
        .prepare(
          'SELECT id, from_node_id AS "from", to_node_id AS "to", from_port AS fromPort, to_port AS toPort FROM connections WHERE flowsheet_id = ? ORDER BY rowid'
        )
        .all(this.flowsheetId) as FlowsheetState['edges']
      return {
        viewport: flowsheet.viewport_json
          ? JSON.parse(flowsheet.viewport_json)
          : { x: 0, y: 0, scale: 1 },
        nodes: rows.map((row) => this.readNode(row)),
        edges,
      }
    })()
  }

  private write(state: FlowsheetState) {
    this.database.transaction(() => {
      this.database
        .prepare(`
        INSERT INTO flowsheets (id, name, viewport_json) VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET viewport_json = excluded.viewport_json, updated_at = CURRENT_TIMESTAMP
      `)
        .run(this.flowsheetId, this.name, JSON.stringify(state.viewport))

      const nodeIds = new Set(state.nodes.map((node) => node.id))
      const edgeIds = new Set(state.edges.map((edge) => edge.id))
      for (const row of this.database
        .prepare('SELECT id FROM connections WHERE flowsheet_id = ?')
        .all(this.flowsheetId) as { id: string }[]) {
        if (!edgeIds.has(row.id)) {
          this.database
            .prepare('DELETE FROM connections WHERE id = ?')
            .run(row.id)
        }
      }
      for (const row of this.database
        .prepare('SELECT id FROM nodes WHERE flowsheet_id = ?')
        .all(this.flowsheetId) as { id: string }[]) {
        if (!nodeIds.has(row.id)) {
          this.database.prepare('DELETE FROM nodes WHERE id = ?').run(row.id)
        }
      }

      for (const node of state.nodes) {
        const nodeType =
          node.unitType === 'MaterialStream'
            ? 'material_stream'
            : node.unitType === 'EnergyStream'
              ? 'energy_stream'
              : 'unit_operation'
        const { x, y, width, height, name, label, ports } = node
        this.database
          .prepare(`
          INSERT INTO nodes (id, flowsheet_id, tag, node_type, unit_operation, parameters_json, layout_json)
          VALUES (?, ?, ?, ?, ?, '{}', ?)
          ON CONFLICT(id) DO UPDATE SET tag = excluded.tag, node_type = excluded.node_type,
            unit_operation = excluded.unit_operation, layout_json = excluded.layout_json, updated_at = CURRENT_TIMESTAMP
        `)
          .run(
            node.id,
            this.flowsheetId,
            node.tag,
            nodeType,
            nodeType === 'unit_operation' ? node.unitType : null,
            JSON.stringify({ x, y, width, height, name, label, ports })
          )
        const portNames = new Set(ports.map((port) => port.id))
        for (const port of this.database
          .prepare('SELECT name FROM node_ports WHERE node_id = ?')
          .all(node.id) as { name: string }[]) {
          if (!portNames.has(port.name)) {
            this.database
              .prepare('DELETE FROM node_ports WHERE node_id = ? AND name = ?')
              .run(node.id, port.name)
          }
        }
        for (const port of ports) {
          this.database
            .prepare(`
            INSERT INTO node_ports (id, node_id, name, direction, medium) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(node_id, name) DO UPDATE SET direction = excluded.direction, medium = excluded.medium, updated_at = CURRENT_TIMESTAMP
          `)
            .run(
              JSON.stringify([node.id, port.id]),
              node.id,
              port.id,
              port.type === 'in' ||
                (port.type === 'energy' && /in/i.test(port.id))
                ? 'inlet'
                : 'outlet',
              node.unitType === 'EnergyStream' || port.type === 'energy'
                ? 'energy'
                : 'material'
            )
        }
      }

      for (const edge of state.edges) {
        const fromPort =
          edge.fromPort ??
          state.nodes
            .find((node) => node.id === edge.from)
            ?.ports.find((port) => port.type === 'out')?.id
        const toPort =
          edge.toPort ??
          state.nodes
            .find((node) => node.id === edge.to)
            ?.ports.find((port) => port.type === 'in')?.id
        this.database
          .prepare(`
          INSERT INTO connections (id, flowsheet_id, from_node_id, from_port, to_node_id, to_port) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET from_node_id = excluded.from_node_id, from_port = excluded.from_port,
            to_node_id = excluded.to_node_id, to_port = excluded.to_port, updated_at = CURRENT_TIMESTAMP
        `)
          .run(
            edge.id,
            this.flowsheetId,
            edge.from,
            fromPort ?? null,
            edge.to,
            toPort ?? null
          )
      }
    })()
  }

  save(state: FlowsheetState): Promise<void> {
    return this.queue.enqueue({ state })
  }

  close() {
    this.database.close()
  }
}
