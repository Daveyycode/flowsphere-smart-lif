import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useDeviceType } from '@/hooks/use-mobile'
import {
  CalendarCheck,
  GoogleLogo,
  MicrosoftOutlookLogo,
  Plus,
  Lightning,
  Clock,
  Target,
  TrendUp,
  Brain,
  Calendar,
  CheckCircle,
  Warning,
  ArrowRight,
  Sparkle,
  User,
  Coffee,
  CaretRight
} from '@phosphor-icons/react'
import { chatCompletion } from '@/lib/ai-provider-config'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  color?: string
  source: 'google' | 'outlook' | 'local'
}

interface SchedulerTask {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  estimatedTime: number // minutes
  deadline?: Date
  completed: boolean
  scheduledTime?: Date
}

interface SchedulerSettings {
  workStartHour: number
  workEndHour: number
  breakDuration: number
  focusSessionLength: number
  enableAISuggestions: boolean
  preferredWorkDays: number[] // 0-6, Sunday-Saturday
}

interface AIScheduleSuggestion {
  id: string
  type: 'optimize' | 'break' | 'reschedule' | 'warning'
  title: string
  description: string
  action?: () => void
}

const SETTINGS_KEY = 'flowsphere-scheduler-settings'
const TASKS_KEY = 'flowsphere-scheduler-tasks'
const EVENTS_KEY = 'flowsphere-scheduler-events'

const DEFAULT_SETTINGS: SchedulerSettings = {
  workStartHour: 9,
  workEndHour: 17,
  breakDuration: 15,
  focusSessionLength: 45,
  enableAISuggestions: true,
  preferredWorkDays: [1, 2, 3, 4, 5] // Mon-Fri
}

export function SchedulerAIView() {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  const [settings, setSettings] = useKV<SchedulerSettings>(SETTINGS_KEY, DEFAULT_SETTINGS)
  const [tasks, setTasks] = useKV<SchedulerTask[]>(TASKS_KEY, [])
  const [events, setEvents] = useKV<CalendarEvent[]>(EVENTS_KEY, [])

  const [currentView, setCurrentView] = useState<'overview' | 'tasks' | 'calendar' | 'settings'>('overview')
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const [isConnectingOutlook, setIsConnectingOutlook] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<AIScheduleSuggestion[]>([])
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Check for existing calendar connections
  const [googleConnected, setGoogleConnected] = useState(false)
  const [outlookConnected, setOutlookConnected] = useState(false)

  useEffect(() => {
    // Check localStorage for existing connections
    const googleToken = localStorage.getItem('flowsphere-google-calendar-token')
    const outlookToken = localStorage.getItem('flowsphere-outlook-calendar-token')
    setGoogleConnected(!!googleToken)
    setOutlookConnected(!!outlookToken)

    // Handle OAuth callback
    handleCalendarOAuthCallback()
  }, [])

  /**
   * Handle Calendar OAuth callback from redirect
   * URL format: /auth/{provider}-calendar/callback?code=xxx
   */
  const handleCalendarOAuthCallback = async () => {
    const path = window.location.pathname
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const error = urlParams.get('error')

    // Check if this is a calendar OAuth callback
    if (!path.includes('/auth/') || !path.includes('-calendar/callback')) {
      return
    }

    // Handle OAuth errors
    if (error) {
      console.error('[CalendarOAuth] OAuth error:', error)
      toast.error('Calendar connection failed', {
        description: urlParams.get('error_description') || error
      })
      window.history.replaceState({}, document.title, '/scheduler')
      return
    }

    if (!code) {
      return
    }

    // Determine provider from path
    let provider: 'google' | 'outlook' | null = null
    let redirectUri: string = ''

    if (path.includes('/google-calendar/')) {
      provider = 'google'
      redirectUri = `${window.location.origin}/auth/google-calendar/callback`
    } else if (path.includes('/outlook-calendar/')) {
      provider = 'outlook'
      redirectUri = `${window.location.origin}/auth/outlook-calendar/callback`
    }

    if (!provider) {
      console.error('[CalendarOAuth] Unknown provider in path:', path)
      return
    }

    setIsConnectingGoogle(provider === 'google')
    setIsConnectingOutlook(provider === 'outlook')

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

      // Build request body
      const requestBody: Record<string, string> = {
        provider: provider === 'google' ? 'google' : 'outlook',
        action: 'exchange',
        code,
        redirectUri,
      }

      // Add PKCE code verifier for Outlook
      if (provider === 'outlook') {
        const codeVerifier = sessionStorage.getItem('outlook_calendar_code_verifier')
        if (codeVerifier) {
          requestBody.codeVerifier = codeVerifier
          sessionStorage.removeItem('outlook_calendar_code_verifier')
        }
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/oauth-exchange`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to exchange code for tokens')
      }

      const tokens = await response.json()

      // Store tokens for calendar access
      const tokenKey = provider === 'google'
        ? 'flowsphere-google-calendar-token'
        : 'flowsphere-outlook-calendar-token'

      localStorage.setItem(tokenKey, JSON.stringify({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000
      }))

      if (provider === 'google') {
        setGoogleConnected(true)
        toast.success('Google Calendar connected successfully!')
      } else {
        setOutlookConnected(true)
        toast.success('Outlook Calendar connected successfully!')
      }

      // Clean URL
      window.history.replaceState({}, document.title, '/scheduler')

    } catch (error) {
      console.error('[CalendarOAuth] Token exchange failed:', error)
      toast.error(`Failed to connect ${provider === 'google' ? 'Google' : 'Outlook'} Calendar`, {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
      window.history.replaceState({}, document.title, '/scheduler')
    } finally {
      setIsConnectingGoogle(false)
      setIsConnectingOutlook(false)
    }
  }

  // Generate AI suggestions on load
  useEffect(() => {
    if (settings?.enableAISuggestions && (tasks?.length || 0) > 0) {
      generateAISuggestions()
    }
  }, [tasks, events])

  const connectGoogleCalendar = async () => {
    setIsConnectingGoogle(true)

    try {
      // Check if Google OAuth is configured
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

      if (!googleClientId) {
        toast.error('Google Calendar not configured. Please add your Google Client ID in settings.')
        setIsConnectingGoogle(false)
        return
      }

      // Use redirect-based OAuth flow (same as email connection)
      // Use google-calendar callback path to distinguish from email
      const redirectUri = `${window.location.origin}/auth/google-calendar/callback`
      const scope = encodeURIComponent([
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ].join(' '))
      const state = Math.random().toString(36).substring(2, 15)

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`

      // Redirect to Google OAuth
      window.location.href = authUrl

    } catch (error) {
      toast.error('Failed to connect Google Calendar')
      console.error(error)
      setIsConnectingGoogle(false)
    }
  }

  const connectOutlookCalendar = async () => {
    setIsConnectingOutlook(true)

    try {
      const outlookClientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID

      if (!outlookClientId) {
        toast.error('Outlook not configured. Please add your Outlook Client ID in settings.')
        setIsConnectingOutlook(false)
        return
      }

      // Generate PKCE code verifier and challenge (required by Microsoft for SPAs)
      const generateCodeVerifier = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
        const array = new Uint8Array(64)
        crypto.getRandomValues(array)
        return Array.from(array, byte => chars[byte % chars.length]).join('')
      }

      const generateCodeChallenge = async (verifier: string): Promise<string> => {
        const encoder = new TextEncoder()
        const data = encoder.encode(verifier)
        const digest = await crypto.subtle.digest('SHA-256', data)
        const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      }

      const codeVerifier = generateCodeVerifier()
      const codeChallenge = await generateCodeChallenge(codeVerifier)

      // Store code verifier for token exchange
      sessionStorage.setItem('outlook_calendar_code_verifier', codeVerifier)

      // Use outlook-calendar callback path to distinguish from email
      const redirectUri = `${window.location.origin}/auth/outlook-calendar/callback`
      const scope = encodeURIComponent([
        'openid',
        'profile',
        'email',
        'offline_access',
        'Calendars.Read',
        'Calendars.ReadWrite'
      ].join(' '))
      const state = Math.random().toString(36).substring(2, 15)

      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${outlookClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`

      // Redirect to Microsoft OAuth
      window.location.href = authUrl

    } catch (error) {
      toast.error('Failed to connect Outlook Calendar')
      console.error(error)
      setIsConnectingOutlook(false)
    }
  }

  const generateAISuggestions = async () => {
    if (!tasks || tasks.length === 0) return

    setIsLoadingAI(true)

    try {
      const taskSummary = tasks.map(t => ({
        title: t.title,
        priority: t.priority,
        estimatedMinutes: t.estimatedTime,
        completed: t.completed,
        deadline: t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No deadline'
      }))

      const eventSummary = (events || []).slice(0, 10).map(e => ({
        title: e.title,
        time: new Date(e.start).toLocaleString()
      }))

      const prompt = `You are a productivity AI assistant. Based on these tasks and events, provide 2-3 brief scheduling suggestions.

Tasks: ${JSON.stringify(taskSummary)}
Upcoming Events: ${JSON.stringify(eventSummary)}
Work hours: ${settings?.workStartHour || 9}:00 - ${settings?.workEndHour || 17}:00
Current time: ${new Date().toLocaleString()}

Respond with a JSON array of suggestions:
[
  {
    "type": "optimize" | "break" | "reschedule" | "warning",
    "title": "Short title",
    "description": "Brief actionable suggestion"
  }
]

Keep suggestions practical and concise. Only respond with valid JSON.`

      const result = await chatCompletion([
        { role: 'system', content: 'You are a scheduling AI. Only respond with valid JSON arrays.' },
        { role: 'user', content: prompt }
      ], { maxTokens: 500 })

      const suggestions = JSON.parse(result.content)
      setAiSuggestions(suggestions.map((s: any, i: number) => ({
        id: `suggestion-${i}`,
        ...s
      })))

    } catch (error) {
      console.error('AI suggestions failed:', error)
      // Set default suggestions
      setAiSuggestions([
        {
          id: 'default-1',
          type: 'optimize',
          title: 'Start with high priority tasks',
          description: 'Tackle your most important tasks during your peak energy hours.'
        }
      ])
    } finally {
      setIsLoadingAI(false)
    }
  }

  const addTask = () => {
    if (!newTaskTitle.trim()) return

    const newTask: SchedulerTask = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      priority: 'medium',
      estimatedTime: 30,
      completed: false
    }

    setTasks([...(tasks || []), newTask])
    setNewTaskTitle('')
    toast.success('Task added!')
  }

  const toggleTaskComplete = (id: string) => {
    setTasks((tasks || []).map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ))
  }

  const deleteTask = (id: string) => {
    setTasks((tasks || []).filter(t => t.id !== id))
    toast.success('Task deleted')
  }

  // Calculate schedule stats
  const pendingTasks = (tasks || []).filter(t => !t.completed)
  const completedTasks = (tasks || []).filter(t => t.completed)
  const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high')
  const totalEstimatedTime = pendingTasks.reduce((sum, t) => sum + t.estimatedTime, 0)

  // Format time
  const formatMinutes = (mins: number): string => {
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    const minutes = mins % 60
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'optimize': return <Lightning className="w-4 h-4" weight="fill" />
      case 'break': return <Coffee className="w-4 h-4" weight="fill" />
      case 'warning': return <Warning className="w-4 h-4" weight="fill" />
      case 'reschedule': return <Clock className="w-4 h-4" weight="fill" />
      default: return <Sparkle className="w-4 h-4" weight="fill" />
    }
  }

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'optimize': return 'bg-blue-500/20 text-blue-500'
      case 'break': return 'bg-green-500/20 text-green-500'
      case 'warning': return 'bg-red-500/20 text-red-500'
      case 'reschedule': return 'bg-yellow-500/20 text-yellow-500'
      default: return 'bg-purple-500/20 text-purple-500'
    }
  }

  return (
    <div className={cn("space-y-6", isMobile && "space-y-4")}>
      {/* Header */}
      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
        <CardHeader className={cn(isMobile ? "pb-2" : "pb-4")}>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <CalendarCheck className="w-6 h-6 text-indigo-500" weight="fill" />
            </div>
            <div>
              <h1 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>
                FlowAI Scheduler
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-powered schedule management
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className={cn("grid gap-3", isMobile ? "grid-cols-2" : "grid-cols-4")}>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{pendingTasks.length}</p>
            <p className="text-xs text-muted-foreground">Pending Tasks</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" weight="fill" />
            <p className="text-2xl font-bold">{completedTasks.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4 text-center">
            <Warning className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{highPriorityTasks.length}</p>
            <p className="text-xs text-muted-foreground">High Priority</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{formatMinutes(totalEstimatedTime)}</p>
            <p className="text-xs text-muted-foreground">Total Time</p>
          </CardContent>
        </Card>
      </div>

      <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-3")}>
        {/* AI Suggestions */}
        <Card className={cn("col-span-1", !isMobile && "col-span-2")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Suggestions
              {isLoadingAI && (
                <span className="text-xs text-muted-foreground animate-pulse">Analyzing...</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiSuggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Add tasks to get AI suggestions</p>
              </div>
            ) : (
              aiSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-3 rounded-lg bg-muted/50 flex items-start gap-3"
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", getSuggestionColor(suggestion.type))}>
                    {getSuggestionIcon(suggestion.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{suggestion.title}</h4>
                    <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                  </div>
                </div>
              ))
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={generateAISuggestions}
              disabled={isLoadingAI || (tasks || []).length === 0}
            >
              <Sparkle className="w-4 h-4 mr-2" />
              Refresh Suggestions
            </Button>
          </CardContent>
        </Card>

        {/* Calendar Connections */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Calendars
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant={googleConnected ? 'secondary' : 'outline'}
              className="w-full justify-start"
              onClick={connectGoogleCalendar}
              disabled={isConnectingGoogle}
            >
              <GoogleLogo className="w-5 h-5 mr-3" weight="bold" />
              {googleConnected ? 'Google Connected' : 'Connect Google'}
              {googleConnected && (
                <CheckCircle className="w-4 h-4 ml-auto text-green-500" weight="fill" />
              )}
            </Button>

            <Button
              variant={outlookConnected ? 'secondary' : 'outline'}
              className="w-full justify-start"
              onClick={connectOutlookCalendar}
              disabled={isConnectingOutlook}
            >
              <MicrosoftOutlookLogo className="w-5 h-5 mr-3" weight="bold" />
              {outlookConnected ? 'Outlook Connected' : 'Connect Outlook'}
              {outlookConnected && (
                <CheckCircle className="w-4 h-4 ml-auto text-green-500" weight="fill" />
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-2">
              Connect calendars to sync your events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Your Tasks
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentView('tasks')}
            >
              View All <CaretRight className="w-4 h-4 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add Task */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Add a new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
            />
            <Button onClick={addTask} disabled={!newTaskTitle.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Task List */}
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {(tasks || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks yet</p>
                  <p className="text-xs">Add your first task above</p>
                </div>
              ) : (
                (tasks || []).slice(0, 10).map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "p-3 rounded-lg border flex items-center gap-3 transition-all",
                      task.completed
                        ? "bg-muted/30 border-muted"
                        : task.priority === 'high'
                          ? "bg-red-500/5 border-red-500/30"
                          : "bg-card border-border"
                    )}
                  >
                    <button
                      onClick={() => toggleTaskComplete(task.id)}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        task.completed
                          ? "bg-green-500 border-green-500"
                          : "border-muted-foreground hover:border-primary"
                      )}
                    >
                      {task.completed && (
                        <CheckCircle className="w-4 h-4 text-white" weight="fill" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        task.completed && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatMinutes(task.estimatedTime)}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium",
                          task.priority === 'high' ? 'bg-red-500/20 text-red-500' :
                          task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                          'bg-gray-500/20 text-gray-500'
                        )}>
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTask(task.id)}
                    >
                      ×
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Features Info */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">FlowAI Scheduler Features</h3>
          <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-3")}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium">AI Optimization</h4>
                <p className="text-sm text-muted-foreground">
                  Smart suggestions based on your schedule
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium">Calendar Sync</h4>
                <p className="text-sm text-muted-foreground">
                  Integrates with Google & Outlook
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <TrendUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h4 className="font-medium">Progress Tracking</h4>
                <p className="text-sm text-muted-foreground">
                  Visualize your productivity trends
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
