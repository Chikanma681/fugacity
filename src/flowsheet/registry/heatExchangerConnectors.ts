import type { FlowConnector } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'

export const heatExchangerConnectors: FlowConnector[] = [
  {
    id: 'inlet1',
    label: 'Inlet Stream 1',
    type: 'in',
    direction: 'right',
    x: 0,
    y: 0.5,
    index: 0,
  },
  {
    id: 'inlet2',
    label: 'Inlet Stream 2',
    type: 'in',
    direction: 'down',
    x: 0.5,
    y: 0,
    index: 1,
  },
  {
    id: 'outlet1',
    label: 'Outlet Stream 1',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.5,
    index: 0,
  },
  {
    id: 'outlet2',
    label: 'Outlet Stream 2',
    type: 'out',
    direction: 'down',
    x: 0.5,
    y: 1,
    index: 1,
  },
]

export const heatExchangerUnitDefinition: UnitDefinition = {
  unitType: 'HeatExchanger',
  label: 'Heat Exchanger',
  tagPrefix: 'HX-',
  namePrefix: 'HE',
  width: 72,
  height: 72,
  connectors: heatExchangerConnectors,
}
