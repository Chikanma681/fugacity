import { useAuth } from '@workos-inc/authkit-react'
import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'

import Loading from '@src/components/Loading'
import { PATHS } from '@src/lib/paths'
import { reportRejection } from '@src/lib/trap'

/**
 * WorkOS "Initiate login URI" route. Starts AuthKit sign-in immediately,
 * e.g. when arriving from a password-reset email or invitation.
 */
export function WorkOSLogin() {
  const { isLoading, signIn } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      signIn().catch(reportRejection)
    }
  }, [isLoading, signIn])

  return (
    <div className="absolute inset-0 grid place-content-center">
      <Loading>Redirecting to sign in...</Loading>
    </div>
  )
}

/**
 * Redirect destination registered with WorkOS. AuthKitProvider (mounted in
 * src/index.tsx) exchanges the code; once it finishes we send the user home.
 */
export function WorkOSCallback() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="absolute inset-0 grid place-content-center">
        <Loading>Signing in...</Loading>
      </div>
    )
  }

  return <Navigate to={PATHS.INDEX} replace />
}
