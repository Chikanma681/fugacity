import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useMachine } from '@xstate/react'

import { useAppState } from '@src/AppState'
import { ActionButton } from '@src/components/ActionButton'
import { ActionButtonDropdown } from '@src/components/ActionButtonDropdown'
import { CompoundsDialog } from '@src/components/CompoundsDialog'
import { CustomIcon } from '@src/components/CustomIcon'
import Tooltip from '@src/components/Tooltip'
import { useNetworkContext } from '@src/hooks/useNetworkContext'
import { NetworkHealthState } from '@src/hooks/useNetworkStatus'
import { filterEscHotkey } from '@src/lib/hotkeyWrapper'
import { isDesktop } from '@src/lib/isDesktop'
import { openExternalBrowserIfDesktop } from '@src/lib/openWindow'
import type {
  ToolbarDropdown,
  ToolbarItem,
  ToolbarItemCallbackProps,
  ToolbarItemResolved,
  ToolbarItemResolvedDropdown,
  ToolbarModeName,
} from '@src/lib/toolbar'
import {
  getToolbarMode,
  isToolbarItemResolvedDropdown,
  useToolbarConfig,
} from '@src/lib/toolbar'
import { EngineConnectionStateType } from '@src/network/utils'
import { COMPOUNDS_STORAGE_KEY, DEFAULT_COMPOUNDS } from '@src/lib/compounds'
import {
  DEFAULT_PROPERTY_PACKAGE_ID,
  simulationMachine,
  type SimulationPropertyPackageId,
} from '@src/machines/simulationMachine'

const PROPERTY_PACKAGE_STORAGE_KEY = 'fugacity-selected-property-package'

function getStoredCompoundIds(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  const rawValue = window.localStorage.getItem(COMPOUNDS_STORAGE_KEY)
  if (!rawValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    return Array.isArray(parsedValue)
      ? parsedValue.filter((value): value is string => typeof value === 'string')
      : []
  } catch {
    return []
  }
}

function getStoredPropertyPackageId(): SimulationPropertyPackageId {
  if (typeof window === 'undefined') {
    return DEFAULT_PROPERTY_PACKAGE_ID
  }

  const rawValue = window.localStorage.getItem(PROPERTY_PACKAGE_STORAGE_KEY)
  switch (rawValue) {
    case 'peng-robinson':
    case 'srk':
    case 'nrtl':
    case 'unifac':
    case 'ideal':
      return rawValue
    default:
      return DEFAULT_PROPERTY_PACKAGE_ID
  }
}

type ToolbarProps = Pick<
  ReturnType<typeof useNetworkContext>,
  'overallState' | 'immediateState'
> &
  Pick<
    ReturnType<typeof useAppState>,
    'isStreamReady' | 'isStreamAcceptingInput'
  >

const Toolbar_ = memo(
  (props: ToolbarProps) => {
    const iconClassName =
      'group-disabled:text-chalkboard-50 !text-inherit dark:group-enabled:group-hover:!text-inherit'
    const bgClassName = '!bg-transparent'
    const buttonBgClassName =
      'bg-chalkboard-transparent dark:bg-transparent disabled:bg-transparent dark:disabled:bg-transparent enabled:hover:bg-chalkboard-10 dark:enabled:hover:bg-chalkboard-100 pressed:!bg-primary pressed:enabled:hover:!text-chalkboard-10'
    const buttonBorderClassName = '!border-transparent'

    const toolbarButtonsRef = useRef<HTMLUListElement>(null)
    const [showRichContent, setShowRichContent] = useState(false)
    const [simulationState, simulationSend] = useMachine(simulationMachine, {
      input: {
        selectedCompoundIds: getStoredCompoundIds(),
        selectedPropertyPackageId: getStoredPropertyPackageId(),
      },
    })
    const openCompoundsDialog = useCallback(() => {
      simulationSend({ type: 'Open compounds dialog' })
    }, [simulationSend])

    useEffect(() => {
      if (typeof window === 'undefined') {
        return
      }

      window.localStorage.setItem(
        COMPOUNDS_STORAGE_KEY,
        JSON.stringify(simulationState.context.selectedCompoundIds)
      )
      window.localStorage.setItem(
        PROPERTY_PACKAGE_STORAGE_KEY,
        simulationState.context.selectedPropertyPackageId
      )
    }, [simulationState.context.selectedCompoundIds, simulationState.context.selectedPropertyPackageId])

    const toolbarConfig = useToolbarConfig({
      openCompoundsDialog,
    })

    const disableAllButtons =
      (props.overallState !== NetworkHealthState.Ok &&
        props.overallState !== NetworkHealthState.Weak) ||
      props.immediateState.type !==
        EngineConnectionStateType.ConnectionEstablished ||
      !props.isStreamReady ||
      !props.isStreamAcceptingInput

    const currentMode: ToolbarModeName = getToolbarMode()

    /** These are the props that will be passed to the callbacks in the toolbar config
     * They are memoized to prevent unnecessary re-renders,
     * but they still get a lot of churn from the state machine
     * so I think there's a lot of room for improvement here
     */
    const configCallbackProps: ToolbarItemCallbackProps = useMemo(
      () => ({
        simulationState,
        simulationSend,
        isActive: false, // Default value - individual items will override this
        openCompoundsDialog,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: blanket-ignored fix me!
      [
        simulationState,
        simulationSend,
        openCompoundsDialog,
      ]
    )

    const tooltipContentClassName = !showRichContent
      ? ''
      : '!text-left text-wrap !text-xs !p-0 !pb-2 flex !max-w-none !w-72 flex-col items-stretch'
    const richContentTimeout = useRef<number | null>(null)
    const richContentClearTimeout = useRef<number | null>(null)
    // On mouse enter, show rich content after a 1s delay
    const handleMouseEnter = useCallback(() => {
      // Cancel the clear timeout if it's already set
      if (richContentClearTimeout.current) {
        clearTimeout(richContentClearTimeout.current)
      }
      // Start our own timeout to show the rich content
      richContentTimeout.current = window.setTimeout(() => {
        setShowRichContent(true)
        if (richContentClearTimeout.current) {
          clearTimeout(richContentClearTimeout.current)
        }
      }, 1000)
    }, [setShowRichContent])
    // On mouse leave, clear the timeout and hide rich content
    const handleMouseLeave = useCallback(() => {
      // Clear the timeout to show rich content
      if (richContentTimeout.current) {
        clearTimeout(richContentTimeout.current)
      }
      // Start a timeout to hide the rich content
      richContentClearTimeout.current = window.setTimeout(() => {
        setShowRichContent(false)
        if (richContentClearTimeout.current) {
          clearTimeout(richContentClearTimeout.current)
        }
      }, 500)
    }, [setShowRichContent])

    /**
     * Resolve all the callbacks and values for the current mode,
     * so we don't need to worry about the other modes
     */
    const currentModeItems: (
      | ToolbarItemResolved
      | ToolbarItemResolvedDropdown
      | 'break'
    )[] = useMemo(() => {
      return toolbarConfig[currentMode].items.map((maybeIconConfig) => {
        if (maybeIconConfig === 'break') {
          return 'break'
        } else if (isToolbarDropdown(maybeIconConfig)) {
          return {
            id: maybeIconConfig.id,
            array: maybeIconConfig.array.map((item) => resolveItemConfig(item)),
          }
        } else {
          return resolveItemConfig(maybeIconConfig)
        }
      })

      function resolveItemConfig(maybeIconConfig: ToolbarItem): ToolbarItemResolved {
        const isConfiguredAvailable = ['available', 'experimental'].includes(
          maybeIconConfig.status
        )
        const itemCallbackProps = {
          ...configCallbackProps,
          isActive: false,
        }
        const itemIsActive = maybeIconConfig.isActive?.(itemCallbackProps) || false
        const isDisabled = disableAllButtons || !isConfiguredAvailable || maybeIconConfig.disabled === true

        const resolvedCallbackProps = {
          ...configCallbackProps,
          isActive: itemIsActive,
        }

        return {
          ...maybeIconConfig,
          title:
            typeof maybeIconConfig.title === 'string'
              ? maybeIconConfig.title
              : maybeIconConfig.title(resolvedCallbackProps),
          description: maybeIconConfig.description,
          links: maybeIconConfig.links || [],
          isActive: itemIsActive,
          hotkey: maybeIconConfig.hotkey,
          disabled: isDisabled,
          disabledReason: maybeIconConfig.disabledReason,
          disableHotkey: maybeIconConfig.disableHotkey,
          status: maybeIconConfig.status,
          callbackProps: resolvedCallbackProps,
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: blanket-ignored fix me!
    }, [currentMode, disableAllButtons, configCallbackProps])

    // To remember the last selected item in an ActionButtonDropdown
    const [lastSelectedMultiActionItem, _] = useState(
      new Map<
        number /* index in currentModeItems */,
        number /* index in maybeIconConfig */
      >()
    )

    return (
      <menu
        data-current-mode={currentMode}
        data-testid="toolbar"
        data-onboarding-id="toolbar"
        className="toolbar z-[19] max-w-full whitespace-nowrap px-2 py-1 mx-auto bg-chalkboard-10 dark:bg-chalkboard-90 relative border border-chalkboard-30 dark:border-chalkboard-80 border-t-0 shadow-sm"
      >
        <ul
          ref={toolbarButtonsRef}
          className={
            'has-[[aria-expanded=true]]:!pointer-events-none m-0 py-1 rounded-l-sm flex flex-wrap gap-1.5 items-center '
          }
        >
          {/* A menu item will either be a vertical line break, a button with a dropdown, or a single button */}
          {currentModeItems.map((maybeIconConfig, i) => {
            // Vertical Line Break
            if (maybeIconConfig === 'break') {
              return (
                <div
                  key={'break-' + i}
                  className="h-5 w-[1px] block bg-chalkboard-30 dark:bg-chalkboard-80"
                />
              )
            } else if (isToolbarItemResolvedDropdown(maybeIconConfig)) {
              // A button with a dropdown
              const selectedIcon =
                maybeIconConfig.array.find((c) => c.isActive) ||
                maybeIconConfig.array[lastSelectedMultiActionItem.get(i) ?? 0]

              // Save the last selected item in the dropdown
              lastSelectedMultiActionItem.set(
                i,
                maybeIconConfig.array.indexOf(selectedIcon)
              )
              return (
                <ActionButtonDropdown
                  Element="button"
                  key={selectedIcon.id}
                  data-testid={selectedIcon.id + '-dropdown'}
                  data-onboarding-id={selectedIcon.id + '-dropdown'}
                  id={selectedIcon.id + '-dropdown'}
                  name={maybeIconConfig.id}
                  className={
                    (maybeIconConfig.array[0].alwaysDark
                      ? 'dark bg-chalkboard-90 '
                      : '!bg-transparent ') +
                    'group/wrapper ' +
                    buttonBorderClassName +
                    ' relative group !gap-0'
                  }
                  splitMenuItems={maybeIconConfig.array.map((itemConfig) => ({
                    id: itemConfig.id,
                    label: itemConfig.title,
                    hotkey: itemConfig.hotkey,
                    onClick: () => itemConfig.onClick(itemConfig.callbackProps),
                    disabled:
                      disableAllButtons ||
                      !['available', 'experimental'].includes(
                        itemConfig.status
                      ) ||
                      itemConfig.disabled === true ||
                      itemConfig.disableHotkey === true,
                    status: itemConfig.status,
                  }))}
                >
                  <div
                    className="contents"
                    // Mouse events do not fire on disabled buttons
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <ActionButton
                      Element="button"
                      id={selectedIcon.id}
                      data-testid={selectedIcon.id}
                      data-onboarding-id={selectedIcon.id}
                      iconStart={{
                        icon: selectedIcon.icon,
                        iconColor: selectedIcon.iconColor,
                        className: iconClassName,
                        bgClassName: bgClassName,
                      }}
                      className={
                        '!border-transparent !px-0 pressed:!text-chalkboard-10 pressed:enabled:hovered:!text-chalkboard-10 ' +
                        buttonBgClassName
                      }
                      aria-pressed={selectedIcon.isActive}
                      disabled={
                        disableAllButtons ||
                        !['available', 'experimental'].includes(
                          selectedIcon.status
                        ) ||
                        selectedIcon.disabled
                      }
                      name={selectedIcon.title}
                      // aria-description is still in ARIA 1.3 draft.

                      aria-description={selectedIcon.description}
                      onClick={() =>
                        selectedIcon.onClick(selectedIcon.callbackProps)
                      }
                    >
                      <span
                        className={!selectedIcon.showTitle ? 'sr-only' : ''}
                      >
                        {selectedIcon.title}
                      </span>
                      <ToolbarItemTooltip
                        itemConfig={selectedIcon}
                        configCallbackProps={configCallbackProps}
                        wrapperClassName="ui-open:!hidden"
                        contentClassName={tooltipContentClassName}
                      >
                        {showRichContent ? (
                          <ToolbarItemTooltipRichContent itemConfig={selectedIcon} />
                        ) : (
                          <ToolbarItemTooltipShortContent
                            status={selectedIcon.status}
                            title={selectedIcon.title}
                            hotkey={selectedIcon.hotkey}
                          />
                        )}
                      </ToolbarItemTooltip>
                    </ActionButton>
                  </div>
                </ActionButtonDropdown>
              )
            }
            const itemConfig = maybeIconConfig

            // A single button
            return (
              <div
                className={`relative ${itemConfig.alwaysDark ? ' dark bg-chalkboard-90 ' : ''}`}
                key={itemConfig.id}
                // Mouse events do not fire on disabled buttons
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <ActionButton
                  Element="button"
                  key={itemConfig.id}
                  id={itemConfig.id}
                  data-testid={itemConfig.id}
                  data-onboarding-id={itemConfig.id}
                  iconStart={{
                    icon: itemConfig.icon,
                    iconColor: itemConfig.iconColor,
                    className: iconClassName,
                    bgClassName: bgClassName,
                  }}
                  className={
                    'pressed:!text-chalkboard-10 pressed:enabled:hovered:!text-chalkboard-10 ' +
                    buttonBorderClassName +
                    ' ' +
                    buttonBgClassName +
                    (!itemConfig.showTitle ? ' !px-0' : '')
                  }
                  name={itemConfig.title}
                  // aria-description is still in ARIA 1.3 draft.

                  aria-description={itemConfig.description}
                  aria-pressed={itemConfig.isActive}
                  disabled={
                    disableAllButtons ||
                    !['available', 'experimental'].includes(
                      itemConfig.status
                    ) ||
                    itemConfig.disabled
                  }
                  onClick={() => itemConfig.onClick(itemConfig.callbackProps)}
                >
                  <span className={!itemConfig.showTitle ? 'sr-only' : ''}>
                    {itemConfig.title}
                  </span>
                </ActionButton>
                <ToolbarItemTooltip
                  itemConfig={itemConfig}
                  configCallbackProps={configCallbackProps}
                  contentClassName={tooltipContentClassName}
                >
                  {showRichContent ? (
                    <ToolbarItemTooltipRichContent itemConfig={itemConfig} />
                  ) : (
                    <ToolbarItemTooltipShortContent
                      status={itemConfig.status}
                      title={itemConfig.title}
                      hotkey={itemConfig.hotkey}
                    />
                  )}
                </ToolbarItemTooltip>
              </div>
            )
          })}
        </ul>
        <CompoundsDialog
          isOpen={simulationState.matches('compoundsDialogOpen')}
          selectedCompoundIds={simulationState.context.selectedCompoundIds}
          compounds={DEFAULT_COMPOUNDS}
          onClose={() => simulationSend({ type: 'Close compounds dialog' })}
          onSave={(compoundIds) => {
            simulationSend({ type: 'Save compounds', compoundIds })
          }}
        />
      </menu>
    )
  },
  (oldP, newP) =>
    oldP.overallState === newP.overallState &&
    oldP.immediateState?.type === newP.immediateState?.type &&
    oldP.isStreamReady === newP.isStreamReady &&
    oldP.isStreamAcceptingInput === newP.isStreamAcceptingInput
)

interface ToolbarItemContentsProps extends React.PropsWithChildren {
  itemConfig: ToolbarItemResolved
  configCallbackProps: ToolbarItemCallbackProps
  wrapperClassName?: string
  contentClassName?: string
}
/**
 * The single button and dropdown button share content, so we extract it here
 * It contains a tooltip with the title, description, and links
 * and a hotkey listener
 */
const ToolbarItemTooltip = memo(function ToolbarItemContents({
  itemConfig,
  configCallbackProps,
  wrapperClassName = '',
  contentClassName = '',
  children,
}: ToolbarItemContentsProps) {
  /**
   * GOTCHA: `useHotkeys` can only register one hotkey listener per component.
   * TODO: make a global hotkey registration system. make them editable.
   */
  useHotkeys(
    itemConfig.hotkey || '',
    () => {
      itemConfig.onClick(itemConfig.callbackProps)
    },
    {
      enabled:
        ['available', 'experimental'].includes(itemConfig.status) &&
        !!itemConfig.hotkey &&
        !itemConfig.disabled &&
        !itemConfig.disableHotkey,
    }
  )

  const onDesktop = isDesktop()
  const wrapperStyle = useMemo(
    () =>
      onDesktop
        ? // Without this, the tooltip disappears before being able to click on anything in it
          ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties)
        : {},
    [onDesktop]
  )

  return (
    <Tooltip
      inert={false}
      wrapperStyle={wrapperStyle}
      hoverOnly
      position="bottom"
      wrapperClassName={'!p-4 !pointer-events-auto ' + wrapperClassName}
      contentClassName={contentClassName}
    >
      {children}
    </Tooltip>
  )
})

const ToolbarItemTooltipShortContent = ({
  status,
  title,
  hotkey,
}: {
  status: string
  title: string
  hotkey?: string | string[]
}) => (
  <div
    className={`text-sm flex flex-col ${
      !['available', 'experimental'].includes(status)
        ? 'text-chalkboard-70 dark:text-chalkboard-40'
        : ''
    }`}
  >
    {status === 'experimental' && (
      <div className="text-xs flex justify-center item-center gap-1 pb-1 border-b border-chalkboard-50">
        <CustomIcon name="beaker" className="w-4 h-4" />
        <span>Experimental</span>
      </div>
    )}
    <div className={`flex gap-4 ${status === 'experimental' ? 'pt-1' : 'p-0'}`}>
      {title}
      {hotkey && (
        <kbd className="inline-block ml-2 flex-none hotkey">
          {filterEscHotkey(hotkey)}
        </kbd>
      )}
    </div>
  </div>
)

const ToolbarItemTooltipRichContent = memo(
  ({ itemConfig }: { itemConfig: ToolbarItemResolved }) => {
    const shouldBeEnabled = ['available', 'experimental'].includes(
      itemConfig.status
    )
    return (
      <>
        {itemConfig.status === 'experimental' && (
          <div className="text-xs flex items-center justify-center self-stretch gap-1 p-1 border-b">
            <CustomIcon name="beaker" className="w-4 h-4" />
            <span className="block">Experimental</span>
          </div>
        )}
        <div className="rounded-top flex items-center gap-2 pt-3 pb-2 px-2 bg-chalkboard-20/50 dark:bg-chalkboard-80/50">
          {itemConfig.icon && (
            <CustomIcon
              className="w-5 h-5"
              style={{ color: itemConfig.iconColor }}
              name={itemConfig.icon}
            />
          )}
          <div
            className={`text-sm flex-1 flex flex-col gap-1 ${
              !shouldBeEnabled
                ? 'text-chalkboard-70 dark:text-chalkboard-40'
                : ''
            }`}
          >
            {itemConfig.title}
          </div>
          {shouldBeEnabled && itemConfig.hotkey ? (
            <kbd className="flex-none hotkey">
              {filterEscHotkey(itemConfig.hotkey)}
            </kbd>
          ) : (
            itemConfig.status === 'unavailable' && (
              <>
                <span className="text-wrap font-sans flex-0 text-chalkboard-70 dark:text-chalkboard-40">
                  In development
                </span>
                <CustomIcon
                  name="lockClosed"
                  className="w-5 h-5 text-chalkboard-70 dark:text-chalkboard-40"
                />
              </>
            )
          )}
        </div>
        <p className="px-2 my-2 text-ch font-sans">{itemConfig.description}</p>
        {itemConfig.extraNote && (
          <p className="px-2 my-2 text-ch font-sans">
            <span className="font-semibold">Note: </span>
            {itemConfig.extraNote}
          </p>
        )}
        {/* Add disabled reason if item is disabled */}
        {itemConfig.disabled && itemConfig.disabledReason && (
          <>
            <hr className="border-chalkboard-20 dark:border-chalkboard-80" />
            <p className="px-2 my-2 text-ch font-sans text-chalkboard-70 dark:text-chalkboard-40">
              {itemConfig.disabledReason}
            </p>
          </>
        )}
        {itemConfig.links.length > 0 && (
          <>
            <hr className="border-chalkboard-20 dark:border-chalkboard-80" />
            <ul className="p-0 px-1 m-0 flex flex-col">
              {itemConfig.links.map((link) => (
                <li key={link.label} className="contents">
                  <a
                    href={link.url}
                    onClick={openExternalBrowserIfDesktop(link.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center rounded-sm p-1 no-underline text-inherit hover:bg-primary/10 hover:text-primary dark:hover:bg-chalkboard-70 dark:hover:text-inherit"
                  >
                    <span className="flex-1">Open {link.label}</span>
                    <CustomIcon name="link" className="w-4 h-4" />
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </>
    )
  },
  (oldP, newP) => oldP.itemConfig === newP.itemConfig
)

// Making this toplevel Toolbar memo'd is no-op, because we use context
// inside that causes a render anyway. Instead we memo the inner.
export function Toolbar() {
  const { overallState, immediateState } = useNetworkContext()
  const { isStreamReady, isStreamAcceptingInput } = useAppState()

  return (
    <Toolbar_
      overallState={overallState}
      immediateState={immediateState}
      isStreamReady={isStreamReady}
      isStreamAcceptingInput={isStreamAcceptingInput}
    />
  )
}

function isToolbarDropdown(
  item: ToolbarItem | ToolbarDropdown
): item is ToolbarDropdown {
  return 'array' in item
}
