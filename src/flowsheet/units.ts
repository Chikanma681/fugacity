export type PanelUnit = [symbol: string, scale: number, offset?: number]

const pressureUnits: PanelUnit[] = [
  ['Pa', 1],
  ['kPa', 1000],
  ['MPa', 1e6],
  ['bar', 1e5],
  ['atm', 101325],
  ['psi', 6894.757293168],
]
const lengthUnits: PanelUnit[] = [
  ['m', 1],
  ['cm', 0.01],
  ['mm', 0.001],
  ['ft', 0.3048],
  ['in', 0.0254],
]

export const panelUnits: Record<string, PanelUnit[]> = {
  temperature: [
    ['K', 1],
    ['°C', 1, 273.15],
    ['°F', 5 / 9, 273.15 - (32 * 5) / 9],
    ['°R', 5 / 9],
  ],
  deltaT: [
    ['K', 1],
    ['°C', 1],
    ['°F', 5 / 9],
    ['°R', 5 / 9],
  ],
  pressure: pressureUnits,
  deltaP: pressureUnits,
  heatflow: [
    ['W', 1],
    ['kW', 1000],
    ['MW', 1e6],
  ],
  massflow: [
    ['kg/s', 1],
    ['kg/h', 1 / 3600],
    ['g/s', 0.001],
    ['lb/h', 0.45359237 / 3600],
  ],
  molarflow: [
    ['mol/s', 1],
    ['kmol/s', 1000],
    ['kmol/h', 1000 / 3600],
  ],
  distance: lengthUnits,
  diameter: lengthUnits,
  area: [
    ['m²', 1],
    ['cm²', 0.0001],
    ['ft²', 0.09290304],
  ],
  volume: [
    ['m³', 1],
    ['L', 0.001],
    ['ft³', 0.028316846592],
  ],
  mass: [
    ['kg', 1],
    ['g', 0.001],
    ['lb', 0.45359237],
  ],
  density: [
    ['kg/m³', 1],
    ['g/cm³', 1000],
    ['lb/ft³', 0.45359237 / 0.028316846592],
  ],
  heat_transf_coeff: [
    ['W/(m²·K)', 1],
    ['kW/(m²·K)', 1000],
  ],
  heatCapacityCp: [
    ['J/(kg·K)', 1],
    ['kJ/(kg·K)', 1000],
  ],
}

export function toSI(value: number, unit: PanelUnit) {
  return value * unit[1] + (unit[2] ?? 0)
}

export function fromSI(value: number, unit: PanelUnit) {
  return Number(((value - (unit[2] ?? 0)) / unit[1]).toPrecision(12))
}
