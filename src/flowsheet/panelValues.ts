import {
  type PanelCondition,
  type PanelRow,
  type PanelValue,
  getUnitDefinition,
} from '@src/flowsheet/registry'
import type { FlowEdge, FlowNode } from '@src/flowsheet/types'
import { isArray } from '@src/lib/utils'

export type PanelValues = Record<string, PanelValue>

export type EditableRow = Extract<
  PanelRow,
  { type: 'string' | 'textbox' | 'numeric' | 'checkbox' | 'dropdown' }
>

export function resolvePanelRows(
  rows: PanelRow[],
  selectedCompoundIds: string[]
): PanelRow[] {
  return rows.map((row) => {
    if (row.type === 'group') {
      return { ...row, rows: resolvePanelRows(row.rows, selectedCompoundIds) }
    }
    if (row.type !== 'collection' || row.source !== 'selectedCompounds') {
      return row
    }
    if (selectedCompoundIds.length === 0) {
      return {
        type: 'description',
        label:
          'Select compounds in the toolbar to enter stream mole fractions.',
      }
    }
    return {
      type: 'group',
      label: row.label,
      level: 2,
      rows: selectedCompoundIds.flatMap((id) =>
        row.rows.map((child) => ({
          ...child,
          label: child.label.replace('{Name}', id),
          ...('property' in child && {
            property: `${row.property}[${JSON.stringify(id)}].${child.property}`,
          }),
        }))
      ),
    }
  })
}

export function getEditableRows(rows: PanelRow[]): EditableRow[] {
  return rows.flatMap((row): EditableRow[] => {
    if (row.type === 'group') {
      return getEditableRows(row.rows)
    }
    return row.type === 'string' ||
      row.type === 'textbox' ||
      row.type === 'numeric' ||
      row.type === 'checkbox' ||
      row.type === 'dropdown'
      ? [row]
      : []
  })
}

function getConnectionValues(node: FlowNode, edges: FlowEdge[]): PanelValues {
  const values: PanelValues = {}
  for (const port of node.ports.filter((port) => port.type === 'in')) {
    values[`GraphicObject.InputConnectors[${port.index}].IsAttached`] =
      edges.some((edge) => edge.to === node.id && edge.toPort === port.id)
  }
  return values
}

export function getInitialValues(
  rows: PanelRow[],
  node: FlowNode,
  edges: FlowEdge[]
): PanelValues {
  const values: PanelValues = { ...node.parameters?.inputs }
  for (const row of getEditableRows(rows)) {
    if (
      values[row.property] === undefined &&
      row.type === 'dropdown' &&
      isArray(row.options) &&
      row.fallbackIndex !== undefined
    ) {
      const option = row.options[row.fallbackIndex]
      if (option) {
        values[row.property] = option.value
      }
    }
  }
  return {
    ...values,
    ...getConnectionValues(node, edges),
    'GetDisplayName()': getUnitDefinition(node.unitType).label,
    'GraphicObject.Tag': node.tag,
  }
}

export function matchesCondition(
  condition: PanelCondition,
  values: PanelValues
) {
  const value = values[condition.property]
  if (value === undefined) {
    return condition.operator !== 'notEmpty'
  }

  switch (condition.operator) {
    case 'equals':
      return value === condition.value
    case 'in':
      return isArray(condition.value) && condition.value.includes(value)
    case 'exists':
      return condition.value !== false
    case 'empty':
      return value === ''
    case 'notEmpty':
      return value !== ''
    case 'existsIn':
      return true
  }
}

function isEmptyValue(value: PanelValue | undefined) {
  return value === undefined || value === ''
}

export function isRowRequired(row: PanelRow, values: PanelValues) {
  return (
    row.requiredWhen !== undefined &&
    matchesCondition(row.requiredWhen, values) &&
    (!row.enabledWhen || matchesCondition(row.enabledWhen, values))
  )
}

export function isRowCalculated(row: PanelRow, values: PanelValues) {
  if (row.type === 'readonly') {
    return values[row.property] === undefined
  }
  return (
    (row.requiredWhen !== undefined &&
      !matchesCondition(row.requiredWhen, values)) ||
    (row.enabledWhen !== undefined &&
      !matchesCondition(row.enabledWhen, values))
  )
}

function getValueRows(rows: PanelRow[]): PanelRow[] {
  return rows.flatMap((row) => {
    if (row.type === 'group') {
      return getValueRows(row.rows)
    }
    if (row.type === 'tabs') {
      return row.tabs.flatMap((tab) => getValueRows(tab.rows))
    }
    return row.type === 'readonly' ? [row] : getEditableRows([row])
  })
}

export function withCalculatedValues(
  rows: PanelRow[],
  values: PanelValues,
  calculated: PanelValues
) {
  const next = { ...values }
  const properties = new Set<string>()
  for (const row of getValueRows(rows)) {
    if (
      'property' in row &&
      row.property in calculated &&
      isRowCalculated(row, values)
    ) {
      next[row.property] = calculated[row.property]
      properties.add(row.property)
    }
  }
  return { values: next, properties }
}

export function getMissingRequiredLabels(
  rows: PanelRow[],
  values: PanelValues
) {
  return getEditableRows(rows)
    .filter(
      (row) => isRowRequired(row, values) && isEmptyValue(values[row.property])
    )
    .map((row) => row.label.trim())
}

export function getMoleFractionProperties(
  node: FlowNode,
  compoundIds: string[]
) {
  if (node.unitType !== 'MaterialStream') {
    return []
  }
  return compoundIds.map(
    (id) => `Phases[0].Compounds[${JSON.stringify(id)}].MoleFraction`
  )
}

function sumValues(values: PanelValues, properties: string[]) {
  return properties.reduce(
    (total, property) => total + Number(values[property]),
    0
  )
}

export function balanceMoleFractions(
  values: PanelValues,
  properties: string[],
  autofilled?: string
): { values: PanelValues; autofilled?: string } {
  const empty = properties.filter((property) => isEmptyValue(values[property]))
  const target = autofilled ?? (empty.length === 1 ? empty[0] : undefined)
  if (!target) {
    return { values }
  }
  const others = properties.filter((property) => property !== target)
  if (others.some((property) => isEmptyValue(values[property]))) {
    return { values: { ...values, [target]: '' }, autofilled: target }
  }
  const remainder = Number((1 - sumValues(values, others)).toFixed(10))
  return {
    values: { ...values, [target]: remainder >= 0 ? remainder : '' },
    autofilled: target,
  }
}

export function getMoleFractionTotal(
  values: PanelValues,
  properties: string[]
) {
  return properties.length === 0 ||
    properties.some((property) => isEmptyValue(values[property]))
    ? undefined
    : sumValues(values, properties)
}

export function getMoleFractionTotalError(
  values: PanelValues,
  properties: string[]
) {
  const total = getMoleFractionTotal(values, properties)
  return total !== undefined && Math.abs(total - 1) > 1e-6
    ? `Mole fractions must add up to 1 (currently ${Number(total.toFixed(6))}).`
    : null
}
