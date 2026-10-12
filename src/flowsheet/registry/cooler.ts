import type { Port } from '@src/flowsheet/types'
import { generalPanels } from './generalPanels'
import type { UnitDefinition } from './types'

export const coolerPorts: Port[] = [
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
    label: 'Energy Stream (Secondary)',
    type: 'energy',
    direction: 'up',
    x: 0.5,
    y: 0,
    index: 1,
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
  {
    id: 'energyOutPrimary',
    label: 'Energy Stream (Primary)',
    type: 'energy',
    direction: 'down',
    x: 0.5,
    y: 1,
    index: 0,
  },
]

export const coolerUnitDefinition: UnitDefinition = {
  unitType: 'Cooler',
  label: 'Cooler',
  tagPrefix: 'COOL-',
  namePrefix: 'COOL',
  width: 58,
  height: 58,
  ports: coolerPorts,
  panels: [
    ...generalPanels,
    {
      type: 'dropdown',
      label: 'Calculation Mode',
      property: 'CalcMode',
      enumType: 'Cooler.CalculationMode',
      fallbackIndex: 0,
      options: [
        { label: 'Heat Added/Removed', value: 'HeatRemoved' },
        { label: 'Outlet Temperature', value: 'OutletTemperature' },
        { label: 'Outlet Vapor Fraction', value: 'OutletVaporFraction' },
        { label: 'Energy Stream', value: 'EnergyStream' },
      ],
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
      label: 'Outlet Temperature',
      property: 'OutletTemperature',
      format: 'nf',
      unit: 'temperature',
    },
    {
      type: 'textbox',
      label: 'Heat Removed',
      property: 'DeltaQ',
      format: 'nf',
      unit: 'heatflow',
    },
    {
      type: 'textbox',
      label: 'Efficiency (%)',
      property: 'Eficiencia',
      format: 'nf',
    },
    {
      type: 'textbox',
      label: 'Outlet Vapor Fraction',
      property: 'OutletVaporFraction',
      format: 'nf',
    },
  ],
}
