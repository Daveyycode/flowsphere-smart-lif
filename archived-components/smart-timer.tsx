import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Stop, Timer, Plus, Minus, Clock, Target } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'

interface TimerSession {
  id: string
  name: string
  duration: number
  startedAt?: string
  completedAt?: string
  type: 'focus' | 'break' | 'custom'
}

interface TimerState {
  isRunning: boolean
  isPaused: boolean
  remainingTime: number
  currentSession: TimerSession | null
}

const PRESET_TIMERS = [
  { name: 'Pomodoro Focus', duration: 25 * 60, type: 'focus' as const },
  { name: 'Short Break', duration: 5 * 60, type: 'break' as const },
  { name: 'Long Break', duration: 15 * 60, type: 'break' as const },
  { name: 'Deep Work', duration: 90 * 60, type: 'focus' as const },
  { name: 'Quick Task', duration: 10 * 60, type: 'custom' as const },
]

export function SmartTimer() {
  const [timerState, setTimerState] = useKV<TimerState>('flowsphere-timer-state', {
    isRunning: false,
    isPaused: false,
    remainingTime: 0,
    currentSession: null,
  })
  
  const [sessions, setSessions] = useKV<TimerSession[]>('flowsphere-timer-sessions', [])
  const [customMinutes, setCustomMinutes] = useState(25)
  const [customName, setCustomName] = useState('')
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (timerState?.isRunning && !timerState.isPaused) {
      intervalRef.current = setInterval(() => {
        setTimerState((current) => {
          if (!current) {
            return {
              isRunning: false,
              isPaused: false,
              remainingTime: 0,
              currentSession: null,
            }
          }
          
          const newRemainingTime = current.remainingTime - 1

          if (newRemainingTime <= 0) {
            playCompletionSound()
            toast.success('Timer completed! 🎉')
            
            if (current.currentSession) {
              const completedSession = {
                ...current.currentSession,
                completedAt: new Date().toISOString()
              }
              setSessions((prevSessions) => [completedSession, ...(prevSessions || [])])
            }

            return {
              isRunning: false,
              isPaused: false,
              remainingTime: 0,
              currentSession: null,
            }
          }

          return {
            ...current,
            remainingTime: newRemainingTime,
          }
        })
      }, 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [timerState?.isRunning, timerState?.isPaused])

  const playCompletionSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.value = 800
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.5)
    } catch (error) {
      console.error('Error playing sound:', error)
    }
  }

  const startTimer = (session: TimerSession) => {
    const newSession = {
      ...session,
      id: Date.now().toString(),
      startedAt: new Date().toISOString(),
    }

    setTimerState({
      isRunning: true,
      isPaused: false,
      remainingTime: session.duration,
      currentSession: newSession,
    })

    toast.success(`Started: ${session.name}`)
  }

  const pauseTimer = () => {
    setTimerState((current) => ({
      ...current!,
      isPaused: true,
    }))
    toast('Timer paused')
  }

  const resumeTimer = () => {
    setTimerState((current) => ({
      ...current!,
      isPaused: false,
    }))
    toast('Timer resumed')
  }

  const stopTimer = () => {
    if (timerState?.currentSession) {
      const canceledSession = {
        ...timerState.currentSession,
        completedAt: new Date().toISOString(),
        duration: timerState.currentSession.duration - timerState.remainingTime
      }
      setSessions((prevSessions) => [canceledSession, ...(prevSessions || [])])
    }

    setTimerState({
      isRunning: false,
      isPaused: false,
      remainingTime: 0,
      currentSession: null,
    })

    toast('Timer stopped')
  }

  const startCustomTimer = () => {
    if (customMinutes < 1) {
      toast.error('Please enter a valid duration')
      return
    }

    const session: TimerSession = {
      id: Date.now().toString(),
      name: customName || `${customMinutes} min timer`,
      duration: customMinutes * 60,
      type: 'custom',
    }

    startTimer(session)
    setCustomName('')
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    if (!timerState?.currentSession) return 0
    const elapsed = timerState.currentSession.duration - (timerState.remainingTime || 0)
    return (elapsed / timerState.currentSession.duration) * 100
  }

  const todaySessions = (sessions || []).filter(s => 
    s.completedAt && 
    new Date(s.completedAt).toDateString() === new Date().toDateString()
  )

  const totalFocusTime = todaySessions
    .filter(s => s.type === 'focus' && s.completedAt)
    .reduce((acc, s) => acc + s.duration, 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-heading">
            Smart Timer
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Focus sessions synced across all your devices
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <Target className="w-3 h-3" />
            {todaySessions.length} sessions today
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            {Math.floor(totalFocusTime / 60)} min focused
          </Badge>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6">
            {timerState?.isRunning ? (
              <>
                <div className="relative w-48 h-48 sm:w-64 sm:h-64">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      className="fill-none stroke-muted stroke-[8]"
                    />
                    <motion.circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      className="fill-none stroke-primary stroke-[8]"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: getProgressPercentage() / 100 }}
                      transition={{ duration: 1 }}
                      style={{
                        strokeDasharray: '283',
                        strokeDashoffset: 283 * (1 - getProgressPercentage() / 100),
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-5xl sm:text-6xl font-bold text-foreground mb-2">
                      {formatTime(timerState.remainingTime || 0)}
                    </p>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {timerState.currentSession?.name}
                    </p>
                    {timerState.isPaused && (
                      <Badge variant="secondary" className="mt-2">Paused</Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  {timerState.isPaused ? (
                    <Button
                      onClick={resumeTimer}
                      size="lg"
                      className="gap-2 bg-primary hover:bg-primary/90"
                    >
                      <Play weight="fill" />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      onClick={pauseTimer}
                      size="lg"
                      variant="secondary"
                      className="gap-2"
                    >
                      <Pause weight="fill" />
                      Pause
                    </Button>
                  )}
                  <Button
                    onClick={stopTimer}
                    size="lg"
                    variant="destructive"
                    className="gap-2"
                  >
                    <Stop weight="fill" />
                    Stop
                  </Button>
                </div>
              </>
            ) : (
              <div className="w-full max-w-md">
                <Tabs defaultValue="preset" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="preset">Presets</TabsTrigger>
                    <TabsTrigger value="custom">Custom</TabsTrigger>
                  </TabsList>

                  <TabsContent value="preset" className="space-y-3 mt-4">
                    {PRESET_TIMERS.map((timer) => (
                      <Button
                        key={timer.name}
                        onClick={() => startTimer({
                          ...timer,
                          id: '',
                        })}
                        variant="outline"
                        className="w-full justify-between h-auto py-4 hover:bg-primary/5"
                      >
                        <div className="flex items-center gap-3">
                          <Timer className="w-5 h-5" />
                          <div className="text-left">
                            <p className="font-semibold">{timer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.floor(timer.duration / 60)} minutes
                            </p>
                          </div>
                        </div>
                        <Play weight="fill" className="w-5 h-5" />
                      </Button>
                    ))}
                  </TabsContent>

                  <TabsContent value="custom" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="timer-name">Timer Name (Optional)</Label>
                      <Input
                        id="timer-name"
                        placeholder="e.g., Reading Session"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCustomMinutes(Math.max(1, customMinutes - 5))}
                        >
                          <Minus />
                        </Button>
                        <Input
                          id="duration"
                          type="number"
                          min="1"
                          value={customMinutes}
                          onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 1)}
                          className="text-center"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCustomMinutes(customMinutes + 5)}
                        >
                          <Plus />
                        </Button>
                      </div>
                    </div>

                    <Button
                      onClick={startCustomTimer}
                      className="w-full gap-2 bg-primary hover:bg-primary/90"
                    >
                      <Play weight="fill" />
                      Start Timer
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {todaySessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todaySessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      session.type === 'focus' ? 'bg-primary' : 
                      session.type === 'break' ? 'bg-accent' : 
                      'bg-secondary'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{session.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.completedAt && new Date(session.completedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {Math.floor(session.duration / 60)} min
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
