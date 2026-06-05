import type { AreaTypeComponentProps } from '@src/lib/layout'
import { LayoutPanel, LayoutPanelHeader } from '@src/components/layout/Panel'
import { RowItemWithIconMenuAndToggle } from '@src/components/RowItemWithIconMenuAndToggle'
import { CustomIcon } from '@src/components/CustomIcon'
import {
  FLOWSHEET_ADD_STREAM_EVENT,
  STREAM_DRAG_TYPE,
  streamPalette,
} from '@src/flowsheet/streamPalette'
import { useState } from 'react'

export function StreamsPane(props: AreaTypeComponentProps) {
  const [equipments, setEquipments] = useState<string>("")

  const filteredPalette = streamPalette.filter((item) =>
    item.label.toLocaleLowerCase().includes(equipments.toLocaleLowerCase() || "")
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
        <div className='p-2 border b-4 focus-within:b-default flex flex-col gap-2 relative'>
          <input
            className="bg-transparent outline-none w-full text-sm overflow-auto"
            value={equipments}
            onChange={(e) => setEquipments(e.target.value)}
          />
        </div>
        <ul>
          {filteredPalette.map((item) => (
            <li key={item.kind} className="px-1 py-0.5">
              <RowItemWithIconMenuAndToggle
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent(FLOWSHEET_ADD_STREAM_EVENT, {
                      detail: { kind: item.kind },
                    })
                  )
                }}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    STREAM_DRAG_TYPE,
                    JSON.stringify({ kind: item.kind })
                  )
                  event.dataTransfer.effectAllowed = 'copy'
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <span className="flex items-center gap-2">
                  <CustomIcon
                    name={item.icon}
                    className="w-5 h-5 text-chalkboard-70"
                    aria-hidden
                  />
                  {item.label}
                </span>
              </RowItemWithIconMenuAndToggle>
            </li>
          ))
          }
        </ul >
      </section >
    </LayoutPanel >
  )
}
