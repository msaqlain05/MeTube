import { isMediaFile, sortMediaFiles } from '@/lib/videoUtils'

const PICKER_ID_PREFIX = 'metube-folder-'

export type FolderPermissionState = PermissionState | 'unsupported'

export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/** Keep IndexedDB handles and blobs from being cleared under storage pressure */
export async function persistAppStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return navigator.storage.persist()
  } catch {
    return false
  }
}

export function directoryPickerId(playlistId?: string): string {
  return playlistId ? `${PICKER_ID_PREFIX}${playlistId}` : `${PICKER_ID_PREFIX}default`
}

/** Attach webkitRelativePath so sorting matches folder-import behavior */
function withRelativePath(file: File, relativePath: string): File {
  try {
    Object.defineProperty(file, 'webkitRelativePath', {
      value: relativePath,
      configurable: true,
    })
  } catch {
    /* ignore */
  }
  return file
}

export async function collectVideosFromHandle(
  dirHandle: FileSystemDirectoryHandle,
  basePath = '',
): Promise<File[]> {
  const files: File[] = []

  for await (const [, entry] of dirHandle.entries()) {
    const rel = basePath ? `${basePath}/${entry.name}` : entry.name

    if (entry.kind === 'file') {
      const fileHandle = entry as FileSystemFileHandle
      const file = await fileHandle.getFile()
      if (isMediaFile(file)) {
        files.push(withRelativePath(file, rel))
      }
    } else if (entry.kind === 'directory') {
      const sub = await collectVideosFromHandle(
        entry as FileSystemDirectoryHandle,
        rel,
      )
      files.push(...sub)
    }
  }

  return sortMediaFiles(files)
}

export async function queryHandlePermission(
  handle: FileSystemDirectoryHandle,
): Promise<FolderPermissionState> {
  try {
    return await handle.queryPermission({ mode: 'read' })
  } catch {
    return 'unsupported'
  }
}

/**
 * Request read access on a stored handle. Call while the user gesture from the
 * folder picker (or an Allow button) is still active so the browser can persist it.
 */
export async function requestHandlePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    const current = await queryHandlePermission(handle)
    if (current === 'granted') return true
    if (current === 'denied') return false
    const requested = await handle.requestPermission({ mode: 'read' })
    return requested === 'granted'
  } catch {
    return false
  }
}

/** Query then request read permission when needed */
export async function ensureHandleReadAccess(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  return requestHandlePermission(handle)
}

export async function pickDirectory(playlistId?: string): Promise<{
  handle: FileSystemDirectoryHandle
  files: File[]
  folderPath: string
} | null> {
  if (!supportsDirectoryPicker()) return null

  const handle = await window.showDirectoryPicker!({
    mode: 'read',
    id: directoryPickerId(playlistId),
  })

  await ensureHandleReadAccess(handle)

  const files = await collectVideosFromHandle(handle)
  const folderPath = `/${handle.name}`

  return { handle, files, folderPath }
}
