import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
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
  Play
} from '@phosphor-icons/react'
import { chatCompletion, getActiveProvider } from '@/lib/ai-provider-config'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'

interface Subject {
  id: string
  name: string
  icon: any
  color: string
  description: string
  grades: string[]
}

interface LearnerProfile {
  name: string
  age: number
  grade: string
  selectedSubjects: string[]
  xp: number
  level: number
  streak: number
  completedLessons: number
  completedTests: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface Assignment {
  id: string
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

const SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'Mathematics',
    icon: Lightbulb,
    color: 'bg-blue-500',
    description: 'Numbers, algebra, geometry, and problem-solving',
    grades: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
  },
  {
    id: 'science',
    name: 'Science',
    icon: Sparkle,
    color: 'bg-green-500',
    description: 'Biology, physics, chemistry, and earth science',
    grades: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
  },
  {
    id: 'reading',
    name: 'Reading & Writing',
    icon: BookOpen,
    color: 'bg-purple-500',
    description: 'Comprehension, grammar, vocabulary, and writing skills',
    grades: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
  },
  {
    id: 'language',
    name: 'Language Learning',
    icon: Globe,
    color: 'bg-orange-500',
    description: 'Spanish, French, Mandarin, Japanese, and more',
    grades: ['Beginner', 'Elementary', 'Intermediate', 'Advanced']
  },
  {
    id: 'general',
    name: 'General Knowledge',
    icon: GraduationCap,
    color: 'bg-pink-500',
    description: 'History, geography, current events, and trivia',
    grades: ['All Ages']
  }
]

const STORAGE_KEY = 'flowsphere-tutor-profile'
const MESSAGES_KEY = 'flowsphere-tutor-messages'
const ASSIGNMENTS_KEY = 'flowsphere-tutor-assignments'

export function TutorAIView() {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  const [profile, setProfile] = useKV<LearnerProfile | null>(STORAGE_KEY, null)
  const [messages, setMessages] = useKV<Message[]>(MESSAGES_KEY, [])
  const [assignments, setAssignments] = useKV<Assignment[]>(ASSIGNMENTS_KEY, [])

  const [currentView, setCurrentView] = useState<'setup' | 'subjects' | 'chat' | 'assignments' | 'stats'>('setup')
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [setupName, setSetupName] = useState('')
  const [setupAge, setSetupAge] = useState('')
  const [setupGrade, setSetupGrade] = useState('')
  const [setupSubjects, setSetupSubjects] = useState<string[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (profile) {
      setCurrentView('subjects')
    }
  }, [profile])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const calculateLevel = (xp: number): number => {
    return Math.floor(xp / 100) + 1
  }

  const xpToNextLevel = (xp: number): number => {
    const currentLevel = calculateLevel(xp)
    return currentLevel * 100 - xp
  }

  const handleSetupComplete = () => {
    if (!setupName || !setupAge || setupSubjects.length === 0) {
      toast.error('Please fill in all required fields')
      return
    }

    const newProfile: LearnerProfile = {
      name: setupName,
      age: parseInt(setupAge),
      grade: setupGrade,
      selectedSubjects: setupSubjects,
      xp: 0,
      level: 1,
      streak: 0,
      completedLessons: 0,
      completedTests: 0
    }

    setProfile(newProfile)
    setCurrentView('subjects')
    toast.success(`Welcome, ${setupName}! Let's start learning!`)
  }

  const startLesson = (subject: Subject) => {
    setSelectedSubject(subject)
    setMessages([])
    setCurrentView('chat')

    // Send initial greeting
    sendInitialGreeting(subject)
  }

  const sendInitialGreeting = async (subject: Subject) => {
    if (!profile) return

    setIsLoading(true)

    const systemPrompt = `You are FlowSphere Tutor, a friendly and encouraging AI tutor for children.
You are teaching ${subject.name} to ${profile.name}, who is ${profile.age} years old in ${profile.grade} grade.

Guidelines:
- Be warm, patient, and encouraging
- Use age-appropriate language and examples
- Break complex topics into simple steps
- Use emojis sparingly to keep it engaging
- Ask follow-up questions to check understanding
- Celebrate correct answers with encouragement
- Gently guide when answers are wrong
- Keep responses concise (2-3 paragraphs max)
- Include interactive elements like "Can you try..." or "What do you think..."

Start by greeting ${profile.name} warmly and asking what they'd like to learn about ${subject.name} today, or suggest an interesting topic appropriate for their grade level.`

    try {
      const result = await chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Start a ${subject.name} lesson for me!` }
      ])

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.content,
        timestamp: Date.now()
      }

      setMessages([assistantMessage])
    } catch (error) {
      // Provide a fallback greeting when AI is unavailable
      const fallbackMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hi ${profile.name}! 👋 Welcome to your ${subject.name} lesson!\n\nI'm your FlowSphere Tutor. I'm having a small connection issue right now, but let's get started!\n\nWhat would you like to learn about ${subject.name} today? You can ask me any question, or I can suggest some fun topics for your grade level!`,
        timestamp: Date.now()
      }
      setMessages([fallbackMessage])
      toast.error('AI connection issue. You can still try asking questions.')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !profile || !selectedSubject || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now()
    }

    const currentMessages = [...(messages || []), userMessage]
    setMessages(currentMessages)
    setInputMessage('')
    setIsLoading(true)

    const systemPrompt = `You are FlowSphere Tutor, a friendly and encouraging AI tutor for children.
You are teaching ${selectedSubject.name} to ${profile.name}, who is ${profile.age} years old in ${profile.grade} grade.

Guidelines:
- Be warm, patient, and encouraging
- Use age-appropriate language
- Keep responses concise (2-3 paragraphs max)
- If student seems to understand, offer to move to harder topics
- If struggling, simplify and try a different approach
- Award virtual XP for correct answers (say "Great job! +10 XP!")
- Include follow-up questions to keep engagement`

    try {
      const conversationHistory = currentMessages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

      const result = await chatCompletion([
        { role: 'system', content: systemPrompt },
        ...conversationHistory
      ])

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.content,
        timestamp: Date.now()
      }

      setMessages([...currentMessages, assistantMessage])

      // Check for XP awards in response
      if (result.content.includes('+10 XP') || result.content.includes('Great job') || result.content.includes('Excellent')) {
        const updatedProfile = {
          ...profile,
          xp: (profile.xp || 0) + 10,
          level: calculateLevel((profile.xp || 0) + 10)
        }
        setProfile(updatedProfile)
      }
    } catch (error) {
      // Provide a helpful fallback response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm sorry, I'm having trouble connecting right now. 🙁\n\nPlease check your internet connection and try again. In the meantime, you can:\n• Review what we've discussed so far\n• Write down your question to ask later\n• Try the "Generate Assignment" feature\n\nI'll be back to help you soon!`,
        timestamp: Date.now()
      }
      setMessages([...currentMessages, errorMessage])
      toast.error('Connection issue. Please try again in a moment.')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateDailyAssignment = async () => {
    if (!profile || profile.selectedSubjects.length === 0) return

    setIsLoading(true)

    const randomSubject = profile.selectedSubjects[Math.floor(Math.random() * profile.selectedSubjects.length)]
    const subject = SUBJECTS.find(s => s.id === randomSubject)

    if (!subject) {
      setIsLoading(false)
      return
    }

    const systemPrompt = `Generate a daily assignment for a ${profile.age} year old in ${profile.grade} grade studying ${subject.name}.

Return a JSON object with this exact format:
{
  "title": "Assignment title",
  "questions": [
    {
      "question": "Question text",
      "type": "multiple_choice",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A"
    },
    {
      "question": "True or False: Statement",
      "type": "true_false",
      "correctAnswer": "true"
    },
    {
      "question": "Short answer question",
      "type": "short_answer",
      "correctAnswer": "expected answer keyword"
    }
  ]
}

Generate exactly 5 questions: 2 multiple choice, 2 true/false, 1 short answer.
Make them age-appropriate and educational.
Only respond with valid JSON, no other text.`

    try {
      const result = await chatCompletion([
        { role: 'system', content: 'You are an educational content generator. Only respond with valid JSON.' },
        { role: 'user', content: systemPrompt }
      ])

      // Parse the JSON response
      const assignmentData = JSON.parse(result.content)

      const newAssignment: Assignment = {
        id: Date.now().toString(),
        subject: subject.id,
        title: assignmentData.title || `Daily ${subject.name} Assignment`,
        questions: assignmentData.questions || [],
        dueDate: Date.now() + 24 * 60 * 60 * 1000, // Due in 24 hours
        completed: false
      }

      setAssignments([...(assignments || []), newAssignment])
      toast.success('New assignment generated!')
      setCurrentView('assignments')
    } catch (error) {
      toast.error('Failed to generate assignment')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Setup View
  if (!profile || currentView === 'setup') {
    return (
      <div className={cn("space-y-6", isMobile && "space-y-4")}>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-yellow-500" weight="fill" />
              </div>
              <div>
                <h1 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>
                  FlowSphere Tutor AI
                </h1>
                <p className="text-sm text-muted-foreground">
                  Your personal at-home learning companion
                </p>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-6">Let's Set Up Your Learning Profile</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Student Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    min={4}
                    max={18}
                    placeholder="Age"
                    value={setupAge}
                    onChange={(e) => setSetupAge(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    placeholder="e.g., 5th Grade"
                    value={setupGrade}
                    onChange={(e) => setSetupGrade(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Subjects to Learn *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUBJECTS.map((subject) => {
                    const Icon = subject.icon
                    const isSelected = setupSubjects.includes(subject.id)
                    return (
                      <button
                        key={subject.id}
                        onClick={() => {
                          if (isSelected) {
                            setSetupSubjects(setupSubjects.filter(s => s !== subject.id))
                          } else {
                            setSetupSubjects([...setupSubjects, subject.id])
                          }
                        }}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", subject.color)}>
                            <Icon className="w-4 h-4 text-white" weight="fill" />
                          </div>
                          <span className="font-medium">{subject.name}</span>
                          {isSelected && <CheckCircle className="w-4 h-4 text-primary ml-auto" weight="fill" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Button
                onClick={handleSetupComplete}
                className="w-full mt-4"
                disabled={!setupName || !setupAge || setupSubjects.length === 0}
              >
                <Play weight="fill" className="w-4 h-4 mr-2" />
                Start Learning!
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main View with Subject Selection
  if (currentView === 'subjects') {
    return (
      <div className={cn("space-y-6", isMobile && "space-y-4")}>
        {/* Header with Profile */}
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-yellow-500" weight="fill" />
                </div>
                <div>
                  <h2 className="font-bold">{profile.name}</h2>
                  <p className="text-sm text-muted-foreground">Level {profile.level} Learner</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-orange-500">
                    <Fire className="w-5 h-5" weight="fill" />
                    <span className="font-bold">{profile.streak}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Streak</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-5 h-5" weight="fill" />
                    <span className="font-bold">{profile.xp}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">XP</p>
                </div>
              </div>
            </div>
            {/* XP Progress */}
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span>Level {profile.level}</span>
                <span>{xpToNextLevel(profile.xp)} XP to Level {profile.level + 1}</span>
              </div>
              <Progress value={(profile.xp % 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4"
            onClick={generateDailyAssignment}
            disabled={isLoading}
          >
            <div className="flex flex-col items-center gap-2">
              <Calendar className="w-6 h-6 text-primary" />
              <span className="text-sm">Daily Assignment</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4"
            onClick={() => setCurrentView('assignments')}
          >
            <div className="flex flex-col items-center gap-2">
              <Target className="w-6 h-6 text-green-500" />
              <span className="text-sm">My Assignments</span>
            </div>
          </Button>
        </div>

        {/* Subject Cards */}
        <div>
          <h3 className="font-bold mb-3">Choose a Subject to Learn</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUBJECTS.filter(s => profile.selectedSubjects.includes(s.id)).map((subject) => {
              const Icon = subject.icon
              return (
                <motion.button
                  key={subject.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startLesson(subject)}
                  className="p-4 rounded-xl border bg-card hover:border-primary/50 text-left transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", subject.color)}>
                      <Icon className="w-6 h-6 text-white" weight="fill" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold">{subject.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {subject.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Chat View
  if (currentView === 'chat' && selectedSubject) {
    const SubjectIcon = selectedSubject.icon
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        {/* Chat Header */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentView('subjects')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", selectedSubject.color)}>
                <SubjectIcon className="w-5 h-5 text-white" weight="fill" />
              </div>
              <div>
                <h3 className="font-bold">{selectedSubject.name}</h3>
                <p className="text-xs text-muted-foreground">with FlowSphere Tutor</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {(messages || []).map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Robot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] p-3 rounded-2xl",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Robot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted p-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="mt-4 flex gap-2">
          <Input
            placeholder="Type your answer or ask a question..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()}>
            <PaperPlaneTilt className="w-5 h-5" weight="fill" />
          </Button>
        </div>
      </div>
    )
  }

  // Assignments View
  if (currentView === 'assignments') {
    const pendingAssignments = (assignments || []).filter(a => !a.completed)
    const completedAssignments = (assignments || []).filter(a => a.completed)

    return (
      <div className={cn("space-y-6", isMobile && "space-y-4")}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setCurrentView('subjects')}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Target className="w-5 h-5" />
                My Assignments
              </CardTitle>
              <Button onClick={generateDailyAssignment} disabled={isLoading} size="sm">
                Generate New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingAssignments.length === 0 && completedAssignments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No assignments yet</p>
                <p className="text-sm">Click "Generate New" to create a daily assignment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingAssignments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Pending</h4>
                    {pendingAssignments.map((assignment) => {
                      const subject = SUBJECTS.find(s => s.id === assignment.subject)
                      const Icon = subject?.icon || BookOpen
                      return (
                        <Card key={assignment.id} className="mb-2">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", subject?.color || 'bg-gray-500')}>
                                <Icon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-medium">{assignment.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {assignment.questions.length} questions
                                </p>
                              </div>
                            </div>
                            <Button size="sm">Start</Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
                {completedAssignments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Completed</h4>
                    {completedAssignments.map((assignment) => (
                      <Card key={assignment.id} className="mb-2 bg-green-500/10">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-green-500" weight="fill" />
                            <div>
                              <p className="font-medium">{assignment.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Score: {assignment.score}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
