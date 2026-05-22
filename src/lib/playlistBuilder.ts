import { IMPORT_METADATA_BATCH, THUMB_DEFER_MS, THUMB_GAP_MS } from '@/lib/constants'
import {
  AUDIO_PLACEHOLDER_THUMB,
  generateThumbnail,
  needsThumbnail,
  PLACEHOLDER_THUMB,
} from '@/lib/thumbnail'
import { loadMediaMetadata } from '@/lib/videoMetadata'
import {
  createVideoId,
  extractFolderPath,
  formatAspectRatio,
  formatDuration,
  formatResolution,
  getRelativePath,
  isAudioFile,
  sortMediaFiles,
  toDisplayTitle,
} from '@/lib/videoUtils'
import { saveThumbnail } from '@/lib/storage'
import type { StoredPlaylist, StoredVideoEntry } from '@/types/playlist'
import type { VideoItem } from '@/types/video'

export function playlistDisplayName(folderPath: string, files: File[]): string {
  const path = folderPath.replace(/^\//, '')
  if (path) return path.split('/')[0] ?? path
  return extractFolderPath(files).replace(/^\//, '') || 'Imported Folder'
}

export function toStoredVideo(
  item: VideoItem,
): StoredVideoEntry {
  return {
    id: item.id,
    name: item.name,
    displayTitle: item.displayTitle,
    relativePath: item.relativePath,
    duration: item.duration,
    durationLabel: item.durationLabel,
    width: item.width,
    height: item.height,
    resolution: item.resolution,
    aspectRatio: item.aspectRatio,
  }
}

export async function buildVideoItem(
  file: File,
  index: number,
  folderPath: string,
): Promise<VideoItem> {
  const relativePath = getRelativePath(file)
  const url = URL.createObjectURL(file)
  const id = createVideoId(relativePath, index)
  const isAudio = isAudioFile(file)

  let duration = 0
  let width = 0
  let height = 0

  try {
    const meta = await loadMediaMetadata(url, file)
    duration = meta.duration
    width = meta.width
    height = meta.height
  } catch {
    /* defaults */
  }

  return {
    id,
    file,
    name: file.name,
    displayTitle: toDisplayTitle(file.name),
    relativePath,
    folderPath,
    url,
    thumbnail: isAudio ? AUDIO_PLACEHOLDER_THUMB : PLACEHOLDER_THUMB,
    isAudio,
    duration,
    durationLabel: formatDuration(duration),
    width,
    height,
    resolution: formatResolution(width, height, isAudio),
    aspectRatio: isAudio ? '—' : formatAspectRatio(width, height),
  }
}

export async function buildVideosFromFiles(
  files: File[],
  folderPath: string,
): Promise<VideoItem[]> {
  const sorted = sortMediaFiles(files)
  const items: VideoItem[] = []
  for (let i = 0; i < sorted.length; i += IMPORT_METADATA_BATCH) {
    const batch = sorted.slice(i, i + IMPORT_METADATA_BATCH)
    const built = await Promise.all(
      batch.map((file, j) => buildVideoItem(file, i + j, folderPath)),
    )
    items.push(...built)
  }
  return items
}

export function storedToRuntime(
  entries: StoredVideoEntry[],
  folderPath: string,
  filesByPath: Map<string, File>,
  thumbnails: Record<string, string>,
): VideoItem[] {
  return entries.map((entry) => {
    const file = filesByPath.get(entry.relativePath)
    const url = file ? URL.createObjectURL(file) : ''
    const isAudio = isAudioFile(file ?? { name: entry.name })
    return {
      id: entry.id,
      file: file ?? new File([], entry.name),
      name: entry.name,
      displayTitle: entry.displayTitle,
      relativePath: entry.relativePath,
      folderPath,
      url,
      thumbnail:
        thumbnails[entry.id] ??
        (isAudio ? AUDIO_PLACEHOLDER_THUMB : PLACEHOLDER_THUMB),
      isAudio,
      duration: entry.duration,
      durationLabel: entry.durationLabel,
      width: entry.width,
      height: entry.height,
      resolution: entry.resolution,
      aspectRatio: entry.aspectRatio,
    }
  })
}

export function filesToPathMap(files: File[]): Map<string, File> {
  const map = new Map<string, File>()
  for (const f of files) {
    map.set(getRelativePath(f), f)
  }
  return map
}

/** Prefer blob-backed files (added videos), then folder files */
export function mergeFileMapsForEntries(
  entries: StoredVideoEntry[],
  blobMap: Map<string, File>,
  folderMap: Map<string, File>,
): Map<string, File> {
  const merged = new Map<string, File>()
  for (const entry of entries) {
    const fromBlob = blobMap.get(entry.relativePath)
    const fromFolder = folderMap.get(entry.relativePath)
    const file = fromBlob ?? fromFolder
    if (file) merged.set(entry.relativePath, file)
  }
  return merged
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type ThumbnailLoadSignal = {
  cancelled: boolean
  isStale?: () => boolean
}

export async function loadThumbnailsForPlaylist(
  playlistId: string,
  items: VideoItem[],
  onUpdate: (id: string, thumbnail: string) => void,
  signal: ThumbnailLoadSignal,
  options?: {
    priorityVideoId?: string | null
    gapMs?: number
  },
): Promise<void> {
  const pending = items.filter((item) => needsThumbnail(item.thumbnail))
  if (pending.length === 0) return

  const priorityId = options?.priorityVideoId
  const sorted =
    priorityId != null
      ? [...pending].sort((a, b) => {
          if (a.id === priorityId) return -1
          if (b.id === priorityId) return 1
          return 0
        })
      : pending

  const gapMs = options?.gapMs ?? THUMB_GAP_MS

  for (let i = 0; i < sorted.length; i++) {
    if (signal.cancelled || signal.isStale?.()) return
    if (i > 0) await delay(gapMs)
    if (signal.cancelled || signal.isStale?.()) return

    const item = sorted[i]
    if (!item.url) continue
    try {
      const thumb = await generateThumbnail(item.url, item.file)
      if (signal.cancelled || signal.isStale?.()) return
      await saveThumbnail(playlistId, item.id, thumb)
      onUpdate(item.id, thumb)
    } catch {
      /* keep placeholder */
    }
  }
}

/** Start thumbnail generation after idle so playback is not starved */
export function scheduleLoadThumbnailsForPlaylist(
  playlistId: string,
  items: VideoItem[],
  onUpdate: (id: string, thumbnail: string) => void,
  signal: ThumbnailLoadSignal,
  options?: {
    priorityVideoId?: string | null
    gapMs?: number
    deferMs?: number
  },
): () => void {
  let cancelled = false
  let idleId: number | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const run = () => {
    if (cancelled) return
    void loadThumbnailsForPlaylist(playlistId, items, onUpdate, signal, options)
  }

  const deferMs = options?.deferMs ?? THUMB_DEFER_MS
  const start = () => {
    if (cancelled) return
    run()
  }

  if (typeof requestIdleCallback !== 'undefined') {
    idleId = requestIdleCallback(start, { timeout: deferMs })
  }
  timeoutId = setTimeout(start, deferMs)

  return () => {
    cancelled = true
    signal.cancelled = true
    if (timeoutId != null) clearTimeout(timeoutId)
    if (idleId != null) cancelIdleCallback(idleId)
  }
}

export function createStoredPlaylist(
  id: string,
  name: string,
  folderPath: string,
  items: VideoItem[],
  activeVideoId: string | null,
  hasHandle: boolean,
  source: StoredPlaylist['source'] = 'folder',
): StoredPlaylist {
  const now = Date.now()
  return {
    id,
    name,
    folderPath,
    source,
    createdAt: now,
    updatedAt: now,
    activeVideoId,
    videos: items.map(toStoredVideo),
    hasHandle,
    needsRelink: source === 'folder' && !hasHandle,
  }
}

export function createEmptyManualPlaylist(name: string): StoredPlaylist {
  const id = crypto.randomUUID()
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'playlist'
  const now = Date.now()
  return {
    id,
    name: name.trim(),
    folderPath: `/manual/${slug}`,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
    activeVideoId: null,
    videos: [],
    hasHandle: false,
    needsRelink: false,
  }
}

/** Manual playlists: order = add order (first added = top) */
export async function buildManualVideoItem(
  file: File,
  playlistId: string,
  orderIndex: number,
  folderPath: string,
): Promise<VideoItem> {
  const relativePath = `manual/${playlistId}/${orderIndex}/${file.name}`
  const url = URL.createObjectURL(file)
  const id = createVideoId(relativePath, orderIndex)
  const isAudio = isAudioFile(file)

  let duration = 0
  let width = 0
  let height = 0

  try {
    const meta = await loadMediaMetadata(url, file)
    duration = meta.duration
    width = meta.width
    height = meta.height
  } catch {
    /* defaults */
  }

  return {
    id,
    file,
    name: file.name,
    displayTitle: toDisplayTitle(file.name),
    relativePath,
    folderPath,
    url,
    thumbnail: isAudio ? AUDIO_PLACEHOLDER_THUMB : PLACEHOLDER_THUMB,
    isAudio,
    duration,
    durationLabel: formatDuration(duration),
    width,
    height,
    resolution: formatResolution(width, height, isAudio),
    aspectRatio: isAudio ? '—' : formatAspectRatio(width, height),
  }
}

export function blobsToFileMap(
  entries: StoredVideoEntry[],
  blobs: Record<string, Blob>,
): Map<string, File> {
  const map = new Map<string, File>()
  for (const entry of entries) {
    const blob = blobs[entry.id]
    if (blob) {
      const defaultType = isAudioFile({ name: entry.name, type: blob.type })
        ? 'audio/mpeg'
        : 'video/mp4'
      const file = new File([blob], entry.name, {
        type: blob.type || defaultType,
      })
      map.set(entry.relativePath, file)
    }
  }
  return map
}
