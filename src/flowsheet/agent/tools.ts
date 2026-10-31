import type { FlowsheetDocument } from '@src/flowsheet/agent/document'
import { getInputDefinitions } from '@src/flowsheet/agent/inputs'
import type { FlowsheetOperation } from '@src/flowsheet/agent/operations'
import { getUnitDefinition, unitRegistry } from '@src/flowsheet/registry'
import type { UnitType } from '@src/flowsheet/types'
import { isArray } from '@src/lib/utils'

export type FlowsheetAgentTarget = {
  read: () => FlowsheetDocument
  apply: (
    revision: number,
    operations: FlowsheetOperation[]
  ) => Promise<FlowsheetDocument | { error: string }>
}

export type FlowsheetAgentToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string }

export type FlowsheetAgentTool = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (input: unknown) => Promise<FlowsheetAgentToolResult>
}

let activeTarget: FlowsheetAgentTarget | undefined

export function registerFlowsheetAgentTarget(target: FlowsheetAgentTarget) {
  activeTarget = target
  return () => {
    if (activeTarget === target) {
      activeTarget = undefined
    }
  }
}

function requireTarget(): FlowsheetAgentTarget | { error: string } {
  return activeTarget ?? { error: 'No flowsheet is open.' }
}

function describeObjectType(unitType: UnitType) {
  const definition = getUnitDefinition(unitType)
  return {
    type: unitType,
    label: definition.label,
    ports: definition.ports.map(({ id, type }) => ({ id, type })),
    inputs: getInputDefinitions(unitType).map(({ row, ...input }) => input),
  }
}

const inputValueSchema = {
  oneOf: [
    { type: 'number', description: 'SI value' },
    { type: 'string' },
    { type: 'boolean' },
    {
      type: 'object',
      properties: { value: { type: 'number' }, unit: { type: 'string' } },
      required: ['value', 'unit'],
    },
  ],
}

const operationSchema = {
  oneOf: [
    {
      type: 'object',
      properties: {
        op: { const: 'add_object' },
        type: { type: 'string', enum: Object.keys(unitRegistry) },
        tag: { type: 'string' },
        x: { type: 'number' },
        y: { type: 'number' },
      },
      required: ['op', 'type'],
    },
    {
      type: 'object',
      properties: { op: { const: 'remove_object' }, tag: { type: 'string' } },
      required: ['op', 'tag'],
    },
    {
      type: 'object',
      properties: {
        op: { const: 'rename_object' },
        tag: { type: 'string' },
        newTag: { type: 'string' },
      },
      required: ['op', 'tag', 'newTag'],
    },
    ...(['connect', 'disconnect'] as const).map((op) => ({
      type: 'object',
      properties: {
        op: { const: op },
        from: { type: 'string', description: 'tag.portId, e.g. "1.outlet"' },
        to: { type: 'string', description: 'tag.portId, e.g. "HEAT-1.inlet"' },
      },
      required: ['op', 'from', 'to'],
    })),
    {
      type: 'object',
      properties: {
        op: { const: 'set_inputs' },
        tag: { type: 'string' },
        inputs: { type: 'object', additionalProperties: inputValueSchema },
      },
      required: ['op', 'tag', 'inputs'],
    },
    {
      type: 'object',
      properties: {
        op: { const: 'clear_inputs' },
        tag: { type: 'string' },
        properties: { type: 'array', items: { type: 'string' } },
      },
      required: ['op', 'tag', 'properties'],
    },
  ],
}

const getFlowsheetTool: FlowsheetAgentTool = {
  name: 'get_flowsheet',
  description:
    'Read the open flowsheet: objects (tag, type, ports, inputs in SI) and connections as "tag.port" references. Returns the revision required by apply_operations.',
  inputSchema: { type: 'object', properties: {} },
  execute: async () => {
    const target = requireTarget()
    return 'error' in target
      ? { ok: false, error: target.error }
      : { ok: true, data: target.read() }
  },
}

const listObjectTypesTool: FlowsheetAgentTool = {
  name: 'list_object_types',
  description:
    'List the object types that can be added, with their ports and editable inputs. Input properties containing {compound} take a compound name, e.g. Phases[0].Compounds["Methane"].MoleFraction.',
  inputSchema: {
    type: 'object',
    properties: {
      types: {
        type: 'array',
        items: { type: 'string', enum: Object.keys(unitRegistry) },
      },
    },
  },
  execute: async (input) => {
    const requested = (input as { types?: UnitType[] } | undefined)?.types
    const types = (
      requested?.length ? requested : Object.keys(unitRegistry)
    ) as UnitType[]
    const unknown = types.filter((type) => !(type in unitRegistry))
    return unknown.length
      ? { ok: false, error: `Unknown object types: ${unknown.join(', ')}.` }
      : { ok: true, data: types.map(describeObjectType) }
  },
}

const applyOperationsTool: FlowsheetAgentTool = {
  name: 'apply_operations',
  description:
    'Apply edits to the open flowsheet in order. All edits apply or none do. Pass the revision from get_flowsheet; if the flowsheet changed since, read it again. Connections must join a stream to a unit operation. Numbers without a unit are SI.',
  inputSchema: {
    type: 'object',
    properties: {
      revision: { type: 'integer' },
      operations: { type: 'array', items: operationSchema, minItems: 1 },
    },
    required: ['revision', 'operations'],
  },
  execute: async (input) => {
    const target = requireTarget()
    if ('error' in target) {
      return { ok: false, error: target.error }
    }
    const { revision, operations } = (input ?? {}) as {
      revision?: number
      operations?: FlowsheetOperation[]
    }
    if (!Number.isInteger(revision) || !isArray(operations)) {
      return {
        ok: false,
        error: 'apply_operations needs a revision and an operations array.',
      }
    }
    const result = await target.apply(revision as number, operations)
    return 'error' in result
      ? { ok: false, error: result.error }
      : { ok: true, data: result }
  },
}

export const flowsheetAgentTools: FlowsheetAgentTool[] = [
  getFlowsheetTool,
  listObjectTypesTool,
  applyOperationsTool,
]
