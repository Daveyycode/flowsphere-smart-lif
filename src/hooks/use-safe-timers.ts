/**
 * Safe Timer Hooks for FlowSphere
 *
 * Prevents memory leaks by automatically cleaning up timers
 * when components unmount.
 *
 * Usage:
 *   const { setTimeout, setInterval, clearAll } = useSafeTimers()
 *   setTimeout(() => console.log('safe!'), 1000)
 */

import { useRef, useEffect, useCallback, useState } from 'react'

interface TimerRefs {
  timeouts: Set<NodeJS.Timeout>
  intervals: Set<NodeJS.Timeout>
}

/**
 * Hook that provides safe setTimeout and setInterval
 * All timers are automatically cleared on unmount
 */
export function useSafeTimers() {
  const timersRef = useRef<TimerRefs>({
    timeouts: new Set(),
    intervals: new Set(),
  })

  // Cleanup on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.timeouts.forEach(id => clearTimeout(id))
      timers.intervals.forEach(id => clearInterval(id))
      timers.timeouts.clear()
      timers.intervals.clear()
    }
  }, [])

  const safeSetTimeout = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const id = setTimeout(() => {
      timersRef.current.timeouts.delete(id)
      callback()
    }, delay)
    timersRef.current.timeouts.add(id)
    return id
  }, [])

  const safeClearTimeout = useCallback((id: NodeJS.Timeout) => {
    clearTimeout(id)
    timersRef.current.timeouts.delete(id)
  }, [])

  const safeSetInterval = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const id = setInterval(callback, delay)
    timersRef.current.intervals.add(id)
    return id
  }, [])

  const safeClearInterval = useCallback((id: NodeJS.Timeout) => {
    clearInterval(id)
    timersRef.current.intervals.delete(id)
  }, [])

  const clearAll = useCallback(() => {
    timersRef.current.timeouts.forEach(id => clearTimeout(id))
    timersRef.current.intervals.forEach(id => clearInterval(id))
    timersRef.current.timeouts.clear()
    timersRef.current.intervals.clear()
  }, [])

  return {
    setTimeout: safeSetTimeout,
    clearTimeout: safeClearTimeout,
    setInterval: safeSetInterval,
    clearInterval: safeClearInterval,
    clearAll,
  }
}

/**
 * Hook for debounced values
 * Automatically cleans up on unmount
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for throttled callbacks
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    ((...args: unknown[]) => {
      const now = Date.now()
      const timeSinceLastCall = now - lastCall.current

      if (timeSinceLastCall >= delay) {
        lastCall.current = now
        callback(...args)
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now()
          callback(...args)
        }, delay - timeSinceLastCall)
      }
    }) as T,
    [callback, delay]
  )
}

/**
 * Hook for countdown timer
 */
export function useCountdown(
  initialSeconds: number,
  options?: {
    onComplete?: () => void
    autoStart?: boolean
  }
) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(options?.autoStart ?? false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const start = useCallback(() => {
    setIsRunning(true)
  }, [])

  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    setSecondsLeft(initialSeconds)
    setIsRunning(false)
  }, [initialSeconds])

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            options?.onComplete?.()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, secondsLeft, options])

  return {
    secondsLeft,
    isRunning,
    start,
    pause,
    reset,
    formattedTime: formatTime(secondsLeft),
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default useSafeTimers
