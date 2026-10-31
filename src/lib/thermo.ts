import type { CompoundOption } from '@src/components/CompoundsDialog'

export type KnownPropertyPackageId =
  | 'peng-robinson'
  | 'srk'
  | 'nrtl'
  | 'unifac'
  | 'ideal'

export type PropertyPackageId = KnownPropertyPackageId | (string & {})

export type PropertyPackageOption = {
  id: PropertyPackageId
  name: string
  description: string
}

export type ThermoSelection = {
  propertyPackageId: PropertyPackageId
  compoundIds: string[]
}

export type FlashRequest = ThermoSelection & {
  moleFractions: number[]
  temperatureK: number
  pressurePa: number
}

export type FlashResult = {
  temperatureK: number
  pressurePa: number
  vaporFraction: number
  phases: Array<{
    name: string
    fraction: number
    moleFractions: Record<string, number>
  }>
}

export type SolveFlowsheetObject = {
  id: string
  tag: string
  unitType: string
  x: number
  y: number
  properties: Record<string, string | number | boolean>
}

export type SolveFlowsheetConnection = {
  from: string
  fromPort: number
  to: string
  toPort: number
}

export type SolveFlowsheetRequest = ThermoSelection & {
  objects: SolveFlowsheetObject[]
  connections: SolveFlowsheetConnection[]
}

export type StreamPhaseResult = {
  fraction: number
  moleFractions: Record<string, number>
}

export type StreamResult = {
  temperatureK: number
  pressurePa: number
  massFlowKgPerS: number
  molarFlowMolPerS: number
  massEnthalpyJPerKg: number
  vaporFraction: number
  moleFractions: Record<string, number>
  phases: Partial<Record<'vapor' | 'liquid1' | 'liquid2', StreamPhaseResult>>
}

export type FlowsheetObjectResult = {
  tag: string
  calculated: boolean
  errorMessage: string
  stream?: StreamResult
  energyFlowW?: number
}

export type SolveFlowsheetResult = {
  solved: boolean
  errors: string[]
  objects: Record<string, FlowsheetObjectResult>
}

export type ThermoError = {
  code: string
  message: string
}

export const DEFAULT_PROPERTY_PACKAGE_ID: KnownPropertyPackageId =
  'peng-robinson'

function unavailableOnWeb(command: string) {
  return Promise.reject(
    new Error(
      `${command} requires a thermodynamics runtime. Configure the Electron DWSIM worker or a web thermodynamics API.`
    )
  )
}

export async function listCompounds(): Promise<CompoundOption[]> {
  return (
    window.electron?.thermo.listCompounds() ?? unavailableOnWeb('ListCompounds')
  )
}

export async function listPropertyPackages(): Promise<PropertyPackageOption[]> {
  return (
    window.electron?.thermo.listPropertyPackages() ??
    unavailableOnWeb('ListPropertyPackages')
  )
}

export async function validateSelection(selection: ThermoSelection) {
  return (
    window.electron?.thermo.validateSelection(selection) ??
    unavailableOnWeb('ValidateThermoSelection')
  )
}

export async function calculatePTFlash(
  request: FlashRequest
): Promise<FlashResult> {
  if (!window.electron?.thermo.calculatePTFlash) {
    return unavailableOnWeb('CalculatePTFlash')
  }

  return window.electron.thermo.calculatePTFlash(request)
}

export async function solveFlowsheet(
  request: SolveFlowsheetRequest
): Promise<SolveFlowsheetResult> {
  if (!window.electron?.thermo.solveFlowsheet) {
    return unavailableOnWeb('SolveFlowsheet')
  }

  return window.electron.thermo.solveFlowsheet(request)
}
