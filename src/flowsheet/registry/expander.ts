import type { Port } from '@src/flowsheet/types'
import { generalPanels } from './generalPanels'
import type { UnitDefinition } from './types'

export const expanderPorts: Port[] = [
  {
    id: 'inlet',
    label: 'Inlet',
    type: 'in',
    direction: 'down',
    x: 0,
    y: 0.3,
    index: 0,
  },
  {
    id: 'energyOut',
    label: 'Energy Stream',
    type: 'energy',
    direction: 'right',
    x: 1,
    y: 0.5,
    index: 0,
  },
  {
    id: 'outlet',
    label: 'Outlet',
    type: 'out',
    direction: 'up',
    x: 1,
    y: 0,
    index: 0,
  },
]

export const expanderUnitDefinition: UnitDefinition = {
  unitType: 'Expander',
  label: 'Expander',
  tagPrefix: 'EXP-',
  namePrefix: 'EXP',
  width: 58,
  height: 58,
  ports: expanderPorts,
  panels: [
    ...generalPanels,
    {
      type: 'dropdown',
      label: 'Calculation Mode',
      property: 'CalcMode',
      enumType: 'Expander.CalculationMode',
      fallbackIndex: 0,
      options: [
        { label: 'Outlet Pressure', value: 'OutletPressure' },
        { label: 'Pressure Variation', value: 'Delta_P' },
        { label: 'Power Generated', value: 'PowerGenerated' },
        { label: 'Known Head', value: 'Head' },
        { label: 'Performance Curves', value: 'Curves' },
        { label: 'Pressure Ratio', value: 'PressureRatio' },
      ],
    },
    {
      type: 'dropdown',
      label: 'Thermodynamic Path',
      property: 'ProcessPath',
      enumType: 'Expander.ProcessPathType',
      options: [
        { label: 'Adiabatic', value: 0 },
        { label: 'Polytropic', value: 1 },
      ],
    },
    {
      type: 'textbox',
      label: 'Outlet Pressure',
      property: 'POut',
      format: 'nf',
      unit: 'pressure',
    },
    {
      type: 'textbox',
      label: 'Pressure Drop',
      property: 'DeltaP',
      format: 'nf',
      unit: 'deltaP',
    },
    {
      type: 'textbox',
      label: 'Power Generated',
      property: 'DeltaQ',
      format: 'nf',
      unit: 'heatflow',
    },
    {
      type: 'textbox',
      label: 'Adiabatic Efficiency (%)',
      property: 'AdiabaticEfficiency',
      format: 'nf',
    },
    {
      type: 'textbox',
      label: 'Polytropic Efficiency (%)',
      property: 'PolytropicEfficiency',
      format: 'nf',
    },
  ],
}
