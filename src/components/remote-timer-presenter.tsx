/**
 * Remote Timer Presenter View
 * Full-screen timer display for presenters on stage
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  getRemoteTimerManager,
  formatTimerDisplay,
  RoomState,
  Message
} from '@/lib/remote-timer-sync'
import {
  X,
  ArrowsOut,
  ArrowsIn,
  Gear,
  Warning,
  Info,
  CheckCircle,
  Bell
} from '@phosphor-icons/react'

interface RemoteTimerPresenterProps {
  roomCode: string
  onExit?: () => void
}

export function RemoteTimerPresenter({ roomCode, onExit }: RemoteTimerPresenterProps) {
  const [manager] = useState(() => getRemoteTimerManager())
  const [state, setState] = useState<RoomState | null>(null)
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Join room on mount
  useEffect(() => {
    const joinRoom = async () => {
      setIsConnecting(true)
      setConnectionError(null)

      try {
        const roomState = await manager.joinRoom(roomCode, 'Presenter', false)
        if (roomState) {
          setState(roomState)
        } else {
          setConnectionError('Room not found. Please check the code and try again.')
        }
      } catch (error) {
        setConnectionError('Failed to connect to room. Please try again.')
      } finally {
        setIsConnecting(false)
      }
    }

    joinRoom()

    return () => {
      manager.leaveRoom()
    }
  }, [roomCode, manager])

  // Subscribe to state updates
  useEffect(() => {
    const unsubscribe = manager.subscribe((newState) => {
      setState(newState)
    })

    return () => {
      unsubscribe()
    }
  }, [manager])

  // Subscribe to messages
  useEffect(() => {
    const unsubscribe = manager.subscribeToMessages((message) => {
      if (message.isVisible) {
        setCurrentMessage(message)

        // Auto-dismiss after expiration or 10 seconds
        const timeout = message.expiresAt
          ? Math.max(0, message.expiresAt - Date.now())
          : 10000

        setTimeout(() => {
          setCurrentMessage(prev =>
            prev?.id === message.id ? null : prev
          )
        }, timeout)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [manager])

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Dismiss current message
  const dismissMessage = () => {
    if (currentMessage) {
      manager.dismissMessage(currentMessage.id)
      setCurrentMessage(null)
    }
  }

  // Get theme colors
  const getThemeColors = () => {
    const theme = state?.room.settings.theme || 'dark'
    switch (theme) {
      case 'light':
        return { bg: 'bg-white', text: 'text-gray-900', accent: 'text-blue-600' }
      case 'green':
        return { bg: 'bg-green-950', text: 'text-green-100', accent: 'text-green-400' }
      case 'red':
        return { bg: 'bg-red-950', text: 'text-red-100', accent: 'text-red-400' }
      case 'blue':
        return { bg: 'bg-blue-950', text: 'text-blue-100', accent: 'text-blue-400' }
      default:
        return { bg: 'bg-gray-950', text: 'text-white', accent: 'text-blue-400' }
    }
  }

  // Get font size classes
  const getFontSize = () => {
    const size = state?.room.settings.fontSize || 'large'
    switch (size) {
      case 'small': return 'text-[12vw]'
      case 'medium': return 'text-[18vw]'
      case 'xlarge': return 'text-[28vw]'
      default: return 'text-[22vw]'
    }
  }

  // Get status color
  const getStatusColor = () => {
    if (!state) return 'text-gray-500'

    switch (state.timer.status) {
      case 'running':
        if (state.timer.remaining < 60000) return 'text-red-500' // Last minute
        if (state.timer.remaining < 180000) return 'text-yellow-500' // Last 3 minutes
        return 'text-green-500'
      case 'paused':
        return 'text-yellow-500'
      case 'completed':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }

  // Get message colors
  const getMessageColors = (type: Message['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-500 text-yellow-950'
      case 'alert':
        return 'bg-red-500 text-white'
      case 'success':
        return 'bg-green-500 text-white'
      default:
        return 'bg-blue-500 text-white'
    }
  }

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'warning':
        return <Warning className="w-8 h-8" weight="fill" />
      case 'alert':
        return <Bell className="w-8 h-8" weight="fill" />
      case 'success':
        return <CheckCircle className="w-8 h-8" weight="fill" />
      default:
        return <Info className="w-8 h-8" weight="fill" />
    }
  }

  const colors = getThemeColors()
  const fontSize = getFontSize()
  const statusColor = getStatusColor()

  // Loading/Error states
  if (isConnecting) {
    return (
      <div className={cn("fixed inset-0 flex items-center justify-center", colors.bg)}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={cn("text-xl", colors.text)}>Connecting to room...</p>
          <p className={cn("text-sm opacity-70", colors.text)}>Code: {roomCode}</p>
        </div>
      </div>
    )
  }

  if (connectionError) {
    return (
      <div className={cn("fixed inset-0 flex items-center justify-center", colors.bg)}>
        <div className="text-center max-w-md px-4">
          <Warning className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className={cn("text-2xl font-bold mb-2", colors.text)}>Connection Error</h2>
          <p className={cn("text-lg opacity-70 mb-6", colors.text)}>{connectionError}</p>
          <button
            onClick={onExit}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className={cn("fixed inset-0 flex items-center justify-center", colors.bg)}>
        <p className={cn("text-xl", colors.text)}>Loading timer...</p>
      </div>
    )
  }

  const timerDisplay = formatTimerDisplay(
    state.timer.remaining,
    state.room.settings.showMilliseconds
  )

  return (
    <div
      className={cn(
        "fixed inset-0 flex flex-col items-center justify-center",
        colors.bg,
        state.timer.status === 'completed' && state.room.settings.flashOnComplete && 'animate-pulse'
      )}
    >
      {/* Control bar (hidden when fullscreen) */}
      {!isFullscreen && (
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between opacity-50 hover:opacity-100 transition-opacity">
          <button
            onClick={onExit}
            className={cn("p-2 rounded-lg hover:bg-white/10", colors.text)}
          >
            <X className="w-6 h-6" />
          </button>

          <div className={cn("text-sm", colors.text)}>
            Room: <span className="font-mono font-bold">{state.room.code}</span>
            {' · '}
            {state.participants.length} connected
          </div>

          <button
            onClick={toggleFullscreen}
            className={cn("p-2 rounded-lg hover:bg-white/10", colors.text)}
          >
            <ArrowsOut className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Exit fullscreen button (only in fullscreen) */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className={cn(
            "absolute top-4 right-4 p-2 rounded-lg opacity-0 hover:opacity-100 transition-opacity",
            colors.text,
            "hover:bg-white/10"
          )}
        >
          <ArrowsIn className="w-6 h-6" />
        </button>
      )}

      {/* Timer Label */}
      <motion.div
        key={state.timer.label}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("text-2xl md:text-4xl mb-4 opacity-70", colors.text)}
      >
        {state.timer.label}
      </motion.div>

      {/* Main Timer Display */}
      <motion.div
        key={state.timer.status}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "font-mono font-bold leading-none tracking-tighter",
          fontSize,
          statusColor,
          state.timer.status === 'completed' && 'animate-pulse'
        )}
      >
        {timerDisplay}
      </motion.div>

      {/* Status Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("mt-6 text-xl md:text-2xl uppercase tracking-widest", colors.text, "opacity-50")}
      >
        {state.timer.status === 'running' && 'Running'}
        {state.timer.status === 'paused' && 'Paused'}
        {state.timer.status === 'completed' && 'Time Up!'}
        {state.timer.status === 'idle' && 'Ready'}
      </motion.div>

      {/* Progress Bar */}
      {state.timer.status !== 'idle' && state.timer.type === 'countdown' && (
        <div className="absolute bottom-0 left-0 right-0 h-2">
          <motion.div
            className={cn(
              "h-full",
              state.timer.remaining < 60000 ? 'bg-red-500' :
              state.timer.remaining < 180000 ? 'bg-yellow-500' :
              'bg-green-500'
            )}
            initial={{ width: '100%' }}
            animate={{
              width: `${(state.timer.remaining / state.timer.duration) * 100}%`
            }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      {/* Message Overlay */}
      <AnimatePresence>
        {currentMessage && currentMessage.isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="absolute inset-x-4 bottom-20 md:inset-x-20 md:bottom-32"
          >
            <div
              className={cn(
                "rounded-2xl p-6 md:p-8 flex items-center gap-4 shadow-2xl cursor-pointer",
                getMessageColors(currentMessage.type)
              )}
              onClick={dismissMessage}
            >
              {getMessageIcon(currentMessage.type)}
              <div className="flex-1">
                <p className="text-xl md:text-3xl font-bold">{currentMessage.text}</p>
                <p className="text-sm opacity-70 mt-1">From: {currentMessage.sentBy}</p>
              </div>
              <X className="w-6 h-6 opacity-50" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
