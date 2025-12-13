/**
 * Color Utilities for FlowSphere
 *
 * SECURITY FIX (Dec 9, 2025): Dynamic Tailwind class resolution
 *
 * Tailwind CSS purges unused classes at build time. Dynamic class names
 * like `bg-${color}` don't work because the full class name isn't present
 * in the source code for Tailwind to detect.
 *
 * This utility provides pre-defined color class mappings that Tailwind
 * can properly detect and include in the build.
 */

// Color class mappings for common colors used in the app
export const COLOR_CLASSES: Record<
  string,
  { bg: string; text: string; bgLight: string; border: string }
> = {
  mint: { bg: 'bg-mint', text: 'text-mint', bgLight: 'bg-mint/10', border: 'border-mint' },
  coral: { bg: 'bg-coral', text: 'text-coral', bgLight: 'bg-coral/10', border: 'border-coral' },
  accent: {
    bg: 'bg-accent',
    text: 'text-accent',
    bgLight: 'bg-accent/10',
    border: 'border-accent',
  },
  primary: {
    bg: 'bg-primary',
    text: 'text-primary',
    bgLight: 'bg-primary/10',
    border: 'border-primary',
  },
  secondary: {
    bg: 'bg-secondary',
    text: 'text-secondary',
    bgLight: 'bg-secondary/10',
    border: 'border-secondary',
  },
  destructive: {
    bg: 'bg-destructive',
    text: 'text-destructive',
    bgLight: 'bg-destructive/10',
    border: 'border-destructive',
  },
  muted: { bg: 'bg-muted', text: 'text-muted', bgLight: 'bg-muted/10', border: 'border-muted' },

  // Blues
  'blue-deep': {
    bg: 'bg-blue-deep',
    text: 'text-blue-deep',
    bgLight: 'bg-blue-deep/20',
    border: 'border-blue-deep',
  },
  'blue-mid': {
    bg: 'bg-blue-mid',
    text: 'text-blue-mid',
    bgLight: 'bg-blue-mid/20',
    border: 'border-blue-mid',
  },
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-500',
    bgLight: 'bg-blue-500/10',
    border: 'border-blue-500',
  },

  // Standard colors
  green: {
    bg: 'bg-green-500',
    text: 'text-green-500',
    bgLight: 'bg-green-500/10',
    border: 'border-green-500',
  },
  red: {
    bg: 'bg-red-500',
    text: 'text-red-500',
    bgLight: 'bg-red-500/10',
    border: 'border-red-500',
  },
  yellow: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-500',
    bgLight: 'bg-yellow-500/10',
    border: 'border-yellow-500',
  },
  orange: {
    bg: 'bg-orange-500',
    text: 'text-orange-500',
    bgLight: 'bg-orange-500/10',
    border: 'border-orange-500',
  },
  purple: {
    bg: 'bg-purple-500',
    text: 'text-purple-500',
    bgLight: 'bg-purple-500/10',
    border: 'border-purple-500',
  },
  pink: {
    bg: 'bg-pink-500',
    text: 'text-pink-500',
    bgLight: 'bg-pink-500/10',
    border: 'border-pink-500',
  },
  indigo: {
    bg: 'bg-indigo-500',
    text: 'text-indigo-500',
    bgLight: 'bg-indigo-500/10',
    border: 'border-indigo-500',
  },
  cyan: {
    bg: 'bg-cyan-500',
    text: 'text-cyan-500',
    bgLight: 'bg-cyan-500/10',
    border: 'border-cyan-500',
  },
  teal: {
    bg: 'bg-teal-500',
    text: 'text-teal-500',
    bgLight: 'bg-teal-500/10',
    border: 'border-teal-500',
  },
  emerald: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-500',
    bgLight: 'bg-emerald-500/10',
    border: 'border-emerald-500',
  },
  lime: {
    bg: 'bg-lime-500',
    text: 'text-lime-500',
    bgLight: 'bg-lime-500/10',
    border: 'border-lime-500',
  },
  amber: {
    bg: 'bg-amber-500',
    text: 'text-amber-500',
    bgLight: 'bg-amber-500/10',
    border: 'border-amber-500',
  },
  rose: {
    bg: 'bg-rose-500',
    text: 'text-rose-500',
    bgLight: 'bg-rose-500/10',
    border: 'border-rose-500',
  },
  fuchsia: {
    bg: 'bg-fuchsia-500',
    text: 'text-fuchsia-500',
    bgLight: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500',
  },
  violet: {
    bg: 'bg-violet-500',
    text: 'text-violet-500',
    bgLight: 'bg-violet-500/10',
    border: 'border-violet-500',
  },
  sky: {
    bg: 'bg-sky-500',
    text: 'text-sky-500',
    bgLight: 'bg-sky-500/10',
    border: 'border-sky-500',
  },

  // Gray shades
  gray: {
    bg: 'bg-gray-500',
    text: 'text-gray-500',
    bgLight: 'bg-gray-500/10',
    border: 'border-gray-500',
  },
  slate: {
    bg: 'bg-slate-500',
    text: 'text-slate-500',
    bgLight: 'bg-slate-500/10',
    border: 'border-slate-500',
  },
  zinc: {
    bg: 'bg-zinc-500',
    text: 'text-zinc-500',
    bgLight: 'bg-zinc-500/10',
    border: 'border-zinc-500',
  },
  neutral: {
    bg: 'bg-neutral-500',
    text: 'text-neutral-500',
    bgLight: 'bg-neutral-500/10',
    border: 'border-neutral-500',
  },
  stone: {
    bg: 'bg-stone-500',
    text: 'text-stone-500',
    bgLight: 'bg-stone-500/10',
    border: 'border-stone-500',
  },
}

/**
 * Get color classes for a given color name
 * Falls back to 'accent' if color is not found
 */
export function getColorClasses(color: string): {
  bg: string
  text: string
  bgLight: string
  border: string
} {
  return COLOR_CLASSES[color] || COLOR_CLASSES['accent']
}

/**
 * Weather-specific color mappings
 * For temperature gradients and weather conditions
 */
export const WEATHER_COLORS: Record<string, { gradient: string; text: string; bg: string }> = {
  sunny: {
    gradient: 'from-yellow-400 to-orange-500',
    text: 'text-yellow-500',
    bg: 'bg-yellow-500',
  },
  cloudy: { gradient: 'from-gray-400 to-gray-600', text: 'text-gray-500', bg: 'bg-gray-500' },
  rainy: { gradient: 'from-blue-400 to-blue-600', text: 'text-blue-500', bg: 'bg-blue-500' },
  stormy: { gradient: 'from-gray-600 to-purple-700', text: 'text-purple-500', bg: 'bg-purple-500' },
  snowy: { gradient: 'from-blue-200 to-cyan-300', text: 'text-cyan-500', bg: 'bg-cyan-500' },
  hot: { gradient: 'from-red-500 to-orange-600', text: 'text-red-500', bg: 'bg-red-500' },
  cold: { gradient: 'from-blue-500 to-indigo-600', text: 'text-blue-500', bg: 'bg-blue-500' },
  mild: { gradient: 'from-green-400 to-teal-500', text: 'text-green-500', bg: 'bg-green-500' },
}

/**
 * Get weather-specific color classes
 */
export function getWeatherColors(condition: string): {
  gradient: string
  text: string
  bg: string
} {
  return WEATHER_COLORS[condition.toLowerCase()] || WEATHER_COLORS['mild']
}

/**
 * Traffic-specific color mappings
 */
export const TRAFFIC_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  light: { bg: 'bg-green-500', text: 'text-green-500', badge: 'bg-green-500/20 text-green-500' },
  moderate: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-500',
    badge: 'bg-yellow-500/20 text-yellow-500',
  },
  heavy: {
    bg: 'bg-orange-500',
    text: 'text-orange-500',
    badge: 'bg-orange-500/20 text-orange-500',
  },
  severe: { bg: 'bg-red-500', text: 'text-red-500', badge: 'bg-red-500/20 text-red-500' },
}

/**
 * Get traffic-specific color classes
 */
export function getTrafficColors(level: string): { bg: string; text: string; badge: string } {
  return TRAFFIC_COLORS[level.toLowerCase()] || TRAFFIC_COLORS['moderate']
}

/**
 * Status color mappings
 */
export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  online: { bg: 'bg-green-500', text: 'text-green-500', dot: 'bg-green-500' },
  offline: { bg: 'bg-gray-400', text: 'text-gray-400', dot: 'bg-gray-400' },
  busy: { bg: 'bg-red-500', text: 'text-red-500', dot: 'bg-red-500' },
  away: { bg: 'bg-yellow-500', text: 'text-yellow-500', dot: 'bg-yellow-500' },
  active: { bg: 'bg-green-500', text: 'text-green-500', dot: 'bg-green-500' },
  inactive: { bg: 'bg-gray-400', text: 'text-gray-400', dot: 'bg-gray-400' },
  pending: { bg: 'bg-yellow-500', text: 'text-yellow-500', dot: 'bg-yellow-500' },
  error: { bg: 'bg-red-500', text: 'text-red-500', dot: 'bg-red-500' },
  success: { bg: 'bg-green-500', text: 'text-green-500', dot: 'bg-green-500' },
  warning: { bg: 'bg-amber-500', text: 'text-amber-500', dot: 'bg-amber-500' },
}

/**
 * Get status-specific color classes
 */
export function getStatusColors(status: string): { bg: string; text: string; dot: string } {
  return STATUS_COLORS[status.toLowerCase()] || STATUS_COLORS['inactive']
}
