import type { CSSProperties } from 'react'

import { ActionButton } from '@src/components/ActionButton'
import { CustomIcon } from '@src/components/CustomIcon'
import { Logo } from '@src/components/Logo'
import { useWorkOSAuth } from '@src/lib/auth'
import { APP_NAME } from '@src/lib/constants'
import { isDesktop } from '@src/lib/isDesktop'
import { reportRejection } from '@src/lib/trap'
import { APP_VERSION } from '@src/routes/utils'

const subtleBorder =
  'border border-solid border-chalkboard-30 dark:border-chalkboard-80'
const cardArea = `${subtleBorder} rounded-lg px-6 py-3 text-chalkboard-70 dark:text-chalkboard-30`
const actionButtonClassName =
  '!bg-primary !text-chalkboard-10 !border-transarent'

const simulationCapabilities = [
  'Steady-state flowsheets',
  'Material and energy balances',
  'PT, PH and PS flash calculations',
  'Equations of state and activity models',
  'ChemSep, DWSIM and ChEDL compound databases',
]

const SignIn = () => {
  const workos = useWorkOSAuth()
  // Only create the native file menus on desktop
  if (window.electron) {
    window.electron.createFallbackMenu().catch(reportRejection)
    // Disable these since they cannot be accessed within the sign in page.
    window.electron
      .disableMenu('Help.Replay onboarding tutorial')
      .catch(reportRejection)
    window.electron.disableMenu('Help.Show all commands').catch(reportRejection)
  }

  return (
    <main
      className="bg-primary h-screen grid place-items-stretch m-0 p-2"
      style={
        isDesktop()
          ? ({
              WebkitAppRegion: 'drag',
            } as CSSProperties)
          : {}
      }
    >
      <div
        style={
          isDesktop() ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : {}
        }
        className="body-bg py-16 md:py-5 px-4 md:px-12 rounded-lg grid place-items-center overflow-y-auto"
      >
        <div className="max-w-7xl flex flex-col md:grid gap-5 grid-cols-3 xl:grid-cols-4 xl:grid-rows-5">
          <div className="md:col-span-2 xl:col-span-3 xl:row-span-3 max-w-3xl mr-8 mb-8">
            <div className="flex flex-row items-baseline mb-8">
              <Logo className="text-primary h-8 md:h-10 lg:h-12 xl:h-16 relative translate-y-1 mr-4 lg:mr-6 xl:mr-8" />
              <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
                {APP_NAME}
              </h1>
              {isDesktop() && (
                <span className="px-2 md:px-3 py-1 text-xs md:text-base rounded-full bg-primary/10 text-primary self-start">
                  v{APP_VERSION}
                </span>
              )}
            </div>
            <p className="my-4 text-lg xl:text-xl">
              {APP_NAME} is an agentic process simulator for chemical engineers.
              Build flowsheets, pick compounds and property packages, and run
              rigorous thermodynamic calculations powered by DWSIM. Describe
              what you want to simulate and let the agent help you set up
              streams, unit operations and specifications.
            </p>
            {!isDesktop() && (
              <div className="flex md:hidden flex-col gap-2">
                <p className="text-base text-primary">
                  Flowsheeting is best done on a larger screen. Please visit on
                  a desktop or laptop for the full experience. We are working on releasing a version of Fugacity for the web.
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => workos.signIn().catch(reportRejection)}
              disabled={workos.isLoading}
              className={
                'm-0 mt-8 w-fit flex gap-4 items-center px-3 py-1 ' +
                '!border-transparent !text-lg !text-chalkboard-10 !bg-primary hover:hue-rotate-15'
              }
              data-testid="sign-in-button"
            >
              Sign in to start simulating
              <CustomIcon name="arrowShortRight" className="w-6 h-6" />
            </button>
          </div>
          <div
            className={`${cardArea} xl:h-full xl:row-span-full md:col-start--1 xl:col-start-4 flex flex-col justify-center`}
          >
            <h2 className="text-xl xl:text-2xl">What you can simulate</h2>
            <ul className="text-sm my-4 flex flex-col gap-3 list-disc pl-4">
              {simulationCapabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          </div>
          <div className="self-end h-min md:col-span-3 xl:row-span-2 flex flex-col md:grid grid-cols-2 gap-5">
            <div className={cardArea}>
              <h2 className="text-xl xl:text-2xl">Built in the open</h2>
              <p className="text-xs my-4">
                {APP_NAME} is open source and licensed under the GPL. Read the
                code, report issues and help shape the simulator.
              </p>
              <div className="flex gap-4 flex-wrap items-center">
                <ActionButton
                  Element="externalLink"
                  to="https://github.com/Chikanma681/fugacity"
                  iconStart={{ icon: 'code', bgClassName: '!bg-transparent' }}
                  className={actionButtonClassName}
                >
                  <span className="py-2 lg:py-0">Read our source code</span>
                </ActionButton>
              </div>
            </div>
            <div className={cardArea}>
              <h2 className="text-xl xl:text-2xl">
                Thermodynamics you can trust
              </h2>
              <p className="text-xs my-4">
                Property packages, compound data and flash algorithms come
                straight from DWSIM, a proven open-source chemical process
                simulator.
              </p>
              <div className="flex gap-4 flex-wrap items-center">
                <ActionButton
                  Element="externalLink"
                  to="https://github.com/DanWBR/dwsim"
                  iconStart={{
                    icon: 'settings',
                    bgClassName: '!bg-transparent',
                  }}
                  className={actionButtonClassName}
                >
                  <span className="py-2 lg:py-0">Explore DWSIM</span>
                </ActionButton>
              </div>
            </div>
            <div className={cardArea + ' col-span-2'}>
              <h2 className="text-xl xl:text-2xl">
                An agent that speaks chemical engineering
              </h2>
              <p className="text-xs my-4">
                Ask for a distillation train, a reactor loop or a heat exchanger
                network in plain language. The agent drafts the flowsheet,
                chooses sensible property packages and explains its assumptions,
                while you stay in control of every specification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default SignIn
