import { useCallback, useEffect, useRef, useState } from 'react'

import { toFlowsheetDocument } from '@src/flowsheet/agent/document'
import {
  type FlowsheetOperation,
  applyFlowsheetOperations,
} from '@src/flowsheet/agent/operations'
import { registerFlowsheetAgentTarget } from '@src/flowsheet/agent/tools'
import { registerSimulationFlowsheet } from '@src/flowsheet/simulationRun'
import type { FlowsheetState } from '@src/flowsheet/types'
import { openDB } from '@src/lib/store/database'
import {
  FlowsheetSession,
  type FlowsheetSessionState,
} from '@src/lib/store/flowsheetSession'

const initialState: FlowsheetState = {
  viewport: { x: 0, y: 0, scale: 1 },
  nodes: [],
  edges: [],
}

const closingFiles = new Map<string, Promise<void>>()

type CanvasState = FlowsheetSessionState & {
  filePath: string | undefined
  resetVersion: number
}
type StateUpdate<T> = T | ((previous: T) => T)

export function useFlowsheetState(filePath: string | undefined) {
  const [state, setState] = useState<CanvasState>({
    filePath,
    value: initialState,
    ready: !filePath,
    error: null,
    resetVersion: 0,
  })
  const stateRef = useRef(state)
  const sessionRef = useRef<FlowsheetSession | undefined>(undefined)
  const revisionRef = useRef(0)

  useEffect(() => {
    let disposed = false
    let session: FlowsheetSession | undefined
    const applyState = (next: FlowsheetSessionState) => {
      if (disposed) {
        return
      }
      revisionRef.current += 1
      const canvasState = {
        ...next,
        filePath,
        resetVersion: stateRef.current.resetVersion + 1,
      }
      stateRef.current = canvasState
      setState(canvasState)
    }
    sessionRef.current = undefined
    applyState({ value: initialState, ready: !filePath, error: null })
    if (!filePath) {
      return
    }

    const loading = (closingFiles.get(filePath) ?? Promise.resolve())
      .then(() => openDB(filePath))
      .then(async (connection) => {
        if (disposed) {
          await connection.close()
          return
        }
        session = new FlowsheetSession(connection, initialState, applyState)
        sessionRef.current = session
        await session.initialize()
      })
      .catch((error: unknown) => {
        applyState({
          value: initialState,
          ready: false,
          error: error instanceof Error ? error.message : String(error),
        })
      })

    return () => {
      disposed = true
      const closing = loading
        .then(() => session?.close())
        .catch((error: unknown) => {
          console.error('Failed to close flowsheet database', error)
        })
        .finally(() => {
          if (closingFiles.get(filePath) === closing) {
            closingFiles.delete(filePath)
          }
        })
      closingFiles.set(filePath, closing)
    }
  }, [filePath])

  const updateState = useCallback(
    (change: StateUpdate<FlowsheetState>) => {
      const current = stateRef.current
      if (current.filePath !== filePath || !current.ready) {
        return
      }
      const value =
        typeof change === 'function' ? change(current.value) : change
      if (
        value.nodes !== current.value.nodes ||
        value.edges !== current.value.edges
      ) {
        revisionRef.current += 1
      }
      const next = { ...current, value, error: null }
      stateRef.current = next
      setState(next)
      const saving = sessionRef.current?.enqueue(next.value)
      void saving?.catch(() => undefined)
      return saving
    },
    [filePath]
  )

  const update = useCallback(
    <Key extends keyof FlowsheetState>(
      key: Key,
      change: StateUpdate<FlowsheetState[Key]>
    ) => {
      return updateState((previous) => ({
        ...previous,
        [key]: typeof change === 'function' ? change(previous[key]) : change,
      }))
    },
    [updateState]
  )

  const setViewport = useCallback(
    (change: StateUpdate<FlowsheetState['viewport']>) =>
      update('viewport', change),
    [update]
  )
  const setNodes = useCallback(
    (change: StateUpdate<FlowsheetState['nodes']>) => update('nodes', change),
    [update]
  )
  const setEdges = useCallback(
    (change: StateUpdate<FlowsheetState['edges']>) => update('edges', change),
    [update]
  )
  const deleteNode = useCallback(
    (nodeId: string) => {
      void updateState((previous) => ({
        ...previous,
        nodes: previous.nodes.filter((node) => node.id !== nodeId),
        edges: previous.edges.filter(
          (edge) => edge.from !== nodeId && edge.to !== nodeId
        ),
      }))
    },
    [updateState]
  )

  const applyAgentOperations = useCallback(
    async (revision: number, operations: FlowsheetOperation[]) => {
      const current = stateRef.current
      if (current.filePath !== filePath || !current.ready) {
        return { error: 'The flowsheet is not ready for edits.' }
      }
      if (revision !== revisionRef.current) {
        return {
          error: `The flowsheet changed (now revision ${revisionRef.current}). Read it again before editing.`,
        }
      }
      const result = applyFlowsheetOperations(current.value, operations)
      if ('error' in result) {
        return result
      }
      try {
        await updateState(result)
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) }
      }
      return toFlowsheetDocument(stateRef.current.value, revisionRef.current)
    },
    [filePath, updateState]
  )

  const isActive = state.filePath === filePath && state.ready && !!filePath
  useEffect(() => {
    if (!isActive) {
      return
    }
    const unregisterAgentTarget = registerFlowsheetAgentTarget({
      read: () =>
        toFlowsheetDocument(stateRef.current.value, revisionRef.current),
      apply: applyAgentOperations,
    })
    const unregisterSimulationFlowsheet = registerSimulationFlowsheet(
      () => stateRef.current.value
    )
    return () => {
      unregisterAgentTarget()
      unregisterSimulationFlowsheet()
    }
  }, [isActive, applyAgentOperations])

  const current =
    state.filePath === filePath
      ? state
      : {
          value: initialState,
          ready: false,
          error: null,
          resetVersion: state.resetVersion,
        }

  return {
    ...current.value,
    ready: current.ready,
    databaseError: current.error,
    resetVersion: current.resetVersion,
    setViewport,
    setNodes,
    setEdges,
    deleteNode,
  }
}
