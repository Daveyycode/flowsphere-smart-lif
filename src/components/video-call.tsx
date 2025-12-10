/**
 * Video Call Component
 *
 * Full-screen video/voice call UI for FlowSphere Secure Messenger
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { DailyProvider, useDaily, useLocalSessionId, useParticipantIds, DailyVideo, useVideoTrack, useAudioTrack } from '@daily-co/daily-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Phone,
  PhoneSlash,
  Microphone,
  MicrophoneSlash,
  VideoCamera,
  VideoCameraSlash,
  SpeakerHigh,
  SpeakerSlash,
  ArrowsOut,
  X
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import {
  createCallInstance,
  joinRoom,
  leaveRoom,
  checkBrowserSupport
} from '@/lib/daily-call-service'
import type { DailyCall } from '@daily-co/daily-js'

// ========== TYPES ==========

interface VideoCallProps {
  isOpen: boolean
  onClose: () => void
  roomUrl: string
  userName: string
  contactName: string
  callType: 'video' | 'audio'
  isIncoming?: boolean
  onAccept?: () => void
  onReject?: () => void
}

interface IncomingCallProps {
  isOpen: boolean
  callerName: string
  callType: 'video' | 'audio'
  onAccept: () => void
  onReject: () => void
}

// ========== PARTICIPANT VIDEO TILE ==========

function ParticipantTile({ sessionId, isLocal, name }: { sessionId: string; isLocal: boolean; name: string }) {
  const videoTrack = useVideoTrack(sessionId)
  const audioTrack = useAudioTrack(sessionId)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoTrack?.persistentTrack && videoRef.current) {
      videoRef.current.srcObject = new MediaStream([videoTrack.persistentTrack])
    }
  }, [videoTrack?.persistentTrack])

  const hasVideo = videoTrack?.state === 'playable'
  const hasAudio = audioTrack?.state === 'playable'

  return (
    <div className={cn(
      "relative rounded-2xl overflow-hidden bg-gray-900",
      isLocal ? "w-32 h-44 absolute bottom-4 right-4 z-10 shadow-xl" : "w-full h-full"
    )}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            "w-full h-full object-cover",
            isLocal && "transform scale-x-[-1]" // Mirror local video
          )}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <Avatar className={cn(isLocal ? "w-16 h-16" : "w-24 h-24")}>
            <AvatarFallback className="text-2xl bg-purple-600 text-white">
              {name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Name label */}
      <div className="absolute bottom-2 left-2 right-2">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-2">
          <span className="text-white text-sm truncate">{isLocal ? 'You' : name}</span>
          {!hasAudio && <MicrophoneSlash className="w-4 h-4 text-red-500" />}
        </div>
      </div>
    </div>
  )
}

// ========== CALL CONTROLS ==========

function CallControls({
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  callType
}: {
  isMuted: boolean
  isVideoOff: boolean
  onToggleMute: () => void
  onToggleVideo: () => void
  onEndCall: () => void
  callType: 'video' | 'audio'
}) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4"
    >
      {/* Mute Button */}
      <Button
        variant="outline"
        size="lg"
        className={cn(
          "w-14 h-14 rounded-full",
          isMuted ? "bg-red-500 border-red-500 text-white hover:bg-red-600" : "bg-white/10 border-white/20 text-white hover:bg-white/20"
        )}
        onClick={onToggleMute}
      >
        {isMuted ? <MicrophoneSlash className="w-6 h-6" /> : <Microphone className="w-6 h-6" />}
      </Button>

      {/* Video Toggle (only for video calls) */}
      {callType === 'video' && (
        <Button
          variant="outline"
          size="lg"
          className={cn(
            "w-14 h-14 rounded-full",
            isVideoOff ? "bg-red-500 border-red-500 text-white hover:bg-red-600" : "bg-white/10 border-white/20 text-white hover:bg-white/20"
          )}
          onClick={onToggleVideo}
        >
          {isVideoOff ? <VideoCameraSlash className="w-6 h-6" /> : <VideoCamera className="w-6 h-6" />}
        </Button>
      )}

      {/* End Call Button */}
      <Button
        variant="destructive"
        size="lg"
        className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
        onClick={onEndCall}
      >
        <PhoneSlash className="w-7 h-7" />
      </Button>
    </motion.div>
  )
}

// ========== MAIN CALL UI (inside DailyProvider) ==========

function CallUI({ userName, contactName, callType, onEndCall }: {
  userName: string
  contactName: string
  callType: 'video' | 'audio'
  onEndCall: () => void
}) {
  const daily = useDaily()
  const localSessionId = useLocalSessionId()
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' })

  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio')
  const [callDuration, setCallDuration] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  // Call duration timer
  useEffect(() => {
    if (!isConnected) return
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isConnected])

  // Listen for connection
  useEffect(() => {
    if (!daily) return
    const handleJoined = () => setIsConnected(true)
    const handleLeft = () => {
      setIsConnected(false)
      onEndCall()
    }
    daily.on('joined-meeting', handleJoined)
    daily.on('left-meeting', handleLeft)
    return () => {
      daily.off('joined-meeting', handleJoined)
      daily.off('left-meeting', handleLeft)
    }
  }, [daily, onEndCall])

  const handleToggleMute = useCallback(() => {
    if (!daily) return
    const newState = !isMuted
    daily.setLocalAudio(!newState)
    setIsMuted(newState)
  }, [daily, isMuted])

  const handleToggleVideo = useCallback(() => {
    if (!daily) return
    const newState = !isVideoOff
    daily.setLocalVideo(!newState)
    setIsVideoOff(newState)
  }, [daily, isVideoOff])

  const handleEndCall = useCallback(() => {
    if (daily) {
      daily.leave()
    }
    onEndCall()
  }, [daily, onEndCall])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
            )} />
            <span className="text-white font-medium">
              {isConnected ? formatDuration(callDuration) : 'Connecting...'}
            </span>
          </div>
          <span className="text-white/70 text-sm">
            {callType === 'video' ? 'Video Call' : 'Voice Call'}
          </span>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Remote participant (full screen) */}
        {remoteParticipantIds.length > 0 ? (
          <ParticipantTile
            sessionId={remoteParticipantIds[0]}
            isLocal={false}
            name={contactName}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <Avatar className="w-32 h-32 mb-4">
              <AvatarFallback className="text-4xl bg-purple-600 text-white">
                {contactName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-white text-xl font-medium">{contactName}</p>
            <p className="text-white/60 mt-2">
              {isConnected ? 'Waiting for them to join...' : 'Connecting...'}
            </p>
          </div>
        )}

        {/* Local participant (picture-in-picture) */}
        {localSessionId && callType === 'video' && (
          <ParticipantTile
            sessionId={localSessionId}
            isLocal={true}
            name={userName}
          />
        )}
      </div>

      {/* Controls */}
      <CallControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onEndCall={handleEndCall}
        callType={callType}
      />
    </div>
  )
}

// ========== VIDEO CALL COMPONENT ==========

export function VideoCall({
  isOpen,
  onClose,
  roomUrl,
  userName,
  contactName,
  callType
}: VideoCallProps) {
  const [callObject, setCallObject] = useState<DailyCall | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  // Initialize call when opened
  useEffect(() => {
    if (!isOpen || !roomUrl) return

    const initCall = async () => {
      console.log('[VIDEO-CALL] Initializing call:', { roomUrl, callType, userName })

      // Check browser support
      const support = checkBrowserSupport()
      if (!support.supported) {
        setError(support.error || 'Browser not supported')
        return
      }

      // Skip pre-permission check - let Daily.co handle it
      // This avoids "Invalid constraint" errors from browser inconsistencies
      console.log('[VIDEO-CALL] Browser supported, creating call instance...')

      setIsJoining(true)
      try {
        const call = createCallInstance()
        setCallObject(call)

        console.log('[VIDEO-CALL] Joining room:', roomUrl)
        await joinRoom(call, roomUrl, userName, callType === 'video')
        console.log('[VIDEO-CALL] Successfully joined room')
      } catch (err: any) {
        console.error('[VIDEO-CALL] Failed to join:', err)
        // Provide more helpful error messages
        let errorMessage = err.message || 'Failed to join call'
        if (errorMessage.includes('constraint')) {
          errorMessage = 'Camera/microphone not available. Try an audio call instead.'
        } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
          errorMessage = 'Call room not found. Please try again.'
        }
        setError(errorMessage)
      } finally {
        setIsJoining(false)
      }
    }

    initCall()

    return () => {
      if (callObject) {
        callObject.leave().catch(console.error)
        callObject.destroy()
        setCallObject(null)
      }
    }
  }, [isOpen, roomUrl, userName, callType])

  const handleClose = useCallback(() => {
    if (callObject) {
      callObject.leave().catch(console.error)
      callObject.destroy()
      setCallObject(null)
    }
    onClose()
  }, [callObject, onClose])

  if (!isOpen) return null

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
        <div className="text-red-500 text-xl mb-4">Call Error</div>
        <p className="text-white/70 mb-6">{error}</p>
        <Button onClick={handleClose} variant="outline" className="text-white border-white">
          Close
        </Button>
      </div>
    )
  }

  if (isJoining || !callObject) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-white text-lg">Connecting to call...</p>
      </div>
    )
  }

  return (
    <DailyProvider callObject={callObject}>
      <CallUI
        userName={userName}
        contactName={contactName}
        callType={callType}
        onEndCall={handleClose}
      />
    </DailyProvider>
  )
}

// ========== INCOMING CALL COMPONENT ==========

export function IncomingCall({ isOpen, callerName, callType, onAccept, onReject }: IncomingCallProps) {
  const [ringDuration, setRingDuration] = useState(0)

  // Auto-reject after 30 seconds
  useEffect(() => {
    if (!isOpen) {
      setRingDuration(0)
      return
    }
    const interval = setInterval(() => {
      setRingDuration(prev => {
        if (prev >= 30) {
          onReject()
          return 0
        }
        return prev + 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isOpen, onReject])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gradient-to-br from-purple-900 via-gray-900 to-black z-50 flex flex-col items-center justify-center"
      >
        {/* Animated rings */}
        <div className="relative mb-8">
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-purple-500/30"
            animate={{ scale: [1, 2, 2], opacity: [0.5, 0.2, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 160, height: 160, marginLeft: -40, marginTop: -40 }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-purple-500/30"
            animate={{ scale: [1, 2, 2], opacity: [0.5, 0.2, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            style={{ width: 160, height: 160, marginLeft: -40, marginTop: -40 }}
          />
          <Avatar className="w-20 h-20 relative z-10">
            <AvatarFallback className="text-3xl bg-purple-600 text-white">
              {callerName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Caller info */}
        <h2 className="text-white text-2xl font-bold mb-2">{callerName}</h2>
        <p className="text-white/60 mb-8">
          Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-8">
          {/* Reject */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="destructive"
              size="lg"
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
              onClick={onReject}
            >
              <PhoneSlash className="w-7 h-7" />
            </Button>
          </motion.div>

          {/* Accept */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700"
              onClick={onAccept}
            >
              <Phone className="w-7 h-7" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
