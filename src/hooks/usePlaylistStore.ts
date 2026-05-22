import { useCallback, useEffect, useRef, useState } from 'react'
import {
  blobsToFileMap,
  buildManualVideoItem,
  mergeFileMapsForEntries,
  buildVideosFromFiles,
  createEmptyManualPlaylist,
  createStoredPlaylist,
  filesToPathMap,
  scheduleLoadThumbnailsForPlaylist,
  playlistDisplayName,
  storedToRuntime,
  toStoredVideo,
} from '@/lib/playlistBuilder'
import {
  collectVideosFromHandle,
  persistAppStorage,
  pickDirectory,
  requestHandlePermission,
  supportsDirectoryPicker,
} from '@/lib/folderAccess'
import {
  extractFolderPath,
  isMediaFile,
  sortMediaFiles,
} from '@/lib/videoUtils'
import {
  clearPlaylistData,
  loadAllThumbnails,
  loadAllVideoBlobs,
  loadDirectoryHandle,
  loadStore,
  saveDirectoryHandle,
  saveStore,
  saveVideoBlob,
  removeVideoBlob,
  removeThumbnail,
} from '@/lib/storage'
import {
  clearPlaylistWatchProgress,
  clearWatchProgress,
  getResumePosition,
  getWatchPercent,
  saveWatchProgress,
} from '@/lib/watchProgress'
import type { CineflowStore, StoredPlaylist } from '@/types/playlist'
import type { VideoItem } from '@/types/video'

function revokeVideos(videos: VideoItem[]) {
  for (const v of videos) {
    if (v.url.startsWith('blob:')) URL.revokeObjectURL(v.url)
  }
}

function persistStore(store: CineflowStore) {
  saveStore(store)
}

function upsertPlaylist(
  store: CineflowStore,
  playlist: StoredPlaylist,
): CineflowStore {
  const idx = store.playlists.findIndex((p) => p.id === playlist.id)
  const playlists =
    idx >= 0
      ? store.playlists.map((p, i) => (i === idx ? playlist : p))
      : [...store.playlists, playlist]
  return {
    ...store,
    playlists,
    activePlaylistId: playlist.id,
  }
}

export function usePlaylistStore() {
  const [store, setStore] = useState<CineflowStore>(() => loadStore())
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [hydrating, setHydrating] = useState(true)
  const [importError, setImportError] = useState<string | null>(null)
  const [needsFolderPermission, setNeedsFolderPermission] = useState(false)
  const [progressTick, setProgressTick] = useState(0)

  const storeRef = useRef(store)
  const videosRef = useRef(videos)
  const thumbGenRef = useRef(0)
  const thumbCancelRef = useRef<(() => void) | null>(null)

  const startThumbnailGeneration = useCallback(
    (
      playlistId: string,
      items: VideoItem[],
      priorityVideoId: string | null | undefined,
      onUpdate: (id: string, thumbnail: string) => void,
    ) => {
      thumbCancelRef.current?.()
      const gen = ++thumbGenRef.current
      const signal = { cancelled: false, isStale: () => thumbGenRef.current !== gen }
      thumbCancelRef.current = scheduleLoadThumbnailsForPlaylist(
        playlistId,
        items,
        (id, thumb) => {
          if (signal.isStale?.()) return
          onUpdate(id, thumb)
        },
        signal,
        { priorityVideoId: priorityVideoId ?? null },
      )
    },
    [],
  )

  useEffect(() => {
    return () => thumbCancelRef.current?.()
  }, [])

  useEffect(() => {
    storeRef.current = store
  }, [store])

  useEffect(() => {
    videosRef.current = videos
  }, [videos])

  useEffect(() => {
    void persistAppStorage()
    return () => revokeVideos(videosRef.current)
  }, [])

  const activePlaylist =
    store.playlists.find((p) => p.id === store.activePlaylistId) ?? null

  const updateStore = useCallback((next: CineflowStore) => {
    storeRef.current = next
    setStore(next)
    persistStore(next)
  }, [])

  const loadPlaylistVideos = useCallback(
    async (
      playlist: StoredPlaylist,
      folderFiles: File[],
      thumbnails: Record<string, string>,
    ) => {
      revokeVideos(videosRef.current)
      const blobs = await loadAllVideoBlobs(
        playlist.id,
        playlist.videos.map((v) => v.id),
      )
      const blobMap = blobsToFileMap(playlist.videos, blobs)
      const folderMap = filesToPathMap(folderFiles)
      const map = mergeFileMapsForEntries(
        playlist.videos,
        blobMap,
        folderMap,
      )
      const runtime = storedToRuntime(
        playlist.videos,
        playlist.folderPath,
        map,
        thumbnails,
      )
      setVideos(runtime)

      startThumbnailGeneration(
        playlist.id,
        runtime,
        playlist.activeVideoId,
        (id, thumb) => {
          setVideos((prev) =>
            prev.map((v) => (v.id === id ? { ...v, thumbnail: thumb } : v)),
          )
        },
      )
    },
    [startThumbnailGeneration],
  )

  const reloadFolderPlaylist = useCallback(
    async (playlist: StoredPlaylist, handle: FileSystemDirectoryHandle) => {
      const thumbnails = await loadAllThumbnails(
        playlist.id,
        playlist.videos.map((v) => v.id),
      )
      const files = await collectVideosFromHandle(handle)
      if (files.length === 0) {
        setImportError('No video or audio files found in this folder.')
        return false
      }
      await loadPlaylistVideos(playlist, files, thumbnails)
      return true
    },
    [loadPlaylistVideos],
  )

  const hydratePlaylist = useCallback(
    async (playlist: StoredPlaylist) => {
      setLoading(true)
      setImportError(null)
      setNeedsFolderPermission(false)

      try {
        if (playlist.source === 'manual') {
          revokeVideos(videosRef.current)
          if (playlist.videos.length === 0) {
            setVideos([])
            setLoading(false)
            return
          }

          const thumbnails = await loadAllThumbnails(
            playlist.id,
            playlist.videos.map((v) => v.id),
          )
          const blobs = await loadAllVideoBlobs(
            playlist.id,
            playlist.videos.map((v) => v.id),
          )
          const fileMap = blobsToFileMap(playlist.videos, blobs)
          const runtime = storedToRuntime(
            playlist.videos,
            playlist.folderPath,
            fileMap,
            thumbnails,
          )
          setVideos(runtime)

          const missing = playlist.videos.length - fileMap.size
          if (missing > 0) {
            setImportError(
              `${missing} video(s) could not be loaded from storage.`,
            )
          }

          startThumbnailGeneration(
            playlist.id,
            runtime.filter((v) => v.url),
            playlist.activeVideoId,
            (id, thumb) => {
              setVideos((prev) =>
                prev.map((v) => (v.id === id ? { ...v, thumbnail: thumb } : v)),
              )
            },
          )
          setLoading(false)
          return
        }

        const thumbnails = await loadAllThumbnails(
          playlist.id,
          playlist.videos.map((v) => v.id),
        )

        const handle = playlist.hasHandle
          ? await loadDirectoryHandle(playlist.id)
          : null

        if (handle) {
          const ok = await requestHandlePermission(handle)
          if (ok) {
            const loaded = await reloadFolderPlaylist(playlist, handle)
            if (loaded) {
              if (playlist.needsRelink) {
                const next = upsertPlaylist(storeRef.current, {
                  ...playlist,
                  hasHandle: true,
                  needsRelink: false,
                  updatedAt: Date.now(),
                })
                updateStore(next)
              }
              setLoading(false)
              return
            }
          } else {
            setNeedsFolderPermission(true)
          }
        }

        const blobs = await loadAllVideoBlobs(
          playlist.id,
          playlist.videos.map((v) => v.id),
        )
        const blobMap = blobsToFileMap(playlist.videos, blobs)
        const runtime = storedToRuntime(
          playlist.videos,
          playlist.folderPath,
          blobMap,
          thumbnails,
        )
        revokeVideos(videosRef.current)
        setVideos(runtime)
        if (blobMap.size < playlist.videos.length) {
          if (handle) {
            setNeedsFolderPermission(true)
            setImportError(
              'Allow folder access so videos can play without re-importing.',
            )
          } else {
            setImportError(
              'Choose the same folder again to restore access to your videos.',
            )
          }
        }
      } catch {
        setImportError('Could not load this playlist.')
        setVideos([])
      } finally {
        setLoading(false)
      }
    },
    [loadPlaylistVideos, reloadFolderPlaylist, updateStore],
  )

  // Restore last session on mount
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const saved = loadStore()
      if (cancelled) return
      setStore(saved)
      storeRef.current = saved

      const active = saved.playlists.find(
        (p) => p.id === saved.activePlaylistId,
      )
      if (active) {
        await hydratePlaylist(active)
      }
      if (!cancelled) setHydrating(false)
    })()

    return () => {
      cancelled = true
    }
  }, [hydratePlaylist])

  const importFromFiles = useCallback(
    async (
      fileList: FileList | File[],
      dirHandle?: FileSystemDirectoryHandle | null,
    ) => {
      const files = Array.from(fileList).filter(isMediaFile)
      if (files.length === 0) {
        setImportError('No video or audio files found in this folder.')
        return
      }

      setLoading(true)
      setImportError(null)
      revokeVideos(videosRef.current)

      const sorted = sortMediaFiles(files)
      const folderPath = extractFolderPath(sorted)
      const name = playlistDisplayName(folderPath, sorted)

      const existing = storeRef.current.playlists.find(
        (p) => p.folderPath === folderPath,
      )
      const playlistId = existing?.id ?? crypto.randomUUID()
      const hasHandle = !!dirHandle

      try {
        let accessGranted = false
        if (dirHandle) {
          await saveDirectoryHandle(playlistId, dirHandle)
          accessGranted = await requestHandlePermission(dirHandle)
        }

        const items = await buildVideosFromFiles(sorted, folderPath)
        const prevActive = existing?.activeVideoId
        const activeVideoId =
          (prevActive && items.some((v) => v.id === prevActive)
            ? prevActive
            : items[0]?.id) ?? null

        const playlist = createStoredPlaylist(
          playlistId,
          name,
          folderPath,
          items,
          activeVideoId,
          hasHandle,
        )
        playlist.hasHandle = hasHandle
        playlist.needsRelink = !hasHandle
        if (existing) {
          playlist.createdAt = existing.createdAt
        }

        const next = upsertPlaylist(storeRef.current, playlist)
        updateStore(next)

        setVideos(items)
        setNeedsFolderPermission(hasHandle && !accessGranted)
        if (hasHandle && !accessGranted) {
          setImportError(
            'Click Allow folder access on the player to keep playback working after refresh.',
          )
        }
        setLoading(false)

        startThumbnailGeneration(playlistId, items, activeVideoId, (id, thumb) => {
          setVideos((prev) =>
            prev.map((v) => (v.id === id ? { ...v, thumbnail: thumb } : v)),
          )
        })
      } catch {
        setImportError('Failed to import folder.')
        setLoading(false)
      }
    },
    [updateStore, startThumbnailGeneration],
  )

  const importFolder = useCallback(async (): Promise<'use-input' | void> => {
    setImportError(null)

    if (supportsDirectoryPicker()) {
      try {
        const picked = await pickDirectory()
        if (picked) {
          if (picked.files.length === 0) {
            setImportError('No video or audio files found in this folder.')
            return
          }
          await importFromFiles(picked.files, picked.handle)
          return
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        /* fall through to file input */
      }
    }

    return 'use-input'
  }, [importFromFiles])

  const relinkFolder = useCallback(async () => {
    if (!activePlaylist) return

    try {
      const picked = await pickDirectory(activePlaylist.id)
      if (!picked || picked.files.length === 0) {
        setImportError('No video or audio files found.')
        return
      }

      setLoading(true)
      setImportError(null)
      await saveDirectoryHandle(activePlaylist.id, picked.handle)

      const updated: StoredPlaylist = {
        ...activePlaylist,
        hasHandle: true,
        needsRelink: false,
        updatedAt: Date.now(),
      }

      const next = upsertPlaylist(storeRef.current, updated)
      updateStore(next)

      const ok = await reloadFolderPlaylist(updated, picked.handle)
      setNeedsFolderPermission(!ok)
      if (!ok && (await requestHandlePermission(picked.handle))) {
        const retry = await reloadFolderPlaylist(updated, picked.handle)
        setNeedsFolderPermission(!retry)
      }
      setImportError(null)
      setLoading(false)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setImportError('Could not relink folder.')
      }
      setLoading(false)
    }
  }, [activePlaylist, updateStore, reloadFolderPlaylist])

  const grantFolderAccess = useCallback(async () => {
    if (!activePlaylist || activePlaylist.source !== 'folder') return

    setImportError(null)
    const handle = await loadDirectoryHandle(activePlaylist.id)
    if (!handle) {
      await relinkFolder()
      return
    }

    setLoading(true)
    try {
      const ok = await requestHandlePermission(handle)
      if (!ok) {
        setNeedsFolderPermission(true)
        setImportError(
          'Access was blocked. Click Allow folder access again and choose Allow in the browser dialog.',
        )
        return
      }

      const loaded = await reloadFolderPlaylist(activePlaylist, handle)
      if (!loaded) return

      setNeedsFolderPermission(false)
      const updated: StoredPlaylist = {
        ...activePlaylist,
        hasHandle: true,
        needsRelink: false,
        updatedAt: Date.now(),
      }
      updateStore(upsertPlaylist(storeRef.current, updated))
      setImportError(null)
    } catch {
      setImportError('Could not restore folder access.')
    } finally {
      setLoading(false)
    }
  }, [activePlaylist, relinkFolder, reloadFolderPlaylist, updateStore])

  const selectPlaylist = useCallback(
    async (playlistId: string) => {
      const playlist = storeRef.current.playlists.find(
        (p) => p.id === playlistId,
      )
      if (!playlist) return

      const next: CineflowStore = {
        ...storeRef.current,
        activePlaylistId: playlistId,
      }
      updateStore(next)
      await hydratePlaylist(playlist)
    },
    [hydratePlaylist, updateStore],
  )

  const recordWatchProgress = useCallback(
    (videoId: string, position: number, duration: number, force = false) => {
      const playlistId = storeRef.current.activePlaylistId
      if (!playlistId) return
      const saved = saveWatchProgress(playlistId, videoId, position, duration, {
        force,
      })
      if (saved) setProgressTick((t) => t + 1)
    },
    [],
  )

  const getResumeForVideo = useCallback(
    (videoId: string, duration?: number) => {
      const playlistId = storeRef.current.activePlaylistId
      if (!playlistId) return null
      return getResumePosition(playlistId, videoId, duration)
    },
    [],
  )

  const getVideoWatchPercent = useCallback(
    (videoId: string, duration?: number) => {
      const playlistId = storeRef.current.activePlaylistId
      if (!playlistId) return 0
      return getWatchPercent(playlistId, videoId, duration)
    },
    [progressTick],
  )

  const selectVideo = useCallback(
    (videoId: string) => {
      const playlistId = storeRef.current.activePlaylistId
      if (!playlistId) return
      const playlist = storeRef.current.playlists.find((p) => p.id === playlistId)
      if (!playlist) return

      const updated: StoredPlaylist = {
        ...playlist,
        activeVideoId: videoId,
        updatedAt: Date.now(),
      }
      updateStore({
        ...storeRef.current,
        playlists: storeRef.current.playlists.map((p) =>
          p.id === updated.id ? updated : p,
        ),
      })
    },
    [updateStore],
  )

  const playNext = useCallback(() => {
    if (!activePlaylist || videos.length === 0) return
    const idx = videos.findIndex((v) => v.id === activePlaylist.activeVideoId)
    const next = videos[idx + 1]
    if (next) selectVideo(next.id)
  }, [activePlaylist, videos, selectVideo])

  const createPlaylist = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return

      const playlist = createEmptyManualPlaylist(trimmed)
      const next = upsertPlaylist(storeRef.current, playlist)
      updateStore(next)
      revokeVideos(videosRef.current)
      setVideos([])
      setImportError(null)
    },
    [updateStore],
  )

  const addVideosToPlaylist = useCallback(
    async (playlistId: string, fileList: FileList | File[]) => {
      const playlist = storeRef.current.playlists.find((p) => p.id === playlistId)
      if (!playlist) {
        setImportError('Playlist not found.')
        return
      }

      const files = Array.from(fileList).filter(isMediaFile)
      if (files.length === 0) {
        setImportError('No valid video or audio files selected.')
        return
      }

      setLoading(true)
      setImportError(null)

      const isActive = storeRef.current.activePlaylistId === playlistId

      try {
        const startIndex = playlist.videos.length
        const newItems = await Promise.all(
          files.map((file, i) =>
            buildManualVideoItem(
              file,
              playlist.id,
              startIndex + i,
              playlist.folderPath,
            ),
          ),
        )

        for (const item of newItems) {
          await saveVideoBlob(playlist.id, item.id, item.file)
        }

        const isFirst = playlist.videos.length === 0
        const activeVideoId = isFirst
          ? (newItems[0]?.id ?? null)
          : playlist.activeVideoId

        const updated: StoredPlaylist = {
          ...playlist,
          videos: [...playlist.videos, ...newItems.map(toStoredVideo)],
          activeVideoId,
          updatedAt: Date.now(),
        }

        const next: CineflowStore = {
          ...storeRef.current,
          activePlaylistId: playlistId,
          playlists: storeRef.current.playlists.map((p) =>
            p.id === updated.id ? updated : p,
          ),
        }
        updateStore(next)

        if (isActive) {
          setVideos([...videosRef.current, ...newItems])
        }

        startThumbnailGeneration(
          playlist.id,
          newItems,
          playlist.activeVideoId,
          (id, thumb) => {
            if (storeRef.current.activePlaylistId !== playlistId) return
            setVideos((prev) =>
              prev.map((v) => (v.id === id ? { ...v, thumbnail: thumb } : v)),
            )
          },
        )
      } catch {
        setImportError('Failed to add media.')
      } finally {
        setLoading(false)
      }
    },
    [hydratePlaylist, updateStore, startThumbnailGeneration],
  )

  const removeVideoFromPlaylist = useCallback(
    async (playlistId: string, videoId: string) => {
      const playlist = storeRef.current.playlists.find((p) => p.id === playlistId)
      if (!playlist) return

      const remaining = playlist.videos.filter((v) => v.id !== videoId)
      if (remaining.length === playlist.videos.length) return

      let activeVideoId = playlist.activeVideoId
      if (activeVideoId === videoId) {
        const idx = playlist.videos.findIndex((v) => v.id === videoId)
        activeVideoId = remaining[idx]?.id ?? remaining[idx - 1]?.id ?? null
      }

      const removed = videosRef.current.find((v) => v.id === videoId)
      if (removed?.url.startsWith('blob:')) {
        URL.revokeObjectURL(removed.url)
      }

      await Promise.all([
        removeVideoBlob(playlistId, videoId),
        removeThumbnail(playlistId, videoId),
      ])
      clearWatchProgress(playlistId, videoId)

      const updated: StoredPlaylist = {
        ...playlist,
        videos: remaining,
        activeVideoId,
        updatedAt: Date.now(),
      }

      const next: CineflowStore = {
        ...storeRef.current,
        playlists: storeRef.current.playlists.map((p) =>
          p.id === updated.id ? updated : p,
        ),
      }
      updateStore(next)

      if (storeRef.current.activePlaylistId === playlistId) {
        setVideos((prev) => prev.filter((v) => v.id !== videoId))
      }
    },
    [updateStore],
  )

  const removePlaylist = useCallback(
    async (playlistId: string) => {
      revokeVideos(videosRef.current)
      await clearPlaylistData(playlistId)
      clearPlaylistWatchProgress(playlistId)
      const playlists = storeRef.current.playlists.filter(
        (p) => p.id !== playlistId,
      )
      const activePlaylistId =
        storeRef.current.activePlaylistId === playlistId
          ? (playlists[0]?.id ?? null)
          : storeRef.current.activePlaylistId

      const next: CineflowStore = {
        ...storeRef.current,
        playlists,
        activePlaylistId,
      }
      updateStore(next)
      setVideos([])

      if (activePlaylistId) {
        const pl = playlists.find((p) => p.id === activePlaylistId)
        if (pl) hydratePlaylist(pl)
      }
    },
    [hydratePlaylist, updateStore],
  )

  const activeVideo =
    videos.find((v) => v.id === activePlaylist?.activeVideoId) ??
    videos[0] ??
    null

  return {
    playlists: store.playlists,
    activePlaylist,
    activePlaylistId: store.activePlaylistId,
    videos,
    activeVideo,
    loading: loading || hydrating,
    importError,
    importFromFiles,
    importFolder,
    relinkFolder,
    grantFolderAccess,
    selectPlaylist,
    selectVideo,
    playNext,
    removePlaylist,
    removeVideoFromPlaylist,
    hasVideos: videos.length > 0,
    needsFolderPermission,
    needsRelink:
      activePlaylist?.source === 'folder' &&
      (needsFolderPermission ||
        (activePlaylist?.needsRelink ?? false) ||
        (activeVideo != null && activeVideo.url.length === 0)),
    canGrantFolderAccess:
      activePlaylist?.source === 'folder' &&
      (activePlaylist.hasHandle || needsFolderPermission),
    isManualPlaylist: activePlaylist?.source === 'manual',
    createPlaylist,
    addVideosToPlaylist,
    recordWatchProgress,
    getResumeForVideo,
    getVideoWatchPercent,
  }
}
