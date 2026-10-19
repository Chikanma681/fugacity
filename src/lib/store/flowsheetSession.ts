import type { FlowsheetState } from '@src/flowsheet/types'
import type { DatabaseConnection } from '@src/lib/store/database'

export type FlowsheetSessionState = {
  value: FlowsheetState
  ready: boolean
  error: string | null
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

type PendingSave = {
  state: FlowsheetState
  resolve: () => void
  reject: (error: Error) => void
}

export class FlowsheetSession {
  private pending: PendingSave[] = []
  private draining: Promise<void> | undefined
  private closing = false
  private ready = false
  private persisted: FlowsheetState

  constructor(
    private readonly connection: DatabaseConnection,
    initial: FlowsheetState,
    private readonly onChange: (state: FlowsheetSessionState) => void
  ) {
    this.persisted = initial
  }

  async initialize() {
    try {
      const saved = await this.connection.read()
      if (saved) {
        this.persisted = saved
      } else {
        await this.connection.save(this.persisted)
      }
      this.ready = true
      this.onChange({ value: this.persisted, ready: true, error: null })
    } catch (error) {
      this.onChange({
        value: this.persisted,
        ready: false,
        error: errorMessage(error),
      })
    }
  }

  private async drain() {
    while (this.pending.length) {
      const next = this.pending.shift()
      if (!next) {
        continue
      }
      try {
        await this.connection.save(next.state)
        this.persisted = next.state
        next.resolve()
      } catch (error) {
        const failed = [next, ...this.pending]
        this.pending = []
        this.ready = false
        const message = `Could not save after 3 attempts. Unsaved changes were reverted: ${errorMessage(error)}`
        this.onChange({ value: this.persisted, ready: false, error: message })
        try {
          const saved = await this.connection.read()
          if (!saved) {
            this.onChange({
              value: this.persisted,
              ready: false,
              error: `${message}. The flowsheet no longer exists in the database.`,
            })
            return
          }
          this.persisted = saved
          this.ready = true
          this.onChange({ value: saved, ready: true, error: message })
        } catch (readError) {
          this.onChange({
            value: this.persisted,
            ready: false,
            error: `${message}. Could not reload the database: ${errorMessage(readError)}`,
          })
        } finally {
          for (const save of failed) {
            save.reject(new Error(message))
          }
        }
        return
      }
    }
  }

  private startDrain() {
    this.draining = this.drain().finally(() => {
      this.draining = undefined
      if (this.pending.length) {
        this.startDrain()
      }
    })
  }

  enqueue(state: FlowsheetState): Promise<void> {
    if (this.closing || !this.ready) {
      return Promise.reject(
        new Error('The flowsheet database is not ready to save.')
      )
    }
    return new Promise((resolve, reject) => {
      this.pending.push({ state, resolve, reject })
      if (!this.draining) {
        this.startDrain()
      }
    })
  }

  async close() {
    this.closing = true
    while (this.draining) {
      await this.draining
    }
    await this.connection.close()
  }
}
