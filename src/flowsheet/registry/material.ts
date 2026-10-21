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
    { type: 'label', label: 'Information', icon: 'file' },
    { type: 'group', label: 'Object Details', rows: objectDetailRows },
    propertyPackagePanel,
    { type: 'label', label: 'Connections', icon: 'link' },
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
    { type: 'label', label: 'Input Data', icon: 'clipboard' },
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
    { type: 'label', label: 'Results', icon: 'clipboardCheckmark' },
    {
      type: 'group',
      label: 'Compounds',
      rows: [
        {
          type: 'tabs',
          label: 'Compound results',
          tabs: [
            {
              label: 'Amounts',
              rows: [
                {
                  type: 'description',
                  label: 'No calculated compound amounts are available.',
                },
              ],
            },
            {
              label: 'Properties',
              rows: [
                {
                  type: 'description',
                  label: 'No calculated compound properties are available.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      label: 'Phase Properties',
      rows: [
        {
          type: 'tabs',
          label: 'Phase property results',
          tabs: [
            'Mixture',
            'Vapor',
            'Overall Liquid',
            'Liquid 1',
            'Liquid 2',
            'Solid',
          ].map((phase) => ({
            label: phase,
            rows: [
              {
                type: 'description',
                label: `No calculated ${phase.toLowerCase()} properties are available.`,
              },
            ],
          })),
        },
      ],
    },
  ],
}
