import { useCallback, useEffect, useRef, useState } from 'react'

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

  useEffect(() => {
    let disposed = false
    let session: FlowsheetSession | undefined
    const applyState = (next: FlowsheetSessionState) => {
      if (disposed) {
        return
      }
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

  const update = useCallback(
    <Key extends keyof FlowsheetState>(
      key: Key,
      change: StateUpdate<FlowsheetState[Key]>
    ) => {
      const current = stateRef.current
      if (current.filePath !== filePath || !current.ready) {
        return
      }
      const value =
        typeof change === 'function' ? change(current.value[key]) : change
      const next = { ...current, value: { ...current.value, [key]: value } }
      stateRef.current = next
      setState(next)
      sessionRef.current?.enqueue(next.value)
    },
    [filePath]
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
  }
}
