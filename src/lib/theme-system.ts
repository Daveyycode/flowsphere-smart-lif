/**
 * Theme System
 * Dark and light modes for all theme colors
 * Responsive theme management with system preference detection
 */

import { logger } from '@/lib/security-utils'

export type ThemeColor = 'orange' | 'blue' | 'green' | 'purple' | 'pink' | 'teal'
export type ThemeMode = 'light' | 'dark' | 'auto'

export interface ThemeConfig {
  color: ThemeColor
  mode: ThemeMode
  systemPreference?: 'light' | 'dark'
}

export interface ColorPalette {
  // Primary colors
  primary: string
  primaryHover: string
  primaryActive: string
  primaryLight: string
  primaryDark: string

  // Background colors
  background: string
  backgroundSecondary: string
  backgroundTertiary: string
  backgroundHover: string

  // Text colors
  text: string
  textSecondary: string
  textTertiary: string
  textInverse: string

  // Border colors
  border: string
  borderLight: string
  borderDark: string

  // Status colors
  success: string
  warning: string
  error: string
  info: string

  // Shadow
  shadow: string
  shadowLight: string
}

/**
 * Theme palettes for each color in light and dark modes
 */
const THEME_PALETTES: Record<ThemeColor, { light: ColorPalette; dark: ColorPalette }> = {
  orange: {
    light: {
      primary: '#FF6B35',
      primaryHover: '#FF8555',
      primaryActive: '#E55A2A',
      primaryLight: '#FFE5DD',
      primaryDark: '#CC5528',
      background: '#FFFFFF',
      backgroundSecondary: '#F8F9FA',
      backgroundTertiary: '#F1F3F5',
      backgroundHover: '#E9ECEF',
      text: '#212529',
      textSecondary: '#495057',
      textTertiary: '#6C757D',
      textInverse: '#FFFFFF',
      border: '#DEE2E6',
      borderLight: '#E9ECEF',
      borderDark: '#CED4DA',
      success: '#28A745',
      warning: '#FFC107',
      error: '#DC3545',
      info: '#17A2B8',
      shadow: 'rgba(0, 0, 0, 0.1)',
      shadowLight: 'rgba(0, 0, 0, 0.05)',
    },
    dark: {
      primary: '#FF8555',
      primaryHover: '#FFA075',
      primaryActive: '#FF6B35',
      primaryLight: '#3D2318',
      primaryDark: '#FFBB99',
      background: '#1A1A1A',
      backgroundSecondary: '#252525',
      backgroundTertiary: '#303030',
      backgroundHover: '#353535',
      text: '#E9ECEF',
      textSecondary: '#ADB5BD',
      textTertiary: '#868E96',
      textInverse: '#1A1A1A',
      border: '#404040',
      borderLight: '#353535',
      borderDark: '#4A4A4A',
      success: '#51CF66',
      warning: '#FFD43B',
      error: '#FF6B6B',
      info: '#4DABF7',
      shadow: 'rgba(0, 0, 0, 0.3)',
      shadowLight: 'rgba(0, 0, 0, 0.15)',
    },
  },
  blue: {
    light: {
      primary: '#007BFF',
      primaryHover: '#0056B3',
      primaryActive: '#004085',
      primaryLight: '#CCE5FF',
      primaryDark: '#003D82',
      background: '#FFFFFF',
      backgroundSecondary: '#F8F9FA',
      backgroundTertiary: '#F1F3F5',
      backgroundHover: '#E9ECEF',
      text: '#212529',
      textSecondary: '#495057',
      textTertiary: '#6C757D',
      textInverse: '#FFFFFF',
      border: '#DEE2E6',
      borderLight: '#E9ECEF',
      borderDark: '#CED4DA',
      success: '#28A745',
      warning: '#FFC107',
      error: '#DC3545',
      info: '#17A2B8',
      shadow: 'rgba(0, 0, 0, 0.1)',
      shadowLight: 'rgba(0, 0, 0, 0.05)',
    },
    dark: {
      primary: '#4DABF7',
      primaryHover: '#74C0FC',
      primaryActive: '#339AF0',
      primaryLight: '#1A3A52',
      primaryDark: '#A5D8FF',
      background: '#1A1A1A',
      backgroundSecondary: '#252525',
      backgroundTertiary: '#303030',
      backgroundHover: '#353535',
      text: '#E9ECEF',
      textSecondary: '#ADB5BD',
      textTertiary: '#868E96',
      textInverse: '#1A1A1A',
      border: '#404040',
      borderLight: '#353535',
      borderDark: '#4A4A4A',
      success: '#51CF66',
      warning: '#FFD43B',
      error: '#FF6B6B',
      info: '#4DABF7',
      shadow: 'rgba(0, 0, 0, 0.3)',
      shadowLight: 'rgba(0, 0, 0, 0.15)',
    },
  },
  green: {
    light: {
      primary: '#28A745',
      primaryHover: '#218838',
      primaryActive: '#1E7E34',
      primaryLight: '#D4EDDA',
      primaryDark: '#155724',
      background: '#FFFFFF',
      backgroundSecondary: '#F8F9FA',
      backgroundTertiary: '#F1F3F5',
      backgroundHover: '#E9ECEF',
      text: '#212529',
      textSecondary: '#495057',
      textTertiary: '#6C757D',
      textInverse: '#FFFFFF',
      border: '#DEE2E6',
      borderLight: '#E9ECEF',
      borderDark: '#CED4DA',
      success: '#28A745',
      warning: '#FFC107',
      error: '#DC3545',
      info: '#17A2B8',
      shadow: 'rgba(0, 0, 0, 0.1)',
      shadowLight: 'rgba(0, 0, 0, 0.05)',
    },
    dark: {
      primary: '#51CF66',
      primaryHover: '#69DB7C',
      primaryActive: '#40C057',
      primaryLight: '#1B3A25',
      primaryDark: '#8CE99A',
      background: '#1A1A1A',
      backgroundSecondary: '#252525',
      backgroundTertiary: '#303030',
      backgroundHover: '#353535',
      text: '#E9ECEF',
      textSecondary: '#ADB5BD',
      textTertiary: '#868E96',
      textInverse: '#1A1A1A',
      border: '#404040',
      borderLight: '#353535',
      borderDark: '#4A4A4A',
      success: '#51CF66',
      warning: '#FFD43B',
      error: '#FF6B6B',
      info: '#4DABF7',
      shadow: 'rgba(0, 0, 0, 0.3)',
      shadowLight: 'rgba(0, 0, 0, 0.15)',
    },
  },
  purple: {
    light: {
      primary: '#6F42C1',
      primaryHover: '#5A32A3',
      primaryActive: '#4C2A8C',
      primaryLight: '#E2D9F3',
      primaryDark: '#3E1F75',
      background: '#FFFFFF',
      backgroundSecondary: '#F8F9FA',
      backgroundTertiary: '#F1F3F5',
      backgroundHover: '#E9ECEF',
      text: '#212529',
      textSecondary: '#495057',
      textTertiary: '#6C757D',
      textInverse: '#FFFFFF',
      border: '#DEE2E6',
      borderLight: '#E9ECEF',
      borderDark: '#CED4DA',
      success: '#28A745',
      warning: '#FFC107',
      error: '#DC3545',
      info: '#17A2B8',
      shadow: 'rgba(0, 0, 0, 0.1)',
      shadowLight: 'rgba(0, 0, 0, 0.05)',
    },
    dark: {
      primary: '#9775FA',
      primaryHover: '#B197FC',
      primaryActive: '#845EF7',
      primaryLight: '#2B1F3D',
      primaryDark: '#D0BFFF',
      background: '#1A1A1A',
      backgroundSecondary: '#252525',
      backgroundTertiary: '#303030',
      backgroundHover: '#353535',
      text: '#E9ECEF',
      textSecondary: '#ADB5BD',
      textTertiary: '#868E96',
      textInverse: '#1A1A1A',
      border: '#404040',
      borderLight: '#353535',
      borderDark: '#4A4A4A',
      success: '#51CF66',
      warning: '#FFD43B',
      error: '#FF6B6B',
      info: '#4DABF7',
      shadow: 'rgba(0, 0, 0, 0.3)',
      shadowLight: 'rgba(0, 0, 0, 0.15)',
    },
  },
  pink: {
    light: {
      primary: '#E83E8C',
      primaryHover: '#D63384',
      primaryActive: '#BD2D74',
      primaryLight: '#F7D6E6',
      primaryDark: '#A02364',
      background: '#FFFFFF',
      backgroundSecondary: '#F8F9FA',
      backgroundTertiary: '#F1F3F5',
      backgroundHover: '#E9ECEF',
      text: '#212529',
      textSecondary: '#495057',
      textTertiary: '#6C757D',
      textInverse: '#FFFFFF',
      border: '#DEE2E6',
      borderLight: '#E9ECEF',
      borderDark: '#CED4DA',
      success: '#28A745',
      warning: '#FFC107',
      error: '#DC3545',
      info: '#17A2B8',
      shadow: 'rgba(0, 0, 0, 0.1)',
      shadowLight: 'rgba(0, 0, 0, 0.05)',
    },
    dark: {
      primary: '#F783AC',
      primaryHover: '#FAA2C1',
      primaryActive: '#F06595',
      primaryLight: '#3D1F2E',
      primaryDark: '#FCC2D7',
      background: '#1A1A1A',
      backgroundSecondary: '#252525',
      backgroundTertiary: '#303030',
      backgroundHover: '#353535',
      text: '#E9ECEF',
      textSecondary: '#ADB5BD',
      textTertiary: '#868E96',
      textInverse: '#1A1A1A',
      border: '#404040',
      borderLight: '#353535',
      borderDark: '#4A4A4A',
      success: '#51CF66',
      warning: '#FFD43B',
      error: '#FF6B6B',
      info: '#4DABF7',
      shadow: 'rgba(0, 0, 0, 0.3)',
      shadowLight: 'rgba(0, 0, 0, 0.15)',
    },
  },
  teal: {
    light: {
      primary: '#20C997',
      primaryHover: '#1AA179',
      primaryActive: '#158765',
      primaryLight: '#C7F0E3',
      primaryDark: '#0E6E51',
      background: '#FFFFFF',
      backgroundSecondary: '#F8F9FA',
      backgroundTertiary: '#F1F3F5',
      backgroundHover: '#E9ECEF',
      text: '#212529',
      textSecondary: '#495057',
      textTertiary: '#6C757D',
      textInverse: '#FFFFFF',
      border: '#DEE2E6',
      borderLight: '#E9ECEF',
      borderDark: '#CED4DA',
      success: '#28A745',
      warning: '#FFC107',
      error: '#DC3545',
      info: '#17A2B8',
      shadow: 'rgba(0, 0, 0, 0.1)',
      shadowLight: 'rgba(0, 0, 0, 0.05)',
    },
    dark: {
      primary: '#38D9A9',
      primaryHover: '#63E6BE',
      primaryActive: '#20C997',
      primaryLight: '#1A3A33',
      primaryDark: '#96F2D7',
      background: '#1A1A1A',
      backgroundSecondary: '#252525',
      backgroundTertiary: '#303030',
      backgroundHover: '#353535',
      text: '#E9ECEF',
      textSecondary: '#ADB5BD',
      textTertiary: '#868E96',
      textInverse: '#1A1A1A',
      border: '#404040',
      borderLight: '#353535',
      borderDark: '#4A4A4A',
      success: '#51CF66',
      warning: '#FFD43B',
      error: '#FF6B6B',
      info: '#4DABF7',
      shadow: 'rgba(0, 0, 0, 0.3)',
      shadowLight: 'rgba(0, 0, 0, 0.15)',
    },
  },
}

/**
 * Theme Manager
 */
export class ThemeManager {
  private storageKey = 'flowsphere-theme-config'
  private listeners: Array<(config: ThemeConfig, palette: ColorPalette) => void> = []
  private mediaQuery: MediaQueryList | null = null

  constructor() {
    this.initializeSystemPreferenceListener()
  }

  /**
   * Get current theme configuration
   */
  getConfig(): ThemeConfig {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      logger.error('Failed to get theme config from storage, using default', error, 'ThemeSystem')
    }

    // Default configuration
    return {
      color: 'orange',
      mode: 'auto',
      systemPreference: this.getSystemPreference(),
    }
  }

  /**
   * Set theme color
   */
  setColor(color: ThemeColor): void {
    const config = this.getConfig()
    config.color = color
    this.saveConfig(config)
    this.applyTheme(config)
  }

  /**
   * Set theme mode
   */
  setMode(mode: ThemeMode): void {
    const config = this.getConfig()
    config.mode = mode
    this.saveConfig(config)
    this.applyTheme(config)
  }

  /**
   * Get current color palette
   */
  getPalette(): ColorPalette {
    const config = this.getConfig()
    const effectiveMode = this.getEffectiveMode(config)
    return THEME_PALETTES[config.color][effectiveMode]
  }

  /**
   * Get effective mode (resolves 'auto' to 'light' or 'dark')
   */
  getEffectiveMode(config?: ThemeConfig): 'light' | 'dark' {
    if (!config) config = this.getConfig()

    if (config.mode === 'auto') {
      return config.systemPreference || this.getSystemPreference()
    }

    return config.mode
  }

  /**
   * Apply theme to document
   */
  applyTheme(config?: ThemeConfig): void {
    if (!config) config = this.getConfig()

    const palette = THEME_PALETTES[config.color][this.getEffectiveMode(config)]

    // Apply CSS variables
    const root = document.documentElement

    // Primary colors
    root.style.setProperty('--color-primary', palette.primary)
    root.style.setProperty('--color-primary-hover', palette.primaryHover)
    root.style.setProperty('--color-primary-active', palette.primaryActive)
    root.style.setProperty('--color-primary-light', palette.primaryLight)
    root.style.setProperty('--color-primary-dark', palette.primaryDark)

    // Background colors
    root.style.setProperty('--color-background', palette.background)
    root.style.setProperty('--color-background-secondary', palette.backgroundSecondary)
    root.style.setProperty('--color-background-tertiary', palette.backgroundTertiary)
    root.style.setProperty('--color-background-hover', palette.backgroundHover)

    // Text colors
    root.style.setProperty('--color-text', palette.text)
    root.style.setProperty('--color-text-secondary', palette.textSecondary)
    root.style.setProperty('--color-text-tertiary', palette.textTertiary)
    root.style.setProperty('--color-text-inverse', palette.textInverse)

    // Border colors
    root.style.setProperty('--color-border', palette.border)
    root.style.setProperty('--color-border-light', palette.borderLight)
    root.style.setProperty('--color-border-dark', palette.borderDark)

    // Status colors
    root.style.setProperty('--color-success', palette.success)
    root.style.setProperty('--color-warning', palette.warning)
    root.style.setProperty('--color-error', palette.error)
    root.style.setProperty('--color-info', palette.info)

    // Shadow
    root.style.setProperty('--shadow', palette.shadow)
    root.style.setProperty('--shadow-light', palette.shadowLight)

    // Set data attribute for mode (useful for CSS selectors)
    const effectiveMode = this.getEffectiveMode(config)
    root.setAttribute('data-theme-mode', effectiveMode)
    root.setAttribute('data-theme-color', config.color)
    root.setAttribute('data-appearance', effectiveMode)

    // Also set class for compatibility
    if (effectiveMode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Notify listeners
    this.notifyListeners(config, palette)
  }

  /**
   * Toggle between light and dark mode
   */
  toggleMode(): void {
    const config = this.getConfig()
    const currentMode = this.getEffectiveMode(config)

    // Toggle: auto -> light/dark, light -> dark, dark -> light
    if (config.mode === 'auto') {
      config.mode = currentMode === 'light' ? 'dark' : 'light'
    } else {
      config.mode = config.mode === 'light' ? 'dark' : 'light'
    }

    this.saveConfig(config)
    this.applyTheme(config)
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(callback: (config: ThemeConfig, palette: ColorPalette) => void): () => void {
    this.listeners.push(callback)

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  /**
   * Get all available colors
   */
  getAvailableColors(): ThemeColor[] {
    return ['orange', 'blue', 'green', 'purple', 'pink', 'teal']
  }

  /**
   * Get preview palette for a color
   */
  getPreviewPalette(color: ThemeColor, mode: 'light' | 'dark'): ColorPalette {
    return THEME_PALETTES[color][mode]
  }

  // Private methods

  /**
   * Get system color preference
   */
  private getSystemPreference(): 'light' | 'dark' {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  }

  /**
   * Initialize system preference listener
   */
  private initializeSystemPreferenceListener(): void {
    if (window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      // Modern browsers
      if (this.mediaQuery.addEventListener) {
        this.mediaQuery.addEventListener('change', this.handleSystemPreferenceChange)
      }
      // Legacy browsers
      else if ((this.mediaQuery as any).addListener) {
        ;(this.mediaQuery as any).addListener(this.handleSystemPreferenceChange)
      }
    }
  }

  /**
   * Handle system preference change
   */
  private handleSystemPreferenceChange = (event: MediaQueryListEvent): void => {
    const config = this.getConfig()
    config.systemPreference = event.matches ? 'dark' : 'light'
    this.saveConfig(config)

    // Apply theme if in auto mode
    if (config.mode === 'auto') {
      this.applyTheme(config)
    }
  }

  /**
   * Save configuration
   */
  private saveConfig(config: ThemeConfig): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save theme config:', error)
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(config: ThemeConfig, palette: ColorPalette): void {
    this.listeners.forEach(callback => {
      try {
        callback(config, palette)
      } catch (error) {
        console.error('Theme listener error:', error)
      }
    })
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.mediaQuery) {
      if (this.mediaQuery.removeEventListener) {
        this.mediaQuery.removeEventListener('change', this.handleSystemPreferenceChange)
      } else if ((this.mediaQuery as any).removeListener) {
        ;(this.mediaQuery as any).removeListener(this.handleSystemPreferenceChange)
      }
    }
  }
}

/**
 * Initialize and apply theme
 */
export function initializeTheme(): ThemeManager {
  const manager = new ThemeManager()
  manager.applyTheme()
  return manager
}

/**
 * React hook for theme management
 */
export function useTheme() {
  const manager = new ThemeManager()

  return {
    config: manager.getConfig(),
    palette: manager.getPalette(),
    setColor: (color: ThemeColor) => manager.setColor(color),
    setMode: (mode: ThemeMode) => manager.setMode(mode),
    toggleMode: () => manager.toggleMode(),
    getEffectiveMode: () => manager.getEffectiveMode(),
    subscribe: (callback: (config: ThemeConfig, palette: ColorPalette) => void) =>
      manager.subscribe(callback),
    availableColors: manager.getAvailableColors(),
    getPreviewPalette: (color: ThemeColor, mode: 'light' | 'dark') =>
      manager.getPreviewPalette(color, mode),
  }
}
