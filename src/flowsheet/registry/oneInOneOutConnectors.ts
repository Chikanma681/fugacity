import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const oneInOneOutConnectors: FlowConnector[] = [
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
  connectors: oneInOneOutConnectors,
}
