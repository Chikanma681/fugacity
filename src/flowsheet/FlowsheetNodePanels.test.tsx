import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FlowsheetNodePanels } from '@src/flowsheet/FlowsheetNodePanels'
import { createFlowObject } from '@src/flowsheet/factory'
import { unitRegistry } from '@src/flowsheet/registry'
import type { UnitType } from '@src/flowsheet/types'

function createNode(unitType: UnitType) {
  return createFlowObject({ unitType, x: 0, y: 0, nodes: [] })
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
})
