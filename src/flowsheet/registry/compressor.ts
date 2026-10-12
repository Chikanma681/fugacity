import type { Port } from '@src/flowsheet/types'
import { generalPanels } from './generalPanels'
import type { UnitDefinition } from './types'

export const compressorPorts: Port[] = [
  {
    id: 'inlet',
    label: 'Inlet',
    type: 'in',
    direction: 'down',
    x: 0,
    y: 0,
    index: 0,
  },
  {
    id: 'energyIn',
    label: 'Energy Stream',
    type: 'energy',
    direction: 'right',
    x: 0,
    y: 0.5,
    index: 1,
  },
  {
    id: 'outlet',
    label: 'Outlet',
    type: 'out',
    direction: 'up',
    x: 1,
    y: 0.3,
    index: 0,
  },
]

export const compressorUnitDefinition: UnitDefinition = {
  unitType: 'Compressor',
  label: 'Compressor',
  tagPrefix: 'C-',
  namePrefix: 'COMP',
  width: 58,
  height: 58,
  ports: compressorPorts,
  panels: [
    ...generalPanels,
    {
      type: 'dropdown',
      label: 'Calculation Mode',
      property: 'CalcMode',
      enumType: 'Compressor.CalculationMode',
      fallbackIndex: 0,
      options: [
        { label: 'Outlet Pressure', value: 'OutletPressure' },
        { label: 'Pressure Variation', value: 'Delta_P' },
        { label: 'Power Required', value: 'PowerRequired' },
        { label: 'Energy Stream', value: 'EnergyStream' },
        { label: 'Known Head', value: 'Head' },
        { label: 'Performance Curves', value: 'Curves' },
        { label: 'Pressure Ratio', value: 'PressureRatio' },
      ],
    },
    {
      type: 'dropdown',
      label: 'Thermodynamic Path',
      property: 'ProcessPath',
      enumType: 'Compressor.ProcessPathType',
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
      label: 'Pressure Increase',
      property: 'DeltaP',
      format: 'nf',
      unit: 'deltaP',
    },
    {
      type: 'textbox',
      label: 'Pressure Ratio',
      property: 'PressureRatio',
      format: 'nf',
    },
    {
      type: 'textbox',
      label: 'Power Required',
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
