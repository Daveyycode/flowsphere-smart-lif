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
        // Allow value to be a function (like useState)
        const valueToStore = value instanceof Function ? value(storedValue) : value

        setStoredValue(valueToStore)

        // Save to localStorage
        window.localStorage.setItem(key, JSON.stringify(valueToStore))

        // Dispatch custom event for cross-tab synchronization
        window.dispatchEvent(
          new CustomEvent('local-storage', {
            detail: { key, value: valueToStore }
          })
        )
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue]
  )

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      if ('detail' in e && e.detail.key === key) {
        setStoredValue(e.detail.value)
      } else if ('key' in e && e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch (error) {
          console.error(`Error parsing localStorage key "${key}":`, error)
        }
      }
    }

    // Listen for storage events from other tabs
    window.addEventListener('storage', handleStorageChange as EventListener)
    // Listen for custom events from same tab
    window.addEventListener('local-storage', handleStorageChange as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange as EventListener)
      window.removeEventListener('local-storage', handleStorageChange as EventListener)
    }
  }, [key])

  return [storedValue, setValue]
}
