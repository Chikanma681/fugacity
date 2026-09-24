import type { Port } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'
import { reactorPorts } from './reactorPorts'

export const conversionReactorPorts: Port[] = [
  ...reactorPorts,
  {
    id: 'energyOut',
    label: 'Energy Stream',
    type: 'energy',
    direction: 'down',
    x: 0.5,
    y: 1,
    index: 2,
  },
]

export const conversionReactorUnitDefinition: UnitDefinition = {
  unitType: 'ConversionReactor',
  label: 'Conversion Reactor',
  tagPrefix: 'RC-',
  namePrefix: 'RC',
  width: 72,
  height: 72,
  ports: conversionReactorPorts,
}
