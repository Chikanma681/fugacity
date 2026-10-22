import { RadioGroup } from '@headlessui/react'
import { Fragment, useId, useRef, useState } from 'react'

import { ActionButton } from '@src/components/ActionButton'
import { SettingsSection } from '@src/components/Settings/SettingsSection'
import { SettingsTabButton } from '@src/components/Settings/SettingsTabButton'
import { Toggle } from '@src/components/Toggle/Toggle'
import {
  type PanelCondition,
  type PanelOptionSource,
  type PanelRow,
  type PanelValue,
  getUnitDefinition,
} from '@src/flowsheet/registry'
import type { FlowNode, FlowNodeChanges } from '@src/flowsheet/types'
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

type EditableRow = Extract<
  PanelRow,
  { type: 'string' | 'textbox' | 'numeric' | 'checkbox' | 'dropdown' }
>

function resolvePanelRows(
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

function getEditableRows(rows: PanelRow[]): EditableRow[] {
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

function getInitialValues(rows: PanelRow[], node: FlowNode): PanelValues {
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
    'GetDisplayName()': getUnitDefinition(node.unitType).label,
    'GraphicObject.Tag': node.tag,
  }
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

function getNodeChanges(
  node: FlowNode,
  rows: PanelRow[],
  values: PanelValues,
  displayUnits: Record<string, string>
): FlowNodeChanges | string {
  const tag = String(values['GraphicObject.Tag'] ?? '').trim()
  if (!tag) {
    return 'The node name cannot be empty.'
  }
  const inputs = { ...node.parameters?.inputs }
  for (const row of getEditableRows(rows)) {
    if (
      row.property === 'GraphicObject.Tag' ||
      (row.enabledWhen && !matchesCondition(row.enabledWhen, values))
    ) {
      continue
    }
    const value = values[row.property]
    if (value === undefined || (value === '' && row.type !== 'string')) {
      delete inputs[row.property]
      continue
    }
    if (row.type === 'textbox' || row.type === 'numeric') {
      const number = Number(value)
      if (
        !Number.isFinite(number) ||
        typeof value === 'boolean' ||
        (row.valueType === 'integer' && !Number.isInteger(number)) ||
        (row.min !== undefined &&
          (number < row.min ||
            ('exclusiveMin' in row &&
              row.exclusiveMin &&
              number === row.min))) ||
        (row.max !== undefined && number > row.max)
      ) {
        return `Enter a valid value for ${row.label.trim()}.`
      }
      inputs[row.property] = number
      if (row.type === 'textbox') {
        for (const change of row.onChange ?? []) {
          if (values[change.property] !== undefined) {
            inputs[change.property] = values[change.property]
          }
        }
      }
    } else {
      inputs[row.property] = value
    }
  }
  return { tag, parameters: { schemaVersion: 1, inputs, displayUnits } }
}

function displayLabel(label: string) {
  return label.replace(/\{[^}]+\}/g, '—')
}

function getRowKey(row: PanelRow) {
  return `${row.type}-${'property' in row ? row.property : ''}-${row.label}`
}

type PanelSection = {
  key: string
  label: string
  rows: PanelRow[]
  visibleWhen?: PanelCondition
}

function getPanelSections(
  rows: PanelRow[],
  sectionType: 'label' | 'group' = 'label'
) {
  const sections: PanelSection[] = []
  for (const row of rows) {
    if (
      row.type === 'description' &&
      row.label.startsWith('Property values are updated/stored')
    ) {
      continue
    }
    if (
      (row.type === 'label' || row.type === 'group') &&
      row.type === sectionType &&
      row.level !== 2
    ) {
      sections.push({
        key: getRowKey(row),
        label: row.label,
        rows: row.type === 'group' ? row.rows : [],
        visibleWhen: row.visibleWhen,
      })
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
  displayUnits,
  onUnitChange,
}: {
  row: Exclude<PanelRow, { type: 'label' | 'description' | 'group' }>
  id: string
  label: string
  unit?: string
  values: PanelValues
  onChange: (property: string, value: PanelValue) => void
  displayUnits: Record<string, string>
  onUnitChange: (property: string, unit: string) => void
}) {
  const units =
    !unit && 'unit' in row && row.unit ? (panelUnits[row.unit] ?? []) : []
  const selectedUnit =
    units.find(
      ([symbol]) => 'property' in row && symbol === displayUnits[row.property]
    ) ?? units[0]
  const unitSelector = selectedUnit && (
    <select
      className="p-1 bg-transparent border rounded-sm border-chalkboard-30"
      aria-label={`${label} unit`}
      value={selectedUnit[0]}
      onChange={(event) => {
        if ('property' in row) {
          onUnitChange(row.property, event.target.value)
        }
      }}
    >
      {units.map(([symbol]) => (
        <option key={symbol} value={symbol}>
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
        required={row.property === 'GraphicObject.Tag'}
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
  displayUnits,
  onUnitChange,
}: {
  row: PanelRow
  values: PanelValues
  onChange: (property: string, value: PanelValue) => void
  displayUnits: Record<string, string>
  onUnitChange: (property: string, unit: string) => void
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
            displayUnits={displayUnits}
            onUnitChange={onUnitChange}
          />
        ))}
      </fieldset>
    )
  }
  const unit = 'fixedUnit' in row ? row.fixedUnit : undefined
  return (
    <SettingsSection title={label} htmlFor={id} description={unit}>
      <fieldset
        className="min-w-0 disabled:opacity-50"
        disabled={row.enabledWhen && !matchesCondition(row.enabledWhen, values)}
      >
        <PanelControl
          row={row}
          id={id}
          label={label}
          unit={unit}
          values={values}
          onChange={onChange}
          displayUnits={displayUnits}
          onUnitChange={onUnitChange}
        />
      </fieldset>
    </SettingsSection>
  )
}

export function FlowsheetNodePanels({
  node,
  onSave,
  onCancel,
  saving = false,
  canSave = true,
  selectedCompoundIds = [],
}: {
  node: FlowNode
  onSave?: (changes: FlowNodeChanges) => Promise<void>
  onCancel?: () => void
  saving?: boolean
  canSave?: boolean
  selectedCompoundIds?: string[]
}) {
  const definition = getUnitDefinition(node.unitType)
  const panels = resolvePanelRows(definition.panels, selectedCompoundIds)
  const radioPanels =
    definition.panelLayout === 'radio' ? getPanelSections(panels) : []
  const [selectedPanel, setSelectedPanel] = useState(radioPanels[0]?.key)
  const activePanel =
    radioPanels.find((panel) => panel.key === selectedPanel) ?? radioPanels[0]
  const scrollRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const [values, setValues] = useState(() => getInitialValues(panels, node))
  const [displayUnits, setDisplayUnits] = useState<Record<string, string>>(
    () => ({ ...node.parameters?.displayUnits })
  )
  const [error, setError] = useState<string | null>(null)
  const sections = (
    activePanel
      ? getPanelSections(activePanel.rows, 'group')
      : getPanelSections(panels)
  ).filter(
    (section) =>
      !section.visibleWhen || matchesCondition(section.visibleWhen, values)
  )
  const onChange = (property: string, value: PanelValue) => {
    setValues((previous) => ({ ...previous, [property]: value }))
  }
  const onUnitChange = (property: string, unit: string) => {
    setDisplayUnits((previous) => ({ ...previous, [property]: unit }))
  }
  const save = async (form: HTMLFormElement) => {
    if (saving || !canSave || !onSave || !form.reportValidity()) {
      return
    }
    const changes = getNodeChanges(node, panels, values, displayUnits)
    if (typeof changes === 'string') {
      setError(changes)
      return
    }
    setError(null)
    try {
      await onSave(changes)
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : String(saveError)
      )
    }
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-busy={saving}
      onSubmit={(event) => {
        event.preventDefault()
        void save(event.currentTarget)
      }}
    >
      <fieldset disabled={saving} className="contents">
        {radioPanels.length > 0 && (
          <RadioGroup
            aria-label="Node property panels"
            aria-orientation="horizontal"
            disabled={saving}
            value={activePanel?.key}
            onChange={(value: string) => setSelectedPanel(value)}
            className="flex shrink-0 justify-start overflow-x-auto pl-4 pr-5 mb-4 gap-5 border-0 border-b border-b-chalkboard-20 dark:border-b-chalkboard-90"
          >
            {radioPanels.map((panel) => (
              <RadioGroup.Option
                key={panel.key}
                value={panel.key}
                className="whitespace-nowrap rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {({ checked }) => (
                  <SettingsTabButton checked={checked} text={panel.label} />
                )}
              </RadioGroup.Option>
            ))}
          </RadioGroup>
        )}
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
          <div key={activePanel?.key} className="relative overflow-y-auto">
            <div ref={scrollRef} className="flex flex-col gap-4 px-2">
              <p className="text-xs text-chalkboard-80 dark:text-chalkboard-30">
                Edits are not saved until you select Save. Saving does not run a
                simulation.
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
                      displayUnits={displayUnits}
                      onUnitChange={onUnitChange}
                    />
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </fieldset>
      <div className="border-t border-chalkboard-20 px-5 py-4 dark:border-chalkboard-80">
        {error && (
          <p
            role="alert"
            className="mb-3 text-sm text-destroy-70 dark:text-destroy-20"
          >
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <ActionButton
            Element="button"
            type="button"
            tabIndex={0}
            aria-label="Cancel"
            iconStart={{
              icon: 'close',
              size: 'sm',
              className: 'p-1 text-chalkboard-10',
              bgClassName: 'bg-destroy-70 dark:bg-destroy-70',
            }}
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </ActionButton>
          <ActionButton
            Element="button"
            type="submit"
            tabIndex={0}
            aria-label={saving ? 'Saving…' : 'Save'}
            iconStart={{ icon: 'checkmark', size: 'sm', className: 'p-1' }}
            disabled={saving || !canSave || !onSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </ActionButton>
        </div>
      </div>
    </form>
  )
}
