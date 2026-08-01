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

export type ThermoError = {
  code: string
  message: string
}

export const DEFAULT_PROPERTY_PACKAGE_ID: KnownPropertyPackageId = 'peng-robinson'

function unavailableOnWeb(command: string) {
  return Promise.reject(
    new Error(
      `${command} requires a thermodynamics runtime. Configure the Electron DWSIM worker or a web thermodynamics API.`
    )
  )
}

export async function listCompounds(): Promise<CompoundOption[]> {
  return window.electron?.thermo.listCompounds() ?? unavailableOnWeb('ListCompounds')
}

export async function listPropertyPackages(): Promise<PropertyPackageOption[]> {
  return window.electron?.thermo.listPropertyPackages() ?? unavailableOnWeb('ListPropertyPackages')
}

export async function validateSelection(selection: ThermoSelection) {
  return window.electron?.thermo.validateSelection(selection) ?? unavailableOnWeb('ValidateThermoSelection')
}

export async function calculatePTFlash(request: FlashRequest): Promise<FlashResult> {
  if (!window.electron?.thermo.calculatePTFlash) {
    return unavailableOnWeb('CalculatePTFlash')
  }

  return window.electron.thermo.calculatePTFlash(request)
}
