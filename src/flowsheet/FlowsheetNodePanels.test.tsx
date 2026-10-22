import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  SimulationProvider,
  useSimulation,
} from '@src/components/SimulationProvider'
import { FlowsheetNodePanels } from '@src/flowsheet/FlowsheetNodePanels'
import { createFlowObject } from '@src/flowsheet/factory'
import { unitRegistry } from '@src/flowsheet/registry'
import type { UnitType } from '@src/flowsheet/types'
import { COMPOUNDS_STORAGE_KEY } from '@src/lib/compounds'

function createNode(unitType: UnitType) {
  return createFlowObject({ unitType, x: 0, y: 0, nodes: [] })
}

function SimulationCompoundInputs() {
  const { simulationState, simulationSend } = useSimulation()
  return (
    <>
      <button
        type="button"
        onClick={() =>
          simulationSend({ type: 'Save compounds', compoundIds: ['Methane'] })
        }
      >
        Apply compounds
      </button>
      <FlowsheetNodePanels
        node={createNode('MaterialStream')}
        selectedCompoundIds={simulationState.context.selectedCompoundIds}
      />
    </>
  )
}

describe('FlowsheetNodePanels', () => {
  it.each(Object.keys(unitRegistry) as UnitType[])(
    'renders the %s registry fields',
    (unitType) => {
      const node = createNode(unitType)
      render(<FlowsheetNodePanels node={node} />)

      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(
        node.tag
      )
      expect(screen.getByText(/Edits are not saved/)).toBeInTheDocument()
    }
  )

  it('keeps the Zoo toggle labelled and keyboard accessible', () => {
    render(<FlowsheetNodePanels node={createNode('Recycle')} />)
    const toggle = screen.getByRole('checkbox', {
      name: 'Legacy Convergence Mode',
    })

    toggle.focus()
    expect(toggle).toHaveFocus()
    fireEvent.click(screen.getByText('Legacy Convergence Mode'))
    expect(toggle).toBeChecked()
  })

  it('uses Settings-style section navigation to scroll the content', () => {
    render(<FlowsheetNodePanels node={createNode('Pump')} />)
    const navigation = screen.getByRole('navigation', {
      name: 'Node property sections',
    })
    const section = screen.getByRole('heading', { name: 'Object Properties' })
    const scrollIntoView = vi.fn()
    section.scrollIntoView = scrollIntoView
    const button = within(navigation).getByRole('button', {
      name: 'Object Properties',
    })

    expect(button).toHaveAttribute('aria-controls', section.id)
    fireEvent.click(button)

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'center',
      behavior: 'smooth',
    })
    expect(
      within(navigation).queryByRole('button', {
        name: 'Object Property Editor',
      })
    ).not.toBeInTheDocument()
  })

  it('uses the shared action button for unavailable editors', () => {
    render(<FlowsheetNodePanels node={createNode('GibbsReactor')} />)
    const button = screen.getByRole('button', {
      name: 'Edit Element Matrix...',
    })

    expect(button).toHaveClass('action-button')
    expect(button).toBeDisabled()
  })

  it('keeps numeric fields editable with accessible units and no persistence', () => {
    const node = createNode('Pump')
    const original = structuredClone(node)
    render(<FlowsheetNodePanels node={node} />)
    const pressure = screen.getByRole('spinbutton', {
      name: 'Outlet Pressure',
    })

    fireEvent.change(pressure, { target: { value: '200000' } })

    expect(pressure).toHaveValue(200000)
    expect(pressure).toHaveAccessibleDescription('Pa')
    expect(node).toEqual(original)
  })

  it('preserves conditional groups and unavailable dropdowns', () => {
    render(<FlowsheetNodePanels node={createNode('CSTR')} />)

    expect(
      screen.getByRole('combobox', { name: 'Reaction Set' })
    ).toBeDisabled()
    expect(
      screen.queryByRole('group', { name: 'Heat Exchange (Utility Fluid)' })
    ).not.toBeInTheDocument()

    fireEvent.change(
      screen.getByRole('combobox', { name: 'Calculation Mode' }),
      {
        target: { value: '3' },
      }
    )

    expect(
      screen.getByRole('group', { name: 'Heat Exchange (Utility Fluid)' })
    ).toBeInTheDocument()
  })

  it.each([
    ['0', ['Temperature', 'Pressure']],
    ['1', ['Temperature', 'Vapor Mole Frac (spec)']],
    ['2', ['Pressure', 'Vapor Mole Frac (spec)']],
    ['3', ['Pressure', 'Specific Enthalpy']],
    ['4', ['Pressure', 'Specific Entropy']],
  ])(
    'enables the selected stream variables for option %s',
    (option, enabled) => {
      render(<FlowsheetNodePanels node={createNode('MaterialStream')} />)
      fireEvent.click(screen.getByRole('radio', { name: 'Input Data' }))
      fireEvent.change(
        screen.getByRole('combobox', { name: 'Specified Variables' }),
        {
          target: { value: option },
        }
      )

      for (const name of [
        'Temperature',
        'Pressure',
        'Specific Enthalpy',
        'Specific Entropy',
        'Vapor Mole Frac (spec)',
      ]) {
        const input = screen.getByRole('spinbutton', { name })
        if (enabled.includes(name)) {
          expect(input).toBeEnabled()
        } else {
          expect(input).toBeDisabled()
        }
      }
    }
  )

  it('saves stream conditions with SI values and DWSIM enum values', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <FlowsheetNodePanels
        node={createNode('MaterialStream')}
        onSave={onSave}
      />
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Input Data' }))
    expect(
      screen.getByRole('combobox', { name: 'Specified Variables' })
    ).toHaveDisplayValue('Temperature/Pressure')
    expect(
      screen.getByRole('combobox', { name: 'Force Phase' })
    ).toHaveDisplayValue('Global Definition')

    fireEvent.change(
      screen.getByRole('combobox', { name: 'Specified Variables' }),
      {
        target: { value: '3' },
      }
    )
    fireEvent.change(screen.getByRole('combobox', { name: 'Pressure unit' }), {
      target: { value: 'bar' },
    })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Pressure' }), {
      target: { value: '2' },
    })
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Specific Enthalpy' }),
      {
        target: { value: '-528.23347' },
      }
    )
    fireEvent.change(screen.getByRole('combobox', { name: 'Force Phase' }), {
      target: { value: '2' },
    })
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Enable Phase Envelope Lookup' })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        tag: expect.any(String),
        parameters: {
          schemaVersion: 1,
          inputs: {
            SpecType: 1,
            'Phases[0].Properties.pressure': 200000,
            'Phases[0].Properties.enthalpy': -528233.47,
            ForcePhase: 2,
            GeneratePhaseEnvelopeLookup: true,
          },
          displayUnits: { 'Phases[0].Properties.pressure': 'bar' },
        },
      })
    )
  })

  it('restores the stream specification and bounds vapor fraction inputs', () => {
    const node = createNode('MaterialStream')
    node.parameters = {
      schemaVersion: 1,
      inputs: { SpecType: 4, 'Phases[2].Properties.molarfraction': 0.5 },
      displayUnits: {},
    }
    render(<FlowsheetNodePanels node={node} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Input Data' }))

    expect(
      screen.getByRole('combobox', { name: 'Specified Variables' })
    ).toHaveDisplayValue('Temperature/Vapor Fraction')
    const fraction = screen.getByRole('spinbutton', {
      name: 'Vapor Mole Frac (spec)',
    })
    expect(fraction).toHaveValue(0.5)
    fireEvent.change(fraction, { target: { value: '1.1' } })
    expect(fraction).toBeInvalid()
    fireEvent.change(fraction, { target: { value: '-0.1' } })
    expect(fraction).toBeInvalid()
  })

  it('prompts for toolbar compounds when none are selected', () => {
    render(<FlowsheetNodePanels node={createNode('MaterialStream')} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Input Data' }))

    expect(
      screen.getByText(
        'Select compounds in the toolbar to enter stream mole fractions.'
      )
    ).toBeInTheDocument()
  })

  it('saves mole fractions for only the selected compounds', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const node = createNode('MaterialStream')
    render(
      <FlowsheetNodePanels
        node={node}
        selectedCompoundIds={['Water', 'Carbon dioxide']}
        onSave={onSave}
      />
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Input Data' }))
    const composition = screen.getByRole('group', { name: 'Mole Fractions' })
    expect(within(composition).getAllByRole('spinbutton')).toHaveLength(2)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Water' }), {
      target: { value: '0.75' },
    })
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Carbon dioxide' }),
      {
        target: { value: '0.25' },
      }
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        tag: node.tag,
        parameters: {
          schemaVersion: 1,
          inputs: {
            SpecType: 0,
            ForcePhase: 4,
            'Phases[0].Compounds["Water"].MoleFraction': 0.75,
            'Phases[0].Compounds["Carbon dioxide"].MoleFraction': 0.25,
          },
          displayUnits: {},
        },
      })
    )
  })

  it('restores saved compound fractions and validates their bounds', () => {
    const node = createNode('MaterialStream')
    node.parameters = {
      schemaVersion: 1,
      inputs: { 'Phases[0].Compounds["Water"].MoleFraction': 0.75 },
      displayUnits: {},
    }
    render(<FlowsheetNodePanels node={node} selectedCompoundIds={['Water']} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Input Data' }))
    const fraction = screen.getByRole('spinbutton', { name: 'Water' })

    expect(fraction).toHaveValue(0.75)
    fireEvent.change(fraction, { target: { value: '1.1' } })
    expect(fraction).toBeInvalid()
    fireEvent.change(fraction, { target: { value: '-0.1' } })
    expect(fraction).toBeInvalid()
  })

  it('shares persisted and updated toolbar selections with compound inputs', () => {
    const storage = new Map([
      [COMPOUNDS_STORAGE_KEY, JSON.stringify(['Water'])],
    ])
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    })
    try {
      render(
        <SimulationProvider>
          <SimulationCompoundInputs />
        </SimulationProvider>
      )
      fireEvent.click(screen.getByRole('radio', { name: 'Input Data' }))
      expect(
        screen.getByRole('spinbutton', { name: 'Water' })
      ).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Apply compounds' }))

      expect(
        screen.queryByRole('spinbutton', { name: 'Water' })
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('spinbutton', { name: 'Methane' })
      ).toBeInTheDocument()
      expect(JSON.parse(storage.get(COMPOUNDS_STORAGE_KEY) ?? '[]')).toEqual([
        'Methane',
      ])
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
