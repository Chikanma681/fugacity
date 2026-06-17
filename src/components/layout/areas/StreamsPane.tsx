import type { AreaTypeComponentProps } from '@src/lib/layout'
import { LayoutPanel, LayoutPanelHeader } from '@src/components/layout/Panel'
import { STREAM_DRAG_TYPE, streamPalette } from '@src/flowsheet/streamPalette'
import { FlowNodeGraphic } from '@src/flowsheet/renderers'
import type { FlowNode } from '@src/flowsheet/types'
import { useState } from 'react'

export function StreamsPane(props: AreaTypeComponentProps) {
  const [equipments, setEquipments] = useState<string>('')

  const filteredPalette = streamPalette.filter((item) =>
    item.label
      .toLocaleLowerCase()
      .includes(equipments.toLocaleLowerCase() || '')
  )

  return (
    <LayoutPanel
      title={props.layout.label}
      id={`${props.layout.id}-pane`}
      className="border-none"
    >
      <LayoutPanelHeader
        id={props.layout.id}
        icon="model"
        title={props.layout.label}
      />
      <section className="overflow-auto mr-1 pb-8">
        <div className="p-2 border b-4 focus-within:b-default flex flex-col gap-2 relative">
          <input
            className="bg-transparent outline-none w-full text-sm overflow-auto"
            value={equipments}
            onChange={(e) => setEquipments(e.target.value)}
          />
        </div>
        <ul className="grid grid-cols-3 gap-2 p-2">
          {filteredPalette.map((item) => {
            const previewNode: FlowNode = {
              id: `palette-${item.kind}`,
              name: item.label,
              tag: '',
              label: item.label,
              x: 0,
              y: 0,
              width: item.width,
              height: item.height,
              unitType: item.kind,
              dwsimObjectType: item.kind,
              connectors: [],
            }

            return (
              <li
                key={item.kind}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    STREAM_DRAG_TYPE,
                    JSON.stringify({ kind: item.kind })
                  )
                  event.dataTransfer.effectAllowed = 'copy'
                }}
                className="group flex min-h-24 cursor-grab flex-col items-center justify-start rounded border border-chalkboard-20/40 bg-transparent px-1.5 py-3 text-center active:cursor-grabbing hover:border-chalkboard-40 dark:border-chalkboard-70/60 dark:hover:border-chalkboard-60"
              >
                <svg
                  viewBox={`0 0 ${item.width} ${item.height}`}
                  className="h-12 w-full max-w-16 overflow-visible transition-transform group-hover:scale-105"
                  role="img"
                  aria-label={item.label}
                >
                  <FlowNodeGraphic node={previewNode} />
                </svg>
                <span className="mt-3 text-xs font-semibold leading-tight text-chalkboard-90 dark:text-chalkboard-10">
                  {item.label}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </LayoutPanel>
  )
}
