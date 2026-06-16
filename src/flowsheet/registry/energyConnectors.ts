import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const energyConnectors: FlowConnector[] = [
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

export const energyUnitDefinition: UnitDefinition = {
  unitType: 'EnergyStream',
  label: 'Energy Stream',
  tagPrefix: 'E',
  namePrefix: 'EN',
  width: 96,
  height: 32,
  connectors: energyConnectors,
}
