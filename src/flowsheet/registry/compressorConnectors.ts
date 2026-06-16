import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const compressorConnectors: FlowConnector[] = [
  {
    id: 'inlet',
    label: 'Inlet',
    type: 'in',
    direction: 'down',
    x: 0,
    y: 0,
    index: 0,
  },
  {
    id: 'energyIn',
    label: 'Energy Stream',
    type: 'energy',
    direction: 'right',
    x: 0,
    y: 0.5,
    index: 1,
  },
  {
    id: 'outlet',
    label: 'Outlet',
    type: 'out',
    direction: 'up',
    x: 1,
    y: 0.3,
    index: 0,
  },
]

export const compressorUnitDefinition: UnitDefinition = {
  unitType: 'Compressor',
  label: 'Compressor',
  tagPrefix: 'C-',
  namePrefix: 'COMP',
  width: 58,
  height: 58,
  connectors: compressorConnectors,
}
