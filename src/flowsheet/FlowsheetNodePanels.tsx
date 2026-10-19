import { Fragment, useId, useRef, useState } from 'react'

import { ActionButton } from '@src/components/ActionButton'
import { SettingsSection } from '@src/components/Settings/SettingsSection'
import { Toggle } from '@src/components/Toggle/Toggle'
import {
  type PanelCondition,
  type PanelOptionSource,
  type PanelRow,
  type PanelValue,
  getUnitDefinition,
} from '@src/flowsheet/registry'
import type { FlowNode } from '@src/flowsheet/types'
import { fromSI, panelUnits, toSI } from '@src/flowsheet/units'
import { isArray } from '@src/lib/utils'

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

function getPanelSections(rows: PanelRow[]) {
  const sections: { key: string; label: string; rows: PanelRow[] }[] = []
  for (const row of rows) {
    if (
      row.type === 'description' &&
      row.label.startsWith('Property values are updated/stored')
    ) {
      continue
    }
    if (row.type === 'label' && row.level !== 2) {
      sections.push({ key: getRowKey(row), label: row.label, rows: [] })
    } else {
      if (!sections.length) {
        sections.push({ key: 'general', label: 'General', rows: [] })
      }
      sections[sections.length - 1].rows.push(row)
    }
  }
  return sections.filter((section) => section.rows.length > 0)
}

const inputClassName =
  'p-1 bg-transparent border rounded-sm border-chalkboard-30 w-full'

function PanelControl({
  row,
  id,
  label,
  unit,
  values,
  onChange,
}: {
  row: Exclude<PanelRow, { type: 'label' | 'description' | 'group' }>
  id: string
  label: string
  unit?: string
  values: PanelValues
  onChange: (property: string, value: PanelValue) => void
}) {
  const [unitIndex, setUnitIndex] = useState(0)
  const units =
    !unit && 'unit' in row && row.unit ? (panelUnits[row.unit] ?? []) : []
  const selectedUnit = units[unitIndex] ?? units[0]
  const unitSelector = selectedUnit && (
    <select
      className="p-1 bg-transparent border rounded-sm border-chalkboard-30"
      aria-label={`${label} unit`}
      value={unitIndex}
      onChange={(event) => setUnitIndex(Number(event.target.value))}
    >
      {units.map(([symbol], index) => (
        <option key={symbol} value={index}>
          {symbol}
        </option>
      ))}
    </select>
  )

  if (row.type === 'collection') {
    return (
      <p className="text-xs text-chalkboard-80 dark:text-chalkboard-30">
        No {label.toLowerCase()} available. Requires simulation data.
      </p>
    )
  }
  if (row.type === 'button') {
    return (
      <ActionButton
        Element="button"
        type="button"
        disabled
        title="This editor is not available yet."
      >
        {label}
      </ActionButton>
    )
  }

  const value = values[row.property]
  if (row.type === 'readonly') {
    const text =
      value === undefined
        ? 'Not available'
        : row.displayValues && typeof value === 'boolean'
          ? row.displayValues[value ? 'true' : 'false']
          : String(value)
    return (
      <div className="flex items-center gap-2">
        <span>
          {typeof value === 'number' && selectedUnit
            ? fromSI(value, selectedUnit)
            : text}
        </span>
        {unitSelector}
      </div>
    )
  }
  if (row.type === 'checkbox') {
    return (
      <Toggle
        name={id}
        aria-label={label}
        checked={value === true}
        onChange={(event) => onChange(row.property, event.target.checked)}
      />
    )
  }
  if (row.type === 'dropdown') {
    const options = isArray(row.options) ? row.options : []
    const selectedIndex = options.findIndex((option) => option.value === value)
    return (
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
          <option key={`${typeof option.value}-${option.value}`} value={index}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  const numeric = row.type === 'textbox' || row.type === 'numeric'
  const displayValue =
    value !== undefined &&
    value !== '' &&
    typeof value !== 'boolean' &&
    selectedUnit
      ? fromSI(Number(value), selectedUnit)
      : typeof value === 'boolean'
        ? ''
        : (value ?? '')
  return (
    <div className="flex gap-2">
      <input
        id={id}
        className={`${inputClassName} min-w-0`}
        type={numeric ? 'number' : 'text'}
        value={displayValue}
        min={
          numeric && row.min !== undefined
            ? selectedUnit
              ? fromSI(row.min, selectedUnit)
              : row.min
            : undefined
        }
        max={
          numeric && row.max !== undefined
            ? selectedUnit
              ? fromSI(row.max, selectedUnit)
              : row.max
            : undefined
        }
        step={
          numeric
            ? row.valueType === 'integer'
              ? 1
              : row.type === 'numeric'
                ? Number(`1e-${row.decimalPlaces}`)
                : 'any'
            : undefined
        }
        aria-describedby={
          unit || selectedUnit ? `${id}-description` : undefined
        }
        onChange={(event) => {
          const input = event.target.value
          const nextValue =
            input !== '' && selectedUnit
              ? toSI(Number(input), selectedUnit)
              : input
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
      {selectedUnit && (
        <span id={`${id}-description`} className="sr-only">
          {selectedUnit[0]}
        </span>
      )}
      {unitSelector}
    </div>
  )
}

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
  const label = displayLabel(row.label)
  if (row.visibleWhen && !matchesCondition(row.visibleWhen, values)) {
    return null
  }
  if (row.type === 'label') {
    return (
      <h2 className="text-xl mt-6 first-of-type:mt-0 capitalize font-bold">
        {label}
      </h2>
    )
  }
  if (row.type === 'description') {
    return (
      <p className="text-xs text-chalkboard-80 dark:text-chalkboard-30">
        {label}
      </p>
    )
  }
  if (row.type === 'group') {
    return (
      <fieldset className="flex flex-col gap-4">
        {label && (
          <legend className="text-xl mb-4 capitalize font-bold">{label}</legend>
        )}
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
  const unit = 'fixedUnit' in row ? row.fixedUnit : undefined
  return (
    <SettingsSection title={label} htmlFor={id} description={unit}>
      <PanelControl
        row={row}
        id={id}
        label={label}
        unit={unit}
        values={values}
        onChange={onChange}
      />
    </SettingsSection>
  )
}

export function FlowsheetNodePanels({ node }: { node: FlowNode }) {
  const definition = getUnitDefinition(node.unitType)
  const sections = getPanelSections(definition.panels)
  const scrollRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const [values, setValues] = useState(() =>
    getInitialValues(definition.panels, node)
  )
  const onChange = (property: string, value: PanelValue) => {
    setValues((previous) => ({ ...previous, [property]: value }))
  }

  return (
    <div
      className="flex-1 grid items-stretch pl-4 pr-5 pb-5 gap-2 overflow-hidden"
      style={{ gridTemplateColumns: 'auto 1fr', gridTemplateRows: '1fr' }}
    >
      <nav
        aria-label="Node property sections"
        className="flex w-32 flex-col gap-3 pr-2 py-1 border-0 border-r border-r-chalkboard-20 dark:border-r-chalkboard-90"
      >
        {sections.map((section, index) => (
          <button
            key={section.key}
            type="button"
            aria-controls={`${id}-section-${index}`}
            className="capitalize text-left border-none px-1"
            onClick={() =>
              scrollRef.current
                ?.querySelector(`[id="${id}-section-${index}"]`)
                ?.scrollIntoView({
                  block: 'center',
                  behavior: 'smooth',
                })
            }
          >
            {section.label}
          </button>
        ))}
      </nav>
      <div className="relative overflow-y-auto">
        <div ref={scrollRef} className="flex flex-col gap-4 px-2">
          <p className="text-xs text-chalkboard-80 dark:text-chalkboard-30">
            Preview only. Edits are not saved or sent to the simulator. Values
            use the selected units.
          </p>
          {sections.map((section, index) => (
            <Fragment key={section.key}>
              <h2
                id={`${id}-section-${index}`}
                className="text-xl mt-6 first-of-type:mt-0 capitalize font-bold"
              >
                {section.label}
              </h2>
              {section.rows.map((row) => (
                <PanelField
                  key={getRowKey(row)}
                  row={row}
                  values={values}
                  onChange={onChange}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
