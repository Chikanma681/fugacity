import {
  type PanelRow,
  type PanelValue,
  getUnitDefinition,
} from '@src/flowsheet/registry'
import type { UnitType } from '@src/flowsheet/types'
import { panelUnits, toSI } from '@src/flowsheet/units'
import { isArray } from '@src/lib/utils'

export type InputValue = PanelValue | { value: number; unit: string }

type InputRow = Extract<
  PanelRow,
  { type: 'string' | 'textbox' | 'numeric' | 'checkbox' | 'dropdown' }
>

export type InputDefinition = {
  property: string
  label: string
  type: InputRow['type']
  units?: string[]
  options?: PanelValue[]
  min?: number
  max?: number
  row: InputRow
}

const compoundPlaceholder = '{compound}'

function toInputDefinition(row: InputRow, property: string): InputDefinition {
  const unit = 'unit' in row && row.unit ? panelUnits[row.unit] : undefined
  return {
    property,
    label: row.label,
    type: row.type,
    ...(unit && { units: unit.map(([symbol]) => symbol) }),
    ...(row.type === 'dropdown' &&
      isArray(row.options) && {
        options: row.options.map((option) => option.value),
      }),
    ...('min' in row && row.min !== undefined && { min: row.min }),
    ...('max' in row && row.max !== undefined && { max: row.max }),
    row,
  }
}

function collectInputDefinitions(rows: PanelRow[]): InputDefinition[] {
  return rows.flatMap((row): InputDefinition[] => {
    if (row.type === 'group') {
      return collectInputDefinitions(row.rows)
    }
    if (row.type === 'collection' && row.source === 'selectedCompounds') {
      return collectInputDefinitions(row.rows).map((child) => ({
        ...child,
        label: child.label.replace('{Name}', compoundPlaceholder),
        property: `${row.property}[${compoundPlaceholder}].${child.property}`,
      }))
    }
    if (
      (row.type === 'string' ||
        row.type === 'textbox' ||
        row.type === 'numeric' ||
        row.type === 'checkbox' ||
        row.type === 'dropdown') &&
      row.property !== 'GraphicObject.Tag'
    ) {
      return [toInputDefinition(row, row.property)]
    }
    return []
  })
}

export function getInputDefinitions(unitType: UnitType) {
  return collectInputDefinitions(getUnitDefinition(unitType).panels)
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchInputDefinition(
  definitions: InputDefinition[],
  property: string
): { definition: InputDefinition; property: string } | undefined {
  for (const definition of definitions) {
    if (definition.property === property) {
      return { definition, property }
    }
    const [prefix, suffix] = definition.property.split(compoundPlaceholder)
    if (suffix === undefined || prefix === undefined) {
      continue
    }
    const match = property.match(
      new RegExp(`^${escapeRegExp(prefix)}"?(.+?)"?${escapeRegExp(suffix)}$`)
    )
    const compound = match?.[1]
    if (compound) {
      return {
        definition,
        property: `${prefix}${JSON.stringify(compound)}${suffix}`,
      }
    }
  }
  return undefined
}

function normalizeUnit(symbol: string) {
  return symbol.replace(/[°\s]/g, '').toLowerCase()
}

function toNumber(
  definition: InputDefinition,
  value: InputValue
): number | string {
  if (typeof value === 'number') {
    return value
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof value.value !== 'number'
  ) {
    return `${definition.label} needs a number.`
  }
  const unitKind = 'unit' in definition.row ? definition.row.unit : undefined
  const unit = unitKind
    ? panelUnits[unitKind]?.find(
        ([symbol]) => normalizeUnit(symbol) === normalizeUnit(value.unit)
      )
    : undefined
  if (!unit) {
    return `${definition.label} does not accept unit "${value.unit}". Use one of: ${definition.units?.join(', ') ?? 'SI number only'}.`
  }
  return toSI(value.value, unit)
}

function checkNumber(definition: InputDefinition, number: number) {
  const { row } = definition
  if (!Number.isFinite(number)) {
    return `${definition.label} needs a finite number.`
  }
  if ('valueType' in row && row.valueType === 'integer') {
    if (!Number.isInteger(number)) {
      return `${definition.label} needs an integer.`
    }
  }
  if (definition.min !== undefined) {
    const exclusive = 'exclusiveMin' in row && row.exclusiveMin
    if (number < definition.min || (exclusive && number === definition.min)) {
      return `${definition.label} must be ${exclusive ? 'greater than' : 'at least'} ${definition.min} (SI).`
    }
  }
  if (definition.max !== undefined && number > definition.max) {
    return `${definition.label} must be at most ${definition.max} (SI).`
  }
  return undefined
}

function toPanelValue(
  definition: InputDefinition,
  value: InputValue
): { value: PanelValue } | { error: string } {
  switch (definition.type) {
    case 'textbox':
    case 'numeric': {
      const number = toNumber(definition, value)
      if (typeof number === 'string') {
        return { error: number }
      }
      const error = checkNumber(definition, number)
      return error ? { error } : { value: number }
    }
    case 'checkbox':
      return typeof value === 'boolean'
        ? { value }
        : { error: `${definition.label} needs true or false.` }
    case 'string':
      return typeof value === 'string'
        ? { value }
        : { error: `${definition.label} needs text.` }
    case 'dropdown':
      if (typeof value === 'object') {
        return { error: `${definition.label} needs one of its option values.` }
      }
      return !definition.options || definition.options.includes(value)
        ? { value }
        : {
            error: `${definition.label} must be one of: ${definition.options.join(', ')}.`,
          }
  }
}

export function resolveInput(
  unitType: UnitType,
  property: string,
  value: InputValue
): { property: string; value: PanelValue } | { error: string } {
  const matched = matchInputDefinition(getInputDefinitions(unitType), property)
  if (!matched) {
    return { error: `${unitType} has no input "${property}".` }
  }
  const resolved = toPanelValue(matched.definition, value)
  return 'error' in resolved
    ? resolved
    : { property: matched.property, value: resolved.value }
}
