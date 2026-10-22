import { useMachine } from '@xstate/react'
import { type ReactNode, createContext, useContext, useEffect } from 'react'
import type { ActorRefFrom, StateFrom } from 'xstate'

import { COMPOUNDS_STORAGE_KEY } from '@src/lib/compounds'
import { DEFAULT_PROPERTY_PACKAGE_ID } from '@src/lib/thermo'
import { isArray } from '@src/lib/utils'
import { simulationMachine } from '@src/machines/simulationMachine'

const PROPERTY_PACKAGE_STORAGE_KEY = 'fugacity-selected-property-package'

function getStoredCompoundIds(): string[] {
  if (typeof window === 'undefined') {
    return []
  }
  const rawValue = window.localStorage.getItem(COMPOUNDS_STORAGE_KEY)
  if (!rawValue) {
    return []
  }
  try {
    const parsedValue = JSON.parse(rawValue)
    return isArray(parsedValue)
      ? parsedValue.filter(
          (value): value is string => typeof value === 'string'
        )
      : []
  } catch {
    return []
  }
}

function getStoredPropertyPackageId() {
  if (typeof window === 'undefined') {
    return DEFAULT_PROPERTY_PACKAGE_ID
  }
  return (
    window.localStorage.getItem(PROPERTY_PACKAGE_STORAGE_KEY) ||
    DEFAULT_PROPERTY_PACKAGE_ID
  )
}

const SimulationContext = createContext<{
  simulationState: StateFrom<typeof simulationMachine>
  simulationSend: ActorRefFrom<typeof simulationMachine>['send']
} | null>(null)

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [simulationState, simulationSend] = useMachine(simulationMachine, {
    input: {
      selectedCompoundIds: getStoredCompoundIds(),
      selectedPropertyPackageId: getStoredPropertyPackageId(),
    },
  })

  useEffect(() => {
    window.localStorage.setItem(
      COMPOUNDS_STORAGE_KEY,
      JSON.stringify(simulationState.context.selectedCompoundIds)
    )
    window.localStorage.setItem(
      PROPERTY_PACKAGE_STORAGE_KEY,
      simulationState.context.selectedPropertyPackageId
    )
  }, [
    simulationState.context.selectedCompoundIds,
    simulationState.context.selectedPropertyPackageId,
  ])

  return (
    <SimulationContext.Provider value={{ simulationState, simulationSend }}>
      {children}
    </SimulationContext.Provider>
  )
}

export function useSimulation() {
  const simulation = useContext(SimulationContext)
  if (!simulation) {
    // eslint-disable-next-line suggest-no-throw/suggest-no-throw
    throw new Error('SimulationProvider is required to access the simulation.')
  }
  return simulation
}
