/** Runtime-neutral preload contract; SQLite connections stay in Electron main. */
export type DatabaseAPI = {
  open: (filePath: string) => Promise<string>
  close: (connectionId: string) => Promise<void>
}

export type DatabaseConnection = {
  id: string
  close: () => Promise<void>
}

/** Use the parent folder's name while preserving POSIX/Windows path separators. */
export function getFlowsheetFilePath(filePath?: string): string | undefined {
  if (!filePath) {
    return
  }
  const parts = filePath.split(/[\\/]/)
  const folderName = parts.at(-2)
  if (!folderName || /^[a-z]:$/i.test(folderName) || !parts.at(-1)) {
    return
  }
  return filePath.replace(/[^\\/]+$/, () => `${folderName}.fgc`)
}

/** Browser-safe entry point used by the flowsheet scene. */
export async function openDB(filePath: string): Promise<DatabaseConnection> {
  const api = window.electron?.flowsheetDb
  if (!api) {
    return Promise.reject(
      new Error('Local SQLite connections require the desktop app.')
    )
  }

  const id = await api.open(filePath)
  return { id, close: () => api.close(id) }
}
