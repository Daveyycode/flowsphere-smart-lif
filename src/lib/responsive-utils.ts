import { DeviceInfo } from '@/hooks/use-mobile'

// Responsive class name utilities
export function getResponsiveClasses(
  device: DeviceInfo['type'],
  classes: {
    mobile?: string
    tablet?: string
    desktop?: string
    'large-desktop'?: string
    base?: string
  }
): string {
  const baseClasses = classes.base || ''
  const deviceClasses = classes[device] || classes.desktop || classes.tablet || classes.mobile || ''
  return `${baseClasses} ${deviceClasses}`.trim()
}

// Responsive sizing utilities
export const responsiveSizes = {
  text: {
    xs: {
      mobile: 'text-[10px]',
      tablet: 'text-xs',
      desktop: 'text-xs',
      'large-desktop': 'text-xs',
    },
    sm: {
      mobile: 'text-xs',
      tablet: 'text-sm',
      desktop: 'text-sm',
      'large-desktop': 'text-sm',
    },
    base: {
      mobile: 'text-sm',
      tablet: 'text-base',
      desktop: 'text-base',
      'large-desktop': 'text-base',
    },
    lg: {
      mobile: 'text-base',
      tablet: 'text-lg',
      desktop: 'text-lg',
      'large-desktop': 'text-xl',
    },
    xl: {
      mobile: 'text-lg',
      tablet: 'text-xl',
      desktop: 'text-2xl',
      'large-desktop': 'text-3xl',
    },
    '2xl': {
      mobile: 'text-xl',
      tablet: 'text-2xl',
      desktop: 'text-3xl',
      'large-desktop': 'text-4xl',
    },
    '3xl': {
      mobile: 'text-2xl',
      tablet: 'text-3xl',
      desktop: 'text-4xl',
      'large-desktop': 'text-5xl',
    },
    '4xl': {
      mobile: 'text-3xl',
      tablet: 'text-4xl',
      desktop: 'text-5xl',
      'large-desktop': 'text-6xl',
    },
  },
  spacing: {
    xs: {
      mobile: 'p-2',
      tablet: 'p-3',
      desktop: 'p-3',
      'large-desktop': 'p-4',
    },
    sm: {
      mobile: 'p-3',
      tablet: 'p-4',
      desktop: 'p-4',
      'large-desktop': 'p-5',
    },
    md: {
      mobile: 'p-4',
      tablet: 'p-6',
      desktop: 'p-6',
      'large-desktop': 'p-8',
    },
    lg: {
      mobile: 'p-6',
      tablet: 'p-8',
      desktop: 'p-8',
      'large-desktop': 'p-10',
    },
    xl: {
      mobile: 'p-8',
      tablet: 'p-10',
      desktop: 'p-12',
      'large-desktop': 'p-16',
    },
  },
  gap: {
    xs: {
      mobile: 'gap-1',
      tablet: 'gap-2',
      desktop: 'gap-2',
      'large-desktop': 'gap-2',
    },
    sm: {
      mobile: 'gap-2',
      tablet: 'gap-3',
      desktop: 'gap-3',
      'large-desktop': 'gap-4',
    },
    md: {
      mobile: 'gap-3',
      tablet: 'gap-4',
      desktop: 'gap-4',
      'large-desktop': 'gap-6',
    },
    lg: {
      mobile: 'gap-4',
      tablet: 'gap-6',
      desktop: 'gap-6',
      'large-desktop': 'gap-8',
    },
    xl: {
      mobile: 'gap-6',
      tablet: 'gap-8',
      desktop: 'gap-8',
      'large-desktop': 'gap-10',
    },
  },
  button: {
    sm: {
      mobile: 'px-2 py-1 text-xs',
      tablet: 'px-3 py-1.5 text-sm',
      desktop: 'px-3 py-1.5 text-sm',
      'large-desktop': 'px-4 py-2 text-sm',
    },
    md: {
      mobile: 'px-3 py-2 text-sm',
      tablet: 'px-4 py-2 text-base',
      desktop: 'px-4 py-2 text-base',
      'large-desktop': 'px-5 py-2.5 text-base',
    },
    lg: {
      mobile: 'px-4 py-2.5 text-base',
      tablet: 'px-6 py-3 text-lg',
      desktop: 'px-6 py-3 text-lg',
      'large-desktop': 'px-8 py-4 text-xl',
    },
  },
  icon: {
    sm: {
      mobile: 'w-4 h-4',
      tablet: 'w-4 h-4',
      desktop: 'w-4 h-4',
      'large-desktop': 'w-5 h-5',
    },
    md: {
      mobile: 'w-5 h-5',
      tablet: 'w-5 h-5',
      desktop: 'w-6 h-6',
      'large-desktop': 'w-6 h-6',
    },
    lg: {
      mobile: 'w-6 h-6',
      tablet: 'w-8 h-8',
      desktop: 'w-8 h-8',
      'large-desktop': 'w-10 h-10',
    },
    xl: {
      mobile: 'w-8 h-8',
      tablet: 'w-10 h-10',
      desktop: 'w-12 h-12',
      'large-desktop': 'w-16 h-16',
    },
  },
  container: {
    sm: {
      mobile: 'max-w-full px-4',
      tablet: 'max-w-2xl px-6',
      desktop: 'max-w-4xl px-8',
      'large-desktop': 'max-w-5xl px-10',
    },
    md: {
      mobile: 'max-w-full px-4',
      tablet: 'max-w-3xl px-6',
      desktop: 'max-w-5xl px-8',
      'large-desktop': 'max-w-6xl px-10',
    },
    lg: {
      mobile: 'max-w-full px-4',
      tablet: 'max-w-4xl px-6',
      desktop: 'max-w-6xl px-8',
      'large-desktop': 'max-w-7xl px-12',
    },
    full: {
      mobile: 'max-w-full px-4',
      tablet: 'max-w-full px-6',
      desktop: 'max-w-full px-8',
      'large-desktop': 'max-w-full px-12',
    },
  },
  grid: {
    1: {
      mobile: 'grid-cols-1',
      tablet: 'grid-cols-1',
      desktop: 'grid-cols-1',
      'large-desktop': 'grid-cols-1',
    },
    2: {
      mobile: 'grid-cols-1',
      tablet: 'grid-cols-2',
      desktop: 'grid-cols-2',
      'large-desktop': 'grid-cols-2',
    },
    3: {
      mobile: 'grid-cols-1',
      tablet: 'grid-cols-2',
      desktop: 'grid-cols-3',
      'large-desktop': 'grid-cols-3',
    },
    4: {
      mobile: 'grid-cols-2',
      tablet: 'grid-cols-3',
      desktop: 'grid-cols-4',
      'large-desktop': 'grid-cols-4',
    },
    6: {
      mobile: 'grid-cols-2',
      tablet: 'grid-cols-3',
      desktop: 'grid-cols-4',
      'large-desktop': 'grid-cols-6',
    },
  },
}

// Get responsive class based on device type
export function getResponsiveSize(
  device: DeviceInfo['type'],
  category: keyof typeof responsiveSizes,
  size: string
): string {
  const categoryMap = responsiveSizes[category] as Record<string, Record<string, string>>
  const sizeMap = categoryMap[size]
  return sizeMap?.[device] || sizeMap?.desktop || ''
}

// Layout utilities
export function getResponsiveLayout(device: DeviceInfo['type']): {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLargeDesktop: boolean
  isTouch: boolean
  columns: number
  gridCols: string
  containerPadding: string
} {
  return {
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    isLargeDesktop: device === 'large-desktop',
    isTouch: device === 'mobile' || device === 'tablet',
    columns: device === 'mobile' ? 1 : device === 'tablet' ? 2 : device === 'desktop' ? 3 : 4,
    gridCols: device === 'mobile' ? 'grid-cols-1' : device === 'tablet' ? 'grid-cols-2' : device === 'desktop' ? 'grid-cols-3' : 'grid-cols-4',
    containerPadding: device === 'mobile' ? 'px-4' : device === 'tablet' ? 'px-6' : device === 'desktop' ? 'px-8' : 'px-12',
  }
}

// Get responsive card size
export function getResponsiveCardSize(device: DeviceInfo['type']): {
  padding: string
  titleSize: string
  textSize: string
  iconSize: string
  gap: string
} {
  return {
    padding: getResponsiveSize(device, 'spacing', 'md'),
    titleSize: getResponsiveSize(device, 'text', 'lg'),
    textSize: getResponsiveSize(device, 'text', 'base'),
    iconSize: getResponsiveSize(device, 'icon', 'md'),
    gap: getResponsiveSize(device, 'gap', 'md'),
  }
}

// Touch-friendly target sizes
export const touchTargetSizes = {
  mobile: 'min-h-[44px] min-w-[44px]', // Apple HIG minimum
  tablet: 'min-h-[40px] min-w-[40px]',
  desktop: 'min-h-[36px] min-w-[36px]',
  'large-desktop': 'min-h-[36px] min-w-[36px]',
}

export function getTouchTargetSize(device: DeviceInfo['type']): string {
  return touchTargetSizes[device]
}
