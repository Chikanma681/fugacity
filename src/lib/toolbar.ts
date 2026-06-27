import type { EventFrom, StateFrom } from 'xstate'

import type { CustomIconName } from '@src/components/CustomIcon'
import { simulationMachine } from '@src/machines/simulationMachine'

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
}: {
  openCompoundsDialog?: () => void
} = {}): ToolbarConfig => ({
  items: [
    {
      id: 'property-packages',
      array: [
        {
          id: 'property-package-peng-robinson',
          onClick: ({ simulationSend }) =>
            simulationSend({
              type: 'Select property package',
              propertyPackageId: 'peng-robinson',
            }),
          icon: 'beaker',
          status: 'available',
          title: ({ simulationState }) =>
            simulationState.context.selectedPropertyPackageId === 'peng-robinson'
              ? 'Peng-Robinson (Selected)'
              : 'Peng-Robinson',
          showTitle: true,
          description:
            'Cubic equation of state commonly used for hydrocarbons and high-pressure vapor-liquid equilibrium.',
          links: [],
          isActive: ({ simulationState }) =>
            simulationState.context.selectedPropertyPackageId === 'peng-robinson',
        },
        {
          id: 'property-package-srk',
          onClick: ({ simulationSend }) =>
            simulationSend({
              type: 'Select property package',
              propertyPackageId: 'srk',
            }),
          icon: 'beaker',
          status: 'available',
          title: ({ simulationState }) =>
            simulationState.context.selectedPropertyPackageId === 'srk'
              ? 'Soave-Redlich-Kwong (Selected)'
              : 'Soave-Redlich-Kwong',
          showTitle: true,
          description:
            'Cubic equation of state often used for gas processing and light hydrocarbon systems.',
          links: [],
          isActive: ({ simulationState }) =>
            simulationState.context.selectedPropertyPackageId === 'srk',
        },
        {
          id: 'property-package-nrtl',
          onClick: ({ simulationSend }) =>
            simulationSend({
              type: 'Select property package',
              propertyPackageId: 'nrtl',
            }),
          icon: 'beaker',
          status: 'available',
          title: ({ simulationState }) =>
            simulationState.context.selectedPropertyPackageId === 'nrtl'
              ? 'NRTL (Selected)'
              : 'NRTL',
          showTitle: true,
          description:
            'Activity-coefficient model suited to strongly non-ideal liquid mixtures.',
          links: [],
          isActive: ({ simulationState }) =>
            simulationState.context.selectedPropertyPackageId === 'nrtl',
        },
        {
          id: 'property-package-unifac',
          onClick: ({ simulationSend }) =>
            simulationSend({
              type: 'Select property package',
              propertyPackageId: 'unifac',
            }),
          icon: 'beaker',
          status: 'available',
          title: ({ simulationState }) =>
            simulationState.context.selectedPropertyPackageId === 'unifac'
              ? 'UNIFAC (Selected)'
              : 'UNIFAC',
          showTitle: true,
          description:
            'Group-contribution activity-coefficient model for estimating non-ideal liquid behavior.',
          links: [],
          isActive: ({ simulationState }) =>
            simulationState.context.selectedPropertyPackageId === 'unifac',
        },
        {
          id: 'property-package-ideal',
          onClick: ({ simulationSend }) =>
            simulationSend({
              type: 'Select property package',
              propertyPackageId: 'ideal',
            }),
          icon: 'beaker',
          status: 'available',
          title: ({ simulationState }) =>
            simulationState.context.selectedPropertyPackageId === 'ideal'
              ? 'Ideal (Selected)'
              : 'Ideal',
          showTitle: true,
          description:
            'Ideal-mixture approximation for simple cases and baseline studies.',
          links: [],
          isActive: ({ simulationState }) =>
            simulationState.context.selectedPropertyPackageId === 'ideal',
        },
      ],
    },
    {
      id: 'compounds',
      onClick: () => openCompoundsDialog(),
      icon: 'beaker',
      status: 'available',
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
