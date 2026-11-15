import {
  AuthKitProvider as DesktopAuthKitProvider,
  useAuth as useDesktopAuth,
} from '@workos/authkit-electron/react'
import {
  AuthKitProvider as WebAuthKitProvider,
  useAuth as useWebAuth,
} from '@workos-inc/authkit-react'
import type { PropsWithChildren } from 'react'

import { WORKOS_CLIENT_ID, WORKOS_REDIRECT_URI } from '@src/lib/workos'

export interface AppUser {
  id: string
  email: string
  name: string
  imageUrl?: string
}

export interface WorkOSAuth {
  isLoading: boolean
  user: AppUser | null
  getAccessToken: () => Promise<string | null>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

interface WorkOSUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  profilePictureUrl: string | null
}

function toAppUser(user: WorkOSUser | null): AppUser | null {
  if (!user) {
    return null
  }
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
  return {
    id: user.id,
    email: user.email,
    name: name || user.email,
    imageUrl: user.profilePictureUrl ?? undefined,
  }
}

function useDesktopWorkOSAuth(): WorkOSAuth {
  const auth = useDesktopAuth()
  return {
    isLoading: auth.isLoading,
    user: toAppUser(auth.user),
    getAccessToken: auth.getAccessToken,
    signIn: () => auth.signIn(),
    signOut: () => auth.signOut(),
  }
}

function useWebWorkOSAuth(): WorkOSAuth {
  const auth = useWebAuth()
  return {
    isLoading: auth.isLoading,
    user: toAppUser(auth.user),
    getAccessToken: auth.getAccessToken,
    signIn: () => auth.signIn(),
    signOut: async () => auth.signOut(),
  }
}

function DesktopWorkOSProvider({ children }: PropsWithChildren) {
  return <DesktopAuthKitProvider>{children}</DesktopAuthKitProvider>
}

function WebWorkOSProvider({ children }: PropsWithChildren) {
  return (
    <WebAuthKitProvider
      clientId={WORKOS_CLIENT_ID}
      redirectUri={WORKOS_REDIRECT_URI}
    >
      {children}
    </WebAuthKitProvider>
  )
}

const isDesktopRuntime = typeof window !== 'undefined' && !!window.electron

export const useWorkOSAuth = isDesktopRuntime
  ? useDesktopWorkOSAuth
  : useWebWorkOSAuth

export const WorkOSProvider = isDesktopRuntime
  ? DesktopWorkOSProvider
  : WebWorkOSProvider
