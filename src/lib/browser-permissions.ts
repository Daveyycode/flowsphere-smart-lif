/**
 * Real Browser Permissions API
 *
 * This module provides actual browser permission requests - NOT aesthetic placeholders.
 * When a user toggles a permission, it triggers the real browser permission dialog.
 */

export type BrowserPermissionType =
  | 'geolocation' // Location
  | 'notifications' // Push notifications
  | 'camera' // Camera access
  | 'microphone' // Microphone access

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported'

interface PermissionResult {
  status: PermissionStatus
  error?: string
}

/**
 * Check current permission status without prompting
 */
export async function checkPermissionStatus(
  type: BrowserPermissionType
): Promise<PermissionStatus> {
  try {
    switch (type) {
      case 'geolocation':
        if (!navigator.geolocation) return 'unsupported'
        const geoResult = await navigator.permissions.query({ name: 'geolocation' })
        return geoResult.state as PermissionStatus

      case 'notifications':
        if (!('Notification' in window)) return 'unsupported'
        return Notification.permission as PermissionStatus

      case 'camera':
      case 'microphone':
        if (!navigator.mediaDevices?.getUserMedia) return 'unsupported'
        const mediaType = type === 'camera' ? 'camera' : 'microphone'
        try {
          const result = await navigator.permissions.query({ name: mediaType as PermissionName })
          return result.state as PermissionStatus
        } catch {
          // Some browsers don't support querying camera/microphone permissions
          return 'prompt'
        }

      default:
        return 'unsupported'
    }
  } catch (error) {
    console.error(`[Permissions] Error checking ${type}:`, error)
    return 'prompt' // Assume we can prompt if we can't check
  }
}

/**
 * Request a specific browser permission - triggers the REAL browser dialog
 */
export async function requestPermission(type: BrowserPermissionType): Promise<PermissionResult> {
  console.log(`[Permissions] Requesting REAL browser permission: ${type}`)

  try {
    switch (type) {
      case 'geolocation':
        return await requestGeolocation()

      case 'notifications':
        return await requestNotifications()

      case 'camera':
        return await requestCamera()

      case 'microphone':
        return await requestMicrophone()

      default:
        return { status: 'unsupported', error: 'Unknown permission type' }
    }
  } catch (error: any) {
    console.error(`[Permissions] Error requesting ${type}:`, error)
    return { status: 'denied', error: error.message || 'Permission request failed' }
  }
}

/**
 * Request location permission
 */
async function requestGeolocation(): Promise<PermissionResult> {
  if (!navigator.geolocation) {
    return { status: 'unsupported', error: 'Geolocation not supported' }
  }

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      () => {
        console.log('[Permissions] Geolocation GRANTED by user')
        resolve({ status: 'granted' })
      },
      error => {
        console.log('[Permissions] Geolocation DENIED:', error.message)
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ status: 'denied', error: 'User denied location access' })
        } else {
          resolve({ status: 'denied', error: error.message })
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

/**
 * Request notification permission
 */
async function requestNotifications(): Promise<PermissionResult> {
  if (!('Notification' in window)) {
    return { status: 'unsupported', error: 'Notifications not supported' }
  }

  const result = await Notification.requestPermission()
  console.log(`[Permissions] Notification permission: ${result}`)

  if (result === 'granted') {
    // Show a test notification to confirm it works
    new Notification('FlowSphere', {
      body: 'Notifications are now enabled!',
      icon: '/favicon.ico',
    })
  }

  return { status: result as PermissionStatus }
}

/**
 * Request camera permission
 */
async function requestCamera(): Promise<PermissionResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { status: 'unsupported', error: 'Camera not supported' }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    // Immediately stop the stream - we just needed to trigger the permission
    stream.getTracks().forEach(track => track.stop())
    console.log('[Permissions] Camera GRANTED by user')
    return { status: 'granted' }
  } catch (error: any) {
    console.log('[Permissions] Camera DENIED:', error.message)
    if (error.name === 'NotAllowedError') {
      return { status: 'denied', error: 'User denied camera access' }
    }
    return { status: 'denied', error: error.message }
  }
}

/**
 * Request microphone permission
 */
async function requestMicrophone(): Promise<PermissionResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { status: 'unsupported', error: 'Microphone not supported' }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    // Immediately stop the stream - we just needed to trigger the permission
    stream.getTracks().forEach(track => track.stop())
    console.log('[Permissions] Microphone GRANTED by user')
    return { status: 'granted' }
  } catch (error: any) {
    console.log('[Permissions] Microphone DENIED:', error.message)
    if (error.name === 'NotAllowedError') {
      return { status: 'denied', error: 'User denied microphone access' }
    }
    return { status: 'denied', error: error.message }
  }
}

/**
 * Request all critical permissions at once (used on first login)
 */
export async function requestAllCriticalPermissions(): Promise<{
  location: PermissionResult
  notifications: PermissionResult
  camera: PermissionResult
  microphone: PermissionResult
}> {
  console.log('[Permissions] Requesting all critical permissions...')

  // Request in sequence to avoid overwhelming the user
  const location = await requestPermission('geolocation')
  const notifications = await requestPermission('notifications')
  const camera = await requestPermission('camera')
  const microphone = await requestPermission('microphone')

  return { location, notifications, camera, microphone }
}

/**
 * Get all current permission statuses
 */
export async function getAllPermissionStatuses(): Promise<{
  location: PermissionStatus
  notifications: PermissionStatus
  camera: PermissionStatus
  microphone: PermissionStatus
}> {
  const [location, notifications, camera, microphone] = await Promise.all([
    checkPermissionStatus('geolocation'),
    checkPermissionStatus('notifications'),
    checkPermissionStatus('camera'),
    checkPermissionStatus('microphone'),
  ])

  return { location, notifications, camera, microphone }
}

/**
 * Subscribe to permission changes (when user changes permissions in browser settings)
 */
export function subscribeToPermissionChanges(
  type: BrowserPermissionType,
  callback: (status: PermissionStatus) => void
): () => void {
  let permissionStatus: PermissionStatus | null = null

  const checkAndNotify = async () => {
    const newStatus = await checkPermissionStatus(type)
    if (permissionStatus !== null && newStatus !== permissionStatus) {
      callback(newStatus)
    }
    permissionStatus = newStatus
  }

  // Check periodically (browser doesn't always fire change events reliably)
  const interval = setInterval(checkAndNotify, 5000)
  checkAndNotify() // Initial check

  return () => clearInterval(interval)
}
