/**
 * Demo Mode Indicator
 *
 * Shows a banner when the app is running in demo/development mode
 * or when using mock data. Helps users understand they're not seeing
 * real production data.
 */

import { useState, useEffect } from 'react'
import { X, Flask, Warning } from '@phosphor-icons/react'
import { isDemoMode, isDevelopment } from '@/lib/security-utils'
import { cn } from '@/lib/utils'

interface DemoModeIndicatorProps {
  className?: string
  variant?: 'banner' | 'badge' | 'floating'
  message?: string
  dismissible?: boolean
}

export function DemoModeIndicator({
  className,
  variant = 'banner',
  message,
  dismissible = true,
}: DemoModeIndicatorProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    // Check if we should show the indicator
    const isDemo = isDemoMode() || isDevelopment
    const wasDismissed = sessionStorage.getItem('flowsphere_demo_dismissed') === 'true'
    setShowIndicator(isDemo && !wasDismissed)
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    sessionStorage.setItem('flowsphere_demo_dismissed', 'true')
  }

  if (!showIndicator || isDismissed) {
    return null
  }

  const defaultMessage = isDevelopment
    ? 'Development Mode - Some features use mock data'
    : 'Demo Mode - Not connected to live services'

  if (variant === 'badge') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium',
          'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
          'rounded-full border border-amber-200 dark:border-amber-800',
          className
        )}
        role="status"
        aria-label="Demo mode active"
      >
        <Flask className="w-3 h-3" weight="fill" />
        <span>Demo</span>
      </div>
    )
  }

  if (variant === 'floating') {
    return (
      <div
        className={cn(
          'fixed bottom-4 right-4 z-50',
          'flex items-center gap-2 px-3 py-2',
          'bg-amber-500 text-white text-sm font-medium',
          'rounded-lg shadow-lg',
          'animate-in slide-in-from-bottom-2 duration-300',
          className
        )}
        role="status"
        aria-label="Demo mode active"
      >
        <Flask className="w-4 h-4" weight="fill" />
        <span>{message || 'Demo Mode'}</span>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="ml-1 p-0.5 hover:bg-amber-600 rounded"
            aria-label="Dismiss demo mode indicator"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  // Default: banner
  return (
    <div
      className={cn(
        'w-full py-2 px-4',
        'bg-gradient-to-r from-amber-500 to-orange-500',
        'text-white text-sm',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Warning className="w-4 h-4" weight="fill" />
          <span>{message || defaultMessage}</span>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Mock Data Indicator
 * Shows when specific data is mock/placeholder
 */
export function MockDataIndicator({
  dataType,
  className,
}: {
  dataType: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs text-muted-foreground',
        'py-1 px-2 bg-muted/50 rounded',
        className
      )}
      role="note"
    >
      <Flask className="w-3 h-3" />
      <span>Sample {dataType} - Connect real data source</span>
    </div>
  )
}

export default DemoModeIndicator
