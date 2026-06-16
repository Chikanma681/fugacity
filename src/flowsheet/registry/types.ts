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
