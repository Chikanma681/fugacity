import type { Port } from '@src/flowsheet/types'
import { objectDetailRows, propertyPackagePanel } from './generalPanels'
import type { UnitDefinition } from './types'

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

export const materialUnitDefinition: UnitDefinition = {
  unitType: 'MaterialStream',
  label: 'Material Stream',
  tagPrefix: '',
  namePrefix: 'MAT',
  width: 96,
  height: 32,
  ports: materialPorts,
  panelLayout: 'radio',
  panels: [
    { type: 'label', label: 'Information' },
    { type: 'group', label: 'Object Details', rows: objectDetailRows },
    propertyPackagePanel,
    { type: 'label', label: 'Connections' },
    {
      type: 'group',
      label: 'Connections',
      rows: [
        {
          type: 'description',
          label:
            'Connection editing is not available here yet. Connect streams on the flowsheet.',
        },
      ],
    },
    { type: 'label', label: 'Input Data' },
    {
      type: 'group',
      label: 'Stream Conditions',
      rows: [
        {
          type: 'description',
          label: 'Stream condition inputs are not implemented yet.',
        },
      ],
    },
    {
      type: 'group',
      label: 'Compound Amounts',
      rows: [
        {
          type: 'description',
          label: 'Compound amount inputs are not implemented yet.',
        },
      ],
    },
  ],
}
