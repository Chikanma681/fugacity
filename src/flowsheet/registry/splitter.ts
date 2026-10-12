import type { Port } from '@src/flowsheet/types'
import { generalPanels } from './generalPanels'
import type { UnitDefinition } from './types'

export const splitterPorts: Port[] = [
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
  ports: splitterPorts,
  panels: [
    ...generalPanels,
    {
      type: 'dropdown',
      label: 'Calculation Mode',
      property: 'OperationMode',
      enumType: 'Splitter.OpMode',
      fallbackIndex: 0,
      options: [
        { label: 'Split Ratios', value: 0 },
        { label: 'Stream 1 + 2 Mass Flow', value: 1 },
        { label: 'Stream 1 + 2 Mole Flow', value: 2 },
        { label: 'Stream 1 + 2 Volume Flow', value: 3 },
      ],
    },
    { type: 'label', label: 'Outlet 1' },
    {
      type: 'textbox',
      label: 'Split Ratio (fraction, 0-1)',
      property: 'Ratios[0]',
      format: 'nf',
    },
    {
      type: 'textbox',
      label: 'Mass Flow Spec',
      property: 'StreamFlowSpec',
      format: 'nf',
      unit: 'massflow',
    },
    { type: 'label', label: 'Outlet 2' },
    {
      type: 'textbox',
      label: 'Split Ratio (fraction, 0-1)',
      property: 'Ratios[1]',
      format: 'nf',
    },
    {
      type: 'textbox',
      label: 'Mass Flow Spec',
      property: 'Stream2FlowSpec',
      format: 'nf',
      unit: 'massflow',
    },
    { type: 'label', label: 'Outlet 3 (derived)' },
    {
      type: 'textbox',
      label: 'Split Ratio (fraction, 0-1)',
      property: 'Ratios[2]',
      format: 'nf',
    },
    {
      type: 'description',
      label:
        'Outlet 3 ratio is normally 1 - r1 - r2. Edit the upper rows in Split Ratios mode; outlet 3 is recomputed on solve.',
    },
  ],
}
