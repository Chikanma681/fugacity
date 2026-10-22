import {
  objectDetailRows,
  propertyPackagePanel,
} from '@src/flowsheet/registry/generalPanels'
import type { UnitDefinition } from '@src/flowsheet/registry/types'
import type { Port } from '@src/flowsheet/types'

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
          type: 'label',
          label: 'State Specification',
          level: 2,
        },
        {
          type: 'dropdown',
          label: 'Specified Variables',
          property: 'SpecType',
          enumType: 'StreamSpec',
          fallbackIndex: 0,
          options: [
            { label: 'Temperature/Pressure', value: 0 },
            { label: 'Temperature/Vapor Fraction', value: 4 },
            { label: 'Pressure/Vapor Fraction', value: 3 },
            { label: 'Pressure/Enthalpy', value: 1 },
            { label: 'Pressure/Entropy', value: 2 },
          ],
        },
        {
          type: 'textbox',
          label: 'Temperature',
          property: 'Phases[0].Properties.temperature',
          format: 'nf',
          unit: 'temperature',
          min: 0,
          exclusiveMin: true,
          enabledWhen: { property: 'SpecType', operator: 'in', value: [0, 4] },
        },
        {
          type: 'textbox',
          label: 'Pressure',
          property: 'Phases[0].Properties.pressure',
          format: 'nf',
          unit: 'pressure',
          min: 0,
          exclusiveMin: true,
          enabledWhen: {
            property: 'SpecType',
            operator: 'in',
            value: [0, 1, 2, 3],
          },
        },
        {
          type: 'textbox',
          label: 'Specific Enthalpy',
          property: 'Phases[0].Properties.enthalpy',
          format: 'nf',
          unit: 'enthalpy',
          enabledWhen: { property: 'SpecType', operator: 'equals', value: 1 },
        },
        {
          type: 'textbox',
          label: 'Specific Entropy',
          property: 'Phases[0].Properties.entropy',
          format: 'nf',
          unit: 'entropy',
          enabledWhen: { property: 'SpecType', operator: 'equals', value: 2 },
        },
        {
          type: 'textbox',
          label: 'Vapor Mole Frac (spec)',
          property: 'Phases[2].Properties.molarfraction',
          format: 'nf',
          min: 0,
          max: 1,
          enabledWhen: { property: 'SpecType', operator: 'in', value: [3, 4] },
        },
        {
          type: 'dropdown',
          label: 'Force Phase',
          property: 'ForcePhase',
          enumType: 'ForcedPhase',
          fallbackIndex: 0,
          options: [
            { label: 'Global Definition', value: 4 },
            { label: 'Vapor', value: 1 },
            { label: 'Liquid', value: 2 },
            { label: 'Solid', value: 3 },
          ],
        },
        {
          type: 'checkbox',
          label: 'Enable Phase Envelope Lookup',
          property: 'GeneratePhaseEnvelopeLookup',
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
