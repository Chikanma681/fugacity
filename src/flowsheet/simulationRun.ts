import { signal } from '@preact/signals-core'
import { toast } from 'react-hot-toast'

import { toSolveFlowsheetRequest } from '@src/flowsheet/solveRequest'
import type { FlowsheetState } from '@src/flowsheet/types'
import {
  type SolveFlowsheetResult,
  type ThermoSelection,
  solveFlowsheet,
} from '@src/lib/thermo'

export type SimulationRun =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'finished'; result: SolveFlowsheetResult; finishedAt: Date }
  | { status: 'failed'; error: string }

export const simulationRun = signal<SimulationRun>({ status: 'idle' })

const SIMULATION_TOAST_ID = 'simulation-run'

let readFlowsheet: (() => FlowsheetState) | undefined

export function registerSimulationFlowsheet(read: () => FlowsheetState) {
  readFlowsheet = read
  return () => {
    if (readFlowsheet === read) {
      readFlowsheet = undefined
    }
  }
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  simulationRun.value = { status: 'failed', error: message }
  toast.error(message, { id: SIMULATION_TOAST_ID })
}

function finish(result: SolveFlowsheetResult) {
  simulationRun.value = { status: 'finished', result, finishedAt: new Date() }
  if (result.solved) {
    toast.success('Simulation finished.', { id: SIMULATION_TOAST_ID })
  } else {
    toast.error(result.errors.join('\n') || 'Simulation did not converge.', {
      id: SIMULATION_TOAST_ID,
    })
  }
}

export async function runSimulation(selection: ThermoSelection) {
  if (simulationRun.value.status === 'running') {
    return
  }
  if (!readFlowsheet) {
    return fail('No flowsheet is open.')
  }
  if (selection.compoundIds.length === 0) {
    return fail('Select compounds before running the simulation.')
  }
  const request = toSolveFlowsheetRequest(readFlowsheet(), selection)
  if (request instanceof Error) {
    return fail(request)
  }
  simulationRun.value = { status: 'running' }
  toast.loading('Running simulation…', { id: SIMULATION_TOAST_ID })
  try {
    finish(await solveFlowsheet(request))
  } catch (error) {
    fail(error)
  }
}
