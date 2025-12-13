/**
 * WebRTC Video & Voice Calling System
 * Real-time peer-to-peer communication
 */

import { logger } from '@/lib/security-utils'

export interface CallConfig {
  iceServers: RTCIceServer[]
  videoEnabled: boolean
  audioEnabled: boolean
  videoConstraints: MediaTrackConstraints
  audioConstraints: MediaTrackConstraints
}

export interface CallSession {
  id: string
  contactId: string
  contactName: string
  type: 'video' | 'audio'
  status: 'initiating' | 'ringing' | 'connecting' | 'active' | 'ended' | 'declined' | 'missed'
  startTime: string
  endTime?: string
  duration: number
  isIncoming: boolean
}

export interface CallParticipant {
  id: string
  name: string
  stream?: MediaStream
  isMuted: boolean
  isVideoOff: boolean
}

/**
 * WebRTC Call Manager
 * Handles peer-to-peer video and voice calls
 */
export class WebRTCCallManager {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private config: CallConfig
  private callSession: CallSession | null = null
  private onRemoteStreamCallback?: (stream: MediaStream) => void
  private onCallEndCallback?: () => void
  private onCallStatusCallback?: (status: CallSession['status']) => void
  private dataChannel: RTCDataChannel | null = null

  constructor(config?: Partial<CallConfig>) {
    this.config = {
      iceServers: config?.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
      videoEnabled: config?.videoEnabled ?? true,
      audioEnabled: config?.audioEnabled ?? true,
      videoConstraints: config?.videoConstraints || {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audioConstraints: config?.audioConstraints || {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    }
  }

  /**
   * Initialize call (start new call)
   */
  async initiateCall(
    contactId: string,
    contactName: string,
    type: 'video' | 'audio'
  ): Promise<{ offer: RTCSessionDescriptionInit; callId: string }> {
    try {
      // Create call session
      this.callSession = {
        id: `call-${Date.now()}`,
        contactId,
        contactName,
        type,
        status: 'initiating',
        startTime: new Date().toISOString(),
        duration: 0,
        isIncoming: false,
      }

      this.updateCallStatus('initiating')

      // Get local media stream
      await this.initLocalStream(type === 'video', true)

      // Create peer connection
      this.createPeerConnection()

      // Add local stream to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, this.localStream!)
        })
      }

      // Create data channel for signaling
      this.dataChannel = this.peerConnection!.createDataChannel('messaging')
      this.setupDataChannel()

      // Create offer
      const offer = await this.peerConnection!.createOffer()
      await this.peerConnection!.setLocalDescription(offer)

      this.updateCallStatus('ringing')

      return {
        offer,
        callId: this.callSession.id,
      }
    } catch (error) {
      logger.error('Error initiating call:', error, 'WebRTC')
      this.updateCallStatus('ended')
      throw error
    }
  }

  /**
   * Answer incoming call
   */
  async answerCall(
    offer: RTCSessionDescriptionInit,
    contactId: string,
    contactName: string,
    type: 'video' | 'audio'
  ): Promise<RTCSessionDescriptionInit> {
    try {
      // Create call session
      this.callSession = {
        id: `call-${Date.now()}`,
        contactId,
        contactName,
        type,
        status: 'connecting',
        startTime: new Date().toISOString(),
        duration: 0,
        isIncoming: true,
      }

      this.updateCallStatus('connecting')

      // Get local media stream
      await this.initLocalStream(type === 'video', true)

      // Create peer connection
      this.createPeerConnection()

      // Add local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, this.localStream!)
        })
      }

      // Set remote description (offer)
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer))

      // Create answer
      const answer = await this.peerConnection!.createAnswer()
      await this.peerConnection!.setLocalDescription(answer)

      this.updateCallStatus('active')

      return answer
    } catch (error) {
      logger.error('Error answering call:', error, 'WebRTC')
      this.updateCallStatus('ended')
      throw error
    }
  }

  /**
   * Handle answer from remote peer
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(answer))
      this.updateCallStatus('active')
    } catch (error) {
      logger.error('Error handling answer:', error, 'WebRTC')
      throw error
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      logger.error('Error adding ICE candidate:', error, 'WebRTC')
    }
  }

  /**
   * Initialize local media stream
   */
  private async initLocalStream(video: boolean, audio: boolean): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        video: video ? this.config.videoConstraints : false,
        audio: audio ? this.config.audioConstraints : false,
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error) {
      logger.error('Error getting local stream:', error, 'WebRTC')
      throw new Error('Camera/Microphone access denied')
    }
  }

  /**
   * Create peer connection
   */
  private createPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    })

    // Handle ICE candidates
    this.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        // In production, send this to signaling server
        logger.debug('ICE candidate:', event.candidate, 'WebRTC')
      }
    }

    // Handle remote stream
    this.peerConnection.ontrack = event => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0]
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream)
        }
      }
    }

    // Handle connection state
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState
      logger.debug('Connection state:', state, 'WebRTC')

      if (state === 'connected') {
        this.updateCallStatus('active')
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.endCall()
      }
    }

    // Handle ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState
      logger.debug('ICE connection state:', state, 'WebRTC')

      if (state === 'failed') {
        this.endCall()
      }
    }

    // Handle data channel
    this.peerConnection.ondatachannel = event => {
      this.dataChannel = event.channel
      this.setupDataChannel()
    }
  }

  /**
   * Setup data channel for messaging
   */
  private setupDataChannel(): void {
    if (!this.dataChannel) return

    this.dataChannel.onopen = () => {
      logger.debug('Data channel opened', null, 'WebRTC')
    }

    this.dataChannel.onmessage = event => {
      logger.debug('Data channel message:', event.data, 'WebRTC')
      // Handle chat messages during call
    }

    this.dataChannel.onclose = () => {
      logger.debug('Data channel closed', null, 'WebRTC')
    }
  }

  /**
   * Toggle audio mute
   */
  toggleAudio(muted?: boolean): boolean {
    if (!this.localStream) return false

    const audioTrack = this.localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = muted !== undefined ? !muted : !audioTrack.enabled
      return !audioTrack.enabled
    }
    return false
  }

  /**
   * Toggle video
   */
  toggleVideo(enabled?: boolean): boolean {
    if (!this.localStream) return false

    const videoTrack = this.localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = enabled !== undefined ? enabled : !videoTrack.enabled
      return videoTrack.enabled
    }
    return false
  }

  /**
   * Switch camera (front/back on mobile)
   */
  async switchCamera(): Promise<void> {
    if (!this.localStream) return

    const videoTrack = this.localStream.getVideoTracks()[0]
    if (!videoTrack) return

    try {
      // Stop current track
      videoTrack.stop()

      // Get current facing mode
      const currentFacingMode = videoTrack.getSettings().facingMode || 'user'
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user'

      // Get new stream with opposite camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...this.config.videoConstraints,
          facingMode: newFacingMode,
        },
        audio: false,
      })

      const newVideoTrack = newStream.getVideoTracks()[0]

      // Replace track in peer connection
      const sender = this.peerConnection?.getSenders().find(s => s.track?.kind === 'video')
      if (sender) {
        await sender.replaceTrack(newVideoTrack)
      }

      // Update local stream
      this.localStream.removeTrack(videoTrack)
      this.localStream.addTrack(newVideoTrack)
    } catch (error) {
      logger.error('Error switching camera:', error, 'WebRTC')
    }
  }

  /**
   * Send message via data channel
   */
  sendMessage(message: string): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(message)
    }
  }

  /**
   * End call
   */
  endCall(): void {
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close()
    }

    // Close data channel
    if (this.dataChannel) {
      this.dataChannel.close()
    }

    // Update call session
    if (this.callSession) {
      this.callSession.endTime = new Date().toISOString()
      this.callSession.duration = Math.floor(
        (new Date(this.callSession.endTime).getTime() -
          new Date(this.callSession.startTime).getTime()) /
          1000
      )
    }

    this.updateCallStatus('ended')

    // Call callback
    if (this.onCallEndCallback) {
      this.onCallEndCallback()
    }

    // Clean up
    this.localStream = null
    this.remoteStream = null
    this.peerConnection = null
    this.dataChannel = null
  }

  /**
   * Decline incoming call
   */
  declineCall(): void {
    this.updateCallStatus('declined')
    this.endCall()
  }

  /**
   * Get local stream for preview
   */
  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  /**
   * Get remote stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream
  }

  /**
   * Get call session
   */
  getCallSession(): CallSession | null {
    return this.callSession
  }

  /**
   * Set remote stream callback
   */
  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback
  }

  /**
   * Set call end callback
   */
  onCallEnd(callback: () => void): void {
    this.onCallEndCallback = callback
  }

  /**
   * Set call status callback
   */
  onCallStatus(callback: (status: CallSession['status']) => void): void {
    this.onCallStatusCallback = callback
  }

  /**
   * Update call status
   */
  private updateCallStatus(status: CallSession['status']): void {
    if (this.callSession) {
      this.callSession.status = status
    }
    if (this.onCallStatusCallback) {
      this.onCallStatusCallback(status)
    }
  }
}

/**
 * Call history manager
 */
export class CallHistoryManager {
  private storageKey = 'flowsphere-call-history'

  /**
   * Save call to history
   */
  saveCall(call: CallSession): void {
    const history = this.getHistory()
    history.unshift(call)
    localStorage.setItem(this.storageKey, JSON.stringify(history.slice(0, 100))) // Keep last 100
  }

  /**
   * Get call history
   */
  getHistory(): CallSession[] {
    try {
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      logger.debug('Failed to load call history from storage', error)
      return []
    }
  }

  /**
   * Get history by contact
   */
  getHistoryByContact(contactId: string): CallSession[] {
    return this.getHistory().filter(call => call.contactId === contactId)
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    localStorage.removeItem(this.storageKey)
  }

  /**
   * Delete specific call
   */
  deleteCall(callId: string): void {
    const history = this.getHistory().filter(call => call.id !== callId)
    localStorage.setItem(this.storageKey, JSON.stringify(history))
  }

  /**
   * Get call statistics
   */
  getStatistics(): {
    totalCalls: number
    totalDuration: number
    videoCalls: number
    audioCalls: number
    missedCalls: number
    averageDuration: number
  } {
    const history = this.getHistory()

    const stats = {
      totalCalls: history.length,
      totalDuration: history.reduce((sum, call) => sum + call.duration, 0),
      videoCalls: history.filter(c => c.type === 'video').length,
      audioCalls: history.filter(c => c.type === 'audio').length,
      missedCalls: history.filter(c => c.status === 'missed').length,
      averageDuration: 0,
    }

    stats.averageDuration =
      stats.totalCalls > 0 ? Math.floor(stats.totalDuration / stats.totalCalls) : 0

    return stats
  }
}

/**
 * Signaling server (simplified, in production use WebSocket)
 */
export class SignalingService {
  private ws: WebSocket | null = null
  private onOfferCallback?: (offer: RTCSessionDescriptionInit, from: string) => void
  private onAnswerCallback?: (answer: RTCSessionDescriptionInit) => void
  private onIceCandidateCallback?: (candidate: RTCIceCandidateInit) => void
  private onIncomingCallCallback?: (from: string, type: 'video' | 'audio') => void

  /**
   * Connect to signaling server
   */
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          logger.info('Signaling server connected', null, 'WebRTC')
          resolve()
        }

        this.ws.onmessage = event => {
          const message = JSON.parse(event.data)
          this.handleMessage(message)
        }

        this.ws.onerror = error => {
          logger.error('Signaling error:', error, 'WebRTC')
          reject(error)
        }

        this.ws.onclose = () => {
          logger.info('Signaling server disconnected', null, 'WebRTC')
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'offer':
        if (this.onOfferCallback) {
          this.onOfferCallback(message.offer, message.from)
        }
        if (this.onIncomingCallCallback) {
          this.onIncomingCallCallback(message.from, message.callType)
        }
        break

      case 'answer':
        if (this.onAnswerCallback) {
          this.onAnswerCallback(message.answer)
        }
        break

      case 'ice-candidate':
        if (this.onIceCandidateCallback) {
          this.onIceCandidateCallback(message.candidate)
        }
        break
    }
  }

  /**
   * Send offer
   */
  sendOffer(to: string, offer: RTCSessionDescriptionInit, callType: 'video' | 'audio'): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'offer',
          to,
          offer,
          callType,
        })
      )
    }
  }

  /**
   * Send answer
   */
  sendAnswer(to: string, answer: RTCSessionDescriptionInit): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'answer',
          to,
          answer,
        })
      )
    }
  }

  /**
   * Send ICE candidate
   */
  sendIceCandidate(to: string, candidate: RTCIceCandidateInit): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'ice-candidate',
          to,
          candidate,
        })
      )
    }
  }

  /**
   * Event handlers
   */
  onOffer(callback: (offer: RTCSessionDescriptionInit, from: string) => void): void {
    this.onOfferCallback = callback
  }

  onAnswer(callback: (answer: RTCSessionDescriptionInit) => void): void {
    this.onAnswerCallback = callback
  }

  onIceCandidate(callback: (candidate: RTCIceCandidateInit) => void): void {
    this.onIceCandidateCallback = callback
  }

  onIncomingCall(callback: (from: string, type: 'video' | 'audio') => void): void {
    this.onIncomingCallCallback = callback
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
