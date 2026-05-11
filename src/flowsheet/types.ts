export type FlowNode = {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

export type FlowEdge = {
  id: string
  from: string
  to: string
}

export type Viewport = {
  x: number
  y: number
  scale: number
}
