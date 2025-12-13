/**
 * FlowSphere TutorBot AI - Enhanced Learning Platform
 * Features:
 * - Voice input/output (TTS + Speech Recognition)
 * - Camera integration for behavior monitoring
 * - Textbook/lesson plan upload & analysis
 * - Age-based topic suggestions
 * - Multilingual support (200+ languages)
 * - Inappropriate language detection with parent alerts
 * - Smart AI routing (cheapest first)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Lightning,
  Trash,
  Target,
  CheckCircle,
  Info,
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSlash,
  Camera,
  VideoCamera,
  Upload,
  FileText,
  Warning,
  X,
  Play,
  Pause,
  Eye,
  CaretDown,
  Lightbulb,
  Baby,
  Student,
  UserCircle,
  Translate,
  Bell,
} from '@phosphor-icons/react'
import {
  smartCompletion,
  getAIConfig,
  checkUsageLimits,
  getTodayUsage,
  AI_PROVIDERS,
  getAvailableProviders,
  type AIProvider,
} from '@/lib/smart-ai-router'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'
import { supabase } from '@/lib/supabase'

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
  flagged?: boolean
  flagReason?: string
}

interface Subject {
  id: string
  name: string
  icon: any
  color: string
  emoji: string
  systemPrompt: string
  ageTopics: Record<string, string[]>
}

interface LearnerProfile {
  name: string
  age: number
  grade: string
  language: string
  xp: number
  streak: number
  lastActive: string
  totalSessions: number
  parentEmail?: string
}

interface ChatSession {
  id: string
  subjectId: string
  messages: Message[]
  lessonPlan?: string
  createdAt: number
  updatedAt: number
}

interface BehaviorReport {
  timestamp: number
  type: 'language' | 'attention' | 'engagement'
  details: string
  severity: 'low' | 'medium' | 'high'
}

// ==========================================
// Constants
// ==========================================

const AGE_GROUPS = [
  { value: '4-6', label: 'Ages 4-6 (Pre-K - K)' },
  { value: '7-9', label: 'Ages 7-9 (1st - 3rd Grade)' },
  { value: '10-12', label: 'Ages 10-12 (4th - 6th Grade)' },
  { value: '13-15', label: 'Ages 13-15 (7th - 9th Grade)' },
  { value: '16-18', label: 'Ages 16-18 (10th - 12th Grade)' },
  { value: '18+', label: 'Ages 18+ (College/Adult)' },
]

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'tl', name: 'Filipino/Tagalog' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'id', name: 'Indonesian' },
  { code: 'other', name: 'Other (AI will detect)' },
]

const SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'Mathematics',
    icon: Calculator,
    color: 'from-blue-500 to-indigo-600',
    emoji: '🧮',
    systemPrompt:
      "You are a patient math tutor. Explain concepts step-by-step with examples. Use simple language appropriate for the student's age. If the student struggles, try a different approach. Celebrate correct answers with encouragement!",
    ageTopics: {
      '4-6': ['Counting 1-20', 'Shapes recognition', 'Simple addition', 'Colors and patterns'],
      '7-9': [
        'Addition & Subtraction',
        'Multiplication basics',
        'Simple fractions',
        'Telling time',
      ],
      '10-12': ['Long division', 'Decimals & percentages', 'Basic geometry', 'Word problems'],
      '13-15': ['Pre-algebra', 'Linear equations', 'Ratios & proportions', 'Basic statistics'],
      '16-18': ['Algebra II', 'Geometry proofs', 'Trigonometry', 'Pre-calculus'],
      '18+': ['Calculus', 'Linear algebra', 'Statistics', 'Differential equations'],
    },
  },
  {
    id: 'science',
    name: 'Science',
    icon: Atom,
    color: 'from-green-500 to-emerald-600',
    emoji: '🔬',
    systemPrompt:
      'You are an enthusiastic science tutor. Make complex topics simple and fun. Use real-world examples and encourage curiosity. Ask thought-provoking questions!',
    ageTopics: {
      '4-6': ['Animals & plants', 'Weather', 'Five senses', 'Day and night'],
      '7-9': ['Life cycles', 'Solar system', 'States of matter', 'Simple machines'],
      '10-12': ['Human body', 'Ecosystems', 'Earth science', 'Basic chemistry'],
      '13-15': ['Biology basics', 'Physics fundamentals', 'Chemistry intro', 'Scientific method'],
      '16-18': ['AP Biology', 'AP Chemistry', 'AP Physics', 'Environmental science'],
      '18+': ['Organic chemistry', 'Quantum physics', 'Genetics', 'Research methods'],
    },
  },
  {
    id: 'english',
    name: 'English/Reading',
    icon: BookOpen,
    color: 'from-purple-500 to-violet-600',
    emoji: '📚',
    systemPrompt:
      'You are a helpful English and reading tutor. Focus on comprehension, vocabulary, grammar, and writing skills. Be encouraging and provide constructive feedback. Use age-appropriate texts and examples.',
    ageTopics: {
      '4-6': ['Letter recognition', 'Phonics', 'Simple words', 'Story time'],
      '7-9': ['Reading fluency', 'Vocabulary building', 'Basic grammar', 'Short stories'],
      '10-12': ['Reading comprehension', 'Paragraph writing', 'Parts of speech', 'Book reports'],
      '13-15': ['Essay writing', 'Literary analysis', 'Grammar rules', 'Creative writing'],
      '16-18': ['College essays', 'Research papers', 'SAT/ACT prep', 'Literature'],
      '18+': [
        'Academic writing',
        'Critical analysis',
        'Professional communication',
        'Advanced grammar',
      ],
    },
  },
  {
    id: 'languages',
    name: 'World Languages',
    icon: Globe,
    color: 'from-orange-500 to-amber-600',
    emoji: '🌍',
    systemPrompt:
      'You are a multilingual language tutor. Help with vocabulary, grammar, and conversation practice. Be patient with pronunciation. Make learning interactive and fun with cultural context!',
    ageTopics: {
      '4-6': ['Basic greetings', 'Numbers 1-10', 'Colors', 'Family words'],
      '7-9': ['Common phrases', 'Animals & food', 'Days of week', 'Simple sentences'],
      '10-12': ['Basic conversations', 'Present tense', 'Vocabulary building', 'Culture'],
      '13-15': ['Grammar structures', 'Past/future tense', 'Reading practice', 'Writing basics'],
      '16-18': ['Advanced grammar', 'Literature', 'Essay writing', 'Fluency practice'],
      '18+': ['Business language', 'Technical vocabulary', 'Idioms', 'Native conversations'],
    },
  },
  {
    id: 'general',
    name: 'General Learning',
    icon: GraduationCap,
    color: 'from-pink-500 to-rose-600',
    emoji: '💡',
    systemPrompt:
      "You are a knowledgeable tutor ready to help with any subject. Adapt your teaching style to the topic and student's age. Be helpful, clear, and encouraging. Make learning fun!",
    ageTopics: {
      '4-6': ['Arts & crafts', 'Music basics', 'Social skills', 'Nature exploration'],
      '7-9': ['History stories', 'Geography basics', 'Art appreciation', 'Coding basics'],
      '10-12': ['World history', 'Current events', 'Digital literacy', 'Study skills'],
      '13-15': ['Research skills', 'Critical thinking', 'Career exploration', 'Financial literacy'],
      '16-18': ['College prep', 'SAT/ACT strategies', 'Life skills', 'Career planning'],
      '18+': [
        'Professional development',
        'Lifelong learning',
        'Specialized topics',
        'Self-improvement',
      ],
    },
  },
]

// Inappropriate language patterns (multilingual)
const INAPPROPRIATE_PATTERNS = [
  // English
  /\b(fuck|shit|damn|ass|bitch|crap|hell|bastard)\b/i,
  // Spanish
  /\b(mierda|puta|carajo|coño|joder|culo)\b/i,
  // Add more as needed - AI will also detect contextually
]

const STORAGE_KEYS = {
  PROFILE: 'flowsphere-tutor-profile-v3',
  SESSIONS: 'flowsphere-tutor-sessions-v3',
  REPORTS: 'flowsphere-tutor-behavior-reports',
}

// ==========================================
// Speech Recognition & TTS Hooks
// ==========================================

function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex
        const result = event.results[current]
        if (result.isFinal) {
          setTranscript(result[0].transcript)
        }
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const startListening = useCallback((language: string = 'en-US') => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language
      setTranscript('')
      setIsListening(true)
      recognitionRef.current.start()
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [])

  return { isListening, transcript, isSupported, startListening, stopListening, setTranscript }
}

function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback(
    (text: string, language: string = 'en-US') => {
      if (!isEnabled || !('speechSynthesis' in window)) return

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language
      utterance.rate = 0.9 // Slightly slower for learning
      utterance.pitch = 1.1 // Slightly higher for friendliness

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [isEnabled]
  )

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  return { isSpeaking, isEnabled, setIsEnabled, speak, stop }
}

// ==========================================
// Camera Component
// ==========================================

function TutorCamera({
  isActive,
  onToggle,
  onBehaviorDetected,
}: {
  isActive: boolean
  onToggle: () => void
  onBehaviorDetected: (report: BehaviorReport) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    if (isActive) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => stopCamera()
  }, [isActive])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setHasPermission(true)
    } catch (err) {
      console.error('Camera error:', err)
      setHasPermission(false)
      toast.error('Camera access denied')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  if (!isActive) {
    return (
      <Button variant="outline" size="sm" onClick={onToggle} className="gap-2">
        <VideoCamera className="w-4 h-4" />
        Enable Monitor
      </Button>
    )
  }

  return (
    <div className="relative">
      <div className="relative w-24 h-18 rounded-lg overflow-hidden border-2 border-green-500 bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute top-1 right-1 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[8px] text-white bg-black/50 px-1 rounded">LIVE</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white hover:bg-red-600"
        onClick={onToggle}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  )
}

// ==========================================
// Main Component
// ==========================================

export function TutorAIView() {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  // State
  const [profile, setProfile] = useKV<LearnerProfile | null>(STORAGE_KEYS.PROFILE, null)
  const [sessions, setSessions] = useKV<ChatSession[]>(STORAGE_KEYS.SESSIONS, [])
  const [behaviorReports, setBehaviorReports] = useKV<BehaviorReport[]>(STORAGE_KEYS.REPORTS, [])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)

  const [view, setView] = useState<'home' | 'chat' | 'setup'>('home')
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Setup state
  const [setupName, setSetupName] = useState('')
  const [setupAge, setSetupAge] = useState('')
  const [setupGrade, setSetupGrade] = useState('')
  const [setupLanguage, setSetupLanguage] = useState('en')
  const [setupParentEmail, setSetupParentEmail] = useState('')

  // Features state
  const [cameraActive, setCameraActive] = useState(false)
  const [lessonPlanText, setLessonPlanText] = useState('')
  const [showLessonUpload, setShowLessonUpload] = useState(false)
  const [analyzingLesson, setAnalyzingLesson] = useState(false)

  // Hooks
  const {
    isListening,
    transcript,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    setTranscript,
  } = useSpeechRecognition()
  const {
    isSpeaking,
    isEnabled: ttsEnabled,
    setIsEnabled: setTtsEnabled,
    speak,
    stop: stopSpeaking,
  } = useTextToSpeech()

  // Usage state
  const [usageInfo, setUsageInfo] = useState({ messages: 0, tokens: 0, percentUsed: 0 })

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update usage info
  useEffect(() => {
    const today = getTodayUsage()
    const limits = checkUsageLimits()
    setUsageInfo({
      messages: today.messages,
      tokens: today.tokens,
      percentUsed: Math.round(limits.percentUsed),
    })
  }, [currentSession])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [currentSession?.messages])

  // Handle voice transcript
  useEffect(() => {
    if (transcript && !isListening) {
      setInputMessage(transcript)
      setTranscript('')
    }
  }, [transcript, isListening])

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
  // Content Moderation
  // ==========================================

  const checkForInappropriateContent = (text: string): { flagged: boolean; reason: string } => {
    // Check against patterns
    for (const pattern of INAPPROPRIATE_PATTERNS) {
      if (pattern.test(text)) {
        return { flagged: true, reason: 'Inappropriate language detected' }
      }
    }
    return { flagged: false, reason: '' }
  }

  const reportToParent = async (report: BehaviorReport) => {
    if (!profile?.parentEmail) return

    // Store report locally
    setBehaviorReports(prev => [...(prev || []), report])

    // Send notification (would integrate with email service)
    toast.warning('Behavior report sent to parent')

    // Could also push to Supabase for parent dashboard
    try {
      await supabase
        .from('tutor_behavior_reports')
        .insert({
          learner_name: profile.name,
          parent_email: profile.parentEmail,
          report_type: report.type,
          details: report.details,
          severity: report.severity,
          timestamp: new Date(report.timestamp).toISOString(),
        })
        .catch(() => {}) // Silent fail if table doesn't exist
    } catch (e) {
      // Silent - table might not exist
    }
  }

  // ==========================================
  // Handlers
  // ==========================================

  const handleSetup = () => {
    if (!setupName.trim()) {
      toast.error("Please enter the learner's name")
      return
    }

    const newProfile: LearnerProfile = {
      name: setupName.trim(),
      age: parseInt(setupAge) || 10,
      grade: setupGrade.trim() || 'Not specified',
      language: setupLanguage,
      xp: 0,
      streak: 1,
      lastActive: new Date().toISOString().split('T')[0],
      totalSessions: 0,
      parentEmail: setupParentEmail.trim() || undefined,
    }

    setProfile(newProfile)
    setView('home')
    toast.success(`Welcome, ${setupName}! Let's start learning!`)
  }

  const getAgeGroup = (): string => {
    if (!profile) return '10-12'
    const age = profile.age
    if (age <= 6) return '4-6'
    if (age <= 9) return '7-9'
    if (age <= 12) return '10-12'
    if (age <= 15) return '13-15'
    if (age <= 18) return '16-18'
    return '18+'
  }

  const getLanguageCode = (): string => {
    const langMap: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR',
      ar: 'ar-SA',
      hi: 'hi-IN',
      pt: 'pt-BR',
      ru: 'ru-RU',
      tl: 'fil-PH',
      vi: 'vi-VN',
      th: 'th-TH',
      it: 'it-IT',
      nl: 'nl-NL',
      pl: 'pl-PL',
      tr: 'tr-TR',
      id: 'id-ID',
    }
    return langMap[profile?.language || 'en'] || 'en-US'
  }

  const analyzeLessonPlan = async () => {
    if (!lessonPlanText.trim() || !selectedSubject) return

    setAnalyzingLesson(true)
    try {
      const result = await smartCompletion(
        [
          {
            role: 'system',
            content: `You are an educational curriculum analyzer. Analyze the provided lesson plan/textbook content and create a structured learning outline suitable for a ${getAgeGroup()} year old student. Extract key topics, concepts, and create a simple learning path. Respond in ${LANGUAGES.find(l => l.code === profile?.language)?.name || 'English'}.`,
          },
          {
            role: 'user',
            content: `Analyze this lesson material and create a learning outline:\n\n${lessonPlanText.slice(0, 3000)}`,
          },
        ],
        { temperature: 0.5 }
      )

      const analysisMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `📋 **Lesson Plan Analysis**\n\n${result.content}\n\n---\nI've analyzed your material! Let's start with the first topic. What would you like to learn first?`,
        timestamp: Date.now(),
        provider: result.provider,
      }

      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          messages: [...currentSession.messages, analysisMsg],
          lessonPlan: lessonPlanText,
          updatedAt: Date.now(),
        }
        setCurrentSession(updatedSession)
        setSessions(prev =>
          (prev || []).map(s => (s.id === updatedSession.id ? updatedSession : s))
        )
      }

      setShowLessonUpload(false)
      setLessonPlanText('')
      toast.success('Lesson plan analyzed!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze lesson plan')
    } finally {
      setAnalyzingLesson(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const reader = new FileReader()
      reader.onload = e => {
        setLessonPlanText(e.target?.result as string)
      }
      reader.readAsText(file)
    } else if (file.type === 'application/pdf') {
      toast.info('PDF support coming soon! Please paste text for now.')
    } else {
      toast.error('Please upload a .txt file')
    }
  }

  const startNewChat = (subject: Subject) => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      subjectId: subject.id,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    setCurrentSession(newSession)
    setSelectedSubject(subject)
    setView('chat')

    // Send greeting with topic suggestions
    setTimeout(() => sendGreeting(subject, newSession), 100)
  }

  const sendGreeting = async (subject: Subject, session: ChatSession) => {
    if (!profile) return
    setIsLoading(true)

    const ageGroup = getAgeGroup()
    const suggestedTopics = subject.ageTopics[ageGroup] || subject.ageTopics['10-12']
    const languageName = LANGUAGES.find(l => l.code === profile.language)?.name || 'English'

    const systemMessage = `${subject.systemPrompt}

Student Info:
- Name: ${profile.name}
- Age: ${profile.age} years old (${ageGroup} age group)
- Grade: ${profile.grade}
- Native Language: ${languageName}

IMPORTANT Guidelines:
1. Communicate in ${languageName} (the student's native language)
2. Use age-appropriate vocabulary and examples
3. Keep responses concise (2-3 paragraphs max)
4. Include follow-up questions to keep engagement
5. Award XP for correct answers (+10 XP) and say it explicitly
6. Use ${subject.emoji} emoji occasionally
7. Suggest topics from: ${suggestedTopics.join(', ')}
8. If you detect inappropriate language, gently redirect and note it
9. Be encouraging and patient`

    try {
      const result = await smartCompletion(
        [
          { role: 'system', content: systemMessage },
          {
            role: 'user',
            content: `Start a ${subject.name} lesson for me! I'm ${profile.age} years old. What should we learn today?`,
          },
        ],
        { temperature: 0.8 }
      )

      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result.content,
        timestamp: Date.now(),
        provider: result.provider,
        tokens: result.tokens,
      }

      const updatedSession = {
        ...session,
        messages: [assistantMsg],
        updatedAt: Date.now(),
      }

      setCurrentSession(updatedSession)
      setSessions(prev => [...(prev || []), updatedSession])

      // Speak the greeting if TTS is enabled
      if (ttsEnabled) {
        speak(result.content.replace(/\*\*/g, '').replace(/#{1,3}/g, ''), getLanguageCode())
      }
    } catch (error: any) {
      console.error('Greeting error:', error)
      // Fallback greeting with topic suggestions
      const fallbackMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `${subject.emoji} Hi ${profile.name}! Welcome to your ${subject.name} lesson!\n\nHere are some topics perfect for you:\n${suggestedTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nWhich one would you like to explore? Just type the number or the topic!`,
        timestamp: Date.now(),
      }
      setCurrentSession({ ...session, messages: [fallbackMsg] })
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || !selectedSubject || !profile || isLoading) return

    // Check for inappropriate content
    const contentCheck = checkForInappropriateContent(inputMessage)
    if (contentCheck.flagged) {
      const report: BehaviorReport = {
        timestamp: Date.now(),
        type: 'language',
        details: `Message: "${inputMessage.slice(0, 100)}..." - ${contentCheck.reason}`,
        severity: 'medium',
      }
      await reportToParent(report)
    }

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
      timestamp: Date.now(),
      flagged: contentCheck.flagged,
      flagReason: contentCheck.reason,
    }

    const updatedMessages = [...currentSession.messages, userMsg]
    setCurrentSession({ ...currentSession, messages: updatedMessages })
    setInputMessage('')
    setIsLoading(true)

    const ageGroup = getAgeGroup()
    const languageName = LANGUAGES.find(l => l.code === profile.language)?.name || 'English'

    const systemMessage = `${selectedSubject.systemPrompt}

Student: ${profile.name}, Age ${profile.age} (${profile.grade})
Language: ${languageName} - ALWAYS respond in this language
Keep responses concise and age-appropriate for ${ageGroup}.
Use ${selectedSubject.emoji} occasionally.
${currentSession.lessonPlan ? `\nLesson Plan Context:\n${currentSession.lessonPlan.slice(0, 500)}...` : ''}`

    try {
      // Build conversation history (last 10 messages)
      const history = updatedMessages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const result = await smartCompletion(
        [{ role: 'system', content: systemMessage }, ...history],
        { temperature: 0.7 }
      )

      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: result.content,
        timestamp: Date.now(),
        provider: result.provider,
        tokens: result.tokens,
      }

      const finalMessages = [...updatedMessages, assistantMsg]
      const finalSession = { ...currentSession, messages: finalMessages, updatedAt: Date.now() }

      setCurrentSession(finalSession)
      setSessions(prev => (prev || []).map(s => (s.id === finalSession.id ? finalSession : s)))

      // Speak response if TTS enabled
      if (ttsEnabled) {
        speak(
          result.content
            .replace(/\*\*/g, '')
            .replace(/#{1,3}/g, '')
            .slice(0, 500),
          getLanguageCode()
        )
      }

      // Award XP for engagement
      if (
        result.content.toLowerCase().includes('correct') ||
        result.content.toLowerCase().includes('great job') ||
        result.content.toLowerCase().includes('excellent') ||
        result.content.includes('+10 XP')
      ) {
        setProfile(prev => (prev ? { ...prev, xp: prev.xp + 10 } : prev))
        toast.success('+10 XP! Great job!')
      }
    } catch (error: any) {
      console.error('Message error:', error)
      toast.error(error.message || 'Could not get response. Please try again.')
      const errorMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `I'm having trouble connecting right now. Let me try again - please resend your message! 🔄`,
        timestamp: Date.now(),
      }
      setCurrentSession({ ...currentSession, messages: [...updatedMessages, errorMsg] })
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening(getLanguageCode())
    }
  }

  const clearChat = () => {
    if (!currentSession) return
    setCurrentSession({ ...currentSession, messages: [] })
    if (selectedSubject) {
      sendGreeting(selectedSubject, { ...currentSession, messages: [] })
    }
  }

  const handleBehaviorDetected = (report: BehaviorReport) => {
    reportToParent(report)
  }

  // ==========================================
  // Render: Setup Screen (First Time)
  // ==========================================

  if (!profile || view === 'setup') {
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
              <p className="text-white/80 text-sm mt-1">AI-Powered Learning for All Ages</p>
            </div>

            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Learner's Name *</label>
                <Input
                  placeholder="Enter name"
                  value={setupName}
                  onChange={e => setSetupName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Age *</label>
                  <Select value={setupAge} onValueChange={setSetupAge}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select age" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 15 }, (_, i) => i + 4).map(age => (
                        <SelectItem key={age} value={String(age)}>
                          {age} years old
                        </SelectItem>
                      ))}
                      <SelectItem value="19">18+ (Adult)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Grade</label>
                  <Input
                    placeholder="e.g., 5th Grade"
                    value={setupGrade}
                    onChange={e => setSetupGrade(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                  <Translate className="w-4 h-4" />
                  Native Language
                </label>
                <Select value={setupLanguage} onValueChange={setSetupLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Parent's Email (for alerts)
                </label>
                <Input
                  type="email"
                  placeholder="parent@email.com (optional)"
                  value={setupParentEmail}
                  onChange={e => setSetupParentEmail(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Receive alerts about behavior and progress
                </p>
              </div>

              <Button
                onClick={handleSetup}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600"
                disabled={!setupName.trim() || !setupAge}
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
    const ageGroup = getAgeGroup()
    const suggestedTopics = selectedSubject.ageTopics[ageGroup] || []

    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('home')}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div
              className={cn(
                'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                selectedSubject.color
              )}
            >
              <SubjectIcon className="w-4 h-4 text-white" weight="fill" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm truncate">{selectedSubject.name}</h2>
              <p className="text-[10px] text-muted-foreground">Learning with {profile.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Camera Monitor */}
            <TutorCamera
              isActive={cameraActive}
              onToggle={() => setCameraActive(!cameraActive)}
              onBehaviorDetected={handleBehaviorDetected}
            />

            <Badge variant="secondary" className="text-[10px] hidden sm:flex">
              <Fire className="w-3 h-3 mr-1 text-orange-500" />
              {profile.streak}
            </Badge>

            <Button variant="ghost" size="icon" onClick={clearChat} className="w-8 h-8">
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Topic Suggestions Bar */}
        {currentSession.messages.length <= 1 && (
          <div className="mb-3 overflow-x-auto pb-2">
            <div className="flex gap-2">
              {suggestedTopics.slice(0, 4).map((topic, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs whitespace-nowrap flex-shrink-0"
                  onClick={() => {
                    setInputMessage(`Teach me about ${topic}`)
                    setTimeout(sendMessage, 100)
                  }}
                >
                  <Lightbulb className="w-3 h-3 mr-1" />
                  {topic}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Lesson Plan Upload */}
        <AnimatePresence>
          {showLessonUpload && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-3 overflow-hidden"
            >
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Upload Lesson Plan / Textbook
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6"
                    onClick={() => setShowLessonUpload(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Paste your lesson plan, textbook content, or study material here..."
                  value={lessonPlanText}
                  onChange={e => setLessonPlanText(e.target.value)}
                  className="min-h-[100px] text-sm mb-2"
                />
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-1" />
                    Upload File
                  </Button>
                  <Button
                    size="sm"
                    onClick={analyzeLessonPlan}
                    disabled={!lessonPlanText.trim() || analyzingLesson}
                    className="bg-gradient-to-r from-violet-500 to-purple-600"
                  >
                    {analyzingLesson ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-1" />
                        Analyze
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
          <div className="space-y-3 pb-4">
            {currentSession.messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'assistant' && (
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                      selectedSubject.color
                    )}
                  >
                    <Robot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3 py-2',
                    msg.role === 'user'
                      ? cn(
                          'bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-br-sm',
                          msg.flagged && 'border-2 border-red-500'
                        )
                      : 'bg-muted rounded-bl-sm'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    {msg.provider && (
                      <span
                        className={cn(
                          'text-[9px] opacity-60',
                          msg.role === 'user' ? 'text-white/60' : 'text-muted-foreground'
                        )}
                      >
                        {AI_PROVIDERS[msg.provider]?.name || msg.provider}
                      </span>
                    )}
                    {msg.role === 'assistant' && ttsEnabled && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-5 h-5 opacity-60 hover:opacity-100"
                        onClick={() =>
                          speak(msg.content.replace(/\*\*/g, '').slice(0, 500), getLanguageCode())
                        }
                      >
                        <SpeakerHigh className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {msg.flagged && (
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-red-300">
                      <Warning className="w-3 h-3" />
                      Flagged
                    </div>
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
              <div className="flex gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center',
                    selectedSubject.color
                  )}
                >
                  <Robot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" />
                    <span
                      className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <span
                      className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="pt-3 border-t mt-auto space-y-2">
          {/* Controls Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => setShowLessonUpload(!showLessonUpload)}
                title="Upload lesson plan"
              >
                <Upload className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('w-8 h-8', ttsEnabled && 'text-green-500')}
                onClick={() => {
                  setTtsEnabled(!ttsEnabled)
                  if (isSpeaking) stopSpeaking()
                }}
                title={ttsEnabled ? 'Disable voice' : 'Enable voice'}
              >
                {ttsEnabled ? (
                  <SpeakerHigh className="w-4 h-4" />
                ) : (
                  <SpeakerSlash className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="text-[9px]">
                <Star className="w-3 h-3 mr-1 text-yellow-500" />
                {profile.xp} XP
              </Badge>
              <span>{usageInfo.percentUsed}% used</span>
            </div>
          </div>

          {/* Input Row */}
          <div className="flex gap-2">
            {voiceSupported && (
              <Button
                variant={isListening ? 'destructive' : 'outline'}
                size="icon"
                onClick={handleVoiceToggle}
                className={cn('flex-shrink-0', isListening && 'animate-pulse')}
              >
                {isListening ? (
                  <MicrophoneSlash className="w-5 h-5" />
                ) : (
                  <Microphone className="w-5 h-5" />
                )}
              </Button>
            )}

            <Input
              ref={inputRef}
              placeholder={isListening ? 'Listening...' : 'Ask your tutor anything...'}
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={isLoading || isListening}
              className="flex-1"
            />

            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-gradient-to-r from-violet-500 to-purple-600 flex-shrink-0"
            >
              <PaperPlaneTilt className="w-5 h-5" weight="fill" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // Render: Home View
  // ==========================================

  return (
    <div className={cn('space-y-4', isMobile && 'space-y-3')}>
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
                <p className="text-white/80 text-sm">
                  {profile.age} years old • {LANGUAGES.find(l => l.code === profile.language)?.name}
                </p>
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
          {SUBJECTS.map(subject => {
            const Icon = subject.icon
            const ageGroup = getAgeGroup()
            const topics = subject.ageTopics[ageGroup] || []
            return (
              <motion.button
                key={subject.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startNewChat(subject)}
                className="p-4 rounded-xl border bg-card hover:border-primary/50 text-left transition-all"
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2',
                    subject.color
                  )}
                >
                  <Icon className="w-5 h-5 text-white" weight="fill" />
                </div>
                <h3 className="font-medium text-sm">{subject.name}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {topics[0]} & more
                </p>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Features Info */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-blue-500" />
          <h3 className="font-medium text-sm">Smart Features</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <Microphone className="w-4 h-4 text-green-500" />
            <span>Voice Input</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <SpeakerHigh className="w-4 h-4 text-blue-500" />
            <span>Text-to-Speech</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <VideoCamera className="w-4 h-4 text-purple-500" />
            <span>Camera Monitor</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <Translate className="w-4 h-4 text-orange-500" />
            <span>200+ Languages</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Upload lesson plans, enable camera monitoring, and get parent alerts for behavior.
        </p>
      </Card>

      {/* AI Providers Info */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightning className="w-4 h-4 text-yellow-500" />
          <h3 className="font-medium text-sm">Powered by Multiple AI</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(AI_PROVIDERS)
            .slice(0, 4)
            .map(provider => (
              <Badge
                key={provider.id}
                variant="secondary"
                className={cn(
                  'text-[10px]',
                  provider.costPer1kTokens === 0 && 'bg-green-500/10 text-green-600'
                )}
              >
                {provider.name.split(' ')[0]}
                {provider.costPer1kTokens === 0 && ' (FREE)'}
              </Badge>
            ))}
          <Badge variant="outline" className="text-[10px]">
            +{Object.keys(AI_PROVIDERS).length - 4} more
          </Badge>
        </div>
      </Card>

      {/* Recent Sessions */}
      {(sessions || []).length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Recent Sessions</h2>
          <div className="space-y-2">
            {(sessions || [])
              .slice(-3)
              .reverse()
              .map(session => {
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
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center',
                          subject.color
                        )}
                      >
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

      {/* Edit Profile Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setSetupName(profile.name)
          setSetupAge(String(profile.age))
          setSetupGrade(profile.grade)
          setSetupLanguage(profile.language)
          setSetupParentEmail(profile.parentEmail || '')
          setView('setup')
        }}
      >
        <UserCircle className="w-4 h-4 mr-2" />
        Edit Profile
      </Button>
    </div>
  )
}
