import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const absorptionColumnConnectors: FlowConnector[] = [
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `feed${index + 1}`,
    label: `Column Feed Port #${index + 1}`,
    type: 'in' as const,
    direction: 'right' as const,
    x: 0.0625,
    y: 0.2 + ((index + 1) / 10) * 0.6,
    index,
  })),
  {
    id: 'topProduct',
    label: 'Top Product',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.02,
    index: 0,
  },
  {
    id: 'bottomProduct',
    label: 'Bottoms Product',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.98,
    index: 1,
  },
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `sideDraw${index + 1}`,
    label: `Side Draw #${index + 1}`,
    type: 'out' as const,
    direction: 'left' as const,
    x: 0.3125,
    y: 0.2 + ((index + 3) / 10) * 0.6,
    index: index + 2,
  })),
]

export const absorptionColumnUnitDefinition: UnitDefinition = {
  unitType: 'AbsorptionColumn',
  label: 'Absorption/Extraction Column',
  tagPrefix: 'ABS-',
  namePrefix: 'ABS',
  width: 88,
  height: 128,
  connectors: absorptionColumnConnectors,
}
