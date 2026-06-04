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
    kind: 'Expander',
    label: unitRegistry.Expander.label,
    width: unitRegistry.Expander.width,
    height: unitRegistry.Expander.height,
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
    kind: 'Mixer',
    label: unitRegistry.Mixer.label,
    width: unitRegistry.Mixer.width,
    height: unitRegistry.Mixer.height,
    icon: 'revolve',
  },
  {
    kind: 'Splitter',
    label: unitRegistry.Splitter.label,
    width: unitRegistry.Splitter.width,
    height: unitRegistry.Splitter.height,
    icon: 'revolve',
  },
  {
    kind: 'Cooler',
    label: unitRegistry.Cooler.label,
    width: unitRegistry.Cooler.width,
    height: unitRegistry.Cooler.height,
    icon: 'revolve',
  },
  {
    kind: 'HeatExchanger',
    label: unitRegistry.HeatExchanger.label,
    width: unitRegistry.HeatExchanger.width,
    height: unitRegistry.HeatExchanger.height,
    icon: 'revolve',
  },
  {
    kind: 'Heater',
    label: unitRegistry.Heater.label,
    width: unitRegistry.Heater.width,
    height: unitRegistry.Heater.height,
    icon: 'revolve',
  },
  {
    kind: 'SeparatorVessel',
    label: unitRegistry.SeparatorVessel.label,
    width: unitRegistry.SeparatorVessel.width,
    height: unitRegistry.SeparatorVessel.height,
    icon: 'revolve',
  },
  {
    kind: 'AbsorptionColumn',
    label: unitRegistry.AbsorptionColumn.label,
    width: unitRegistry.AbsorptionColumn.width,
    height: unitRegistry.AbsorptionColumn.height,
    icon: 'revolve',
  },
  {
    kind: 'DistillationColumn',
    label: unitRegistry.DistillationColumn.label,
    width: unitRegistry.DistillationColumn.width,
    height: unitRegistry.DistillationColumn.height,
    icon: 'revolve',
  },
  {
    kind: 'CSTR',
    label: unitRegistry.CSTR.label,
    width: unitRegistry.CSTR.width,
    height: unitRegistry.CSTR.height,
    icon: 'revolve',
  },
  {
    kind: 'ConversionReactor',
    label: unitRegistry.ConversionReactor.label,
    width: unitRegistry.ConversionReactor.width,
    height: unitRegistry.ConversionReactor.height,
    icon: 'revolve',
  },
  {
    kind: 'EquilibriumReactor',
    label: unitRegistry.EquilibriumReactor.label,
    width: unitRegistry.EquilibriumReactor.width,
    height: unitRegistry.EquilibriumReactor.height,
    icon: 'revolve',
  },
  {
    kind: 'GibbsReactor',
    label: unitRegistry.GibbsReactor.label,
    width: unitRegistry.GibbsReactor.width,
    height: unitRegistry.GibbsReactor.height,
    icon: 'revolve',
  },
  {
    kind: 'PFR',
    label: unitRegistry.PFR.label,
    width: unitRegistry.PFR.width,
    height: unitRegistry.PFR.height,
    icon: 'revolve',
  },
]
