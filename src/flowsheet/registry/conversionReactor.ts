import type { Port } from '@src/flowsheet/types'
import { generalPanels } from './generalPanels'
import { reactorPorts } from './reactor'
import type { UnitDefinition } from './types'

export const conversionReactorPorts: Port[] = [
  ...reactorPorts.map((port) =>
    port.id === 'energyIn'
      ? { ...port, direction: 'up' as const, x: 0.25, y: 1 }
      : port
  ),
  {
    id: 'energyOut',
    label: 'Energy Stream',
    type: 'energy',
    direction: 'down',
    x: 0.5,
    y: 1,
    index: 2,
  },
]

export const conversionReactorUnitDefinition: UnitDefinition = {
  unitType: 'ConversionReactor',
  label: 'Conversion Reactor',
  tagPrefix: 'RC-',
  namePrefix: 'RC',
  width: 72,
  height: 72,
  ports: conversionReactorPorts,
  panels: [
    ...generalPanels,
    {
      type: 'dropdown',
      label: 'Reaction Set',
      property: 'ReactionSetID',
      options: {
        source: 'reactionSets',
        labelProperty: 'Name',
        valueProperty: 'ID',
      },
      fallbackIndex: 0,
      visibleWhen: { property: 'flowsheet.ReactionSets', operator: 'notEmpty' },
    },
    {
      type: 'dropdown',
      label: 'Calculation Mode',
      property: 'ReactorOperationMode',
      enumType: 'OperationMode',
      fallbackIndex: 0,
      options: [
        { label: 'Adiabatic', value: 'Adiabatic' },
        { label: 'Isothermal', value: 'Isothermic' },
        { label: 'Outlet Temperature', value: 'OutletTemperature' },
      ],
    },
    {
      type: 'textbox',
      label: 'Outlet Temperature',
      property: 'OutletTemperature',
      format: 'nf',
      unit: 'temperature',
    },
    {
      type: 'textbox',
      label: 'Pressure Drop',
      property: 'DeltaP',
      format: 'nf',
      unit: 'pressure',
    },
  ],
}
