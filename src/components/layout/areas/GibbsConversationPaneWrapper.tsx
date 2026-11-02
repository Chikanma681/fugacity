import { browserSaveFile } from '@src/lib/browserSaveFile'
import { Menu } from '@headlessui/react'
import { ActionIcon } from '@src/components/ActionIcon'
// Yea, feels bad, but literally every other pane is doing this.
// TODO: Don't use CSS module for this? More generic module?
import styles from './KclEditorMenu.module.css'
import { useApp } from '@src/lib/boot'
import { GibbsConversationPane } from '@src/components/layout/areas/GibbsConversationPane'
import { LayoutPanel, LayoutPanelHeader } from '@src/components/layout/Panel'
import type { AreaTypeComponentProps } from '@src/lib/layout'
import { gibbsConversationToMarkdown } from '@src/lib/gibbs/markdown'
import { GibbsChatReactContext } from '@src/machines/gibbsChatMachine'
import { useSignals } from '@preact/signals-react/runtime'

export const GibbsConversationMenu = ({
  children,
}: React.PropsWithChildren) => {
  const gibbsChatActor = GibbsChatReactContext.useActorRef()

  return (
    <Menu>
      <div
        className="relative"
        role="button"
        tabIndex={0}
        onClick={(e) => {
          const target = e.target as HTMLElement
          if (e.eventPhase === 3 && target.closest('a') === null) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
      >
        <Menu.Button className="!p-0 !bg-transparent hover:text-primary border-transparent dark:!border-transparent hover:!border-primary dark:hover:!border-chalkboard-70 ui-open:!border-primary dark:ui-open:!border-chalkboard-70 !outline-none">
          <ActionIcon
            icon="three-dots"
            className="p-1"
            size="sm"
            bgClassName="bg-transparent dark:bg-transparent"
            iconClassName={'!text-chalkboard-90 dark:!text-chalkboard-40'}
          />
        </Menu.Button>
        <Menu.Items className="absolute right-0 left-auto w-72 flex flex-col gap-1 divide-y divide-chalkboard-20 dark:divide-chalkboard-70 align-stretch px-0 py-1 bg-chalkboard-10 dark:bg-chalkboard-100 rounded-sm shadow-lg border border-solid border-chalkboard-20/50 dark:border-chalkboard-80/50">
          <Menu.Item>
            <button
              onClick={() => {
                const context = gibbsChatActor.getSnapshot().context
                const md = gibbsConversationToMarkdown(context.messages)
                const blob = new Blob([new TextEncoder().encode(md)], {
                  type: 'text/markdown',
                })
                void browserSaveFile(
                  blob,
                  `${context.conversationId ?? new Date().toISOString()}.md`,
                  ''
                )
              }}
              className={styles.button}
            >
              <span>Export conversation</span>
            </button>
          </Menu.Item>
        </Menu.Items>
      </div>
    </Menu>
  )
}

export function GibbsConversationPaneWrapper(props: AreaTypeComponentProps) {
  useSignals()
  const { auth, settings } = useApp()
  const settingsValues = settings.useSettings()
  const user = auth.useUser()
  const gibbsChatActor = GibbsChatReactContext.useActorRef()

  return (
    <LayoutPanel
      title={props.layout.label}
      id={`${props.layout.id}-pane`}
      className="border-none"
    >
      <LayoutPanelHeader
        id={props.layout.id}
        icon="robot"
        title="Gibbs"
        onClose={props.onClose}
        Menu={GibbsConversationMenu}
      />
      <GibbsConversationPane
        gibbsChatActor={gibbsChatActor}
        projectId={settingsValues.meta.id.current}
        userAvatar={user?.image}
        gibbsMode={settingsValues.app.gibbsMode.current}
        onGibbsModeChange={(mode) => {
          settings.actor.send({
            type: 'set.app.gibbsMode',
            data: { level: 'project', value: mode },
          })
        }}
      />
    </LayoutPanel>
  )
}
