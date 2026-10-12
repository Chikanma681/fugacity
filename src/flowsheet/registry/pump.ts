import type { Port } from '@src/flowsheet/types'
import { generalPanels } from './generalPanels'
import type { UnitDefinition } from './types'

export const pumpPorts: Port[] = [
  {
    id: 'inlet',
    label: 'Inlet',
    type: 'in',
    direction: 'right',
    x: 0,
    y: 0.5,
    index: 0,
  },
  {
    id: 'energyIn',
    label: 'Energy Stream',
    type: 'energy',
    direction: 'right',
    x: 0.5,
    y: 1,
    index: 1,
  },
  {
    id: 'outlet',
    label: 'Outlet',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.1,
    index: 0,
  },
]

export const pumpUnitDefinition: UnitDefinition = {
  unitType: 'Pump',
  label: 'Pump',
  tagPrefix: 'PUMP-',
  namePrefix: 'BB',
  width: 58,
  height: 58,
  ports: pumpPorts,
  panels: [
    ...generalPanels,
    {
      type: 'dropdown',
      label: 'Calculation Mode',
      property: 'CalcMode',
      enumType: 'Pump.CalculationMode',
      fallbackIndex: 0,
      options: [
        { label: 'Outlet Pressure', value: 'OutletPressure' },
        { label: 'Pressure Increase', value: 'Delta_P' },
        { label: 'Power', value: 'Power' },
        { label: 'Energy Stream', value: 'EnergyStream' },
        { label: 'Defined Curves', value: 'Curves' },
      ],
    },
    {
      type: 'textbox',
      label: 'Outlet Pressure',
      property: 'Pout',
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
      label: 'Efficiency (%)',
      property: 'Eficiencia',
      format: 'nf',
    },
    {
      type: 'textbox',
      label: 'Power',
      property: 'DeltaQ',
      format: 'nf',
      unit: 'heatflow',
    },
  ],
}
