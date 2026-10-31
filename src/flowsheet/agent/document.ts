import type {
  FlowEdge,
  FlowNode,
  FlowsheetState,
  NodeParameters,
  PortType,
  UnitType,
} from '@src/flowsheet/types'

export type FlowsheetDocumentObject = {
  tag: string
  type: UnitType
  ports: { id: string; type: PortType }[]
  inputs: NodeParameters['inputs']
}

export type FlowsheetDocumentConnection = {
  from: string
  to: string
}

export type FlowsheetDocument = {
  revision: number
  objects: FlowsheetDocumentObject[]
  connections: FlowsheetDocumentConnection[]
}

export function toPortReference(node: FlowNode, portId: string | undefined) {
  return portId ? `${node.tag}.${portId}` : node.tag
}

export function parsePortReference(reference: string) {
  const index = reference.lastIndexOf('.')
  return index === -1
    ? { tag: reference, portId: undefined }
    : { tag: reference.slice(0, index), portId: reference.slice(index + 1) }
}

export function getEdgePorts(
  state: Pick<FlowsheetState, 'nodes'>,
  edge: FlowEdge
) {
  const from = state.nodes.find((node) => node.id === edge.from)
  const to = state.nodes.find((node) => node.id === edge.to)
  return {
    fromPort:
      edge.fromPort ?? from?.ports.find((port) => port.type === 'out')?.id,
    toPort: edge.toPort ?? to?.ports.find((port) => port.type === 'in')?.id,
  }
}

export function toFlowsheetDocument(
  state: FlowsheetState,
  revision: number
): FlowsheetDocument {
  const nodesById = new Map(state.nodes.map((node) => [node.id, node]))
  return {
    revision,
    objects: state.nodes.map((node) => ({
      tag: node.tag,
      type: node.unitType,
      ports: node.ports.map(({ id, type }) => ({ id, type })),
      inputs: node.parameters?.inputs ?? {},
    })),
    connections: state.edges.flatMap((edge) => {
      const from = nodesById.get(edge.from)
      const to = nodesById.get(edge.to)
      if (!from || !to) {
        return []
      }
      const ports = getEdgePorts(state, edge)
      return [
        {
          from: toPortReference(from, ports.fromPort),
          to: toPortReference(to, ports.toPort),
        },
      ]
    }),
  }
}
