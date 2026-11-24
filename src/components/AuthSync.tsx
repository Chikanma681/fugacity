import { useEffect } from 'react'

import { accessToken } from '@src/lib/accessToken'
import { useWorkOSAuth } from '@src/lib/auth'
import { useApp } from '@src/lib/boot'
import { reportRejection } from '@src/lib/trap'
import { isAuthBypassed } from '@src/machines/authMachine'

/** Mirrors the WorkOS session into the app's auth machine. */
export function AuthSync() {
  const { auth } = useApp()
  const workos = useWorkOSAuth()
  const isLoggingOut = auth.useAuthState().matches('loggingOut')

  // biome-ignore lint/correctness/useExhaustiveDependencies: workos is rebuilt every render; the session only changes with the user.
  useEffect(() => {
    if (isAuthBypassed() || workos.isLoading) {
      return
    }
    const user = workos.user
    if (!user) {
      accessToken.setSource(null)
      auth.send({ type: 'Signed out' })
      return
    }
    accessToken.setSource(workos.getAccessToken)
    workos
      .getAccessToken()
      .then((token) =>
        auth.send({ type: 'Signed in', user, token: token ?? '' })
      )
      .catch(reportRejection)
  }, [workos.isLoading, workos.user?.id])

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only entering the loggingOut state triggers a WorkOS sign out.
  useEffect(() => {
    if (!isLoggingOut) {
      return
    }
    if (isAuthBypassed()) {
      auth.send({ type: 'Log out failed' })
      return
    }
    workos.signOut().catch((error) => {
      reportRejection(error)
      auth.send({ type: 'Log out failed' })
    })
  }, [isLoggingOut])

  return null
}
