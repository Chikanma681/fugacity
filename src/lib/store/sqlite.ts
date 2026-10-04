// Node/Electron persistence layer only; the renderer should use an IPC/HTTP adapter.
import Database from 'better-sqlite3'

/** Open an existing document. Pass fileMustExist: false to create a database. */
export function open(
  filePath: string,
  options: Database.Options = {}
): Database.Database {
  const database = new Database(filePath, {
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
