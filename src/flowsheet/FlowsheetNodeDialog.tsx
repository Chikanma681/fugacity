import { SettingsDialog } from '@src/components/Settings/SettingsDialog'
import { FlowsheetNodePanels } from '@src/flowsheet/FlowsheetNodePanels'
import type { FlowNode, FlowNodeChanges } from '@src/flowsheet/types'

export function FlowsheetNodeDialog({
  node,
  open,
  onClose,
  onSave,
  canSave,
}: {
  node: FlowNode
  open: boolean
  onClose: () => void
  onSave: (changes: FlowNodeChanges) => Promise<void>
  canSave: boolean
}) {
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const activeRef = useRef(open)
  useEffect(() => {
    activeRef.current = open
    return () => {
      activeRef.current = false
    }
  }, [open])

  const close = () => {
    if (!savingRef.current) {
      onClose()
    }
  }
  const save = async (changes: FlowNodeChanges) => {
    if (savingRef.current) {
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      await onSave(changes)
      if (activeRef.current) {
        onClose()
      }
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  return (
    <SettingsDialog
      title={node.tag}
      open={open}
      onClose={close}
      closeDisabled={saving}
      testId="flowsheet-node"
      closeLabel="Close node dialog"
    >
      <FlowsheetNodePanels
        key={`${node.id}-${open}`}
        node={node}
        onSave={save}
        onCancel={close}
        saving={saving}
        canSave={canSave}
      />
    </SettingsDialog>
  )
}
import { useEffect, useRef, useState } from 'react'
