import type { Port } from '../types'
import type { UnitDefinition } from './types'

export const recyclePorts: Port[] = [
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

export const recycleUnitDefinition: UnitDefinition = {
  unitType: 'Recycle',
  label: 'Recycle',
  tagPrefix: 'R-',
  namePrefix: 'REC',
  width: 58,
  height: 58,
  ports: recyclePorts,
}
