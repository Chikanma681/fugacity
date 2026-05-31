import { unitRegistry } from '@src/flowsheet/registry'
import { describe, expect, it } from 'vitest'

describe('flowsheet unit registry', () => {
  it('contains the supported MVP units', () => {
    expect(Object.keys(unitRegistry).sort()).toEqual([
      'Compressor',
      'EnergyStream',
      'HeatExchanger',
      'MaterialStream',
      'Pump',
      'Valve',
    ])
  })

  it('matches heat exchanger connector indexes to DWSIM order', () => {
    expect(unitRegistry.HeatExchanger.connectors).toMatchObject([
      { id: 'inlet1', type: 'in', index: 0, x: 0, y: 0.5 },
      { id: 'inlet2', type: 'in', index: 1, x: 0.5, y: 0 },
      { id: 'outlet1', type: 'out', index: 0, x: 1, y: 0.5 },
      { id: 'outlet2', type: 'out', index: 1, x: 0.5, y: 1 },
    ])
  })
})
