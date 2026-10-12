import type { Port } from '@src/flowsheet/types'
import { generalPanels } from './generalPanels'
import { heatExchangePanel } from './heatExchangePanels'
import type { UnitDefinition } from './types'

export const cstrPorts: Port[] = [
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
    id: 'energyIn',
    label: 'Energy Stream',
    type: 'energy',
    direction: 'right',
    x: 0.125,
    y: 0.7,
    index: 1,
  },
  {
    id: 'utilityFluidInlet',
    label: 'Utility Fluid Inlet (Optional)',
    type: 'in',
    direction: 'right',
    x: 0.875,
    y: 0.7,
    index: 2,
  },
  {
    id: 'liquidOutlet',
    label: 'Liquid Outlet',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.5,
    index: 0,
  },
  {
    id: 'vaporOutlet',
    label: 'Vapor Outlet (Optional)',
    type: 'out',
    direction: 'up',
    x: 0.5,
    y: 0,
    index: 1,
  },
  {
    id: 'utilityFluidOutlet',
    label: 'Utility Fluid Outlet (Optional)',
    type: 'out',
    direction: 'right',
    x: 0.875,
    y: 0.9,
    index: 2,
  },
]

export const cstrUnitDefinition: UnitDefinition = {
  unitType: 'CSTR',
  label: 'CSTR',
  tagPrefix: 'CSTR-',
  namePrefix: 'CSTR',
  width: 72,
  height: 72,
  ports: cstrPorts,
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
    },
    {
      type: 'dropdown',
      label: 'Calculation Mode',
      property: 'ReactorOperationMode',
      enumType: 'OperationMode',
      fallbackIndex: 0,
      options: [
        { label: 'Adiabatic', value: 'Adiabatic' },
        { label: 'Isothermic', value: 'Isothermic' },
        { label: 'Outlet Temperature', value: 'OutletTemperature' },
        { label: 'Heat Exchange', value: 'HeatExchange' },
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
      label: 'Reactor Volume',
      property: 'Volume',
      format: 'nf',
      unit: 'volume',
    },
    {
      type: 'textbox',
      label: 'Headspace Volume',
      property: 'Headspace',
      format: 'nf',
      unit: 'volume',
    },
    {
      type: 'checkbox',
      label: 'Mixture Reactions Use Headspace (Single Outlet)',
      property: 'MixtureUsesHeadspaceInSingleOutlet',
    },
    {
      type: 'textbox',
      label: 'Catalyst Amount',
      property: 'CatalystAmount',
      format: 'nf',
      unit: 'mass',
    },
    {
      type: 'textbox',
      label: 'Pressure Drop',
      property: 'DeltaP',
      format: 'nf',
      unit: 'deltaP',
    },
    heatExchangePanel,
  ],
}
