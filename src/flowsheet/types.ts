export type UnitType =
  | 'MaterialStream'
  | 'EnergyStream'
  | 'Valve'
  | 'Compressor'
  | 'Expander'
  | 'Pump'
  | 'Mixer'
  | 'Splitter'
  | 'Recycle'
  | 'Cooler'
  | 'HeatExchanger'
  | 'Heater'
  | 'SeparatorVessel'
  | 'AbsorptionColumn'
  | 'DistillationColumn'
  | 'CSTR'
  | 'ConversionReactor'
  | 'EquilibriumReactor'
  | 'GibbsReactor'
  | 'PFR'

export type PortType = 'in' | 'out' | 'energy'

export type PortDirection = 'up' | 'down' | 'left' | 'right'

export type PortId = string

export type Port = {
  id: PortId
  label: string
  type: PortType
  direction: PortDirection
  x: number
  y: number
  index: number
}

export type NodeParameters = {
  schemaVersion: 1
  inputs: Record<string, string | number | boolean>
  displayUnits: Record<string, string>
}

export type FlowNodeChanges = {
  tag: string
  parameters: NodeParameters
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
  ports: Port[]
  parameters?: NodeParameters
}

export type FlowEdge = {
  id: string
  from: string
  to: string
  fromPort?: PortId
  toPort?: PortId
}

export type Viewport = {
  x: number
  y: number
  scale: number
}

export type FlowsheetState = {
  viewport: Viewport
  nodes: FlowNode[]
  edges: FlowEdge[]
}
