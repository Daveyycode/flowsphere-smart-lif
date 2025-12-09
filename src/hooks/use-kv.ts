import { useState, useEffect, useCallback } from 'react'

/**
 * Custom useKV hook that persists state to localStorage
 * This replaces @github/spark/hooks useKV for deployment outside GitHub Spark
 */
export function useKV<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state from localStorage or default value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return defaultValue
    }
  })

  // Update localStorage when value changes
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue(prev => {
          // Allow value to be a function (like useState)
          const valueToStore = value instanceof Function ? value(prev) : value

          // Save to localStorage
          window.localStorage.setItem(key, JSON.stringify(valueToStore))

          return valueToStore
        })
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key]
  )

  // Listen for changes from other tabs (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch (error) {
          console.error(`Error parsing localStorage key "${key}":`, error)
        }
      }
    }

    // Listen for storage events from other tabs only
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [key])

  return [storedValue, setValue]
}
