/**
 * Sleep Tracking Utility
 * Learns user's sleep routine by tracking device usage
 * Records last unlock after 21:00 (bedtime) and first unlock after 4:00 (wake time)
 */

/**
 * Safely parse sleep history from localStorage
 */
function getSleepHistory(): SleepHistory {
  try {
    const stored = localStorage.getItem('flowsphere-sleep-history')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export interface SleepData {
  bedtime: string | null
  wakeTime: string | null
  hours: number
  quality: number
  date: string
}

export interface SleepHistory {
  [date: string]: SleepData
}

/**
 * Record a device unlock event for sleep tracking
 */
export function recordUnlockEvent(): void {
  const now = new Date()
  const hour = now.getHours()
  const today = now.toDateString()

  // Get existing sleep data
  const history: SleepHistory = getSleepHistory()

  if (!history[today]) {
    history[today] = {
      bedtime: null,
      wakeTime: null,
      hours: 0,
      quality: 0,
      date: today,
    }
  }

  // Record bedtime (last unlock after 21:00)
  if (hour >= 21 || hour < 4) {
    history[today].bedtime = now.toISOString()
  }

  // Record wake time (first unlock after 4:00)
  if (hour >= 4 && hour < 12 && !history[today].wakeTime) {
    history[today].wakeTime = now.toISOString()

    // Calculate sleep hours if we have bedtime from previous check
    if (history[today].bedtime) {
      const bedtime = new Date(history[today].bedtime!)
      const wakeTime = new Date(history[today].wakeTime!)
      const diffMs = wakeTime.getTime() - bedtime.getTime()
      const hours = diffMs / (1000 * 60 * 60)

      history[today].hours = Math.round(hours * 10) / 10

      // Calculate quality based on recommended 7-9 hours
      let quality = 0
      if (hours >= 7 && hours <= 9) {
        quality = 100
      } else if (hours >= 6 && hours < 7) {
        quality = 80
      } else if (hours >= 5 && hours < 6) {
        quality = 60
      } else if (hours > 9 && hours <= 10) {
        quality = 90
      } else if (hours > 10) {
        quality = 70
      } else {
        quality = 40
      }

      history[today].quality = quality
    }
  }

  // Save updated history
  localStorage.setItem('flowsphere-sleep-history', JSON.stringify(history))
}

/**
 * Get sleep data for today
 */
export function getTodaySleepData(): SleepData {
  const today = new Date().toDateString()
  const history: SleepHistory = getSleepHistory()

  return (
    history[today] || {
      bedtime: null,
      wakeTime: null,
      hours: 0,
      quality: 0,
      date: today,
    }
  )
}

/**
 * Get average sleep data for the past N days
 */
export function getAverageSleepData(days: number = 7): { hours: number; quality: number } {
  const history: SleepHistory = getSleepHistory()

  const recentDays = Object.values(history)
    .filter(data => data.hours > 0)
    .slice(-days)

  if (recentDays.length === 0) {
    return { hours: 0, quality: 0 }
  }

  const totalHours = recentDays.reduce((sum, data) => sum + data.hours, 0)
  const totalQuality = recentDays.reduce((sum, data) => sum + data.quality, 0)

  return {
    hours: Math.round((totalHours / recentDays.length) * 10) / 10,
    quality: Math.round(totalQuality / recentDays.length),
  }
}

/**
 * Initialize sleep tracking by listening to user activity
 * This should be called when the app loads
 *
 * MEMORY LEAK FIX (Dec 6, 2025):
 * - Now returns cleanup function to remove event listeners
 * - Prevents memory leaks when component unmounts or app reinitializes
 *
 * @returns Cleanup function to remove event listeners
 */
export function initializeSleepTracking(): () => void {
  // Record unlock event on app load
  recordUnlockEvent()

  // Create named handlers so we can remove them later
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      recordUnlockEvent()
    }
  }

  const handleFocus = () => {
    recordUnlockEvent()
  }

  // Record on visibility change (when app comes to foreground)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Record on focus (when user interacts with app)
  window.addEventListener('focus', handleFocus)

  // Return cleanup function to prevent memory leaks
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', handleFocus)
  }
}
