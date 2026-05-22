import { useEffect, type RefObject } from 'react'
import { PLAYER } from '@/lib/constants'
import { shouldIgnorePlayerKeyboard } from '@/lib/keyboard'
import {
  cyclePlaybackRate,
  type PlaybackSpeed,
} from '@/lib/playbackRate'

interface UsePlayerKeyboardOptions {
  videoRef: RefObject<HTMLMediaElement | null>
  containerRef: RefObject<HTMLDivElement | null>
  videoUrl: string
  speed: PlaybackSpeed
  volume: number
  muted: boolean
  applySpeed: (rate: PlaybackSpeed) => void
  applyVolume: (v: number, options?: { unmute?: boolean }) => void
  setMutedState: (muted: boolean) => void
  seekBy: (deltaSeconds: number) => void
}

export function usePlayerKeyboard({
  videoRef,
  containerRef,
  videoUrl,
  speed,
  volume,
  muted,
  applySpeed,
  applyVolume,
  setMutedState,
  seekBy,
}: UsePlayerKeyboardOptions) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shouldIgnorePlayerKeyboard(e)) return

      const el = videoRef.current
      if (!el || !videoUrl) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (el.paused) void el.play()
          else el.pause()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          void containerRef.current?.requestFullscreen?.()
          break
        case 'm':
        case 'M':
          e.preventDefault()
          if (el.muted) {
            if (volume === 0) applyVolume(0.5, { unmute: true })
            else setMutedState(false)
          } else {
            setMutedState(true)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          applyVolume(Math.min(1, volume + PLAYER.volumeStep), { unmute: true })
          break
        case 'ArrowDown': {
          e.preventDefault()
          const next = Math.max(0, volume - PLAYER.volumeStep)
          applyVolume(next)
          if (next === 0) setMutedState(true)
          break
        }
        case 'ArrowRight':
          e.preventDefault()
          seekBy(PLAYER.seekSeconds)
          break
        case 'ArrowLeft':
          e.preventDefault()
          seekBy(-PLAYER.seekSeconds)
          break
        case '<':
          e.preventDefault()
          applySpeed(cyclePlaybackRate(speed, 'down'))
          break
        case '>':
          e.preventDefault()
          applySpeed(cyclePlaybackRate(speed, 'up'))
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    videoUrl,
    speed,
    volume,
    muted,
    applySpeed,
    applyVolume,
    setMutedState,
    seekBy,
    videoRef,
    containerRef,
  ])
}
