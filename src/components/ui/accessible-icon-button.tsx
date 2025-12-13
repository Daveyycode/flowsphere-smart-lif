/**
 * Accessible Icon Button Component
 *
 * Wraps the standard Button component with automatic aria-label
 * for better screen reader support.
 *
 * Usage:
 * <IconButton icon={<Trash />} label="Delete item" onClick={handleDelete} />
 */

import { forwardRef, ReactNode } from 'react'
import { Button, buttonVariants } from './button'
import { cn } from '@/lib/utils'
import type { VariantProps } from 'class-variance-authority'

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** The icon to display */
  icon: ReactNode
  /** Accessible label for screen readers (required!) */
  label: string
  /** Optional visible tooltip */
  showTooltip?: boolean
  /** Is button in loading state */
  loading?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Icon-only button with required accessibility label
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { icon, label, showTooltip, loading, className, variant = 'ghost', size = 'icon', ...props },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn('relative', className)}
        aria-label={label}
        title={showTooltip ? label : undefined}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? (
          <span className="animate-spin" aria-hidden="true">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        ) : (
          <span aria-hidden="true">{icon}</span>
        )}
        <span className="sr-only">{label}</span>
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'

/**
 * Screen reader only text
 * Use for content that should only be read by screen readers
 */
export function ScreenReaderOnly({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>
}

/**
 * Visually hidden but focusable skip link
 * For keyboard navigation to skip to main content
 */
export function SkipLink({
  href = '#main-content',
  children = 'Skip to main content',
}: {
  href?: string
  children?: ReactNode
}) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {children}
    </a>
  )
}

/**
 * Live region for screen reader announcements
 * Updates will be announced to screen readers
 */
export function LiveRegion({
  children,
  mode = 'polite',
  atomic = true,
}: {
  children: ReactNode
  mode?: 'polite' | 'assertive'
  atomic?: boolean
}) {
  return (
    <div aria-live={mode} aria-atomic={atomic} className="sr-only">
      {children}
    </div>
  )
}

/**
 * Accessible loading indicator
 */
export function LoadingIndicator({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-label={label}>
      <svg
        className="animate-spin h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  )
}

/**
 * Progress bar with accessibility
 */
export function AccessibleProgress({
  value,
  max = 100,
  label,
}: {
  value: number
  max?: number
  label: string
}) {
  const percentage = Math.round((value / max) * 100)

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className="w-full bg-muted rounded-full h-2 overflow-hidden"
    >
      <div
        className="bg-primary h-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
      <span className="sr-only">
        {label}: {percentage}%
      </span>
    </div>
  )
}

export default IconButton
