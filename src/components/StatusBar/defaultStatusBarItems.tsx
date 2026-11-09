import { HelpMenu } from '@src/components/HelpMenu'
import { DownloadDesktopApp } from '@src/components/StatusBar/DownloadDesktopApp'
import type { StatusBarItemType } from '@src/components/StatusBar/statusBarTypes'
import { isDesktop } from '@src/lib/isDesktop'
import { PATHS } from '@src/lib/paths'
import { APP_VERSION, getReleaseUrl } from '@src/routes/utils'
import type { Location } from 'react-router-dom'

export const defaultGlobalStatusBarItems = ({
  location,
  filePath,
}: {
  location: Location
  filePath?: string
}): StatusBarItemType[] => [
  // isDesktop()
    // ? {
    //     id: 'version',
    //     element: 'externalLink',
    //     label: `v${APP_VERSION}`,
    //     href: getReleaseUrl(),
    //     toolTip: {
    //       children: 'View the release notes on GitHub',
    //     },
    //   }
    // : {
    //     id: 'download-desktop-app',
    //     'data-testid': 'download-desktop-app',
    //     component: DownloadDesktopApp,
    //   },
  {
    id: 'telemetry',
    element: 'link',
    icon: 'stopwatch',
    href: location.pathname.includes(PATHS.FILE)
      ? filePath + PATHS.TELEMETRY + '?tab=project'
      : PATHS.HOME + PATHS.TELEMETRY,
    'data-testid': 'telemetry-link',
    label: 'Telemetry',
    hideLabel: true,
    toolTip: {
      children: 'Telemetry',
    },
  },
  {
    id: 'settings',
    element: 'link',
    icon: 'settings',
    href: location.pathname.includes(PATHS.FILE)
      ? location.pathname + PATHS.SETTINGS + '?tab=project'
      : PATHS.HOME + PATHS.SETTINGS,
    'data-testid': 'settings-link',
    label: 'Settings',
  },
]

export const defaultLocalStatusBarItems: StatusBarItemType[] = [
  {
    id: 'help',
    'data-testid': 'help-button',
    component: HelpMenu,
  },
]
