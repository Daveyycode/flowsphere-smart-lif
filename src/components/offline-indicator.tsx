import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiSlash, CloudArrowUp, Check, Warning } from '@phosphor-icons/react'
import { getOfflineSync } from '@/lib/offline-sync'
import { cn } from '@/lib/utils'

interface OfflineStatus {
  isOnline: boolean
  lastSynced: number | null
  pendingSyncs: number
  syncInProgress: boolean
}

export function OfflineIndicator() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSynced: null,
    pendingSyncs: 0,
    syncInProgress: false
  })
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const offlineSync = getOfflineSync()

    // Initialize
    offlineSync.initialize().then(async () => {
      const pendingCount = await offlineSync.getPendingSyncCount()
      setStatus({
        ...offlineSync.getStatus(),
        pendingSyncs: pendingCount
      })
    })

    // Subscribe to updates
    const unsubscribe = offlineSync.subscribe((newStatus) => {
      setStatus(newStatus)
    })

    // Also listen to native online/offline events
    const handleOnline = () => setStatus(s => ({ ...s, isOnline: true }))
    const handleOffline = () => setStatus(s => ({ ...s, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const formatLastSynced = (timestamp: number | null): string => {
    if (!timestamp) return 'Never'
    const diff = Date.now() - timestamp
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  // Don't show anything if online and synced
  if (status.isOnline && status.pendingSyncs === 0 && !status.syncInProgress) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all",
          status.isOnline
            ? status.syncInProgress
              ? "bg-blue-500/20 text-blue-500"
              : status.pendingSyncs > 0
                ? "bg-yellow-500/20 text-yellow-500"
                : "bg-green-500/20 text-green-500"
            : "bg-red-500/20 text-red-500"
        )}
      >
        {status.isOnline ? (
          status.syncInProgress ? (
            <>
              <CloudArrowUp className="w-3.5 h-3.5 animate-pulse" weight="fill" />
              <span>Syncing...</span>
            </>
          ) : status.pendingSyncs > 0 ? (
            <>
              <Warning className="w-3.5 h-3.5" weight="fill" />
              <span>{status.pendingSyncs} pending</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" weight="bold" />
              <span>Synced</span>
            </>
          )
        ) : (
          <>
            <WifiSlash className="w-3.5 h-3.5" weight="fill" />
            <span>Offline</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 w-56 bg-popover border rounded-lg shadow-lg p-3 z-50"
          >
            <h4 className="font-medium text-sm mb-2">Sync Status</h4>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connection</span>
                <span className={status.isOnline ? 'text-green-500' : 'text-red-500'}>
                  {status.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Last synced</span>
                <span>{formatLastSynced(status.lastSynced)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending changes</span>
                <span>{status.pendingSyncs}</span>
              </div>
            </div>

            {!status.isOnline && (
              <p className="mt-3 text-xs text-muted-foreground bg-muted p-2 rounded">
                Changes will sync automatically when you're back online.
              </p>
            )}

            {status.isOnline && status.pendingSyncs > 0 && !status.syncInProgress && (
              <button
                onClick={() => getOfflineSync().syncPendingChanges()}
                className="mt-3 w-full text-xs bg-primary text-primary-foreground py-1.5 rounded hover:opacity-90"
              >
                Sync Now
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
