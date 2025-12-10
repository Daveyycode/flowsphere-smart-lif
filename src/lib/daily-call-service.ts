/**
 * Daily.co Call Service
 *
 * Handles video/voice call functionality for FlowSphere Secure Messenger
 */

import Daily, { DailyCall, DailyParticipant, DailyEventObjectParticipant } from '@daily-co/daily-js'

// Types
export interface CallState {
  status: 'idle' | 'creating' | 'joining' | 'connected' | 'error'
  roomUrl: string | null
  roomName: string | null
  callType: 'video' | 'audio'
  error: string | null
  localParticipant: DailyParticipant | null
  remoteParticipants: DailyParticipant[]
  isMicMuted: boolean
  isCameraMuted: boolean
  isScreenSharing: boolean
}

export interface CallInvite {
  id: string
  fromUserId: string
  fromName: string
  toUserId: string
  roomUrl: string
  roomName: string
  callType: 'video' | 'audio'
  timestamp: string
  status: 'pending' | 'accepted' | 'rejected' | 'missed' | 'ended'
}

// Initial state
export const initialCallState: CallState = {
  status: 'idle',
  roomUrl: null,
  roomName: null,
  callType: 'video',
  error: null,
  localParticipant: null,
  remoteParticipants: [],
  isMicMuted: false,
  isCameraMuted: false,
  isScreenSharing: false
}

// Daily.co API configuration
const DAILY_DOMAIN = 'cloud-2328ad98f150460ea77fcb36b78d5cb2' // FlowSphere Daily.co domain
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

/**
 * Generate a unique room name for a call between two users
 */
export function generateRoomName(userId1: string, userId2: string): string {
  // Sort IDs to ensure consistent room name regardless of who initiates
  const sortedIds = [userId1, userId2].sort()
  const timestamp = Date.now()
  return `fs-${sortedIds[0].slice(-4)}-${sortedIds[1].slice(-4)}-${timestamp}`
}

/**
 * Create a Daily.co call instance
 */
export function createCallInstance(): DailyCall {
  return Daily.createCallObject({
    subscribeToTracksAutomatically: true,
    // Use permissive audio/video constraints to avoid "Invalid constraint" errors
    dailyConfig: {
      experimentalChromeVideoMuteLightOff: true
    }
  })
}

/**
 * Create a room via Edge Function (secure, uses API key on server)
 */
export async function createRoom(roomName: string, callType: 'video' | 'audio' = 'video'): Promise<{ url: string } | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/daily-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ roomName, callType })
    })

    const data = await response.json()
    if (data.success && data.room) {
      return { url: data.room.url }
    }
    console.error('Failed to create room:', data.error)
    return null
  } catch (error) {
    console.error('Error creating room:', error)
    return null
  }
}

/**
 * Create a room URL (fallback to direct URL if Edge Function fails)
 */
export function createDemoRoomUrl(roomName: string): string {
  return `https://${DAILY_DOMAIN}.daily.co/${roomName}`
}

/**
 * Join a Daily.co room
 */
export async function joinRoom(
  callObject: DailyCall,
  roomUrl: string,
  userName: string,
  isVideoCall: boolean = true
): Promise<void> {
  await callObject.join({
    url: roomUrl,
    userName: userName,
    startVideoOff: !isVideoCall,
    startAudioOff: false
  })
}

/**
 * Leave the current room
 */
export async function leaveRoom(callObject: DailyCall): Promise<void> {
  await callObject.leave()
}

/**
 * Toggle microphone
 */
export async function toggleMicrophone(callObject: DailyCall): Promise<boolean> {
  const currentState = callObject.localAudio()
  await callObject.setLocalAudio(!currentState)
  return !currentState
}

/**
 * Toggle camera
 */
export async function toggleCamera(callObject: DailyCall): Promise<boolean> {
  const currentState = callObject.localVideo()
  await callObject.setLocalVideo(!currentState)
  return !currentState
}

/**
 * Start screen sharing
 */
export async function startScreenShare(callObject: DailyCall): Promise<void> {
  await callObject.startScreenShare()
}

/**
 * Stop screen sharing
 */
export async function stopScreenShare(callObject: DailyCall): Promise<void> {
  await callObject.stopScreenShare()
}

/**
 * Get all participants in the call
 */
export function getParticipants(callObject: DailyCall): {
  local: DailyParticipant | null
  remote: DailyParticipant[]
} {
  const participants = callObject.participants()
  const local = participants.local || null
  const remote = Object.values(participants).filter(p => !p.local)
  return { local, remote }
}

/**
 * Subscribe to call events
 */
export function subscribeToCallEvents(
  callObject: DailyCall,
  handlers: {
    onJoinedMeeting?: () => void
    onLeftMeeting?: () => void
    onParticipantJoined?: (participant: DailyParticipant) => void
    onParticipantLeft?: (participant: DailyParticipant) => void
    onParticipantUpdated?: (participant: DailyParticipant) => void
    onError?: (error: string) => void
    onTrackStarted?: (event: any) => void
    onTrackStopped?: (event: any) => void
  }
): () => void {
  const {
    onJoinedMeeting,
    onLeftMeeting,
    onParticipantJoined,
    onParticipantLeft,
    onParticipantUpdated,
    onError,
    onTrackStarted,
    onTrackStopped
  } = handlers

  if (onJoinedMeeting) {
    callObject.on('joined-meeting', onJoinedMeeting)
  }
  if (onLeftMeeting) {
    callObject.on('left-meeting', onLeftMeeting)
  }
  if (onParticipantJoined) {
    callObject.on('participant-joined', (event: DailyEventObjectParticipant) => {
      if (event?.participant) onParticipantJoined(event.participant)
    })
  }
  if (onParticipantLeft) {
    callObject.on('participant-left', (event: any) => {
      if (event?.participant) onParticipantLeft(event.participant)
    })
  }
  if (onParticipantUpdated) {
    callObject.on('participant-updated', (event: DailyEventObjectParticipant) => {
      if (event?.participant) onParticipantUpdated(event.participant)
    })
  }
  if (onError) {
    callObject.on('error', (event: any) => {
      onError(event?.errorMsg || 'Unknown error')
    })
  }
  if (onTrackStarted) {
    callObject.on('track-started', onTrackStarted)
  }
  if (onTrackStopped) {
    callObject.on('track-stopped', onTrackStopped)
  }

  // Return unsubscribe function
  return () => {
    callObject.off('joined-meeting', onJoinedMeeting as any)
    callObject.off('left-meeting', onLeftMeeting as any)
    callObject.off('participant-joined', onParticipantJoined as any)
    callObject.off('participant-left', onParticipantLeft as any)
    callObject.off('participant-updated', onParticipantUpdated as any)
    callObject.off('error', onError as any)
    callObject.off('track-started', onTrackStarted as any)
    callObject.off('track-stopped', onTrackStopped as any)
  }
}

/**
 * Check if browser supports Daily.co
 */
export function checkBrowserSupport(): { supported: boolean; error?: string } {
  const supported = Daily.supportedBrowser()
  if (!supported.supported) {
    return {
      supported: false,
      error: `Browser not supported`
    }
  }
  return { supported: true }
}

/**
 * Request media permissions
 */
export async function requestMediaPermissions(video: boolean = true, audio: boolean = true): Promise<{
  granted: boolean
  error?: string
}> {
  try {
    // Use flexible constraints - don't fail if specific settings aren't available
    const constraints: MediaStreamConstraints = {}

    if (audio) {
      constraints.audio = true
    }

    if (video) {
      // Use flexible video constraints that work across devices
      constraints.video = {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    }

    // At least one must be requested
    if (!constraints.audio && !constraints.video) {
      constraints.audio = true
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    // Stop tracks after getting permission
    stream.getTracks().forEach(track => track.stop())
    return { granted: true }
  } catch (error: any) {
    console.error('[CALL] Media permission error:', error.name, error.message)

    // If video failed, try audio only
    if (video && error.name === 'OverconstrainedError') {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioStream.getTracks().forEach(track => track.stop())
        return { granted: true } // Audio works, video might not be available
      } catch {
        // Audio also failed
      }
    }

    return {
      granted: false,
      error: error.name === 'NotAllowedError'
        ? 'Camera/microphone permission denied'
        : error.name === 'OverconstrainedError'
        ? 'Camera not available on this device'
        : error.name === 'NotFoundError'
        ? 'No camera or microphone found'
        : error.message
    }
  }
}
