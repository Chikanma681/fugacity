import { unitRegistry } from '@src/flowsheet/registry'
import { describe, expect, it } from 'vitest'

describe('flowsheet unit registry', () => {
  it('contains the supported MVP units', () => {
    expect(Object.keys(unitRegistry).sort()).toEqual([
      'AbsorptionColumn',
      'CSTR',
      'Compressor',
      'ConversionReactor',
      'Cooler',
      'DistillationColumn',
      'EnergyStream',
      'EquilibriumReactor',
      'Expander',
      'GibbsReactor',
      'HeatExchanger',
      'Heater',
      'MaterialStream',
      'Mixer',
      'PFR',
      'Pump',
      'SeparatorVessel',
      'Splitter',
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

  it('matches mixer and splitter connector indexes to DWSIM order', () => {
    expect(unitRegistry.Mixer.connectors).toMatchObject([
      { id: 'inlet1', type: 'in', index: 0, x: 0, y: 0 },
      { id: 'inlet2', type: 'in', index: 1, x: 0, y: 0.2 },
      { id: 'inlet3', type: 'in', index: 2, x: 0, y: 0.4 },
      { id: 'inlet4', type: 'in', index: 3, x: 0, y: 0.6 },
      { id: 'inlet5', type: 'in', index: 4, x: 0, y: 0.8 },
      { id: 'inlet6', type: 'in', index: 5, x: 0, y: 1 },
      { id: 'outlet', type: 'out', index: 0, x: 1, y: 0.5 },
    ])

    expect(unitRegistry.Splitter.connectors).toMatchObject([
      { id: 'inlet', type: 'in', index: 0, x: 0, y: 0.5 },
      { id: 'outlet1', type: 'out', index: 0, x: 1, y: 0 },
      { id: 'outlet2', type: 'out', index: 1, x: 1, y: 0.5 },
      { id: 'outlet3', type: 'out', index: 2, x: 1, y: 1 },
    ])
  })

  it('keeps DWSIM energy connector positions for heater, cooler, expander, and PFR', () => {
    expect(unitRegistry.Heater.connectors).toContainEqual(
      expect.objectContaining({ id: 'energyIn', type: 'energy', x: 0.5, y: 1 })
    )
    expect(unitRegistry.Cooler.connectors).toContainEqual(
      expect.objectContaining({ id: 'energyIn', type: 'energy', x: 0.5, y: 0 })
    )
    expect(unitRegistry.Expander.connectors).toContainEqual(
      expect.objectContaining({ id: 'energyOut', type: 'energy', x: 1, y: 0.5 })
    )
    expect(unitRegistry.PFR.connectors).toContainEqual(
      expect.objectContaining({ id: 'energyIn', type: 'energy', x: 0.5, y: 1 })
    )
  })

  it('ports large DWSIM column and separator connector counts', () => {
    expect(unitRegistry.AbsorptionColumn.connectors).toHaveLength(20)
    expect(unitRegistry.DistillationColumn.connectors).toHaveLength(22)
    expect(unitRegistry.SeparatorVessel.connectors).toHaveLength(11)
  })
})
