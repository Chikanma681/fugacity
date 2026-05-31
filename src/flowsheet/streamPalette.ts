import type { CustomIconName } from '@src/components/CustomIcon'
import { unitRegistry } from '@src/flowsheet/registry'
import type { UnitType } from '@src/flowsheet/types'

export const STREAM_DRAG_TYPE = 'application/x-zoo-stream'
export const FLOWSHEET_ADD_STREAM_EVENT = 'flowsheet:add-stream'

export type StreamKind = UnitType

export type StreamPaletteItem = {
  kind: StreamKind
  label: string
  width: number
  height: number
  icon: CustomIconName
}

export const streamPalette: StreamPaletteItem[] = [
  {
    kind: 'MaterialStream',
    label: unitRegistry.MaterialStream.label,
    width: unitRegistry.MaterialStream.width,
    height: unitRegistry.MaterialStream.height,
    icon: 'arrowShortRight',
  },
  {
    kind: 'EnergyStream',
    label: unitRegistry.EnergyStream.label,
    width: unitRegistry.EnergyStream.width,
    height: unitRegistry.EnergyStream.height,
    icon: 'sparkles',
  },
  {
    kind: 'Valve',
    label: unitRegistry.Valve.label,
    width: unitRegistry.Valve.width,
    height: unitRegistry.Valve.height,
    icon: 'revolve',
  },
  {
    kind: 'Compressor',
    label: unitRegistry.Compressor.label,
    width: unitRegistry.Compressor.width,
    height: unitRegistry.Compressor.height,
    icon: 'revolve',
  },
  {
    kind: 'Pump',
    label: unitRegistry.Pump.label,
    width: unitRegistry.Pump.width,
    height: unitRegistry.Pump.height,
    icon: 'revolve',
  },
  {
    kind: 'HeatExchanger',
    label: unitRegistry.HeatExchanger.label,
    width: unitRegistry.HeatExchanger.width,
    height: unitRegistry.HeatExchanger.height,
    icon: 'revolve',
  },
]
