import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const cstrConnectors: FlowConnector[] = [
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
    x: 0.125,
    y: 0.7,
    index: 1,
  },
  {
    id: 'liquidOutlet',
    label: 'Liquid Outlet',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.5,
    index: 0,
  },
  {
    id: 'vaporOutlet',
    label: 'Vapor Outlet (Optional)',
    type: 'out',
    direction: 'up',
    x: 0.5,
    y: 0,
    index: 1,
  },
]

export const cstrUnitDefinition: UnitDefinition = {
  unitType: 'CSTR',
  label: 'CSTR',
  tagPrefix: 'CSTR-',
  namePrefix: 'CSTR',
  width: 72,
  height: 72,
  connectors: cstrConnectors,
}
