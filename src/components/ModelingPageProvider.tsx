import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAbsoluteFilePath } from '@src/hooks/useAbsoluteFilePath'
import { useMenuListener } from '@src/hooks/useMenu'
import { createRouteCommands } from '@src/lib/commandBarConfigs/routeCommandConfig'
import { PATHS } from '@src/lib/paths'
import { markOnce } from '@src/lib/performance'
import { useApp, useSingletons } from '@src/lib/boot'
import { modelingMenuCallbackMostActions } from '@src/menu/register'
import { useSignals } from '@preact/signals-react/runtime'

/**
 * FileMachineProvider moved to ModelingPageProvider.
 * This is a root provider for the modeling page to initialize any react code required for the run
 * time of the modeling page.
 */

export const ModelingPageProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  useSignals()
  const { auth, commands, settings, project } = useApp()
  const { kclManager } = useSingletons()
  const navigate = useNavigate()
  const location = useLocation()
  const settingsValues = settings.useSettings()
  const settingsActor = settings.actor
  const file = project?.executingFileEntry.value
  const filePath = useAbsoluteFilePath()

  useEffect(() => {
    markOnce('code/didLoadFile')
  }, [])

  // Due to the route provider, i've moved this to the ModelingPageProvider instead of CommandBarProvider
  // This will register the commands to route to Home and Settings.
  useEffect(() => {
    if (file?.path === undefined) {
      return
    }

    const filePath = PATHS.FILE + '/' + encodeURIComponent(file?.path)

    const { RouteHomeCommand, RouteSettingsCommand } = createRouteCommands(
      navigate,
      location,
      filePath
    )
    const routeCommands = [RouteSettingsCommand, RouteHomeCommand]
    commands.send({
      type: 'Add commands',
      data: { commands: routeCommands },
    })

    return () => {
      commands.send({
        type: 'Remove commands',
        data: { commands: routeCommands },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: blanket-ignored fix me!
  }, [location])

  const cb = modelingMenuCallbackMostActions({
    authActor: auth.actor,
    commandBarActor: commands.actor,
    filePath,
    kclManager,
    navigate,
    settings: settingsValues,
    settingsActor,
  })
  useMenuListener(cb)

  return <div>{children}</div>
}

export default ModelingPageProvider
