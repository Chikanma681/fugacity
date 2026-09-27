import { useSignals } from '@preact/signals-react/runtime'
import { Toolbar } from '@src/Toolbar'
import { ConnectionStream } from '@src/components/ConnectionStream'
import { BodiesPane } from '@src/components/layout/areas/BodiesPane'
import { DebugPane } from '@src/components/layout/areas/DebugPane'
import { KclEditorPane } from '@src/components/layout/areas/KclEditorPane'
import { LogsPane } from '@src/components/layout/areas/LoggingPanes'
import { MemoryPane } from '@src/components/layout/areas/MemoryPane'
import { MlEphantConversationPaneWrapper } from '@src/components/layout/areas/MlEphantConversationPaneWrapper'
import { ProjectExplorerPane } from '@src/components/layout/areas/ProjectExplorerPane'
import { ResultsPane } from '@src/components/layout/areas/ResultsPane'
import { StreamsPane } from '@src/components/layout/areas/StreamsPane'
import { kclErrorsByFilename } from '@src/lang/errors'
import { useApp, useSingletons } from '@src/lib/boot'
import { DefaultLayoutPaneID } from '@src/lib/layout/configs/default'
import type { AreaType, AreaTypeDefinition } from '@src/lib/layout/types'
import { togglePaneLayoutNode } from '@src/lib/layout/utils'
import type { MouseEventHandler } from 'react'
import { useCallback, useMemo } from 'react'

function ModelingArea() {
  const { auth } = useApp()
  const authToken = auth.useToken()
  return (
    <div className="relative z-0 min-w-64 flex flex-col flex-1 items-center overflow-hidden">
      <Toolbar />
      <ConnectionStream authToken={authToken} />
    </div>
  )
}

/**
 * For now we have strict area types but in future
 * we should make it possible to register your own in an extension.
 */
export const useDefaultAreaLibrary = () => {
  useSignals()
  const { settings, layout } = useApp()
  const { kclManager } = useSingletons()
  const getSettings = settings.get
  const onCodeNotificationClick: MouseEventHandler = useCallback(
    (e) => {
      e.preventDefault()
      const rootLayout = structuredClone(layout.signal.value)
      layout.set(
        togglePaneLayoutNode({
          rootLayout,
          targetNodeId: DefaultLayoutPaneID.Code,
          shouldExpand: true,
        })
      )
      kclManager.scrollToFirstErrorDiagnosticIfExists()
    },
    [kclManager, layout]
  )

  return useMemo(
    () =>
      Object.freeze({
        streams: {
          hide: () => false,
          shortcut: 'Shift + T',
          Component: StreamsPane,
        },
        results: {
          hide: () => false,
          Component: ResultsPane,
        },
        bodies: {
          hide: () => false,
          Component: BodiesPane,
        },
        modeling: {
          hide: () => false,
          Component: ModelingArea,
        },
        ttc: {
          hide: () => false,
          shortcut: 'Ctrl + T',
          cssClassOverrides: {
            button:
              'bg-ml-green pressed:bg-transparent dark:!text-chalkboard-100 hover:dark:!text-inherit dark:pressed:!text-inherit',
          },
          Component: MlEphantConversationPaneWrapper,
        },
        equipments: {
          hide: () => false,
          shortcut: 'Shift + C',
          Component: KclEditorPane,
          useNotifications() {
            const value = kclManager.diagnosticsSignal.value.filter(
              (diagnostic) => diagnostic.severity === 'error'
            ).length
            return useMemo(() => {
              return {
                value,
                onClick: onCodeNotificationClick,
                title: undefined,
              }
            }, [value])
          },
        },
        files: {
          hide: () => false,
          shortcut: 'Shift + F',
          Component: ProjectExplorerPane,
          useNotifications() {
            const title = 'Project files have runtime errors'
            // Only compute runtime errors! Compilation errors are not tracked here.
            const errors = kclErrorsByFilename(kclManager.errorsSignal.value)
            const value = errors.size > 0 ? 'x' : ''
            const onClick: MouseEventHandler = (e) => {
              e.preventDefault()
              // TODO: When we have generic file open
              // If badge is pressed
              // Open the first error in the array of errors
              // Then scroll to error
              // Do you automatically open the project files
              // kclManager.scrollToFirstErrorDiagnosticIfExists()
            }
            return useMemo(() => ({ value, onClick, title }), [value, title])
          },
        },
        variables: {
          hide: () => false,
          shortcut: 'Shift + V',
          Component: MemoryPane,
        },
        logs: {
          hide: () => false,
          shortcut: 'Shift + L',
          Component: LogsPane,
        },
        debug: {
          hide: () => getSettings().app.showDebugPanel.current === false,
          shortcut: 'Shift + D',
          Component: DebugPane,
        },
      } satisfies Record<AreaType, AreaTypeDefinition>),
    [getSettings, kclManager, onCodeNotificationClick]
  )
}

function testArea(name: string): AreaTypeDefinition {
  return {
    hide: () => false,
    Component: () => (
      <div className="self-stretch flex-1 grid place-content-center">
        {name}
      </div>
    ),
  }
}

export const testAreaLibrary = Object.freeze({
  streams: testArea('Streams'),
  bodies: testArea('bodies'),
  modeling: testArea('Modeling Scene'),
  ttc: testArea('TTC'),
  equipments: testArea('Equipments'),
  files: testArea('File Explorer'),
  logs: testArea('Logs'),
  variables: testArea('Variables'),
  debug: testArea('Debug'),
  results: testArea('Results'),
} satisfies Record<AreaType, AreaTypeDefinition>)
