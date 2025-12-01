import { useEffect, useState } from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024
const LARGE_DESKTOP_BREAKPOINT = 1440

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop' | 'large-desktop'
  width: number
  height: number
  orientation: 'portrait' | 'landscape'
  isTouchDevice: boolean
  pixelRatio: number
  os: 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'unknown'
  browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'unknown'
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsTablet(window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsTablet(window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isTablet
}

export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop' | 'large-desktop'>('desktop')

  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth
      if (width < MOBILE_BREAKPOINT) {
        setDeviceType('mobile')
      } else if (width < TABLET_BREAKPOINT) {
        setDeviceType('tablet')
      } else if (width < LARGE_DESKTOP_BREAKPOINT) {
        setDeviceType('desktop')
      } else {
        setDeviceType('large-desktop')
      }
    }

    updateDeviceType()
    window.addEventListener('resize', updateDeviceType)
    return () => window.removeEventListener('resize', updateDeviceType)
  }, [])

  return deviceType
}

function detectOS(): DeviceInfo['os'] {
  const userAgent = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios'
  if (/android/.test(userAgent)) return 'android'
  if (/win/.test(userAgent)) return 'windows'
  if (/mac/.test(userAgent)) return 'mac'
  if (/linux/.test(userAgent)) return 'linux'
  return 'unknown'
}

function detectBrowser(): DeviceInfo['browser'] {
  const userAgent = navigator.userAgent.toLowerCase()
  if (/edg/.test(userAgent)) return 'edge'
  if (/chrome/.test(userAgent)) return 'chrome'
  if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) return 'safari'
  if (/firefox/.test(userAgent)) return 'firefox'
  return 'unknown'
}

export function useDeviceInfo(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => ({
    type: 'desktop',
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    orientation: 'landscape',
    isTouchDevice: false,
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    os: typeof window !== 'undefined' ? detectOS() : 'unknown',
    browser: typeof window !== 'undefined' ? detectBrowser() : 'unknown',
  }))

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      let type: DeviceInfo['type'] = 'desktop'
      if (width < MOBILE_BREAKPOINT) {
        type = 'mobile'
      } else if (width < TABLET_BREAKPOINT) {
        type = 'tablet'
      } else if (width >= LARGE_DESKTOP_BREAKPOINT) {
        type = 'large-desktop'
      }

      setDeviceInfo({
        type,
        width,
        height,
        orientation: width > height ? 'landscape' : 'portrait',
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        pixelRatio: window.devicePixelRatio || 1,
        os: detectOS(),
        browser: detectBrowser(),
      })
    }

    updateDeviceInfo()
    window.addEventListener('resize', updateDeviceInfo)
    window.addEventListener('orientationchange', updateDeviceInfo)

    return () => {
      window.removeEventListener('resize', updateDeviceInfo)
      window.removeEventListener('orientationchange', updateDeviceInfo)
    }
  }, [])

  return deviceInfo
}

// Responsive utility functions
export function getResponsiveValue<T>(
  deviceType: DeviceInfo['type'],
  values: { mobile?: T; tablet?: T; desktop?: T; 'large-desktop'?: T }
): T | undefined {
  return values[deviceType] || values.desktop || values.tablet || values.mobile
}

export function useResponsiveValue<T>(values: {
  mobile?: T
  tablet?: T
  desktop?: T
  'large-desktop'?: T
}): T | undefined {
  const deviceType = useDeviceType()
  return getResponsiveValue(deviceType, values)
}
