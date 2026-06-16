import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const splitterConnectors: FlowConnector[] = [
  {
    id: 'inlet',
    label: 'Inlet',
    type: 'in',
    direction: 'right',
    x: 0,
    y: 0.5,
    index: 0,
  },
  ...[0, 0.5, 1].map((y, index) => ({
    id: `outlet${index + 1}`,
    label: `Outlet ${index + 1}`,
    type: 'out' as const,
    direction: 'right' as const,
    x: 1,
    y,
    index,
  })),
]

export const splitterUnitDefinition: UnitDefinition = {
  unitType: 'Splitter',
  label: 'Stream Splitter',
  tagPrefix: 'SPL-',
  namePrefix: 'SPL',
  width: 64,
  height: 64,
  connectors: splitterConnectors,
}
