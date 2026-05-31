import { getUnitDefinition } from '@src/flowsheet/registry'
import type { FlowNode, UnitType } from '@src/flowsheet/types'
import { uuidv4 } from '@src/lib/utils'

export function getNextTag(unitType: UnitType, nodes: FlowNode[]) {
  const definition = getUnitDefinition(unitType)
  const count = nodes.filter((node) => node.unitType === unitType).length + 1
  return `${definition.tagPrefix}${count}`
}

export function ensureUniqueTag(tag: string, nodes: FlowNode[]) {
  if (!nodes.some((node) => node.tag === tag)) {
    return tag
  }

  const match = tag.match(/^(.*?)(\d+)$/)
  if (!match) {
    let suffix = 2
    let candidate = `${tag}-${suffix}`
    while (nodes.some((node) => node.tag === candidate)) {
      suffix += 1
      candidate = `${tag}-${suffix}`
    }
    return candidate
  }

  const prefix = match[1] ?? ''
  const numberText = match[2] ?? '0'
  const width = numberText.length
  let next = Number(numberText)
  let candidate = tag
  while (nodes.some((node) => node.tag === candidate)) {
    next += 1
    candidate = `${prefix}${String(next).padStart(width, '0')}`
  }
  return candidate
}

export function createFlowObject({
  unitType,
  x,
  y,
  nodes,
  tag,
}: {
  unitType: UnitType
  x: number
  y: number
  nodes: FlowNode[]
  tag?: string
}): FlowNode {
  const definition = getUnitDefinition(unitType)
  const id = uuidv4()
  const nextTag = ensureUniqueTag(tag || getNextTag(unitType, nodes), nodes)

  return {
    id,
    name: `${definition.namePrefix}-${id}`,
    tag: nextTag,
    label: definition.label,
    x,
    y,
    width: definition.width,
    height: definition.height,
    unitType,
    dwsimObjectType: unitType,
    connectors: definition.connectors.map((connector) => ({ ...connector })),
  }
}

export function createSeedFlowObject({
  id,
  unitType,
  tag,
  x,
  y,
}: {
  id: string
  unitType: UnitType
  tag: string
  x: number
  y: number
}): FlowNode {
  const definition = getUnitDefinition(unitType)
  return {
    id,
    name: `${definition.namePrefix}-${id}`,
    tag,
    label: definition.label,
    x,
    y,
    width: definition.width,
    height: definition.height,
    unitType,
    dwsimObjectType: unitType,
    connectors: definition.connectors.map((connector) => ({ ...connector })),
  }
}
