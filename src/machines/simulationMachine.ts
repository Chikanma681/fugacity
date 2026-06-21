import { assign, setup } from 'xstate'

export type SimulationPropertyPackageId =
  | 'peng-robinson'
  | 'srk'
  | 'nrtl'
  | 'unifac'
  | 'ideal'

export const DEFAULT_PROPERTY_PACKAGE_ID: SimulationPropertyPackageId =
  'peng-robinson'

export type SimulationMachineContext = {
  selectedCompoundIds: string[]
  selectedPropertyPackageId: SimulationPropertyPackageId
}

export type SimulationMachineInput = SimulationMachineContext

export const simulationMachine = setup({
  types: {
    context: {} as SimulationMachineContext,
    input: {} as SimulationMachineInput,
    events: {} as
      | { type: 'Open compounds dialog' }
      | { type: 'Close compounds dialog' }
      | { type: 'Save compounds'; compoundIds: string[] }
      | {
        type: 'Select property package'
        propertyPackageId: SimulationPropertyPackageId
      },
  },
}).createMachine({
  id: 'simulation',
  initial: 'idle',
  context: ({ input }) => input,
  states: {
    idle: {
      on: {
        'Open compounds dialog': 'compoundsDialogOpen',
        'Save compounds': {
          actions: assign({
            selectedCompoundIds: ({ event }) => event.compoundIds,
          }),
        },
        'Select property package': {
          actions: assign({
            selectedPropertyPackageId: ({ event }) => event.propertyPackageId,
          }),
        },
      },
    },
    compoundsDialogOpen: {
      on: {
        'Close compounds dialog': 'idle',
        'Save compounds': {
          target: 'idle',
          actions: assign({
            selectedCompoundIds: ({ event }) => event.compoundIds,
          }),
        },
        'Select property package': {
          actions: assign({
            selectedPropertyPackageId: ({ event }) => event.propertyPackageId,
          }),
        },
      },
    },
  },
})
