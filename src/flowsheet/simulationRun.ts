import { signal } from '@preact/signals-core'

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
  simulationRun.value = {
    status: 'failed',
    error: error instanceof Error ? error.message : String(error),
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
  try {
    const result = await solveFlowsheet(request)
    simulationRun.value = { status: 'finished', result, finishedAt: new Date() }
  } catch (error) {
    fail(error)
  }
}
