import { type PanelRow, getUnitDefinition } from '@src/flowsheet/registry'
import type { FlowEdge, FlowNode, FlowsheetState } from '@src/flowsheet/types'
import type {
  SolveFlowsheetConnection,
  SolveFlowsheetObject,
  SolveFlowsheetRequest,
  ThermoSelection,
} from '@src/lib/thermo'
import { isArray } from '@src/lib/utils'

// Fugacity stores SI values; DWSIM keeps these quantities in kilo units internally.
const dwsimScale: Record<string, number> = {
  heatflow: 1 / 1000,
  enthalpy: 1 / 1000,
  entropy: 1 / 1000,
  heatCapacityCp: 1 / 1000,
}

function collectDwsimProperties(
  rows: PanelRow[],
  compoundIds: string[],
  properties = new Map<string, string | undefined>()
) {
  for (const row of rows) {
    if (row.type === 'group') {
      collectDwsimProperties(row.rows, compoundIds, properties)
    } else if (row.type === 'tabs') {
      for (const tab of row.tabs) {
        collectDwsimProperties(tab.rows, compoundIds, properties)
      }
    } else if (
      row.type === 'collection' &&
      row.source === 'selectedCompounds'
    ) {
      const compoundRows = compoundIds.flatMap((id) =>
        row.rows.map((child) =>
          'property' in child
            ? {
                ...child,
                property: `${row.property}[${JSON.stringify(id)}].${child.property}`,
              }
            : child
        )
      )
      collectDwsimProperties(compoundRows, compoundIds, properties)
    } else if (row.type === 'textbox') {
      properties.set(row.property, row.unit)
      for (const change of row.onChange ?? []) {
        properties.set(change.property, undefined)
      }
    } else if (
      (row.type === 'numeric' && !row.setter) ||
      row.type === 'checkbox' ||
      (row.type === 'dropdown' && isArray(row.options))
    ) {
      properties.set(row.property, undefined)
    }
  }
  return properties
}

function toSolveObject(
  node: FlowNode,
  compoundIds: string[]
): SolveFlowsheetObject {
  const allowed = collectDwsimProperties(
    getUnitDefinition(node.unitType).panels,
    compoundIds
  )
  const properties: SolveFlowsheetObject['properties'] = {}
  for (const [property, value] of Object.entries(
    node.parameters?.inputs ?? {}
  )) {
    if (!allowed.has(property)) {
      continue
    }
    const scale = dwsimScale[allowed.get(property) ?? '']
    properties[property] =
      scale && typeof value === 'number' ? value * scale : value
  }
  return {
    id: node.id,
    tag: node.tag,
    unitType: node.unitType,
    x: node.x,
    y: node.y,
    properties,
  }
}

function findPortIndex(
  node: FlowNode | undefined,
  portId: string | undefined,
  fallbackType: 'in' | 'out'
) {
  const port = portId
    ? node?.ports.find((item) => item.id === portId)
    : node?.ports.find((item) => item.type === fallbackType)
  return port?.index
}

function toSolveConnection(
  edge: FlowEdge,
  nodes: Map<string, FlowNode>
): SolveFlowsheetConnection | Error {
  const fromPort = findPortIndex(nodes.get(edge.from), edge.fromPort, 'out')
  const toPort = findPortIndex(nodes.get(edge.to), edge.toPort, 'in')
  if (fromPort === undefined || toPort === undefined) {
    return new Error(
      `Connection ${edge.id} references a port that does not exist on its node.`
    )
  }
  return { from: edge.from, fromPort, to: edge.to, toPort }
}

export function toSolveFlowsheetRequest(
  state: FlowsheetState,
  selection: ThermoSelection
): SolveFlowsheetRequest | Error {
  const nodes = new Map(state.nodes.map((node) => [node.id, node]))
  const connections: SolveFlowsheetConnection[] = []
  for (const edge of state.edges) {
    const connection = toSolveConnection(edge, nodes)
    if (connection instanceof Error) {
      return connection
    }
    connections.push(connection)
  }
  return {
    ...selection,
    objects: state.nodes.map((node) =>
      toSolveObject(node, selection.compoundIds)
    ),
    connections,
  }
}
