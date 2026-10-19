import { SettingsDialog } from '@src/components/Settings/SettingsDialog'
import { FlowsheetNodePanels } from '@src/flowsheet/FlowsheetNodePanels'
import type { FlowNode } from '@src/flowsheet/types'

export function FlowsheetNodeDialog({
  node,
  open,
  onClose,
}: {
  node: FlowNode
  open: boolean
  onClose: () => void
}) {
  return (
    <SettingsDialog
      title={node.tag}
      open={open}
      onClose={onClose}
      testId="flowsheet-node"
      closeLabel="Close node dialog"
    >
      <FlowsheetNodePanels key={node.id} node={node} />
    </SettingsDialog>
  )
}
