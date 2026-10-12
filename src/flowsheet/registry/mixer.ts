import type { Port } from '@src/flowsheet/types'
import { generalPanels } from './generalPanels'
import type { UnitDefinition } from './types'

export const mixerPorts: Port[] = [
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `inlet${index + 1}`,
    label: `Inlet Stream ${index + 1}`,
    type: 'in' as const,
    direction: 'right' as const,
    x: 0,
    y: index / 5,
    index,
  })),
  {
    id: 'outlet',
    label: 'Mixed Stream',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.5,
    index: 0,
  },
]

export const mixerUnitDefinition: UnitDefinition = {
  unitType: 'Mixer',
  label: 'Stream Mixer',
  tagPrefix: 'MIX-',
  namePrefix: 'MIX',
  width: 64,
  height: 64,
  ports: mixerPorts,
  panels: [
    ...generalPanels,
    {
      type: 'dropdown',
      label: 'Pressure Calculation Mode',
      property: 'PressureCalculation',
      enumType: 'Mixer.PressureBehavior',
      options: [
        { label: 'Inlet Minimum', value: 0 },
        { label: 'Inlet Average', value: 1 },
        { label: 'Inlet Maximum', value: 2 },
      ],
    },
  ],
}
