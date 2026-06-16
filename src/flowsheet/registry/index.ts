import type { UnitType } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'
import { absorptionColumnUnitDefinition } from './absorptionColumnConnectors'
import { compressorUnitDefinition } from './compressorConnectors'
import { conversionReactorUnitDefinition } from './conversionReactorConnectors'
import { coolerUnitDefinition } from './coolerConnectors'
import { cstrUnitDefinition } from './cstrConnectors'
import { distillationColumnUnitDefinition } from './distillationColumnConnectors'
import { energyUnitDefinition } from './energyConnectors'
import { expanderUnitDefinition } from './expanderConnectors'
import { heatExchangerUnitDefinition } from './heatExchangerConnectors'
import { materialUnitDefinition } from './materialConnectors'
import { mixerUnitDefinition } from './mixerConnectors'
import { valveUnitDefinition } from './oneInOneOutConnectors'
import { pumpUnitDefinition } from './pumpConnectors'
import {
  equilibriumReactorUnitDefinition,
  gibbsReactorUnitDefinition,
} from './reactorConnectors'
import { separatorVesselUnitDefinition } from './separatorVesselConnectors'
import { heaterUnitDefinition, pfrUnitDefinition } from './sideEnergyConnectors'
import { splitterUnitDefinition } from './splitterConnectors'

export type { UnitDefinition } from './types'
export * from './materialConnectors'
export * from './energyConnectors'
export * from './oneInOneOutConnectors'
export * from './pumpConnectors'
export * from './compressorConnectors'
export * from './heatExchangerConnectors'
export * from './sideEnergyConnectors'
export * from './separatorVesselConnectors'
export * from './reactorConnectors'
export * from './mixerConnectors'
export * from './splitterConnectors'
export * from './coolerConnectors'
export * from './cstrConnectors'
export * from './conversionReactorConnectors'
export * from './absorptionColumnConnectors'
export * from './distillationColumnConnectors'
export * from './expanderConnectors'

export const unitRegistry: Record<UnitType, UnitDefinition> = {
  MaterialStream: materialUnitDefinition,
  EnergyStream: energyUnitDefinition,
  Valve: valveUnitDefinition,
  Compressor: compressorUnitDefinition,
  Expander: expanderUnitDefinition,
  Pump: pumpUnitDefinition,
  Mixer: mixerUnitDefinition,
  Splitter: splitterUnitDefinition,
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
