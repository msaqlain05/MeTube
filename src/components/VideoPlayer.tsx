import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Settings,
  Maximize,
  Gauge,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react'
import { PLAYER } from '@/lib/constants'
import { usePlayerKeyboard } from '@/hooks/usePlayerKeyboard'
import {
  PLAYBACK_SPEEDS,
  type PlaybackSpeed,
  formatPlaybackSpeed,
  loadPlaybackRate,
  savePlaybackRate,
  loadVolume,
  saveVolume,
  loadMuted,
  saveMuted,
} from '@/lib/playbackRate'
import { formatDuration } from '@/lib/videoUtils'
import type { VideoItem } from '@/types/video'

interface VideoPlayerProps {
  video: VideoItem
  initialPosition?: number | null
  onWatchProgress?: (position: number, duration: number, force?: boolean) => void
  onEnded: () => void
}

type SettingsView = 'main' | 'speed'

function reportWatchProgress(
  el: HTMLVideoElement,
  report: VideoPlayerProps['onWatchProgress'],
  force?: boolean,
) {
  if (report && Number.isFinite(el.duration)) {
    report(el.currentTime, el.duration, force)
  }
}

export function VideoPlayer({
  video,
  initialPosition = null,
  onWatchProgress,
  onEnded,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLVideoElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onWatchProgressRef = useRef(onWatchProgress)
  const initialPositionRef = useRef(initialPosition)
  onWatchProgressRef.current = onWatchProgress
  initialPositionRef.current = initialPosition

  const [speed, setSpeed] = useState<PlaybackSpeed>(loadPlaybackRate)
  const [volume, setVolume] = useState(loadVolume)
  const [muted, setMuted] = useState(loadMuted)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsView, setSettingsView] = useState<SettingsView>('main')
  const [volumeOpen, setVolumeOpen] = useState(false)
  const [buffering, setBuffering] = useState(false)

  const speedRef = useRef(speed)
  const volumeRef = useRef(volume)
  const mutedRef = useRef(muted)
  speedRef.current = speed
  volumeRef.current = volume
  mutedRef.current = muted

  const applySpeed = useCallback((rate: PlaybackSpeed) => {
    setSpeed(rate)
    savePlaybackRate(rate)
    if (ref.current) ref.current.playbackRate = rate
  }, [])

  const setMutedState = useCallback((next: boolean) => {
    setMuted(next)
    saveMuted(next)
    if (ref.current) ref.current.muted = next
  }, [])

  const applyVolume = useCallback(
    (v: number, options?: { unmute?: boolean }) => {
      const vol = Math.max(0, Math.min(1, v))
      setVolume(vol)
      saveVolume(vol)
      const el = ref.current
      if (!el) return
      el.volume = vol
      const shouldUnmute = options?.unmute ?? vol > 0
      if (shouldUnmute && el.muted) {
        el.muted = false
        setMuted(false)
        saveMuted(false)
      }
    },
    [],
  )

  const revealControls = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (ref.current && !ref.current.paused && !settingsOpen && !volumeOpen) {
        setShowControls(false)
      }
    }, PLAYER.controlsHideMs)
  }, [settingsOpen, volumeOpen])

  const seekBy = useCallback(
    (deltaSeconds: number) => {
      const el = ref.current
      if (!el || !Number.isFinite(el.duration)) return
      const next = Math.max(0, Math.min(el.duration, el.currentTime + deltaSeconds))
      el.currentTime = next
      setCurrent(next)
      reportWatchProgress(el, onWatchProgressRef.current, true)
    },
    [],
  )

  usePlayerKeyboard({
    videoRef: ref,
    containerRef,
    videoUrl: video.url,
    speed,
    volume,
    muted,
    applySpeed,
    applyVolume,
    setMutedState,
    seekBy,
  })

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = speed
  }, [speed])

  /* Load video only when source changes */
  useEffect(() => {
    const el = ref.current
    if (!el || !video.url) return

    let disposed = false

    const onLoadedMetadata = () => {
      if (disposed) return
      setDuration(el.duration)
      el.playbackRate = speedRef.current
      el.volume = volumeRef.current
      el.muted = mutedRef.current

      const resumeAt = initialPositionRef.current
      if (
        resumeAt != null &&
        resumeAt > 0 &&
        Number.isFinite(el.duration) &&
        resumeAt < el.duration - 1
      ) {
        el.currentTime = resumeAt
        setCurrent(resumeAt)
      }
    }

    const onCanPlay = () => {
      if (disposed) return
      setBuffering(false)
      void el.play().catch(() => setPlaying(false))
      setPlaying(!el.paused)
    }

    let lastUiTick = 0
    const onTime = () => {
      const now = performance.now()
      if (now - lastUiTick >= 250) {
        lastUiTick = now
        setCurrent(el.currentTime)
      }
      reportWatchProgress(el, onWatchProgressRef.current)
    }

    const onWaiting = () => setBuffering(true)
    const onPlaying = () => setBuffering(false)

    const onPause = () => {
      setPlaying(false)
      reportWatchProgress(el, onWatchProgressRef.current, true)
    }

    const onPlay = () => setPlaying(true)

    const onEndedInternal = () => {
      reportWatchProgress(el, onWatchProgressRef.current, true)
      onEnded()
    }

    setBuffering(true)
    el.src = video.url
    el.load()
    el.addEventListener('loadedmetadata', onLoadedMetadata)
    el.addEventListener('canplay', onCanPlay, { once: true })
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('waiting', onWaiting)
    el.addEventListener('playing', onPlaying)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEndedInternal)

    return () => {
      disposed = true
      setBuffering(false)
      reportWatchProgress(el, onWatchProgressRef.current, true)
      el.removeEventListener('loadedmetadata', onLoadedMetadata)
      el.removeEventListener('canplay', onCanPlay)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('waiting', onWaiting)
      el.removeEventListener('playing', onPlaying)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEndedInternal)
    }
  }, [video.id, video.url, onEnded])

  useEffect(() => {
    const flush = () => {
      const el = ref.current
      if (el) reportWatchProgress(el, onWatchProgressRef.current, true)
    }
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [])

  const togglePlay = () => {
    const el = ref.current
    if (!el) return
    if (el.paused) el.play()
    else el.pause()
  }

  const seek = (value: number) => {
    const el = ref.current
    if (!el) return
    el.currentTime = value
    setCurrent(value)
    reportWatchProgress(el, onWatchProgressRef.current, true)
  }

  const toggleMute = () => {
    const next = !muted
    if (!next) {
      if (volume === 0) applyVolume(0.5, { unmute: true })
      else setMutedState(false)
    } else {
      setMutedState(true)
    }
  }

  const onVolumeSlider = (raw: number) => {
    const v = Math.max(0, Math.min(1, raw))
    applyVolume(v, { unmute: v > 0 })
    if (v === 0) setMutedState(true)
  }

  const qualityLabel = video.isAudio
    ? 'Audio'
    : video.resolution
      ? `Auto (${video.resolution})`
      : 'Auto'

  const VolumeIcon =
    muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <div
      ref={containerRef}
      className={`player${video.isAudio ? ' player--audio' : ''}${showControls || settingsOpen || volumeOpen ? ' player--controls-visible' : ''}${settingsOpen ? ' player--settings-open' : ''}`}
      onMouseMove={revealControls}
      onMouseLeave={() => {
        if (!settingsOpen && !volumeOpen && playing) setShowControls(false)
      }}
    >
      {video.isAudio && (
        <div className="player__audio-art" aria-hidden>
          {video.thumbnail ? (
            <img src={video.thumbnail} alt="" />
          ) : null}
        </div>
      )}

      <video
        ref={ref}
        className="player__video"
        playsInline
        preload="auto"
        onClick={togglePlay}
        aria-label={`Playing ${video.name}`}
      />

      {buffering && (
        <div className="player__buffering" aria-live="polite" aria-busy="true">
          <span className="player__buffering-spinner" />
        </div>
      )}

      <div className="player__chrome">
        <div className="player__progress-wrap">
          <div
            className="player__progress-buffered"
            style={{ width: duration ? `${(current / duration) * 100}%` : '0%' }}
          />
          <input
            type="range"
            className="player__progress"
            min={0}
            max={duration || 100}
            step={0.1}
            value={current}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
          />
        </div>

        <div className="player__bar">
          <div className="player__bar-left">
            <button
              type="button"
              className="player__icon-btn"
              onClick={togglePlay}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? (
                <Pause size={22} fill="currentColor" />
              ) : (
                <Play size={22} fill="currentColor" />
              )}
            </button>

            <div
              className="player__volume"
              onMouseEnter={() => setVolumeOpen(true)}
              onMouseLeave={() => setVolumeOpen(false)}
            >
              <button
                type="button"
                className="player__icon-btn"
                onClick={toggleMute}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                <VolumeIcon size={22} />
              </button>
              <button
                type="button"
                className="player__volume-expand"
                onClick={(e) => {
                  e.stopPropagation()
                  setVolumeOpen((o) => !o)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Volume"
                aria-expanded={volumeOpen}
              />
              {volumeOpen && (
                <div
                  className="player__volume-popup"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="range"
                    className="player__volume-slider"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(volume * 100)}
                    onInput={(e) =>
                      onVolumeSlider(
                        Number((e.target as HTMLInputElement).value) / 100,
                      )
                    }
                    aria-label="Volume"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(volume * 100)}
                    aria-valuetext={`${Math.round(volume * 100)} percent`}
                  />
                </div>
              )}
            </div>

            <span className="player__time">
              {formatDuration(current)} / {formatDuration(duration)}
            </span>
          </div>

          <div className="player__bar-right">
            <button
              type="button"
              className={`player__icon-btn${settingsOpen ? ' player__icon-btn--active' : ''}`}
              onClick={() => {
                setSettingsOpen((o) => !o)
                setSettingsView('main')
              }}
              aria-label="Settings"
              aria-expanded={settingsOpen}
            >
              <Settings size={22} />
            </button>

            <button
              type="button"
              className="player__icon-btn"
              onClick={() => containerRef.current?.requestFullscreen?.()}
              aria-label="Fullscreen"
            >
              <Maximize size={22} />
            </button>
          </div>
        </div>
      </div>

      {settingsOpen && (
        <div className="player__settings">
          {settingsView === 'main' ? (
            <div className="player__settings-panel">
              <button
                type="button"
                className="player__settings-row"
                onClick={() => setSettingsView('speed')}
              >
                <Gauge size={20} strokeWidth={1.75} />
                <span className="player__settings-label">Playback speed</span>
                <span className="player__settings-value">
                  {formatPlaybackSpeed(speed)}
                </span>
                <ChevronRight size={18} />
              </button>
              <div className="player__settings-row player__settings-row--volume">
                <Volume2 size={20} strokeWidth={1.75} />
                <span className="player__settings-label">Volume</span>
                <input
                  type="range"
                  className="player__settings-volume"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(volume * 100)}
                  onInput={(e) => {
                    e.stopPropagation()
                    onVolumeSlider(
                      Number((e.target as HTMLInputElement).value) / 100,
                    )
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Volume"
                />
                <span className="player__settings-value">
                  {muted ? 'Muted' : `${Math.round(volume * 100)}%`}
                </span>
              </div>
              <div className="player__settings-row player__settings-row--static">
                <SlidersHorizontal size={20} strokeWidth={1.75} />
                <span className="player__settings-label">Quality</span>
                <span className="player__settings-value">{qualityLabel}</span>
                <ChevronRight size={18} className="player__settings-chevron-dim" />
              </div>
            </div>
          ) : (
            <div className="player__settings-panel">
              <button
                type="button"
                className="player__settings-back"
                onClick={() => setSettingsView('main')}
              >
                <ChevronLeft size={20} />
                Playback speed
              </button>
              {PLAYBACK_SPEEDS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  className={`player__settings-row player__settings-row--option${speed === rate ? ' player__settings-row--active' : ''}`}
                  onClick={() => {
                    applySpeed(rate)
                    setSettingsView('main')
                  }}
                >
                  <span className="player__settings-label">{formatPlaybackSpeed(rate)}</span>
                  {speed === rate && <Check size={18} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
