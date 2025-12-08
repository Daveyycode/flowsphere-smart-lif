/**
 * PWA utilities for native-like features
 */

import { logger } from '@/lib/security-utils'

// Register service worker
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      })

      logger.info('Service Worker registered successfully:', registration.scope, 'PWA')

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available, prompt user to refresh
              if (confirm('New version available! Reload to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' })
                window.location.reload()
              }
            }
          })
        }
      })

      return registration
    } catch (error) {
      logger.error('Service Worker registration failed:', error, 'PWA')
      return null
    }
  }
  return null
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    logger.info('This browser does not support notifications', null, 'PWA')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

// Show notification
export async function showNotification(title: string, options?: NotificationOptions) {
  const hasPermission = await requestNotificationPermission()

  if (hasPermission) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Use service worker to show notification (works in background)
      const registration = await navigator.serviceWorker.ready
      return registration.showNotification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options
      } as NotificationOptions)
    } else {
      // Fallback to regular notification
      return new Notification(title, {
        icon: '/icon-192.png',
        ...options
      })
    }
  }
}

// Check if app is installed
export function isAppInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true
}

// Prompt to install app
export function promptInstall(deferredPrompt: any) {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    return deferredPrompt.userChoice
  }
  return Promise.resolve({ outcome: 'dismissed' })
}

// Play sound
export function playSound(soundType: 'notification' | 'success' | 'error' | 'warning') {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  // Different frequencies for different sound types
  const frequencies: Record<typeof soundType, number[]> = {
    notification: [800, 1000],
    success: [523, 659, 784],
    error: [400, 300],
    warning: [600, 500, 600]
  }

  const freq = frequencies[soundType]
  oscillator.frequency.setValueAtTime(freq[0], audioContext.currentTime)

  if (freq.length > 1) {
    freq.forEach((f, i) => {
      if (i > 0) {
        oscillator.frequency.setValueAtTime(f, audioContext.currentTime + i * 0.1)
      }
    })
  }

  oscillator.type = 'sine'
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.3)
}

// Vibrate
export function vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

// Make phone call
export function makePhoneCall(phoneNumber: string) {
  window.location.href = `tel:${phoneNumber}`
}

// Send SMS
export function sendSMS(phoneNumber: string, message?: string) {
  const url = message
    ? `sms:${phoneNumber}?body=${encodeURIComponent(message)}`
    : `sms:${phoneNumber}`
  window.location.href = url
}

// Open email client
export function openEmail(email: string, subject?: string, body?: string) {
  let url = `mailto:${email}`
  const params: string[] = []
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`)
  if (body) params.push(`body=${encodeURIComponent(body)}`)
  if (params.length) url += '?' + params.join('&')
  window.location.href = url
}

// Share content
export async function shareContent(data: ShareData) {
  if (navigator.share) {
    try {
      await navigator.share(data)
      return true
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        logger.error('Share failed:', error, 'PWA')
      }
      return false
    }
  } else {
    // Fallback: copy to clipboard
    if (data.text || data.url) {
      await navigator.clipboard.writeText(data.text || data.url || '')
      return true
    }
    return false
  }
}

// Get geolocation
export function getGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      })
    } else {
      reject(new Error('Geolocation not supported'))
    }
  })
}

// Check device capabilities
export function getDeviceCapabilities() {
  return {
    hasNotifications: 'Notification' in window,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasGeolocation: 'geolocation' in navigator,
    hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    hasVibration: 'vibrate' in navigator,
    hasShare: 'share' in navigator,
    hasSpeechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    hasBluetooth: 'bluetooth' in navigator,
    isInstalled: isAppInstalled(),
    isOnline: navigator.onLine
  }
}
