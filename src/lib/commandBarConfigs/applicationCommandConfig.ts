import type { Command } from '@src/lib/commandTypes'
import { writeEnvironmentFile } from '@src/lib/desktop'
import { isDesktop } from '@src/lib/isDesktop'
import { reportRejection } from '@src/lib/trap'
import { returnSelfOrGetHostNameFromURL } from '@src/lib/utils'
import toast from 'react-hot-toast'
import { isUserLoadableLayoutKey, userLoadableLayouts } from '@src/lib/layout'
import type { SettingsActorType } from '@src/machines/settingsMachine'
import type { CommandBarActorType } from '@src/machines/commandBarMachine'
import type { App } from '@src/lib/app'

export function createApplicationCommands({ app }: { app: App }) {
  const switchEnvironmentsCommand: Command = {
    name: 'switch-environments',
    displayName: 'Switch Environments',
    description: 'Connect the application runtime to a different environment',
    needsReview: false,
    icon: 'gear',
    groupId: 'application',
    onSubmit: (data) => {
      if (!window.electron) {
        console.error(new Error('No file system present'))
        return
      }
      if (data) {
        const requestedEnvironmentFormatted = returnSelfOrGetHostNameFromURL(
          data.environment
        )
        writeEnvironmentFile(requestedEnvironmentFormatted)
          .then(() => {
            // Reload the application and it will trigger the correct sign in workflow for the new environment
            window.location.reload()
          })
          .catch(reportRejection)
      }
    },
    args: {
      environment: {
        inputType: 'string',
        required: true,
        displayName: 'Domain',
      },
    },
  }

  const resetLayoutCommand: Command = {
    name: 'reset-layout',
    displayName: 'Reset layout',
    description: 'Reset layout to the default configuration',
    needsReview: false,
    icon: 'layout',
    groupId: 'application',
    onSubmit: app.layout.reset,
  }

  const setLayoutCommand: Command = {
    name: 'set-layout',
    hideFromSearch: true,
    displayName: 'Set layout',
    description: 'Set layout to be a certain predefined configuration',
    needsReview: false,
    icon: 'layout',
    groupId: 'application',
    onSubmit: (data) => {
      if (isUserLoadableLayoutKey(data?.layoutId)) {
        app.layout.set(userLoadableLayouts[data.layoutId])
        // This command is silent, we don't toast success, because
        // it is often used in conjunction with other commands and actions
        // that occur on app load, and we don't want to spam the user.
      } else {
        toast.error(`No layout found with ID "${data?.layoutId}"`)
      }
    },
    args: {
      layoutId: {
        inputType: 'options',
        defaultValue: 'default',
        skip: true,
        required: true,
        /** These options must correspond to configs within `@src/lib/layout/configs/` */
        options: [
          {
            name: 'Default',
            value: 'default',
          },
          {
            name: 'Text-to-CAD focus',
            value: 'ttc',
          },
        ] satisfies { name: string; value: keyof typeof userLoadableLayouts }[],
      },
    },
  }

  return isDesktop()
    ? [resetLayoutCommand, setLayoutCommand, switchEnvironmentsCommand]
    : [resetLayoutCommand, setLayoutCommand]
}

export function sendAddFileToProjectCommandForCurrentProject(
  settingsActor: SettingsActorType,
  commandBarActor: CommandBarActorType
) {
  const currentProject = settingsActor.getSnapshot().context.currentProject
  commandBarActor.send({
    type: 'Find and select command',
    data: {
      name: 'add-kcl-file-to-project',
      groupId: 'application',
      argDefaultValues: {
        method: 'existingProject',
        projectName: currentProject?.name,
        ...(!isDesktop() ? { source: 'kcl-samples' } : {}),
      },
    },
  })
}
