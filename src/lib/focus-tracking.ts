/**
 * Focus & Attention Tracking System
 * Tracks user focus during sessions using browser APIs
 */

import { logger } from '@/lib/security-utils'

export interface FocusSession {
  id: string
  startTime: number
  endTime?: number
  totalDuration: number // ms
  focusedDuration: number // ms
  distractedDuration: number // ms
  breaksDuration: number // ms
  focusScore: number // 0-100
  label?: string
  distractions: DistractionEvent[]
  breaks: BreakEvent[]
}

export interface DistractionEvent {
  timestamp: number
  duration: number
  type: 'tab_hidden' | 'idle' | 'app_switch'
}

export interface BreakEvent {
  timestamp: number
  duration: number
  planned: boolean
}

export interface FocusStats {
  totalSessions: number
  totalFocusTime: number
  averageFocusScore: number
  bestFocusTime: string
  longestSession: number
  currentStreak: number
  weeklyData: WeeklyFocusData[]
}

export interface WeeklyFocusData {
  date: string
  focusTime: number
  sessions: number
  avgScore: number
}

const STORAGE_KEY = 'flowsphere-focus-sessions'
const STATS_KEY = 'flowsphere-focus-stats'
const IDLE_THRESHOLD = 60000 // 1 minute of no activity = idle
const DISTRACTION_THRESHOLD = 5000 // 5 seconds to count as distraction

export class FocusTracker {
  private currentSession: FocusSession | null = null
  private sessionStartTime: number = 0
  private lastActivityTime: number = 0
  private isTracking: boolean = false
  private isVisible: boolean = true
  private wasVisible: boolean = true
  private hiddenStartTime: number = 0
  private idleStartTime: number = 0
  private checkInterval: NodeJS.Timeout | null = null
  private listeners: Array<(session: FocusSession) => void> = []

  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Visibility change detection
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    // Activity detection
    document.addEventListener('mousemove', this.handleActivity)
    document.addEventListener('keydown', this.handleActivity)
    document.addEventListener('click', this.handleActivity)
    document.addEventListener('scroll', this.handleActivity)
    document.addEventListener('touchstart', this.handleActivity)
  }

  private handleVisibilityChange = (): void => {
    this.isVisible = !document.hidden
    const now = Date.now()

    if (!this.isTracking || !this.currentSession) return

    if (!this.isVisible && this.wasVisible) {
      // Just became hidden
      this.hiddenStartTime = now
    } else if (this.isVisible && !this.wasVisible) {
      // Just became visible again
      const hiddenDuration = now - this.hiddenStartTime

      if (hiddenDuration > DISTRACTION_THRESHOLD) {
        this.currentSession.distractions.push({
          timestamp: this.hiddenStartTime,
          duration: hiddenDuration,
          type: 'tab_hidden'
        })
        this.currentSession.distractedDuration += hiddenDuration
      }
    }

    this.wasVisible = this.isVisible
    this.notifyListeners()
  }

  private handleActivity = (): void => {
    const now = Date.now()

    if (this.isTracking && this.currentSession) {
      // Check for idle period
      if (this.idleStartTime > 0 && (now - this.lastActivityTime) > IDLE_THRESHOLD) {
        const idleDuration = now - this.idleStartTime

        if (idleDuration > DISTRACTION_THRESHOLD) {
          this.currentSession.distractions.push({
            timestamp: this.idleStartTime,
            duration: idleDuration,
            type: 'idle'
          })
          this.currentSession.distractedDuration += idleDuration
        }

        this.idleStartTime = 0
      }
    }

    this.lastActivityTime = now
  }

  /**
   * Start a new focus session
   */
  startSession(label?: string): FocusSession {
    if (this.currentSession) {
      this.endSession()
    }

    const now = Date.now()
    this.currentSession = {
      id: `focus-${now}`,
      startTime: now,
      totalDuration: 0,
      focusedDuration: 0,
      distractedDuration: 0,
      breaksDuration: 0,
      focusScore: 100,
      label,
      distractions: [],
      breaks: []
    }

    this.sessionStartTime = now
    this.lastActivityTime = now
    this.isTracking = true
    this.isVisible = !document.hidden
    this.wasVisible = this.isVisible

    // Start periodic checks
    this.checkInterval = setInterval(() => this.periodicCheck(), 1000)

    logger.info('Focus session started', { label }, 'FocusTracker')
    this.notifyListeners()

    return this.currentSession
  }

  /**
   * End the current session
   */
  endSession(): FocusSession | null {
    if (!this.currentSession) return null

    const now = Date.now()
    this.currentSession.endTime = now
    this.currentSession.totalDuration = now - this.sessionStartTime

    // Calculate focused duration
    this.currentSession.focusedDuration =
      this.currentSession.totalDuration -
      this.currentSession.distractedDuration -
      this.currentSession.breaksDuration

    // Calculate focus score
    this.currentSession.focusScore = this.calculateFocusScore(this.currentSession)

    // Save session
    this.saveSession(this.currentSession)

    const session = { ...this.currentSession }

    // Cleanup
    this.isTracking = false
    this.currentSession = null
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    logger.info('Focus session ended', {
      duration: session.totalDuration,
      score: session.focusScore
    }, 'FocusTracker')

    this.notifyListeners()
    return session
  }

  /**
   * Take a planned break
   */
  startBreak(): void {
    if (!this.currentSession || !this.isTracking) return

    const breakStart = Date.now()
    this.currentSession.breaks.push({
      timestamp: breakStart,
      duration: 0,
      planned: true
    })

    this.notifyListeners()
  }

  /**
   * End the current break
   */
  endBreak(): void {
    if (!this.currentSession || !this.isTracking) return

    const lastBreak = this.currentSession.breaks[this.currentSession.breaks.length - 1]
    if (lastBreak && lastBreak.duration === 0) {
      lastBreak.duration = Date.now() - lastBreak.timestamp
      this.currentSession.breaksDuration += lastBreak.duration
    }

    this.notifyListeners()
  }

  /**
   * Get current session state
   */
  getCurrentSession(): FocusSession | null {
    if (!this.currentSession) return null

    // Update durations in real-time
    const now = Date.now()
    const session = { ...this.currentSession }
    session.totalDuration = now - this.sessionStartTime
    session.focusedDuration =
      session.totalDuration -
      session.distractedDuration -
      session.breaksDuration
    session.focusScore = this.calculateFocusScore(session)

    return session
  }

  /**
   * Check if currently tracking
   */
  isSessionActive(): boolean {
    return this.isTracking
  }

  /**
   * Subscribe to session updates
   */
  subscribe(callback: (session: FocusSession) => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  /**
   * Get all saved sessions
   */
  getSessions(): FocusSession[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Get focus statistics
   */
  getStats(): FocusStats {
    const sessions = this.getSessions()

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalFocusTime: 0,
        averageFocusScore: 0,
        bestFocusTime: 'N/A',
        longestSession: 0,
        currentStreak: 0,
        weeklyData: []
      }
    }

    const totalFocusTime = sessions.reduce((sum, s) => sum + s.focusedDuration, 0)
    const averageFocusScore = sessions.reduce((sum, s) => sum + s.focusScore, 0) / sessions.length
    const longestSession = Math.max(...sessions.map(s => s.totalDuration))

    // Find best focus time (hour of day)
    const hourCounts: { [hour: number]: { count: number, totalScore: number } } = {}
    sessions.forEach(s => {
      const hour = new Date(s.startTime).getHours()
      if (!hourCounts[hour]) {
        hourCounts[hour] = { count: 0, totalScore: 0 }
      }
      hourCounts[hour].count++
      hourCounts[hour].totalScore += s.focusScore
    })

    let bestHour = 0
    let bestAvgScore = 0
    Object.entries(hourCounts).forEach(([hour, data]) => {
      const avgScore = data.totalScore / data.count
      if (avgScore > bestAvgScore) {
        bestAvgScore = avgScore
        bestHour = parseInt(hour)
      }
    })

    const formatHour = (h: number) => {
      if (h === 0) return '12 AM'
      if (h < 12) return `${h} AM`
      if (h === 12) return '12 PM'
      return `${h - 12} PM`
    }

    // Calculate current streak
    const today = new Date().toDateString()
    const sessionDates = [...new Set(sessions.map(s => new Date(s.startTime).toDateString()))]
    let streak = 0
    let checkDate = new Date()

    while (sessionDates.includes(checkDate.toDateString())) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // Weekly data
    const weeklyData: WeeklyFocusData[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toDateString()
      const daySessions = sessions.filter(s => new Date(s.startTime).toDateString() === dateStr)

      weeklyData.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        focusTime: daySessions.reduce((sum, s) => sum + s.focusedDuration, 0),
        sessions: daySessions.length,
        avgScore: daySessions.length > 0
          ? daySessions.reduce((sum, s) => sum + s.focusScore, 0) / daySessions.length
          : 0
      })
    }

    return {
      totalSessions: sessions.length,
      totalFocusTime,
      averageFocusScore: Math.round(averageFocusScore),
      bestFocusTime: `${formatHour(bestHour)} - ${formatHour(bestHour + 1)}`,
      longestSession,
      currentStreak: streak,
      weeklyData
    }
  }

  /**
   * Clear all session data
   */
  clearData(): void {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STATS_KEY)
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    document.removeEventListener('mousemove', this.handleActivity)
    document.removeEventListener('keydown', this.handleActivity)
    document.removeEventListener('click', this.handleActivity)
    document.removeEventListener('scroll', this.handleActivity)
    document.removeEventListener('touchstart', this.handleActivity)

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
  }

  private periodicCheck(): void {
    if (!this.isTracking || !this.currentSession) return

    const now = Date.now()

    // Check for idle
    if (now - this.lastActivityTime > IDLE_THRESHOLD && this.idleStartTime === 0) {
      this.idleStartTime = this.lastActivityTime
    }

    this.notifyListeners()
  }

  private calculateFocusScore(session: FocusSession): number {
    if (session.totalDuration === 0) return 100

    // Base score from focused time percentage
    const focusedPercent = (session.focusedDuration / session.totalDuration) * 100

    // Penalty for number of distractions
    const distractionPenalty = Math.min(session.distractions.length * 3, 20)

    // Bonus for planned breaks (healthy behavior)
    const breakBonus = Math.min(session.breaks.filter(b => b.planned).length * 2, 10)

    const score = Math.max(0, Math.min(100, focusedPercent - distractionPenalty + breakBonus))
    return Math.round(score)
  }

  private saveSession(session: FocusSession): void {
    try {
      const sessions = this.getSessions()
      sessions.unshift(session)
      // Keep last 100 sessions
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 100)))
    } catch (error) {
      logger.error('Failed to save focus session', error, 'FocusTracker')
    }
  }

  private notifyListeners(): void {
    const session = this.getCurrentSession()
    if (session) {
      this.listeners.forEach(callback => {
        try {
          callback(session)
        } catch (error) {
          logger.error('Focus listener error', error, 'FocusTracker')
        }
      })
    }
  }
}

// Singleton instance
let focusTrackerInstance: FocusTracker | null = null

export function getFocusTracker(): FocusTracker {
  if (!focusTrackerInstance) {
    focusTrackerInstance = new FocusTracker()
  }
  return focusTrackerInstance
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}
