import { useSignals } from '@preact/signals-react/runtime'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ContextMenu, ContextMenuItem } from '@src/components/ContextMenu'
import { FlowsheetNodeDialog } from '@src/flowsheet/FlowsheetNodeDialog'
import { createFlowObject } from '@src/flowsheet/factory'
import { FlowNodeGraphic } from '@src/flowsheet/renderers'
import {
  STREAM_DRAG_TYPE,
  type StreamKind,
  streamPalette,
} from '@src/flowsheet/streamPalette'
import type { FlowNode, PortId, Viewport } from '@src/flowsheet/types'
import { useFlowsheetState } from '@src/flowsheet/useFlowsheetState'
import { useApp } from '@src/lib/boot'
import { getFlowsheetFilePath } from '@src/lib/store/database'

type DragState =
  | { type: 'none' }
  | { type: 'pan'; originX: number; originY: number; start: Viewport }
  | {
      type: 'edge'
      from: { nodeId: string; portId: PortId }
      current: { x: number; y: number }
    }
  | {
      type: 'node'
      nodeId: string
      originX: number
      originY: number
      startX: number
      startY: number
    }

function getPortPosition(
  node: FlowNode,
  portId: PortId | undefined,
  side: 'from' | 'to'
) {
  if (portId) {
    const port = node.ports.find((item) => item.id === portId)
    if (port) {
      return {
        x: node.x + port.x * node.width,
        y: node.y + port.y * node.height,
      }
    }
  }

  return {
    x: node.x + (side === 'from' ? node.width : 0),
    y: node.y + node.height / 2,
  }
}

function getOrthogonalEdgePath(
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  const midX = (start.x + end.x) / 2
  return `M ${start.x} ${start.y} H ${midX} V ${end.y} H ${end.x}`
}

export function Flowsheet2DScene() {
  useSignals()
  const { project } = useApp()
  const file = project?.executingFileEntry.value
  const filePath = getFlowsheetFilePath(file?.path)
  const fileName = filePath?.split(/[\\/]/).at(-1)
  const {
    viewport,
    nodes,
    edges,
    setViewport,
    setNodes,
    setEdges,
    deleteNode,
    ready,
    databaseError,
    resetVersion,
  } = useFlowsheetState(filePath)

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const viewportRef = useRef<Viewport>(viewport)
  const nodeDragMovedRef = useRef(false)
  const [drag, setDrag] = useState<DragState>({ type: 'none' })
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false)
  const [contextNodeId, setContextNodeId] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: File loads and rollbacks cancel active pointer gestures.
  useEffect(() => {
    setDrag({ type: 'none' })
    setSelectedNodeId(null)
    setNodeDialogOpen(false)
    setContextNodeId(null)
  }, [filePath, resetVersion])

  const nodeMap = useMemo(() => {
    const map = new Map<string, FlowNode>()
    for (const node of nodes) {
      map.set(node.id, node)
    }
    return map
  }, [nodes])

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : undefined

  const handleNodeContextMenu = useCallback((event: MouseEvent) => {
    const nodeId = (event.target as Element | null)
      ?.closest('[data-node-id]')
      ?.getAttribute('data-node-id')
    if (!nodeId) {
      return
    }
    setDrag({ type: 'none' })
    setContextNodeId(nodeId)
  }, [])

  const handleDeleteNode = () => {
    if (!ready || !contextNodeId) {
      return
    }
    deleteNode(contextNodeId)
    setDrag({ type: 'none' })
    if (selectedNodeId === contextNodeId) {
      setSelectedNodeId(null)
      setNodeDialogOpen(false)
    }
    setContextNodeId(null)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }
    const observer = new ResizeObserver(() => {
      if (svgRef.current) {
        svgRef.current.setAttribute('width', String(container.clientWidth))
        svgRef.current.setAttribute('height', String(container.clientHeight))
      }
    })
    observer.observe(container)
    return () => observer.disconnect() //being honest im not sure this works
  }, [])

  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])

  const createNode = useCallback(
    (kind: StreamKind, x: number, y: number) => {
      setNodes((prev) => [
        ...prev,
        createFlowObject({ unitType: kind, x, y, nodes: prev }),
      ])
    },
    [setNodes]
  )

  // Convert a pointer position from browser screen pixels into flowsheet coordinates.
  // For example, this lets a dropped node land under the pointer after panning or
  // zooming, and keeps the temporary connection endpoint under the pointer while
  // dragging from a port.
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) {
      return { x: 0, y: 0 }
    }
    const localX = clientX - rect.left
    const localY = clientY - rect.top
    const currentViewport = viewportRef.current
    return {
      x: (localX - currentViewport.x) / currentViewport.scale,
      y: (localY - currentViewport.y) / currentViewport.scale,
    }
  }, [])

  const getPortTarget = useCallback((target: EventTarget | null) => {
    const portElement = (target as Element | null)?.closest<SVGGElement>(
      '[data-port-id][data-node-id]'
    )
    const nodeId = portElement?.dataset.nodeId
    const portId = portElement?.dataset.portId
    return nodeId && portId ? { nodeId, portId } : null
  }, [])

  const startEdgeDrag = (
    event: React.PointerEvent,
    node: FlowNode,
    portId: PortId
  ) => {
    event.stopPropagation()
    if (!ready || event.button !== 0) {
      return
    }
    event.preventDefault()
    setDrag({
      type: 'edge',
      from: { nodeId: node.id, portId },
      current: screenToWorld(event.clientX, event.clientY),
    })
  }

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault()
    const delta = -event.deltaY
    const scaleFactor = delta > 0 ? 1.08 : 0.92
    setViewport((prev) => ({
      ...prev,
      scale: Math.min(2.2, Math.max(0.5, prev.scale * scaleFactor)),
    }))
  }

  const startPan = (event: React.PointerEvent) => {
    if (!ready || event.button !== 0) {
      return
    }
    if ((event.target as Element).closest('[data-node-id]')) {
      return
    }
    setDrag({
      type: 'pan',
      originX: event.clientX,
      originY: event.clientY,
      start: viewport,
    })
  }

  const startNodeDrag = (event: React.PointerEvent, node: FlowNode) => {
    event.stopPropagation()
    if (!ready || event.button !== 0) {
      return
    }
    nodeDragMovedRef.current = false
    setDrag({
      type: 'node',
      nodeId: node.id,
      originX: event.clientX,
      originY: event.clientY,
      startX: node.x,
      startY: node.y,
    })
  }

  const backgroundStyle = {
    backgroundImage:
      'radial-gradient(circle at 1px 1px, rgba(20, 33, 45, 0.35) 1px, transparent 0)',
    backgroundSize: '24px 24px',
  }
  useEffect(() => {
    if (!ready) {
      return
    }
    const onPointerMove = (event: PointerEvent) => {
      if (drag.type === 'pan') {
        const dx = event.clientX - drag.originX
        const dy = event.clientY - drag.originY
        setViewport({
          ...drag.start,
          x: drag.start.x + dx,
          y: drag.start.y + dy,
        })
      }
      if (drag.type === 'node') {
        if (
          !nodeDragMovedRef.current &&
          Math.hypot(
            event.clientX - drag.originX,
            event.clientY - drag.originY
          ) <= 5
        ) {
          return
        }
        nodeDragMovedRef.current = true
        const dx = (event.clientX - drag.originX) / viewport.scale
        const dy = (event.clientY - drag.originY) / viewport.scale
        setNodes((prev) =>
          prev.map((node) =>
            node.id === drag.nodeId
              ? { ...node, x: drag.startX + dx, y: drag.startY + dy }
              : node
          )
        )
      }
      if (drag.type === 'edge') {
        setDrag({
          ...drag,
          current: screenToWorld(event.clientX, event.clientY),
        })
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      if (
        drag.type === 'node' &&
        !nodeDragMovedRef.current &&
        Math.hypot(
          event.clientX - drag.originX,
          event.clientY - drag.originY
        ) <= 5 &&
        (event.target as Element | null)
          ?.closest('[data-node-id]')
          ?.getAttribute('data-node-id') === drag.nodeId &&
        !getPortTarget(event.target)
      ) {
        setSelectedNodeId(drag.nodeId)
        setNodeDialogOpen(true)
      }
      if (drag.type === 'edge') {
        const target = getPortTarget(event.target)
        if (target && target.nodeId !== drag.from.nodeId) {
          setEdges((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              from: drag.from.nodeId,
              fromPort: drag.from.portId,
              to: target.nodeId,
              toPort: target.portId,
            },
          ])
        }
      }
      setDrag({ type: 'none' })
    }

    const onPointerCancel = () => setDrag({ type: 'none' })

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [
    drag,
    getPortTarget,
    ready,
    screenToWorld,
    setEdges,
    setNodes,
    setViewport,
    viewport.scale,
  ])

  return (
    <>
      <div
        ref={containerRef}
        data-testid="flowsheet-2d"
        aria-busy={!ready && !databaseError}
        className="absolute inset-0 h-full w-full bg-chalkboard-10 dark:bg-chalkboard-100"
        style={backgroundStyle}
        onPointerDown={startPan}
        onWheel={handleWheel}
        onDragOver={(event) => {
          if (ready && event.dataTransfer.types.includes(STREAM_DRAG_TYPE)) {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
          }
        }}
        onDrop={(event) => {
          if (!ready || !event.dataTransfer.types.includes(STREAM_DRAG_TYPE)) {
            return
          }
          event.preventDefault()
          const payload = event.dataTransfer.getData(STREAM_DRAG_TYPE)
          if (!payload) {
            return
          }
          const parsed = JSON.parse(payload) as { kind?: StreamKind }
          if (!parsed.kind) {
            return
          }
          const paletteItem = streamPalette.find(
            (item) => item.kind === parsed.kind
          )
          if (!paletteItem) {
            return
          }
          const worldPoint = screenToWorld(event.clientX, event.clientY)
          createNode(
            parsed.kind,
            worldPoint.x - paletteItem.width / 2,
            worldPoint.y - paletteItem.height / 2
          )
        }}
      >
        <svg
          ref={svgRef}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="2D flowsheet canvas"
        >
          <g
            transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}
          >
            {edges.map((edge) => {
              const from = nodeMap.get(edge.from)
              const to = nodeMap.get(edge.to)
              if (!from || !to) {
                return null
              }
              const start = getPortPosition(from, edge.fromPort, 'from')
              const end = getPortPosition(to, edge.toPort, 'to')
              const path = getOrthogonalEdgePath(start, end)
              return (
                <g key={edge.id}>
                  <path
                    d={path}
                    stroke="url(#pipeGlow)"
                    strokeWidth={6}
                    fill="none"
                    filter="url(#softGlow)"
                    opacity={0.6}
                  />
                  <path d={path} stroke="#1F3D4D" strokeWidth={2} fill="none" />
                </g>
              )
            })}
            {drag.type === 'edge' &&
              (() => {
                const fromNode = nodeMap.get(drag.from.nodeId)
                if (!fromNode) {
                  return null
                }
                const start = getPortPosition(
                  fromNode,
                  drag.from.portId,
                  'from'
                )
                return (
                  <path
                    d={getOrthogonalEdgePath(start, drag.current)}
                    stroke="#1F3D4D"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    fill="none"
                    pointerEvents="none"
                  />
                )
              })()}
            {nodes.map((node) => (
              <g
                key={node.id}
                data-node-id={node.id}
                transform={`translate(${node.x} ${node.y})`}
                onPointerDown={(event) => {
                  const port = getPortTarget(event.target)
                  if (port) {
                    startEdgeDrag(event, node, port.portId)
                  } else {
                    startNodeDrag(event, node)
                  }
                }}
              >
                <FlowNodeGraphic node={node} />
              </g>
            ))}
          </g>
        </svg>
        {databaseError && (
          <div
            role="alert"
            className="absolute bottom-4 left-4 rounded bg-chalkboard-10 p-2 text-sm dark:bg-chalkboard-100"
          >
            {fileName}: {databaseError}
          </div>
        )}
        {!ready && !databaseError && (
          <output className="absolute bottom-4 left-4 rounded bg-chalkboard-10 p-2 text-sm dark:bg-chalkboard-100">
            Loading {fileName}…
          </output>
        )}
      </div>
      {ready && (
        <ContextMenu
          key={`${filePath}-${resetVersion}`}
          menuTargetElement={containerRef}
          callback={handleNodeContextMenu}
          guard={(event) =>
            Boolean((event.target as Element | null)?.closest('[data-node-id]'))
          }
          items={[
            <ContextMenuItem
              key="delete"
              data-testid="flowsheet-node-delete"
              disabled={!contextNodeId || !nodeMap.has(contextNodeId)}
              onClick={handleDeleteNode}
            >
              Delete
            </ContextMenuItem>,
          ]}
        />
      )}
      {selectedNode && ready && (
        <FlowsheetNodeDialog
          node={selectedNode}
          open={nodeDialogOpen}
          onClose={() => setNodeDialogOpen(false)}
        />
      )}
    </>
  )
}
