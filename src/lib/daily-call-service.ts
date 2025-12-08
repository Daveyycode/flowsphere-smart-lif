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
// NOTE: For production, create rooms via your backend with Daily.co API key
// For demo/development, we use Daily.co's free demo rooms
const DAILY_DOMAIN = 'flowsphere' // Replace with your Daily.co domain when you have one

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
    subscribeToTracksAutomatically: true
  })
}

/**
 * Create a demo room URL (for development/testing)
 * In production, you'd create rooms via your backend using Daily.co REST API
 */
export function createDemoRoomUrl(roomName: string): string {
  // Daily.co provides free demo rooms at this URL pattern
  // These rooms expire after 10 minutes of inactivity
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
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio })
    // Stop tracks after getting permission
    stream.getTracks().forEach(track => track.stop())
    return { granted: true }
  } catch (error: any) {
    return {
      granted: false,
      error: error.name === 'NotAllowedError'
        ? 'Camera/microphone permission denied'
        : error.message
    }
  }
}
