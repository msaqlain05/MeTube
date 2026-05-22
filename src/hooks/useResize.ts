import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

type ResizeDirection = 'horizontal' | 'vertical'

interface UseResizeOptions {
  direction: ResizeDirection
  initial: number
  min: number
  max: number
  storageKey?: string
  step?: number
  getMax?: () => number
  getMin?: () => number
  getSizeFromPointer?: (e: PointerEvent) => number
  /** Update CSS variable on this element during drag (avoids React re-renders per frame) */
  cssVarTargetRef?: RefObject<HTMLElement | null>
  cssVarName?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function readStored(key: string, fallback: number, min: number, max: number) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return clamp(parseInt(raw, 10), min, max)
  } catch {
    /* ignore */
  }
  return fallback
}

export function useResize({
  direction,
  initial,
  min,
  max,
  storageKey,
  step = 20,
  getMax,
  getMin,
  getSizeFromPointer,
  cssVarTargetRef,
  cssVarName,
}: UseResizeOptions) {
  const [size, setSize] = useState(() =>
    storageKey ? readStored(storageKey, initial, min, max) : initial,
  )
  const [dragging, setDragging] = useState(false)
  const sizeRef = useRef(size)
  const getMaxRef = useRef(getMax)
  const getMinRef = useRef(getMin)
  const getSizeFromPointerRef = useRef(getSizeFromPointer)
  const rafRef = useRef(0)

  useEffect(() => {
    sizeRef.current = size
  }, [size])

  useEffect(() => {
    getMaxRef.current = getMax
  }, [getMax])

  useEffect(() => {
    getMinRef.current = getMin
  }, [getMin])

  useEffect(() => {
    getSizeFromPointerRef.current = getSizeFromPointer
  }, [getSizeFromPointer])

  const bounds = useCallback(() => {
    const capMax = getMaxRef.current ? getMaxRef.current() : max
    const floorMin = getMinRef.current ? getMinRef.current() : min
    const hi = Math.max(floorMin, capMax)
    const lo = Math.min(floorMin, hi)
    return { min: lo, max: hi }
  }, [min, max])

  const writeCssVar = useCallback(
    (value: number) => {
      if (!cssVarName || !cssVarTargetRef?.current) return
      cssVarTargetRef.current.style.setProperty(cssVarName, `${value}px`)
    },
    [cssVarName, cssVarTargetRef],
  )

  const applySize = useCallback(
    (next: number, options?: { persist?: boolean; syncState?: boolean }) => {
      const { min: lo, max: hi } = bounds()
      const clamped = clamp(next, lo, hi)
      sizeRef.current = clamped
      writeCssVar(clamped)
      if (options?.syncState !== false) {
        setSize(clamped)
      }
      if (options?.persist && storageKey) {
        try {
          localStorage.setItem(storageKey, String(clamped))
        } catch {
          /* ignore */
        }
      }
    },
    [bounds, storageKey, writeCssVar],
  )

  const clampCurrent = useCallback(() => {
    applySize(sizeRef.current, { persist: true })
  }, [applySize])

  useEffect(() => {
    const onWindowResize = () => clampCurrent()
    window.addEventListener('resize', onWindowResize)
    return () => window.removeEventListener('resize', onWindowResize)
  }, [clampCurrent])

  useEffect(() => {
    writeCssVar(size)
  }, [size, writeCssVar])

  const nudge = useCallback(
    (delta: number) => {
      applySize(sizeRef.current + delta, { persist: true })
    },
    [applySize],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault()
      const el = e.currentTarget
      el.setPointerCapture(e.pointerId)

      const startPos = direction === 'horizontal' ? e.clientX : e.clientY
      const startSize = sizeRef.current
      const usePosition = !!getSizeFromPointerRef.current

      const cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
      document.body.style.cursor = cursor
      document.body.style.userSelect = 'none'
      document.body.classList.add('is-resizing')
      setDragging(true)

      const flush = (ev: PointerEvent) => {
        let next: number
        if (usePosition && getSizeFromPointerRef.current) {
          next = getSizeFromPointerRef.current(ev)
        } else {
          const delta =
            direction === 'horizontal'
              ? ev.clientX - startPos
              : ev.clientY - startPos
          next = startSize + delta
        }
        applySize(next, { syncState: false })
      }

      const onMove = (ev: PointerEvent) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0
          flush(ev)
        })
      }

      const end = () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = 0
        }
        el.releasePointerCapture(e.pointerId)
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', end)
        document.removeEventListener('pointercancel', end)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.body.classList.remove('is-resizing')
        setDragging(false)
        applySize(sizeRef.current, { persist: true, syncState: true })
      }

      flush(e.nativeEvent)
      document.addEventListener('pointermove', onMove, { passive: true })
      document.addEventListener('pointerup', end)
      document.addEventListener('pointercancel', end)
    },
    [direction, applySize],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const shrinkPanel =
        direction === 'horizontal'
          ? e.key === 'ArrowLeft'
          : e.key === 'ArrowUp'
      const growPanel =
        direction === 'horizontal'
          ? e.key === 'ArrowRight'
          : e.key === 'ArrowDown'

      if (shrinkPanel) {
        e.preventDefault()
        nudge(-step)
      } else if (growPanel) {
        e.preventDefault()
        nudge(step)
      } else if (e.key === 'Home') {
        e.preventDefault()
        const { max: hi } = bounds()
        applySize(hi, { persist: true })
      } else if (e.key === 'End') {
        e.preventDefault()
        const { min: lo } = bounds()
        applySize(lo, { persist: true })
      }
    },
    [direction, step, nudge, applySize, bounds],
  )

  const reset = useCallback(() => {
    applySize(initial, { persist: true })
  }, [initial, applySize])

  return { size, setSize: applySize, dragging, onPointerDown, onKeyDown, reset, nudge }
}
