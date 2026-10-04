// Node/Electron persistence layer only; the renderer should use an IPC/HTTP adapter.
import { createRequire } from 'node:module'
import type Database from 'better-sqlite3'

// Keep the package's native loader outside Vite's CommonJS transformation.
// Electron builds are CJS; import.meta.url also supports Node ESM consumers.
const requireNative = createRequire(
  typeof __filename === 'string' ? __filename : import.meta.url
)
const DatabaseConstructor = requireNative('better-sqlite3') as typeof Database

/** Open an existing document. Pass fileMustExist: false to create a database. */
export function open(
  filePath: string,
  options: Database.Options = {}
): Database.Database {
  const database = new DatabaseConstructor(filePath, {
    fileMustExist: true,
    timeout: 1000,
    ...options,
  })

  try {
    database.pragma('foreign_keys = ON')
    if (!database.readonly) {
      database.pragma('journal_mode = WAL')
    }
  } catch (error) {
    database.close()
    // eslint-disable-next-line suggest-no-throw/suggest-no-throw -- Preserve initialization failures after closing the connection.
    throw error
  }

  return database
}
