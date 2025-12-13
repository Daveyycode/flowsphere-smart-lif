/**
 * Skeleton Loaders for FlowSphere
 *
 * Pre-built skeleton components for common UI patterns
 * to prevent layout shift during loading
 */

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/**
 * Base skeleton animation component
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted/60', className)} aria-hidden="true" />
  )
}

/**
 * Card skeleton for dashboard cards
 */
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('rounded-lg border bg-card p-6 space-y-4', className)}
      aria-label="Loading content"
      role="progressbar"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

/**
 * List item skeleton
 */
export function ListItemSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-4 p-4 border-b', className)} aria-hidden="true">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-16 rounded" />
    </div>
  )
}

/**
 * Table row skeleton
 */
export function TableRowSkeleton({ columns = 4, className }: SkeletonProps & { columns?: number }) {
  return (
    <tr className={className} aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/**
 * Message/Chat skeleton
 */
export function MessageSkeleton({ isOwn = false, className }: SkeletonProps & { isOwn?: boolean }) {
  return (
    <div
      className={cn('flex gap-3', isOwn ? 'flex-row-reverse' : '', className)}
      aria-hidden="true"
    >
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className={cn('space-y-2', isOwn ? 'items-end' : '')}>
        <Skeleton className="h-4 w-20" />
        <Skeleton className={cn('h-16 rounded-lg', isOwn ? 'w-48' : 'w-64')} />
      </div>
    </div>
  )
}

/**
 * Email list skeleton
 */
export function EmailListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1" aria-label="Loading emails" role="progressbar">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border-b">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Device card skeleton
 */
export function DeviceCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-xl border p-4 space-y-3', className)} aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  )
}

/**
 * Profile skeleton
 */
export function ProfileSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-4', className)} aria-hidden="true">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

/**
 * Dashboard stats skeleton
 */
export function DashboardStatsSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}
      aria-label="Loading statistics"
      role="progressbar"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * CCTV feed skeleton
 */
export function CCTVFeedSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('aspect-video rounded-lg overflow-hidden relative', className)}
      aria-hidden="true"
    >
      <Skeleton className="absolute inset-0" />
      <div className="absolute bottom-2 left-2 right-2 flex justify-between">
        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-5 w-16 rounded" />
      </div>
    </div>
  )
}

/**
 * Notification skeleton
 */
export function NotificationSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('flex gap-3 p-3 border-b', className)} aria-hidden="true">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

/**
 * Settings section skeleton
 */
export function SettingsSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-6', className)} aria-label="Loading settings" role="progressbar">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Full page loading skeleton
 */
export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6" aria-label="Loading page" role="progressbar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4 space-y-4">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
        <div className="border rounded-lg p-4 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export default Skeleton
