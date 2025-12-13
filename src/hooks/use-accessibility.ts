/**
 * React Hooks for Accessibility
 *
 * Provides hooks for:
 * - Screen reader announcements
 * - Keyboard shortcuts
 * - Focus management
 * - Reduced motion preferences
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import {
  initializeLiveRegions,
  initializeKeyboardNavigation,
  announce,
  announceForKids,
  registerShortcut,
  setKeyboardScope,
  trapFocus,
  focusElement,
  prefersReducedMotion,
  onReducedMotionChange,
  rovingTabIndex,
  type KeyboardShortcut,
  type AnnouncementPriority,
  type FocusTrapOptions,
} from '@/lib/accessibility'

// ============================================
// Initialize Accessibility on App Mount
// ============================================

let initialized = false

/**
 * Hook to initialize accessibility features
 * Call this once in your App component
 */
export function useAccessibilityInit(): void {
  useEffect(() => {
    if (!initialized) {
      initializeLiveRegions()
      initializeKeyboardNavigation()
      initialized = true
    }
  }, [])
}

// ============================================
// Screen Reader Announcements
// ============================================

/**
 * Hook for screen reader announcements
 */
export function useAnnounce() {
  const announceMessage = useCallback(
    (message: string, priority: AnnouncementPriority = 'polite') => {
      announce(message, priority)
    },
    []
  )

  const announceKids = useCallback((message: string, isUrgent = false) => {
    announceForKids(message, isUrgent)
  }, [])

  return { announce: announceMessage, announceForKids: announceKids }
}

// ============================================
// Keyboard Shortcuts
// ============================================

/**
 * Hook to register keyboard shortcuts
 */
export function useKeyboardShortcut(
  shortcut: Omit<KeyboardShortcut, 'action'>,
  action: () => void,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const unregister = registerShortcut({ ...shortcut, action })
    return unregister
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/**
 * Hook to register multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: Array<Omit<KeyboardShortcut, 'action'> & { action: () => void }>,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const unregisters = shortcuts.map(shortcut => registerShortcut(shortcut))
    return () => unregisters.forEach(fn => fn())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/**
 * Hook to set keyboard scope when component mounts
 */
export function useKeyboardScope(scope: string): void {
  useEffect(() => {
    const previousScope = scope
    setKeyboardScope(scope)
    return () => setKeyboardScope(previousScope)
  }, [scope])
}

// ============================================
// Focus Management
// ============================================

/**
 * Hook for focus trapping in modals/dialogs
 */
export function useFocusTrap(
  isActive: boolean,
  options: FocusTrapOptions = {}
): React.RefObject<HTMLDivElement> {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (isActive && containerRef.current) {
      cleanupRef.current = trapFocus(containerRef.current, options)
    }

    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [isActive, options])

  return containerRef
}

/**
 * Hook to focus an element on mount
 */
export function useFocusOnMount(ref: React.RefObject<HTMLElement>, announcement?: string): void {
  useEffect(() => {
    if (ref.current) {
      focusElement(ref.current, announcement)
    }
  }, [ref, announcement])
}

/**
 * Hook to return focus to previous element on unmount
 */
export function useReturnFocus(): void {
  const previousElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousElement.current = document.activeElement as HTMLElement

    return () => {
      previousElement.current?.focus()
    }
  }, [])
}

// ============================================
// Roving Tab Index
// ============================================

/**
 * Hook for roving tabindex in toolbars/menus
 */
export function useRovingTabIndex(
  selector: string,
  options: { orientation?: 'horizontal' | 'vertical'; loop?: boolean } = {}
): React.RefObject<HTMLDivElement> {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      return rovingTabIndex(containerRef.current, selector, options)
    }
  }, [selector, options])

  return containerRef
}

// ============================================
// Reduced Motion
// ============================================

/**
 * Hook to check if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion)

  useEffect(() => {
    return onReducedMotionChange(setReducedMotion)
  }, [])

  return reducedMotion
}

// ============================================
// ARIA Live Region for Dynamic Content
// ============================================

/**
 * Hook for managing dynamic content announcements
 * Useful for chat messages, notifications, etc.
 */
export function useLiveRegion(isKidsMode = false) {
  const lastAnnouncedRef = useRef<string>('')

  const announceNew = useCallback(
    (message: string, priority: AnnouncementPriority = 'polite') => {
      // Avoid duplicate announcements
      if (message !== lastAnnouncedRef.current) {
        lastAnnouncedRef.current = message
        if (isKidsMode) {
          announceForKids(message, priority === 'assertive')
        } else {
          announce(message, priority)
        }
      }
    },
    [isKidsMode]
  )

  const announceListUpdate = useCallback(
    (itemCount: number, itemType: string) => {
      const message = `${itemCount} ${itemType}${itemCount !== 1 ? 's' : ''}`
      announceNew(message)
    },
    [announceNew]
  )

  return { announceNew, announceListUpdate }
}

// ============================================
// Keyboard Navigation State
// ============================================

/**
 * Hook to track if user is navigating with keyboard
 */
export function useKeyboardNavigation(): boolean {
  const [isKeyboardNav, setIsKeyboardNav] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardNav(true)
      }
    }

    const handleMouseDown = () => {
      setIsKeyboardNav(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleMouseDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  return isKeyboardNav
}

// ============================================
// Form Accessibility
// ============================================

/**
 * Hook for accessible form error announcements
 */
export function useFormAccessibility() {
  const { announce: announceMessage } = useAnnounce()

  const announceError = useCallback(
    (fieldName: string, error: string) => {
      announceMessage(`Error in ${fieldName}: ${error}`, 'assertive')
    },
    [announceMessage]
  )

  const announceSuccess = useCallback(
    (message: string) => {
      announceMessage(message, 'polite')
    },
    [announceMessage]
  )

  const announceFieldFocus = useCallback(
    (fieldName: string, instructions?: string) => {
      const message = instructions ? `${fieldName}. ${instructions}` : fieldName
      announceMessage(message, 'polite')
    },
    [announceMessage]
  )

  return { announceError, announceSuccess, announceFieldFocus }
}
