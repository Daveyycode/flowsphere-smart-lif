import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Supabase-powered storage hook that replaces localStorage
 * Features:
 * - Syncs data to Supabase database (cloud storage)
 * - Falls back to localStorage when offline
 * - Automatically syncs when back online
 * - Same interface as useKV for easy migration
 */

interface SupabaseStorageOptions {
  table: string
  column?: string
  enableRealtime?: boolean
}

export function useSupabaseStorage<T>(
  key: string,
  defaultValue: T,
  options?: SupabaseStorageOptions
): [T, (value: T | ((prev: T) => T)) => Promise<void>, boolean] {
  const [storedValue, setStoredValue] = useState<T>(defaultValue)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const table = options?.table || 'user_data'
  const column = options?.column || 'data'

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load initial data from Supabase or localStorage
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // No user logged in, use localStorage
        try {
          const item = window.localStorage.getItem(key)
          if (item) {
            setStoredValue(JSON.parse(item))
          }
        } catch (error) {
          console.error(`Error reading localStorage key "${key}":`, error)
        }
        setIsLoading(false)
        return
      }

      // Try to load from Supabase
      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select(column)
            .eq('user_id', user.id)
            .eq('key', key)
            .single()

          if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows found, which is OK
            console.error(`Error loading from Supabase:`, error)
          }

          if (data && data[column]) {
            const parsedData = typeof data[column] === 'string'
              ? JSON.parse(data[column])
              : data[column]
            setStoredValue(parsedData)
            // Also save to localStorage as cache
            window.localStorage.setItem(key, JSON.stringify(parsedData))
          } else {
            // No data in Supabase, check localStorage
            const item = window.localStorage.getItem(key)
            if (item) {
              setStoredValue(JSON.parse(item))
            }
          }
        } catch (error) {
          console.error(`Error loading data:`, error)
          // Fallback to localStorage
          try {
            const item = window.localStorage.getItem(key)
            if (item) {
              setStoredValue(JSON.parse(item))
            }
          } catch (e) {
            console.error(`Error reading localStorage:`, e)
          }
        }
      } else {
        // Offline, use localStorage
        try {
          const item = window.localStorage.getItem(key)
          if (item) {
            setStoredValue(JSON.parse(item))
          }
        } catch (error) {
          console.error(`Error reading localStorage:`, error)
        }
      }

      setIsLoading(false)
    }

    loadData()
  }, [key, table, column, isOnline])

  // Subscribe to realtime changes if enabled
  useEffect(() => {
    if (!options?.enableRealtime) return

    const channel = supabase
      .channel(`${table}:${key}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `key=eq.${key}`
        },
        (payload) => {
          if (payload.new && payload.new[column]) {
            try {
              const parsedData = typeof payload.new[column] === 'string'
                ? JSON.parse(payload.new[column])
                : payload.new[column]
              setStoredValue(parsedData)
              window.localStorage.setItem(key, JSON.stringify(parsedData))
            } catch (error) {
              console.error(`Error parsing realtime data for key "${key}":`, error)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [key, table, column, options?.enableRealtime])

  // Save value to both Supabase and localStorage
  const setValue = useCallback(
    async (value: T | ((prev: T) => T)) => {
      try {
        // Calculate new value
        const valueToStore = value instanceof Function ? value(storedValue) : value

        // Update state immediately (optimistic update)
        setStoredValue(valueToStore)

        // Save to localStorage immediately (works offline)
        window.localStorage.setItem(key, JSON.stringify(valueToStore))

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          // Not logged in, only use localStorage
          return
        }

        // Save to Supabase if online
        if (isOnline) {
          try {
            const { error } = await supabase
              .from(table)
              .upsert(
                {
                  user_id: user.id,
                  key: key,
                  [column]: JSON.stringify(valueToStore),
                  updated_at: new Date().toISOString()
                },
                {
                  onConflict: 'user_id,key'
                }
              )

            if (error) {
              console.error(`Error saving to Supabase:`, error)
            }
          } catch (error) {
            console.error(`Error saving to Supabase:`, error)
          }
        }

        // Dispatch custom event for cross-tab sync
        window.dispatchEvent(
          new CustomEvent('local-storage', {
            detail: { key, value: valueToStore }
          })
        )
      } catch (error) {
        console.error(`Error setting value:`, error)
      }
    },
    [key, storedValue, table, column, isOnline]
  )

  return [storedValue, setValue, isLoading]
}

// Helper to create a table-specific storage hook
export function createStorageHook<T>(
  table: string,
  options?: Omit<SupabaseStorageOptions, 'table'>
) {
  return (key: string, defaultValue: T) =>
    useSupabaseStorage(key, defaultValue, { table, ...options })
}

// Pre-configured hooks for each table
export const useMeetingsStorage = createStorageHook('meetings')
export const useMessagesStorage = createStorageHook('messages', { enableRealtime: true })
export const useVaultStorage = createStorageHook('vault_items')
export const useCalendarStorage = createStorageHook('calendar_events', { enableRealtime: true })
export const useTasksStorage = createStorageHook('tasks')
export const useVoiceMemosStorage = createStorageHook('voice_memos')
