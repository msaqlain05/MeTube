const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.webm',
  '.ogv',
  '.mov',
  '.m4v',
  '.mkv',
  '.avi',
  '.wmv',
  '.flv',
  '.mka',
])

const AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.ogg',
  '.oga',
  '.opus',
  '.m4a',
  '.aac',
  '.flac',
  '.wma',
  '.aiff',
  '.aif',
  '.caf',
  '.mid',
  '.midi',
  '.weba',
  '.ape',
  '.wv',
])

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

export function isVideoFile(file: File | { name: string; type?: string }): boolean {
  if (file.type?.startsWith('audio/')) return false
  if (file.type?.startsWith('video/')) return true
  return VIDEO_EXTENSIONS.has(extensionOf(file.name))
}

export function isAudioFile(file: File | { name: string; type?: string }): boolean {
  if (file.type?.startsWith('video/')) return false
  if (file.type?.startsWith('audio/')) return true
  return AUDIO_EXTENSIONS.has(extensionOf(file.name))
}

export function isMediaFile(file: File): boolean {
  return isVideoFile(file) || isAudioFile(file)
}

export function sortMediaFiles(files: File[]): File[] {
  return [...files].sort((a, b) =>
    getRelativePath(a).localeCompare(getRelativePath(b), undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}

/** @deprecated Use sortMediaFiles */
export function sortVideoFiles(files: File[]): File[] {
  return sortMediaFiles(files)
}

export function getRelativePath(file: File): string {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? file.name
}

export function extractFolderPath(files: File[]): string {
  if (files.length === 0) return ''
  const first = getRelativePath(files[0])
  const parts = first.split('/')
  if (parts.length > 1) {
    return '/' + parts.slice(0, -1).join('/')
  }
  return '/Imported'
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatResolution(
  width: number,
  height: number,
  isAudio = false,
): string {
  if (isAudio) return 'Audio'
  if (!width || !height) return '—'
  if (height >= 2160) return '4K'
  if (height >= 1440) return '1440p'
  if (height >= 1080) return '1080p'
  if (height >= 720) return '720p'
  if (height >= 480) return '480p'
  return `${height}p`
}

export function formatAspectRatio(width: number, height: number): string {
  if (!width || !height) return '—'
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const g = gcd(width, height)
  const rw = width / g
  const rh = height / g
  if (rw === 16 && rh === 9) return '16:9'
  if (rw === 4 && rh === 3) return '4:3'
  if (rw === 21 && rh === 9) return '21:9'
  return `${rw}:${rh}`
}

export function toDisplayTitle(filename: string): string {
  const base = filename.replace(/\.[^/.]+$/, '')
  return base.toUpperCase().replace(/\s+/g, '_')
}

export function createVideoId(relativePath: string, index: number): string {
  return `${index}-${relativePath}`.replace(/[^a-zA-Z0-9-_]/g, '_')
}
