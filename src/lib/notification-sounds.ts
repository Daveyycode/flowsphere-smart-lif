/**
 * Notification sound system for email alerts
 */

// Audio context for playing notification sounds
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

/**
 * Play a simple notification beep
 */
export function playNotificationSound(type: 'normal' | 'important' | 'emergency' = 'normal'): void {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Different frequencies for different notification types
    switch (type) {
      case 'emergency':
        oscillator.frequency.value = 880 // High pitch
        gainNode.gain.value = 0.3
        break
      case 'important':
        oscillator.frequency.value = 660 // Medium pitch
        gainNode.gain.value = 0.2
        break
      default:
        oscillator.frequency.value = 440 // Normal pitch
        gainNode.gain.value = 0.15
    }

    oscillator.type = 'sine'

    const now = ctx.currentTime
    oscillator.start(now)

    // Fade out
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
    oscillator.stop(now + 0.3)

    // For emergency, play twice
    if (type === 'emergency') {
      setTimeout(() => playNotificationSound('emergency'), 400)
    }
  } catch (error) {
    console.error('Failed to play notification sound:', error)
  }
}

/**
 * Play system notification sound (uses browser's built-in notification sound)
 */
export function playSystemNotification(): void {
  // Request notification permission if not granted
  if ('Notification' in window && Notification.permission === 'granted') {
    // Create a silent notification that will trigger the system sound
    const notification = new Notification('New Email', {
      body: 'You have new email',
      icon: '/icon.png',
      silent: false,
      tag: 'flowsphere-email'
    })

    // Auto-close after 3 seconds
    setTimeout(() => notification.close(), 3000)
  } else {
    // Fallback to custom sound
    playNotificationSound('normal')
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
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
