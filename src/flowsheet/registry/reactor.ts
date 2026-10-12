import type { Port } from '@src/flowsheet/types'
import { generalPanels } from './generalPanels'
import type { UnitDefinition } from './types'

export const reactorPorts: Port[] = [
  {
    id: 'inlet',
    label: 'Inlet',
    type: 'in',
    direction: 'right',
    x: 0.11,
    y: 0.5,
    index: 0,
  },
  {
    id: 'energyIn',
    label: 'Energy Stream',
    type: 'energy',
    direction: 'right',
    x: 0.11,
    y: 0.7,
    index: 1,
  },
  {
    id: 'vaporOutlet',
    label: 'Vapor Outlet',
    type: 'out',
    direction: 'right',
    x: 0.89,
    y: 0.17,
    index: 0,
  },
  {
    id: 'liquidOutlet',
    label: 'Liquid Outlet',
    type: 'out',
    direction: 'right',
    x: 0.89,
    y: 0.83,
    index: 1,
  },
]

export const equilibriumReactorUnitDefinition: UnitDefinition = {
  unitType: 'EquilibriumReactor',
  label: 'Equilibrium Reactor',
  tagPrefix: 'RE-',
  namePrefix: 'RE',
  width: 72,
  height: 72,
  ports: reactorPorts,
  panels: [
    ...generalPanels,
    {
      type: 'dropdown',
      label: 'Reaction Set',
      property: 'ReactionSetID',
      options: {
        source: 'reactionSets',
        labelProperty: 'Name',
        valueProperty: 'ID',
      },
      fallbackIndex: 0,
      visibleWhen: { property: 'flowsheet.ReactionSets', operator: 'notEmpty' },
    },
    {
      type: 'dropdown',
      label: 'Calculation Mode',
      property: 'ReactorOperationMode',
      enumType: 'OperationMode',
      fallbackIndex: 0,
      options: [
        { label: 'Adiabatic', value: 'Adiabatic' },
        { label: 'Isothermal', value: 'Isothermic' },
        { label: 'Outlet Temperature', value: 'OutletTemperature' },
      ],
    },
    {
      type: 'textbox',
      label: 'Outlet Temperature',
      property: 'OutletTemperature',
      format: 'nf',
      unit: 'temperature',
      onChange: [
        {
          property: 'OutletTemperatureIsEstimate',
          value: {
            property: 'ReactorOperationMode',
            operator: 'equals',
            value: 'Adiabatic',
          },
        },
      ],
    },
    {
      type: 'textbox',
      label: 'Pressure Drop',
      property: 'DeltaP',
      format: 'nf',
      unit: 'pressure',
    },
  ],
}

export const gibbsReactorUnitDefinition: UnitDefinition = {
  unitType: 'GibbsReactor',
  label: 'Gibbs Reactor',
  tagPrefix: 'RG-',
  namePrefix: 'RG',
  width: 72,
  height: 72,
  ports: reactorPorts,
  panels: [
    ...generalPanels,
    {
      type: 'dropdown',
      label: 'Reactive Phase Behavior',
      property: 'ReactivePhaseBehavior',
      enumType: 'Reactor_Gibbs.ReactivePhaseType',
      options: [
        { label: 'Calculate Equilibrium', value: 0 },
        { label: 'Vapor', value: 1 },
        { label: 'Liquid', value: 2 },
        { label: 'Solid', value: 3 },
      ],
    },
    {
      type: 'textbox',
      label: 'Pressure Drop',
      property: 'DeltaP',
      format: 'nf',
      unit: 'pressure',
    },
    { type: 'label', label: 'Reactive Compounds' },
    {
      type: 'description',
      label:
        'Compounds taken into account by the Gibbs energy minimization. Leaving all of them unchecked makes the reactor treat every compound as reactive.',
    },
    {
      type: 'collection',
      label: 'Reactive Compound Selection',
      property: 'flowsheet.SelectedCompounds',
      itemLabel: '{Name}',
      membershipProperty: 'ComponentIDs',
      rows: [{ type: 'checkbox', label: '{Name}', property: 'ComponentIDs' }],
    },
    { type: 'label', label: 'Solver Settings' },
    { type: 'checkbox', label: 'Use IPOPT Solver', property: 'UseIPOPTSolver' },
    {
      type: 'checkbox',
      label: 'Use Alternate Solving Method',
      property: 'AlternateSolvingMethod',
    },
    {
      type: 'checkbox',
      label: 'Initialize from Previous Solution',
      property: 'InitializeFromPreviousSolution',
    },
    { type: 'checkbox', label: 'Enable Damping', property: 'EnableDamping' },
    {
      type: 'textbox',
      label: 'Maximum Internal Iterations',
      property: 'MaximumInternalIterations',
      format: 'N0',
      valueType: 'integer',
      min: 1,
    },
    {
      type: 'textbox',
      label: 'Internal Tolerance',
      property: 'InternalTolerance',
      format: 'G',
      min: 0,
      exclusiveMin: true,
    },
    {
      type: 'textbox',
      label: 'Derivative Perturbation',
      property: 'DerivativePerturbation',
      format: 'G',
      min: 0,
      exclusiveMin: true,
    },
    {
      type: 'textbox',
      label: 'Lagrange Coeff. Estimation Temperature (K)',
      property: 'LagrangeCoeffsEstimationTemperature',
      format: 'nf',
      fixedUnit: 'K',
    },
    {
      type: 'dropdown',
      label: 'External Solver',
      property: 'ExternalSolverID',
      fallbackIndex: 0,
      visibleWhen: {
        property: 'flowsheet.ExternalSolvers',
        operator: 'notEmpty',
        filter: {
          property: 'Category',
          operator: 'equals',
          value: 'NonLinearMinimization',
        },
      },
      options: {
        source: 'externalSolvers',
        labelProperty: 'DisplayText',
        valueProperty: 'ID',
        prepend: [{ label: '(built-in)', value: '' }],
        filter: {
          property: 'Category',
          operator: 'equals',
          value: 'NonLinearMinimization',
        },
      },
    },
    { type: 'label', label: 'Results' },
    {
      type: 'readonly',
      label: 'Initial Gibbs Energy',
      property: 'InitialGibbsEnergy',
      format: 'nf',
    },
    {
      type: 'readonly',
      label: 'Final Gibbs Energy',
      property: 'FinalGibbsEnergy',
      format: 'nf',
    },
    {
      type: 'readonly',
      label: 'Element Balance',
      property: 'ElementBalance',
      format: 'nf',
    },
    {
      type: 'button',
      label: 'Edit Element Matrix...',
      action: 'ShowGibbsElementMatrixEditor',
    },
    {
      type: 'description',
      label:
        'The matrix starts from the compound formulas and can be overridden, the same way the Windows editor allows.',
    },
  ],
}
