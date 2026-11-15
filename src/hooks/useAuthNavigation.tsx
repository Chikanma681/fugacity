import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useWorkOSAuth } from '@src/lib/auth'
import { IMMEDIATE_SIGN_IN_IF_NECESSARY_QUERY_PARAM } from '@src/lib/constants'
import { PATHS } from '@src/lib/paths'
import { reportRejection } from '@src/lib/trap'
import { WORKOS_CALLBACK_PATH } from '@src/lib/workos'
import { useApp } from '@src/lib/boot'
import { isAuthBypassed } from '@src/machines/authMachine'

/**
 * A simple hook that listens to the auth state of the app and navigates
 * accordingly.
 */
export function useAuthNavigation() {
  const { auth } = useApp()
  const workos = useWorkOSAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const authState = auth.useAuthState()
  const [searchParams] = useSearchParams()
  const requestingImmediateSignInIfNecessary = searchParams.has(
    IMMEDIATE_SIGN_IN_IF_NECESSARY_QUERY_PARAM
  )

  useEffect(() => {
    // WorkOS AuthKit's sign-in and redirect routes must stay public.
    if (
      location.pathname === PATHS.LOGIN ||
      (WORKOS_CALLBACK_PATH !== PATHS.INDEX &&
        location.pathname === WORKOS_CALLBACK_PATH)
    ) {
      return
    }

    if (isAuthBypassed()) {
      if (location.pathname.includes(PATHS.SIGN_IN)) {
        void navigate(PATHS.INDEX)
      }
      return
    }

    if (
      authState.matches('loggedIn') &&
      location.pathname.includes(PATHS.SIGN_IN)
    ) {
      void navigate(PATHS.INDEX)
    } else if (
      authState.matches('loggedOut') &&
      !location.pathname.includes(PATHS.SIGN_IN)
    ) {
      if (requestingImmediateSignInIfNecessary) {
        workos.signIn().catch(reportRejection)
        return
      }

      void navigate(PATHS.SIGN_IN + (location.search || ''))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: blanket-ignored fix me!
  }, [authState, location.pathname])
}
