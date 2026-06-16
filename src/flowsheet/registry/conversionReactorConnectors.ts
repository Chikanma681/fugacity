import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'
import { reactorConnectors } from './reactorConnectors'

export const conversionReactorConnectors: FlowConnector[] = [
  ...reactorConnectors,
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
  connectors: conversionReactorConnectors,
}
