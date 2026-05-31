import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createFlowObject, createSeedFlowObject } from '@src/flowsheet/factory'
import { FlowNodeGraphic } from '@src/flowsheet/renderers'
import {
  FLOWSHEET_ADD_STREAM_EVENT,
  STREAM_DRAG_TYPE,
  type StreamKind,
  streamPalette,
} from '@src/flowsheet/streamPalette'
import type {
  FlowConnectorId,
  FlowEdge,
  FlowNode,
  Viewport,
} from '@src/flowsheet/types'

type DragState =
  | { type: 'none' }
  | { type: 'pan'; originX: number; originY: number; start: Viewport }
  | {
      type: 'node'
      nodeId: string
      originX: number
      originY: number
      startX: number
      startY: number
    }

const initialViewport: Viewport = { x: 0, y: 0, scale: 1 }

const seedNodes: FlowNode[] = [
  createSeedFlowObject({
    id: 'feed',
    unitType: 'MaterialStream',
    tag: '1',
    x: 120,
    y: 152,
  }),
  createSeedFlowObject({
    id: 'pump',
    unitType: 'Pump',
    tag: 'PUMP-1',
    x: 340,
    y: 136,
  }),
  createSeedFlowObject({
    id: 'exchanger',
    unitType: 'HeatExchanger',
    tag: 'HX-1',
    x: 610,
    y: 128,
  }),
  createSeedFlowObject({
    id: 'product',
    unitType: 'MaterialStream',
    tag: '2',
    x: 900,
    y: 152,
  }),
]

const seedEdges: FlowEdge[] = [
  {
    id: 'e1',
    from: 'feed',
    to: 'pump',
    fromConnector: 'outlet',
    toConnector: 'inlet',
  },
  {
    id: 'e2',
    from: 'pump',
    to: 'exchanger',
    fromConnector: 'outlet',
    toConnector: 'inlet1',
  },
  {
    id: 'e3',
    from: 'exchanger',
    to: 'product',
    fromConnector: 'outlet1',
    toConnector: 'inlet',
  },
]

function getPortPosition(
  node: FlowNode,
  connectorId: FlowConnectorId | undefined,
  side: 'from' | 'to'
) {
  if (connectorId) {
    const connector = node.connectors.find((item) => item.id === connectorId)
    if (connector) {
      return {
        x: node.x + connector.x * node.width,
        y: node.y + connector.y * node.height,
      }
    }
  }

  return {
    x: node.x + (side === 'from' ? node.width : 0),
    y: node.y + node.height / 2,
  }
}

export function Flowsheet2DScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewport, setViewport] = useState<Viewport>(initialViewport)
  const viewportRef = useRef<Viewport>(initialViewport)
  const [nodes, setNodes] = useState<FlowNode[]>(seedNodes)
  const [edges] = useState<FlowEdge[]>(seedEdges)
  const [drag, setDrag] = useState<DragState>({ type: 'none' })

  const nodeMap = useMemo(() => {
    const map = new Map<string, FlowNode>()
    for (const node of nodes) {
      map.set(node.id, node)
    }
    return map
  }, [nodes])

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
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])

  const createNode = useCallback((kind: StreamKind, x: number, y: number) => {
    setNodes((prev) => [
      ...prev,
      createFlowObject({ unitType: kind, x, y, nodes: prev }),
    ])
  }, [])

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

  const placeNodeCentered = useCallback(
    (kind: StreamKind) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }
      const center = screenToWorld(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      )
      const paletteItem = streamPalette.find((item) => item.kind === kind)
      if (!paletteItem) {
        return
      }
      createNode(
        kind,
        center.x - paletteItem.width / 2,
        center.y - paletteItem.height / 2
      )
    },
    [createNode, screenToWorld]
  )

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: StreamKind }>).detail
      if (!detail) {
        return
      }
      placeNodeCentered(detail.kind)
    }
    window.addEventListener(FLOWSHEET_ADD_STREAM_EVENT, handler)
    return () => window.removeEventListener(FLOWSHEET_ADD_STREAM_EVENT, handler)
  }, [placeNodeCentered])

  useEffect(() => {
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
    }

    const onPointerUp = () => {
      setDrag({ type: 'none' })
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [drag, viewport.scale])

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault()
    const delta = -event.deltaY
    const scaleFactor = delta > 0 ? 1.08 : 0.92
    const nextScale = Math.min(2.2, Math.max(0.5, viewport.scale * scaleFactor))
    setViewport((prev) => ({ ...prev, scale: nextScale }))
  }

  const startPan = (event: React.PointerEvent) => {
    if (event.button !== 0) {
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

  return (
    <div
      ref={containerRef}
      data-testid="flowsheet-2d"
      className="absolute inset-0 h-full w-full bg-chalkboard-10 dark:bg-chalkboard-100"
      style={backgroundStyle}
      onPointerDown={startPan}
      onWheel={handleWheel}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(STREAM_DRAG_TYPE)) {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        }
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes(STREAM_DRAG_TYPE)) {
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
        <defs>
          <linearGradient id="pipeGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#61B8FF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#9AE6FF" stopOpacity="0.8" />
          </linearGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g
          transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}
        >
          {edges.map((edge) => {
            const from = nodeMap.get(edge.from)
            const to = nodeMap.get(edge.to)
            if (!from || !to) {
              return null
            }
            const start = getPortPosition(from, edge.fromConnector, 'from')
            const end = getPortPosition(to, edge.toConnector, 'to')
            const startX = start.x
            const startY = start.y
            const endX = end.x
            const endY = end.y
            const midX = (startX + endX) / 2
            const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
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
          {nodes.map((node) => (
            <g
              key={node.id}
              data-node-id={node.id}
              transform={`translate(${node.x} ${node.y})`}
              onPointerDown={(event) => startNodeDrag(event, node)}
            >
              <FlowNodeGraphic node={node} />
            </g>
          ))}
        </g>
      </svg>
      <div className="absolute left-6 bottom-6 rounded-xl border border-chalkboard-30 bg-chalkboard-10/90 dark:bg-chalkboard-90/80 px-4 py-3 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-chalkboard-50">
          Flowsheet 2D
        </p>
        <p className="text-sm text-chalkboard-80 dark:text-chalkboard-20">
          Drag units or pan. Scroll to zoom.
        </p>
      </div>
    </div>
  )
}
