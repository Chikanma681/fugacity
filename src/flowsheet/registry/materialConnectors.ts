import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const materialConnectors: FlowConnector[] = [
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

export const materialUnitDefinition: UnitDefinition = {
  unitType: 'MaterialStream',
  label: 'Material Stream',
  tagPrefix: '',
  namePrefix: 'MAT',
  width: 96,
  height: 32,
  connectors: materialConnectors,
}
