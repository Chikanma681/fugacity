import {
  createFlowObject,
  createSeedFlowObject,
  ensureUniqueTag,
  getNextTag,
} from '@src/flowsheet/factory'
import { describe, expect, it } from 'vitest'

describe('flowsheet factory', () => {
  it('creates DWSIM-shaped heat exchanger objects', () => {
    const node = createFlowObject({
      unitType: 'HeatExchanger',
      x: 10,
      y: 20,
      nodes: [],
    })

    expect(node.tag).toBe('HX-1')
    expect(node.name.startsWith('HE-')).toBe(true)
    expect(node.dwsimObjectType).toBe('HeatExchanger')
    expect(node.connectors.map((connector) => connector.id)).toEqual([
      'inlet1',
      'inlet2',
      'outlet1',
      'outlet2',
    ])
  })

  it('counts tags by unit type', () => {
    const nodes = [
      createSeedFlowObject({
        id: 'hx1',
        unitType: 'HeatExchanger',
        tag: 'HX-1',
        x: 0,
        y: 0,
      }),
      createSeedFlowObject({
        id: 'pump1',
        unitType: 'Pump',
        tag: 'PUMP-1',
        x: 0,
        y: 0,
      }),
    ]

    expect(getNextTag('HeatExchanger', nodes)).toBe('HX-2')
    expect(getNextTag('Pump', nodes)).toBe('PUMP-2')
    expect(getNextTag('MaterialStream', nodes)).toBe('1')
  })

  it('increments conflicting numeric tags', () => {
    const nodes = [
      createSeedFlowObject({
        id: 'hx1',
        unitType: 'HeatExchanger',
        tag: 'HX-1',
        x: 0,
        y: 0,
      }),
      createSeedFlowObject({
        id: 'hx2',
        unitType: 'HeatExchanger',
        tag: 'HX-2',
        x: 0,
        y: 0,
      }),
    ]

    expect(ensureUniqueTag('HX-1', nodes)).toBe('HX-3')
  })

  it('keeps energy connectors visible in pump and compressor data', () => {
    const pump = createFlowObject({
      unitType: 'Pump',
      x: 0,
      y: 0,
      nodes: [],
    })
    const compressor = createFlowObject({
      unitType: 'Compressor',
      x: 0,
      y: 0,
      nodes: [],
    })

    expect(
      pump.connectors.find((connector) => connector.id === 'energyIn')
    ).toMatchObject({
      type: 'energy',
      index: 1,
    })
    expect(
      compressor.connectors.find((connector) => connector.id === 'energyIn')
    ).toMatchObject({
      type: 'energy',
      index: 1,
    })
  })
})
