type AccessTokenSource = () => Promise<string | null>

const EXPIRY_MARGIN_MS = 60_000

function readExpiryMs(token: string) {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(payload)).exp * 1000
}

class AccessToken {
  private source: AccessTokenSource | null = null
  private token: string | null = null
  private expiresAtMs = 0

  setSource(source: AccessTokenSource | null) {
    this.source = source
    this.token = null
    this.expiresAtMs = 0
  }

  async get() {
    if (this.token && Date.now() < this.expiresAtMs - EXPIRY_MARGIN_MS) {
      return this.token
    }
    const token = this.source ? await this.source() : null
    this.token = token
    this.expiresAtMs = token ? readExpiryMs(token) : 0
    return token
  }
}

export const accessToken = new AccessToken()
