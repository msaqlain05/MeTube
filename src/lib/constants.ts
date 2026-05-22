export const MEDIA_ACCEPT =
  'video/*,audio/*,' +
  '.mp4,.webm,.ogg,.ogv,.mov,.m4v,.mkv,.avi,.wmv,.flv,' +
  '.mp3,.wav,.oga,.opus,.m4a,.aac,.flac,.wma,.aiff,.aif,.caf,.mid,.midi,.weba,.ape,.wv,.mka'

/** @deprecated Use MEDIA_ACCEPT */
export const VIDEO_ACCEPT = MEDIA_ACCEPT

export const LAYOUT = {
  videoMinWidth: 320,
  videoMinHeight: 200,
  railMin: 220,
  railMax: 640,
  railDefault: 402,
  stackedPlaylistMin: 160,
  stackedPlaylistMax: 560,
  stackedPlaylistDefault: 340,
} as const

export const PLAYER = {
  seekSeconds: 10,
  volumeStep: 0.05,
  controlsHideMs: 3000,
} as const

/** Delay before background thumbnails so playback can buffer first */
export const THUMB_DEFER_MS = 2000

/** Pause between thumbnail decodes to avoid competing with the main player */
export const THUMB_GAP_MS = 500

/** Max parallel metadata probes during folder import */
export const IMPORT_METADATA_BATCH = 4
