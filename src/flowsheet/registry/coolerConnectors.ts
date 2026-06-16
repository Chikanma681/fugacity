import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const coolerConnectors: FlowConnector[] = [
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
]

export const coolerUnitDefinition: UnitDefinition = {
  unitType: 'Cooler',
  label: 'Cooler',
  tagPrefix: 'COOL-',
  namePrefix: 'COOL',
  width: 58,
  height: 58,
  connectors: coolerConnectors,
}
