/**
 * FlowSphere Offline Sync System
 * IndexedDB-based offline storage with automatic sync
 */

import { logger } from '@/lib/security-utils'

const DB_NAME = 'flowsphere-offline'
const DB_VERSION = 1

// Store names
const STORES = {
  MESSAGES: 'messages',
  TASKS: 'tasks',
  NOTES: 'notes',
  FAMILY: 'family',
  SYNC_QUEUE: 'syncQueue',
}

interface SyncQueueItem {
  id: string
  store: string
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: number
  retries: number
}

interface OfflineStatus {
  isOnline: boolean
  lastSynced: number | null
  pendingSyncs: number
  syncInProgress: boolean
}

class OfflineSyncManager {
  private db: IDBDatabase | null = null
  private isInitialized = false
  private syncInProgress = false
  private listeners: Array<(status: OfflineStatus) => void> = []
  private syncInterval: NodeJS.Timeout | null = null

  constructor() {
    this.setupNetworkListeners()
  }

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true

    return new Promise(resolve => {
      if (!('indexedDB' in window)) {
        logger.warn('IndexedDB not supported', null, 'OfflineSync')
        resolve(false)
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        logger.error('Failed to open IndexedDB', request.error, 'OfflineSync')
        resolve(false)
      }

      request.onsuccess = () => {
        this.db = request.result
        this.isInitialized = true
        logger.info('IndexedDB initialized', null, 'OfflineSync')

        // Start sync interval
        this.startSyncInterval()

        // Sync on initialization if online
        if (navigator.onLine) {
          this.syncPendingChanges()
        }

        resolve(true)
      }

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          const messagesStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' })
          messagesStore.createIndex('timestamp', 'timestamp')
          messagesStore.createIndex('contactId', 'contactId')
        }

        if (!db.objectStoreNames.contains(STORES.TASKS)) {
          const tasksStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' })
          tasksStore.createIndex('status', 'status')
          tasksStore.createIndex('dueDate', 'dueDate')
        }

        if (!db.objectStoreNames.contains(STORES.NOTES)) {
          const notesStore = db.createObjectStore(STORES.NOTES, { keyPath: 'id' })
          notesStore.createIndex('createdAt', 'createdAt')
        }

        if (!db.objectStoreNames.contains(STORES.FAMILY)) {
          db.createObjectStore(STORES.FAMILY, { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' })
          syncStore.createIndex('timestamp', 'timestamp')
        }
      }
    })
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      logger.info('Back online, syncing...', null, 'OfflineSync')
      this.notifyListeners()
      this.syncPendingChanges()
    })

    window.addEventListener('offline', () => {
      logger.info('Gone offline', null, 'OfflineSync')
      this.notifyListeners()
    })
  }

  /**
   * Start periodic sync interval
   */
  private startSyncInterval(): void {
    if (this.syncInterval) return

    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.syncPendingChanges()
      }
    }, 30000)
  }

  /**
   * Store data locally with sync queue
   */
  async store<T extends { id: string }>(
    storeName: string,
    data: T,
    action: 'create' | 'update' = 'create'
  ): Promise<boolean> {
    if (!this.db) {
      await this.initialize()
    }
    if (!this.db) return false

    return new Promise(resolve => {
      const transaction = this.db!.transaction([storeName, STORES.SYNC_QUEUE], 'readwrite')
      const store = transaction.objectStore(storeName)
      const syncQueue = transaction.objectStore(STORES.SYNC_QUEUE)

      // Store data locally
      const storeRequest = store.put(data)

      storeRequest.onsuccess = () => {
        // Add to sync queue
        const syncItem: SyncQueueItem = {
          id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          store: storeName,
          action,
          data,
          timestamp: Date.now(),
          retries: 0,
        }

        syncQueue.put(syncItem)
        this.notifyListeners()
        resolve(true)
      }

      storeRequest.onerror = () => {
        logger.error('Failed to store data', storeRequest.error, 'OfflineSync')
        resolve(false)
      }
    })
  }

  /**
   * Retrieve data from local store
   */
  async get<T>(storeName: string, id: string): Promise<T | null> {
    if (!this.db) {
      await this.initialize()
    }
    if (!this.db) return null

    return new Promise(resolve => {
      const transaction = this.db!.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => {
        logger.error('Failed to get data', request.error, 'OfflineSync')
        resolve(null)
      }
    })
  }

  /**
   * Get all items from a store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) {
      await this.initialize()
    }
    if (!this.db) return []

    return new Promise(resolve => {
      const transaction = this.db!.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => {
        logger.error('Failed to get all data', request.error, 'OfflineSync')
        resolve([])
      }
    })
  }

  /**
   * Delete data with sync queue
   */
  async delete(storeName: string, id: string): Promise<boolean> {
    if (!this.db) {
      await this.initialize()
    }
    if (!this.db) return false

    return new Promise(resolve => {
      const transaction = this.db!.transaction([storeName, STORES.SYNC_QUEUE], 'readwrite')
      const store = transaction.objectStore(storeName)
      const syncQueue = transaction.objectStore(STORES.SYNC_QUEUE)

      // Delete locally
      const deleteRequest = store.delete(id)

      deleteRequest.onsuccess = () => {
        // Add to sync queue
        const syncItem: SyncQueueItem = {
          id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          store: storeName,
          action: 'delete',
          data: { id },
          timestamp: Date.now(),
          retries: 0,
        }

        syncQueue.put(syncItem)
        this.notifyListeners()
        resolve(true)
      }

      deleteRequest.onerror = () => {
        logger.error('Failed to delete data', deleteRequest.error, 'OfflineSync')
        resolve(false)
      }
    })
  }

  /**
   * Sync pending changes to server
   */
  async syncPendingChanges(): Promise<{ synced: number; failed: number }> {
    if (!this.db || this.syncInProgress || !navigator.onLine) {
      return { synced: 0, failed: 0 }
    }

    this.syncInProgress = true
    this.notifyListeners()

    const result = { synced: 0, failed: 0 }

    try {
      const syncItems = await this.getSyncQueue()

      for (const item of syncItems) {
        try {
          const success = await this.syncItem(item)

          if (success) {
            await this.removeSyncQueueItem(item.id)
            result.synced++
          } else {
            item.retries++
            if (item.retries < 3) {
              await this.updateSyncQueueItem(item)
            } else {
              // Max retries reached, remove from queue
              await this.removeSyncQueueItem(item.id)
              result.failed++
            }
          }
        } catch (error) {
          logger.error('Sync item failed', error, 'OfflineSync')
          result.failed++
        }
      }

      // Update last synced time
      localStorage.setItem('flowsphere-last-sync', Date.now().toString())
    } catch (error) {
      logger.error('Sync failed', error, 'OfflineSync')
    } finally {
      this.syncInProgress = false
      this.notifyListeners()
    }

    return result
  }

  /**
   * Sync individual item to server
   */
  private async syncItem(item: SyncQueueItem): Promise<boolean> {
    // This would connect to your Supabase/backend
    // For now, we'll simulate successful sync
    // In production, implement actual API calls

    // Example implementation:
    // const { action, store, data } = item
    // switch (action) {
    //   case 'create':
    //     await supabase.from(store).insert(data)
    //     break
    //   case 'update':
    //     await supabase.from(store).update(data).eq('id', data.id)
    //     break
    //   case 'delete':
    //     await supabase.from(store).delete().eq('id', data.id)
    //     break
    // }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))

    // Return success (in production, check actual response)
    return true
  }

  /**
   * Get sync queue items
   */
  private async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) return []

    return new Promise(resolve => {
      const transaction = this.db!.transaction(STORES.SYNC_QUEUE, 'readonly')
      const store = transaction.objectStore(STORES.SYNC_QUEUE)
      const request = store.getAll()

      request.onsuccess = () => {
        // Sort by timestamp, oldest first
        const items = request.result || []
        items.sort((a: SyncQueueItem, b: SyncQueueItem) => a.timestamp - b.timestamp)
        resolve(items)
      }
      request.onerror = () => resolve([])
    })
  }

  /**
   * Remove item from sync queue
   */
  private async removeSyncQueueItem(id: string): Promise<void> {
    if (!this.db) return

    return new Promise(resolve => {
      const transaction = this.db!.transaction(STORES.SYNC_QUEUE, 'readwrite')
      const store = transaction.objectStore(STORES.SYNC_QUEUE)
      store.delete(id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => resolve()
    })
  }

  /**
   * Update sync queue item
   */
  private async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    if (!this.db) return

    return new Promise(resolve => {
      const transaction = this.db!.transaction(STORES.SYNC_QUEUE, 'readwrite')
      const store = transaction.objectStore(STORES.SYNC_QUEUE)
      store.put(item)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => resolve()
    })
  }

  /**
   * Get offline status
   */
  getStatus(): OfflineStatus {
    const lastSynced = localStorage.getItem('flowsphere-last-sync')
    return {
      isOnline: navigator.onLine,
      lastSynced: lastSynced ? parseInt(lastSynced) : null,
      pendingSyncs: 0, // Updated async
      syncInProgress: this.syncInProgress,
    }
  }

  /**
   * Get pending sync count
   */
  async getPendingSyncCount(): Promise<number> {
    const items = await this.getSyncQueue()
    return items.length
  }

  /**
   * Subscribe to status updates
   */
  subscribe(callback: (status: OfflineStatus) => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  /**
   * Notify all listeners
   */
  private async notifyListeners(): Promise<void> {
    const pendingSyncs = await this.getPendingSyncCount()
    const status: OfflineStatus = {
      isOnline: navigator.onLine,
      lastSynced: this.getStatus().lastSynced,
      pendingSyncs,
      syncInProgress: this.syncInProgress,
    }

    this.listeners.forEach(callback => {
      try {
        callback(status)
      } catch (error) {
        logger.error('Listener error', error, 'OfflineSync')
      }
    })
  }

  /**
   * Clear all offline data
   */
  async clearAll(): Promise<void> {
    if (!this.db) return

    const storeNames = Object.values(STORES)

    for (const storeName of storeNames) {
      await new Promise<void>(resolve => {
        const transaction = this.db!.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        store.clear()
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => resolve()
      })
    }

    localStorage.removeItem('flowsphere-last-sync')
    this.notifyListeners()
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.isInitialized = false
  }
}

// Singleton instance
let offlineSyncInstance: OfflineSyncManager | null = null

export function getOfflineSync(): OfflineSyncManager {
  if (!offlineSyncInstance) {
    offlineSyncInstance = new OfflineSyncManager()
  }
  return offlineSyncInstance
}

/**
 * React hook for offline sync
 */
export function useOfflineSync() {
  const manager = getOfflineSync()

  return {
    initialize: () => manager.initialize(),
    store: <T extends { id: string }>(storeName: string, data: T, action?: 'create' | 'update') =>
      manager.store(storeName, data, action),
    get: <T>(storeName: string, id: string) => manager.get<T>(storeName, id),
    getAll: <T>(storeName: string) => manager.getAll<T>(storeName),
    delete: (storeName: string, id: string) => manager.delete(storeName, id),
    sync: () => manager.syncPendingChanges(),
    getStatus: () => manager.getStatus(),
    getPendingCount: () => manager.getPendingSyncCount(),
    subscribe: (callback: (status: OfflineStatus) => void) => manager.subscribe(callback),
    clearAll: () => manager.clearAll(),
  }
}

// Store names export for use in components
export { STORES }
