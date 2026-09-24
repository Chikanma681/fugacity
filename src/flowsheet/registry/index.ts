import type { UnitType } from '@src/flowsheet/types'
import type { UnitDefinition } from './types'
import { absorptionColumnUnitDefinition } from './absorptionColumnPorts'
import { compressorUnitDefinition } from './compressorPorts'
import { conversionReactorUnitDefinition } from './conversionReactorPorts'
import { coolerUnitDefinition } from './coolerPorts'
import { cstrUnitDefinition } from './cstrPorts'
import { distillationColumnUnitDefinition } from './distillationColumnPorts'
import { energyUnitDefinition } from './energyPorts'
import { expanderUnitDefinition } from './expanderPorts'
import { heatExchangerUnitDefinition } from './heatExchangerPorts'
import { materialUnitDefinition } from './materialPorts'
import { mixerUnitDefinition } from './mixerPorts'
import { valveUnitDefinition } from './oneInOneOutPorts'
import { pumpUnitDefinition } from './pumpPorts'
import {
  equilibriumReactorUnitDefinition,
  gibbsReactorUnitDefinition,
} from './reactorPorts'
import { separatorVesselUnitDefinition } from './separatorVesselPorts'
import { heaterUnitDefinition, pfrUnitDefinition } from './sideEnergyPorts'
import { splitterUnitDefinition } from './splitterPorts'

export type { UnitDefinition } from './types'
export * from './materialPorts'
export * from './energyPorts'
export * from './oneInOneOutPorts'
export * from './pumpPorts'
export * from './compressorPorts'
export * from './heatExchangerPorts'
export * from './sideEnergyPorts'
export * from './separatorVesselPorts'
export * from './reactorPorts'
export * from './mixerPorts'
export * from './splitterPorts'
export * from './coolerPorts'
export * from './cstrPorts'
export * from './conversionReactorPorts'
export * from './absorptionColumnPorts'
export * from './distillationColumnPorts'
export * from './expanderPorts'

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
