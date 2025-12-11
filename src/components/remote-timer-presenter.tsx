/**
 * Remote Timer Presenter View
 * Full-screen timer display for presenters on stage
 * Supports FlowSphere themes and floating overlay mode
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
import { useTheme, ColorTheme } from '@/hooks/use-theme'
import {
  X,
  ArrowsOut,
  ArrowsIn,
  Warning,
  Info,
  CheckCircle,
  Bell,
  ArrowsOutSimple,
  ArrowsInSimple,
  Broadcast
} from '@phosphor-icons/react'

interface RemoteTimerPresenterProps {
  roomCode: string
  onExit?: () => void
  floatingMode?: boolean // For floating overlay window
}

// FlowSphere theme colors - matches use-theme.ts ColorTheme
const THEME_COLORS: Record<ColorTheme, { light: Record<string, string>; dark: Record<string, string> }> = {
  'neon-noir': {
    light: {
      background: 'oklch(0.98 0.005 270)',
      foreground: 'oklch(0.12 0.02 270)',
      primary: 'oklch(0.55 0.28 328)',
      accent: 'oklch(0.60 0.25 320)',
    },
    dark: {
      background: 'oklch(0.10 0.02 270)',
      foreground: 'oklch(0.98 0.005 270)',
      primary: 'oklch(0.65 0.28 328)',
      accent: 'oklch(0.70 0.25 320)',
    }
  },
  'aurora-borealis': {
    light: {
      background: 'oklch(0.97 0.01 220)',
      foreground: 'oklch(0.15 0.02 240)',
      primary: 'oklch(0.55 0.25 250)',
      accent: 'oklch(0.65 0.22 160)',
    },
    dark: {
      background: 'oklch(0.12 0.03 240)',
      foreground: 'oklch(0.95 0.02 220)',
      primary: 'oklch(0.65 0.25 250)',
      accent: 'oklch(0.70 0.22 160)',
    }
  },
  'cosmic-latte': {
    light: {
      background: 'oklch(0.97 0.02 80)',
      foreground: 'oklch(0.20 0.03 60)',
      primary: 'oklch(0.50 0.18 70)',
      accent: 'oklch(0.65 0.15 50)',
    },
    dark: {
      background: 'oklch(0.18 0.03 60)',
      foreground: 'oklch(0.95 0.02 80)',
      primary: 'oklch(0.60 0.18 70)',
      accent: 'oklch(0.70 0.15 50)',
    }
  },
  'candy-shop': {
    light: {
      background: 'oklch(0.98 0.01 330)',
      foreground: 'oklch(0.20 0.02 340)',
      primary: 'oklch(0.60 0.22 340)',
      accent: 'oklch(0.70 0.20 290)',
    },
    dark: {
      background: 'oklch(0.15 0.02 340)',
      foreground: 'oklch(0.96 0.02 330)',
      primary: 'oklch(0.70 0.22 340)',
      accent: 'oklch(0.75 0.20 290)',
    }
  },
  'black-gray': {
    light: {
      background: 'oklch(0.95 0 0)',
      foreground: 'oklch(0.15 0 0)',
      primary: 'oklch(0.30 0 0)',
      accent: 'oklch(0.60 0 0)',
    },
    dark: {
      background: 'oklch(0.10 0 0)',
      foreground: 'oklch(0.95 0 0)',
      primary: 'oklch(0.80 0 0)',
      accent: 'oklch(0.70 0 0)',
    }
  },
  'custom': {
    light: {
      background: 'oklch(0.95 0 0)',
      foreground: 'oklch(0.15 0 0)',
      primary: 'oklch(0.50 0.2 250)',
      accent: 'oklch(0.60 0.15 200)',
    },
    dark: {
      background: 'oklch(0.10 0 0)',
      foreground: 'oklch(0.95 0 0)',
      primary: 'oklch(0.65 0.2 250)',
      accent: 'oklch(0.70 0.15 200)',
    }
  }
}

export function RemoteTimerPresenter({ roomCode, onExit, floatingMode = false }: RemoteTimerPresenterProps) {
  const [manager] = useState(() => getRemoteTimerManager())
  const [state, setState] = useState<RoomState | null>(null)
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isMinimized, setIsMinimized] = useState(floatingMode)

  // Use FlowSphere's global theme from Settings
  const { mode, colorTheme, customColors } = useTheme()

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
          setConnectionError('Room not found. Make sure the controller has created the room first.')
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

        // Auto-dismiss based on settings or message expiry
        const autoDismiss = state?.room.settings.messageAutoDismiss ?? true
        const defaultDuration = (state?.room.settings.messageDefaultDuration ?? 10) * 1000

        const timeout = message.expiresAt
          ? Math.max(0, message.expiresAt - Date.now())
          : autoDismiss ? defaultDuration : 30000

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
  }, [manager, state?.room.settings.messageAutoDismiss, state?.room.settings.messageDefaultDuration])

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

  // Get theme colors from FlowSphere's global Settings/Theme
  const getThemeColors = () => {
    const theme = colorTheme || 'black-gray'
    const themeMode = mode || 'light'

    // Use custom colors if theme is custom and customColors is set
    if (theme === 'custom' && customColors) {
      return {
        background: customColors.background,
        foreground: customColors.foreground,
        primary: customColors.primary,
        accent: customColors.accent
      }
    }

    return THEME_COLORS[theme][themeMode]
  }

  // Get font size classes
  const getFontSize = () => {
    const size = state?.room.settings.fontSize || 'large'
    if (isMinimized) {
      return 'text-[8vw]'
    }
    switch (size) {
      case 'small': return 'text-[12vw]'
      case 'medium': return 'text-[18vw]'
      case 'xlarge': return 'text-[28vw]'
      default: return 'text-[22vw]'
    }
  }

  // Get status color
  const getStatusColor = () => {
    if (!state) return '#9ca3af'

    switch (state.timer.status) {
      case 'running':
        if (state.timer.remaining < 60000) return '#ef4444' // red
        if (state.timer.remaining < 180000) return '#f59e0b' // yellow
        return '#22c55e' // green
      case 'paused':
        return '#f59e0b' // yellow
      case 'completed':
        return '#ef4444' // red
      default:
        return '#9ca3af' // gray
    }
  }

  // Get message colors
  const getMessageColors = (type: Message['type']) => {
    switch (type) {
      case 'warning':
        return { bg: '#f59e0b', text: '#1f2937' }
      case 'alert':
        return { bg: '#ef4444', text: '#ffffff' }
      case 'success':
        return { bg: '#22c55e', text: '#ffffff' }
      default:
        return { bg: '#3b82f6', text: '#ffffff' }
    }
  }

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'warning':
        return <Warning className="w-6 h-6 md:w-8 md:h-8" weight="fill" />
      case 'alert':
        return <Bell className="w-6 h-6 md:w-8 md:h-8" weight="fill" />
      case 'success':
        return <CheckCircle className="w-6 h-6 md:w-8 md:h-8" weight="fill" />
      default:
        return <Info className="w-6 h-6 md:w-8 md:h-8" weight="fill" />
    }
  }

  const colors = getThemeColors()
  const fontSize = getFontSize()
  const statusColor = getStatusColor()

  // Loading state
  if (isConnecting) {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          floatingMode ? "w-full h-full" : "fixed inset-0"
        )}
        style={{ background: colors.background }}
      >
        <div className="text-center">
          <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: statusColor, borderTopColor: 'transparent' }} />
          <p className="text-lg md:text-xl" style={{ color: colors.foreground }}>
            Connecting to room...
          </p>
          <p className="text-sm opacity-70" style={{ color: colors.foreground }}>
            Code: {roomCode}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (connectionError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          floatingMode ? "w-full h-full" : "fixed inset-0"
        )}
        style={{ background: colors.background }}
      >
        <div className="text-center max-w-md px-4">
          <Warning className="w-12 h-12 md:w-16 md:h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: colors.foreground }}>
            Connection Error
          </h2>
          <p className="text-base md:text-lg opacity-70 mb-6" style={{ color: colors.foreground }}>
            {connectionError}
          </p>
          <button
            onClick={onExit}
            className="px-6 py-3 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: colors.primary, color: colors.background }}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Loading timer state
  if (!state) {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          floatingMode ? "w-full h-full" : "fixed inset-0"
        )}
        style={{ background: colors.background }}
      >
        <p className="text-xl" style={{ color: colors.foreground }}>Loading timer...</p>
      </div>
    )
  }

  const timerDisplay = formatTimerDisplay(
    state.timer.remaining,
    state.room.settings.showMilliseconds
  )

  // Minimized floating mode - compact timer only
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: colors.background,
          border: `2px solid ${colors.accent}`,
          minWidth: '200px'
        }}
      >
        <div className="p-3 flex items-center gap-3">
          <div className="flex-1">
            <motion.div
              className="font-mono font-bold text-3xl leading-none"
              style={{ color: statusColor }}
            >
              {timerDisplay}
            </motion.div>
            <p className="text-xs mt-1 opacity-60" style={{ color: colors.foreground }}>
              {state.timer.label}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
              style={{ background: colors.accent }}
            >
              <ArrowsOutSimple className="w-4 h-4" style={{ color: colors.background }} />
            </button>
            {onExit && (
              <button
                onClick={onExit}
                className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                style={{ background: colors.accent }}
              >
                <X className="w-4 h-4" style={{ color: colors.background }} />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {state.timer.status !== 'idle' && state.timer.type === 'countdown' && (
          <div className="h-1">
            <motion.div
              className="h-full"
              style={{ backgroundColor: statusColor }}
              initial={{ width: '100%' }}
              animate={{
                width: `${(state.timer.remaining / state.timer.duration) * 100}%`
              }}
              transition={{ duration: 0.1 }}
            />
          </div>
        )}

        {/* Mini message overlay */}
        <AnimatePresence>
          {currentMessage && currentMessage.isVisible && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className="p-2 text-xs font-medium cursor-pointer flex items-center gap-2"
                style={getMessageColors(currentMessage.type)}
                onClick={dismissMessage}
              >
                {getMessageIcon(currentMessage.type)}
                <span className="flex-1">{currentMessage.text}</span>
                <X className="w-3 h-3 opacity-50" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full presenter view
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center transition-all duration-300",
        floatingMode ? "w-full h-full" : "fixed inset-0"
      )}
      style={{
        background: colors.background,
        animation: state.timer.status === 'completed' && state.room.settings.flashOnComplete
          ? 'pulse 1s infinite' : undefined
      }}
    >
      {/* Control bar (hidden when fullscreen) */}
      {!isFullscreen && (
        <div
          className="absolute top-0 left-0 right-0 p-3 md:p-4 flex items-center justify-between opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: colors.foreground }}
        >
          <div className="flex items-center gap-2">
            {onExit && (
              <button
                onClick={onExit}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            )}
            {floatingMode && (
              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Minimize"
              >
                <ArrowsInSimple className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            )}
          </div>

          <div className="text-xs md:text-sm flex items-center gap-2">
            <Broadcast className="w-4 h-4" style={{ color: statusColor }} />
            <span className="font-mono font-bold">{state.room.code}</span>
            <span className="opacity-60">·</span>
            <span>{state.participants.length} connected</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isFullscreen
              ? <ArrowsIn className="w-5 h-5 md:w-6 md:h-6" />
              : <ArrowsOut className="w-5 h-5 md:w-6 md:h-6" />
            }
          </button>
        </div>
      )}

      {/* Exit fullscreen button (only in fullscreen) */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 p-2 rounded-lg opacity-0 hover:opacity-100 transition-opacity hover:bg-white/10"
          style={{ color: colors.foreground }}
        >
          <ArrowsIn className="w-6 h-6" />
        </button>
      )}

      {/* Timer Label */}
      <motion.div
        key={state.timer.label}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-lg md:text-2xl lg:text-4xl mb-2 md:mb-4 opacity-70"
        style={{ color: colors.foreground }}
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
          fontSize
        )}
        style={{
          color: statusColor,
          animation: state.timer.status === 'completed' ? 'pulse 1s infinite' : undefined
        }}
      >
        {timerDisplay}
      </motion.div>

      {/* Status Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 md:mt-6 text-base md:text-xl lg:text-2xl uppercase tracking-widest opacity-50"
        style={{ color: colors.foreground }}
      >
        {state.timer.status === 'running' && 'Running'}
        {state.timer.status === 'paused' && 'Paused'}
        {state.timer.status === 'completed' && 'Time Up!'}
        {state.timer.status === 'idle' && 'Ready'}
      </motion.div>

      {/* Progress Bar */}
      {state.timer.status !== 'idle' && state.timer.type === 'countdown' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 md:h-2">
          <motion.div
            className="h-full"
            style={{ backgroundColor: statusColor }}
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
            className="absolute inset-x-4 bottom-16 md:inset-x-20 md:bottom-24 lg:bottom-32"
          >
            <div
              className="rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 flex items-center gap-3 md:gap-4 shadow-2xl cursor-pointer"
              style={{
                backgroundColor: getMessageColors(currentMessage.type).bg,
                color: getMessageColors(currentMessage.type).text
              }}
              onClick={dismissMessage}
            >
              {getMessageIcon(currentMessage.type)}
              <div className="flex-1">
                <p className="text-base md:text-xl lg:text-3xl font-bold">{currentMessage.text}</p>
                <p className="text-xs md:text-sm opacity-70 mt-1">From: {currentMessage.sentBy}</p>
              </div>
              <X className="w-5 h-5 md:w-6 md:h-6 opacity-50" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Floating Timer Window component - opens in a new window
export function openFloatingTimerWindow(roomCode: string): Window | null {
  const width = 400
  const height = 200
  const left = window.screen.width - width - 20
  const top = window.screen.height - height - 100

  const popup = window.open(
    `/timer/${roomCode}?floating=true`,
    'FlowSphere Timer',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,alwaysOnTop=yes`
  )

  return popup
}
