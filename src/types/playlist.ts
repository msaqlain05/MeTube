export interface StoredVideoEntry {
  id: string
  name: string
  displayTitle: string
  relativePath: string
  duration: number
  durationLabel: string
  width: number
  height: number
  resolution: string
  aspectRatio: string
}

export type PlaylistSource = 'folder' | 'manual'

export interface StoredPlaylist {
  id: string
  name: string
  folderPath: string
  source: PlaylistSource
  createdAt: number
  updatedAt: number
  activeVideoId: string | null
  videos: StoredVideoEntry[]
  /** True when a directory handle is saved in IndexedDB */
  hasHandle: boolean
  needsRelink: boolean
}

export interface CineflowStore {
  version: 1
  activePlaylistId: string | null
  playlists: StoredPlaylist[]
}
