import { assign, setup } from 'xstate'

import env from '@src/env'
import type { AppUser } from '@src/lib/auth'
import { markOnce } from '@src/lib/performance'

export interface UserContext {
  user?: AppUser
  token: string
}

export type Events =
  | { type: 'Signed in'; user: AppUser; token: string }
  | { type: 'Signed out' }
  | { type: 'Log out' }
  | { type: 'Log out failed' }

export const isAuthBypassed = () => env().VITE_ZOO_API_TOKEN === 'localhost'

export const authMachine = setup({
  types: {} as {
    context: UserContext
    events: Events
  },
  actions: {
    assignSession: assign(({ event }) => {
      if (event.type !== 'Signed in') {
        return {}
      }
      return { user: event.user, token: event.token }
    }),
    clearSession: assign({ user: undefined, token: '' }),
    markAuthenticated: () => markOnce('code/didAuth'),
  },
}).createMachine({
  id: 'auth',
  initial: isAuthBypassed() ? 'loggedIn' : 'checkIfLoggedIn',
  context: {
    token: isAuthBypassed() ? 'localhost' : '',
  },
  states: {
    checkIfLoggedIn: {
      on: {
        'Signed in': {
          target: 'loggedIn',
          actions: ['assignSession', 'markAuthenticated'],
        },
        'Signed out': 'loggedOut',
      },
    },
    loggedIn: {
      on: {
        'Signed in': { actions: 'assignSession' },
        'Signed out': { target: 'loggedOut', actions: 'clearSession' },
        'Log out': 'loggingOut',
      },
    },
    loggingOut: {
      on: {
        'Signed out': { target: 'loggedOut', actions: 'clearSession' },
        'Log out failed': 'loggedIn',
      },
    },
    loggedOut: {
      on: {
        'Signed in': {
          target: 'loggedIn',
          actions: ['assignSession', 'markAuthenticated'],
        },
      },
    },
  },
})
