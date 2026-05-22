import type { CineflowStore, StoredPlaylist } from '@/types/playlist'

const JSON_KEY = 'cineflow-data'
const DB_NAME = 'cineflow-db'
const DB_VERSION = 2

const HANDLES_STORE = 'handles'
const THUMBS_STORE = 'thumbnails'
const FILES_STORE = 'files'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(HANDLES_STORE)) {
        db.createObjectStore(HANDLES_STORE)
      }
      if (!db.objectStoreNames.contains(THUMBS_STORE)) {
        db.createObjectStore(THUMBS_STORE)
      }
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE)
      }
    }
  })
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly')
        const req = tx.objectStore(store).get(key)
        req.onsuccess = () => resolve(req.result as T | undefined)
        req.onerror = () => reject(req.error)
      }),
  )
}

function idbSet(store: string, key: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite')
        tx.objectStore(store).put(value, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

function idbDelete(store: string, key: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite')
        tx.objectStore(store).delete(key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

async function clearStorePrefix(store: string, prefix: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const st = tx.objectStore(store)
    const req = st.openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
          cursor.delete()
        }
        cursor.continue()
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function migratePlaylist(p: StoredPlaylist): StoredPlaylist {
  return {
    ...p,
    source: p.source ?? 'folder',
  }
}

export function loadStore(): CineflowStore {
  try {
    const raw = localStorage.getItem(JSON_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as CineflowStore
    if (parsed?.version !== 1 || !Array.isArray(parsed.playlists)) {
      return emptyStore()
    }
    return {
      ...parsed,
      playlists: parsed.playlists.map(migratePlaylist),
    }
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: CineflowStore): void {
  try {
    localStorage.setItem(JSON_KEY, JSON.stringify(store))
  } catch (e) {
    console.error('Failed to save playlists:', e)
  }
}

export function emptyStore(): CineflowStore {
  return { version: 1, activePlaylistId: null, playlists: [] }
}

export async function saveDirectoryHandle(
  playlistId: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await idbSet(HANDLES_STORE, playlistId, handle)
}

export async function loadDirectoryHandle(
  playlistId: string,
): Promise<FileSystemDirectoryHandle | null> {
  const handle = await idbGet<FileSystemDirectoryHandle>(HANDLES_STORE, playlistId)
  return handle ?? null
}

export async function removeDirectoryHandle(playlistId: string): Promise<void> {
  await idbDelete(HANDLES_STORE, playlistId)
}

export async function saveThumbnail(
  playlistId: string,
  videoId: string,
  dataUrl: string,
): Promise<void> {
  await idbSet(THUMBS_STORE, `${playlistId}/${videoId}`, dataUrl)
}

export async function loadThumbnail(
  playlistId: string,
  videoId: string,
): Promise<string | null> {
  const data = await idbGet<string>(THUMBS_STORE, `${playlistId}/${videoId}`)
  return data ?? null
}

export async function loadAllThumbnails(
  playlistId: string,
  videoIds: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  await Promise.all(
    videoIds.map(async (id) => {
      const thumb = await loadThumbnail(playlistId, id)
      if (thumb) out[id] = thumb
    }),
  )
  return out
}

export async function saveVideoBlob(
  playlistId: string,
  videoId: string,
  file: File | Blob,
): Promise<void> {
  await idbSet(FILES_STORE, `${playlistId}/${videoId}`, file)
}

export async function removeVideoBlob(
  playlistId: string,
  videoId: string,
): Promise<void> {
  await idbDelete(FILES_STORE, `${playlistId}/${videoId}`)
}

export async function removeThumbnail(
  playlistId: string,
  videoId: string,
): Promise<void> {
  await idbDelete(THUMBS_STORE, `${playlistId}/${videoId}`)
}

export async function loadVideoBlob(
  playlistId: string,
  videoId: string,
): Promise<Blob | null> {
  const blob = await idbGet<Blob>(FILES_STORE, `${playlistId}/${videoId}`)
  return blob ?? null
}

export async function loadAllVideoBlobs(
  playlistId: string,
  videoIds: string[],
): Promise<Record<string, Blob>> {
  const out: Record<string, Blob> = {}
  await Promise.all(
    videoIds.map(async (id) => {
      const blob = await loadVideoBlob(playlistId, id)
      if (blob) out[id] = blob
    }),
  )
  return out
}

export async function clearPlaylistData(playlistId: string): Promise<void> {
  const prefix = `${playlistId}/`
  await Promise.all([
    clearStorePrefix(THUMBS_STORE, prefix),
    clearStorePrefix(FILES_STORE, prefix),
    removeDirectoryHandle(playlistId),
  ])
}
