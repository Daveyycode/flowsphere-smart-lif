/**
 * FlowSphere Remote Timer System
 * Real-time timer synchronization across devices using Supabase Realtime
 * Similar to stagetimer.io functionality
 */

import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { logger } from '@/lib/security-utils'

// Timer Room State
export interface TimerRoom {
  id: string
  code: string // 6-character shareable code
  name: string
  createdBy: string
  createdAt: number
  settings: RoomSettings
}

export interface RoomSettings {
  showMilliseconds: boolean
  countDirection: 'up' | 'down'
  autoStartNext: boolean
  flashOnComplete: boolean
  soundEnabled: boolean
  // FlowSphere themes - matches use-theme.ts ColorTheme
  theme: 'neon-noir' | 'aurora-borealis' | 'cosmic-latte' | 'candy-shop' | 'black-gray' | 'custom'
  fontSize: 'small' | 'medium' | 'large' | 'xlarge'
  // Custom theme colors (optional, used when theme is 'custom')
  customTheme?: {
    background: string
    foreground: string
    primary: string
    accent: string
  }
  // Message auto-dismiss settings
  messageAutoDismiss: boolean
  messageDefaultDuration: number // in seconds
}

export interface TimerState {
  status: 'idle' | 'running' | 'paused' | 'completed'
  type: 'countdown' | 'stopwatch' | 'countup'
  duration: number // total duration in ms
  elapsed: number // elapsed time in ms
  remaining: number // remaining time in ms
  startedAt: number | null
  pausedAt: number | null
  label: string
  color?: string
}

export interface TimerPreset {
  id: string
  name: string
  duration: number
  color?: string
  icon?: string
}

export interface Message {
  id: string
  text: string
  type: 'info' | 'warning' | 'alert' | 'success'
  sentBy: string
  sentAt: number
  expiresAt?: number
  isVisible: boolean
}

export interface RoomParticipant {
  id: string
  name: string
  role: 'controller' | 'viewer'
  joinedAt: number
  lastSeen: number
  deviceType: string
  isController?: boolean
  isConnected?: boolean
}

// Full room state that gets synced
export interface RoomState {
  room: TimerRoom
  timer: TimerState
  presets: TimerPreset[]
  messages: Message[]
  participants: RoomParticipant[]
  lastUpdatedBy: string
  lastUpdatedAt: number
}

// Events that can be broadcast
export type RoomEvent =
  | { type: 'timer_start'; payload: { duration: number; label: string } }
  | { type: 'timer_pause' }
  | { type: 'timer_resume' }
  | { type: 'timer_stop' }
  | { type: 'timer_reset' }
  | { type: 'timer_set'; payload: { duration: number; label?: string } }
  | { type: 'timer_add_time'; payload: { seconds: number } }
  | { type: 'message_send'; payload: Message }
  | { type: 'message_dismiss'; payload: { id: string } }
  | { type: 'settings_update'; payload: Partial<RoomSettings> }
  | { type: 'participant_join'; payload: RoomParticipant }
  | { type: 'participant_leave'; payload: { id: string } }

const ROOM_STORAGE_KEY = 'flowsphere-remote-timer-rooms'
const PARTICIPANT_ID_KEY = 'flowsphere-remote-timer-participant-id'

// Generate a unique 6-character room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars like 0, O, 1, I
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Get or create participant ID
function getParticipantId(): string {
  let id = localStorage.getItem(PARTICIPANT_ID_KEY)
  if (!id) {
    id = `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(PARTICIPANT_ID_KEY, id)
  }
  return id
}

// Get device type
function getDeviceType(): string {
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

export class RemoteTimerManager {
  private roomId: string | null = null
  private roomCode: string | null = null
  private channel: RealtimeChannel | null = null
  private participantId: string
  private participantName: string = 'Anonymous'
  private role: 'controller' | 'viewer' = 'viewer'

  private state: RoomState | null = null
  private listeners: Array<(state: RoomState) => void> = []
  private messageListeners: Array<(message: Message) => void> = []
  private timerInterval: NodeJS.Timeout | null = null
  private syncInterval: NodeJS.Timeout | null = null

  constructor() {
    this.participantId = getParticipantId()
  }

  /**
   * Create a new timer room
   */
  async createRoom(name: string, creatorName: string): Promise<{ room: TimerRoom; shareUrl: string } | null> {
    const roomCode = generateRoomCode()
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const room: TimerRoom = {
      id: roomId,
      code: roomCode,
      name: name || 'Timer Room',
      createdBy: this.participantId,
      createdAt: Date.now(),
      settings: {
        showMilliseconds: false,
        countDirection: 'down',
        autoStartNext: false,
        flashOnComplete: true,
        soundEnabled: true,
        theme: 'black-gray', // Default to neutral black-gray theme
        fontSize: 'large',
        messageAutoDismiss: true,
        messageDefaultDuration: 10 // 10 seconds default
      }
    }

    const initialState: RoomState = {
      room,
      timer: {
        status: 'idle',
        type: 'countdown',
        duration: 5 * 60 * 1000, // 5 minutes default
        elapsed: 0,
        remaining: 5 * 60 * 1000,
        startedAt: null,
        pausedAt: null,
        label: 'Timer'
      },
      presets: [
        { id: '1', name: '1 Minute', duration: 60 * 1000, color: '#3b82f6' },
        { id: '2', name: '5 Minutes', duration: 5 * 60 * 1000, color: '#10b981' },
        { id: '3', name: '10 Minutes', duration: 10 * 60 * 1000, color: '#f59e0b' },
        { id: '4', name: '15 Minutes', duration: 15 * 60 * 1000, color: '#ef4444' },
        { id: '5', name: '30 Minutes', duration: 30 * 60 * 1000, color: '#8b5cf6' },
        { id: '6', name: '1 Hour', duration: 60 * 60 * 1000, color: '#ec4899' }
      ],
      messages: [],
      participants: [{
        id: this.participantId,
        name: creatorName || 'Controller',
        role: 'controller',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        deviceType: getDeviceType(),
        isController: true,
        isConnected: true
      }],
      lastUpdatedBy: this.participantId,
      lastUpdatedAt: Date.now()
    }

    // Save to localStorage for persistence
    this.saveRoomLocally(roomId, initialState)

    // Join the room channel
    this.participantName = creatorName || 'Controller'
    this.role = 'controller'
    await this.joinChannel(roomId, initialState)

    const shareUrl = `${window.location.origin}/timer/${roomCode}`

    return { room, shareUrl }
  }

  /**
   * Join an existing room by code
   * For Controllers: Creates room if not found (they are the source of truth)
   * For Presenters: Waits for controller to share state via broadcast
   */
  async joinRoom(code: string, participantName: string, asController: boolean = false): Promise<RoomState | null> {
    this.roomCode = code.toUpperCase()
    this.participantName = participantName || 'Viewer'
    this.role = asController ? 'controller' : 'viewer'

    // Try to find room in localStorage first
    const localRoom = this.findRoomByCode(code)

    if (localRoom) {
      // Add self as participant
      const participant: RoomParticipant = {
        id: this.participantId,
        name: this.participantName,
        role: this.role,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        deviceType: getDeviceType(),
        isController: this.role === 'controller',
        isConnected: true
      }

      if (!localRoom.participants.find(p => p.id === this.participantId)) {
        localRoom.participants.push(participant)
      }

      await this.joinChannel(localRoom.room.id, localRoom)
      return this.state
    }

    // For Controllers: Create room immediately if not found locally
    // Controllers are the source of truth - they don't need to wait for state
    if (asController) {
      logger.info('Controller creating room with code', { code }, 'RemoteTimer')
      const result = await this.createRoomWithCode(code, participantName)
      return result ? this.state : null
    }

    // For Presenters: Try to get state via Supabase Realtime broadcast
    // Wait for controller to share state (they should already have the room)
    const upperCode = code.toUpperCase()
    const tempChannel = supabase.channel(`timer-room-${upperCode}`, {
      config: { broadcast: { self: true } }
    })

    return new Promise((resolve) => {
      let resolved = false
      let retryCount = 0
      const maxRetries = 10 // More retries for presenters (20 seconds total)

      const requestState = async () => {
        if (resolved) return
        logger.info('Presenter requesting state', { code: upperCode, retry: retryCount }, 'RemoteTimer')
        await tempChannel.send({
          type: 'broadcast',
          event: 'state_request',
          payload: { requesterId: this.participantId, code: upperCode }
        })
      }

      tempChannel
        .on('broadcast', { event: 'state_sync' }, (payload) => {
          if (!resolved && payload.payload) {
            logger.info('Presenter received state sync', { roomId: payload.payload.room?.id }, 'RemoteTimer')
            resolved = true
            tempChannel.unsubscribe()
            this.joinChannel(payload.payload.room.id, payload.payload)
            resolve(this.state)
          }
        })
        .on('broadcast', { event: 'state_request' }, () => {
          // Another device is requesting state - we don't have it (we're a presenter)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('Presenter subscribed to channel', { code: upperCode }, 'RemoteTimer')
            // Request state from controller
            await requestState()

            // Retry every 2 seconds
            const retryInterval = setInterval(async () => {
              if (resolved) {
                clearInterval(retryInterval)
                return
              }
              retryCount++
              if (retryCount >= maxRetries) {
                clearInterval(retryInterval)
                logger.warn('Presenter could not find room after retries', { code: upperCode, retries: maxRetries }, 'RemoteTimer')
                if (!resolved) {
                  resolved = true
                  tempChannel.unsubscribe()
                  resolve(null) // Room not found - controller hasn't created it yet
                }
              } else {
                await requestState()
              }
            }, 2000)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logger.error('Channel error for presenter', { code: upperCode, status }, 'RemoteTimer')
            if (!resolved) {
              resolved = true
              tempChannel.unsubscribe()
              resolve(null)
            }
          }
        })
    })
  }

  /**
   * Create a room with a specific code (used when joining as controller but room doesn't exist)
   */
  private async createRoomWithCode(code: string, creatorName: string): Promise<{ room: TimerRoom; shareUrl: string } | null> {
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const room: TimerRoom = {
      id: roomId,
      code: code.toUpperCase(),
      name: 'Timer Room',
      createdBy: this.participantId,
      createdAt: Date.now(),
      settings: {
        showMilliseconds: false,
        countDirection: 'down',
        autoStartNext: false,
        flashOnComplete: true,
        soundEnabled: true,
        theme: 'black-gray',
        fontSize: 'large',
        messageAutoDismiss: true,
        messageDefaultDuration: 10
      }
    }

    const initialState: RoomState = {
      room,
      timer: {
        status: 'idle',
        type: 'countdown',
        duration: 5 * 60 * 1000,
        elapsed: 0,
        remaining: 5 * 60 * 1000,
        startedAt: null,
        pausedAt: null,
        label: 'Timer'
      },
      presets: [
        { id: '1', name: '1 Minute', duration: 60 * 1000, color: '#3b82f6' },
        { id: '2', name: '5 Minutes', duration: 5 * 60 * 1000, color: '#10b981' },
        { id: '3', name: '10 Minutes', duration: 10 * 60 * 1000, color: '#f59e0b' },
        { id: '4', name: '15 Minutes', duration: 15 * 60 * 1000, color: '#ef4444' },
        { id: '5', name: '30 Minutes', duration: 30 * 60 * 1000, color: '#8b5cf6' },
        { id: '6', name: '1 Hour', duration: 60 * 60 * 1000, color: '#ec4899' }
      ],
      messages: [],
      participants: [{
        id: this.participantId,
        name: creatorName || 'Controller',
        role: 'controller',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        deviceType: getDeviceType(),
        isController: true,
        isConnected: true
      }],
      lastUpdatedBy: this.participantId,
      lastUpdatedAt: Date.now()
    }

    this.saveRoomLocally(roomId, initialState)
    this.role = 'controller'
    await this.joinChannel(roomId, initialState)

    return { room, shareUrl: `${window.location.origin}/timer/${code}` }
  }

  /**
   * Join a Supabase Realtime channel for the room
   */
  private async joinChannel(roomId: string, initialState: RoomState): Promise<void> {
    this.roomId = roomId
    this.state = initialState

    // Clean up existing channel
    if (this.channel) {
      await this.channel.unsubscribe()
    }

    this.channel = supabase.channel(`timer-room-${initialState.room.code}`, {
      config: {
        broadcast: { self: true }
      }
    })

    this.channel
      .on('broadcast', { event: 'timer_event' }, (payload) => {
        this.handleRemoteEvent(payload.payload as RoomEvent)
      })
      .on('broadcast', { event: 'state_sync' }, (payload) => {
        if (payload.payload && payload.payload.lastUpdatedAt > (this.state?.lastUpdatedAt || 0)) {
          this.state = payload.payload
          this.notifyListeners()
        }
      })
      .on('broadcast', { event: 'state_request' }, async (payload) => {
        // Someone is requesting state - send it if we have it (any participant with state can share)
        if (this.state) {
          logger.info('Received state request, broadcasting state', { requesterId: payload.payload?.requesterId }, 'RemoteTimer')
          await this.broadcastState()
        }
      })
      .on('broadcast', { event: 'message' }, (payload) => {
        if (payload.payload) {
          this.handleIncomingMessage(payload.payload as Message)
        }
      })
      .on('presence', { event: 'sync' }, () => {
        // Handle presence updates
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Joined timer room channel', { roomId }, 'RemoteTimer')

          // Broadcast state if controller
          if (this.role === 'controller') {
            await this.broadcastState()
          }

          // Start timer update loop
          this.startTimerLoop()

          // Start periodic state sync (every 5 seconds for controllers)
          this.startSyncLoop()
        }
      })

    this.notifyListeners()
  }

  /**
   * Start periodic state broadcasting (keeps devices in sync)
   */
  private startSyncLoop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    // Broadcast state every 5 seconds if we're a controller
    this.syncInterval = setInterval(async () => {
      if (this.state && this.role === 'controller') {
        await this.broadcastState()
      }
    }, 5000)
  }

  /**
   * Broadcast current state to all participants
   */
  private async broadcastState(): Promise<void> {
    if (!this.channel || !this.state) return

    await this.channel.send({
      type: 'broadcast',
      event: 'state_sync',
      payload: this.state
    })
  }

  /**
   * Broadcast an event to all participants
   */
  private async broadcastEvent(event: RoomEvent): Promise<void> {
    if (!this.channel) return

    await this.channel.send({
      type: 'broadcast',
      event: 'timer_event',
      payload: event
    })
  }

  /**
   * Handle incoming events from other participants
   */
  private handleRemoteEvent(event: RoomEvent): void {
    if (!this.state) return

    switch (event.type) {
      case 'timer_start':
        this.state.timer.status = 'running'
        this.state.timer.duration = event.payload.duration
        this.state.timer.remaining = event.payload.duration
        this.state.timer.elapsed = 0
        this.state.timer.label = event.payload.label
        this.state.timer.startedAt = Date.now()
        this.state.timer.pausedAt = null
        break

      case 'timer_pause':
        this.state.timer.status = 'paused'
        this.state.timer.pausedAt = Date.now()
        break

      case 'timer_resume':
        if (this.state.timer.pausedAt && this.state.timer.startedAt) {
          const pauseDuration = Date.now() - this.state.timer.pausedAt
          this.state.timer.startedAt += pauseDuration
        }
        this.state.timer.status = 'running'
        this.state.timer.pausedAt = null
        break

      case 'timer_stop':
        this.state.timer.status = 'idle'
        this.state.timer.startedAt = null
        this.state.timer.pausedAt = null
        this.state.timer.elapsed = 0
        this.state.timer.remaining = this.state.timer.duration
        break

      case 'timer_reset':
        this.state.timer.elapsed = 0
        this.state.timer.remaining = this.state.timer.duration
        this.state.timer.startedAt = null
        this.state.timer.pausedAt = null
        this.state.timer.status = 'idle'
        break

      case 'timer_set':
        this.state.timer.duration = event.payload.duration
        this.state.timer.remaining = event.payload.duration
        if (event.payload.label) {
          this.state.timer.label = event.payload.label
        }
        break

      case 'timer_add_time':
        const addMs = event.payload.seconds * 1000
        this.state.timer.duration += addMs
        this.state.timer.remaining += addMs
        break

      case 'message_send':
        if (!this.state.messages.find(m => m.id === event.payload.id)) {
          this.state.messages.push(event.payload)
          this.notifyMessageListeners(event.payload)
        }
        break

      case 'message_dismiss':
        const msgIndex = this.state.messages.findIndex(m => m.id === event.payload.id)
        if (msgIndex >= 0) {
          this.state.messages[msgIndex].isVisible = false
        }
        break

      case 'settings_update':
        this.state.room.settings = { ...this.state.room.settings, ...event.payload }
        break

      case 'participant_join':
        if (!this.state.participants.find(p => p.id === event.payload.id)) {
          this.state.participants.push(event.payload)
        }
        break

      case 'participant_leave':
        this.state.participants = this.state.participants.filter(p => p.id !== event.payload.id)
        break
    }

    this.state.lastUpdatedAt = Date.now()
    this.notifyListeners()
  }

  /**
   * Handle incoming messages
   */
  private handleIncomingMessage(message: Message): void {
    if (!this.state) return

    if (!this.state.messages.find(m => m.id === message.id)) {
      this.state.messages.push(message)
      this.notifyMessageListeners(message)
      this.notifyListeners()
    }
  }

  /**
   * Start the timer update loop
   */
  private startTimerLoop(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }

    this.timerInterval = setInterval(() => {
      if (!this.state) return

      if (this.state.timer.status === 'running' && this.state.timer.startedAt) {
        const now = Date.now()
        this.state.timer.elapsed = now - this.state.timer.startedAt

        if (this.state.timer.type === 'countdown') {
          this.state.timer.remaining = Math.max(0, this.state.timer.duration - this.state.timer.elapsed)

          // Check if timer completed
          if (this.state.timer.remaining <= 0) {
            this.state.timer.status = 'completed'
            this.state.timer.remaining = 0

            // Play sound if enabled
            if (this.state.room.settings.soundEnabled) {
              this.playCompletionSound()
            }
          }
        } else {
          this.state.timer.remaining = this.state.timer.elapsed
        }

        this.notifyListeners()
      }
    }, 100) // Update every 100ms for smooth display
  }

  /**
   * Play completion sound
   */
  private playCompletionSound(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3

      oscillator.start()

      setTimeout(() => {
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
        setTimeout(() => oscillator.stop(), 500)
      }, 200)
    } catch (e) {
      // Audio not supported
    }
  }

  // ==========================================
  // Controller Actions
  // ==========================================

  async startTimer(duration?: number, label?: string): Promise<void> {
    if (!this.state) return

    const event: RoomEvent = {
      type: 'timer_start',
      payload: {
        duration: duration || this.state.timer.duration,
        label: label || this.state.timer.label
      }
    }

    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
  }

  async pauseTimer(): Promise<void> {
    const event: RoomEvent = { type: 'timer_pause' }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
  }

  async resumeTimer(): Promise<void> {
    const event: RoomEvent = { type: 'timer_resume' }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
  }

  async stopTimer(): Promise<void> {
    const event: RoomEvent = { type: 'timer_stop' }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
  }

  async resetTimer(): Promise<void> {
    const event: RoomEvent = { type: 'timer_reset' }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
  }

  async setTimer(duration: number, label?: string): Promise<void> {
    const event: RoomEvent = {
      type: 'timer_set',
      payload: { duration, label }
    }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
  }

  async addTime(seconds: number): Promise<void> {
    const event: RoomEvent = {
      type: 'timer_add_time',
      payload: { seconds }
    }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
  }

  async sendMessage(text: string, type: Message['type'] = 'info', expiresInSeconds?: number): Promise<void> {
    if (!this.state || !this.channel) return

    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      type,
      sentBy: this.participantName,
      sentAt: Date.now(),
      expiresAt: expiresInSeconds ? Date.now() + (expiresInSeconds * 1000) : undefined,
      isVisible: true
    }

    const event: RoomEvent = {
      type: 'message_send',
      payload: message
    }

    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)

    // Also send via message channel for guaranteed delivery
    await this.channel.send({
      type: 'broadcast',
      event: 'message',
      payload: message
    })
  }

  async dismissMessage(id: string): Promise<void> {
    const event: RoomEvent = {
      type: 'message_dismiss',
      payload: { id }
    }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
  }

  async updateSettings(settings: Partial<RoomSettings>): Promise<void> {
    const event: RoomEvent = {
      type: 'settings_update',
      payload: settings
    }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
  }

  // ==========================================
  // Getters & Subscriptions
  // ==========================================

  getState(): RoomState | null {
    return this.state
  }

  getRoomCode(): string | null {
    return this.state?.room.code || this.roomCode
  }

  getShareUrl(): string {
    const code = this.getRoomCode()
    return code ? `${window.location.origin}/timer/${code}` : ''
  }

  isController(): boolean {
    return this.role === 'controller'
  }

  subscribe(callback: (state: RoomState) => void): () => void {
    this.listeners.push(callback)
    if (this.state) {
      callback(this.state)
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  subscribeToMessages(callback: (message: Message) => void): () => void {
    this.messageListeners.push(callback)
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== callback)
    }
  }

  private notifyListeners(): void {
    if (this.state) {
      this.listeners.forEach(callback => {
        try {
          callback(this.state!)
        } catch (error) {
          logger.error('Listener error', error, 'RemoteTimer')
        }
      })
    }
  }

  private notifyMessageListeners(message: Message): void {
    this.messageListeners.forEach(callback => {
      try {
        callback(message)
      } catch (error) {
        logger.error('Message listener error', error, 'RemoteTimer')
      }
    })
  }

  // ==========================================
  // Local Storage
  // ==========================================

  private saveRoomLocally(roomId: string, state: RoomState): void {
    try {
      const rooms = this.getLocalRooms()
      rooms[roomId] = state
      localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(rooms))
    } catch (error) {
      logger.error('Failed to save room locally', error, 'RemoteTimer')
    }
  }

  private getLocalRooms(): Record<string, RoomState> {
    try {
      const stored = localStorage.getItem(ROOM_STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  private findRoomByCode(code: string): RoomState | null {
    const rooms = this.getLocalRooms()
    const upperCode = code.toUpperCase()

    for (const roomState of Object.values(rooms)) {
      if (roomState.room.code === upperCode) {
        return roomState
      }
    }
    return null
  }

  // ==========================================
  // Cleanup
  // ==========================================

  async leaveRoom(): Promise<void> {
    if (this.channel) {
      // Broadcast leave event
      const event: RoomEvent = {
        type: 'participant_leave',
        payload: { id: this.participantId }
      }
      await this.broadcastEvent(event)

      await this.channel.unsubscribe()
      this.channel = null
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    this.state = null
    this.roomId = null
    this.roomCode = null
  }

  destroy(): void {
    this.leaveRoom()
    this.listeners = []
    this.messageListeners = []
  }
}

// Singleton instance
let remoteTimerInstance: RemoteTimerManager | null = null

export function getRemoteTimerManager(): RemoteTimerManager {
  if (!remoteTimerInstance) {
    remoteTimerInstance = new RemoteTimerManager()
  }
  return remoteTimerInstance
}

// Format time for display
export function formatTimerDisplay(ms: number, showMillis: boolean = false): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const milliseconds = Math.floor((ms % 1000) / 10)

  let display = ''

  if (hours > 0) {
    display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  } else {
    display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  if (showMillis) {
    display += `.${milliseconds.toString().padStart(2, '0')}`
  }

  return display
}
