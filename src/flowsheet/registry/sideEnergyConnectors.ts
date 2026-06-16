import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const sideEnergyConnectors: FlowConnector[] = [
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
    direction: 'up',
    x: 0.5,
    y: 1,
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

export const heaterUnitDefinition: UnitDefinition = {
  unitType: 'Heater',
  label: 'Heater',
  tagPrefix: 'HEAT-',
  namePrefix: 'HEAT',
  width: 58,
  height: 58,
  connectors: sideEnergyConnectors,
}

export const pfrUnitDefinition: UnitDefinition = {
  unitType: 'PFR',
  label: 'Plug Flow Reactor',
  tagPrefix: 'PFR-',
  namePrefix: 'PFR',
  width: 96,
  height: 48,
  connectors: sideEnergyConnectors,
}
