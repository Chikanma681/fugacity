import { useId, useState } from 'react'

import {
  type PanelCondition,
  type PanelOptionSource,
  type PanelRow,
  type PanelValue,
  getUnitDefinition,
} from '@src/flowsheet/registry'
import type { FlowNode } from '@src/flowsheet/types'
import { isArray } from '@src/lib/utils'

const siUnits: Record<string, string> = {
  pressure: 'Pa',
  deltaP: 'Pa',
  temperature: 'K',
  deltaT: 'K',
  heatflow: 'W',
  massflow: 'kg/s',
  molarflow: 'mol/s',
  distance: 'm',
  diameter: 'm',
  area: 'm²',
  volume: 'm³',
  mass: 'kg',
  density: 'kg/m³',
  heat_transf_coeff: 'W/(m²·K)',
  heatCapacityCp: 'J/(kg·K)',
}

const sourceLabels: Record<PanelOptionSource['source'], string> = {
  propertyPackages: 'property packages',
  reactionSets: 'reaction sets',
  selectedCompounds: 'selected compounds',
  externalSolvers: 'external solvers',
  stages: 'stages',
  columnSpecificationUnits: 'specification units',
}

type PanelValues = Record<string, PanelValue>

function getInitialValues(rows: PanelRow[], node: FlowNode): PanelValues {
  const values: PanelValues = {
    'GetDisplayName()': getUnitDefinition(node.unitType).label,
    'GraphicObject.Tag': node.tag,
  }
  for (const row of rows) {
    if (row.type === 'group') {
      Object.assign(values, getInitialValues(row.rows, node))
    } else if (
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
  return values
}

function matchesCondition(condition: PanelCondition, values: PanelValues) {
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

function displayLabel(label: string) {
  return label.replace(/\{[^}]+\}/g, '—')
}

function getRowKey(row: PanelRow) {
  return `${row.type}-${'property' in row ? row.property : ''}-${row.label}`
}

const inputClassName =
  'w-full min-w-0 rounded border border-chalkboard-30 bg-chalkboard-10 px-3 py-2 text-sm dark:border-chalkboard-70 dark:bg-chalkboard-100 disabled:opacity-50'

function PanelField({
  row,
  values,
  onChange,
}: {
  row: PanelRow
  values: PanelValues
  onChange: (property: string, value: PanelValue) => void
}) {
  const id = useId()
  if (row.visibleWhen && !matchesCondition(row.visibleWhen, values)) {
    return null
  }

  const label = displayLabel(row.label)
  if (row.type === 'label') {
    return row.level === 2 ? (
      <h3 className="font-semibold">{label}</h3>
    ) : (
      <h2 className="border-b border-chalkboard-30 pb-2 pt-3 text-base font-semibold dark:border-chalkboard-70">
        {label}
      </h2>
    )
  }
  if (row.type === 'description') {
    return (
      <p className="text-sm text-chalkboard-70 dark:text-chalkboard-40">
        {label}
      </p>
    )
  }
  if (row.type === 'group') {
    return (
      <fieldset className="min-w-0 space-y-4 rounded border border-chalkboard-30 p-4 dark:border-chalkboard-70">
        {label && <legend className="px-2 font-semibold">{label}</legend>}
        {row.rows.map((child) => (
          <PanelField
            key={getRowKey(child)}
            row={child}
            values={values}
            onChange={onChange}
          />
        ))}
      </fieldset>
    )
  }
  if (row.type === 'collection') {
    return (
      <div className="space-y-1">
        <h3 className="font-semibold">{label}</h3>
        <p className="text-sm text-chalkboard-70 dark:text-chalkboard-40">
          No {label.toLowerCase()} available. Requires simulation data.
        </p>
      </div>
    )
  }
  if (row.type === 'button') {
    return (
      <button
        type="button"
        disabled
        title="This editor is not available yet."
        className="rounded border px-3 py-2 text-sm opacity-50"
      >
        {label}
      </button>
    )
  }

  const value = values[row.property]
  const unit =
    'fixedUnit' in row && row.fixedUnit
      ? row.fixedUnit
      : 'unit' in row && row.unit
        ? (siUnits[row.unit] ?? row.unit)
        : undefined

  if (row.type === 'readonly') {
    const text =
      value === undefined
        ? 'Not available'
        : row.displayValues && typeof value === 'boolean'
          ? row.displayValues[value ? 'true' : 'false']
          : String(value)
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <span className="font-medium">{label}</span>
        <span>
          {text}
          {value !== undefined && unit ? ` ${unit}` : ''}
        </span>
      </div>
    )
  }
  if (row.type === 'checkbox') {
    return (
      <label htmlFor={id} className="flex items-center gap-3">
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(row.property, event.target.checked)}
        />
        {label}
      </label>
    )
  }
  if (row.type === 'dropdown') {
    const options = isArray(row.options) ? row.options : []
    const selectedIndex = options.findIndex((option) => option.value === value)
    return (
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <select
          id={id}
          className={inputClassName}
          disabled={!isArray(row.options)}
          value={selectedIndex < 0 ? '' : String(selectedIndex)}
          onChange={(event) => {
            const option = options[Number(event.target.value)]
            if (option) {
              onChange(row.property, option.value)
            }
          }}
        >
          <option value="" disabled>
            {isArray(row.options)
              ? 'Select an option'
              : `No ${sourceLabels[row.options.source]} available`}
          </option>
          {options.map((option, index) => (
            <option
              key={`${typeof option.value}-${option.value}`}
              value={index}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  const numeric = row.type === 'textbox' || row.type === 'numeric'
  return (
    <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          className={inputClassName}
          type={numeric ? 'number' : 'text'}
          value={typeof value === 'boolean' ? '' : (value ?? '')}
          min={numeric ? row.min : undefined}
          max={numeric ? row.max : undefined}
          step={
            numeric
              ? row.valueType === 'integer'
                ? 1
                : row.type === 'numeric'
                  ? Number(`1e-${row.decimalPlaces}`)
                  : 'any'
              : undefined
          }
          aria-describedby={unit ? `${id}-unit` : undefined}
          onChange={(event) => {
            const nextValue = event.target.value
            onChange(row.property, nextValue)
            if (row.type === 'textbox') {
              for (const change of row.onChange ?? []) {
                onChange(
                  change.property,
                  typeof change.value === 'object'
                    ? matchesCondition(change.value, values)
                    : change.value
                )
              }
              event.target.setCustomValidity(
                row.exclusiveMin &&
                  nextValue !== '' &&
                  row.min !== undefined &&
                  Number(nextValue) <= row.min
                  ? `Value must be greater than ${row.min}.`
                  : ''
              )
            }
          }}
        />
        {unit && (
          <span id={`${id}-unit`} className="shrink-0 text-xs">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

export function FlowsheetNodePanels({ node }: { node: FlowNode }) {
  const definition = getUnitDefinition(node.unitType)
  const [values, setValues] = useState(() =>
    getInitialValues(definition.panels, node)
  )
  const onChange = (property: string, value: PanelValue) => {
    setValues((previous) => ({ ...previous, [property]: value }))
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="rounded bg-chalkboard-20 p-3 dark:bg-chalkboard-90">
        Preview only. Edits are not saved or sent to the simulator. Values use
        SI units unless noted.
      </p>
      {definition.panels.map((row) =>
        row.type === 'description' &&
        row.label.startsWith('Property values are updated/stored') ? null : (
          <PanelField
            key={getRowKey(row)}
            row={row}
            values={values}
            onChange={onChange}
          />
        )
      )}
    </div>
  )
}
