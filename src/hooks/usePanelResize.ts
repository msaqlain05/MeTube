import { useMemo, useRef } from 'react'
import { LAYOUT } from '@/lib/constants'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useResize } from '@/hooks/useResize'

export function usePanelResize() {
  const bodyRef = useRef<HTMLDivElement>(null)
  const isStackedPortrait = useMediaQuery(
    '(max-width: 768px) and (orientation: portrait)',
  )
  const useSideResize = !isStackedPortrait

  const railBounds = useMemo(
    () => () => {
      if (typeof window === 'undefined') {
        return { min: LAYOUT.railMin, max: LAYOUT.railMax }
      }
      const maxByVideo = window.innerWidth - LAYOUT.videoMinWidth - 16
      const maxByRatio = Math.floor(window.innerWidth * 0.75)
      const max = Math.max(
        LAYOUT.railMin,
        Math.min(LAYOUT.railMax, maxByVideo, maxByRatio),
      )
      return { min: LAYOUT.railMin, max }
    },
    [],
  )

  const stackedBounds = useMemo(
    () => () => {
      if (typeof window === 'undefined') {
        return {
          min: LAYOUT.stackedPlaylistMin,
          max: LAYOUT.stackedPlaylistMax,
        }
      }
      const maxByVideo = window.innerHeight - LAYOUT.videoMinHeight - 100
      const maxByRatio = Math.floor(window.innerHeight * 0.75)
      const max = Math.max(
        LAYOUT.stackedPlaylistMin,
        Math.min(LAYOUT.stackedPlaylistMax, maxByVideo, maxByRatio),
      )
      return { min: LAYOUT.stackedPlaylistMin, max }
    },
    [],
  )

  const railResize = useResize({
    direction: 'horizontal',
    initial: LAYOUT.railDefault,
    min: LAYOUT.railMin,
    max: LAYOUT.railMax,
    storageKey: 'cineflow-rail-width',
    step: 16,
    cssVarTargetRef: bodyRef,
    cssVarName: '--rail-width',
    getMax: () => railBounds().max,
    getMin: () => railBounds().min,
    getSizeFromPointer: (ev) => {
      const body = bodyRef.current
      if (!body) return LAYOUT.railDefault
      return body.getBoundingClientRect().right - ev.clientX
    },
  })

  const stackedResize = useResize({
    direction: 'vertical',
    initial: LAYOUT.stackedPlaylistDefault,
    min: LAYOUT.stackedPlaylistMin,
    max: LAYOUT.stackedPlaylistMax,
    storageKey: 'cineflow-stacked-playlist-height',
    step: 16,
    cssVarTargetRef: bodyRef,
    cssVarName: '--playlist-height',
    getMax: () => stackedBounds().max,
    getMin: () => stackedBounds().min,
    getSizeFromPointer: (ev) => {
      const body = bodyRef.current
      if (!body) return LAYOUT.stackedPlaylistDefault
      return body.getBoundingClientRect().bottom - ev.clientY
    },
  })

  const bodyStyle = {
    '--rail-width': `${railResize.size}px`,
    '--playlist-height': `${stackedResize.size}px`,
  } as React.CSSProperties

  const bodyClassName = [
    'app__body',
    isStackedPortrait ? 'app__body--stacked' : '',
    railResize.dragging || stackedResize.dragging ? 'app__body--resizing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const activeResize = useSideResize ? railResize : stackedResize

  return {
    bodyRef,
    bodyStyle,
    bodyClassName,
    isStackedPortrait,
    useSideResize,
    railResize,
    stackedResize,
    activeResize,
    isResizing: railResize.dragging || stackedResize.dragging,
  }
}
