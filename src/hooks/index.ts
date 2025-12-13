/**
 * FlowSphere Hooks Index
 *
 * Central export for all custom hooks
 */

// Existing hooks
export { useTheme } from './use-theme'
export {
  useDeviceInfo,
  useIsMobile,
  useIsTablet,
  useDeviceType,
  useResponsiveValue,
} from './use-mobile'

// New utility hooks
export { useSafeTimers, useDebounce, useThrottle, useCountdown } from './use-safe-timers'
