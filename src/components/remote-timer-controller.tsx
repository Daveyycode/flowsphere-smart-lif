/**
 * Remote Timer Controller View
 * Moderator interface for controlling timer and sending messages to presenter
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useDeviceType } from '@/hooks/use-mobile'
import {
  getRemoteTimerManager,
  formatTimerDisplay,
  RoomState,
  TimerPreset,
  Message
} from '@/lib/remote-timer-sync'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Play,
  Pause,
  Stop,
  ArrowCounterClockwise,
  Plus,
  Minus,
  PaperPlaneTilt,
  Users,
  Gear,
  Copy,
  Check,
  Link,
  Warning,
  Info,
  Bell,
  CheckCircle,
  Timer,
  X,
  CaretDown,
  CaretUp,
  Palette,
  TextT,
  Eye,
  Trash
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface RemoteTimerControllerProps {
  roomCode: string
  onExit?: () => void
}

export function RemoteTimerController({ roomCode, onExit }: RemoteTimerControllerProps) {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  const [manager] = useState(() => getRemoteTimerManager())
  const [state, setState] = useState<RoomState | null>(null)
  const [isConnecting, setIsConnecting] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Timer input states
  const [customMinutes, setCustomMinutes] = useState(25)
  const [timerLabel, setTimerLabel] = useState('')

  // Message states
  const [messageText, setMessageText] = useState('')
  const [messageType, setMessageType] = useState<Message['type']>('info')
  const [messageDuration, setMessageDuration] = useState(10)

  // UI states
  const [showSettings, setShowSettings] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [recentMessages, setRecentMessages] = useState<Message[]>([])

  // Preset timers
  const presets: TimerPreset[] = [
    { id: '5min', name: '5 Minutes', duration: 5 * 60 * 1000, icon: 'timer' },
    { id: '10min', name: '10 Minutes', duration: 10 * 60 * 1000, icon: 'timer' },
    { id: '15min', name: '15 Minutes', duration: 15 * 60 * 1000, icon: 'timer' },
    { id: '20min', name: '20 Minutes', duration: 20 * 60 * 1000, icon: 'timer' },
    { id: '25min', name: '25 Minutes (Pomodoro)', duration: 25 * 60 * 1000, icon: 'timer' },
    { id: '30min', name: '30 Minutes', duration: 30 * 60 * 1000, icon: 'timer' },
    { id: '45min', name: '45 Minutes', duration: 45 * 60 * 1000, icon: 'timer' },
    { id: '60min', name: '1 Hour', duration: 60 * 60 * 1000, icon: 'timer' },
  ]

  // Join room on mount
  useEffect(() => {
    const joinRoom = async () => {
      setIsConnecting(true)
      setConnectionError(null)

      try {
        const roomState = await manager.joinRoom(roomCode, 'Controller', true)
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
      setRecentMessages(prev => [message, ...prev].slice(0, 10))
    })

    return () => {
      unsubscribe()
    }
  }, [manager])

  // Timer controls
  const handleStart = () => manager.startTimer()
  const handlePause = () => manager.pauseTimer()
  const handleStop = () => manager.stopTimer()
  const handleReset = () => manager.resetTimer()

  const handleAddTime = (seconds: number) => {
    manager.addTime(seconds * 1000)
    toast.success(`Added ${seconds > 0 ? '+' : ''}${seconds} seconds`)
  }

  const handleSetTimer = (durationMs: number, label?: string) => {
    manager.setTimer(durationMs, label)
    toast.success(`Timer set to ${Math.floor(durationMs / 60000)} minutes`)
    setShowPresets(false)
  }

  const handleCustomTimer = () => {
    const durationMs = customMinutes * 60 * 1000
    manager.setTimer(durationMs, timerLabel || `${customMinutes} min timer`)
    toast.success(`Timer set to ${customMinutes} minutes`)
    setTimerLabel('')
  }

  // Send message to presenter
  const handleSendMessage = () => {
    if (!messageText.trim()) {
      toast.error('Please enter a message')
      return
    }

    manager.sendMessage(
      messageText.trim(),
      messageType,
      messageDuration * 1000
    )
    toast.success('Message sent to presenter')
    setMessageText('')
  }

  // Quick message buttons
  const quickMessages = [
    { text: '1 minute warning', type: 'warning' as const },
    { text: 'Please wrap up', type: 'warning' as const },
    { text: 'Time extended', type: 'info' as const },
    { text: 'Great job!', type: 'success' as const },
    { text: 'Questions next', type: 'info' as const },
    { text: 'STOP NOW', type: 'alert' as const },
  ]

  const handleQuickMessage = (text: string, type: Message['type']) => {
    manager.sendMessage(text, type, messageDuration * 1000)
    toast.success('Message sent to presenter')
  }

  // Copy share link
  const copyShareLink = async () => {
    const presenterUrl = `${window.location.origin}/timer/${roomCode}`
    await navigator.clipboard.writeText(presenterUrl)
    setCopiedLink(true)
    toast.success('Presenter link copied!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Update room settings
  const handleUpdateSettings = (updates: Partial<RoomState['room']['settings']>) => {
    if (!state) return
    manager.updateSettings(updates)
  }

  // Get status color
  const getStatusColor = () => {
    if (!state) return 'text-gray-500'

    switch (state.timer.status) {
      case 'running':
        if (state.timer.remaining < 60000) return 'text-red-500'
        if (state.timer.remaining < 180000) return 'text-yellow-500'
        return 'text-green-500'
      case 'paused':
        return 'text-yellow-500'
      case 'completed':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }

  // Loading/Error states
  if (isConnecting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">Connecting to room...</p>
          <p className="text-sm text-muted-foreground/70">Code: {roomCode}</p>
        </div>
      </div>
    )
  }

  if (connectionError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md px-4">
          <Warning className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
          <p className="text-lg text-muted-foreground mb-6">{connectionError}</p>
          <Button onClick={onExit}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-xl text-muted-foreground">Loading timer...</p>
      </div>
    )
  }

  const timerDisplay = formatTimerDisplay(state.timer.remaining, state.room.settings.showMilliseconds)
  const statusColor = getStatusColor()
  const presenterCount = state.participants.filter(p => !p.isController).length

  return (
    <div className={cn("space-y-4", isMobile ? "px-2" : "px-0")}>
      {/* Header with room info */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Timer className="w-6 h-6 text-blue-500" weight="fill" />
              </div>
              <div>
                <h1 className={cn("font-bold", isMobile ? "text-lg" : "text-xl")}>
                  Remote Timer Control
                </h1>
                <p className="text-sm text-muted-foreground">
                  Room: <span className="font-mono font-bold text-blue-500">{state.room.code}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowParticipants(!showParticipants)}
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                {presenterCount}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyShareLink}
                className="gap-2"
              >
                {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Gear className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Participants dropdown */}
          <AnimatePresence>
            {showParticipants && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold mb-2">Connected Devices</h3>
                  <div className="space-y-2">
                    {state.participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            p.isConnected ? "bg-green-500" : "bg-gray-400"
                          )} />
                          <span>{p.name}</span>
                          {p.isController && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-500 rounded">
                              Controller
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {p.deviceType}
                        </span>
                      </div>
                    ))}
                    {state.participants.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No devices connected. Share the presenter link to get started.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Main Timer Display */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            {/* Timer Label */}
            {state.timer.label && (
              <p className="text-lg text-muted-foreground mb-2">{state.timer.label}</p>
            )}

            {/* Timer Display */}
            <motion.div
              key={state.timer.status}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "font-mono font-bold",
                isMobile ? "text-5xl" : "text-7xl",
                statusColor,
                state.timer.status === 'completed' && 'animate-pulse'
              )}
            >
              {timerDisplay}
            </motion.div>

            {/* Status */}
            <p className={cn(
              "mt-2 text-sm uppercase tracking-widest",
              statusColor
            )}>
              {state.timer.status === 'running' && 'Running'}
              {state.timer.status === 'paused' && 'Paused'}
              {state.timer.status === 'completed' && 'Time Up!'}
              {state.timer.status === 'idle' && 'Ready'}
            </p>

            {/* Progress bar */}
            {state.timer.status !== 'idle' && state.timer.type === 'countdown' && (
              <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
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
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-3 mt-6">
            {state.timer.status !== 'running' ? (
              <Button
                size="lg"
                onClick={handleStart}
                disabled={state.timer.status === 'idle' && state.timer.duration === 0}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Play className="w-5 h-5" weight="fill" />
                Start
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handlePause}
                className="gap-2 bg-yellow-600 hover:bg-yellow-700"
              >
                <Pause className="w-5 h-5" weight="fill" />
                Pause
              </Button>
            )}

            <Button
              size="lg"
              variant="outline"
              onClick={handleStop}
              disabled={state.timer.status === 'idle'}
            >
              <Stop className="w-5 h-5" weight="fill" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={handleReset}
              disabled={state.timer.status === 'idle'}
            >
              <ArrowCounterClockwise className="w-5 h-5" />
            </Button>
          </div>

          {/* Time adjustment buttons */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddTime(-60)}
              className="text-red-500"
            >
              <Minus className="w-4 h-4 mr-1" />
              1m
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddTime(-30)}
              className="text-red-500"
            >
              <Minus className="w-4 h-4 mr-1" />
              30s
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddTime(30)}
              className="text-green-500"
            >
              <Plus className="w-4 h-4 mr-1" />
              30s
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddTime(60)}
              className="text-green-500"
            >
              <Plus className="w-4 h-4 mr-1" />
              1m
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddTime(300)}
              className="text-green-500"
            >
              <Plus className="w-4 h-4 mr-1" />
              5m
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timer Presets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowPresets(!showPresets)}
          >
            <span className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Timer Presets
            </span>
            {showPresets ? <CaretUp className="w-5 h-5" /> : <CaretDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        <AnimatePresence>
          {showPresets && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {presets.map((preset) => (
                    <Button
                      key={preset.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetTimer(preset.duration, preset.name)}
                      className="justify-start"
                    >
                      <Timer className="w-4 h-4 mr-2" />
                      {preset.name}
                    </Button>
                  ))}
                </div>

                {/* Custom timer */}
                <div className="flex items-end gap-2 pt-4 border-t">
                  <div className="flex-1">
                    <Label className="text-sm">Custom Timer</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <span className="self-center text-sm text-muted-foreground">minutes</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm">Label (optional)</Label>
                    <Input
                      placeholder="Timer name..."
                      value={timerLabel}
                      onChange={(e) => setTimerLabel(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCustomTimer}>
                    Set Timer
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Message Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <PaperPlaneTilt className="w-5 h-5" />
            Send Message to Presenter
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Quick messages */}
          <div className="flex flex-wrap gap-2 mb-4">
            {quickMessages.map((msg, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => handleQuickMessage(msg.text, msg.type)}
                className={cn(
                  msg.type === 'warning' && 'border-yellow-500/50 text-yellow-500',
                  msg.type === 'alert' && 'border-red-500/50 text-red-500',
                  msg.type === 'success' && 'border-green-500/50 text-green-500',
                  msg.type === 'info' && 'border-blue-500/50 text-blue-500'
                )}
              >
                {msg.text}
              </Button>
            ))}
          </div>

          {/* Custom message */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!messageText.trim()}>
                <PaperPlaneTilt className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Label>Type:</Label>
                <div className="flex gap-1">
                  {(['info', 'warning', 'alert', 'success'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={messageType === type ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMessageType(type)}
                      className={cn(
                        "w-8 h-8 p-0",
                        messageType === type && type === 'info' && 'bg-blue-500',
                        messageType === type && type === 'warning' && 'bg-yellow-500',
                        messageType === type && type === 'alert' && 'bg-red-500',
                        messageType === type && type === 'success' && 'bg-green-500'
                      )}
                    >
                      {type === 'info' && <Info className="w-4 h-4" />}
                      {type === 'warning' && <Warning className="w-4 h-4" />}
                      {type === 'alert' && <Bell className="w-4 h-4" />}
                      {type === 'success' && <CheckCircle className="w-4 h-4" />}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label>Duration:</Label>
                <select
                  value={messageDuration}
                  onChange={(e) => setMessageDuration(parseInt(e.target.value))}
                  className="px-2 py-1 rounded bg-muted text-sm"
                >
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                </select>
              </div>
            </div>
          </div>

          {/* Recent messages */}
          {recentMessages.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Recent Messages</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {recentMessages.slice(0, 5).map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "text-sm p-2 rounded flex items-center justify-between",
                      msg.type === 'info' && 'bg-blue-500/10',
                      msg.type === 'warning' && 'bg-yellow-500/10',
                      msg.type === 'alert' && 'bg-red-500/10',
                      msg.type === 'success' && 'bg-green-500/10'
                    )}
                  >
                    <span>{msg.text}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.sentAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Gear className="w-5 h-5" />
                  Display Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Theme Note */}
                <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <Palette className="w-4 h-4 inline mr-2" />
                  Timer colors follow your FlowSphere theme from Settings.
                </div>

                {/* Font size */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <TextT className="w-4 h-4" />
                    Font Size
                  </Label>
                  <div className="flex gap-2">
                    {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
                      <Button
                        key={size}
                        variant={state.room.settings.fontSize === size ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleUpdateSettings({ fontSize: size })}
                      >
                        {size === 'small' && 'S'}
                        {size === 'medium' && 'M'}
                        {size === 'large' && 'L'}
                        {size === 'xlarge' && 'XL'}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Message Settings */}
                <div className="pt-3 border-t">
                  <Label className="flex items-center gap-2 mb-3">
                    <PaperPlaneTilt className="w-4 h-4" />
                    Message Settings
                  </Label>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Auto-dismiss Messages</Label>
                      <Switch
                        checked={state.room.settings.messageAutoDismiss ?? true}
                        onCheckedChange={(checked) => handleUpdateSettings({ messageAutoDismiss: checked })}
                      />
                    </div>

                    {(state.room.settings.messageAutoDismiss ?? true) && (
                      <div className="flex items-center gap-3">
                        <Label className="text-sm flex-1">Default Duration</Label>
                        <select
                          value={state.room.settings.messageDefaultDuration ?? 10}
                          onChange={(e) => handleUpdateSettings({ messageDefaultDuration: parseInt(e.target.value) })}
                          className="px-3 py-1.5 rounded-lg bg-muted text-sm"
                        >
                          <option value={5}>5 seconds</option>
                          <option value={10}>10 seconds</option>
                          <option value={15}>15 seconds</option>
                          <option value={20}>20 seconds</option>
                          <option value={30}>30 seconds</option>
                          <option value={60}>60 seconds</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Display Toggles */}
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      Show Milliseconds
                    </Label>
                    <Switch
                      checked={state.room.settings.showMilliseconds}
                      onCheckedChange={(checked) => handleUpdateSettings({ showMilliseconds: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      Flash on Complete
                    </Label>
                    <Switch
                      checked={state.room.settings.flashOnComplete}
                      onCheckedChange={(checked) => handleUpdateSettings({ flashOnComplete: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      Play Sound on Complete
                    </Label>
                    <Switch
                      checked={state.room.settings.soundEnabled}
                      onCheckedChange={(checked) => handleUpdateSettings({ soundEnabled: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Presenter View Button */}
      <Card className="bg-muted/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Full Presenter View</p>
              <p className="text-sm text-muted-foreground">
                Full-screen display for projector/stage
              </p>
            </div>
            <Button
              onClick={() => window.open(`/timer/${roomCode}`, '_blank')}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Open
            </Button>
          </div>
          <div className="flex items-center justify-between pt-3 border-t">
            <div>
              <p className="font-medium">Floating Timer</p>
              <p className="text-sm text-muted-foreground">
                Compact overlay for presenter's laptop
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open(`/timer/${roomCode}?floating=true`, 'FlowSphere Timer', 'width=400,height=200,resizable=yes')}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Open
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Exit Button */}
      {onExit && (
        <Button
          variant="ghost"
          onClick={onExit}
          className="w-full text-muted-foreground"
        >
          <X className="w-4 h-4 mr-2" />
          Exit Room
        </Button>
      )}
    </div>
  )
}
