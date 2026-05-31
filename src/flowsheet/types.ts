export type UnitType =
  | 'MaterialStream'
  | 'EnergyStream'
  | 'Valve'
  | 'Compressor'
  | 'Pump'
  | 'HeatExchanger'

export type ConnectorType = 'in' | 'out' | 'energy'

export type ConnectorDirection = 'up' | 'down' | 'left' | 'right'

export type FlowConnectorId =
  | 'inlet'
  | 'outlet'
  | 'energyIn'
  | 'inlet1'
  | 'inlet2'
  | 'outlet1'
  | 'outlet2'

export type FlowConnector = {
  id: FlowConnectorId
  label: string
  type: ConnectorType
  direction: ConnectorDirection
  x: number
  y: number
  index: number
}

export type FlowNode = {
  id: string
  name: string
  tag: string
  label: string
  x: number
  y: number
  width: number
  height: number
  unitType: UnitType
  dwsimObjectType: UnitType
  connectors: FlowConnector[]
}

export type FlowEdge = {
  id: string
  from: string
  to: string
  fromConnector?: FlowConnectorId
  toConnector?: FlowConnectorId
}

export type Viewport = {
  x: number
  y: number
  scale: number
}
