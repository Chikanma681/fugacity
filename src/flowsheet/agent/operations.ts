import { getEdgePorts, parsePortReference } from '@src/flowsheet/agent/document'
import { type InputValue, resolveInput } from '@src/flowsheet/agent/inputs'
import { createFlowObject } from '@src/flowsheet/factory'
import { unitRegistry } from '@src/flowsheet/registry'
import type {
  FlowEdge,
  FlowNode,
  FlowsheetState,
  Port,
  UnitType,
} from '@src/flowsheet/types'
import { isArray, uuidv4 } from '@src/lib/utils'

export type FlowsheetOperation =
  | { op: 'add_object'; type: UnitType; tag?: string; x?: number; y?: number }
  | { op: 'remove_object'; tag: string }
  | { op: 'rename_object'; tag: string; newTag: string }
  | { op: 'connect'; from: string; to: string }
  | { op: 'disconnect'; from: string; to: string }
  | { op: 'set_inputs'; tag: string; inputs: Record<string, InputValue> }
  | { op: 'clear_inputs'; tag: string; properties: string[] }

type OperationResult = FlowsheetState | { error: string }

type PortEnd = { node: FlowNode; port: Port }

const requiredFields: Record<FlowsheetOperation['op'], string[]> = {
  add_object: ['type'],
  remove_object: ['tag'],
  rename_object: ['tag', 'newTag'],
  connect: ['from', 'to'],
  disconnect: ['from', 'to'],
  set_inputs: ['tag'],
  clear_inputs: ['tag'],
}

function isStream(node: FlowNode) {
  return node.unitType === 'MaterialStream' || node.unitType === 'EnergyStream'
}

function findNode(state: FlowsheetState, tag: string) {
  return state.nodes.find((node) => node.tag === tag)
}

function findNodeOrError(state: FlowsheetState, tag: string) {
  return findNode(state, tag) ?? { error: `No object is tagged "${tag}".` }
}

function nextObjectPosition(nodes: FlowNode[]) {
  const last = nodes.at(-1)
  if (!last) {
    return { x: 0, y: 0 }
  }
  const right = Math.max(...nodes.map((node) => node.x + node.width))
  return { x: right + 80, y: last.y }
}

function resolvePortEnd(
  state: FlowsheetState,
  reference: string,
  side: 'from' | 'to'
): PortEnd | { error: string } {
  const whole = findNode(state, reference)
  const { tag, portId } = whole
    ? { tag: reference, portId: undefined }
    : parsePortReference(reference)
  const node = whole ?? findNode(state, tag)
  if (!node) {
    return { error: `No object is tagged "${tag}".` }
  }
  const defaultType = side === 'from' ? 'out' : 'in'
  const port = portId
    ? node.ports.find((item) => item.id === portId)
    : node.ports.find((item) => item.type === defaultType)
  if (!port) {
    return {
      error: `${tag} has no port "${portId ?? defaultType}". Ports: ${node.ports.map((item) => item.id).join(', ')}.`,
    }
  }
  if (port.type === (side === 'from' ? 'in' : 'out')) {
    return {
      error: `${tag}.${port.id} is an ${port.type === 'in' ? 'inlet' : 'outlet'} and cannot be the "${side}" end of a connection.`,
    }
  }
  return { node, port }
}

function usesPort(state: FlowsheetState, edge: FlowEdge, end: PortEnd) {
  const ports = getEdgePorts(state, edge)
  return (
    (edge.from === end.node.id && ports.fromPort === end.port.id) ||
    (edge.to === end.node.id && ports.toPort === end.port.id)
  )
}

function addObject(
  state: FlowsheetState,
  operation: Extract<FlowsheetOperation, { op: 'add_object' }>
): OperationResult {
  if (!(operation.type in unitRegistry)) {
    return { error: `Unknown object type "${operation.type}".` }
  }
  if (operation.tag && findNode(state, operation.tag)) {
    return { error: `The tag "${operation.tag}" is already used.` }
  }
  const position = nextObjectPosition(state.nodes)
  const node = createFlowObject({
    unitType: operation.type,
    x: operation.x ?? position.x,
    y: operation.y ?? position.y,
    nodes: state.nodes,
    tag: operation.tag,
  })
  return { ...state, nodes: [...state.nodes, node] }
}

function removeObject(state: FlowsheetState, tag: string): OperationResult {
  const node = findNodeOrError(state, tag)
  if ('error' in node) {
    return node
  }
  return {
    ...state,
    nodes: state.nodes.filter((item) => item.id !== node.id),
    edges: state.edges.filter(
      (edge) => edge.from !== node.id && edge.to !== node.id
    ),
  }
}

function renameObject(
  state: FlowsheetState,
  tag: string,
  newTag: string
): OperationResult {
  const node = findNodeOrError(state, tag)
  if ('error' in node) {
    return node
  }
  const trimmed = newTag.trim()
  if (!trimmed) {
    return { error: 'The new tag cannot be empty.' }
  }
  if (trimmed !== tag && findNode(state, trimmed)) {
    return { error: `The tag "${trimmed}" is already used.` }
  }
  return {
    ...state,
    nodes: state.nodes.map((item) =>
      item.id === node.id ? { ...item, tag: trimmed } : item
    ),
  }
}

function connect(
  state: FlowsheetState,
  from: string,
  to: string
): OperationResult {
  const source = resolvePortEnd(state, from, 'from')
  if ('error' in source) {
    return source
  }
  const target = resolvePortEnd(state, to, 'to')
  if ('error' in target) {
    return target
  }
  if (source.node.id === target.node.id) {
    return { error: 'An object cannot connect to itself.' }
  }
  if (isStream(source.node) === isStream(target.node)) {
    return { error: 'A connection must join a stream to a unit operation.' }
  }
  const [stream, unit] = isStream(source.node)
    ? [source.node, target]
    : [target.node, source]
  const needsEnergy = unit.port.type === 'energy'
  if (needsEnergy !== (stream.unitType === 'EnergyStream')) {
    return {
      error: `${unit.node.tag}.${unit.port.id} needs ${needsEnergy ? 'an energy' : 'a material'} stream.`,
    }
  }
  const occupied = [source, target].find((end) =>
    state.edges.some((edge) => usesPort(state, edge, end))
  )
  if (occupied) {
    return {
      error: `${occupied.node.tag}.${occupied.port.id} is already connected.`,
    }
  }
  return {
    ...state,
    edges: [
      ...state.edges,
      {
        id: uuidv4(),
        from: source.node.id,
        fromPort: source.port.id,
        to: target.node.id,
        toPort: target.port.id,
      },
    ],
  }
}

function disconnect(
  state: FlowsheetState,
  from: string,
  to: string
): OperationResult {
  const source = resolvePortEnd(state, from, 'from')
  if ('error' in source) {
    return source
  }
  const target = resolvePortEnd(state, to, 'to')
  if ('error' in target) {
    return target
  }
  const edge = state.edges.find(
    (item) =>
      item.from === source.node.id &&
      item.to === target.node.id &&
      usesPort(state, item, source) &&
      usesPort(state, item, target)
  )
  if (!edge) {
    return { error: `${from} is not connected to ${to}.` }
  }
  return { ...state, edges: state.edges.filter((item) => item !== edge) }
}

function updateInputs(
  state: FlowsheetState,
  tag: string,
  change: (node: FlowNode) => FlowNode['parameters'] | { error: string }
): OperationResult {
  const node = findNodeOrError(state, tag)
  if ('error' in node) {
    return node
  }
  const parameters = change(node)
  if (parameters && 'error' in parameters) {
    return parameters
  }
  return {
    ...state,
    nodes: state.nodes.map((item) =>
      item.id === node.id ? { ...item, parameters } : item
    ),
  }
}

function setInputs(
  state: FlowsheetState,
  tag: string,
  values: Record<string, InputValue>
): OperationResult {
  if (typeof values !== 'object' || values === null) {
    return { error: 'set_inputs needs an "inputs" object.' }
  }
  return updateInputs(state, tag, (node) => {
    const inputs = { ...node.parameters?.inputs }
    for (const [property, value] of Object.entries(values)) {
      const resolved = resolveInput(node.unitType, property, value)
      if ('error' in resolved) {
        return resolved
      }
      inputs[resolved.property] = resolved.value
    }
    return {
      schemaVersion: 1,
      inputs,
      displayUnits: node.parameters?.displayUnits ?? {},
    }
  })
}

function clearInputs(
  state: FlowsheetState,
  tag: string,
  properties: string[]
): OperationResult {
  if (!isArray(properties)) {
    return { error: 'clear_inputs needs a "properties" array.' }
  }
  return updateInputs(state, tag, (node) => {
    const inputs = { ...node.parameters?.inputs }
    for (const property of properties) {
      delete inputs[property]
    }
    return {
      schemaVersion: 1,
      inputs,
      displayUnits: node.parameters?.displayUnits ?? {},
    }
  })
}

function applyOperation(
  state: FlowsheetState,
  operation: FlowsheetOperation
): OperationResult {
  const fields =
    typeof operation?.op === 'string' &&
    Object.prototype.hasOwnProperty.call(requiredFields, operation.op)
      ? requiredFields[operation.op]
      : undefined
  if (!fields) {
    return { error: `Unknown operation "${String(operation?.op)}".` }
  }
  const missing = fields.filter(
    (field) => typeof (operation as Record<string, unknown>)[field] !== 'string'
  )
  if (missing.length) {
    return { error: `Missing text field(s): ${missing.join(', ')}.` }
  }
  switch (operation.op) {
    case 'add_object':
      return addObject(state, operation)
    case 'remove_object':
      return removeObject(state, operation.tag)
    case 'rename_object':
      return renameObject(state, operation.tag, operation.newTag)
    case 'connect':
      return connect(state, operation.from, operation.to)
    case 'disconnect':
      return disconnect(state, operation.from, operation.to)
    case 'set_inputs':
      return setInputs(state, operation.tag, operation.inputs)
    case 'clear_inputs':
      return clearInputs(state, operation.tag, operation.properties)
  }
}

export function applyFlowsheetOperations(
  state: FlowsheetState,
  operations: FlowsheetOperation[]
): OperationResult {
  let next = state
  for (const [index, operation] of operations.entries()) {
    const result = applyOperation(next, operation)
    if ('error' in result) {
      return {
        error: `Operation ${index + 1} (${String(operation?.op)}) failed: ${result.error}`,
      }
    }
    next = result
  }
  return next
}
