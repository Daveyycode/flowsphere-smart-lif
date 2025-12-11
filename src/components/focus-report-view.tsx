import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useDeviceType } from '@/hooks/use-mobile'
import {
  Eye,
  Play,
  Stop,
  Coffee,
  TrendUp,
  Clock,
  Lightning,
  Fire,
  ChartBar,
  Target,
  Warning
} from '@phosphor-icons/react'
import {
  getFocusTracker,
  FocusSession,
  FocusStats,
  formatDuration
} from '@/lib/focus-tracking'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

export function FocusReportView() {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  const [tracker] = useState(() => getFocusTracker())
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null)
  const [stats, setStats] = useState<FocusStats | null>(null)
  const [sessionLabel, setSessionLabel] = useState('')
  const [isOnBreak, setIsOnBreak] = useState(false)

  useEffect(() => {
    // Subscribe to session updates
    const unsubscribe = tracker.subscribe((session) => {
      setCurrentSession(session)
    })

    // Load initial state
    setCurrentSession(tracker.getCurrentSession())
    setStats(tracker.getStats())

    return () => {
      unsubscribe()
    }
  }, [tracker])

  const handleStartSession = () => {
    tracker.startSession(sessionLabel || 'Focus Session')
    setStats(tracker.getStats())
    toast.success('Focus session started! Stay focused.')
  }

  const handleEndSession = () => {
    const session = tracker.endSession()
    if (session) {
      toast.success(
        `Session complete! Focus score: ${session.focusScore}%`,
        {
          description: `You focused for ${formatDuration(session.focusedDuration)}`
        }
      )
    }
    setCurrentSession(null)
    setStats(tracker.getStats())
    setIsOnBreak(false)
  }

  const handleStartBreak = () => {
    tracker.startBreak()
    setIsOnBreak(true)
    toast.info('Break started. Take a moment to rest.')
  }

  const handleEndBreak = () => {
    tracker.endBreak()
    setIsOnBreak(false)
    toast.success('Break ended. Back to focus!')
  }

  const isActive = tracker.isSessionActive()

  // Calculate live focus score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20'
    if (score >= 60) return 'bg-yellow-500/20'
    if (score >= 40) return 'bg-orange-500/20'
    return 'bg-red-500/20'
  }

  return (
    <div className={cn("space-y-6", isMobile && "space-y-4")}>
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardHeader className={cn(isMobile ? "pb-2" : "pb-4")}>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Eye className="w-6 h-6 text-purple-500" weight="fill" />
            </div>
            <div>
              <h1 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>
                Focus & Attention Report
              </h1>
              <p className="text-sm text-muted-foreground">
                Track your focus and improve productivity
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-3")}>
        {/* Current Session / Start Session */}
        <Card className={cn("col-span-1", !isMobile && "col-span-2")}>
          <CardContent className={cn("p-6", isMobile && "p-4")}>
            {!isActive ? (
              /* Start Session UI */
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Target className="w-12 h-12 text-primary" weight="duotone" />
                </div>

                <div>
                  <h2 className={cn("font-bold mb-2", isMobile ? "text-xl" : "text-2xl")}>
                    Ready to Focus?
                  </h2>
                  <p className="text-muted-foreground">
                    Start a focus session to track your attention and productivity
                  </p>
                </div>

                <div className="max-w-xs mx-auto space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-label">Session Label (optional)</Label>
                    <Input
                      id="session-label"
                      placeholder="e.g., Study Math, Work on Project"
                      value={sessionLabel}
                      onChange={(e) => setSessionLabel(e.target.value)}
                    />
                  </div>

                  <Button
                    size="lg"
                    onClick={handleStartSession}
                    className="w-full gap-2"
                  >
                    <Play weight="fill" className="w-5 h-5" />
                    Start Focus Session
                  </Button>
                </div>
              </div>
            ) : (
              /* Active Session UI */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={cn("font-bold", isMobile ? "text-lg" : "text-xl")}>
                      {currentSession?.label || 'Focus Session'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {isOnBreak ? 'Taking a break...' : 'Session in progress'}
                    </p>
                  </div>
                  {isOnBreak && (
                    <div className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-sm font-medium">
                      On Break
                    </div>
                  )}
                </div>

                {/* Live Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Clock className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-mono font-bold">
                      {formatDuration(currentSession?.totalDuration || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Time</p>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Lightning className="w-6 h-6 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-mono font-bold">
                      {formatDuration(currentSession?.focusedDuration || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Focused</p>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Warning className="w-6 h-6 mx-auto mb-2 text-red-500" />
                    <p className="text-2xl font-mono font-bold">
                      {currentSession?.distractions.length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Distractions</p>
                  </div>

                  <div className={cn("text-center p-4 rounded-lg", getScoreBgColor(currentSession?.focusScore || 0))}>
                    <Target className={cn("w-6 h-6 mx-auto mb-2", getScoreColor(currentSession?.focusScore || 0))} />
                    <p className={cn("text-2xl font-mono font-bold", getScoreColor(currentSession?.focusScore || 0))}>
                      {currentSession?.focusScore || 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Focus Score</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Focus Progress</span>
                    <span className={getScoreColor(currentSession?.focusScore || 0)}>
                      {currentSession?.focusScore || 0}%
                    </span>
                  </div>
                  <Progress value={currentSession?.focusScore || 0} className="h-3" />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  {!isOnBreak ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleStartBreak}
                        className="gap-2"
                      >
                        <Coffee className="w-5 h-5" />
                        Take Break
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleEndSession}
                        className="gap-2"
                      >
                        <Stop weight="fill" className="w-5 h-5" />
                        End Session
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleEndBreak}
                      className="gap-2"
                    >
                      <Play weight="fill" className="w-5 h-5" />
                      Resume Focus
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ChartBar className="w-5 h-5" />
              Your Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats && stats.totalSessions > 0 ? (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Sessions</span>
                    <span className="font-bold">{stats.totalSessions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Focus Time</span>
                    <span className="font-bold">{formatDuration(stats.totalFocusTime)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Focus Score</span>
                    <span className={cn("font-bold", getScoreColor(stats.averageFocusScore))}>
                      {stats.averageFocusScore}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Best Focus Time</span>
                    <span className="font-bold text-primary">{stats.bestFocusTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Longest Session</span>
                    <span className="font-bold">{formatDuration(stats.longestSession)}</span>
                  </div>
                </div>

                {/* Streak */}
                <div className="p-4 rounded-lg bg-orange-500/20 text-center">
                  <Fire className="w-8 h-8 mx-auto mb-2 text-orange-500" weight="fill" />
                  <p className="text-2xl font-bold text-orange-500">{stats.currentStreak}</p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No sessions yet</p>
                <p className="text-xs">Start your first focus session!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Chart */}
      {stats && stats.totalSessions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendUp className="w-5 h-5" />
              Weekly Focus Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("h-64", isMobile && "h-48")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeklyData}>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                    tickFormatter={(value) => `${Math.round(value / 60000)}m`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-popover border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.date}</p>
                            <p className="text-sm text-muted-foreground">
                              Focus: {formatDuration(data.focusTime)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Sessions: {data.sessions}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Avg Score: {Math.round(data.avgScore)}%
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="focusTime" radius={[4, 4, 0, 0]}>
                    {stats.weeklyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.focusTime > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Focus Tips</h3>
          <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-3")}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium">Pomodoro Technique</h4>
                <p className="text-sm text-muted-foreground">
                  Work for 25 minutes, then take a 5-minute break
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Eye className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium">Minimize Distractions</h4>
                <p className="text-sm text-muted-foreground">
                  Close unnecessary tabs and silence notifications
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Coffee className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h4 className="font-medium">Take Planned Breaks</h4>
                <p className="text-sm text-muted-foreground">
                  Regular breaks improve long-term focus
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
