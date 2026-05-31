import type { FlowConnector, UnitType } from '@src/flowsheet/types'

export type UnitDefinition = {
  unitType: UnitType
  label: string
  tagPrefix: string
  namePrefix: string
  width: number
  height: number
  connectors: FlowConnector[]
}

const materialConnectors: FlowConnector[] = [
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

const energyConnectors: FlowConnector[] = [
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

const oneInOneOutConnectors: FlowConnector[] = [
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

const pumpConnectors: FlowConnector[] = [
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
    direction: 'up',
    x: 0.5,
    y: 1,
    index: 1,
  },
  {
    id: 'outlet',
    label: 'Outlet',
    type: 'out',
    direction: 'right',
    x: 1,
    y: 0.1,
    index: 0,
  },
]

const compressorConnectors: FlowConnector[] = [
  {
    id: 'inlet',
    label: 'Inlet',
    type: 'in',
    direction: 'down',
    x: 0,
    y: 0,
    index: 0,
  },
  {
    id: 'energyIn',
    label: 'Energy Stream',
    type: 'energy',
    direction: 'right',
    x: 0,
    y: 0.5,
    index: 1,
  },
  {
    id: 'outlet',
    label: 'Outlet',
    type: 'out',
    direction: 'up',
    x: 1,
    y: 0.3,
    index: 0,
  },
]

const heatExchangerConnectors: FlowConnector[] = [
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

export const unitRegistry: Record<UnitType, UnitDefinition> = {
  MaterialStream: {
    unitType: 'MaterialStream',
    label: 'Material Stream',
    tagPrefix: '',
    namePrefix: 'MAT',
    width: 96,
    height: 32,
    connectors: materialConnectors,
  },
  EnergyStream: {
    unitType: 'EnergyStream',
    label: 'Energy Stream',
    tagPrefix: 'E',
    namePrefix: 'EN',
    width: 96,
    height: 32,
    connectors: energyConnectors,
  },
  Valve: {
    unitType: 'Valve',
    label: 'Valve',
    tagPrefix: 'VALVE-',
    namePrefix: 'VALV',
    width: 48,
    height: 48,
    connectors: oneInOneOutConnectors,
  },
  Compressor: {
    unitType: 'Compressor',
    label: 'Compressor',
    tagPrefix: 'C-',
    namePrefix: 'COMP',
    width: 58,
    height: 58,
    connectors: compressorConnectors,
  },
  Pump: {
    unitType: 'Pump',
    label: 'Pump',
    tagPrefix: 'PUMP-',
    namePrefix: 'BB',
    width: 58,
    height: 58,
    connectors: pumpConnectors,
  },
  HeatExchanger: {
    unitType: 'HeatExchanger',
    label: 'Heat Exchanger',
    tagPrefix: 'HX-',
    namePrefix: 'HE',
    width: 72,
    height: 72,
    connectors: heatExchangerConnectors,
  },
}

export function getUnitDefinition(unitType: UnitType) {
  return unitRegistry[unitType]
}
