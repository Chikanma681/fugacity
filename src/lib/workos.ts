// WorkOS AuthKit configuration, read from VITE_-prefixed vars in .env.local.
// Only the public client ID and redirect URI belong here; never expose the API key.
export const WORKOS_CLIENT_ID: string =
  import.meta.env.VITE_WORKOS_CLIENT_ID ?? ''

export const WORKOS_REDIRECT_URI: string | undefined =
  import.meta.env.VITE_WORKOS_REDIRECT_URI || undefined

/** Pathname AuthKit redirects back to after sign-in (e.g. `/callback`). */
export const WORKOS_CALLBACK_PATH: string = WORKOS_REDIRECT_URI
  ? new URL(WORKOS_REDIRECT_URI).pathname
  : '/'
