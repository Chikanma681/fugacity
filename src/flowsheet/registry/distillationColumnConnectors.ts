import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const distillationColumnConnectors: FlowConnector[] = [
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `feed${index + 1}`,
    label: `Column Feed Port #${index + 1}`,
    type: 'in' as const,
    direction: 'right' as const,
    x: 0.0625,
    y: 0.2 + ((index + 1) / 11) * 0.6,
    index,
  })),
  {
    id: 'reboilerDuty',
    label: 'Reboiler Duty',
    type: 'energy',
    direction: 'left',
    x: 1,
    y: 0.825,
    index: 10,
  },
  {
    id: 'distillate',
    label: 'Distillate',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.3,
    index: 0,
  },
  {
    id: 'bottoms',
    label: 'Bottoms',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.98,
    index: 1,
  },
  ...Array.from({ length: 7 }, (_, index) => ({
    id: `sideDraw${index + 1}`,
    label: `Side Draw #${index + 1}`,
    type: 'out' as const,
    direction: 'left' as const,
    x: 0.3125,
    y: 0.2 + ((index + 3) / 11) * 0.6,
    index: index + 2,
  })),
  {
    id: 'overheadVapor',
    label: 'Overhead Vapor',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.02,
    index: 9,
  },
  {
    id: 'condenserDuty',
    label: 'Condenser Duty',
    type: 'energy',
    direction: 'right',
    x: 1,
    y: 0.175,
    index: 10,
  },
]

export const distillationColumnUnitDefinition: UnitDefinition = {
  unitType: 'DistillationColumn',
  label: 'Distillation Column',
  tagPrefix: 'COL-',
  namePrefix: 'COL',
  width: 96,
  height: 128,
  connectors: distillationColumnConnectors,
}
