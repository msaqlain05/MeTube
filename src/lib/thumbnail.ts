import { isAudioFile } from '@/lib/videoUtils'

const THUMB_WIDTH = 160
const THUMB_HEIGHT = 90
const SEEK_FRACTION = 0.1

export const AUDIO_PLACEHOLDER_THUMB =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90" viewBox="0 0 160 90">
      <rect fill="#1a1a1e" width="160" height="90"/>
      <circle cx="80" cy="45" r="22" fill="none" stroke="#3f3f46" stroke-width="2"/>
      <circle cx="80" cy="45" r="8" fill="#3f3f46"/>
      <path fill="#3f3f46" d="M108 38 L118 32 V58 L108 52 Z"/>
    </svg>`,
  )

export function generateThumbnail(
  url: string,
  file?: File | { name: string; type?: string },
): Promise<string> {
  if (file && isAudioFile(file)) {
    return Promise.resolve(AUDIO_PLACEHOLDER_THUMB)
  }
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
      video.remove()
    }

    const capture = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = THUMB_WIDTH
        canvas.height = THUMB_HEIGHT
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas unavailable'))
          return
        }
        ctx.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      } catch {
        reject(new Error('Thumbnail capture failed'))
      } finally {
        cleanup()
      }
    }

    video.onloadeddata = () => {
      const seekTo = Number.isFinite(video.duration)
        ? Math.min(video.duration * SEEK_FRACTION, video.duration - 0.1)
        : 0
      video.currentTime = Math.max(0, seekTo)
    }

    video.onseeked = capture

    video.onerror = () => {
      cleanup()
      reject(new Error('Thumbnail generation failed'))
    }

    // Fallback if seek doesn't fire (very short clips)
    video.oncanplay = () => {
      if (video.readyState >= 2 && video.currentTime === 0) {
        setTimeout(() => {
          if (video.videoWidth > 0) capture()
        }, 100)
      }
    }

    video.src = url
  })
}

export const PLACEHOLDER_THUMB =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90" viewBox="0 0 160 90">
      <rect fill="#1a1a1e" width="160" height="90"/>
      <polygon fill="#3f3f46" points="65,30 95,45 65,60"/>
    </svg>`,
  )

export function needsThumbnail(thumbnail: string | null | undefined): boolean {
  if (!thumbnail) return true
  return thumbnail === PLACEHOLDER_THUMB || thumbnail === AUDIO_PLACEHOLDER_THUMB
}
