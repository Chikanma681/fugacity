import type { Port } from '@src/flowsheet/types'
import { generalPanels } from './generalPanels'
import type { PanelGroup, UnitDefinition } from './types'

export const materialPorts: Port[] = [
  {
    id: 'inlet',
    label: 'In',
    type: 'in',
    direction: 'right',
    x: 0,
    y: 0.5,
    index: 0,
  },
  {
    id: 'outlet',
    label: 'Out',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.5,
    index: 0,
  },
]

const materialPanelGroups: PanelGroup[] = [
  {
    label: 'Information',
    panels: generalPanels,
  },
  {
    label: 'Connections',
    panels: [
      { type: 'label', label: 'Connections' },
      {
        type: 'description',
        label:
          'Connection editing is not available here yet. Connect streams on the flowsheet.',
      },
    ],
  },
  {
    label: 'Input Data',
    panels: [
      { type: 'label', label: 'Stream Conditions' },
      {
        type: 'description',
        label: 'Stream condition inputs are not implemented yet.',
      },
      { type: 'label', label: 'Compound Amounts' },
      {
        type: 'description',
        label: 'Compound amount inputs are not implemented yet.',
      },
    ],
  },
]

export const materialUnitDefinition: UnitDefinition = {
  unitType: 'MaterialStream',
  label: 'Material Stream',
  tagPrefix: '',
  namePrefix: 'MAT',
  width: 96,
  height: 32,
  ports: materialPorts,
  panels: materialPanelGroups.flatMap((group) => group.panels),
  groups: materialPanelGroups,
}
