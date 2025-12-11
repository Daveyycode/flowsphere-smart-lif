/**
 * Kids Learning Center
 * Unified hub for all children's learning features:
 * - Tutor AI with interactive lessons
 * - Focus & Attention tracking
 * - AI Study Monitor with camera
 * - Progress reports and gamification
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useDeviceType } from '@/hooks/use-mobile'
import {
  Brain,
  GraduationCap,
  BookOpen,
  Globe,
  Lightbulb,
  PaperPlaneTilt,
  Star,
  Trophy,
  Target,
  Calendar,
  CheckCircle,
  Fire,
  Sparkle,
  User,
  Robot,
  ArrowLeft,
  Play,
  Stop,
  Pause,
  Camera,
  Eye,
  Warning,
  Coffee,
  Clock,
  ChartBar,
  Shield,
  Bell,
  Lightning,
  CaretRight,
  House,
  Users,
  Plus,
  Trash,
  Pencil,
  X,
  Info
} from '@phosphor-icons/react'
import { smartCompletion, checkUsageLimits, ChatMessage } from '@/lib/smart-ai-router'
import { AIUsageWarning, AIUsageStats } from '@/components/ai-setup-guide'
import { getFocusTracker, FocusSession, FocusStats, formatDuration } from '@/lib/focus-tracking'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'
import { logger } from '@/lib/security-utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie
} from 'recharts'

// ==========================================
// Types & Interfaces
// ==========================================

interface KidProfile {
  id: string
  name: string
  age: number
  grade: string
  avatar: string
  selectedSubjects: string[]
  // Gamification
  xp: number
  level: number
  streak: number
  // Progress
  completedLessons: number
  completedTests: number
  totalStudyTime: number // in minutes
  // Parent link
  parentId?: string
  // Settings
  dailyGoal: number // minutes
  focusAlertThreshold: number // seconds
}

interface Subject {
  id: string
  name: string
  icon: any
  color: string
  description: string
  grades: string[]
}

interface LearningSession {
  id: string
  kidId: string
  subject: string
  type: 'lesson' | 'test' | 'practice'
  startTime: number
  endTime?: number
  duration: number
  focusScore: number
  xpEarned: number
  completed: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface Assignment {
  id: string
  kidId: string
  subject: string
  title: string
  questions: AssignmentQuestion[]
  dueDate: number
  completed: boolean
  score?: number
}

interface AssignmentQuestion {
  question: string
  type: 'multiple_choice' | 'short_answer' | 'true_false'
  options?: string[]
  correctAnswer?: string
  userAnswer?: string
  isCorrect?: boolean
}

interface MonitorSettings {
  analysisInterval: number
  distractionThreshold: number
  enableAlerts: boolean
  enableSound: boolean
  parentNotifications: boolean
}

// ==========================================
// Constants
// ==========================================

const SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'Mathematics',
    icon: Lightbulb,
    color: 'from-blue-500 to-blue-600',
    description: 'Numbers, algebra, geometry, and problem-solving',
    grades: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
  },
  {
    id: 'science',
    name: 'Science',
    icon: Sparkle,
    color: 'from-green-500 to-green-600',
    description: 'Biology, physics, chemistry, and earth science',
    grades: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
  },
  {
    id: 'reading',
    name: 'Reading & Writing',
    icon: BookOpen,
    color: 'from-purple-500 to-purple-600',
    description: 'Comprehension, grammar, vocabulary, and writing skills',
    grades: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
  },
  {
    id: 'language',
    name: 'Language Learning',
    icon: Globe,
    color: 'from-orange-500 to-orange-600',
    description: 'Spanish, French, Mandarin, Japanese, and more',
    grades: ['Beginner', 'Elementary', 'Intermediate', 'Advanced']
  },
  {
    id: 'general',
    name: 'General Knowledge',
    icon: GraduationCap,
    color: 'from-pink-500 to-pink-600',
    description: 'History, geography, current events, and trivia',
    grades: ['All Ages']
  }
]

const AVATARS = ['bear', 'rabbit', 'fox', 'owl', 'dolphin', 'lion', 'panda', 'penguin']
const AVATAR_EMOJIS: Record<string, string> = {
  bear: '🐻',
  rabbit: '🐰',
  fox: '🦊',
  owl: '🦉',
  dolphin: '🐬',
  lion: '🦁',
  panda: '🐼',
  penguin: '🐧'
}

const STORAGE_KEYS = {
  KIDS: 'flowsphere-kids-profiles',
  SESSIONS: 'flowsphere-learning-sessions',
  MESSAGES: 'flowsphere-tutor-messages',
  ASSIGNMENTS: 'flowsphere-kids-assignments',
  MONITOR_SETTINGS: 'flowsphere-monitor-settings'
}

const DEFAULT_MONITOR_SETTINGS: MonitorSettings = {
  analysisInterval: 15,
  distractionThreshold: 120,
  enableAlerts: true,
  enableSound: true,
  parentNotifications: true
}

// ==========================================
// Main Component
// ==========================================

interface KidsLearningCenterProps {
  familyId?: string
}

type TabType = 'dashboard' | 'tutor' | 'focus' | 'monitor' | 'profiles'

export function KidsLearningCenter({ familyId }: KidsLearningCenterProps) {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  // ==========================================
  // State
  // ==========================================
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard')
  const [kids, setKids] = useKV<KidProfile[]>(STORAGE_KEYS.KIDS, [])
  const [sessions, setSessions] = useKV<LearningSession[]>(STORAGE_KEYS.SESSIONS, [])
  const [messages, setMessages] = useKV<Message[]>(STORAGE_KEYS.MESSAGES, [])
  const [assignments, setAssignments] = useKV<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, [])
  const [monitorSettings, setMonitorSettings] = useKV<MonitorSettings>(STORAGE_KEYS.MONITOR_SETTINGS, DEFAULT_MONITOR_SETTINGS)

  const [selectedKid, setSelectedKid] = useState<KidProfile | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [showKidSetup, setShowKidSetup] = useState(false)
  const [editingKid, setEditingKid] = useState<KidProfile | null>(null)

  // Focus Tracker
  const [focusTracker] = useState(() => getFocusTracker())
  const [currentFocusSession, setCurrentFocusSession] = useState<FocusSession | null>(null)
  const [focusStats, setFocusStats] = useState<FocusStats | null>(null)

  // Study Monitor
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<'studying' | 'distracted' | 'away' | 'break'>('studying')
  const [monitorFocusScore, setMonitorFocusScore] = useState(100)
  const [sessionDuration, setSessionDuration] = useState(0)

  // Tutor AI
  const [tutorMessages, setTutorMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isAILoading, setIsAILoading] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ==========================================
  // Effects
  // ==========================================

  // Initialize with first kid if available
  useEffect(() => {
    if (kids && kids.length > 0 && !selectedKid) {
      setSelectedKid(kids[0])
    }
  }, [kids, selectedKid])

  // Subscribe to focus updates
  useEffect(() => {
    const unsubscribe = focusTracker.subscribe((session) => {
      setCurrentFocusSession(session)
    })

    setCurrentFocusSession(focusTracker.getCurrentSession())
    setFocusStats(focusTracker.getStats())

    return () => unsubscribe()
  }, [focusTracker])

  // ==========================================
  // Handlers
  // ==========================================

  // Kid Profile Management
  const handleCreateKid = (kidData: Omit<KidProfile, 'id' | 'xp' | 'level' | 'streak' | 'completedLessons' | 'completedTests' | 'totalStudyTime'>) => {
    const newKid: KidProfile = {
      ...kidData,
      id: `kid-${Date.now()}`,
      xp: 0,
      level: 1,
      streak: 0,
      completedLessons: 0,
      completedTests: 0,
      totalStudyTime: 0
    }
    setKids(prev => [...(prev || []), newKid])
    setSelectedKid(newKid)
    setShowKidSetup(false)
    toast.success(`Welcome ${newKid.name}! Let's start learning!`)
  }

  const handleDeleteKid = (kidId: string) => {
    setKids(prev => (prev || []).filter(k => k.id !== kidId))
    if (selectedKid?.id === kidId) {
      setSelectedKid(kids?.[0] || null)
    }
    toast.success('Profile removed')
  }

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject)
    setCurrentTab('tutor')
    setTutorMessages([])

    // Start a learning session
    startLearningSession(subject.id, 'lesson')

    // Generate welcome message
    generateWelcomeMessage(subject)
  }

  // Learning Session Management
  const startLearningSession = (subjectId: string, type: 'lesson' | 'test' | 'practice') => {
    if (!selectedKid) return

    const session: LearningSession = {
      id: `session-${Date.now()}`,
      kidId: selectedKid.id,
      subject: subjectId,
      type,
      startTime: Date.now(),
      duration: 0,
      focusScore: 100,
      xpEarned: 0,
      completed: false
    }

    setSessions(prev => [...(prev || []), session])

    // Also start focus tracking
    focusTracker.startSession(`${type}: ${subjectId}`)
    setFocusStats(focusTracker.getStats())
  }

  const endLearningSession = (xpEarned: number = 10) => {
    if (!selectedKid) return

    const focusSession = focusTracker.endSession()
    const focusScore = focusSession?.focusScore || 80

    // Update the current learning session
    setSessions(prev => {
      const updated = [...(prev || [])]
      const lastSession = updated.find(s => s.kidId === selectedKid.id && !s.completed)
      if (lastSession) {
        lastSession.endTime = Date.now()
        lastSession.duration = (Date.now() - lastSession.startTime) / 1000 / 60
        lastSession.focusScore = focusScore
        lastSession.xpEarned = xpEarned
        lastSession.completed = true
      }
      return updated
    })

    // Update kid's XP and stats
    setKids(prev => (prev || []).map(k => {
      if (k.id === selectedKid.id) {
        const newXP = k.xp + xpEarned
        const newLevel = Math.floor(newXP / 100) + 1
        return {
          ...k,
          xp: newXP,
          level: newLevel,
          completedLessons: k.completedLessons + 1,
          totalStudyTime: k.totalStudyTime + Math.floor((Date.now() - ((sessions || []).find(s => !s.completed)?.startTime ?? Date.now())) / 1000 / 60)
        }
      }
      return k
    }))

    setFocusStats(focusTracker.getStats())
    setCurrentFocusSession(null)

    toast.success(`Great job! You earned ${xpEarned} XP!`, {
      description: `Focus score: ${focusScore}%`
    })
  }

  // AI Tutor
  const generateWelcomeMessage = async (subject: Subject) => {
    if (!selectedKid) return

    // Check usage limits before making AI call
    const limitCheck = checkUsageLimits()
    if (!limitCheck.canProceed) {
      toast.error('Daily AI limit reached', {
        description: 'Add your own API key in Settings to continue learning!'
      })
      const fallback: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Hi ${selectedKid.name}! I'm your Tutor AI! Ready to learn some ${subject.name}? What would you like to explore today?`,
        timestamp: Date.now()
      }
      setTutorMessages([fallback])
      return
    }

    setIsAILoading(true)
    try {
      const systemPrompt = `You are FlowSphere Tutor AI, a friendly AI tutor for children. You're helping ${selectedKid.name}, a ${selectedKid.age}-year-old in ${selectedKid.grade} grade, learn ${subject.name}.

Rules:
- Be encouraging, patient, and fun
- Use age-appropriate language
- Include examples and analogies kids can relate to
- Ask questions to check understanding
- Celebrate correct answers with enthusiasm
- Gently correct mistakes and explain why
- Keep responses concise but engaging
- Use emojis sparingly to keep it fun`

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Start a ${subject.name} lesson. Introduce yourself briefly and ask what topic the student wants to learn today. Be friendly and engaging!`
        }
      ]

      const response = await smartCompletion(messages, { complexity: 'simple' })

      if (response && response.content) {
        const assistantMessage: Message = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: response.content,
          timestamp: Date.now()
        }
        setTutorMessages([assistantMessage])
      }
    } catch (error: any) {
      logger.error('Tutor AI error', error, 'KidsLearningCenter')
      const fallback: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Hi ${selectedKid.name}! I'm your Tutor AI! Ready to learn some ${subject.name}? What would you like to explore today?`,
        timestamp: Date.now()
      }
      setTutorMessages([fallback])
      if (error.message?.includes('limit')) {
        toast.error('AI limit reached', { description: 'Add your own API key in Settings.' })
      }
    } finally {
      setIsAILoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedKid || !selectedSubject) return

    // Check usage limits before making AI call
    const limitCheck = checkUsageLimits()
    if (!limitCheck.canProceed) {
      toast.error('Daily AI limit reached', {
        description: 'Add your own API key in Settings to continue learning!'
      })
      return
    }

    // Show warning if approaching limit
    if (limitCheck.warning && limitCheck.canProceed) {
      toast.warning(limitCheck.warning)
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now()
    }

    setTutorMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsAILoading(true)

    try {
      const systemPrompt = `You are FlowSphere Tutor AI, a friendly AI tutor for children. You're helping ${selectedKid.name}, a ${selectedKid.age}-year-old in ${selectedKid.grade} grade, learn ${selectedSubject.name}.

Rules:
- Be encouraging, patient, and fun
- Use age-appropriate language
- Include examples and analogies kids can relate to
- Ask questions to check understanding
- Celebrate correct answers with enthusiasm
- Gently correct mistakes and explain why
- Keep responses concise but engaging`

      const conversationHistory: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...tutorMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
        { role: 'user', content: inputMessage.trim() }
      ]

      const response = await smartCompletion(conversationHistory, {
        complexity: conversationHistory.length > 10 ? 'medium' : 'simple'
      })

      if (response && response.content) {
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: response.content,
          timestamp: Date.now()
        }
        setTutorMessages(prev => [...prev, assistantMessage])
      }
    } catch (error: any) {
      logger.error('Tutor message error', error, 'KidsLearningCenter')
      if (error.message?.includes('limit')) {
        toast.error('AI limit reached', { description: 'Add your own API key in Settings.' })
      } else {
        toast.error('Could not get response. Please try again.')
      }
    } finally {
      setIsAILoading(false)
    }
  }

  // Study Monitor
  const startMonitoring = async () => {
    if (!selectedKid) {
      toast.error('Please select a child profile first')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setCameraActive(true)
      setIsMonitoring(true)
      setCurrentStatus('studying')
      setMonitorFocusScore(100)

      // Start focus tracking
      focusTracker.startSession('AI Study Monitor')

      toast.success('Study monitoring started! Stay focused!')
    } catch (error) {
      toast.error('Could not access camera. Please grant permission.')
    }
  }

  const stopMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setCameraActive(false)
    setIsMonitoring(false)

    // End focus session
    const session = focusTracker.endSession()
    if (session) {
      toast.success(`Session complete! Focus score: ${session.focusScore}%`)
    }

    setFocusStats(focusTracker.getStats())
  }

  // Calculate stats
  const getKidStats = (kid: KidProfile) => {
    const kidSessions = (sessions || []).filter(s => s.kidId === kid.id)
    const totalMinutes = kidSessions.reduce((sum, s) => sum + s.duration, 0)
    const avgFocus = kidSessions.length > 0
      ? kidSessions.reduce((sum, s) => sum + s.focusScore, 0) / kidSessions.length
      : 0

    return {
      totalSessions: kidSessions.length,
      totalMinutes: Math.round(totalMinutes),
      avgFocus: Math.round(avgFocus),
      todaySessions: kidSessions.filter(s => {
        const today = new Date()
        const sessionDate = new Date(s.startTime)
        return sessionDate.toDateString() === today.toDateString()
      }).length
    }
  }

  // ==========================================
  // Render Helpers
  // ==========================================

  const renderDashboard = () => {
    if (!selectedKid) {
      return (
        <Card className="p-8 text-center">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">No Kid Profile Selected</h2>
          <p className="text-muted-foreground mb-4">
            Create a profile to start learning!
          </p>
          <Button onClick={() => setShowKidSetup(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Profile
          </Button>
        </Card>
      )
    }

    const stats = getKidStats(selectedKid)
    const xpToNextLevel = 100 - (selectedKid.xp % 100)

    return (
      <div className="space-y-6">
        {/* Profile Card */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-3xl">
                {AVATAR_EMOJIS[selectedKid.avatar] || ''}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">{selectedKid.name}</h2>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-500 flex items-center gap-1">
                    <Star className="w-3 h-3" weight="fill" />
                    Level {selectedKid.level}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedKid.grade} Grade | {selectedKid.age} years old</p>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>{selectedKid.xp % 100} XP</span>
                    <span>{xpToNextLevel} XP to Level {selectedKid.level + 1}</span>
                  </div>
                  <Progress value={selectedKid.xp % 100} className="h-2" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-orange-500">
                    <Fire className="w-5 h-5" weight="fill" />
                    <span className="text-xl font-bold">{selectedKid.streak}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">day streak</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4 text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{selectedKid.completedLessons}</p>
              <p className="text-xs text-muted-foreground">Lessons Done</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{stats.totalMinutes}</p>
              <p className="text-xs text-muted-foreground">Minutes Studied</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <Eye className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{stats.avgFocus}%</p>
              <p className="text-xs text-muted-foreground">Avg Focus</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{selectedKid.xp}</p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </CardContent>
          </Card>
        </div>

        {/* Subject Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Start Learning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SUBJECTS.map((subject) => {
                const Icon = subject.icon
                return (
                  <button
                    key={subject.id}
                    onClick={() => handleSelectSubject(subject)}
                    className={cn(
                      "p-4 rounded-xl text-left transition-all hover:scale-105",
                      "bg-gradient-to-br",
                      subject.color,
                      "text-white shadow-lg"
                    )}
                  >
                    <Icon className="w-8 h-8 mb-2" weight="fill" />
                    <h3 className="font-bold">{subject.name}</h3>
                    <p className="text-xs opacity-80 mt-1">{subject.description}</p>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-green-500/50 transition-colors"
            onClick={() => setCurrentTab('focus')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">Focus Session</h3>
                <p className="text-sm text-muted-foreground">Track your concentration</p>
              </div>
              <CaretRight className="w-5 h-5 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-purple-500/50 transition-colors"
            onClick={() => setCurrentTab('monitor')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Camera className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold">Study Monitor</h3>
                <p className="text-sm text-muted-foreground">AI-powered focus detection</p>
              </div>
              <CaretRight className="w-5 h-5 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const renderTutor = () => {
    if (!selectedKid || !selectedSubject) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Select a subject from the dashboard to start learning</p>
          <Button className="mt-4" onClick={() => setCurrentTab('dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      )
    }

    const SubjectIcon = selectedSubject.icon

    return (
      <div className="space-y-4">
        {/* AI Usage Warning */}
        <AIUsageWarning />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => {
              setSelectedSubject(null)
              setCurrentTab('dashboard')
              endLearningSession(tutorMessages.length * 5)
            }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-br", selectedSubject.color)}>
              <SubjectIcon className="w-5 h-5" weight="fill" />
            </div>
            <div>
              <h2 className="font-bold">{selectedSubject.name}</h2>
              <p className="text-xs text-muted-foreground">Learning with {selectedKid.name}</p>
            </div>
          </div>

          {currentFocusSession && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Focus Active
            </div>
          )}
        </div>

        {/* Chat Area */}
        <Card className="h-[50vh] flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {tutorMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' && "flex-row-reverse"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    msg.role === 'user'
                      ? "bg-blue-500 text-white"
                      : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                  )}>
                    {msg.role === 'user' ? (
                      <span className="text-sm">{AVATAR_EMOJIS[selectedKid.avatar]}</span>
                    ) : (
                      <Robot className="w-4 h-4" />
                    )}
                  </div>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    msg.role === 'user'
                      ? "bg-blue-500 text-white"
                      : "bg-muted"
                  )}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isAILoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Robot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Ask your tutor anything..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={isAILoading}
              />
              <Button onClick={handleSendMessage} disabled={isAILoading || !inputMessage.trim()}>
                <PaperPlaneTilt className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const renderFocusTracker = () => {
    const isActive = focusTracker.isSessionActive()

    return (
      <div className="space-y-6">
        {/* Focus Session Card */}
        <Card className={cn(
          "bg-gradient-to-br border-2 transition-all",
          isActive ? "from-green-500/10 to-green-600/10 border-green-500/50" : "from-gray-500/10 to-slate-500/10 border-muted"
        )}>
          <CardContent className="p-6 text-center">
            <div className={cn(
              "w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center",
              "bg-gradient-to-br",
              isActive ? "from-green-500 to-green-600" : "from-gray-500 to-slate-500"
            )}>
              {isActive ? (
                <Eye className="w-16 h-16 text-white animate-pulse" weight="fill" />
              ) : (
                <Target className="w-16 h-16 text-white" />
              )}
            </div>

            {isActive && currentFocusSession && (
              <div className="mb-4">
                <p className="text-3xl font-mono font-bold">
                  {formatDuration(Date.now() - currentFocusSession.startTime)}
                </p>
                <p className="text-sm text-muted-foreground">{currentFocusSession.label || 'Focus Session'}</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              {!isActive ? (
                <Button
                  size="lg"
                  onClick={() => {
                    focusTracker.startSession('Focus Session')
                    setFocusStats(focusTracker.getStats())
                    toast.success('Focus session started!')
                  }}
                  className="gap-2"
                >
                  <Play className="w-5 h-5" weight="fill" />
                  Start Focus Session
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => {
                    focusTracker.startBreak()
                    toast.info('Break time! Take a moment to rest.')
                  }}>
                    <Coffee className="w-5 h-5 mr-2" />
                    Take Break
                  </Button>
                  <Button variant="destructive" onClick={() => {
                    const session = focusTracker.endSession()
                    if (session) {
                      toast.success(`Session complete! Focus: ${session.focusScore}%`)
                    }
                    setFocusStats(focusTracker.getStats())
                    setCurrentFocusSession(null)
                  }}>
                    <Stop className="w-5 h-5 mr-2" weight="fill" />
                    End Session
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {focusStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Lightning className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                <p className="text-xl font-bold">{focusStats.totalSessions}</p>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-xl font-bold">{formatDuration(focusStats.totalFocusTime)}</p>
                <p className="text-xs text-muted-foreground">Focus Time</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <ChartBar className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <p className="text-xl font-bold">{focusStats.averageFocusScore}%</p>
                <p className="text-xs text-muted-foreground">Avg Focus</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Fire className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                <p className="text-xl font-bold">{focusStats.currentStreak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  const renderStudyMonitor = () => {
    return (
      <div className="space-y-6">
        {/* Privacy Notice */}
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-500">Privacy-First Monitoring</p>
                <p className="text-muted-foreground mt-1">
                  Video is analyzed in real-time and never stored. Only focus scores are saved to track progress.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monitor Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              {/* Camera Preview */}
              <div className={cn(
                "relative w-full max-w-md aspect-video rounded-xl overflow-hidden mb-6",
                "bg-gray-900 flex items-center justify-center",
                cameraActive && "ring-2",
                currentStatus === 'studying' && "ring-green-500",
                currentStatus === 'distracted' && "ring-yellow-500",
                currentStatus === 'away' && "ring-red-500"
              )}>
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <Camera className="w-16 h-16 mx-auto mb-2" />
                    <p>Camera preview will appear here</p>
                  </div>
                )}

                {isMonitoring && (
                  <div className={cn(
                    "absolute top-4 left-4 px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium",
                    currentStatus === 'studying' && "bg-green-500 text-white",
                    currentStatus === 'distracted' && "bg-yellow-500 text-black",
                    currentStatus === 'away' && "bg-red-500 text-white"
                  )}>
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    {currentStatus === 'studying' && 'Studying'}
                    {currentStatus === 'distracted' && 'Distracted'}
                    {currentStatus === 'away' && 'Away'}
                  </div>
                )}
              </div>

              {/* Focus Score */}
              {isMonitoring && (
                <div className="w-full max-w-md mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Focus Score</span>
                    <span className={cn(
                      "text-lg font-bold",
                      monitorFocusScore >= 80 && "text-green-500",
                      monitorFocusScore >= 50 && monitorFocusScore < 80 && "text-yellow-500",
                      monitorFocusScore < 50 && "text-red-500"
                    )}>
                      {monitorFocusScore}%
                    </span>
                  </div>
                  <Progress
                    value={monitorFocusScore}
                    className={cn(
                      "h-3",
                      monitorFocusScore >= 80 && "[&>div]:bg-green-500",
                      monitorFocusScore >= 50 && monitorFocusScore < 80 && "[&>div]:bg-yellow-500",
                      monitorFocusScore < 50 && "[&>div]:bg-red-500"
                    )}
                  />
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-4">
                {!isMonitoring ? (
                  <Button size="lg" onClick={startMonitoring} className="gap-2">
                    <Camera className="w-5 h-5" />
                    Start Monitoring
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => {
                      setCurrentStatus('break')
                      toast.info('Break time!')
                    }}>
                      <Coffee className="w-5 h-5 mr-2" />
                      Take Break
                    </Button>
                    <Button variant="destructive" onClick={stopMonitoring}>
                      <Stop className="w-5 h-5 mr-2" weight="fill" />
                      Stop
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" width={640} height={480} />
      </div>
    )
  }

  const renderProfiles = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Kid Profiles</h2>
          <Button onClick={() => setShowKidSetup(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(kids || []).map((kid) => (
            <Card
              key={kid.id}
              className={cn(
                "cursor-pointer transition-all",
                selectedKid?.id === kid.id && "ring-2 ring-blue-500"
              )}
              onClick={() => setSelectedKid(kid)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl">
                    {AVATAR_EMOJIS[kid.avatar] || ''}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{kid.name}</h3>
                    <p className="text-sm text-muted-foreground">{kid.grade} Grade | {kid.age} years</p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-3 h-3" weight="fill" />
                        Level {kid.level}
                      </span>
                      <span className="flex items-center gap-1 text-orange-500">
                        <Fire className="w-3 h-3" weight="fill" />
                        {kid.streak} streak
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteKid(kid.id)
                    }}
                  >
                    <Trash className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!kids || kids.length === 0) && (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No profiles yet. Create one to get started!</p>
          </Card>
        )}
      </div>
    )
  }

  // ==========================================
  // Main Render
  // ==========================================

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: House },
    { id: 'tutor' as const, label: 'Tutor', icon: Brain },
    { id: 'focus' as const, label: 'Focus', icon: Target },
    { id: 'monitor' as const, label: 'Monitor', icon: Camera },
    { id: 'profiles' as const, label: 'Profiles', icon: Users }
  ]

  return (
    <div className={cn("space-y-6", isMobile && "space-y-4")}>
      {/* Header */}
      <Card className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-500/20">
        <CardHeader className={cn(isMobile ? "pb-2" : "pb-4")}>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" weight="fill" />
            </div>
            <div>
              <h1 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>
                Kids Learning Center
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-powered tutoring, focus tracking, and study monitoring
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Tab Navigation */}
      <div className={cn(
        "flex gap-2 p-1 bg-muted rounded-lg overflow-x-auto",
        isMobile && "scrollbar-hide"
      )}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              key={tab.id}
              variant={currentTab === tab.id ? 'default' : 'ghost'}
              size={isMobile ? 'sm' : 'default'}
              onClick={() => setCurrentTab(tab.id)}
              className={cn("flex-shrink-0", isMobile && "px-3")}
            >
              <Icon className={cn("w-4 h-4", !isMobile && "mr-2")} />
              {!isMobile && tab.label}
            </Button>
          )
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {currentTab === 'dashboard' && renderDashboard()}
          {currentTab === 'tutor' && renderTutor()}
          {currentTab === 'focus' && renderFocusTracker()}
          {currentTab === 'monitor' && renderStudyMonitor()}
          {currentTab === 'profiles' && renderProfiles()}
        </motion.div>
      </AnimatePresence>

      {/* Kid Setup Modal */}
      <AnimatePresence>
        {showKidSetup && (
          <KidSetupModal
            onClose={() => setShowKidSetup(false)}
            onSave={handleCreateKid}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ==========================================
// Kid Setup Modal Component
// ==========================================

interface KidSetupModalProps {
  onClose: () => void
  onSave: (kid: Omit<KidProfile, 'id' | 'xp' | 'level' | 'streak' | 'completedLessons' | 'completedTests' | 'totalStudyTime'>) => void
}

function KidSetupModal({ onClose, onSave }: KidSetupModalProps) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [grade, setGrade] = useState('')
  const [avatar, setAvatar] = useState('bear')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [dailyGoal, setDailyGoal] = useState(30)

  const handleSubmit = () => {
    if (!name || !age || !grade) {
      toast.error('Please fill in all required fields')
      return
    }

    onSave({
      name,
      age: parseInt(age),
      grade,
      avatar,
      selectedSubjects,
      dailyGoal,
      focusAlertThreshold: 120
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Create Kid Profile</span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar Selection */}
            <div>
              <Label>Choose Avatar</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    onClick={() => setAvatar(av)}
                    className={cn(
                      "w-12 h-12 rounded-full text-2xl transition-all",
                      avatar === av
                        ? "bg-gradient-to-br from-blue-500 to-purple-500 ring-2 ring-blue-500 ring-offset-2"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {AVATAR_EMOJIS[av]}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <Label>Name *</Label>
              <Input
                placeholder="Enter name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Age */}
            <div>
              <Label>Age *</Label>
              <Input
                type="number"
                placeholder="Enter age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min={3}
                max={18}
              />
            </div>

            {/* Grade */}
            <div>
              <Label>Grade *</Label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Select grade</option>
                {['Pre-K', 'Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Daily Goal */}
            <div>
              <Label>Daily Study Goal (minutes)</Label>
              <Input
                type="number"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(parseInt(e.target.value) || 30)}
                min={10}
                max={180}
              />
            </div>

            {/* Subject Selection */}
            <div>
              <Label>Favorite Subjects (optional)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SUBJECTS.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => setSelectedSubjects(prev =>
                      prev.includes(subject.id)
                        ? prev.filter(s => s !== subject.id)
                        : [...prev, subject.id]
                    )}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm transition-all",
                      selectedSubjects.includes(subject.id)
                        ? "bg-blue-500 text-white"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                Create Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
