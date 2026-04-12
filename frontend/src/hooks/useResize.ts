import { useCallback, useEffect, useRef, useState } from 'react'

interface UseResizeOptions {
  initialSize: number
  min: number
  max: number
  direction: 'horizontal-right' | 'horizontal-left'
}

/**
 * Returns [size, dragHandleProps].
 * direction='horizontal-right'  → dragging right increases size (sidebar)
 * direction='horizontal-left'   → dragging left increases size (chat panel)
 */
export function useResize({ initialSize, min, max, direction }: UseResizeOptions) {
  const [size, setSize] = useState(initialSize)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startSize = useRef(initialSize)

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      const next = direction === 'horizontal-right'
        ? startSize.current + delta
        : startSize.current - delta
      setSize(Math.min(max, Math.max(min, next)))
    },
    [direction, min, max],
  )

  const onMouseUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      startX.current = e.clientX
      startSize.current = size
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [size],
  )

  return { size, onMouseDown }
}
