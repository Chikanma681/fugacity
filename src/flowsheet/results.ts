import { fromSI, panelUnits } from '@src/flowsheet/units'
import type {
  FlowsheetObjectResult,
  SolveFlowsheetResult,
  StreamResult,
} from '@src/lib/thermo'

export type StreamObjectResult = FlowsheetObjectResult & {
  stream: StreamResult
}

export function toDisplayValue(
  value: number | undefined,
  unit?: string,
  symbol?: string
) {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined
  }
  const panelUnit = unit
    ? panelUnits[unit]?.find(([candidate]) => candidate === symbol)
    : undefined
  return panelUnit ? fromSI(value, panelUnit) : value
}

export function formatValue(
  value: number | undefined,
  unit?: string,
  symbol?: string
) {
  const displayed = toDisplayValue(value, unit, symbol)
  return displayed === undefined
    ? '—'
    : displayed.toLocaleString(undefined, { maximumSignificantDigits: 6 })
}

export type StreamRow = {
  label: string
  value: (stream: StreamResult) => number | undefined
  unit?: string
  symbol?: string
}

export function getStreamRows(compoundIds: string[]): StreamRow[] {
  return [
    {
      label: 'Temperature',
      value: (stream) => stream.temperatureK,
      unit: 'temperature',
      symbol: '°C',
    },
    {
      label: 'Pressure',
      value: (stream) => stream.pressurePa,
      unit: 'pressure',
      symbol: 'bar',
    },
    {
      label: 'Mass Flow',
      value: (stream) => stream.massFlowKgPerS,
      unit: 'massflow',
      symbol: 'kg/h',
    },
    {
      label: 'Molar Flow',
      value: (stream) => stream.molarFlowMolPerS,
      unit: 'molarflow',
      symbol: 'kmol/h',
    },
    {
      label: 'Vapor Fraction',
      value: (stream) => stream.vaporFraction,
    },
    {
      label: 'Specific Enthalpy',
      value: (stream) => stream.massEnthalpyJPerKg,
      unit: 'enthalpy',
      symbol: 'kJ/kg',
    },
    ...compoundIds.map((compoundId) => ({
      label: `Mole Fraction / ${compoundId}`,
      value: (stream: StreamResult) => stream.moleFractions[compoundId],
    })),
  ]
}

export function splitResultObjects(result: SolveFlowsheetResult) {
  const objects = Object.values(result.objects)
  const streams = objects.filter(
    (object): object is StreamObjectResult => object.stream !== undefined
  )
  const others = objects.filter((object) => object.stream === undefined)
  return { streams, others }
}
