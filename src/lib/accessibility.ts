/**
 * Accessibility Utilities for FlowSphere
 *
 * Provides comprehensive accessibility support including:
 * - Screen reader announcements (ARIA live regions)
 * - Keyboard navigation helpers
 * - Focus management
 * - Skip links
 * - Reduced motion detection
 *
 * @module accessibility
 */

// ============================================
// Types
// ============================================

export type AnnouncementPriority = 'polite' | 'assertive'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  description: string
  action: () => void
  scope?: string // e.g., 'global', 'tutor', 'messenger'
}

export interface FocusTrapOptions {
  initialFocus?: HTMLElement | string
  returnFocus?: boolean
  escapeDeactivates?: boolean
  onEscape?: () => void
}

// ============================================
// Screen Reader Announcements
// ============================================

let liveRegionPolite: HTMLElement | null = null
let liveRegionAssertive: HTMLElement | null = null

/**
 * Initialize ARIA live regions for screen reader announcements
 * Call this once when the app starts
 */
export function initializeLiveRegions(): void {
  if (typeof document === 'undefined') return

  // Check if already initialized
  if (document.getElementById('aria-live-polite')) return

  // Create polite announcer (for non-urgent updates)
  liveRegionPolite = document.createElement('div')
  liveRegionPolite.id = 'aria-live-polite'
  liveRegionPolite.setAttribute('role', 'status')
  liveRegionPolite.setAttribute('aria-live', 'polite')
  liveRegionPolite.setAttribute('aria-atomic', 'true')
  liveRegionPolite.className = 'sr-only'
  document.body.appendChild(liveRegionPolite)

  // Create assertive announcer (for urgent updates)
  liveRegionAssertive = document.createElement('div')
  liveRegionAssertive.id = 'aria-live-assertive'
  liveRegionAssertive.setAttribute('role', 'alert')
  liveRegionAssertive.setAttribute('aria-live', 'assertive')
  liveRegionAssertive.setAttribute('aria-atomic', 'true')
  liveRegionAssertive.className = 'sr-only'
  document.body.appendChild(liveRegionAssertive)
}

/**
 * Announce a message to screen readers
 *
 * @param message - The message to announce
 * @param priority - 'polite' for non-urgent, 'assertive' for urgent
 */
export function announce(message: string, priority: AnnouncementPriority = 'polite'): void {
  if (typeof document === 'undefined') return

  const region =
    priority === 'assertive'
      ? document.getElementById('aria-live-assertive')
      : document.getElementById('aria-live-polite')

  if (region) {
    // Clear and set message (needed for repeat announcements)
    region.textContent = ''
    setTimeout(() => {
      region.textContent = message
    }, 50)
  }
}

/**
 * Announce for Kids Learning Center - child-friendly messages
 */
export function announceForKids(message: string, isUrgent = false): void {
  announce(message, isUrgent ? 'assertive' : 'polite')
}

// ============================================
// Keyboard Navigation
// ============================================

const registeredShortcuts: Map<string, KeyboardShortcut> = new Map()
let keyboardListenerInitialized = false
let currentScope = 'global'

/**
 * Generate a unique key for a shortcut
 */
function getShortcutKey(shortcut: Omit<KeyboardShortcut, 'description' | 'action'>): string {
  const parts: string[] = []
  if (shortcut.ctrl) parts.push('ctrl')
  if (shortcut.alt) parts.push('alt')
  if (shortcut.shift) parts.push('shift')
  if (shortcut.meta) parts.push('meta')
  parts.push(shortcut.key.toLowerCase())
  return parts.join('+')
}

/**
 * Initialize the global keyboard listener
 */
export function initializeKeyboardNavigation(): void {
  if (typeof window === 'undefined' || keyboardListenerInitialized) return

  window.addEventListener('keydown', handleGlobalKeyDown)
  keyboardListenerInitialized = true
}

/**
 * Handle global keyboard events
 */
function handleGlobalKeyDown(event: KeyboardEvent): void {
  // Don't intercept if user is typing in an input
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    // Allow Escape key even in inputs
    if (event.key !== 'Escape') return
  }

  const key = getShortcutKey({
    key: event.key,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  })

  const shortcut = registeredShortcuts.get(key)
  if (shortcut && (shortcut.scope === 'global' || shortcut.scope === currentScope)) {
    event.preventDefault()
    shortcut.action()
    announce(`Executed: ${shortcut.description}`)
  }
}

/**
 * Register a keyboard shortcut
 */
export function registerShortcut(shortcut: KeyboardShortcut): () => void {
  const key = getShortcutKey(shortcut)
  registeredShortcuts.set(key, { ...shortcut, scope: shortcut.scope || 'global' })

  // Return unregister function
  return () => {
    registeredShortcuts.delete(key)
  }
}

/**
 * Set the current scope for keyboard shortcuts
 */
export function setKeyboardScope(scope: string): void {
  currentScope = scope
}

/**
 * Get all registered shortcuts for help display
 */
export function getRegisteredShortcuts(): KeyboardShortcut[] {
  return Array.from(registeredShortcuts.values())
}

// ============================================
// Focus Management
// ============================================

let focusTrapElement: HTMLElement | null = null
let previouslyFocusedElement: HTMLElement | null = null

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ')

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
    el => el.offsetParent !== null // Filter out hidden elements
  )
}

/**
 * Trap focus within an element (for modals, dialogs)
 */
export function trapFocus(element: HTMLElement, options: FocusTrapOptions = {}): () => void {
  const { initialFocus, returnFocus = true, escapeDeactivates = true, onEscape } = options

  // Store currently focused element
  previouslyFocusedElement = document.activeElement as HTMLElement
  focusTrapElement = element

  // Set initial focus
  const focusableElements = getFocusableElements(element)
  if (initialFocus) {
    const target =
      typeof initialFocus === 'string'
        ? element.querySelector<HTMLElement>(initialFocus)
        : initialFocus
    target?.focus()
  } else if (focusableElements.length > 0) {
    focusableElements[0].focus()
  }

  // Handle tab key to trap focus
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      const focusable = getFocusableElements(element)
      if (focusable.length === 0) return

      const firstElement = focusable[0]
      const lastElement = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    if (e.key === 'Escape' && escapeDeactivates) {
      onEscape?.()
    }
  }

  element.addEventListener('keydown', handleKeyDown)

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown)
    focusTrapElement = null
    if (returnFocus && previouslyFocusedElement) {
      previouslyFocusedElement.focus()
      previouslyFocusedElement = null
    }
  }
}

/**
 * Move focus to an element and announce it
 */
export function focusElement(element: HTMLElement | string | null, announcement?: string): void {
  const target =
    typeof element === 'string' ? document.querySelector<HTMLElement>(element) : element

  if (target) {
    target.focus()
    if (announcement) {
      announce(announcement)
    }
  }
}

/**
 * Create a skip link for keyboard users
 */
export function createSkipLink(targetId: string, label: string): HTMLAnchorElement {
  const link = document.createElement('a')
  link.href = `#${targetId}`
  link.className = 'skip-link'
  link.textContent = label
  link.addEventListener('click', e => {
    e.preventDefault()
    const target = document.getElementById(targetId)
    if (target) {
      target.tabIndex = -1
      target.focus()
      announce(`Skipped to ${label}`)
    }
  })
  return link
}

// ============================================
// Reduced Motion
// ============================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Subscribe to reduced motion preference changes
 */
export function onReducedMotionChange(callback: (prefersReduced: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const handler = (e: MediaQueryListEvent) => callback(e.matches)
  mediaQuery.addEventListener('change', handler)

  return () => mediaQuery.removeEventListener('change', handler)
}

// ============================================
// High Contrast Mode
// ============================================

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(forced-colors: active)').matches ||
    window.matchMedia('(-ms-high-contrast: active)').matches
  )
}

// ============================================
// ARIA Helpers
// ============================================

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0
export function generateAriaId(prefix = 'aria'): string {
  return `${prefix}-${++idCounter}`
}

/**
 * Create ARIA description for complex elements
 */
export function describeElement(element: HTMLElement, description: string): string {
  const id = generateAriaId('desc')
  const descElement = document.createElement('span')
  descElement.id = id
  descElement.className = 'sr-only'
  descElement.textContent = description
  element.appendChild(descElement)
  element.setAttribute('aria-describedby', id)
  return id
}

// ============================================
// Roving Tab Index (for toolbars, menus)
// ============================================

/**
 * Implement roving tabindex for a group of elements
 */
export function rovingTabIndex(
  container: HTMLElement,
  selector: string,
  options: { orientation?: 'horizontal' | 'vertical'; loop?: boolean } = {}
): () => void {
  const { orientation = 'horizontal', loop = true } = options
  const items = Array.from(container.querySelectorAll<HTMLElement>(selector))

  if (items.length === 0) return () => {}

  // Set initial tabindex
  items.forEach((item, index) => {
    item.tabIndex = index === 0 ? 0 : -1
  })

  let currentIndex = 0

  const handleKeyDown = (e: KeyboardEvent) => {
    const prevKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
    const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'

    if (e.key === prevKey || e.key === nextKey) {
      e.preventDefault()
      items[currentIndex].tabIndex = -1

      if (e.key === nextKey) {
        currentIndex = loop
          ? (currentIndex + 1) % items.length
          : Math.min(currentIndex + 1, items.length - 1)
      } else {
        currentIndex = loop
          ? (currentIndex - 1 + items.length) % items.length
          : Math.max(currentIndex - 1, 0)
      }

      items[currentIndex].tabIndex = 0
      items[currentIndex].focus()
    }

    if (e.key === 'Home') {
      e.preventDefault()
      items[currentIndex].tabIndex = -1
      currentIndex = 0
      items[currentIndex].tabIndex = 0
      items[currentIndex].focus()
    }

    if (e.key === 'End') {
      e.preventDefault()
      items[currentIndex].tabIndex = -1
      currentIndex = items.length - 1
      items[currentIndex].tabIndex = 0
      items[currentIndex].focus()
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

// ============================================
// Default Keyboard Shortcuts for FlowSphere
// ============================================

export const DEFAULT_SHORTCUTS: Omit<KeyboardShortcut, 'action'>[] = [
  { key: '/', description: 'Open search', scope: 'global' },
  { key: 'Escape', description: 'Close dialog / Cancel', scope: 'global' },
  { key: 'h', alt: true, description: 'Go to home', scope: 'global' },
  { key: 's', alt: true, description: 'Go to settings', scope: 'global' },
  { key: 'k', alt: true, description: 'Open Kids Learning Center', scope: 'global' },
  { key: 'm', alt: true, description: 'Open messenger', scope: 'global' },
  { key: '?', shift: true, description: 'Show keyboard shortcuts', scope: 'global' },
  // Tutor-specific
  { key: 'Enter', ctrl: true, description: 'Send message', scope: 'tutor' },
  { key: 't', alt: true, description: 'Toggle text-to-speech', scope: 'tutor' },
  { key: 'n', alt: true, description: 'New topic', scope: 'tutor' },
]

// ============================================
// ARIA Labels (for consistent labeling)
// ============================================

export const ARIA_LABELS = {
  navigation: {
    main: 'Main navigation',
    skipToContent: 'Skip to main content',
    skipToNav: 'Skip to navigation',
  },
  buttons: {
    close: 'Close',
    menu: 'Open menu',
    settings: 'Open settings',
    search: 'Search',
    help: 'Help',
  },
  status: {
    loading: 'Loading',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
  },
  forms: {
    required: 'Required field',
    optional: 'Optional field',
    invalid: 'Invalid input',
  },
}

// ============================================
// Keyboard Shortcuts Configuration
// ============================================

export const KEYBOARD_SHORTCUTS = {
  navigation: {
    skipToContent: { key: 's', alt: true, description: 'Skip to main content' },
    skipToNav: { key: 'n', alt: true, description: 'Skip to navigation' },
    home: { key: 'h', alt: true, description: 'Go to home' },
  },
  actions: {
    help: { key: '?', shift: true, description: 'Show keyboard shortcuts' },
    search: { key: '/', description: 'Focus search' },
    escape: { key: 'Escape', description: 'Close modal or cancel' },
  },
}

// ============================================
// Cleanup Functions
// ============================================

/**
 * Remove ARIA live regions from DOM
 */
export function cleanupLiveRegions(): void {
  if (typeof document === 'undefined') return

  const polite = document.getElementById('aria-live-polite')
  const assertive = document.getElementById('aria-live-assertive')

  polite?.remove()
  assertive?.remove()

  liveRegionPolite = null
  liveRegionAssertive = null
}

/**
 * Clear all registered keyboard shortcuts
 */
export function clearShortcuts(): void {
  registeredShortcuts.clear()
}
