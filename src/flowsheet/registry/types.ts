import type { Port, UnitType } from '@src/flowsheet/types'

export type PanelValue = string | number | boolean

export type PanelCondition = {
  property: string
  operator: 'equals' | 'exists' | 'notEmpty' | 'empty' | 'existsIn' | 'in'
  value?: PanelValue | PanelValue[]
  filter?: PanelCondition | PanelCondition[]
}

export type PanelOption = {
  label: string
  value: PanelValue
}

export type PanelOptionSource = {
  source:
    | 'propertyPackages'
    | 'reactionSets'
    | 'selectedCompounds'
    | 'externalSolvers'
    | 'stages'
    | 'columnSpecificationUnits'
  labelProperty?: string
  valueProperty?: string
  prepend?: PanelOption[]
  append?: PanelOption[]
  unitMeasures?: string[]
  filter?: PanelCondition
  matchProperties?: string[]
}

// Property paths refer to DWSIM objects; unit keys label and convert SI-backed values.
export type PanelRow = {
  label: string
  visibleWhen?: PanelCondition
} & (
  | { type: 'label'; level?: 2 }
  | { type: 'description' }
  | {
      type: 'readonly'
      property: string
      format?: string
      unit?: string
      displayValues?: { true: string; false: string }
    }
  | { type: 'string'; property: string }
  | {
      type: 'textbox'
      property: string
      format: string
      unit?: string
      fixedUnit?: string
      valueType?: 'integer'
      min?: number
      max?: number
      exclusiveMin?: boolean
      onChange?: {
        property: string
        value: PanelValue | PanelCondition
      }[]
    }
  | {
      type: 'numeric'
      property: string
      min: number
      max: number
      decimalPlaces: number
      valueType?: 'integer'
      setter?: string
    }
  | { type: 'checkbox'; property: string }
  | {
      type: 'dropdown'
      property: string
      options: PanelOption[] | PanelOptionSource
      enumType?: string
      fallbackIndex?: number
    }
  | { type: 'button'; action: string }
  | { type: 'group'; rows: PanelRow[]; level?: 2 }
  | {
      type: 'collection'
      property: string
      itemLabel: string
      itemLabelExpression?: string
      labelPrefixes?: { property: string; values: Record<string, string> }
      rows: PanelRow[]
      filter?: PanelCondition[]
      membershipProperty?: string
    }
)

export type UnitDefinition = {
  unitType: UnitType
  label: string
  tagPrefix: string
  namePrefix: string
  width: number
  height: number
  ports: Port[]
  panels: PanelRow[]
}
