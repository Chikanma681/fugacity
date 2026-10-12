import type { UnitType } from '@src/flowsheet/types'
import { absorptionColumnUnitDefinition } from './absorptionColumn'
import { compressorUnitDefinition } from './compressor'
import { conversionReactorUnitDefinition } from './conversionReactor'
import { coolerUnitDefinition } from './cooler'
import { cstrUnitDefinition } from './cstr'
import { distillationColumnUnitDefinition } from './distillationColumn'
import { energyUnitDefinition } from './energy'
import { expanderUnitDefinition } from './expander'
import { heatExchangerUnitDefinition } from './heatExchanger'
import { materialUnitDefinition } from './material'
import { mixerUnitDefinition } from './mixer'
import { valveUnitDefinition } from './oneInOneOut'
import { pumpUnitDefinition } from './pump'
import {
  equilibriumReactorUnitDefinition,
  gibbsReactorUnitDefinition,
} from './reactor'
import { recycleUnitDefinition } from './recycle'
import { separatorVesselUnitDefinition } from './separatorVessel'
import { heaterUnitDefinition, pfrUnitDefinition } from './sideEnergy'
import { splitterUnitDefinition } from './splitter'
import type { UnitDefinition } from './types'

export type {
  PanelCondition,
  PanelOption,
  PanelOptionSource,
  PanelRow,
  PanelValue,
  UnitDefinition,
} from './types'
export * from './material'
export * from './energy'
export * from './oneInOneOut'
export * from './pump'
export * from './compressor'
export * from './heatExchanger'
export * from './sideEnergy'
export * from './separatorVessel'
export * from './reactor'
export * from './recycle'
export * from './mixer'
export * from './splitter'
export * from './cooler'
export * from './cstr'
export * from './conversionReactor'
export * from './absorptionColumn'
export * from './distillationColumn'
export * from './expander'

export const unitRegistry: Record<UnitType, UnitDefinition> = {
  MaterialStream: materialUnitDefinition,
  EnergyStream: energyUnitDefinition,
  Valve: valveUnitDefinition,
  Compressor: compressorUnitDefinition,
  Expander: expanderUnitDefinition,
  Pump: pumpUnitDefinition,
  Mixer: mixerUnitDefinition,
  Splitter: splitterUnitDefinition,
  Recycle: recycleUnitDefinition,
  Cooler: coolerUnitDefinition,
  HeatExchanger: heatExchangerUnitDefinition,
  Heater: heaterUnitDefinition,
  SeparatorVessel: separatorVesselUnitDefinition,
  AbsorptionColumn: absorptionColumnUnitDefinition,
  DistillationColumn: distillationColumnUnitDefinition,
  CSTR: cstrUnitDefinition,
  ConversionReactor: conversionReactorUnitDefinition,
  EquilibriumReactor: equilibriumReactorUnitDefinition,
  GibbsReactor: gibbsReactorUnitDefinition,
  PFR: pfrUnitDefinition,
}

export function getUnitDefinition(unitType: UnitType) {
  return unitRegistry[unitType]
}
