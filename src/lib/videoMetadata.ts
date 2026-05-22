import { isAudioFile } from '@/lib/videoUtils'

export interface MediaMetadata {
  duration: number
  width: number
  height: number
}

function probeMedia(
  url: string,
  tag: 'video' | 'audio',
): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    const el = document.createElement(tag)
    el.preload = 'metadata'
    el.muted = true

    const cleanup = () => {
      el.removeAttribute('src')
      el.load()
      el.remove()
    }

    el.onloadedmetadata = () => {
      resolve({
        duration: el.duration,
        width: tag === 'video' ? (el as HTMLVideoElement).videoWidth : 0,
        height: tag === 'video' ? (el as HTMLVideoElement).videoHeight : 0,
      })
      cleanup()
    }

    el.onerror = () => {
      cleanup()
      reject(new Error('Failed to load media metadata'))
    }

    el.src = url
  })
}

export async function loadMediaMetadata(
  url: string,
  file?: File | { name: string; type?: string },
): Promise<MediaMetadata> {
  const useAudio = file ? isAudioFile(file) : false
  try {
    return await probeMedia(url, useAudio ? 'audio' : 'video')
  } catch {
    if (useAudio) throw new Error('Failed to load audio metadata')
    return probeMedia(url, 'audio')
  }
}

/** @deprecated Use loadMediaMetadata */
export async function loadVideoMetadata(url: string): Promise<MediaMetadata> {
  return loadMediaMetadata(url)
}
