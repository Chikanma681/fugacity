import type { Port } from '@src/flowsheet/types'
import { generalPanels } from './generalPanels'
import type { UnitDefinition } from './types'

export const oneInOneOutPorts: Port[] = [
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
    id: 'outlet',
    label: 'Outlet',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.5,
    index: 0,
  },
]

export const valveUnitDefinition: UnitDefinition = {
  unitType: 'Valve',
  label: 'Valve',
  tagPrefix: 'VALVE-',
  namePrefix: 'VALV',
  width: 48,
  height: 48,
  ports: oneInOneOutPorts,
  panels: [
    ...generalPanels,
    {
      type: 'dropdown',
      label: 'Calculation Mode',
      property: 'CalcMode',
      enumType: 'Valve.CalculationMode',
      fallbackIndex: 0,
      options: [
        { label: 'Outlet Pressure', value: 'OutletPressure' },
        { label: 'Pressure Drop', value: 'DeltaP' },
        { label: 'Liquid Service Kv (Deprecated)', value: 'Kv_Liquid' },
        { label: 'Gas Service Kv (Deprecated)', value: 'Kv_Gas' },
        { label: 'Steam Service Kv (IEC 60534)', value: 'Kv_Steam' },
        { label: 'General Service Kv (IEC 60534)', value: 'Kv_General' },
      ],
    },
    {
      type: 'textbox',
      label: 'Outlet Pressure',
      property: 'OutletPressure',
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
  ],
}
