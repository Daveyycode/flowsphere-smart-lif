import { useKV } from '@github/spark/hooks'
import { useEffect } from 'react'

export type ColorTheme = 'neon-noir' | 'aurora-borealis' | 'cosmic-latte' | 'candy-shop' | 'black-gray' | 'custom'
export type ThemeMode = 'light' | 'dark'

export interface CustomColors {
  primary: string
  primaryOpacity: number
  accent: string
  accentOpacity: number
  background: string
  backgroundOpacity: number
  foreground: string
  foregroundOpacity: number
}

export interface ThemeConfig {
  mode: ThemeMode
  colorTheme: ColorTheme
  customColors?: CustomColors
}

const themes = {
  'neon-noir': {
    light: {
      background: 'oklch(0.98 0.005 270)',
      foreground: 'oklch(0.12 0.02 270)',
      card: 'oklch(1.00 0 0)',
      'card-foreground': 'oklch(0.12 0.02 270)',
      popover: 'oklch(1.00 0 0)',
      'popover-foreground': 'oklch(0.12 0.02 270)',
      primary: 'oklch(0.55 0.28 328)',
      'primary-foreground': 'oklch(0.98 0.003 270)',
      secondary: 'oklch(0.88 0.08 280)',
      'secondary-foreground': 'oklch(0.20 0.03 270)',
      muted: 'oklch(0.92 0.01 270)',
      'muted-foreground': 'oklch(0.40 0.02 270)',
      accent: 'oklch(0.60 0.25 320)',
      'accent-foreground': 'oklch(0.98 0.003 270)',
      destructive: 'oklch(0.65 0.25 15)',
      'destructive-foreground': 'oklch(0.98 0.003 270)',
      border: 'oklch(0.85 0.02 270)',
      input: 'oklch(0.85 0.02 270)',
      ring: 'oklch(0.60 0.25 320)',
    },
    dark: {
      background: 'oklch(0.10 0.02 270)',
      foreground: 'oklch(0.98 0.005 270)',
      card: 'oklch(0.15 0.02 270)',
      'card-foreground': 'oklch(0.98 0.005 270)',
      popover: 'oklch(0.12 0.02 270)',
      'popover-foreground': 'oklch(0.98 0.005 270)',
      primary: 'oklch(0.65 0.28 328)',
      'primary-foreground': 'oklch(0.10 0.02 270)',
      secondary: 'oklch(0.20 0.05 280)',
      'secondary-foreground': 'oklch(0.98 0.005 270)',
      muted: 'oklch(0.18 0.03 270)',
      'muted-foreground': 'oklch(0.60 0.02 270)',
      accent: 'oklch(0.70 0.25 320)',
      'accent-foreground': 'oklch(0.10 0.02 270)',
      destructive: 'oklch(0.65 0.25 15)',
      'destructive-foreground': 'oklch(0.98 0.003 270)',
      border: 'oklch(0.25 0.03 270)',
      input: 'oklch(0.25 0.03 270)',
      ring: 'oklch(0.70 0.25 320)',
    }
  },
  'aurora-borealis': {
    light: {
      background: 'oklch(0.97 0.01 220)',
      foreground: 'oklch(0.15 0.02 240)',
      card: 'oklch(1.00 0 0)',
      'card-foreground': 'oklch(0.15 0.02 240)',
      popover: 'oklch(1.00 0 0)',
      'popover-foreground': 'oklch(0.15 0.02 240)',
      primary: 'oklch(0.55 0.25 250)',
      'primary-foreground': 'oklch(0.98 0.01 220)',
      secondary: 'oklch(0.85 0.10 180)',
      'secondary-foreground': 'oklch(0.20 0.03 240)',
      muted: 'oklch(0.90 0.02 220)',
      'muted-foreground': 'oklch(0.45 0.03 240)',
      accent: 'oklch(0.65 0.22 160)',
      'accent-foreground': 'oklch(0.15 0.02 240)',
      destructive: 'oklch(0.65 0.25 15)',
      'destructive-foreground': 'oklch(0.98 0.01 220)',
      border: 'oklch(0.85 0.03 220)',
      input: 'oklch(0.85 0.03 220)',
      ring: 'oklch(0.55 0.25 250)',
    },
    dark: {
      background: 'oklch(0.12 0.03 240)',
      foreground: 'oklch(0.95 0.02 220)',
      card: 'oklch(0.18 0.04 240)',
      'card-foreground': 'oklch(0.95 0.02 220)',
      popover: 'oklch(0.15 0.03 240)',
      'popover-foreground': 'oklch(0.95 0.02 220)',
      primary: 'oklch(0.65 0.25 250)',
      'primary-foreground': 'oklch(0.12 0.03 240)',
      secondary: 'oklch(0.25 0.08 180)',
      'secondary-foreground': 'oklch(0.95 0.02 220)',
      muted: 'oklch(0.22 0.04 240)',
      'muted-foreground': 'oklch(0.65 0.03 220)',
      accent: 'oklch(0.70 0.22 160)',
      'accent-foreground': 'oklch(0.12 0.03 240)',
      destructive: 'oklch(0.65 0.25 15)',
      'destructive-foreground': 'oklch(0.95 0.02 220)',
      border: 'oklch(0.28 0.04 240)',
      input: 'oklch(0.28 0.04 240)',
      ring: 'oklch(0.65 0.25 250)',
    }
  },
  'cosmic-latte': {
    light: {
      background: 'oklch(0.97 0.02 80)',
      foreground: 'oklch(0.20 0.03 60)',
      card: 'oklch(0.99 0.01 80)',
      'card-foreground': 'oklch(0.20 0.03 60)',
      popover: 'oklch(1.00 0 0)',
      'popover-foreground': 'oklch(0.20 0.03 60)',
      primary: 'oklch(0.50 0.18 70)',
      'primary-foreground': 'oklch(0.97 0.02 80)',
      secondary: 'oklch(0.88 0.06 90)',
      'secondary-foreground': 'oklch(0.25 0.03 60)',
      muted: 'oklch(0.92 0.03 80)',
      'muted-foreground': 'oklch(0.50 0.03 60)',
      accent: 'oklch(0.65 0.15 50)',
      'accent-foreground': 'oklch(0.20 0.03 60)',
      destructive: 'oklch(0.60 0.22 25)',
      'destructive-foreground': 'oklch(0.97 0.02 80)',
      border: 'oklch(0.88 0.03 80)',
      input: 'oklch(0.88 0.03 80)',
      ring: 'oklch(0.50 0.18 70)',
    },
    dark: {
      background: 'oklch(0.18 0.03 60)',
      foreground: 'oklch(0.95 0.02 80)',
      card: 'oklch(0.22 0.04 60)',
      'card-foreground': 'oklch(0.95 0.02 80)',
      popover: 'oklch(0.20 0.03 60)',
      'popover-foreground': 'oklch(0.95 0.02 80)',
      primary: 'oklch(0.60 0.18 70)',
      'primary-foreground': 'oklch(0.18 0.03 60)',
      secondary: 'oklch(0.28 0.06 90)',
      'secondary-foreground': 'oklch(0.95 0.02 80)',
      muted: 'oklch(0.25 0.04 60)',
      'muted-foreground': 'oklch(0.65 0.03 80)',
      accent: 'oklch(0.70 0.15 50)',
      'accent-foreground': 'oklch(0.18 0.03 60)',
      destructive: 'oklch(0.65 0.22 25)',
      'destructive-foreground': 'oklch(0.95 0.02 80)',
      border: 'oklch(0.30 0.04 60)',
      input: 'oklch(0.30 0.04 60)',
      ring: 'oklch(0.60 0.18 70)',
    }
  },
  'candy-shop': {
    light: {
      background: 'oklch(0.98 0.01 330)',
      foreground: 'oklch(0.20 0.02 340)',
      card: 'oklch(1.00 0 0)',
      'card-foreground': 'oklch(0.20 0.02 340)',
      popover: 'oklch(1.00 0 0)',
      'popover-foreground': 'oklch(0.20 0.02 340)',
      primary: 'oklch(0.60 0.22 340)',
      'primary-foreground': 'oklch(0.98 0.01 330)',
      secondary: 'oklch(0.85 0.12 20)',
      'secondary-foreground': 'oklch(0.25 0.02 340)',
      muted: 'oklch(0.93 0.02 330)',
      'muted-foreground': 'oklch(0.50 0.02 340)',
      accent: 'oklch(0.70 0.20 290)',
      'accent-foreground': 'oklch(0.20 0.02 340)',
      destructive: 'oklch(0.65 0.25 15)',
      'destructive-foreground': 'oklch(0.98 0.01 330)',
      border: 'oklch(0.88 0.03 330)',
      input: 'oklch(0.88 0.03 330)',
      ring: 'oklch(0.60 0.22 340)',
    },
    dark: {
      background: 'oklch(0.15 0.02 340)',
      foreground: 'oklch(0.96 0.02 330)',
      card: 'oklch(0.20 0.03 340)',
      'card-foreground': 'oklch(0.96 0.02 330)',
      popover: 'oklch(0.18 0.02 340)',
      'popover-foreground': 'oklch(0.96 0.02 330)',
      primary: 'oklch(0.70 0.22 340)',
      'primary-foreground': 'oklch(0.15 0.02 340)',
      secondary: 'oklch(0.30 0.12 20)',
      'secondary-foreground': 'oklch(0.96 0.02 330)',
      muted: 'oklch(0.23 0.03 340)',
      'muted-foreground': 'oklch(0.65 0.02 330)',
      accent: 'oklch(0.75 0.20 290)',
      'accent-foreground': 'oklch(0.15 0.02 340)',
      destructive: 'oklch(0.65 0.25 15)',
      'destructive-foreground': 'oklch(0.96 0.02 330)',
      border: 'oklch(0.28 0.03 340)',
      input: 'oklch(0.28 0.03 340)',
      ring: 'oklch(0.70 0.22 340)',
    }
  },
  'black-gray': {
    light: {
      background: 'oklch(0.95 0 0)',
      foreground: 'oklch(0.15 0 0)',
      card: 'oklch(0.98 0 0)',
      'card-foreground': 'oklch(0.15 0 0)',
      popover: 'oklch(1.00 0 0)',
      'popover-foreground': 'oklch(0.15 0 0)',
      primary: 'oklch(0.30 0 0)',
      'primary-foreground': 'oklch(0.95 0 0)',
      secondary: 'oklch(0.85 0 0)',
      'secondary-foreground': 'oklch(0.20 0 0)',
      muted: 'oklch(0.90 0 0)',
      'muted-foreground': 'oklch(0.50 0 0)',
      accent: 'oklch(0.60 0 0)',
      'accent-foreground': 'oklch(0.95 0 0)',
      destructive: 'oklch(0.55 0.22 15)',
      'destructive-foreground': 'oklch(0.95 0 0)',
      border: 'oklch(0.85 0 0)',
      input: 'oklch(0.85 0 0)',
      ring: 'oklch(0.30 0 0)',
    },
    dark: {
      background: 'oklch(0.10 0 0)',
      foreground: 'oklch(0.95 0 0)',
      card: 'oklch(0.15 0 0)',
      'card-foreground': 'oklch(0.95 0 0)',
      popover: 'oklch(0.12 0 0)',
      'popover-foreground': 'oklch(0.95 0 0)',
      primary: 'oklch(0.80 0 0)',
      'primary-foreground': 'oklch(0.10 0 0)',
      secondary: 'oklch(0.25 0 0)',
      'secondary-foreground': 'oklch(0.95 0 0)',
      muted: 'oklch(0.20 0 0)',
      'muted-foreground': 'oklch(0.65 0 0)',
      accent: 'oklch(0.70 0 0)',
      'accent-foreground': 'oklch(0.10 0 0)',
      destructive: 'oklch(0.60 0.22 15)',
      'destructive-foreground': 'oklch(0.95 0 0)',
      border: 'oklch(0.25 0 0)',
      input: 'oklch(0.25 0 0)',
      ring: 'oklch(0.80 0 0)',
    }
  }
}

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : null
}

// Apply colors to CSS variables directly for real-time preview
export function applyColorsRealTime(colors: CustomColors, mode: ThemeMode) {
  const root = document.documentElement

  root.style.setProperty('--primary', `${colors.primary} / ${colors.primaryOpacity}%`)
  root.style.setProperty('--accent', `${colors.accent} / ${colors.accentOpacity}%`)
  root.style.setProperty('--background', `${colors.background} / ${colors.backgroundOpacity}%`)
  root.style.setProperty('--foreground', `${colors.foreground} / ${colors.foregroundOpacity}%`)

  // Apply derived colors
  root.style.setProperty('--primary-foreground', mode === 'light' ? 'oklch(0.98 0.003 270)' : 'oklch(0.10 0.02 270)')
  root.style.setProperty('--accent-foreground', mode === 'light' ? 'oklch(0.20 0.02 270)' : 'oklch(0.10 0.02 270)')
  root.style.setProperty('--card', mode === 'light' ? 'oklch(1.00 0 0)' : 'oklch(0.15 0.02 270)')
  root.style.setProperty('--card-foreground', mode === 'light' ? 'oklch(0.12 0.02 270)' : 'oklch(0.98 0.005 270)')
  root.style.setProperty('--popover', mode === 'light' ? 'oklch(1.00 0 0)' : 'oklch(0.12 0.02 270)')
  root.style.setProperty('--popover-foreground', mode === 'light' ? 'oklch(0.12 0.02 270)' : 'oklch(0.98 0.005 270)')
  root.style.setProperty('--secondary', mode === 'light' ? 'oklch(0.88 0.08 280)' : 'oklch(0.20 0.05 280)')
  root.style.setProperty('--secondary-foreground', mode === 'light' ? 'oklch(0.20 0.03 270)' : 'oklch(0.98 0.005 270)')
  root.style.setProperty('--muted', mode === 'light' ? 'oklch(0.92 0.01 270)' : 'oklch(0.18 0.03 270)')
  root.style.setProperty('--muted-foreground', mode === 'light' ? 'oklch(0.40 0.02 270)' : 'oklch(0.60 0.02 270)')
  root.style.setProperty('--destructive', 'oklch(0.65 0.25 15)')
  root.style.setProperty('--destructive-foreground', 'oklch(0.98 0.003 270)')
  root.style.setProperty('--border', mode === 'light' ? 'oklch(0.85 0.02 270)' : 'oklch(0.25 0.03 270)')
  root.style.setProperty('--input', mode === 'light' ? 'oklch(0.85 0.02 270)' : 'oklch(0.25 0.03 270)')
  root.style.setProperty('--ring', `${colors.accent} / ${colors.accentOpacity}%`)
}

export function useTheme() {
  const [config, setConfig] = useKV<ThemeConfig>('flowsphere-theme-config', {
    mode: 'light',
    colorTheme: 'neon-noir'
  })

  useEffect(() => {
    if (!config) return

    const root = document.documentElement

    if (config.colorTheme === 'custom' && config.customColors) {
      // Apply custom colors
      applyColorsRealTime(config.customColors, config.mode)
    } else if (config.colorTheme !== 'custom') {
      const colors = themes[config.colorTheme][config.mode]
      Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value)
      })
    }

    if (config.mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [config])

  const toggleMode = () => {
    setConfig((current) => ({
      ...(current || { mode: 'light', colorTheme: 'neon-noir' }),
      mode: current?.mode === 'light' ? 'dark' : 'light'
    }))
  }

  const setColorTheme = (colorTheme: ColorTheme) => {
    setConfig((current) => ({
      ...(current || { mode: 'light', colorTheme: 'neon-noir' }),
      colorTheme
    }))
  }

  const setCustomColors = (customColors: CustomColors) => {
    setConfig((current) => ({
      ...(current || { mode: 'light', colorTheme: 'custom' }),
      colorTheme: 'custom',
      customColors
    }))
  }

  return {
    mode: config?.mode || 'light',
    colorTheme: config?.colorTheme || 'neon-noir',
    customColors: config?.customColors,
    toggleMode,
    setColorTheme,
    setCustomColors
  }
}
