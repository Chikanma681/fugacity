import type { PanelRow } from './types'

export const heatExchangePanel: PanelRow = {
  type: 'group',
  label: 'Heat Exchange (Utility Fluid)',
  visibleWhen: {
    property: 'ReactorOperationMode',
    operator: 'equals',
    value: 'HeatExchange',
  },
  rows: [
    {
      type: 'dropdown',
      label: 'Heat Exchange Area Mode',
      property: 'HeatExchangeAreaCalculationMode',
      enumType: 'HeatExchangeAreaMode',
      options: [
        { label: 'Auto (from geometry)', value: 0 },
        { label: 'User-Specified', value: 1 },
      ],
    },
    {
      type: 'textbox',
      label: 'Heat Exchange Area',
      property: 'HeatExchangeArea',
      format: 'nf',
      unit: 'area',
    },
    {
      type: 'textbox',
      label: 'Overall HTC',
      property: 'OverallHeatTransferCoefficient',
      format: 'nf',
      unit: 'heat_transf_coeff',
    },
    {
      type: 'dropdown',
      label: 'Coolant Flow Direction',
      property: 'HeatExchangeCoolantFlowDirection',
      enumType: 'HeatExchangeCoolantMode',
      options: [
        { label: 'Constant Temperature', value: 0 },
        { label: 'Co-current', value: 1 },
        { label: 'Counter-current', value: 2 },
      ],
    },
    {
      type: 'textbox',
      label: 'Coolant Inlet Temperature',
      property: 'CoolantInletTemperature',
      format: 'nf',
      unit: 'temperature',
    },
    {
      type: 'textbox',
      label: 'Coolant Mass Flow',
      property: 'CoolantMassFlowRate',
      format: 'nf',
      unit: 'massflow',
    },
    {
      type: 'textbox',
      label: 'Coolant Specific Heat',
      property: 'CoolantSpecificHeat',
      format: 'nf',
      unit: 'heatCapacityCp',
    },
  ],
}
