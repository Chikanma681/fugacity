import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const separatorVesselConnectors: FlowConnector[] = [
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `inlet${index + 1}`,
    label: `Inlet Stream #${index}`,
    type: 'in' as const,
    direction: 'right' as const,
    x: 0.25,
    y: (index + 2) / 10,
    index,
  })),
  {
    id: 'energyIn',
    label: 'Energy Stream',
    type: 'energy',
    direction: 'right',
    x: 0.25,
    y: 1,
    index: 6,
  },
  {
    id: 'vaporOutlet',
    label: 'Vapor Outlet',
    type: 'out',
    direction: 'up',
    x: 0.5,
    y: 0,
    index: 0,
  },
  {
    id: 'lightLiquidOutlet',
    label: 'Light Liquid Outlet',
    type: 'out',
    direction: 'right',
    x: 0.75,
    y: 5 / 7,
    index: 1,
  },
  {
    id: 'heavyLiquidOutlet',
    label: 'Heavy Liquid Outlet',
    type: 'out',
    direction: 'down',
    x: 0.5,
    y: 1,
    index: 2,
  },
  {
    id: 'reliefOutlet',
    label: 'Relief Valve Outlet',
    type: 'out',
    direction: 'up',
    x: 0.65,
    y: 0.045,
    index: 3,
  },
]

export const separatorVesselUnitDefinition: UnitDefinition = {
  unitType: 'SeparatorVessel',
  label: 'Gas-Liquid Separator',
  tagPrefix: 'SEP-',
  namePrefix: 'SEP',
  width: 72,
  height: 96,
  connectors: separatorVesselConnectors,
}
