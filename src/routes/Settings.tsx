import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { AllKeybindingsFields } from '@src/components/Settings/AllKeybindingsFields'
import { AllSettingsFields } from '@src/components/Settings/AllSettingsFields'
import { KeybindingsSectionsList } from '@src/components/Settings/KeybindingsSectionsList'
import { SettingsDialog } from '@src/components/Settings/SettingsDialog'
import { SettingsSearchBar } from '@src/components/Settings/SettingsSearchBar'
import { SettingsSectionsList } from '@src/components/Settings/SettingsSectionsList'
import { SettingsTabs } from '@src/components/Settings/SettingsTabs'
import { PATHS } from '@src/lib/paths'
import type { SettingsLevel } from '@src/lib/settings/settingsTypes'

export const Settings = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const close = () => {
    // This makes sure input texts are saved before closing the dialog (eg. default project name).
    if (document.activeElement instanceof HTMLInputElement) {
      document.activeElement.blur()
    }
    void navigate(location.pathname.replace(PATHS.SETTINGS, ''))
  }
  const location = useLocation()
  const isFileSettings = location.pathname.includes(PATHS.FILE)
  const searchParamTab =
    (searchParams.get('tab') as SettingsLevel | 'keybindings') ??
    (isFileSettings ? 'project' : 'user')

  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to the hash on load if it exists
  useEffect(() => {
    console.log('hash', location.hash)
    if (location.hash) {
      setTimeout(() => {
        // GOTCHA: Next tick required, you can instantly navigate to a path and this code will find a null element and not scroll into view.
        const element = document.getElementById(location.hash.slice(1))
        if (element) {
          element.scrollIntoView({ block: 'center', behavior: 'smooth' })
          ;(
            element.querySelector('input, select, textarea') as HTMLInputElement
          )?.focus()
        }
      }, 0)
    }
  }, [location.hash])

  return (
    <SettingsDialog
      title="Settings"
      onClose={close}
      headerActions={<SettingsSearchBar />}
      tabs={
        <SettingsTabs
          value={searchParamTab}
          onChange={(v) => setSearchParams((p) => ({ ...p, tab: v }))}
          showProjectTab={isFileSettings}
        />
      }
    >
      <div
        className="flex-1 grid items-stretch pl-4 pr-5 pb-5 gap-2 overflow-hidden"
        style={{
          gridTemplateColumns: 'auto 1fr',
          gridTemplateRows: '1fr',
        }}
      >
        {searchParamTab !== 'keybindings' ? (
          <>
            <SettingsSectionsList
              searchParamTab={searchParamTab}
              scrollRef={scrollRef}
            />
            <AllSettingsFields
              searchParamTab={searchParamTab}
              isFileSettings={isFileSettings}
              ref={scrollRef}
            />
          </>
        ) : (
          <>
            <KeybindingsSectionsList scrollRef={scrollRef} />
            <AllKeybindingsFields ref={scrollRef} />
          </>
        )}
      </div>
    </SettingsDialog>
  )
}
