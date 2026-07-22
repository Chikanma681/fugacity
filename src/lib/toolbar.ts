import type { EventFrom, StateFrom } from 'xstate'

import type { CustomIconName } from '@src/components/CustomIcon'
import type { PropertyPackageOption } from '@src/lib/thermo'
import type { simulationMachine } from '@src/machines/simulationMachine'

export type ToolbarItem = {
  id: string
  onClick: (props: ToolbarItemCallbackProps) => void
  icon?: CustomIconName
  iconColor?: string
  alwaysDark?: true
  status: 'available' | 'unavailable' | 'experimental'
  disabled?: boolean
  disableHotkey?: boolean
  title: string | ((props: ToolbarItemCallbackProps) => string)
  showTitle?: boolean
  hotkey?: string | string[]
  description: string
  extraNote?: string
  links: { label: string; url: string }[]
  isActive?: (props: ToolbarItemCallbackProps) => boolean
  disabledReason?: string
}

export type ToolbarDropdown = {
  id: string
  array: ToolbarItem[]
}

export type ToolbarConfigItem = ToolbarItem | ToolbarDropdown | 'break'

export type ToolbarConfig = {
  items: ToolbarConfigItem[]
}

export interface ToolbarItemCallbackProps {
  simulationState: StateFrom<typeof simulationMachine>
  simulationSend: (event: EventFrom<typeof simulationMachine>) => void
  isActive: boolean
}

export const useToolbarConfig = ({
  openCompoundsDialog = () => { },
  propertyPackages = [],
  thermoUnavailableReason = null,
}: {
  openCompoundsDialog?: () => void
  propertyPackages?: PropertyPackageOption[]
  thermoUnavailableReason?: string | null
} = {}): ToolbarConfig => ({
  items: [
    {
      id: 'property-packages',
      array:
        propertyPackages.length > 0
          ? propertyPackages.map((propertyPackage) => ({
              id: `property-package-${propertyPackage.id}`,
              onClick: ({ simulationSend }) =>
                simulationSend({
                  type: 'Select property package',
                  propertyPackageId: propertyPackage.id,
                }),
              icon: 'beaker',
              status: 'available',
              title: ({ simulationState }) =>
                simulationState.context.selectedPropertyPackageId === propertyPackage.id
                  ? `${propertyPackage.name} (Selected)`
                  : propertyPackage.name,
              showTitle: true,
              description: propertyPackage.description,
              links: [],
              isActive: ({ simulationState }) =>
                simulationState.context.selectedPropertyPackageId === propertyPackage.id,
            }))
          : [
              {
                id: 'property-packages-unavailable',
                onClick: () => {},
                icon: 'beaker',
                status: 'unavailable',
                disabled: true,
                disabledReason:
                  thermoUnavailableReason || 'DWSIM property packages are unavailable.',
                title: 'Property packages unavailable',
                showTitle: true,
                description:
                  thermoUnavailableReason || 'DWSIM property packages are unavailable.',
                links: [],
              },
            ],
    },
    {
      id: 'compounds',
      onClick: () => openCompoundsDialog(),
      icon: 'beaker',
      status: thermoUnavailableReason ? 'unavailable' : 'available',
      disabled: !!thermoUnavailableReason,
      disabledReason: thermoUnavailableReason || undefined,
      title: ({ simulationState }) =>
        simulationState.context.selectedCompoundIds.length > 0
          ? `Compounds (${simulationState.context.selectedCompoundIds.length})`
          : 'Compounds',
      showTitle: true,
      description:
        'Select the compounds available to the current process simulation.',
      links: [],
    },
  ],
})
