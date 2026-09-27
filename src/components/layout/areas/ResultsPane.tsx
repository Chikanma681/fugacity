import { LayoutPanel, LayoutPanelHeader } from '@src/components/layout/Panel'
import type { AreaTypeComponentProps } from '@src/lib/layout'

export function ResultsPane(props: AreaTypeComponentProps) {
  return (
    <LayoutPanel
      title={props.layout.label}
      id={`${props.layout.id}-pane`}
      className="border-none"
    >
      <LayoutPanelHeader
        id={props.layout.id}
        icon="logs"
        title={props.layout.label}
      />
      <div className="p-4 text-sm text-chalkboard-60 dark:text-chalkboard-40">
        Simulation results will appear here.
      </div>
    </LayoutPanel>
  )
}
