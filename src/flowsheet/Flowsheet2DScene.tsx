import { useEffect, useMemo, useRef, useState } from 'react'

import type { FlowEdge, FlowNode, Viewport } from '@src/flowsheet/types'

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
  {
    id: 'feed',
    label: 'Feed',
    x: 120,
    y: 140,
    width: 140,
    height: 70,
  },
  {
    id: 'pump',
    label: 'Pump',
    x: 380,
    y: 140,
    width: 160,
    height: 80,
  },
  {
    id: 'reactor',
    label: 'Reactor',
    x: 660,
    y: 130,
    width: 190,
    height: 90,
  },
  {
    id: 'product',
    label: 'Product',
    x: 960,
    y: 140,
    width: 160,
    height: 70,
  },
]

const seedEdges: FlowEdge[] = [
  { id: 'e1', from: 'feed', to: 'pump' },
  { id: 'e2', from: 'pump', to: 'reactor' },
  { id: 'e3', from: 'reactor', to: 'product' },
]

export function Flowsheet2DScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewport, setViewport] = useState<Viewport>(initialViewport)
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
    if (!container) return
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
    if (event.button !== 0) return
    if ((event.target as Element).closest('[data-node-id]')) return
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
    >
      <svg ref={svgRef} className="absolute inset-0 h-full w-full">
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
            if (!from || !to) return null
            const startX = from.x + from.width
            const startY = from.y + from.height / 2
            const endX = to.x
            const endY = to.y + to.height / 2
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
                <path
                  d={path}
                  stroke="#1F3D4D"
                  strokeWidth={2}
                  fill="none"
                />
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
              <rect
                x={0}
                y={0}
                rx={18}
                ry={18}
                width={node.width}
                height={node.height}
                fill="#F3E9D9"
                stroke="#1F3D4D"
                strokeWidth={2}
              />
              <rect
                x={10}
                y={10}
                rx={12}
                ry={12}
                width={node.width - 20}
                height={node.height - 20}
                fill="#FAF5EA"
                stroke="#2D5166"
                strokeWidth={1}
                opacity={0.9}
              />
              <text
                x={node.width / 2}
                y={node.height / 2 + 5}
                textAnchor="middle"
                fontFamily="'IBM Plex Mono', 'SFMono-Regular', ui-monospace, monospace"
                fontSize={14}
                fill="#1F3D4D"
              >
                {node.label}
              </text>
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
