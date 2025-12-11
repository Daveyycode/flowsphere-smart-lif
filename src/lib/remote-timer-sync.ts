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
  | { type: 'timer_start'; payload: { duration: number; label: string; startedAt: number } }
  | { type: 'timer_pause'; payload: { pausedAt: number; remaining: number } }
  | { type: 'timer_resume'; payload: { startedAt: number } }
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

    // Save to Supabase database for cross-device sync
    await this.saveRoomToDatabase(initialState)

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
   * For Presenters: Fetches from database first, then falls back to broadcast
   */
  async joinRoom(code: string, participantName: string, asController: boolean = false): Promise<RoomState | null> {
    this.roomCode = code.toUpperCase()
    this.participantName = participantName || 'Viewer'
    this.role = asController ? 'controller' : 'viewer'

    const upperCode = code.toUpperCase()

    // STEP 1: Try to fetch from Supabase database FIRST (cross-device persistence)
    // This is the key fix - database is the source of truth for cross-device sync
    const dbRoom = await this.fetchRoomFromDatabase(upperCode)

    if (dbRoom) {
      logger.info('Found room in database', { code: upperCode }, 'RemoteTimer')

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

      if (!dbRoom.participants.find(p => p.id === this.participantId)) {
        dbRoom.participants.push(participant)
      }

      // Update last seen time
      dbRoom.lastUpdatedAt = Date.now()

      await this.joinChannel(dbRoom.room.id, dbRoom)

      // Save updated participant list to database
      if (this.state) {
        await this.saveRoomToDatabase(this.state)
      }

      return this.state
    }

    // STEP 2: Try localStorage (same device persistence)
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

      // Also save to database so other devices can find it
      if (this.state) {
        await this.saveRoomToDatabase(this.state)
      }

      return this.state
    }

    // STEP 3: For Controllers - Create room if not found anywhere
    // Controllers are the source of truth - they create the room
    if (asController) {
      logger.info('Controller creating room with code', { code }, 'RemoteTimer')
      const result = await this.createRoomWithCode(code, participantName)
      return result ? this.state : null
    }

    // STEP 4: For Presenters - Last resort: try broadcast (in case DB isn't set up)
    // This gives a short window for the controller to share state
    logger.info('Presenter trying broadcast fallback', { code: upperCode }, 'RemoteTimer')

    const tempChannel = supabase.channel(`timer-room-${upperCode}`, {
      config: { broadcast: { self: true } }
    })

    return new Promise((resolve) => {
      let resolved = false
      let retryCount = 0
      const maxRetries = 5 // Reduced retries since DB is primary (10 seconds total)

      const requestState = async () => {
        if (resolved) return
        logger.info('Presenter requesting state via broadcast', { code: upperCode, retry: retryCount }, 'RemoteTimer')
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
                logger.warn('Presenter could not find room', { code: upperCode, retries: maxRetries }, 'RemoteTimer')
                if (!resolved) {
                  resolved = true
                  tempChannel.unsubscribe()
                  resolve(null) // Room not found
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

    // Save to Supabase database for cross-device sync
    await this.saveRoomToDatabase(initialState)

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

    // IMPORTANT: Start timer loop IMMEDIATELY - don't wait for channel subscription
    // This ensures the timer counts down even if realtime has issues
    this.startTimerLoop()
    this.startSyncLoop()

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
        logger.info('Received timer_event', { type: payload.payload?.type }, 'RemoteTimer')
        this.handleRemoteEvent(payload.payload as RoomEvent)
      })
      .on('broadcast', { event: 'state_sync' }, (payload) => {
        if (payload.payload && payload.payload.lastUpdatedAt > (this.state?.lastUpdatedAt || 0)) {
          logger.info('Received state_sync, updating state', {}, 'RemoteTimer')
          // Preserve timer calculation - use startedAt to recalculate remaining
          const newState = payload.payload as RoomState
          if (newState.timer.status === 'running' && newState.timer.startedAt) {
            const now = Date.now()
            newState.timer.elapsed = now - newState.timer.startedAt
            newState.timer.remaining = Math.max(0, newState.timer.duration - newState.timer.elapsed)
          }
          this.state = newState
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
          logger.info('Received message', { text: (payload.payload as Message).text }, 'RemoteTimer')
          this.handleIncomingMessage(payload.payload as Message)
        }
      })
      .on('presence', { event: 'sync' }, () => {
        // Handle presence updates
      })
      .subscribe(async (status) => {
        logger.info('Channel subscription status', { status, roomId }, 'RemoteTimer')
        if (status === 'SUBSCRIBED') {
          logger.info('Successfully joined timer room channel', { roomId }, 'RemoteTimer')

          // Broadcast state if controller
          if (this.role === 'controller') {
            await this.broadcastState()
          }
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Channel error - realtime may not work', { roomId }, 'RemoteTimer')
        }
      })

    this.notifyListeners()
  }

  /**
   * Start periodic state broadcasting and database sync (keeps devices in sync)
   */
  private startSyncLoop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    // Sync every 2 seconds for more responsive updates
    this.syncInterval = setInterval(async () => {
      if (!this.state) return

      if (this.role === 'controller') {
        // Controller: Broadcast state AND save to database
        this.state.lastUpdatedAt = Date.now()

        // Broadcast via Realtime for instant sync
        await this.broadcastState()

        // Save to database for persistence (cross-device sync)
        await this.saveRoomToDatabase(this.state)
      } else {
        // Presenter: Periodically fetch from database to catch missed updates
        const dbRoom = await this.fetchRoomFromDatabase(this.state.room.code)
        if (dbRoom && dbRoom.lastUpdatedAt > this.state.lastUpdatedAt) {
          logger.info('Presenter syncing from database', { code: this.state.room.code }, 'RemoteTimer')
          // Preserve local participant info but update timer state
          const localParticipant = this.state.participants.find(p => p.id === this.participantId)
          this.state = dbRoom
          if (localParticipant && !this.state.participants.find(p => p.id === this.participantId)) {
            this.state.participants.push(localParticipant)
          }
          this.notifyListeners()
        }
      }
    }, 2000)
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
        // Use the synchronized startedAt from the controller
        this.state.timer.startedAt = event.payload.startedAt
        this.state.timer.pausedAt = null
        break

      case 'timer_pause':
        this.state.timer.status = 'paused'
        // Use synchronized timestamps
        this.state.timer.pausedAt = event.payload.pausedAt
        this.state.timer.remaining = event.payload.remaining
        break

      case 'timer_resume':
        // Use the new calculated startedAt from controller
        this.state.timer.startedAt = event.payload.startedAt
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

    const startedAt = Date.now()
    const event: RoomEvent = {
      type: 'timer_start',
      payload: {
        duration: duration || this.state.timer.duration,
        label: label || this.state.timer.label,
        startedAt: startedAt // Synchronized timestamp
      }
    }

    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
    // Immediately broadcast full state AND save to DB for reliability
    await this.broadcastState()
    await this.saveRoomToDatabase(this.state)
  }

  async pauseTimer(): Promise<void> {
    if (!this.state) return

    const pausedAt = Date.now()
    const remaining = this.state.timer.remaining
    const event: RoomEvent = {
      type: 'timer_pause',
      payload: { pausedAt, remaining }
    }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
    await this.broadcastState()
    await this.saveRoomToDatabase(this.state)
  }

  async resumeTimer(): Promise<void> {
    if (!this.state) return

    // Calculate new startedAt based on remaining time
    const now = Date.now()
    const newStartedAt = now - (this.state.timer.duration - this.state.timer.remaining)
    const event: RoomEvent = {
      type: 'timer_resume',
      payload: { startedAt: newStartedAt }
    }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
    await this.broadcastState()
    await this.saveRoomToDatabase(this.state)
  }

  async stopTimer(): Promise<void> {
    if (!this.state) return

    const event: RoomEvent = { type: 'timer_stop' }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
    await this.broadcastState()
    await this.saveRoomToDatabase(this.state)
  }

  async resetTimer(): Promise<void> {
    if (!this.state) return

    const event: RoomEvent = { type: 'timer_reset' }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
    await this.broadcastState()
    await this.saveRoomToDatabase(this.state)
  }

  async setTimer(duration: number, label?: string): Promise<void> {
    if (!this.state) return

    const event: RoomEvent = {
      type: 'timer_set',
      payload: { duration, label }
    }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
    await this.broadcastState()
    await this.saveRoomToDatabase(this.state)
  }

  async addTime(seconds: number): Promise<void> {
    if (!this.state) return

    const event: RoomEvent = {
      type: 'timer_add_time',
      payload: { seconds }
    }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
    await this.broadcastState()
    await this.saveRoomToDatabase(this.state)
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

    // Save to DB for persistence
    await this.saveRoomToDatabase(this.state)
  }

  async dismissMessage(id: string): Promise<void> {
    if (!this.state) return

    const event: RoomEvent = {
      type: 'message_dismiss',
      payload: { id }
    }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
    await this.saveRoomToDatabase(this.state)
  }

  async updateSettings(settings: Partial<RoomSettings>): Promise<void> {
    if (!this.state) return

    const event: RoomEvent = {
      type: 'settings_update',
      payload: settings
    }
    this.handleRemoteEvent(event)
    await this.broadcastEvent(event)
    await this.broadcastState()
    await this.saveRoomToDatabase(this.state)
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
  // Database Persistence (Supabase)
  // ==========================================

  /**
   * Save room state to Supabase database for cross-device persistence
   */
  private async saveRoomToDatabase(state: RoomState): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('timer_rooms')
        .upsert({
          code: state.room.code,
          name: state.room.name,
          created_by: state.room.createdBy,
          room_state: state,
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }, { onConflict: 'code' })

      if (error) {
        logger.error('Failed to save room to database', error, 'RemoteTimer')
        return false
      }

      logger.info('Room saved to database', { code: state.room.code }, 'RemoteTimer')
      return true
    } catch (error) {
      logger.error('Database save error', error, 'RemoteTimer')
      return false
    }
  }

  /**
   * Fetch room state from Supabase database
   */
  private async fetchRoomFromDatabase(code: string): Promise<RoomState | null> {
    try {
      const { data, error } = await supabase
        .from('timer_rooms')
        .select('room_state')
        .eq('code', code.toUpperCase())
        .single()

      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 = no rows found (expected)
          logger.error('Failed to fetch room from database', error, 'RemoteTimer')
        }
        return null
      }

      if (data?.room_state) {
        logger.info('Room fetched from database', { code }, 'RemoteTimer')
        const roomState = data.room_state as RoomState

        // IMPORTANT: Recalculate timer if it's running
        // The startedAt is the original start time, so we need to calculate current remaining
        if (roomState.timer.status === 'running' && roomState.timer.startedAt) {
          const now = Date.now()
          roomState.timer.elapsed = now - roomState.timer.startedAt
          roomState.timer.remaining = Math.max(0, roomState.timer.duration - roomState.timer.elapsed)

          // Check if timer should have completed
          if (roomState.timer.remaining <= 0) {
            roomState.timer.status = 'completed'
            roomState.timer.remaining = 0
          }

          logger.info('Recalculated timer from DB', {
            startedAt: roomState.timer.startedAt,
            elapsed: roomState.timer.elapsed,
            remaining: roomState.timer.remaining
          }, 'RemoteTimer')
        }

        return roomState
      }

      return null
    } catch (error) {
      logger.error('Database fetch error', error, 'RemoteTimer')
      return null
    }
  }

  /**
   * Delete room from database
   */
  private async deleteRoomFromDatabase(code: string): Promise<void> {
    try {
      await supabase
        .from('timer_rooms')
        .delete()
        .eq('code', code.toUpperCase())
    } catch (error) {
      logger.error('Database delete error', error, 'RemoteTimer')
    }
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
