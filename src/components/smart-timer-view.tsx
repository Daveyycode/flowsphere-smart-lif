import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useDeviceType } from '@/hooks/use-mobile'
import {
  Timer,
  Play,
  Pause,
  Stop,
  ArrowClockwise,
  Clock,
  Lightning,
  Devices,
  Bell,
  CheckCircle,
  Broadcast,
  ArrowRight,
} from '@phosphor-icons/react'
import { SmartTimerSyncManager, TimerState, TimerDevice } from '@/lib/smart-timer-sync'
import { toast } from 'sonner'

interface SmartTimerViewProps {
  userId?: string
  onTabChange?: (tab: string) => void
}

type TimerMode = 'countdown' | 'stopwatch' | 'pomodoro'

interface TimerPreset {
  id: string
  name: string
  duration: number
  icon: string
}

const TIMER_PRESETS: TimerPreset[] = [
  { id: 'study-25', name: 'Study Session', duration: 25 * 60 * 1000, icon: '📚' },
  { id: 'break-5', name: 'Short Break', duration: 5 * 60 * 1000, icon: '☕' },
  { id: 'focus-45', name: 'Deep Focus', duration: 45 * 60 * 1000, icon: '🎯' },
  { id: 'family-60', name: 'Family Time', duration: 60 * 60 * 1000, icon: '👨‍👩‍👧‍👦' },
  { id: 'exercise-30', name: 'Exercise', duration: 30 * 60 * 1000, icon: '💪' },
  { id: 'custom', name: 'Custom', duration: 0, icon: '⏱️' },
]

export function SmartTimerView({ userId = 'default-user', onTabChange }: SmartTimerViewProps) {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  const [timerManager] = useState(() => new SmartTimerSyncManager(userId))
  const [timerState, setTimerState] = useState<TimerState | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [remainingTime, setRemainingTime] = useState(0)
  const [connectedDevices, setConnectedDevices] = useState<TimerDevice[]>([])

  const [selectedMode, setSelectedMode] = useState<TimerMode>('countdown')
  const [selectedPreset, setSelectedPreset] = useState<string>('study-25')
  const [customMinutes, setCustomMinutes] = useState(25)
  const [customSeconds, setCustomSeconds] = useState(0)
  const [timerLabel, setTimerLabel] = useState('')
  const [pomodoroSessions, setPomodoroSessions] = useState(4)

  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const unsubscribe = timerManager.subscribe(state => {
      setTimerState(state)
    })

    const initialState = timerManager.getCurrentState()
    if (initialState) {
      setTimerState(initialState)
    }

    setConnectedDevices(timerManager.getConnectedDevices())

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      unsubscribe()
      timerManager.destroy()
    }
  }, [timerManager])

  useEffect(() => {
    if (timerState?.status === 'running') {
      updateIntervalRef.current = setInterval(() => {
        setCurrentTime(timerManager.getCurrentTime())
        setRemainingTime(timerManager.getRemainingTime())
        setConnectedDevices(timerManager.getConnectedDevices())
      }, 100)
    } else {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
      setCurrentTime(timerManager.getCurrentTime())
      setRemainingTime(timerManager.getRemainingTime())
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [timerState?.status, timerManager])

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    const label = timerLabel || TIMER_PRESETS.find(p => p.id === selectedPreset)?.name || 'Timer'

    if (selectedMode === 'stopwatch') {
      timerManager.startStopwatch(label)
      toast.success('Stopwatch started!')
    } else if (selectedMode === 'pomodoro') {
      const preset = TIMER_PRESETS.find(p => p.id === selectedPreset)
      const duration =
        selectedPreset === 'custom'
          ? (customMinutes * 60 + customSeconds) * 1000
          : preset?.duration || 25 * 60 * 1000
      timerManager.startPomodoro(duration, pomodoroSessions, label)
      toast.success(`Pomodoro started: ${pomodoroSessions} sessions`)
    } else {
      const preset = TIMER_PRESETS.find(p => p.id === selectedPreset)
      const duration =
        selectedPreset === 'custom'
          ? (customMinutes * 60 + customSeconds) * 1000
          : preset?.duration || 25 * 60 * 1000
      timerManager.startCountdown(duration, label)
      toast.success('Countdown started!')
    }
  }

  const handlePause = () => {
    timerManager.pause()
    toast.info('Timer paused')
  }

  const handleResume = () => {
    timerManager.resume()
    toast.success('Timer resumed')
  }

  const handleStop = () => {
    timerManager.stop()
    toast.info('Timer stopped')
  }

  const handleReset = () => {
    timerManager.reset()
    setCurrentTime(0)
    setRemainingTime(0)
    toast.info('Timer reset')
  }

  const isRunning = timerState?.status === 'running'
  const isPaused = timerState?.status === 'paused'
  const isIdle = !timerState || timerState.status === 'idle' || timerState.status === 'completed'

  const displayTime =
    timerState?.type === 'countdown' || timerState?.type === 'pomodoro'
      ? formatTime(remainingTime)
      : formatTime(currentTime)

  const progress = timerState?.totalDuration
    ? ((timerState.totalDuration - remainingTime) / timerState.totalDuration) * 100
    : 0

  return (
    <div className={cn('space-y-6', isMobile && 'space-y-4')}>
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader className={cn(isMobile ? 'pb-2' : 'pb-4')}>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Timer className="w-6 h-6 text-primary" weight="fill" />
            </div>
            <div>
              <h1 className={cn('font-bold', isMobile ? 'text-xl' : 'text-2xl')}>
                Smart Remote Timer
              </h1>
              <p className="text-sm text-muted-foreground">Synced across all your devices</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-3')}>
        {/* Timer Display */}
        <Card className={cn('col-span-1', !isMobile && 'col-span-2')}>
          <CardContent className={cn('p-6', isMobile && 'p-4')}>
            {/* Timer Circle */}
            <div className="relative flex items-center justify-center mb-6">
              <div
                className={cn(
                  'relative rounded-full flex items-center justify-center',
                  isMobile ? 'w-48 h-48' : 'w-64 h-64'
                )}
              >
                {/* Background circle */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted/20"
                  />
                  {/* Progress circle */}
                  {!isIdle && timerState?.type !== 'stopwatch' && (
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-primary transition-all duration-300"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                      strokeLinecap="round"
                    />
                  )}
                </svg>

                {/* Time display */}
                <div className="text-center z-10">
                  <span
                    className={cn(
                      'font-mono font-bold',
                      isMobile ? 'text-4xl' : 'text-6xl',
                      isRunning && 'text-primary'
                    )}
                  >
                    {displayTime}
                  </span>
                  {timerState?.label && (
                    <p className="text-muted-foreground mt-2">{timerState.label}</p>
                  )}
                  {timerState?.type === 'pomodoro' && timerState.currentSession && (
                    <p className="text-sm text-primary mt-1">
                      Session {timerState.currentSession} of {timerState.sessions}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {isIdle && (
                <Button size="lg" onClick={handleStart} className="gap-2 px-8">
                  <Play weight="fill" className="w-5 h-5" />
                  Start
                </Button>
              )}

              {isRunning && (
                <>
                  <Button size="lg" variant="outline" onClick={handlePause} className="gap-2">
                    <Pause weight="fill" className="w-5 h-5" />
                    Pause
                  </Button>
                  <Button size="lg" variant="destructive" onClick={handleStop} className="gap-2">
                    <Stop weight="fill" className="w-5 h-5" />
                    Stop
                  </Button>
                </>
              )}

              {isPaused && (
                <>
                  <Button size="lg" onClick={handleResume} className="gap-2">
                    <Play weight="fill" className="w-5 h-5" />
                    Resume
                  </Button>
                  <Button size="lg" variant="outline" onClick={handleReset} className="gap-2">
                    <ArrowClockwise className="w-5 h-5" />
                    Reset
                  </Button>
                </>
              )}
            </div>

            {/* Connected Devices */}
            {connectedDevices.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Devices className="w-4 h-4" />
                  <span>Synced Devices ({connectedDevices.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {connectedDevices.map(device => (
                    <div
                      key={device.id}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs flex items-center gap-2',
                        device.active
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          device.active ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
                        )}
                      />
                      {device.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timer Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Timer Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Selection */}
            <div className="space-y-2">
              <Label>Timer Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['countdown', 'stopwatch', 'pomodoro'] as TimerMode[]).map(mode => (
                  <Button
                    key={mode}
                    variant={selectedMode === mode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedMode(mode)}
                    disabled={!isIdle}
                    className="capitalize"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            {/* Presets (for countdown and pomodoro) */}
            {selectedMode !== 'stopwatch' && (
              <div className="space-y-2">
                <Label>Quick Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TIMER_PRESETS.map(preset => (
                    <Button
                      key={preset.id}
                      variant={selectedPreset === preset.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedPreset(preset.id)}
                      disabled={!isIdle}
                      className="justify-start text-left"
                    >
                      <span className="mr-2">{preset.icon}</span>
                      <span className="truncate text-xs">{preset.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Time (when custom preset selected) */}
            {selectedPreset === 'custom' && selectedMode !== 'stopwatch' && (
              <div className="space-y-2">
                <Label>Custom Duration</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={999}
                    value={customMinutes}
                    onChange={e => setCustomMinutes(parseInt(e.target.value) || 0)}
                    disabled={!isIdle}
                    className="w-20 text-center"
                  />
                  <span className="text-muted-foreground">min</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={customSeconds}
                    onChange={e => setCustomSeconds(parseInt(e.target.value) || 0)}
                    disabled={!isIdle}
                    className="w-20 text-center"
                  />
                  <span className="text-muted-foreground">sec</span>
                </div>
              </div>
            )}

            {/* Pomodoro Sessions */}
            {selectedMode === 'pomodoro' && (
              <div className="space-y-2">
                <Label>Pomodoro Sessions</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPomodoroSessions(Math.max(1, pomodoroSessions - 1))}
                    disabled={!isIdle || pomodoroSessions <= 1}
                  >
                    -
                  </Button>
                  <span className="w-12 text-center font-mono">{pomodoroSessions}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPomodoroSessions(Math.min(10, pomodoroSessions + 1))}
                    disabled={!isIdle || pomodoroSessions >= 10}
                  >
                    +
                  </Button>
                </div>
              </div>
            )}

            {/* Timer Label */}
            <div className="space-y-2">
              <Label>Timer Label (optional)</Label>
              <Input
                placeholder="e.g., Study Math"
                value={timerLabel}
                onChange={e => setTimerLabel(e.target.value)}
                disabled={!isIdle}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remote Timer Feature */}
      <Card className="bg-gradient-to-br from-orange-500/10 via-red-500/10 to-purple-500/10 border-orange-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                <Broadcast className="w-7 h-7 text-white" weight="fill" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Remote Timer for Presentations</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Control timers remotely for stage presentations, events, and conferences. Share a
                  link with presenters and control their timer from your device.
                </p>
              </div>
            </div>
            <Button
              onClick={() => onTabChange?.('remote-timer')}
              className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              Launch
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Smart Timer Features</h3>
          <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-3')}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Devices className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium">Cross-Device Sync</h4>
                <p className="text-sm text-muted-foreground">
                  Timer syncs in real-time across all your devices
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h4 className="font-medium">Smart Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Get alerts on all devices when timer completes
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Lightning className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium">Pomodoro Technique</h4>
                <p className="text-sm text-muted-foreground">
                  Built-in Pomodoro mode for maximum productivity
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
