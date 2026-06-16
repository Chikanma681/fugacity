import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const reactorConnectors: FlowConnector[] = [
  {
    id: 'inlet',
    label: 'Inlet',
    type: 'in',
    direction: 'right',
    x: 0.11,
    y: 0.5,
    index: 0,
  },
  {
    id: 'energyIn',
    label: 'Energy Stream',
    type: 'energy',
    direction: 'up',
    x: 0.11,
    y: 0.7,
    index: 1,
  },
  {
    id: 'vaporOutlet',
    label: 'Vapor Outlet',
    type: 'out',
    direction: 'right',
    x: 0.89,
    y: 0.17,
    index: 0,
  },
  {
    id: 'liquidOutlet',
    label: 'Liquid Outlet',
    type: 'out',
    direction: 'right',
    x: 0.89,
    y: 0.83,
    index: 1,
  },
]

export const equilibriumReactorUnitDefinition: UnitDefinition = {
  unitType: 'EquilibriumReactor',
  label: 'Equilibrium Reactor',
  tagPrefix: 'RE-',
  namePrefix: 'RE',
  width: 72,
  height: 72,
  connectors: reactorConnectors,
}

export const gibbsReactorUnitDefinition: UnitDefinition = {
  unitType: 'GibbsReactor',
  label: 'Gibbs Reactor',
  tagPrefix: 'RG-',
  namePrefix: 'RG',
  width: 72,
  height: 72,
  connectors: reactorConnectors,
}
