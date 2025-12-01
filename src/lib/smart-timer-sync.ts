/**
 * Smart Remote Timer Sync
 * Cross-device timer synchronization
 * View and control timer from any device (phone, laptop, tablet)
 */

export interface TimerState {
  id: string
  userId: string
  type: 'countdown' | 'stopwatch' | 'pomodoro'
  status: 'idle' | 'running' | 'paused' | 'completed'
  startTime?: number // Unix timestamp
  pauseTime?: number // Unix timestamp
  elapsedTime: number // Milliseconds
  totalDuration?: number // Milliseconds (for countdown)
  label?: string
  sessions?: number // For pomodoro
  currentSession?: number
  lastSync: number
}

export interface TimerDevice {
  id: string
  name: string
  type: 'phone' | 'laptop' | 'tablet' | 'desktop'
  lastSeen: number
  active: boolean
}

/**
 * Smart Timer Sync Manager
 * Handles real-time timer synchronization across devices
 */
export class SmartTimerSyncManager {
  private storageKey = 'flowsphere-timer-state'
  private devicesKey = 'flowsphere-timer-devices'
  private syncIntervalId: NodeJS.Timeout | null = null
  private syncInterval = 1000 // Sync every 1 second
  private listeners: Array<(state: TimerState) => void> = []
  private deviceId: string
  private userId: string

  constructor(userId: string) {
    this.userId = userId
    this.deviceId = this.getOrCreateDeviceId()
    this.registerDevice()
    this.startSyncListener()
  }

  /**
   * Start a countdown timer
   */
  startCountdown(duration: number, label?: string): TimerState {
    const state: TimerState = {
      id: `timer-${Date.now()}`,
      userId: this.userId,
      type: 'countdown',
      status: 'running',
      startTime: Date.now(),
      elapsedTime: 0,
      totalDuration: duration,
      label,
      lastSync: Date.now()
    }

    this.saveState(state)
    this.startAutoSync()
    this.notifyListeners(state)

    return state
  }

  /**
   * Start a stopwatch
   */
  startStopwatch(label?: string): TimerState {
    const state: TimerState = {
      id: `timer-${Date.now()}`,
      userId: this.userId,
      type: 'stopwatch',
      status: 'running',
      startTime: Date.now(),
      elapsedTime: 0,
      label,
      lastSync: Date.now()
    }

    this.saveState(state)
    this.startAutoSync()
    this.notifyListeners(state)

    return state
  }

  /**
   * Start a pomodoro timer
   */
  startPomodoro(
    workDuration: number = 25 * 60 * 1000, // 25 minutes
    sessions: number = 4,
    label?: string
  ): TimerState {
    const state: TimerState = {
      id: `timer-${Date.now()}`,
      userId: this.userId,
      type: 'pomodoro',
      status: 'running',
      startTime: Date.now(),
      elapsedTime: 0,
      totalDuration: workDuration,
      label,
      sessions,
      currentSession: 1,
      lastSync: Date.now()
    }

    this.saveState(state)
    this.startAutoSync()
    this.notifyListeners(state)

    return state
  }

  /**
   * Pause the current timer
   */
  pause(): TimerState | null {
    const state = this.getCurrentState()
    if (!state || state.status !== 'running') return null

    state.status = 'paused'
    state.pauseTime = Date.now()

    // Calculate elapsed time
    if (state.startTime) {
      state.elapsedTime += Date.now() - state.startTime
    }

    state.lastSync = Date.now()

    this.saveState(state)
    this.stopAutoSync()
    this.notifyListeners(state)

    return state
  }

  /**
   * Resume the timer
   */
  resume(): TimerState | null {
    const state = this.getCurrentState()
    if (!state || state.status !== 'paused') return null

    state.status = 'running'
    state.startTime = Date.now()
    state.pauseTime = undefined
    state.lastSync = Date.now()

    this.saveState(state)
    this.startAutoSync()
    this.notifyListeners(state)

    return state
  }

  /**
   * Stop the timer
   */
  stop(): TimerState | null {
    const state = this.getCurrentState()
    if (!state) return null

    state.status = 'completed'

    // Calculate final elapsed time
    if (state.status === 'running' && state.startTime) {
      state.elapsedTime += Date.now() - state.startTime
    }

    state.lastSync = Date.now()

    this.saveState(state)
    this.stopAutoSync()
    this.notifyListeners(state)

    return state
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.clearState()
    this.stopAutoSync()

    const emptyState: TimerState = {
      id: '',
      userId: this.userId,
      type: 'stopwatch',
      status: 'idle',
      elapsedTime: 0,
      lastSync: Date.now()
    }

    this.notifyListeners(emptyState)
  }

  /**
   * Get current timer state
   */
  getCurrentState(): TimerState | null {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) return null

      const state: TimerState = JSON.parse(stored)

      // Only return if it belongs to this user
      if (state.userId !== this.userId) return null

      return state
    } catch {
      return null
    }
  }

  /**
   * Get current timer value in milliseconds
   */
  getCurrentTime(): number {
    const state = this.getCurrentState()
    if (!state) return 0

    if (state.status === 'running' && state.startTime) {
      return state.elapsedTime + (Date.now() - state.startTime)
    }

    return state.elapsedTime
  }

  /**
   * Get formatted time string
   */
  getFormattedTime(): string {
    const ms = this.getCurrentTime()
    return this.formatTime(ms)
  }

  /**
   * Get remaining time for countdown
   */
  getRemainingTime(): number {
    const state = this.getCurrentState()
    if (!state || state.type !== 'countdown' || !state.totalDuration) {
      return 0
    }

    const elapsed = this.getCurrentTime()
    const remaining = state.totalDuration - elapsed

    return Math.max(0, remaining)
  }

  /**
   * Get formatted remaining time
   */
  getFormattedRemainingTime(): string {
    const ms = this.getRemainingTime()
    return this.formatTime(ms)
  }

  /**
   * Check if timer is complete
   */
  isComplete(): boolean {
    const state = this.getCurrentState()
    if (!state) return false

    if (state.status === 'completed') return true

    if (state.type === 'countdown' && state.totalDuration) {
      return this.getCurrentTime() >= state.totalDuration
    }

    return false
  }

  /**
   * Subscribe to timer updates
   */
  subscribe(callback: (state: TimerState) => void): () => void {
    this.listeners.push(callback)

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  /**
   * Get all connected devices
   */
  getConnectedDevices(): TimerDevice[] {
    try {
      const stored = localStorage.getItem(this.devicesKey)
      if (!stored) return []

      const devices: TimerDevice[] = JSON.parse(stored)

      // Filter to show only recently active devices (last 5 minutes)
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
      const active = devices.filter(d => d.lastSeen > fiveMinutesAgo)

      // Update active status
      active.forEach(d => {
        d.active = d.lastSeen > Date.now() - (30 * 1000) // Active if seen in last 30 seconds
      })

      return active
    } catch {
      return []
    }
  }

  /**
   * Clean up and stop syncing
   */
  destroy(): void {
    this.stopAutoSync()
    this.stopSyncListener()
    this.unregisterDevice()
  }

  // Private methods

  /**
   * Save timer state
   */
  private saveState(state: TimerState): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state))

      // Also update device last seen
      this.updateDeviceActivity()

      // Trigger storage event for cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: this.storageKey,
        newValue: JSON.stringify(state),
        storageArea: localStorage
      }))
    } catch (error) {
      console.error('Failed to save timer state:', error)
    }
  }

  /**
   * Clear timer state
   */
  private clearState(): void {
    localStorage.removeItem(this.storageKey)
  }

  /**
   * Start auto-sync interval
   */
  private startAutoSync(): void {
    if (this.syncIntervalId) return

    this.syncIntervalId = setInterval(() => {
      const state = this.getCurrentState()
      if (state && state.status === 'running') {
        // Update last sync time
        state.lastSync = Date.now()
        this.saveState(state)

        // Notify listeners
        this.notifyListeners(state)

        // Check if countdown is complete
        if (state.type === 'countdown' && this.isComplete()) {
          this.handleTimerComplete(state)
        }
      }
    }, this.syncInterval)
  }

  /**
   * Stop auto-sync interval
   */
  private stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId)
      this.syncIntervalId = null
    }
  }

  /**
   * Start listening for storage changes (cross-device sync)
   */
  private startSyncListener(): void {
    window.addEventListener('storage', this.handleStorageChange)
  }

  /**
   * Stop listening for storage changes
   */
  private stopSyncListener(): void {
    window.removeEventListener('storage', this.handleStorageChange)
  }

  /**
   * Handle storage changes from other devices/tabs
   */
  private handleStorageChange = (event: StorageEvent): void => {
    if (event.key === this.storageKey && event.newValue) {
      try {
        const state: TimerState = JSON.parse(event.newValue)
        if (state.userId === this.userId) {
          this.notifyListeners(state)

          // Sync auto-sync state
          if (state.status === 'running' && !this.syncIntervalId) {
            this.startAutoSync()
          } else if (state.status !== 'running' && this.syncIntervalId) {
            this.stopAutoSync()
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(state: TimerState): void {
    this.listeners.forEach(callback => {
      try {
        callback(state)
      } catch (error) {
        console.error('Listener error:', error)
      }
    })
  }

  /**
   * Handle timer completion
   */
  private handleTimerComplete(state: TimerState): void {
    if (state.type === 'pomodoro' && state.currentSession && state.sessions) {
      // Start next pomodoro session
      if (state.currentSession < state.sessions) {
        state.currentSession++
        state.startTime = Date.now()
        state.elapsedTime = 0
        this.saveState(state)

        // Play notification sound
        this.playNotificationSound()

        // Show notification
        this.showNotification(`Pomodoro session ${state.currentSession} started!`)
      } else {
        // All sessions complete
        this.stop()
        this.playNotificationSound()
        this.showNotification('All pomodoro sessions completed!')
      }
    } else {
      // Countdown complete
      this.stop()
      this.playNotificationSound()
      this.showNotification(state.label ? `${state.label} completed!` : 'Timer completed!')
    }
  }

  /**
   * Play notification sound
   */
  private playNotificationSound(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch {
      // Fail silently if audio not available
    }
  }

  /**
   * Show browser notification
   */
  private showNotification(message: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('FlowSphere Timer', {
        body: message,
        icon: '/icon.png',
        badge: '/badge.png'
      })
    }
  }

  /**
   * Format milliseconds to HH:MM:SS
   */
  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  /**
   * Get or create unique device ID
   */
  private getOrCreateDeviceId(): string {
    const key = 'flowsphere-device-id'
    let deviceId = localStorage.getItem(key)

    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem(key, deviceId)
    }

    return deviceId
  }

  /**
   * Register this device
   */
  private registerDevice(): void {
    const devices = this.getConnectedDevices()

    // Check if device already exists
    let device = devices.find(d => d.id === this.deviceId)

    if (!device) {
      // Create new device record
      device = {
        id: this.deviceId,
        name: this.getDeviceName(),
        type: this.getDeviceType(),
        lastSeen: Date.now(),
        active: true
      }
      devices.push(device)
    } else {
      // Update existing device
      device.lastSeen = Date.now()
      device.active = true
    }

    localStorage.setItem(this.devicesKey, JSON.stringify(devices))
  }

  /**
   * Update device activity timestamp
   */
  private updateDeviceActivity(): void {
    const devices = this.getConnectedDevices()
    const device = devices.find(d => d.id === this.deviceId)

    if (device) {
      device.lastSeen = Date.now()
      device.active = true
      localStorage.setItem(this.devicesKey, JSON.stringify(devices))
    }
  }

  /**
   * Unregister this device
   */
  private unregisterDevice(): void {
    const devices = this.getConnectedDevices()
    const device = devices.find(d => d.id === this.deviceId)

    if (device) {
      device.active = false
      localStorage.setItem(this.devicesKey, JSON.stringify(devices))
    }
  }

  /**
   * Get device name
   */
  private getDeviceName(): string {
    const type = this.getDeviceType()
    return `${type.charAt(0).toUpperCase() + type.slice(1)} (${navigator.platform})`
  }

  /**
   * Detect device type
   */
  private getDeviceType(): TimerDevice['type'] {
    const ua = navigator.userAgent.toLowerCase()

    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'phone'
    } else if (ua.includes('ipad') || ua.includes('tablet')) {
      return 'tablet'
    } else if (ua.includes('mac') || ua.includes('windows') || ua.includes('linux')) {
      return 'laptop'
    }

    return 'desktop'
  }
}

/**
 * React hook for timer sync
 */
export function useSmartTimer(userId: string) {
  const manager = new SmartTimerSyncManager(userId)

  return {
    startCountdown: (duration: number, label?: string) => manager.startCountdown(duration, label),
    startStopwatch: (label?: string) => manager.startStopwatch(label),
    startPomodoro: (duration?: number, sessions?: number, label?: string) =>
      manager.startPomodoro(duration, sessions, label),
    pause: () => manager.pause(),
    resume: () => manager.resume(),
    stop: () => manager.stop(),
    reset: () => manager.reset(),
    getCurrentState: () => manager.getCurrentState(),
    getCurrentTime: () => manager.getCurrentTime(),
    getFormattedTime: () => manager.getFormattedTime(),
    getRemainingTime: () => manager.getRemainingTime(),
    getFormattedRemainingTime: () => manager.getFormattedRemainingTime(),
    isComplete: () => manager.isComplete(),
    subscribe: (callback: (state: TimerState) => void) => manager.subscribe(callback),
    getConnectedDevices: () => manager.getConnectedDevices(),
    destroy: () => manager.destroy()
  }
}
