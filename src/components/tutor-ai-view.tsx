/**
 * FlowSphere TutorBot AI
 * Clean, unified learning interface with multi-AI support
 * Prioritizes free providers (Groq, Gemini, Mistral)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useDeviceType } from '@/hooks/use-mobile'
import {
  Brain,
  GraduationCap,
  BookOpen,
  Calculator,
  Globe,
  Atom,
  PaperPlaneTilt,
  Star,
  Fire,
  Sparkle,
  User,
  Robot,
  ArrowLeft,
  Gear,
  Lightning,
  X,
  Plus,
  Trash,
  Clock,
  Target,
  CheckCircle,
  Info,
  CaretDown,
  Image as ImageIcon,
  Microphone,
  Stop
} from '@phosphor-icons/react'
import {
  smartCompletion,
  getAIConfig,
  checkUsageLimits,
  getTodayUsage,
  AI_PROVIDERS,
  getAvailableProviders,
  type AIProvider
} from '@/lib/smart-ai-router'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'

// ==========================================
// Types
// ==========================================

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  provider?: AIProvider
  tokens?: number
}

interface Subject {
  id: string
  name: string
  icon: any
  color: string
  emoji: string
  systemPrompt: string
}

interface LearnerProfile {
  name: string
  grade: string
  xp: number
  streak: number
  lastActive: string
  totalSessions: number
}

interface ChatSession {
  id: string
  subjectId: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

// ==========================================
// Constants
// ==========================================

const SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'Math',
    icon: Calculator,
    color: 'from-blue-500 to-indigo-600',
    emoji: '🧮',
    systemPrompt: 'You are a patient math tutor. Explain concepts step-by-step with examples. Use simple language. If the student struggles, try a different approach. Celebrate correct answers!'
  },
  {
    id: 'science',
    name: 'Science',
    icon: Atom,
    color: 'from-green-500 to-emerald-600',
    emoji: '🔬',
    systemPrompt: 'You are an enthusiastic science tutor. Make complex topics simple and fun. Use real-world examples. Encourage curiosity and questions!'
  },
  {
    id: 'english',
    name: 'English',
    icon: BookOpen,
    color: 'from-purple-500 to-violet-600',
    emoji: '📚',
    systemPrompt: 'You are a helpful English tutor. Focus on reading comprehension, grammar, and writing skills. Be encouraging and provide constructive feedback.'
  },
  {
    id: 'languages',
    name: 'Languages',
    icon: Globe,
    color: 'from-orange-500 to-amber-600',
    emoji: '🌍',
    systemPrompt: 'You are a multilingual language tutor. Help with vocabulary, grammar, and conversation practice. Be patient with pronunciation. Make learning fun!'
  },
  {
    id: 'general',
    name: 'General',
    icon: GraduationCap,
    color: 'from-pink-500 to-rose-600',
    emoji: '💡',
    systemPrompt: 'You are a knowledgeable tutor ready to help with any subject. Adapt your teaching style to the topic. Be helpful, clear, and encouraging.'
  }
]

const STORAGE_KEYS = {
  PROFILE: 'flowsphere-tutor-profile-v2',
  SESSIONS: 'flowsphere-tutor-sessions-v2',
  CURRENT_SESSION: 'flowsphere-tutor-current-session'
}

// ==========================================
// Component
// ==========================================

export function TutorAIView() {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  // State
  const [profile, setProfile] = useKV<LearnerProfile | null>(STORAGE_KEYS.PROFILE, null)
  const [sessions, setSessions] = useKV<ChatSession[]>(STORAGE_KEYS.SESSIONS, [])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)

  const [view, setView] = useState<'home' | 'chat' | 'settings'>('home')
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)

  // Setup state
  const [setupName, setSetupName] = useState('')
  const [setupGrade, setSetupGrade] = useState('')

  // Usage state
  const [usageInfo, setUsageInfo] = useState({ messages: 0, tokens: 0, percentUsed: 0 })

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update usage info
  useEffect(() => {
    const today = getTodayUsage()
    const limits = checkUsageLimits()
    setUsageInfo({
      messages: today.messages,
      tokens: today.tokens,
      percentUsed: Math.round(limits.percentUsed)
    })
  }, [currentSession])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [currentSession?.messages])

  // Update streak on new day
  useEffect(() => {
    if (profile) {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

      if (profile.lastActive !== today) {
        const newStreak = profile.lastActive === yesterday ? profile.streak + 1 : 1
        setProfile({ ...profile, lastActive: today, streak: newStreak })
      }
    }
  }, [profile])

  // ==========================================
  // Handlers
  // ==========================================

  const handleSetup = () => {
    if (!setupName.trim()) {
      toast.error('Please enter your name')
      return
    }

    const newProfile: LearnerProfile = {
      name: setupName.trim(),
      grade: setupGrade.trim() || 'Not specified',
      xp: 0,
      streak: 1,
      lastActive: new Date().toISOString().split('T')[0],
      totalSessions: 0
    }

    setProfile(newProfile)
    toast.success(`Welcome, ${setupName}! Let's start learning!`)
  }

  const startNewChat = (subject: Subject) => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      subjectId: subject.id,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    setCurrentSession(newSession)
    setSelectedSubject(subject)
    setView('chat')
    setShowSubjectPicker(false)

    // Send greeting
    setTimeout(() => sendGreeting(subject, newSession), 100)
  }

  const sendGreeting = async (subject: Subject, session: ChatSession) => {
    if (!profile) return
    setIsLoading(true)

    const systemMessage = `${subject.systemPrompt}

Student Info:
- Name: ${profile.name}
- Grade: ${profile.grade}

Guidelines:
- Keep responses concise (2-3 paragraphs max)
- Use age-appropriate language
- Include follow-up questions
- Award XP for correct answers (+10 XP)
- Use ${subject.emoji} emoji occasionally`

    try {
      const result = await smartCompletion([
        { role: 'system', content: systemMessage },
        { role: 'user', content: `Hi! I want to learn ${subject.name}. Start a lesson for me!` }
      ], { temperature: 0.8 })

      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result.content,
        timestamp: Date.now(),
        provider: result.provider,
        tokens: result.tokens
      }

      const updatedSession = {
        ...session,
        messages: [assistantMsg],
        updatedAt: Date.now()
      }

      setCurrentSession(updatedSession)
      setSessions(prev => [...(prev || []), updatedSession])
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect to AI')
      // Fallback greeting
      const fallbackMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `${subject.emoji} Hi ${profile.name}! Welcome to your ${subject.name} lesson!\n\nI'm having a small connection issue, but let's get started. What would you like to learn today?`,
        timestamp: Date.now()
      }
      setCurrentSession({ ...session, messages: [fallbackMsg] })
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || !selectedSubject || !profile || isLoading) return

    // Check usage limits
    const limits = checkUsageLimits()
    if (!limits.canProceed) {
      toast.error(limits.warning || 'Daily limit reached')
      return
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now()
    }

    const updatedMessages = [...currentSession.messages, userMsg]
    setCurrentSession({ ...currentSession, messages: updatedMessages })
    setInputMessage('')
    setIsLoading(true)

    const systemMessage = `${selectedSubject.systemPrompt}

Student: ${profile.name} (${profile.grade})
Keep responses concise. Use ${selectedSubject.emoji} occasionally.`

    try {
      // Build conversation history (last 10 messages)
      const history = updatedMessages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

      const result = await smartCompletion([
        { role: 'system', content: systemMessage },
        ...history
      ], { temperature: 0.7 })

      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: result.content,
        timestamp: Date.now(),
        provider: result.provider,
        tokens: result.tokens
      }

      const finalMessages = [...updatedMessages, assistantMsg]
      const finalSession = { ...currentSession, messages: finalMessages, updatedAt: Date.now() }

      setCurrentSession(finalSession)
      setSessions(prev => (prev || []).map(s => s.id === finalSession.id ? finalSession : s))

      // Award XP for engagement
      if (result.content.toLowerCase().includes('correct') ||
          result.content.toLowerCase().includes('great') ||
          result.content.includes('+10 XP')) {
        setProfile(prev => prev ? { ...prev, xp: prev.xp + 10 } : prev)
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to get response')
      const errorMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `I'm having trouble connecting right now. Please try again in a moment. 🔄`,
        timestamp: Date.now()
      }
      setCurrentSession({ ...currentSession, messages: [...updatedMessages, errorMsg] })
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const clearChat = () => {
    if (!currentSession) return
    setCurrentSession({ ...currentSession, messages: [] })
    if (selectedSubject) {
      sendGreeting(selectedSubject, { ...currentSession, messages: [] })
    }
  }

  // ==========================================
  // Render: Setup Screen
  // ==========================================

  if (!profile) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6 text-white text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Brain className="w-8 h-8" weight="fill" />
              </div>
              <h1 className="text-2xl font-bold">FlowSphere TutorBot</h1>
              <p className="text-white/80 text-sm mt-1">Your AI learning companion</p>
            </div>

            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">What's your name?</label>
                <Input
                  placeholder="Enter your name"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetup()}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Grade level (optional)</label>
                <Input
                  placeholder="e.g., 5th Grade, High School"
                  value={setupGrade}
                  onChange={(e) => setSetupGrade(e.target.value)}
                />
              </div>

              <Button
                onClick={handleSetup}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600"
                disabled={!setupName.trim()}
              >
                <Sparkle className="w-4 h-4 mr-2" weight="fill" />
                Start Learning
              </Button>

              <div className="text-center text-xs text-muted-foreground pt-2">
                <p>Powered by multiple AI providers</p>
                <p className="text-green-500 font-medium">FREE to use!</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ==========================================
  // Render: Chat View
  // ==========================================

  if (view === 'chat' && currentSession && selectedSubject) {
    const SubjectIcon = selectedSubject.icon

    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView('home')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", selectedSubject.color)}>
              <SubjectIcon className="w-5 h-5 text-white" weight="fill" />
            </div>
            <div>
              <h2 className="font-semibold">{selectedSubject.name} Tutor</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Lightning className="w-3 h-3 text-green-500" />
                  {getAvailableProviders().length} AI{getAvailableProviders().length !== 1 ? 's' : ''} ready
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Fire className="w-3 h-3 mr-1 text-orange-500" />
              {profile.streak} day streak
            </Badge>
            <Button variant="ghost" size="icon" onClick={clearChat}>
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            {currentSession.messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'assistant' && (
                  <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0", selectedSubject.color)}>
                    <Robot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5",
                  msg.role === 'user'
                    ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.provider && (
                    <p className={cn("text-[10px] mt-1 opacity-60", msg.role === 'user' ? 'text-white/60' : 'text-muted-foreground')}>
                      via {AI_PROVIDERS[msg.provider]?.name || msg.provider}
                    </p>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", selectedSubject.color)}>
                  <Robot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="pt-3 border-t mt-auto">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Ask a question..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-gradient-to-r from-violet-500 to-purple-600"
            >
              <PaperPlaneTilt className="w-5 h-5" weight="fill" />
            </Button>
          </div>

          {/* Usage indicator */}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{usageInfo.messages} messages today</span>
            <span className={cn(usageInfo.percentUsed > 80 ? 'text-orange-500' : '')}>
              {usageInfo.percentUsed}% of daily limit
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // Render: Home View
  // ==========================================

  return (
    <div className={cn("space-y-4", isMobile && "space-y-3")}>
      {/* Header Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Brain className="w-6 h-6" weight="fill" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Hi, {profile.name}!</h1>
                <p className="text-white/80 text-sm">Ready to learn?</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Fire className="w-4 h-4" weight="fill" />
                  <span className="font-bold">{profile.streak}</span>
                </div>
                <p className="text-[10px] text-white/60">streak</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4" weight="fill" />
                  <span className="font-bold">{profile.xp}</span>
                </div>
                <p className="text-[10px] text-white/60">XP</p>
              </div>
            </div>
          </div>

          {/* XP Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1 text-white/80">
              <span>Level {Math.floor(profile.xp / 100) + 1}</span>
              <span>{100 - (profile.xp % 100)} XP to next level</span>
            </div>
            <Progress value={profile.xp % 100} className="h-1.5 bg-white/20" />
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <Target className="w-5 h-5 mx-auto mb-1 text-green-500" />
          <p className="text-lg font-bold">{usageInfo.messages}</p>
          <p className="text-[10px] text-muted-foreground">Today</p>
        </Card>
        <Card className="p-3 text-center">
          <Lightning className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
          <p className="text-lg font-bold">{getAvailableProviders().length}</p>
          <p className="text-[10px] text-muted-foreground">AI Ready</p>
        </Card>
        <Card className="p-3 text-center">
          <CheckCircle className="w-5 h-5 mx-auto mb-1 text-blue-500" />
          <p className="text-lg font-bold">{(sessions || []).length}</p>
          <p className="text-[10px] text-muted-foreground">Sessions</p>
        </Card>
      </div>

      {/* Subject Selection */}
      <div>
        <h2 className="font-semibold mb-3">Choose a Subject</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUBJECTS.map((subject) => {
            const Icon = subject.icon
            return (
              <motion.button
                key={subject.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startNewChat(subject)}
                className="p-4 rounded-xl border bg-card hover:border-primary/50 text-left transition-all"
              >
                <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2", subject.color)}>
                  <Icon className="w-5 h-5 text-white" weight="fill" />
                </div>
                <h3 className="font-medium text-sm">{subject.name}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{subject.emoji} Start learning</p>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* AI Providers Info */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-blue-500" />
          <h3 className="font-medium text-sm">Powered by Multiple AI</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(AI_PROVIDERS).slice(0, 4).map((provider) => (
            <Badge
              key={provider.id}
              variant="secondary"
              className={cn("text-[10px]", provider.costPer1kTokens === 0 && "bg-green-500/10 text-green-600")}
            >
              {provider.name.split(' ')[0]}
              {provider.costPer1kTokens === 0 && ' (FREE)'}
            </Badge>
          ))}
          <Badge variant="outline" className="text-[10px]">+{Object.keys(AI_PROVIDERS).length - 4} more</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Auto-routes to cheapest available AI. Add your own keys in Settings for more options.
        </p>
      </Card>

      {/* Recent Sessions */}
      {(sessions || []).length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Recent Sessions</h2>
          <div className="space-y-2">
            {(sessions || []).slice(-3).reverse().map((session) => {
              const subject = SUBJECTS.find(s => s.id === session.subjectId)
              if (!subject) return null
              const Icon = subject.icon
              return (
                <Card
                  key={session.id}
                  className="p-3 cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => {
                    setCurrentSession(session)
                    setSelectedSubject(subject)
                    setView('chat')
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", subject.color)}>
                      <Icon className="w-4 h-4 text-white" weight="fill" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{subject.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {session.messages[session.messages.length - 1]?.content.slice(0, 50)}...
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
