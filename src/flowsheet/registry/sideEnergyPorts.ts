import type { Port } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const heaterPorts: Port[] = [
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
    label: 'Energy Stream (Primary)',
    type: 'energy',
    direction: 'down',
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
  {
    id: 'energyOutSecondary',
    label: 'Energy Stream (Secondary)',
    type: 'energy',
    direction: 'up',
    x: 0.5,
    y: 1,
    index: 0,
  },
]

export const sideEnergyPorts = heaterPorts

export const pfrPorts: Port[] = [
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
    x: 0.5,
    y: 1,
    index: 1,
  },
  {
    id: 'utilityFluidInlet',
    label: 'Utility Fluid Inlet (Optional)',
    type: 'in',
    direction: 'down',
    x: 0.25,
    y: 0,
    index: 2,
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
  {
    id: 'utilityFluidOutlet',
    label: 'Utility Fluid Outlet (Optional)',
    type: 'out',
    direction: 'up',
    x: 0.75,
    y: 0,
    index: 1,
  },
]

export const heaterUnitDefinition: UnitDefinition = {
  unitType: 'Heater',
  label: 'Heater',
  tagPrefix: 'HEAT-',
  namePrefix: 'HEAT',
  width: 58,
  height: 58,
  ports: heaterPorts,
}

export const pfrUnitDefinition: UnitDefinition = {
  unitType: 'PFR',
  label: 'Plug Flow Reactor',
  tagPrefix: 'PFR-',
  namePrefix: 'PFR',
  width: 96,
  height: 48,
  ports: pfrPorts,
}
