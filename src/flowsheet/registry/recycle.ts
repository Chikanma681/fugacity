import type { Port } from '../types'
import { generalPanels } from './generalPanels'
import type { UnitDefinition } from './types'

export const recyclePorts: Port[] = [
  {
    id: 'inlet',
    label: 'Inlet',
    type: 'in',
    direction: 'right',
    x: 0,
    y: 0.5,
    index: 0,
  },
  {
    id: 'outlet',
    label: 'Outlet',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.5,
    index: 0,
  },
]

export const recycleUnitDefinition: UnitDefinition = {
  unitType: 'Recycle',
  label: 'Recycle',
  tagPrefix: 'R-',
  namePrefix: 'REC',
  width: 58,
  height: 58,
  ports: recyclePorts,
  panels: [
    ...generalPanels,
    {
      type: 'readonly',
      label: 'Converged',
      property: 'Converged',
      displayValues: { true: 'Yes', false: 'No' },
    },
    {
      type: 'readonly',
      label: 'Iterations Taken',
      property: 'IterationsTaken',
    },
    {
      type: 'numeric',
      label: 'Maximum Iterations',
      property: 'MaximumIterations',
      min: 1,
      max: 10000,
      decimalPlaces: 0,
      valueType: 'integer',
    },
    {
      type: 'numeric',
      label: 'Smoothing Factor',
      property: 'SmoothingFactor',
      min: 0.001,
      max: 1,
      decimalPlaces: 4,
    },
    {
      type: 'checkbox',
      label: 'Legacy Convergence Mode',
      property: 'LegacyMode',
    },
    {
      type: 'dropdown',
      label: 'Acceleration Method',
      property: 'AccelerationMethod',
      enumType: 'AccelMethod',
      options: [
        { label: 'None', value: 0 },
        { label: 'Wegstein', value: 1 },
        { label: 'Dominant Eigenvalue', value: 2 },
        { label: 'Global Broyden', value: 3 },
      ],
    },
  ],
}
