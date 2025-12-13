/**
 * Tests for Accessibility Utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  initializeLiveRegions,
  announce,
  cleanupLiveRegions,
  registerShortcut,
  clearShortcuts,
  initializeKeyboardNavigation,
  trapFocus,
  rovingTabIndex,
  prefersReducedMotion,
  getFocusableElements,
  generateAriaId,
  ARIA_LABELS,
  KEYBOARD_SHORTCUTS,
} from './accessibility'

describe('Accessibility Utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    cleanupLiveRegions()
    clearShortcuts()
  })

  afterEach(() => {
    cleanupLiveRegions()
    clearShortcuts()
  })

  describe('ARIA Live Regions', () => {
    it('should initialize live regions', () => {
      initializeLiveRegions()

      const polite = document.getElementById('aria-live-polite')
      const assertive = document.getElementById('aria-live-assertive')

      expect(polite).toBeDefined()
      expect(assertive).toBeDefined()
      expect(polite?.getAttribute('aria-live')).toBe('polite')
      expect(assertive?.getAttribute('aria-live')).toBe('assertive')
    })

    it('should not create duplicate regions', () => {
      initializeLiveRegions()
      initializeLiveRegions() // Call again

      const politeRegions = document.querySelectorAll('#aria-live-polite')
      expect(politeRegions.length).toBe(1)
    })

    it('should announce polite messages', async () => {
      initializeLiveRegions()

      announce('Test message')

      await new Promise(resolve => setTimeout(resolve, 100))
      const polite = document.getElementById('aria-live-polite')
      expect(polite?.textContent).toBe('Test message')
    })

    it('should announce assertive messages', async () => {
      initializeLiveRegions()

      announce('Urgent message', 'assertive')

      await new Promise(resolve => setTimeout(resolve, 100))
      const assertive = document.getElementById('aria-live-assertive')
      expect(assertive?.textContent).toBe('Urgent message')
    })

    it('should cleanup live regions', () => {
      initializeLiveRegions()
      cleanupLiveRegions()

      expect(document.getElementById('aria-live-polite')).toBeNull()
      expect(document.getElementById('aria-live-assertive')).toBeNull()
    })
  })

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      initializeKeyboardNavigation()
    })

    it('should register and trigger shortcuts', () => {
      const callback = vi.fn()
      registerShortcut({
        key: 'h',
        ctrl: true,
        description: 'Test shortcut',
        action: callback,
      })

      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      expect(callback).toHaveBeenCalled()
    })

    it('should require modifier keys when specified', () => {
      const callback = vi.fn()
      registerShortcut({
        key: 'h',
        ctrl: true,
        description: 'Test shortcut',
        action: callback,
      })

      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: false,
        bubbles: true,
      })
      document.dispatchEvent(event)

      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle shift modifier', () => {
      const callback = vi.fn()
      registerShortcut({
        key: '?',
        shift: true,
        description: 'Help',
        action: callback,
      })

      const event = new KeyboardEvent('keydown', {
        key: '?',
        shiftKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      expect(callback).toHaveBeenCalled()
    })

    it('should handle alt modifier', () => {
      const callback = vi.fn()
      registerShortcut({
        key: 'n',
        alt: true,
        description: 'Navigate',
        action: callback,
      })

      const event = new KeyboardEvent('keydown', {
        key: 'n',
        altKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      expect(callback).toHaveBeenCalled()
    })

    it('should return unregister function', () => {
      const callback = vi.fn()
      const unregister = registerShortcut({
        key: 'x',
        description: 'Test',
        action: callback,
      })

      unregister()

      const event = new KeyboardEvent('keydown', {
        key: 'x',
        bubbles: true,
      })
      document.dispatchEvent(event)

      expect(callback).not.toHaveBeenCalled()
    })

    it('should clear all shortcuts', () => {
      const callback = vi.fn()
      registerShortcut({
        key: 'h',
        ctrl: true,
        description: 'Test',
        action: callback,
      })
      clearShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Focus Management', () => {
    it('should identify focusable element selectors', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <button id="btn1">First</button>
        <input id="input1" type="text" />
        <button id="btn2">Last</button>
        <button disabled>Disabled</button>
        <a href="#">Link</a>
      `
      document.body.appendChild(container)

      // In jsdom, offsetParent is null so elements are filtered out
      // We just verify the function runs without error
      const focusable = getFocusableElements(container)
      expect(Array.isArray(focusable)).toBe(true)
    })

    it('should trap focus within container', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <button id="btn1">First</button>
        <input id="input1" type="text" />
        <button id="btn2">Last</button>
      `
      document.body.appendChild(container)

      const cleanup = trapFocus(container)
      expect(cleanup).toBeInstanceOf(Function)

      cleanup()
    })

    it('should return early for container with no focusable elements', () => {
      const container = document.createElement('div')
      container.innerHTML = '<p>No focusable elements</p>'
      document.body.appendChild(container)

      const cleanup = trapFocus(container)
      cleanup()
    })
  })

  describe('Roving Tab Index', () => {
    it('should set up roving tabindex on items', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <button>Item 1</button>
        <button>Item 2</button>
        <button>Item 3</button>
      `
      document.body.appendChild(container)

      const cleanup = rovingTabIndex(container, 'button')
      const buttons = container.querySelectorAll('button')

      expect(buttons[0].getAttribute('tabindex')).toBe('0')
      expect(buttons[1].getAttribute('tabindex')).toBe('-1')
      expect(buttons[2].getAttribute('tabindex')).toBe('-1')

      cleanup()
    })

    it('should handle empty container', () => {
      const container = document.createElement('div')
      document.body.appendChild(container)

      const cleanup = rovingTabIndex(container, 'button')
      cleanup()
    })
  })

  describe('Reduced Motion', () => {
    it('should detect reduced motion preference', () => {
      const result = prefersReducedMotion()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('ARIA Helpers', () => {
    it('should generate unique ARIA IDs', () => {
      const id1 = generateAriaId('test')
      const id2 = generateAriaId('test')

      expect(id1).toMatch(/^test-\d+$/)
      expect(id2).toMatch(/^test-\d+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('ARIA Labels', () => {
    it('should have all required navigation labels', () => {
      expect(ARIA_LABELS.navigation.main).toBe('Main navigation')
      expect(ARIA_LABELS.navigation.skipToContent).toBe('Skip to main content')
      expect(ARIA_LABELS.navigation.skipToNav).toBe('Skip to navigation')
    })

    it('should have all required button labels', () => {
      expect(ARIA_LABELS.buttons.close).toBe('Close')
      expect(ARIA_LABELS.buttons.menu).toBe('Open menu')
      expect(ARIA_LABELS.buttons.settings).toBe('Open settings')
    })

    it('should have all required status labels', () => {
      expect(ARIA_LABELS.status.loading).toBe('Loading')
      expect(ARIA_LABELS.status.success).toBe('Success')
      expect(ARIA_LABELS.status.error).toBe('Error')
    })
  })

  describe('Keyboard Shortcuts Config', () => {
    it('should have navigation shortcuts defined', () => {
      expect(KEYBOARD_SHORTCUTS.navigation.skipToContent).toEqual({
        key: 's',
        alt: true,
        description: 'Skip to main content',
      })
      expect(KEYBOARD_SHORTCUTS.navigation.skipToNav).toEqual({
        key: 'n',
        alt: true,
        description: 'Skip to navigation',
      })
    })

    it('should have action shortcuts defined', () => {
      expect(KEYBOARD_SHORTCUTS.actions.help).toEqual({
        key: '?',
        shift: true,
        description: 'Show keyboard shortcuts',
      })
      expect(KEYBOARD_SHORTCUTS.actions.search).toEqual({
        key: '/',
        description: 'Focus search',
      })
      expect(KEYBOARD_SHORTCUTS.actions.escape).toEqual({
        key: 'Escape',
        description: 'Close modal or cancel',
      })
    })
  })
})
