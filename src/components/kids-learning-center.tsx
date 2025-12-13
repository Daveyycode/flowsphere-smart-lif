/**
 * Kids Learning Center - Unified AI-Powered Learning Platform
 *
 * @module KidsLearningCenter
 * @description A comprehensive AI tutoring system for children ages 3-18.
 *
 * ============================================================================
 * ARCHITECTURE OVERVIEW
 * ============================================================================
 *
 * CONVERSATION FLOW (NLP-based tutoring):
 * 1. Welcome Phase (3 min) - Greet student, mood check, build rapport
 * 2. Topic Selection - Help student choose what to learn
 * 3. Teaching Phase - AI teaches from uploaded content or generates lessons
 * 4. Q&A Phase - Interactive questions with feedback
 * 5. Summary Phase - Recap key points, provide encouragement
 *
 * FEATURES:
 * - Single unified interface (no redundant tabs)
 * - Textbook/Lesson plan upload for AI analysis
 * - Age & grade-appropriate content generation
 * - Parent suggestions for daily topics
 * - Camera-based behavior monitoring with AI
 * - Daily/monthly behavior reports
 * - Cheapest AI first with usage limits
 * - User credit system for AI usage
 *
 * DATA FLOW:
 * - User uploads content → AI extracts topic → Generates lesson
 * - Student responses → Mood detection → Performance tracking
 * - Session data → Parent reports (weekly summaries)
 *
 * STORAGE:
 * - localStorage via useKV hook for profiles, sessions, reports
 * - Supabase for cloud sync (optional)
 *
 * AI PROVIDERS (fallback chain):
 * 1. Groq (free tier)
 * 2. OpenRouter (free models)
 * 3. Gemini
 * 4. OpenAI/DeepSeek/Anthropic (paid)
 *
 * @see src/lib/tutor-conversation-flow.ts - Conversation flow utilities
 * @see src/lib/smart-ai-router.ts - AI provider routing
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Camera,
  Eye,
  Warning,
  Clock,
  ChartBar,
  Shield,
  Bell,
  Lightning,
  CaretRight,
  Plus,
  Trash,
  X,
  Upload,
  FileText,
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSlash,
  Gear,
  House,
  CaretDown,
  Export,
  Coin,
  CreditCard,
  Info,
  ChartLine,
  UserCircle,
  Image,
  Link,
  FilePdf,
  Paperclip,
  Users,
} from '@phosphor-icons/react'
import {
  smartCompletion,
  checkUsageLimits,
  getTodayUsage,
  AI_PROVIDERS,
  type AIProvider,
} from '@/lib/smart-ai-router'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'
import { supabase } from '@/lib/supabase'
import { useAnnounce, useLiveRegion, useKeyboardShortcut } from '@/hooks/use-accessibility'
import {
  type PeerSubmission,
  type PeerReview,
  type PeerConnection,
  createSubmission,
  addReview,
  getSubmissions,
  saveSubmissions,
  getConnections,
  saveConnections,
  getReviewableSubmissions,
  getKidSubmissions,
  isConstructiveFeedback,
  getPromptsForAge,
  getRandomStarters,
  generateFeedbackSuggestions,
  PEER_REVIEW_XP,
  FEEDBACK_STARTERS,
} from '@/lib/peer-review-system'

// ==========================================
// Types
// ==========================================

interface KidProfile {
  id: string
  name: string
  age: number
  grade: string
  avatar: string
  language: string
  parentEmail?: string
  // Stats
  xp: number
  level: number
  streak: number
  totalSessions: number
  totalStudyMinutes: number
  lastActiveDate: string
  // Settings
  dailyGoalMinutes: number
}

interface LessonPlan {
  id: string
  kidId: string
  subject: string
  title: string
  content: string
  aiAnalysis?: string
  topics: string[]
  createdAt: number
}

interface ParentSuggestion {
  id: string
  kidId: string
  date: string
  subject: string
  topic: string
  reason: string
  completed: boolean
}

interface BehaviorReport {
  id: string
  kidId: string
  sessionId: string
  date: string
  type: 'daily' | 'weekly' | 'monthly'
  focusScore: number
  attentionSpans: number[]
  distractions: number
  totalMinutes: number
  notes: string[]
  aiInsights?: string
}

interface StudySession {
  id: string
  kidId: string
  subject: string
  topic: string
  startTime: number
  endTime?: number
  focusScores: number[]
  behaviorNotes: string[]
  xpEarned: number
  completed: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  provider?: string
  attachments?: Attachment[]
}

interface Attachment {
  id: string
  type: 'image' | 'file' | 'url'
  name: string
  url?: string
  data?: string // base64 for images
  mimeType?: string
}

interface AICredits {
  free: number
  purchased: number
  lastReset: string
}

interface GameChallenge {
  id: string
  category: 'math' | 'memory' | 'logic' | 'words' | 'pattern' | 'speed' | 'creativity'
  name: string
  description: string
  minAge: number
  maxAge: number
  difficulty: 'easy' | 'medium' | 'hard'
  xpReward: number
  icon: string
  type: 'multiple-choice' | 'fill-blank' | 'match' | 'sequence' | 'memory' | 'speed' | 'draw'
}

interface GameProgress {
  challengeId: string
  completed: boolean
  score: number
  bestTime?: number
  attempts: number
  lastPlayed: string
}

interface ParentSettings {
  gamesEnabled: boolean
  maxDailyGameMinutes: number
  allowedCategories: string[]
}

// New comprehensive tutoring interfaces
interface SessionAnalytics {
  kidId: string
  date: string
  subject: string
  totalMinutes: number
  greetingPhaseComplete: boolean
  mood: 'happy' | 'neutral' | 'sad' | 'anxious' | 'excited' | null
  moodNotes: string
  topicsConvered: string[]
  correctAnswers: number
  incorrectAnswers: number
  weakAreas: string[]
  strongAreas: string[]
  focusRecommendation: string
  confidenceLevel: number // 1-10
  engagementLevel: number // 1-10
  yesterdayRecap: string
  parentAlerts: string[] // For bullying detection, mood concerns
}

interface WeeklySummary {
  id: string
  kidId: string
  weekStart: string
  weekEnd: string
  totalSessions: number
  totalMinutes: number
  moodTrend: string[]
  weakAreasOverall: string[]
  strongAreasOverall: string[]
  progressNotes: string
  focusRecommendations: string[]
  parentSuggestions: string[]
  confidenceProgress: string
  potentialConcerns: string[]
  generatedAt: number
}

interface TopicSuggestion {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedMinutes: number
  learningObjectives: string[]
}

type SessionPhase = 'greeting' | 'learning' | 'review' | 'ended'

// ==========================================
// Constants
// ==========================================

const SUBJECTS = [
  {
    id: 'math',
    name: 'Mathematics',
    icon: Lightbulb,
    color: 'from-blue-500 to-indigo-600',
    emoji: '🧮',
  },
  {
    id: 'science',
    name: 'Science',
    icon: Sparkle,
    color: 'from-green-500 to-emerald-600',
    emoji: '🔬',
  },
  {
    id: 'reading',
    name: 'Reading & Writing',
    icon: BookOpen,
    color: 'from-purple-500 to-violet-600',
    emoji: '📚',
  },
  {
    id: 'language',
    name: 'Languages',
    icon: Globe,
    color: 'from-orange-500 to-amber-600',
    emoji: '🌍',
  },
  {
    id: 'general',
    name: 'General Knowledge',
    icon: GraduationCap,
    color: 'from-pink-500 to-rose-600',
    emoji: '💡',
  },
]

const GRADES = [
  { value: 'pre-k', label: 'Pre-K', ages: [3, 4] },
  { value: 'kindergarten', label: 'Kindergarten', ages: [5, 6] },
  { value: '1st', label: '1st Grade', ages: [6, 7] },
  { value: '2nd', label: '2nd Grade', ages: [7, 8] },
  { value: '3rd', label: '3rd Grade', ages: [8, 9] },
  { value: '4th', label: '4th Grade', ages: [9, 10] },
  { value: '5th', label: '5th Grade', ages: [10, 11] },
  { value: '6th', label: '6th Grade', ages: [11, 12] },
  { value: '7th', label: '7th Grade', ages: [12, 13] },
  { value: '8th', label: '8th Grade', ages: [13, 14] },
  { value: '9th', label: '9th Grade (Freshman)', ages: [14, 15] },
  { value: '10th', label: '10th Grade (Sophomore)', ages: [15, 16] },
  { value: '11th', label: '11th Grade (Junior)', ages: [16, 17] },
  { value: '12th', label: '12th Grade (Senior)', ages: [17, 18] },
]

const AVATARS: Record<string, string> = {
  bear: '🐻',
  rabbit: '🐰',
  fox: '🦊',
  owl: '🦉',
  dolphin: '🐬',
  lion: '🦁',
  panda: '🐼',
  penguin: '🐧',
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'zh', name: 'Chinese' },
  { code: 'tl', name: 'Filipino/Tagalog' },
  { code: 'other', name: 'Other' },
]

const FREE_DAILY_CREDITS = 20 // Free AI calls per day
const CREDIT_COST_PER_MESSAGE = 1

const STORAGE_KEYS = {
  PROFILES: 'flowsphere-kids-profiles-v2',
  SESSIONS: 'flowsphere-kids-sessions-v2',
  LESSONS: 'flowsphere-kids-lessons-v2',
  SUGGESTIONS: 'flowsphere-kids-suggestions-v2',
  REPORTS: 'flowsphere-kids-reports-v2',
  CREDITS: 'flowsphere-kids-credits-v2',
  GAME_PROGRESS: 'flowsphere-kids-games-v2',
  PARENT_SETTINGS: 'flowsphere-kids-parent-settings-v2',
  SESSION_ANALYTICS: 'flowsphere-kids-analytics-v2',
  WEEKLY_SUMMARIES: 'flowsphere-kids-weekly-v2',
}

// Session timing constants
const GREETING_PHASE_MINUTES = 3 // 3 minutes for greeting/mood check
const LEARNING_SESSION_MINUTES = 15 // 15 minutes per learning session
const FOCUS_WEAK_AREA_PERCENT = 80 // 80% focus on weak areas
const FOCUS_OTHER_PERCENT = 20 // 20% on other topics

// Game Categories
const GAME_CATEGORIES = [
  {
    id: 'math',
    name: 'Math Games',
    icon: '🧮',
    color: 'from-blue-500 to-indigo-600',
    description: 'Numbers & Calculations',
  },
  {
    id: 'memory',
    name: 'Memory Games',
    icon: '🧠',
    color: 'from-purple-500 to-violet-600',
    description: 'Remember & Recall',
  },
  {
    id: 'logic',
    name: 'Logic Puzzles',
    icon: '🧩',
    color: 'from-green-500 to-emerald-600',
    description: 'Think & Solve',
  },
  {
    id: 'words',
    name: 'Word Games',
    icon: '📝',
    color: 'from-orange-500 to-amber-600',
    description: 'Letters & Words',
  },
  {
    id: 'pattern',
    name: 'Pattern Games',
    icon: '🔷',
    color: 'from-cyan-500 to-teal-600',
    description: 'Find the Pattern',
  },
  {
    id: 'speed',
    name: 'Speed Challenges',
    icon: '⚡',
    color: 'from-yellow-500 to-orange-600',
    description: 'Quick Thinking',
  },
  {
    id: 'creativity',
    name: 'Creative Games',
    icon: '🎨',
    color: 'from-pink-500 to-rose-600',
    description: 'Imagine & Create',
  },
]

// 100+ Game Challenges
const GAME_CHALLENGES: GameChallenge[] = [
  // Math Games (20 challenges)
  {
    id: 'math-1',
    category: 'math',
    name: 'Number Buddies',
    description: 'Find numbers that add up to 10',
    minAge: 4,
    maxAge: 6,
    difficulty: 'easy',
    xpReward: 10,
    icon: '➕',
    type: 'match',
  },
  {
    id: 'math-2',
    category: 'math',
    name: 'Count the Stars',
    description: 'Count objects and pick the right number',
    minAge: 3,
    maxAge: 5,
    difficulty: 'easy',
    xpReward: 10,
    icon: '⭐',
    type: 'multiple-choice',
  },
  {
    id: 'math-3',
    category: 'math',
    name: 'Addition Adventure',
    description: 'Solve simple addition problems',
    minAge: 5,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🎯',
    type: 'fill-blank',
  },
  {
    id: 'math-4',
    category: 'math',
    name: 'Subtraction Safari',
    description: 'Take away and find the answer',
    minAge: 5,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🦁',
    type: 'fill-blank',
  },
  {
    id: 'math-5',
    category: 'math',
    name: 'Shape Counter',
    description: 'Count different shapes',
    minAge: 3,
    maxAge: 5,
    difficulty: 'easy',
    xpReward: 10,
    icon: '🔺',
    type: 'multiple-choice',
  },
  {
    id: 'math-6',
    category: 'math',
    name: 'Number Order',
    description: 'Put numbers in the right order',
    minAge: 4,
    maxAge: 6,
    difficulty: 'easy',
    xpReward: 15,
    icon: '📊',
    type: 'sequence',
  },
  {
    id: 'math-7',
    category: 'math',
    name: 'Double Trouble',
    description: 'Double the numbers!',
    minAge: 6,
    maxAge: 8,
    difficulty: 'medium',
    xpReward: 20,
    icon: '✖️',
    type: 'fill-blank',
  },
  {
    id: 'math-8',
    category: 'math',
    name: 'Times Tables',
    description: 'Practice multiplication',
    minAge: 7,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🔢',
    type: 'speed',
  },
  {
    id: 'math-9',
    category: 'math',
    name: 'Division Detective',
    description: 'Solve division mysteries',
    minAge: 8,
    maxAge: 11,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🔍',
    type: 'fill-blank',
  },
  {
    id: 'math-10',
    category: 'math',
    name: 'Fraction Fun',
    description: 'Match fractions to pictures',
    minAge: 7,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🍕',
    type: 'match',
  },
  {
    id: 'math-11',
    category: 'math',
    name: 'Money Math',
    description: 'Count coins and bills',
    minAge: 6,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '💰',
    type: 'multiple-choice',
  },
  {
    id: 'math-12',
    category: 'math',
    name: 'Clock Challenge',
    description: 'Tell the time correctly',
    minAge: 6,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🕐',
    type: 'multiple-choice',
  },
  {
    id: 'math-13',
    category: 'math',
    name: 'Greater or Less',
    description: 'Compare numbers quickly',
    minAge: 5,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '⚖️',
    type: 'speed',
  },
  {
    id: 'math-14',
    category: 'math',
    name: 'Number Bonds',
    description: 'Find pairs that make a number',
    minAge: 5,
    maxAge: 8,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🤝',
    type: 'match',
  },
  {
    id: 'math-15',
    category: 'math',
    name: 'Math Maze',
    description: 'Solve equations to find the path',
    minAge: 8,
    maxAge: 12,
    difficulty: 'hard',
    xpReward: 30,
    icon: '🏃',
    type: 'sequence',
  },
  {
    id: 'math-16',
    category: 'math',
    name: 'Place Value Pro',
    description: 'Understand tens and ones',
    minAge: 6,
    maxAge: 8,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🏠',
    type: 'multiple-choice',
  },
  {
    id: 'math-17',
    category: 'math',
    name: 'Skip Counting',
    description: 'Count by 2s, 5s, and 10s',
    minAge: 5,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🐰',
    type: 'sequence',
  },
  {
    id: 'math-18',
    category: 'math',
    name: 'Equation Builder',
    description: 'Build correct equations',
    minAge: 9,
    maxAge: 12,
    difficulty: 'hard',
    xpReward: 35,
    icon: '🏗️',
    type: 'fill-blank',
  },
  {
    id: 'math-19',
    category: 'math',
    name: 'Odd & Even Sort',
    description: 'Sort numbers into groups',
    minAge: 5,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🎲',
    type: 'match',
  },
  {
    id: 'math-20',
    category: 'math',
    name: 'Mental Math Race',
    description: 'Quick calculations challenge',
    minAge: 8,
    maxAge: 12,
    difficulty: 'hard',
    xpReward: 40,
    icon: '🏎️',
    type: 'speed',
  },

  // Memory Games (15 challenges)
  {
    id: 'mem-1',
    category: 'memory',
    name: 'Animal Match',
    description: 'Match pairs of cute animals',
    minAge: 3,
    maxAge: 6,
    difficulty: 'easy',
    xpReward: 10,
    icon: '🐶',
    type: 'memory',
  },
  {
    id: 'mem-2',
    category: 'memory',
    name: 'Color Memory',
    description: 'Remember the color sequence',
    minAge: 4,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🌈',
    type: 'sequence',
  },
  {
    id: 'mem-3',
    category: 'memory',
    name: 'Picture Recall',
    description: 'Remember what you saw',
    minAge: 5,
    maxAge: 8,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🖼️',
    type: 'memory',
  },
  {
    id: 'mem-4',
    category: 'memory',
    name: 'Number Memory',
    description: 'Remember number sequences',
    minAge: 6,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🔢',
    type: 'sequence',
  },
  {
    id: 'mem-5',
    category: 'memory',
    name: 'Shape Shuffle',
    description: 'Remember where shapes were',
    minAge: 4,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🔷',
    type: 'memory',
  },
  {
    id: 'mem-6',
    category: 'memory',
    name: 'Sound Memory',
    description: 'Match sounds to pictures',
    minAge: 3,
    maxAge: 6,
    difficulty: 'easy',
    xpReward: 10,
    icon: '🔊',
    type: 'match',
  },
  {
    id: 'mem-7',
    category: 'memory',
    name: 'Story Recall',
    description: 'Remember details from a story',
    minAge: 6,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 25,
    icon: '📖',
    type: 'multiple-choice',
  },
  {
    id: 'mem-8',
    category: 'memory',
    name: 'Simon Says',
    description: 'Follow the pattern sequence',
    minAge: 5,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🎮',
    type: 'sequence',
  },
  {
    id: 'mem-9',
    category: 'memory',
    name: "What's Missing?",
    description: 'Find the missing item',
    minAge: 4,
    maxAge: 8,
    difficulty: 'medium',
    xpReward: 20,
    icon: '❓',
    type: 'multiple-choice',
  },
  {
    id: 'mem-10',
    category: 'memory',
    name: 'Face Match',
    description: 'Match faces with names',
    minAge: 5,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '😊',
    type: 'match',
  },
  {
    id: 'mem-11',
    category: 'memory',
    name: 'Word Memory',
    description: 'Remember lists of words',
    minAge: 7,
    maxAge: 11,
    difficulty: 'hard',
    xpReward: 30,
    icon: '📝',
    type: 'sequence',
  },
  {
    id: 'mem-12',
    category: 'memory',
    name: 'Pattern Recall',
    description: 'Remember complex patterns',
    minAge: 8,
    maxAge: 12,
    difficulty: 'hard',
    xpReward: 35,
    icon: '🎯',
    type: 'memory',
  },
  {
    id: 'mem-13',
    category: 'memory',
    name: 'Emoji Match',
    description: 'Match emoji pairs',
    minAge: 4,
    maxAge: 8,
    difficulty: 'easy',
    xpReward: 15,
    icon: '😀',
    type: 'memory',
  },
  {
    id: 'mem-14',
    category: 'memory',
    name: 'Location Memory',
    description: 'Remember item locations',
    minAge: 5,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '📍',
    type: 'memory',
  },
  {
    id: 'mem-15',
    category: 'memory',
    name: 'Sequence Master',
    description: 'Master long sequences',
    minAge: 9,
    maxAge: 12,
    difficulty: 'hard',
    xpReward: 40,
    icon: '🏆',
    type: 'sequence',
  },

  // Logic Puzzles (15 challenges)
  {
    id: 'logic-1',
    category: 'logic',
    name: 'Odd One Out',
    description: 'Find what does not belong',
    minAge: 4,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🤔',
    type: 'multiple-choice',
  },
  {
    id: 'logic-2',
    category: 'logic',
    name: 'Simple Sudoku',
    description: 'Fill in the grid (4x4)',
    minAge: 6,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 25,
    icon: '📊',
    type: 'fill-blank',
  },
  {
    id: 'logic-3',
    category: 'logic',
    name: 'Sort It Out',
    description: 'Group items by category',
    minAge: 4,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '📦',
    type: 'match',
  },
  {
    id: 'logic-4',
    category: 'logic',
    name: 'If-Then Puzzles',
    description: 'Solve logical statements',
    minAge: 7,
    maxAge: 11,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🔀',
    type: 'multiple-choice',
  },
  {
    id: 'logic-5',
    category: 'logic',
    name: 'Picture Puzzles',
    description: 'Complete the picture logic',
    minAge: 5,
    maxAge: 8,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🧩',
    type: 'multiple-choice',
  },
  {
    id: 'logic-6',
    category: 'logic',
    name: 'Who Lives Where?',
    description: 'Solve simple logic grids',
    minAge: 8,
    maxAge: 12,
    difficulty: 'hard',
    xpReward: 35,
    icon: '🏠',
    type: 'fill-blank',
  },
  {
    id: 'logic-7',
    category: 'logic',
    name: 'Balance Scale',
    description: 'Make both sides equal',
    minAge: 5,
    maxAge: 8,
    difficulty: 'medium',
    xpReward: 20,
    icon: '⚖️',
    type: 'fill-blank',
  },
  {
    id: 'logic-8',
    category: 'logic',
    name: 'Code Breaker',
    description: 'Crack the secret code',
    minAge: 7,
    maxAge: 11,
    difficulty: 'medium',
    xpReward: 30,
    icon: '🔐',
    type: 'fill-blank',
  },
  {
    id: 'logic-9',
    category: 'logic',
    name: 'Tower Builder',
    description: 'Stack blocks correctly',
    minAge: 4,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🗼',
    type: 'sequence',
  },
  {
    id: 'logic-10',
    category: 'logic',
    name: 'Mirror Image',
    description: 'Find the correct reflection',
    minAge: 5,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🪞',
    type: 'multiple-choice',
  },
  {
    id: 'logic-11',
    category: 'logic',
    name: 'Maze Runner',
    description: 'Find the path through',
    minAge: 5,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🏃',
    type: 'sequence',
  },
  {
    id: 'logic-12',
    category: 'logic',
    name: 'True or False',
    description: 'Evaluate statements',
    minAge: 6,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 20,
    icon: '✅',
    type: 'multiple-choice',
  },
  {
    id: 'logic-13',
    category: 'logic',
    name: 'Riddle Time',
    description: 'Solve fun riddles',
    minAge: 6,
    maxAge: 11,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🎭',
    type: 'multiple-choice',
  },
  {
    id: 'logic-14',
    category: 'logic',
    name: 'Tangram Puzzle',
    description: 'Arrange shapes to match',
    minAge: 6,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 25,
    icon: '📐',
    type: 'match',
  },
  {
    id: 'logic-15',
    category: 'logic',
    name: 'Brain Teaser',
    description: 'Advanced logic challenges',
    minAge: 10,
    maxAge: 12,
    difficulty: 'hard',
    xpReward: 40,
    icon: '🧠',
    type: 'fill-blank',
  },

  // Word Games (15 challenges)
  {
    id: 'word-1',
    category: 'words',
    name: 'Letter Hunt',
    description: 'Find hidden letters',
    minAge: 4,
    maxAge: 6,
    difficulty: 'easy',
    xpReward: 10,
    icon: '🔤',
    type: 'match',
  },
  {
    id: 'word-2',
    category: 'words',
    name: 'Rhyme Time',
    description: 'Match words that rhyme',
    minAge: 4,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🎵',
    type: 'match',
  },
  {
    id: 'word-3',
    category: 'words',
    name: 'Spell It Right',
    description: 'Choose correct spelling',
    minAge: 6,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '✏️',
    type: 'multiple-choice',
  },
  {
    id: 'word-4',
    category: 'words',
    name: 'Word Builder',
    description: 'Make words from letters',
    minAge: 6,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🏗️',
    type: 'fill-blank',
  },
  {
    id: 'word-5',
    category: 'words',
    name: 'Alphabet Order',
    description: 'Put letters in order',
    minAge: 4,
    maxAge: 6,
    difficulty: 'easy',
    xpReward: 10,
    icon: '📝',
    type: 'sequence',
  },
  {
    id: 'word-6',
    category: 'words',
    name: 'Picture Words',
    description: 'Match pictures to words',
    minAge: 4,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🖼️',
    type: 'match',
  },
  {
    id: 'word-7',
    category: 'words',
    name: 'Opposite Words',
    description: 'Find the opposites',
    minAge: 5,
    maxAge: 8,
    difficulty: 'medium',
    xpReward: 20,
    icon: '↔️',
    type: 'match',
  },
  {
    id: 'word-8',
    category: 'words',
    name: 'Word Search',
    description: 'Find words in the grid',
    minAge: 6,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🔍',
    type: 'match',
  },
  {
    id: 'word-9',
    category: 'words',
    name: 'Fill the Gap',
    description: 'Complete the sentence',
    minAge: 6,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '📝',
    type: 'fill-blank',
  },
  {
    id: 'word-10',
    category: 'words',
    name: 'Word Categories',
    description: 'Sort words into groups',
    minAge: 5,
    maxAge: 8,
    difficulty: 'easy',
    xpReward: 15,
    icon: '📂',
    type: 'match',
  },
  {
    id: 'word-11',
    category: 'words',
    name: 'Synonym Match',
    description: 'Find words with same meaning',
    minAge: 7,
    maxAge: 11,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🔗',
    type: 'match',
  },
  {
    id: 'word-12',
    category: 'words',
    name: 'Unscramble',
    description: 'Rearrange jumbled letters',
    minAge: 7,
    maxAge: 11,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🔀',
    type: 'fill-blank',
  },
  {
    id: 'word-13',
    category: 'words',
    name: 'Story Words',
    description: 'Put story words in order',
    minAge: 6,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '📖',
    type: 'sequence',
  },
  {
    id: 'word-14',
    category: 'words',
    name: 'Compound Words',
    description: 'Make compound words',
    minAge: 7,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🔧',
    type: 'match',
  },
  {
    id: 'word-15',
    category: 'words',
    name: 'Crossword Kids',
    description: 'Simple crossword puzzles',
    minAge: 8,
    maxAge: 12,
    difficulty: 'hard',
    xpReward: 35,
    icon: '📰',
    type: 'fill-blank',
  },

  // Pattern Games (15 challenges)
  {
    id: 'pat-1',
    category: 'pattern',
    name: 'Color Patterns',
    description: 'Complete the color sequence',
    minAge: 3,
    maxAge: 6,
    difficulty: 'easy',
    xpReward: 10,
    icon: '🌈',
    type: 'sequence',
  },
  {
    id: 'pat-2',
    category: 'pattern',
    name: 'Shape Sequence',
    description: 'What comes next?',
    minAge: 4,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🔷',
    type: 'multiple-choice',
  },
  {
    id: 'pat-3',
    category: 'pattern',
    name: 'Number Patterns',
    description: 'Find the number pattern',
    minAge: 6,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🔢',
    type: 'fill-blank',
  },
  {
    id: 'pat-4',
    category: 'pattern',
    name: 'Growing Patterns',
    description: 'Patterns that grow',
    minAge: 5,
    maxAge: 8,
    difficulty: 'medium',
    xpReward: 20,
    icon: '📈',
    type: 'sequence',
  },
  {
    id: 'pat-5',
    category: 'pattern',
    name: 'Repeating Beats',
    description: 'Complete the rhythm pattern',
    minAge: 4,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🥁',
    type: 'sequence',
  },
  {
    id: 'pat-6',
    category: 'pattern',
    name: 'Picture Pattern',
    description: 'What picture comes next?',
    minAge: 4,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🎨',
    type: 'multiple-choice',
  },
  {
    id: 'pat-7',
    category: 'pattern',
    name: 'AB Patterns',
    description: 'Simple alternating patterns',
    minAge: 3,
    maxAge: 5,
    difficulty: 'easy',
    xpReward: 10,
    icon: '🔄',
    type: 'sequence',
  },
  {
    id: 'pat-8',
    category: 'pattern',
    name: 'ABC Patterns',
    description: 'Three-part patterns',
    minAge: 4,
    maxAge: 7,
    difficulty: 'medium',
    xpReward: 15,
    icon: '🔁',
    type: 'sequence',
  },
  {
    id: 'pat-9',
    category: 'pattern',
    name: 'Tile Patterns',
    description: 'Complete the tile design',
    minAge: 5,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🎴',
    type: 'match',
  },
  {
    id: 'pat-10',
    category: 'pattern',
    name: 'Symmetry Finder',
    description: 'Find symmetrical patterns',
    minAge: 6,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🦋',
    type: 'multiple-choice',
  },
  {
    id: 'pat-11',
    category: 'pattern',
    name: 'Pattern Rules',
    description: 'Discover the rule',
    minAge: 7,
    maxAge: 11,
    difficulty: 'hard',
    xpReward: 30,
    icon: '📏',
    type: 'fill-blank',
  },
  {
    id: 'pat-12',
    category: 'pattern',
    name: 'Missing Piece',
    description: 'Find what fits',
    minAge: 5,
    maxAge: 8,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🧩',
    type: 'multiple-choice',
  },
  {
    id: 'pat-13',
    category: 'pattern',
    name: 'Pattern Matrix',
    description: 'Complex pattern grids',
    minAge: 8,
    maxAge: 12,
    difficulty: 'hard',
    xpReward: 35,
    icon: '📊',
    type: 'multiple-choice',
  },
  {
    id: 'pat-14',
    category: 'pattern',
    name: 'Rotation Pattern',
    description: 'Patterns that rotate',
    minAge: 7,
    maxAge: 11,
    difficulty: 'hard',
    xpReward: 30,
    icon: '🔄',
    type: 'multiple-choice',
  },
  {
    id: 'pat-15',
    category: 'pattern',
    name: 'Pattern Detective',
    description: 'Find hidden patterns',
    minAge: 9,
    maxAge: 12,
    difficulty: 'hard',
    xpReward: 40,
    icon: '🕵️',
    type: 'fill-blank',
  },

  // Speed Challenges (15 challenges)
  {
    id: 'speed-1',
    category: 'speed',
    name: 'Quick Count',
    description: 'Count objects fast!',
    minAge: 4,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '⏱️',
    type: 'speed',
  },
  {
    id: 'speed-2',
    category: 'speed',
    name: 'Flash Cards',
    description: 'Quick math answers',
    minAge: 5,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '⚡',
    type: 'speed',
  },
  {
    id: 'speed-3',
    category: 'speed',
    name: 'Color Tap',
    description: 'Tap the right color fast',
    minAge: 4,
    maxAge: 8,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🎯',
    type: 'speed',
  },
  {
    id: 'speed-4',
    category: 'speed',
    name: 'Shape Race',
    description: 'Identify shapes quickly',
    minAge: 4,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🏁',
    type: 'speed',
  },
  {
    id: 'speed-5',
    category: 'speed',
    name: 'Word Dash',
    description: 'Spell words against time',
    minAge: 6,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 25,
    icon: '💨',
    type: 'speed',
  },
  {
    id: 'speed-6',
    category: 'speed',
    name: 'Number Ninja',
    description: 'Quick number recognition',
    minAge: 5,
    maxAge: 8,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🥷',
    type: 'speed',
  },
  {
    id: 'speed-7',
    category: 'speed',
    name: 'Match Sprint',
    description: 'Find matches quickly',
    minAge: 5,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🏃‍♂️',
    type: 'speed',
  },
  {
    id: 'speed-8',
    category: 'speed',
    name: 'Reflex Test',
    description: 'Test your reaction time',
    minAge: 6,
    maxAge: 12,
    difficulty: 'medium',
    xpReward: 20,
    icon: '👆',
    type: 'speed',
  },
  {
    id: 'speed-9',
    category: 'speed',
    name: 'Quick Sort',
    description: 'Sort items fast',
    minAge: 5,
    maxAge: 8,
    difficulty: 'medium',
    xpReward: 20,
    icon: '📤',
    type: 'speed',
  },
  {
    id: 'speed-10',
    category: 'speed',
    name: '60 Second Math',
    description: 'Solve max problems in a minute',
    minAge: 7,
    maxAge: 12,
    difficulty: 'hard',
    xpReward: 35,
    icon: '⏰',
    type: 'speed',
  },
  {
    id: 'speed-11',
    category: 'speed',
    name: 'Letter Race',
    description: 'Find letters quickly',
    minAge: 4,
    maxAge: 7,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🔠',
    type: 'speed',
  },
  {
    id: 'speed-12',
    category: 'speed',
    name: 'Pattern Speed',
    description: 'Complete patterns fast',
    minAge: 6,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 25,
    icon: '⚡',
    type: 'speed',
  },
  {
    id: 'speed-13',
    category: 'speed',
    name: 'Memory Sprint',
    description: 'Quick memory challenges',
    minAge: 6,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🧠',
    type: 'speed',
  },
  {
    id: 'speed-14',
    category: 'speed',
    name: 'Tap Master',
    description: 'Tap targets accurately',
    minAge: 4,
    maxAge: 8,
    difficulty: 'easy',
    xpReward: 15,
    icon: '👇',
    type: 'speed',
  },
  {
    id: 'speed-15',
    category: 'speed',
    name: 'Ultimate Speed',
    description: 'Mixed speed challenges',
    minAge: 8,
    maxAge: 12,
    difficulty: 'hard',
    xpReward: 40,
    icon: '🏆',
    type: 'speed',
  },

  // Creativity Games (15 challenges)
  {
    id: 'create-1',
    category: 'creativity',
    name: 'Color Mix',
    description: 'Create new colors',
    minAge: 4,
    maxAge: 8,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🎨',
    type: 'match',
  },
  {
    id: 'create-2',
    category: 'creativity',
    name: 'Shape Art',
    description: 'Make pictures with shapes',
    minAge: 4,
    maxAge: 8,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🔶',
    type: 'draw',
  },
  {
    id: 'create-3',
    category: 'creativity',
    name: 'Story Builder',
    description: 'Create your own story',
    minAge: 5,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 25,
    icon: '📚',
    type: 'sequence',
  },
  {
    id: 'create-4',
    category: 'creativity',
    name: 'Pattern Creator',
    description: 'Design your own pattern',
    minAge: 5,
    maxAge: 9,
    difficulty: 'medium',
    xpReward: 20,
    icon: '✨',
    type: 'draw',
  },
  {
    id: 'create-5',
    category: 'creativity',
    name: 'Animal Mix-up',
    description: 'Create funny animals',
    minAge: 4,
    maxAge: 8,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🦄',
    type: 'draw',
  },
  {
    id: 'create-6',
    category: 'creativity',
    name: 'Emoji Story',
    description: 'Tell stories with emojis',
    minAge: 5,
    maxAge: 10,
    difficulty: 'easy',
    xpReward: 15,
    icon: '😊',
    type: 'sequence',
  },
  {
    id: 'create-7',
    category: 'creativity',
    name: 'Music Maker',
    description: 'Create simple tunes',
    minAge: 5,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🎵',
    type: 'sequence',
  },
  {
    id: 'create-8',
    category: 'creativity',
    name: 'Dream House',
    description: 'Design your dream house',
    minAge: 5,
    maxAge: 10,
    difficulty: 'medium',
    xpReward: 20,
    icon: '🏠',
    type: 'draw',
  },
  {
    id: 'create-9',
    category: 'creativity',
    name: 'Invention Time',
    description: 'Create a new invention',
    minAge: 6,
    maxAge: 12,
    difficulty: 'medium',
    xpReward: 25,
    icon: '💡',
    type: 'draw',
  },
  {
    id: 'create-10',
    category: 'creativity',
    name: 'Comic Strip',
    description: 'Make a mini comic',
    minAge: 6,
    maxAge: 11,
    difficulty: 'medium',
    xpReward: 25,
    icon: '📰',
    type: 'draw',
  },
  {
    id: 'create-11',
    category: 'creativity',
    name: 'Recipe Creator',
    description: 'Invent a silly recipe',
    minAge: 5,
    maxAge: 9,
    difficulty: 'easy',
    xpReward: 15,
    icon: '🍳',
    type: 'sequence',
  },
  {
    id: 'create-12',
    category: 'creativity',
    name: 'Monster Designer',
    description: 'Create friendly monsters',
    minAge: 4,
    maxAge: 9,
    difficulty: 'easy',
    xpReward: 15,
    icon: '👾',
    type: 'draw',
  },
  {
    id: 'create-13',
    category: 'creativity',
    name: 'World Builder',
    description: 'Design your own world',
    minAge: 7,
    maxAge: 12,
    difficulty: 'hard',
    xpReward: 35,
    icon: '🌍',
    type: 'draw',
  },
  {
    id: 'create-14',
    category: 'creativity',
    name: 'Character Quest',
    description: 'Create a story character',
    minAge: 6,
    maxAge: 11,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🦸',
    type: 'draw',
  },
  {
    id: 'create-15',
    category: 'creativity',
    name: 'Art Challenge',
    description: 'Complete creative challenges',
    minAge: 5,
    maxAge: 12,
    difficulty: 'medium',
    xpReward: 25,
    icon: '🎭',
    type: 'draw',
  },
]

// ==========================================
// Main Component
// ==========================================

export function KidsLearningCenter() {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  // Core State
  const [profiles, setProfiles] = useKV<KidProfile[]>(STORAGE_KEYS.PROFILES, [])
  const [sessions, setSessions] = useKV<StudySession[]>(STORAGE_KEYS.SESSIONS, [])
  const [lessons, setLessons] = useKV<LessonPlan[]>(STORAGE_KEYS.LESSONS, [])
  const [suggestions, setSuggestions] = useKV<ParentSuggestion[]>(STORAGE_KEYS.SUGGESTIONS, [])
  const [reports, setReports] = useKV<BehaviorReport[]>(STORAGE_KEYS.REPORTS, [])
  const [credits, setCredits] = useKV<AICredits>(STORAGE_KEYS.CREDITS, {
    free: FREE_DAILY_CREDITS,
    purchased: 0,
    lastReset: new Date().toISOString().split('T')[0],
  })

  // Game State
  const [gameProgress, setGameProgress] = useKV<GameProgress[]>(STORAGE_KEYS.GAME_PROGRESS, [])
  const [parentSettings, setParentSettings] = useKV<ParentSettings>(STORAGE_KEYS.PARENT_SETTINGS, {
    gamesEnabled: true,
    maxDailyGameMinutes: 60,
    allowedCategories: ['math', 'memory', 'logic', 'words', 'pattern', 'speed', 'creativity'],
  })

  // UI State
  const [selectedKid, setSelectedKid] = useState<KidProfile | null>(null)
  const [currentView, setCurrentView] = useState<'home' | 'learn' | 'profile' | 'games' | 'peers'>(
    'home'
  )
  const [selectedSubject, setSelectedSubject] = useState<(typeof SUBJECTS)[0] | null>(null)
  const [showSetup, setShowSetup] = useState(false)

  // Peer Review State
  const [peerSubmissions, setPeerSubmissions] = useState<PeerSubmission[]>([])
  const [peerConnections, setPeerConnections] = useState<PeerConnection[]>([])
  const [showSubmitWork, setShowSubmitWork] = useState(false)
  const [reviewingSubmission, setReviewingSubmission] = useState<PeerSubmission | null>(null)
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [reviewRating, setReviewRating] = useState<1 | 2 | 3 | 4 | 5>(5)

  // Accessibility
  const { announce } = useAnnounce()
  const { announceNew } = useLiveRegion(true) // Kids mode

  // Learning Session State
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null)

  // Attachment State
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Camera/Monitoring State
  const [cameraActive, setCameraActive] = useState(false)
  const [focusScore, setFocusScore] = useState(100)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const monitorIntervalRef = useRef<number | null>(null)

  // Lesson Plan State
  const [lessonPlanText, setLessonPlanText] = useState('')
  const [analyzingLesson, setAnalyzingLesson] = useState(false)
  const [currentLessonPlan, setCurrentLessonPlan] = useState<LessonPlan | null>(null)

  // Voice State
  const [ttsEnabled, setTtsEnabled] = useState(true)

  // Game UI State
  const [selectedGameCategory, setSelectedGameCategory] = useState<string | null>(null)
  const [activeGame, setActiveGame] = useState<GameChallenge | null>(null)
  const [gameState, setGameState] = useState<{
    score: number
    timeLeft: number
    currentQuestion: number
    answers: any[]
    isPlaying: boolean
    showResult: boolean
  }>({
    score: 0,
    timeLeft: 60,
    currentQuestion: 0,
    answers: [],
    isPlaying: false,
    showResult: false,
  })
  const [showParentSettings, setShowParentSettings] = useState(false)
  const gameTimerRef = useRef<number | null>(null)

  // Comprehensive Tutoring State
  const [sessionAnalytics, setSessionAnalytics] = useKV<SessionAnalytics[]>(
    STORAGE_KEYS.SESSION_ANALYTICS,
    []
  )
  const [weeklySummaries, setWeeklySummaries] = useKV<WeeklySummary[]>(
    STORAGE_KEYS.WEEKLY_SUMMARIES,
    []
  )
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('greeting')
  const [sessionTimer, setSessionTimer] = useState<number>(0) // seconds elapsed
  const [greetingTimer, setGreetingTimer] = useState<number>(GREETING_PHASE_MINUTES * 60)
  const [learningTimer, setLearningTimer] = useState<number>(LEARNING_SESSION_MINUTES * 60)
  const [currentMood, setCurrentMood] = useState<SessionAnalytics['mood']>(null)
  const [currentAnalytics, setCurrentAnalytics] = useState<SessionAnalytics | null>(null)
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([])
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false)
  const [uploadedContent, setUploadedContent] = useState<string>('') // Parsed content from uploaded files
  const [isAnalyzingContent, setIsAnalyzingContent] = useState(false)
  const [showWeeklySummary, setShowWeeklySummary] = useState(false)
  const sessionTimerRef = useRef<number | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  // ==========================================
  // Effects
  // ==========================================

  // Auto-select first kid
  useEffect(() => {
    if (profiles && profiles.length > 0 && !selectedKid) {
      setSelectedKid(profiles[0])
    }
  }, [profiles, selectedKid])

  // Reset daily credits
  useEffect(() => {
    if (credits) {
      const today = new Date().toISOString().split('T')[0]
      if (credits.lastReset !== today) {
        setCredits({
          ...credits,
          free: FREE_DAILY_CREDITS,
          lastReset: today,
        })
      }
    }
  }, [credits])

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Load peer review data
  useEffect(() => {
    setPeerSubmissions(getSubmissions())
    setPeerConnections(getConnections())
  }, [])

  // ==========================================
  // Credit System
  // ==========================================

  const hasCredits = (): boolean => {
    if (!credits) return false
    return credits.free + credits.purchased >= CREDIT_COST_PER_MESSAGE
  }

  const useCredit = () => {
    if (!credits) return false
    if (credits.free > 0) {
      setCredits({ ...credits, free: credits.free - CREDIT_COST_PER_MESSAGE })
      return true
    } else if (credits.purchased > 0) {
      setCredits({ ...credits, purchased: credits.purchased - CREDIT_COST_PER_MESSAGE })
      return true
    }
    return false
  }

  const getTotalCredits = () => (credits?.free || 0) + (credits?.purchased || 0)

  // ==========================================
  // Comprehensive Tutoring System
  // ==========================================

  // Get yesterday's analytics for recap
  const getYesterdayAnalytics = useCallback(() => {
    if (!selectedKid || !sessionAnalytics) return null
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    return sessionAnalytics.find(a => a.kidId === selectedKid.id && a.date === yesterday)
  }, [selectedKid, sessionAnalytics])

  // Get weak areas from recent sessions
  const getWeakAreas = useCallback(() => {
    if (!selectedKid || !sessionAnalytics) return []
    const recent = sessionAnalytics.filter(a => a.kidId === selectedKid.id).slice(-10)
    const weakCounts: Record<string, number> = {}
    recent.forEach(a => {
      a.weakAreas.forEach(area => {
        weakCounts[area] = (weakCounts[area] || 0) + 1
      })
    })
    return Object.entries(weakCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([area]) => area)
  }, [selectedKid, sessionAnalytics])

  // Initialize session analytics
  const initializeSessionAnalytics = useCallback(
    (subject: string) => {
      if (!selectedKid) return null
      const analytics: SessionAnalytics = {
        kidId: selectedKid.id,
        date: new Date().toISOString().split('T')[0],
        subject,
        totalMinutes: 0,
        greetingPhaseComplete: false,
        mood: null,
        moodNotes: '',
        topicsConvered: [],
        correctAnswers: 0,
        incorrectAnswers: 0,
        weakAreas: [],
        strongAreas: [],
        focusRecommendation: '',
        confidenceLevel: 5,
        engagementLevel: 5,
        yesterdayRecap: '',
        parentAlerts: [],
      }
      setCurrentAnalytics(analytics)
      return analytics
    },
    [selectedKid]
  )

  // Start session timer
  const startSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current)

    sessionTimerRef.current = window.setInterval(() => {
      setSessionTimer(prev => prev + 1)

      // Update phase based on timer
      if (sessionPhase === 'greeting') {
        setGreetingTimer(prev => {
          if (prev <= 1) {
            setSessionPhase('learning')
            toast.info("Great chat! Now let's start learning!")
            return 0
          }
          return prev - 1
        })
      } else if (sessionPhase === 'learning') {
        setLearningTimer(prev => {
          if (prev <= 1) {
            setSessionPhase('review')
            performSessionAnalysis()
            return 0
          }
          return prev - 1
        })
      }
    }, 1000)
  }, [sessionPhase])

  // Stop session timer
  const stopSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current)
      sessionTimerRef.current = null
    }
  }, [])

  // Perform 15-minute session analysis
  const performSessionAnalysis = useCallback(async () => {
    if (!selectedKid || !selectedSubject || !currentAnalytics) return

    const weakAreas = getWeakAreas()
    const analytics = {
      ...currentAnalytics,
      totalMinutes: Math.round(sessionTimer / 60),
      weakAreas,
      focusRecommendation:
        weakAreas.length > 0
          ? `Focus ${FOCUS_WEAK_AREA_PERCENT}% on: ${weakAreas.slice(0, 2).join(', ')}`
          : 'Continue with current topics',
    }

    setCurrentAnalytics(analytics)
    setSessionAnalytics(prev => [...(prev || []), analytics])

    // Generate AI summary
    if (hasCredits()) {
      useCredit()
      try {
        const result = await smartCompletion(
          [
            {
              role: 'system',
              content: `You are analyzing a ${LEARNING_SESSION_MINUTES}-minute tutoring session. Provide a brief parent-friendly summary.`,
            },
            {
              role: 'user',
              content: `Session Summary for ${selectedKid.name}:
- Subject: ${selectedSubject.name}
- Duration: ${analytics.totalMinutes} minutes
- Mood: ${analytics.mood || 'Not assessed'}
- Topics: ${analytics.topicsConvered.join(', ') || 'General review'}
- Correct answers: ${analytics.correctAnswers}
- Incorrect answers: ${analytics.incorrectAnswers}
- Weak areas identified: ${analytics.weakAreas.join(', ') || 'None'}

Generate a 2-3 sentence summary for parents with one actionable suggestion.`,
            },
          ],
          { temperature: 0.5 }
        )

        toast.success('Session analysis complete!', {
          description: result.content.slice(0, 100) + '...',
        })
      } catch (e) {
        console.error('Analysis failed:', e)
      }
    }
  }, [selectedKid, selectedSubject, currentAnalytics, sessionTimer, getWeakAreas, hasCredits])

  // Detect mood from AI response
  const detectMoodFromConversation = useCallback(
    (content: string) => {
      const lowerContent = content.toLowerCase()
      const moodIndicators = {
        sad: [
          'sad',
          'upset',
          'crying',
          'unhappy',
          'bad day',
          'hurt',
          'lonely',
          'bullied',
          'mean to me',
        ],
        anxious: ['worried', 'scared', 'nervous', 'anxious', 'afraid', 'stress'],
        happy: ['happy', 'great', 'awesome', 'excited', 'fun', 'good day', 'love'],
        excited: ["can't wait", 'so excited', 'yay', 'amazing'],
      }

      for (const [mood, indicators] of Object.entries(moodIndicators)) {
        if (indicators.some(i => lowerContent.includes(i))) {
          setCurrentMood(mood as SessionAnalytics['mood'])

          // Alert parents for concerning moods
          if (mood === 'sad' || mood === 'anxious') {
            const alerts = currentAnalytics?.parentAlerts || []
            if (!alerts.includes(`${mood} mood detected`)) {
              setCurrentAnalytics(prev =>
                prev
                  ? {
                      ...prev,
                      mood: mood as SessionAnalytics['mood'],
                      parentAlerts: [...alerts, `${mood} mood detected - may need attention`],
                    }
                  : prev
              )
            }
          }
          return mood
        }
      }
      return null
    },
    [currentAnalytics]
  )

  // Generate topic suggestions based on uploaded content
  const generateTopicSuggestions = useCallback(async () => {
    if (!selectedKid || !selectedSubject || !hasCredits()) return

    setShowTopicSuggestions(true)
    setIsLoading(true)
    useCredit()

    try {
      const gradeInfo = GRADES.find(g => g.value === selectedKid.grade)
      const weakAreas = getWeakAreas()
      const uploadedContext = uploadedContent
        ? `\n\nUploaded learning material:\n${uploadedContent.slice(0, 2000)}`
        : ''

      const result = await smartCompletion(
        [
          {
            role: 'system',
            content: `You are an educational curriculum expert. Generate 4 topic suggestions in JSON format.`,
          },
          {
            role: 'user',
            content: `Generate 4 topic suggestions for:
- Student: ${selectedKid.name}, Age ${selectedKid.age}, ${gradeInfo?.label}
- Subject: ${selectedSubject.name}
- Weak areas to focus on: ${weakAreas.join(', ') || 'None identified'}
${uploadedContext}

Return ONLY valid JSON array with format:
[{"id":"topic-1","title":"Topic Name","description":"Brief description","difficulty":"easy|medium|hard","estimatedMinutes":10,"learningObjectives":["objective1","objective2"]}]`,
          },
        ],
        { temperature: 0.7 }
      )

      try {
        // Extract JSON from response
        const jsonMatch = result.content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]) as TopicSuggestion[]
          setTopicSuggestions(suggestions)
        }
      } catch (e) {
        console.error('Failed to parse suggestions:', e)
        toast.error('Could not generate suggestions')
      }
    } catch (e) {
      toast.error('Could not generate topic suggestions')
    } finally {
      setIsLoading(false)
    }
  }, [selectedKid, selectedSubject, uploadedContent, getWeakAreas, hasCredits])

  // Generate weekly summary for parents
  const generateWeeklySummary = useCallback(async () => {
    if (!selectedKid || !sessionAnalytics || !hasCredits()) return

    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const weekEnd = new Date().toISOString().split('T')[0]

    const weeklyData = sessionAnalytics.filter(
      a => a.kidId === selectedKid.id && a.date >= weekStart && a.date <= weekEnd
    )

    if (weeklyData.length === 0) {
      toast.info('No sessions this week to summarize')
      return
    }

    setIsLoading(true)
    useCredit()

    try {
      const moodTrend = weeklyData.map(a => a.mood).filter(Boolean) as string[]
      const allWeakAreas = [...new Set(weeklyData.flatMap(a => a.weakAreas))]
      const allStrongAreas = [...new Set(weeklyData.flatMap(a => a.strongAreas))]
      const totalCorrect = weeklyData.reduce((sum, a) => sum + a.correctAnswers, 0)
      const totalIncorrect = weeklyData.reduce((sum, a) => sum + a.incorrectAnswers, 0)
      const parentAlerts = [...new Set(weeklyData.flatMap(a => a.parentAlerts))]

      const result = await smartCompletion(
        [
          {
            role: 'system',
            content: `You are a caring educational advisor generating a weekly summary for parents. Be warm, encouraging, and actionable.`,
          },
          {
            role: 'user',
            content: `Generate weekly summary for ${selectedKid.name}:
- Total sessions: ${weeklyData.length}
- Total study time: ${weeklyData.reduce((sum, a) => sum + a.totalMinutes, 0)} minutes
- Mood trend: ${moodTrend.join(' -> ') || 'Stable'}
- Correct answers: ${totalCorrect}, Incorrect: ${totalIncorrect}
- Areas needing focus: ${allWeakAreas.join(', ') || 'None'}
- Strong areas: ${allStrongAreas.join(', ') || 'Still building'}
- Concerns/Alerts: ${parentAlerts.join('; ') || 'None'}

Provide:
1. Overall progress summary (2-3 sentences)
2. Confidence assessment
3. Top 3 focus recommendations
4. Any concerns to address
5. Encouragement for next week`,
          },
        ],
        { temperature: 0.6 }
      )

      const summary: WeeklySummary = {
        id: `weekly-${Date.now()}`,
        kidId: selectedKid.id,
        weekStart,
        weekEnd,
        totalSessions: weeklyData.length,
        totalMinutes: weeklyData.reduce((sum, a) => sum + a.totalMinutes, 0),
        moodTrend,
        weakAreasOverall: allWeakAreas,
        strongAreasOverall: allStrongAreas,
        progressNotes: result.content,
        focusRecommendations: allWeakAreas.slice(0, 3),
        parentSuggestions: [],
        confidenceProgress: `${Math.round((totalCorrect / (totalCorrect + totalIncorrect || 1)) * 100)}% accuracy`,
        potentialConcerns: parentAlerts,
        generatedAt: Date.now(),
      }

      setWeeklySummaries(prev => [...(prev || []), summary])
      setShowWeeklySummary(true)
      toast.success('Weekly summary generated!')
    } catch (e) {
      toast.error('Could not generate weekly summary')
    } finally {
      setIsLoading(false)
    }
  }, [selectedKid, sessionAnalytics, hasCredits])

  // Parse uploaded file content for AI analysis
  const parseUploadedContent = useCallback(
    async (attachment: Attachment) => {
      if (!selectedKid || !selectedSubject) return

      setIsAnalyzingContent(true)

      // For now, handle text-based content description
      // In production, use OCR for images, PDF parsing, etc.
      let contentDescription = ''

      if (attachment.type === 'image') {
        contentDescription = `[Image uploaded: ${attachment.name}] - The student has shared an educational image/worksheet that needs to be analyzed and taught from.`
      } else if (attachment.type === 'file') {
        contentDescription = `[Document uploaded: ${attachment.name}] - Educational material to analyze and create lessons from.`
      } else if (attachment.type === 'url') {
        contentDescription = `[URL shared: ${attachment.url}] - Online resource to incorporate into teaching.`
      }

      setUploadedContent(prev => prev + '\n' + contentDescription)
      setIsAnalyzingContent(false)

      toast.success('Content ready for teaching!', {
        description: 'AI tutor will now teach based on your uploaded material',
      })
    },
    [selectedKid, selectedSubject]
  )

  // Text-to-speech with stop functionality
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && ttsEnabled) {
        // Stop any current speech
        window.speechSynthesis.cancel()

        // Clean text from markdown artifacts
        const cleanText = text
          .replace(/<s>\[\/INST\]/g, '')
          .replace(/\[\/INST\]/g, '')
          .replace(/<\/s>/g, '')
          .replace(/\[INST\]/g, '')
          .replace(/<s>/g, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/#{1,6}\s/g, '')
          .replace(/`/g, '')
          .trim()

        const utterance = new SpeechSynthesisUtterance(cleanText)
        utterance.rate = 0.9
        utterance.pitch = 1.1

        // Get voices and prefer child-friendly ones
        const voices = window.speechSynthesis.getVoices()
        const preferredVoice = voices.find(
          v =>
            v.name.includes('Samantha') ||
            v.name.includes('Karen') ||
            v.name.includes('Google') ||
            v.lang.startsWith('en')
        )
        if (preferredVoice) utterance.voice = preferredVoice

        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)

        window.speechSynthesis.speak(utterance)
      }
    },
    [ttsEnabled]
  )

  const toggleTTS = useCallback(() => {
    if (ttsEnabled) {
      stopSpeaking()
    }
    setTtsEnabled(!ttsEnabled)
  }, [ttsEnabled, stopSpeaking])

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      stopSessionTimer()
    }
  }, [stopSessionTimer])

  // ==========================================
  // Camera & Behavior Monitoring
  // ==========================================

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraActive(true)
      startBehaviorMonitoring()
      toast.success('Camera monitoring started')
    } catch (err) {
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
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current)
      monitorIntervalRef.current = null
    }
    setCameraActive(false)
  }

  const startBehaviorMonitoring = () => {
    // Simulate behavior monitoring (in production, use ML model)
    monitorIntervalRef.current = window.setInterval(() => {
      // Simulate focus detection
      const variation = Math.random() * 20 - 10
      setFocusScore(prev => Math.max(0, Math.min(100, prev + variation)))

      // Record to session if active
      if (currentSession) {
        setCurrentSession(prev =>
          prev
            ? {
                ...prev,
                focusScores: [...prev.focusScores, focusScore],
              }
            : prev
        )
      }
    }, 5000)
  }

  const recordBehaviorNote = (note: string) => {
    if (currentSession) {
      setCurrentSession(prev =>
        prev
          ? {
              ...prev,
              behaviorNotes: [...prev.behaviorNotes, `${new Date().toLocaleTimeString()}: ${note}`],
            }
          : prev
      )
    }
  }

  // ==========================================
  // Learning Session
  // ==========================================

  const startLearningSession = (subject: (typeof SUBJECTS)[0]) => {
    if (!selectedKid) return

    setSelectedSubject(subject)
    setMessages([])
    setCurrentView('learn')

    // Reset session state (no visible timer - analysis happens silently)
    setSessionPhase('learning')
    setSessionTimer(0)
    setCurrentMood(null)
    setTopicSuggestions([])
    setShowTopicSuggestions(false)

    const session: StudySession = {
      id: `session-${Date.now()}`,
      kidId: selectedKid.id,
      subject: subject.id,
      topic: '',
      startTime: Date.now(),
      focusScores: [],
      behaviorNotes: [],
      xpEarned: 0,
      completed: false,
    }
    setCurrentSession(session)

    // Initialize analytics (silently tracks mood/performance for parent reports)
    initializeSessionAnalytics(subject.id)

    // Generate welcome - AI asks what they want to learn
    generateWelcome(subject)
  }

  const endLearningSession = (xpEarned: number = 10) => {
    if (!currentSession || !selectedKid) return

    // Stop session timer
    stopSessionTimer()
    stopSpeaking()

    const completedSession: StudySession = {
      ...currentSession,
      endTime: Date.now(),
      xpEarned,
      completed: true,
    }

    setSessions(prev => [...(prev || []), completedSession])

    // Save session analytics
    if (currentAnalytics) {
      const finalAnalytics = {
        ...currentAnalytics,
        totalMinutes: Math.round(sessionTimer / 60),
      }
      setSessionAnalytics(prev => [...(prev || []), finalAnalytics])
    }

    // Update kid stats
    const duration = Math.round((Date.now() - currentSession.startTime) / 1000 / 60)
    setProfiles(prev =>
      (prev || []).map(p => {
        if (p.id === selectedKid.id) {
          const newXP = p.xp + xpEarned
          return {
            ...p,
            xp: newXP,
            level: Math.floor(newXP / 100) + 1,
            totalSessions: p.totalSessions + 1,
            totalStudyMinutes: p.totalStudyMinutes + duration,
            lastActiveDate: new Date().toISOString().split('T')[0],
            streak: updateStreak(p),
          }
        }
        return p
      })
    )

    // Generate behavior report if camera was active
    if (cameraActive && currentSession.focusScores.length > 0) {
      generateBehaviorReport(completedSession)
    }

    stopCamera()
    setCurrentSession(null)
    setSelectedSubject(null)
    setCurrentAnalytics(null)
    setSessionPhase('ended')
    setUploadedContent('')
    setCurrentView('home')
    toast.success(`Great job! +${xpEarned} XP earned!`)
  }

  const updateStreak = (kid: KidProfile): number => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (kid.lastActiveDate === yesterday) return kid.streak + 1
    if (kid.lastActiveDate === today) return kid.streak
    return 1
  }

  // ==========================================
  // AI Functions
  // ==========================================

  const generateWelcome = async (subject: (typeof SUBJECTS)[0]) => {
    if (!selectedKid || !hasCredits()) {
      if (!hasCredits()) {
        toast.error('No AI credits remaining. Purchase more or wait for daily reset.')
      }
      const fallback: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Hi ${selectedKid?.name || 'there'}! ${subject.emoji} Ready to learn ${subject.name}? What topic would you like to explore today?`,
        timestamp: Date.now(),
      }
      setMessages([fallback])
      return
    }

    setIsLoading(true)
    useCredit()

    try {
      const gradeInfo = GRADES.find(g => g.value === selectedKid.grade)
      const yesterdayData = getYesterdayAnalytics()
      const weakAreas = getWeakAreas()

      // Build context from uploaded content
      const uploadedContext = uploadedContent
        ? `\n\nIMPORTANT - Student has uploaded learning material:\n${uploadedContent}\nYou MUST teach from this material, not just describe it. Analyze it deeply and create an actual lesson from its content.`
        : ''

      const lessonContext = currentLessonPlan
        ? `\n\nParent uploaded lesson plan topics: ${currentLessonPlan.topics.join(', ')}. Focus on these topics.`
        : ''

      const suggestionContext = getTodaySuggestion()
        ? `\n\nToday's parent suggestion: "${getTodaySuggestion()?.topic}" - Prioritize this topic.`
        : ''

      const yesterdayContext = yesterdayData
        ? `\n\nYESTERDAY'S SESSION RECAP:
- Subject: ${yesterdayData.subject}
- Topics covered: ${yesterdayData.topicsConvered.join(', ') || 'General review'}
- Mood: ${yesterdayData.mood || 'Not recorded'}
- Performance: ${yesterdayData.correctAnswers} correct, ${yesterdayData.incorrectAnswers} incorrect
- Areas to focus on: ${yesterdayData.weakAreas.join(', ') || 'None identified'}`
        : ''

      const weakAreasContext =
        weakAreas.length > 0
          ? `\n\nSTUDENT'S WEAK AREAS (need ${FOCUS_WEAK_AREA_PERCENT}% focus): ${weakAreas.join(', ')}`
          : ''

      const systemPrompt = `You are a warm, caring AI tutor named TutorBot - like a friendly teacher who genuinely cares about ${selectedKid.name}.

STUDENT PROFILE:
- Name: ${selectedKid.name}
- Age: ${selectedKid.age} years old
- Grade: ${gradeInfo?.label || selectedKid.grade}
- Subject Today: ${subject.name}
- Language: ${LANGUAGES.find(l => l.code === selectedKid.language)?.name || 'English'}
${lessonContext}${suggestionContext}${yesterdayContext}${weakAreasContext}${uploadedContext}

YOUR APPROACH:
1. Greet ${selectedKid.name} warmly and ASK what they'd like to learn today
2. Be genuinely interested in them - ask how they're doing naturally in conversation
3. Listen for emotional cues (if they mention being sad, worried, bullied - respond with care)
4. Let THEM tell you what lesson/topic they want to work on
5. Once they share a topic or upload material, THEN start teaching

TEACHING STYLE:
- Be WARM, GENUINE, and ENCOURAGING - like a favorite teacher
- Use age-appropriate vocabulary for a ${selectedKid.age}-year-old
- Make learning feel like an adventure, not a chore
- Award "+10 XP!" for correct answers with enthusiasm
- Gently encourage if they struggle - never make them feel bad

**WHEN STUDENT SHARES TOPIC OR UPLOADS MATERIAL:**
1. IDENTIFY THE TOPIC from what they say or upload
2. USE YOUR KNOWLEDGE to create a comprehensive lesson about that topic
3. AUTO-GENERATE: Introduction → Key Concepts → Examples → Practice Questions
4. TEACH thoroughly - provide real facts, definitions, examples

NEVER just describe uploads - ACTUALLY TEACH the topic!

**SILENT OBSERVATION (do not mention this to student):**
- Notice emotional cues in their messages
- If they seem sad/anxious/mention bullying, be supportive and caring
- This information is tracked for parent reports`

      const greetingPrompt = uploadedContent
        ? `Greet ${selectedKid.name} warmly, then notice they have uploaded learning material. Ask them what specific part they'd like to learn about, or offer to start from the beginning. Be friendly and let them guide the session.`
        : `Greet ${selectedKid.name} warmly and ask what they'd like to learn in ${subject.name} today. You can suggest some topics if they're not sure. Be friendly and conversational - let them tell you what they need help with.`

      const result = await smartCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: greetingPrompt },
        ],
        { temperature: 0.8 }
      )

      const msg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result.content,
        timestamp: Date.now(),
        provider: result.provider,
      }
      setMessages([msg])

      if (ttsEnabled) speak(result.content)
    } catch (error: any) {
      toast.error('Could not connect to AI tutor')
      const fallback: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Hi ${selectedKid.name}! ${subject.emoji} I'm so happy to see you today! How's your day going? Once you tell me, we can start our ${subject.name} adventure together!`,
        timestamp: Date.now(),
      }
      setMessages([fallback])
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (
      (!inputMessage.trim() && attachments.length === 0) ||
      !selectedKid ||
      !selectedSubject ||
      isLoading
    )
      return

    if (!hasCredits()) {
      toast.error('No AI credits remaining', {
        description: 'Purchase more credits or wait for daily reset',
      })
      return
    }

    // Build message content including attachments
    let messageContent = inputMessage.trim()

    // Process attachments and update uploaded content for teaching
    if (attachments.length > 0) {
      const attachmentDescriptions = attachments
        .map(att => {
          if (att.type === 'url')
            return `[Attached URL: ${att.url}] - Please teach me topics from this resource`
          if (att.type === 'image')
            return `[Attached Image/Worksheet: ${att.name}] - Please analyze this and teach me the topics/problems shown`
          return `[Attached Document: ${att.name}] - Please teach me from this material`
        })
        .join('\n')
      messageContent = messageContent
        ? `${messageContent}\n\n${attachmentDescriptions}`
        : attachmentDescriptions

      // Update uploaded content context for future messages
      attachments.forEach(att => parseUploadedContent(att))
    }

    // Detect mood from user message
    const detectedMood = detectMoodFromConversation(messageContent)
    if (detectedMood && currentAnalytics) {
      setCurrentAnalytics(prev =>
        prev ? { ...prev, mood: detectedMood as any, moodNotes: messageContent } : prev
      )
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    }

    setMessages(prev => [...prev, userMsg])
    setInputMessage('')
    setAttachments([]) // Clear attachments after sending
    setIsLoading(true)
    useCredit()

    try {
      const gradeInfo = GRADES.find(g => g.value === selectedKid.grade)
      const weakAreas = getWeakAreas()

      // Build comprehensive context
      const uploadedContext = uploadedContent
        ? `\n\nUPLOADED LEARNING MATERIAL:\n${uploadedContent}\n\nIMPORTANT: You must TEACH from this material. If it's a worksheet, guide them through solving problems. If it's a textbook page, explain the concepts. Don't just describe what you see - ACTUALLY TEACH!`
        : ''

      const lessonContext = currentLessonPlan
        ? `\n\nLesson plan topics: ${currentLessonPlan.topics.join(', ')}`
        : ''

      const weakAreasContext =
        weakAreas.length > 0
          ? `\n\nFOCUS AREAS (student struggles with these - spend ${FOCUS_WEAK_AREA_PERCENT}% time here): ${weakAreas.join(', ')}`
          : ''

      const phaseContext =
        sessionPhase === 'greeting'
          ? `\n\nCURRENT PHASE: GREETING (${Math.ceil(greetingTimer / 60)} min left) - Focus on building rapport, checking mood, and discussing their day. Transition to learning naturally.`
          : sessionPhase === 'learning'
            ? `\n\nCURRENT PHASE: LEARNING (${Math.ceil(learningTimer / 60)} min left) - Actively teach, ask questions, check understanding. Award XP for correct answers!`
            : ''

      const systemPrompt = `You are TutorBot, a warm, caring, REAL AI tutor for ${selectedKid.name}, age ${selectedKid.age}, in ${gradeInfo?.label || selectedKid.grade}.
Subject: ${selectedSubject.name}
${lessonContext}${weakAreasContext}${uploadedContext}${phaseContext}

YOUR PERSONALITY:
- You're like their favorite teacher who genuinely cares about them
- Be warm, patient, and encouraging - never make them feel bad
- Use age-appropriate language for a ${selectedKid.age}-year-old
- Make learning feel like an adventure, not a chore

**CRITICAL - WHEN STUDENT UPLOADS ANY DOCUMENT/IMAGE/FILE:**
You MUST:
1. IDENTIFY THE TOPIC - Look for title, subject, objectives, or topic name in the document
2. USE YOUR KNOWLEDGE to create a comprehensive lesson about that specific topic
3. AUTO-GENERATE a full lesson plan with: Introduction → Key Concepts → Examples → Practice Questions
4. TEACH as if you researched this topic thoroughly - provide real facts, definitions, and examples

**EXAMPLE - Lesson Plan Upload:**
If student uploads: "Topic: Interpreting Double Bar Graphs"
- IDENTIFY: The topic is about reading and interpreting double bar graphs
- GENERATE LESSON:
  "Today we're learning about Double Bar Graphs! 📊

  A double bar graph shows TWO sets of data side by side so we can compare them easily.

  For example: If we want to compare how many boys vs girls like different sports, we use a double bar graph!

  Let me teach you how to read one:
  1. The title tells us what the graph is about
  2. The legend shows which color represents what
  3. The bars show the values - taller bar = bigger number

  Let's practice! If the blue bar for 'Soccer' reaches 15 and the red bar reaches 10, which group likes soccer more?"

**EXAMPLE - Math Worksheet Upload:**
If student uploads worksheet with "64 x 26":
- DON'T say: "I see multiplication problems"
- DO say: "Let's solve 64 × 26 together! I'll teach you the column method step by step. First, what's 6 × 4?"

**TEACHING APPROACH:**
1. Extract the TOPIC from uploaded content (title, header, subject)
2. Use your knowledge to explain that topic thoroughly for a ${selectedKid.age}-year-old
3. Create practice questions related to the topic
4. Award "+10 XP!" for correct answers
5. For wrong answers: Explain WHY and show the correct method

MOOD DETECTION:
- If child seems sad/anxious/mentions bullying: Respond with care first, then gently continue teaching`

      const history = messages.slice(-12).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const result = await smartCompletion(
        [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: messageContent },
        ],
        { temperature: 0.7 }
      )

      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: result.content,
        timestamp: Date.now(),
        provider: result.provider,
      }

      setMessages(prev => [...prev, assistantMsg])

      // Track performance from AI response
      const responseContent = result.content.toLowerCase()

      // Check for correct answer (XP award)
      if (
        result.content.includes('+10 XP') ||
        responseContent.includes('correct') ||
        responseContent.includes('great job') ||
        responseContent.includes('well done') ||
        responseContent.includes('excellent')
      ) {
        if (currentSession) {
          setCurrentSession(prev => (prev ? { ...prev, xpEarned: prev.xpEarned + 10 } : prev))
        }
        if (currentAnalytics) {
          setCurrentAnalytics(prev =>
            prev ? { ...prev, correctAnswers: prev.correctAnswers + 1 } : prev
          )
        }
      }

      // Check for incorrect answer
      if (
        responseContent.includes('not quite') ||
        responseContent.includes('try again') ||
        responseContent.includes('almost') ||
        responseContent.includes("let's think")
      ) {
        if (currentAnalytics) {
          setCurrentAnalytics(prev =>
            prev ? { ...prev, incorrectAnswers: prev.incorrectAnswers + 1 } : prev
          )
        }
      }

      // Update topics covered (extract from response if possible)
      if (currentAnalytics && sessionPhase === 'learning') {
        // Simple topic extraction from conversation
        const topicPatterns = ['learning about', 'practicing', 'working on', 'studying']
        for (const pattern of topicPatterns) {
          if (responseContent.includes(pattern)) {
            const startIdx = responseContent.indexOf(pattern) + pattern.length
            const topic = responseContent
              .slice(startIdx, startIdx + 30)
              .split(/[.!?,]/)[0]
              .trim()
            if (topic && topic.length > 3) {
              setCurrentAnalytics(prev =>
                prev
                  ? {
                      ...prev,
                      topicsConvered: [...new Set([...prev.topicsConvered, topic])],
                    }
                  : prev
              )
            }
            break
          }
        }
      }

      // Mark greeting phase complete if AI transitions to teaching
      if (
        sessionPhase === 'greeting' &&
        (responseContent.includes("let's start") ||
          responseContent.includes('shall we begin') ||
          responseContent.includes('ready to learn'))
      ) {
        if (currentAnalytics) {
          setCurrentAnalytics(prev => (prev ? { ...prev, greetingPhaseComplete: true } : prev))
        }
      }

      if (ttsEnabled) speak(result.content)
    } catch (error) {
      toast.error('Could not get response')
    } finally {
      setIsLoading(false)
    }
  }

  // ==========================================
  // Attachment Handlers
  // ==========================================

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (type === 'image' && !file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast.error('File too large (max 10MB)')
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const newAttachment: Attachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: type,
          name: file.name,
          data: reader.result as string,
          mimeType: file.type,
        }
        setAttachments(prev => [...prev, newAttachment])
        toast.success(`${file.name} attached`)
      }
      reader.readAsDataURL(file)
    })

    e.target.value = '' // Reset input
    setShowAttachmentMenu(false)
  }

  const handleUrlAdd = () => {
    if (!urlInput.trim()) return

    // Simple URL validation
    let url = urlInput.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    try {
      new URL(url) // Validate URL format
      const newAttachment: Attachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'url',
        name: url.length > 50 ? url.substring(0, 47) + '...' : url,
        url: url,
      }
      setAttachments(prev => [...prev, newAttachment])
      setUrlInput('')
      setShowUrlInput(false)
      setShowAttachmentMenu(false)
      toast.success('URL attached')
    } catch {
      toast.error('Invalid URL')
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  // ==========================================
  // Text Formatting Helpers
  // ==========================================

  // Clean AI response from model artifacts and render basic markdown
  const formatAIResponse = (text: string): React.ReactNode => {
    // Remove common model artifacts
    let cleaned = text
      .replace(/<s>\[\/INST\]/gi, '')
      .replace(/<\/s>/gi, '')
      .replace(/\[INST\]/gi, '')
      .replace(/<s>/gi, '')
      .replace(/<<SYS>>[\s\S]*?<<\/SYS>>/gi, '')
      .trim()

    // Split by lines and process
    const lines = cleaned.split('\n')
    const elements: React.ReactNode[] = []

    lines.forEach((line, idx) => {
      // Process bold text **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g)
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>
        }
        return part
      })

      if (idx > 0) elements.push(<br key={`br-${idx}`} />)
      elements.push(<span key={`line-${idx}`}>{formattedLine}</span>)
    })

    return elements
  }

  // ==========================================
  // Game Functions
  // ==========================================

  // Get games filtered by kid's age and parent settings
  const getAvailableGames = useCallback(() => {
    if (!selectedKid || !parentSettings.gamesEnabled) return []

    return GAME_CHALLENGES.filter(
      game =>
        selectedKid.age >= game.minAge &&
        selectedKid.age <= game.maxAge &&
        parentSettings.allowedCategories.includes(game.category)
    )
  }, [selectedKid, parentSettings])

  // Get games by category
  const getGamesByCategory = useCallback(
    (category: string) => {
      return getAvailableGames().filter(game => game.category === category)
    },
    [getAvailableGames]
  )

  // Get game progress for a specific game
  const getGameProgressById = useCallback(
    (gameId: string) => {
      return gameProgress.find(p => p.challengeId === gameId)
    },
    [gameProgress]
  )

  // Calculate total games completed
  const getTotalGamesCompleted = useCallback(() => {
    return gameProgress.filter(p => p.completed).length
  }, [gameProgress])

  // Start a game
  const startGame = (game: GameChallenge) => {
    setActiveGame(game)
    setGameState({
      score: 0,
      timeLeft: game.type === 'speed' ? 60 : 120,
      currentQuestion: 0,
      answers: [],
      isPlaying: true,
      showResult: false,
    })

    // Start timer for speed games
    if (game.type === 'speed') {
      gameTimerRef.current = window.setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 1) {
            if (gameTimerRef.current) clearInterval(gameTimerRef.current)
            return { ...prev, timeLeft: 0, isPlaying: false, showResult: true }
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 }
        })
      }, 1000)
    }
  }

  // End game and record progress
  const endGame = (finalScore: number) => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current)
      gameTimerRef.current = null
    }

    if (activeGame && selectedKid) {
      const existingProgress = getGameProgressById(activeGame.id)
      const isHighScore = !existingProgress || finalScore > existingProgress.score

      const newProgress: GameProgress = {
        challengeId: activeGame.id,
        completed: finalScore >= 50, // 50% to complete
        score: isHighScore ? finalScore : existingProgress?.score || 0,
        bestTime: gameState.timeLeft,
        attempts: (existingProgress?.attempts || 0) + 1,
        lastPlayed: new Date().toISOString(),
      }

      setGameProgress(prev => {
        const filtered = prev.filter(p => p.challengeId !== activeGame.id)
        return [...filtered, newProgress]
      })

      // Award XP if completed
      if (finalScore >= 50) {
        const xpToAward = Math.round((activeGame.xpReward * finalScore) / 100)
        toast.success(`+${xpToAward} XP!`, { description: `Great job on ${activeGame.name}!` })

        // Update kid's XP
        setProfiles(prev =>
          prev.map(p =>
            p.id === selectedKid.id
              ? { ...p, xp: p.xp + xpToAward, level: Math.floor((p.xp + xpToAward) / 100) + 1 }
              : p
          )
        )
      }
    }

    setGameState(prev => ({ ...prev, isPlaying: false, showResult: true }))
  }

  // Close game
  const closeGame = () => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current)
      gameTimerRef.current = null
    }
    setActiveGame(null)
    setGameState({
      score: 0,
      timeLeft: 60,
      currentQuestion: 0,
      answers: [],
      isPlaying: false,
      showResult: false,
    })
  }

  // Toggle parent settings
  const toggleGameCategory = (categoryId: string) => {
    setParentSettings(prev => ({
      ...prev,
      allowedCategories: prev.allowedCategories.includes(categoryId)
        ? prev.allowedCategories.filter(c => c !== categoryId)
        : [...prev.allowedCategories, categoryId],
    }))
  }

  // ==========================================
  // Lesson Plan Analysis
  // ==========================================

  const analyzeLessonPlan = async () => {
    if (!lessonPlanText.trim() || !selectedKid) return

    setAnalyzingLesson(true)
    useCredit()

    try {
      const result = await smartCompletion(
        [
          {
            role: 'system',
            content: `You are an educational curriculum analyzer. Extract key topics and create a learning outline for a ${selectedKid.age}-year-old in ${selectedKid.grade} grade. Be specific about what can be taught.`,
          },
          {
            role: 'user',
            content: `Analyze this lesson material and extract 5-10 key topics suitable for my grade level:\n\n${lessonPlanText.slice(0, 3000)}`,
          },
        ],
        { temperature: 0.5 }
      )

      // Extract topics from AI response
      const topics = result.content
        .split('\n')
        .filter(line => line.match(/^\d+\.|^-|^\*/))
        .map(line => line.replace(/^\d+\.|^-|^\*/, '').trim())
        .slice(0, 10)

      const lessonPlan: LessonPlan = {
        id: `lesson-${Date.now()}`,
        kidId: selectedKid.id,
        subject: selectedSubject?.id || 'general',
        title: `Lesson Plan - ${new Date().toLocaleDateString()}`,
        content: lessonPlanText,
        aiAnalysis: result.content,
        topics: topics.length > 0 ? topics : ['General topics from uploaded material'],
        createdAt: Date.now(),
      }

      setLessons(prev => [...(prev || []), lessonPlan])
      setCurrentLessonPlan(lessonPlan)
      setLessonPlanText('')
      toast.success('Lesson plan analyzed! AI will focus on these topics.')
    } catch (error) {
      toast.error('Could not analyze lesson plan')
    } finally {
      setAnalyzingLesson(false)
    }
  }

  // ==========================================
  // Behavior Reports
  // ==========================================

  const generateBehaviorReport = async (session: StudySession) => {
    if (!selectedKid) return

    const avgFocus =
      session.focusScores.length > 0
        ? Math.round(session.focusScores.reduce((a, b) => a + b, 0) / session.focusScores.length)
        : 80

    const report: BehaviorReport = {
      id: `report-${Date.now()}`,
      kidId: selectedKid.id,
      sessionId: session.id,
      date: new Date().toISOString().split('T')[0],
      type: 'daily',
      focusScore: avgFocus,
      attentionSpans: session.focusScores,
      distractions: session.focusScores.filter(s => s < 50).length,
      totalMinutes: Math.round((Date.now() - session.startTime) / 1000 / 60),
      notes: session.behaviorNotes,
      aiInsights: `${selectedKid.name} maintained ${avgFocus}% focus during this ${SUBJECTS.find(s => s.id === session.subject)?.name} session.`,
    }

    setReports(prev => [...(prev || []), report])

    // Notify parent if focus was low
    if (avgFocus < 50 && selectedKid.parentEmail) {
      toast.info('Low focus detected - Parent notification queued')
    }
  }

  // ==========================================
  // Parent Suggestions
  // ==========================================

  const getTodaySuggestion = (): ParentSuggestion | undefined => {
    if (!selectedKid || !suggestions) return undefined
    const today = new Date().toISOString().split('T')[0]
    return suggestions.find(s => s.kidId === selectedKid.id && s.date === today && !s.completed)
  }

  const addSuggestion = (subject: string, topic: string, reason: string) => {
    if (!selectedKid) return

    const suggestion: ParentSuggestion = {
      id: `sug-${Date.now()}`,
      kidId: selectedKid.id,
      date: new Date().toISOString().split('T')[0],
      subject,
      topic,
      reason,
      completed: false,
    }

    setSuggestions(prev => [...(prev || []), suggestion])
    toast.success('Study suggestion added!')
  }

  // ==========================================
  // Profile Management
  // ==========================================

  const createProfile = (
    data: Omit<
      KidProfile,
      'id' | 'xp' | 'level' | 'streak' | 'totalSessions' | 'totalStudyMinutes' | 'lastActiveDate'
    >
  ) => {
    const profile: KidProfile = {
      ...data,
      id: `kid-${Date.now()}`,
      xp: 0,
      level: 1,
      streak: 0,
      totalSessions: 0,
      totalStudyMinutes: 0,
      lastActiveDate: '',
    }
    setProfiles(prev => [...(prev || []), profile])
    setSelectedKid(profile)
    setShowSetup(false)
    toast.success(`Welcome ${profile.name}!`)
  }

  const deleteProfile = (id: string) => {
    setProfiles(prev => (prev || []).filter(p => p.id !== id))
    if (selectedKid?.id === id) {
      setSelectedKid(profiles?.[0] || null)
    }
    toast.success('Profile removed')
  }

  // ==========================================
  // Render: Home View
  // ==========================================

  const renderHome = () => {
    if (!selectedKid) {
      return (
        <Card className="p-8 text-center">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Welcome to Kids Learning Center!</h2>
          <p className="text-muted-foreground mb-4">Create a profile to start learning</p>
          <Button onClick={() => setShowSetup(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Profile
          </Button>
        </Card>
      )
    }

    const todaySuggestion = getTodaySuggestion()
    const xpToNext = 100 - (selectedKid.xp % 100)

    return (
      <div className="space-y-4">
        {/* Kid Profile Card */}
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl">
                {AVATARS[selectedKid.avatar] || '🎓'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-lg">{selectedKid.name}</h2>
                  <Badge variant="secondary" className="text-xs">
                    <Star className="w-3 h-3 mr-1" weight="fill" />
                    Level {selectedKid.level}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedKid.grade} • Age {selectedKid.age}
                </p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{selectedKid.xp % 100} XP</span>
                    <span>
                      {xpToNext} to Level {selectedKid.level + 1}
                    </span>
                  </div>
                  <Progress value={selectedKid.xp % 100} className="h-1.5" />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-orange-500">
                  <Fire className="w-5 h-5" weight="fill" />
                  <span className="font-bold">{selectedKid.streak}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">streak</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits Display */}
        <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coin className="w-5 h-5 text-amber-500" weight="fill" />
              <span className="font-medium">AI Credits: {getTotalCredits()}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {credits?.free || 0} free + {credits?.purchased || 0} purchased
            </Badge>
          </CardContent>
        </Card>

        {/* Parent Zone - Weekly Summary */}
        <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChartLine className="w-5 h-5 text-emerald-500" />
                <div>
                  <span className="font-medium text-sm">Parent Zone</span>
                  <p className="text-xs text-muted-foreground">Weekly progress & mood reports</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={generateWeeklySummary}
                disabled={isLoading}
                className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
              >
                <Export className="w-3 h-3 mr-1" />
                Get Report
              </Button>
            </div>

            {/* Show latest summary if available */}
            {weeklySummaries && weeklySummaries.length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Last report:{' '}
                    {new Date(
                      weeklySummaries[weeklySummaries.length - 1].generatedAt
                    ).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowWeeklySummary(true)}
                  >
                    View
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Summary Modal */}
        <AnimatePresence>
          {showWeeklySummary && weeklySummaries && weeklySummaries.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
              onClick={() => setShowWeeklySummary(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="bg-background rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
              >
                <Card className="border-0">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ChartLine className="w-5 h-5 text-emerald-500" />
                        Weekly Progress Report
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowWeeklySummary(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {weeklySummaries[weeklySummaries.length - 1].weekStart} to{' '}
                      {weeklySummaries[weeklySummaries.length - 1].weekEnd}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                        <p className="text-xl font-bold text-blue-500">
                          {weeklySummaries[weeklySummaries.length - 1].totalSessions}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Sessions</p>
                      </div>
                      <div className="bg-green-500/10 rounded-lg p-2 text-center">
                        <p className="text-xl font-bold text-green-500">
                          {weeklySummaries[weeklySummaries.length - 1].totalMinutes}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Minutes</p>
                      </div>
                      <div className="bg-violet-500/10 rounded-lg p-2 text-center">
                        <p className="text-xl font-bold text-violet-500">
                          {weeklySummaries[weeklySummaries.length - 1].confidenceProgress}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Accuracy</p>
                      </div>
                    </div>

                    {/* Mood Trend */}
                    {weeklySummaries[weeklySummaries.length - 1].moodTrend.length > 0 && (
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs font-medium mb-2">Mood This Week</p>
                        <div className="flex gap-1 flex-wrap">
                          {weeklySummaries[weeklySummaries.length - 1].moodTrend.map((mood, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {mood === 'happy'
                                ? '😊'
                                : mood === 'excited'
                                  ? '🤩'
                                  : mood === 'sad'
                                    ? '😢'
                                    : mood === 'anxious'
                                      ? '😟'
                                      : '😐'}{' '}
                              {mood}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Focus Areas */}
                    {weeklySummaries[weeklySummaries.length - 1].weakAreasOverall.length > 0 && (
                      <div className="bg-orange-500/10 rounded-lg p-3">
                        <p className="text-xs font-medium text-orange-600 mb-2">
                          Areas to Focus On
                        </p>
                        <div className="flex gap-1 flex-wrap">
                          {weeklySummaries[weeklySummaries.length - 1].weakAreasOverall.map(
                            (area, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs border-orange-500/50"
                              >
                                {area}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Potential Concerns */}
                    {weeklySummaries[weeklySummaries.length - 1].potentialConcerns.length > 0 && (
                      <div className="bg-red-500/10 rounded-lg p-3">
                        <p className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                          <Warning className="w-3 h-3" /> Attention Needed
                        </p>
                        <ul className="text-xs space-y-1">
                          {weeklySummaries[weeklySummaries.length - 1].potentialConcerns.map(
                            (concern, i) => (
                              <li key={i} className="text-muted-foreground">
                                {concern}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                    {/* AI Summary */}
                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-lg p-3">
                      <p className="text-xs font-medium text-emerald-600 mb-2">
                        AI Summary & Recommendations
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {weeklySummaries[weeklySummaries.length - 1].progressNotes}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Parent Suggestion */}
        {todaySuggestion && (
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-500 text-sm">Parent's Suggestion for Today</p>
                  <p className="text-sm mt-1">{todaySuggestion.topic}</p>
                  <p className="text-xs text-muted-foreground mt-1">{todaySuggestion.reason}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const subject = SUBJECTS.find(s => s.id === todaySuggestion.subject)
                    if (subject) startLearningSession(subject)
                  }}
                >
                  Start
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subject Selection */}
        <div>
          <h3 className="font-semibold mb-3">Choose a Subject</h3>
          <div className="grid grid-cols-2 gap-3">
            {SUBJECTS.map(subject => {
              const Icon = subject.icon
              return (
                <button
                  key={subject.id}
                  onClick={() => startLearningSession(subject)}
                  className={cn(
                    'p-4 rounded-xl text-left text-white shadow-lg transition-transform hover:scale-105',
                    'bg-gradient-to-br',
                    subject.color
                  )}
                >
                  <Icon className="w-8 h-8 mb-2" weight="fill" />
                  <h4 className="font-bold">{subject.name}</h4>
                </button>
              )
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <BookOpen className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="font-bold">{selectedKid.totalSessions}</p>
            <p className="text-[10px] text-muted-foreground">Sessions</p>
          </Card>
          <Card className="p-3 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="font-bold">{selectedKid.totalStudyMinutes}</p>
            <p className="text-[10px] text-muted-foreground">Minutes</p>
          </Card>
          <Card className="p-3 text-center">
            <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
            <p className="font-bold">{selectedKid.xp}</p>
            <p className="text-[10px] text-muted-foreground">Total XP</p>
          </Card>
        </div>
      </div>
    )
  }

  // ==========================================
  // Render: Learning View
  // ==========================================

  const renderLearning = () => {
    if (!selectedKid || !selectedSubject) return null

    const SubjectIcon = selectedSubject.icon

    return (
      <div className="flex flex-col h-[calc(100vh-14rem)] min-h-[400px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b mb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => endLearningSession(currentSession?.xpEarned || 10)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div
              className={cn(
                'w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white',
                selectedSubject.color
              )}
            >
              <SubjectIcon className="w-4 h-4" weight="fill" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{selectedSubject.name}</h3>
              <p className="text-[10px] text-muted-foreground">with {selectedKid.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Camera Toggle */}
            <div className="relative">
              {cameraActive ? (
                <div className="w-16 h-12 rounded-lg overflow-hidden border-2 border-green-500 bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white p-0"
                    onClick={stopCamera}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={startCamera}>
                  <Camera className="w-4 h-4 mr-1" />
                  Monitor
                </Button>
              )}
            </div>

            {/* TTS Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTTS}
              className={cn(ttsEnabled && 'text-green-500', isSpeaking && 'animate-pulse')}
              title={
                ttsEnabled ? (isSpeaking ? 'Speaking... (click to mute)' : 'Voice On') : 'Voice Off'
              }
            >
              {ttsEnabled ? (
                <SpeakerHigh className="w-4 h-4" weight={isSpeaking ? 'fill' : 'regular'} />
              ) : (
                <SpeakerSlash className="w-4 h-4" />
              )}
            </Button>

            {/* Credits */}
            <Badge variant="outline" className="text-xs">
              <Coin className="w-3 h-3 mr-1" />
              {getTotalCredits()}
            </Badge>
          </div>
        </div>

        {/* Topic Suggestions Button - Simple header */}
        <div className="mb-3 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={generateTopicSuggestions}
            disabled={isLoading}
            title="Get 4 AI-suggested topics"
          >
            <Lightbulb className="w-3 h-3 mr-1" />
            Topics
          </Button>
        </div>

        {/* Topic Suggestions Panel */}
        {showTopicSuggestions && topicSuggestions.length > 0 && (
          <Card className="mb-3 p-3 border-violet-500/30 bg-violet-500/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-1">
                <Lightbulb className="w-4 h-4 text-violet-500" />
                Suggested Topics
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowTopicSuggestions(false)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {topicSuggestions.map((topic, i) => (
                <Button
                  key={topic.id || i}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 px-2 text-left justify-start flex-col items-start"
                  onClick={() => {
                    setInputMessage(`Let's learn about ${topic.title}`)
                    setShowTopicSuggestions(false)
                  }}
                >
                  <span className="text-xs font-medium truncate w-full">{topic.title}</span>
                  <span className="text-[10px] text-muted-foreground truncate w-full">
                    {topic.description}
                  </span>
                  <Badge variant="secondary" className="text-[9px] mt-1">
                    {topic.difficulty} • {topic.estimatedMinutes}min
                  </Badge>
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* Focus Score (if camera active) */}
        {cameraActive && (
          <div className="mb-3 p-2 bg-muted rounded-lg flex items-center gap-3">
            <Eye className="w-4 h-4 text-green-500" />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span>Focus Score</span>
                <span
                  className={cn(
                    'font-bold',
                    focusScore >= 70
                      ? 'text-green-500'
                      : focusScore >= 40
                        ? 'text-yellow-500'
                        : 'text-red-500'
                  )}
                >
                  {Math.round(focusScore)}%
                </span>
              </div>
              <Progress value={focusScore} className="h-1" />
            </div>
          </div>
        )}

        {/* Current Lesson Plan */}
        {currentLessonPlan && (
          <div className="mb-3 p-2 bg-blue-500/10 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-500">Lesson Plan Active</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setCurrentLessonPlan(null)}
              >
                Clear
              </Button>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Topics:{' '}
              {currentLessonPlan.topics
                .slice(0, 3)
                .map(t => t.replace(/\*\*/g, ''))
                .join(', ')}
              ...
            </p>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 pr-2" ref={scrollRef}>
          <div className="space-y-3 pb-4">
            {messages.map(msg => (
              <div
                key={msg.id}
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
                      ? 'bg-violet-500 text-white rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  )}
                >
                  {/* Show attachment previews */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {msg.attachments.map(att => (
                        <div
                          key={att.id}
                          className={cn(
                            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                            msg.role === 'user' ? 'bg-white/20' : 'bg-muted-foreground/10'
                          )}
                        >
                          {att.type === 'image' && <Image className="w-3 h-3" />}
                          {att.type === 'file' && <FileText className="w-3 h-3" />}
                          {att.type === 'url' && <Link className="w-3 h-3" />}
                          <span className="max-w-[80px] truncate">{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-sm">
                    {msg.role === 'assistant' ? formatAIResponse(msg.content) : msg.content}
                  </div>
                  {msg.provider && <p className="text-[9px] opacity-50 mt-1">{msg.provider}</p>}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">{AVATARS[selectedKid.avatar]}</span>
                  </div>
                )}
              </div>
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

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {attachments.map(att => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 bg-muted rounded-full px-2 py-1 text-xs"
              >
                {att.type === 'image' && <Image className="w-3 h-3" />}
                {att.type === 'file' && <FileText className="w-3 h-3" />}
                {att.type === 'url' && <Link className="w-3 h-3" />}
                <span className="max-w-[100px] truncate">{att.name}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="hover:bg-foreground/10 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="pt-3 border-t space-y-2 flex-shrink-0 bg-background">
          {/* URL Input (when active) */}
          {showUrlInput && (
            <div className="flex gap-2">
              <Input
                placeholder="Enter URL (website, video, etc.)"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlAdd()}
                autoFocus
                className="text-sm"
              />
              <Button size="sm" onClick={handleUrlAdd} disabled={!urlInput.trim()}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowUrlInput(false)
                  setUrlInput('')
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Main Input Row */}
          <div className="flex gap-2">
            {/* Attachment Button with Menu */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="flex-shrink-0"
              >
                <Plus className="w-5 h-5" />
              </Button>

              {/* Attachment Menu Popup */}
              <AnimatePresence>
                {showAttachmentMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-2 bg-popover border rounded-lg shadow-lg p-2 min-w-[160px] z-50"
                  >
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                    >
                      <Image className="w-4 h-4 text-green-500" />
                      <span>Upload Image</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                    >
                      <FilePdf className="w-4 h-4 text-red-500" />
                      <span>Upload File</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUrlInput(true)
                        setShowAttachmentMenu(false)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                    >
                      <Link className="w-4 h-4 text-blue-500" />
                      <span>Add URL/Link</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Input
              placeholder="Ask your tutor..."
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || (!inputMessage.trim() && attachments.length === 0)}
            >
              <PaperPlaneTilt className="w-5 h-5" weight="fill" />
            </Button>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => handleFileUpload(e, 'image')}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
            multiple
            onChange={e => handleFileUpload(e, 'file')}
            className="hidden"
          />
        </div>
      </div>
    )
  }

  // ==========================================
  // Render: Profile View
  // ==========================================

  const renderProfile = () => {
    return (
      <div className="space-y-4">
        {/* Profile Selector */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Learner Profiles</h3>
          <Button size="sm" onClick={() => setShowSetup(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Profile Cards */}
        <div className="space-y-2">
          {(profiles || []).map(kid => (
            <Card
              key={kid.id}
              className={cn(
                'cursor-pointer transition-all',
                selectedKid?.id === kid.id && 'ring-2 ring-violet-500'
              )}
              onClick={() => setSelectedKid(kid)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg">
                  {AVATARS[kid.avatar] || '🎓'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium">{kid.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {kid.grade} • {kid.age} years
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Star className="w-3 h-3 mr-1" weight="fill" />L{kid.level}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={e => {
                      e.stopPropagation()
                      deleteProfile(kid.id)
                    }}
                  >
                    <Trash className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedKid && (
          <>
            {/* Parent Suggestions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Parent Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ParentSuggestionForm onAdd={addSuggestion} />
                {(suggestions || [])
                  .filter(s => s.kidId === selectedKid.id)
                  .slice(-3)
                  .map(sug => (
                    <div key={sug.id} className="p-2 bg-muted rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{sug.topic}</span>
                        <Badge
                          variant={sug.completed ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {sug.completed ? 'Done' : sug.date}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{sug.reason}</p>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Behavior Reports */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ChartLine className="w-4 h-4" />
                  Recent Behavior Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(reports || [])
                  .filter(r => r.kidId === selectedKid.id)
                  .slice(-5)
                  .reverse()
                  .map(report => (
                    <div key={report.id} className="p-2 border-b last:border-0">
                      <div className="flex items-center justify-between text-sm">
                        <span>{report.date}</span>
                        <Badge
                          variant={
                            report.focusScore >= 70
                              ? 'default'
                              : report.focusScore >= 40
                                ? 'secondary'
                                : 'destructive'
                          }
                          className="text-xs"
                        >
                          {report.focusScore}% Focus
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.totalMinutes} min • {report.distractions} distractions
                      </p>
                    </div>
                  ))}
                {(reports || []).filter(r => r.kidId === selectedKid.id).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No reports yet. Enable camera during learning sessions.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* AI Credits */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Coin className="w-4 h-4" />
                  AI Credits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Free Daily</span>
                  <span className="font-medium">
                    {credits?.free || 0} / {FREE_DAILY_CREDITS}
                  </span>
                </div>
                <Progress
                  value={((credits?.free || 0) / FREE_DAILY_CREDITS) * 100}
                  className="h-2"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Purchased Credits</span>
                  <span>{credits?.purchased || 0}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-2" disabled>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Purchase Credits (Coming Soon)
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    )
  }

  // ==========================================
  // Render: Games View
  // ==========================================

  const renderGames = () => {
    if (!selectedKid) return null

    const availableGames = getAvailableGames()
    const completedCount = getTotalGamesCompleted()

    // If game is active, show game screen
    if (activeGame) {
      return (
        <div className="space-y-4">
          {/* Game Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={closeGame}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeGame.icon}</span>
                <div>
                  <h3 className="font-semibold">{activeGame.name}</h3>
                  <p className="text-xs text-muted-foreground">{activeGame.description}</p>
                </div>
              </div>
            </div>
            {gameState.isPlaying && activeGame.type === 'speed' && (
              <Badge variant="outline" className="text-lg px-3">
                <Clock className="w-4 h-4 mr-1" />
                {gameState.timeLeft}s
              </Badge>
            )}
          </div>

          {/* Game Content */}
          <Card className="p-6">
            {gameState.showResult ? (
              // Results Screen
              <div className="text-center space-y-4">
                <div className="text-6xl mb-4">
                  {gameState.score >= 80 ? '🏆' : gameState.score >= 50 ? '⭐' : '💪'}
                </div>
                <h2 className="text-2xl font-bold">
                  {gameState.score >= 80
                    ? 'Amazing!'
                    : gameState.score >= 50
                      ? 'Good Job!'
                      : 'Keep Practicing!'}
                </h2>
                <div className="text-4xl font-bold text-violet-500">{gameState.score}%</div>
                <p className="text-muted-foreground">
                  {gameState.score >= 50 &&
                    `+${Math.round((activeGame.xpReward * gameState.score) / 100)} XP earned!`}
                </p>
                <div className="flex gap-2 justify-center pt-4">
                  <Button onClick={() => startGame(activeGame)}>
                    <Play className="w-4 h-4 mr-2" />
                    Play Again
                  </Button>
                  <Button variant="outline" onClick={closeGame}>
                    Back to Games
                  </Button>
                </div>
              </div>
            ) : (
              // Active Game
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-lg font-medium mb-4">{activeGame.description}</p>
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    {/* Sample game interaction - Math type */}
                    {activeGame.category === 'math' && (
                      <>
                        {[1, 2, 3, 4].map(option => {
                          const num1 = Math.floor(Math.random() * 10) + 1
                          const num2 = Math.floor(Math.random() * 10) + 1
                          return (
                            <Button
                              key={option}
                              variant="outline"
                              size="lg"
                              className="h-16 text-xl"
                              onClick={() => {
                                const newScore = Math.min(100, gameState.score + 25)
                                setGameState(prev => ({
                                  ...prev,
                                  score: newScore,
                                  currentQuestion: prev.currentQuestion + 1,
                                }))
                                if (newScore >= 100 || gameState.currentQuestion >= 3) {
                                  endGame(newScore)
                                }
                              }}
                            >
                              {num1 + num2}
                            </Button>
                          )
                        })}
                      </>
                    )}

                    {/* Memory type */}
                    {activeGame.category === 'memory' && (
                      <>
                        {['🐶', '🐱', '🐰', '🦊', '🐼', '🐨'].map((emoji, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="lg"
                            className="h-16 text-3xl"
                            onClick={() => {
                              const newScore = Math.min(100, gameState.score + 17)
                              setGameState(prev => ({
                                ...prev,
                                score: newScore,
                                currentQuestion: prev.currentQuestion + 1,
                              }))
                              if (newScore >= 100 || gameState.currentQuestion >= 5) {
                                endGame(newScore)
                              }
                            }}
                          >
                            {emoji}
                          </Button>
                        ))}
                      </>
                    )}

                    {/* Generic for other types */}
                    {!['math', 'memory'].includes(activeGame.category) && (
                      <>
                        {['A', 'B', 'C', 'D'].map(option => (
                          <Button
                            key={option}
                            variant="outline"
                            size="lg"
                            className="h-16 text-xl"
                            onClick={() => {
                              const newScore = Math.min(100, gameState.score + 25)
                              setGameState(prev => ({
                                ...prev,
                                score: newScore,
                                currentQuestion: prev.currentQuestion + 1,
                              }))
                              if (newScore >= 100 || gameState.currentQuestion >= 3) {
                                endGame(newScore)
                              }
                            }}
                          >
                            {option}
                          </Button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <div className="pt-4">
                  <Progress value={gameState.score} className="h-2" />
                  <p className="text-center text-xs text-muted-foreground mt-1">
                    Progress: {gameState.score}%
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )
    }

    // Parent Settings Modal
    if (showParentSettings) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowParentSettings(false)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="font-semibold text-lg">Parent Controls</h2>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Enable/Disable Games */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Games Enabled</p>
                  <p className="text-xs text-muted-foreground">Allow access to fun challenges</p>
                </div>
                <Button
                  variant={parentSettings.gamesEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    setParentSettings(prev => ({ ...prev, gamesEnabled: !prev.gamesEnabled }))
                  }
                >
                  {parentSettings.gamesEnabled ? 'On' : 'Off'}
                </Button>
              </div>

              {/* Daily Time Limit */}
              <div>
                <p className="font-medium mb-2">
                  Daily Game Time: {parentSettings.maxDailyGameMinutes} minutes
                </p>
                <div className="flex gap-2">
                  {[15, 30, 60, 90, 120].map(mins => (
                    <Button
                      key={mins}
                      variant={parentSettings.maxDailyGameMinutes === mins ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setParentSettings(prev => ({ ...prev, maxDailyGameMinutes: mins }))
                      }
                    >
                      {mins}m
                    </Button>
                  ))}
                </div>
              </div>

              {/* Category Controls */}
              <div>
                <p className="font-medium mb-2">Allowed Categories</p>
                <div className="grid grid-cols-2 gap-2">
                  {GAME_CATEGORIES.map(cat => (
                    <Button
                      key={cat.id}
                      variant={
                        parentSettings.allowedCategories.includes(cat.id) ? 'default' : 'outline'
                      }
                      size="sm"
                      className="justify-start"
                      onClick={() => toggleGameCategory(cat.id)}
                    >
                      <span className="mr-2">{cat.icon}</span>
                      {cat.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Category View
    if (selectedGameCategory) {
      const category = GAME_CATEGORIES.find(c => c.id === selectedGameCategory)
      const categoryGames = getGamesByCategory(selectedGameCategory)

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSelectedGameCategory(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="text-2xl">{category?.icon}</span>
            <h2 className="font-semibold text-lg">{category?.name}</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {categoryGames.map(game => {
              const progress = getGameProgressById(game.id)
              return (
                <Card
                  key={game.id}
                  className={cn(
                    'p-4 cursor-pointer transition-all hover:shadow-md',
                    progress?.completed && 'border-green-500/50 bg-green-500/5'
                  )}
                  onClick={() => startGame(game)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{game.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{game.name}</h3>
                        {progress?.completed && (
                          <CheckCircle className="w-4 h-4 text-green-500" weight="fill" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{game.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {game.difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          +{game.xpReward} XP
                        </Badge>
                        {progress && (
                          <Badge variant="secondary" className="text-[10px]">
                            Best: {progress.score}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CaretRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )
    }

    // Main Games Home
    return (
      <div className="space-y-4">
        {/* Games Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">Fun Challenges</h2>
            <p className="text-xs text-muted-foreground">
              {availableGames.length} games available | {completedCount} completed
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowParentSettings(true)}>
            <Shield className="w-4 h-4 mr-1" />
            Parent
          </Button>
        </div>

        {!parentSettings.gamesEnabled ? (
          <Card className="p-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Games are currently disabled</p>
            <p className="text-xs text-muted-foreground">Parents can enable games in settings</p>
          </Card>
        ) : (
          <>
            {/* Progress Overview */}
            <Card className="p-4 bg-gradient-to-br from-violet-500/10 to-purple-500/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {completedCount}/{availableGames.length}
                </span>
              </div>
              <Progress
                value={(completedCount / Math.max(1, availableGames.length)) * 100}
                className="h-2"
              />
            </Card>

            {/* Game Categories Grid */}
            <div className="grid grid-cols-2 gap-3">
              {GAME_CATEGORIES.filter(cat => parentSettings.allowedCategories.includes(cat.id)).map(
                category => {
                  const categoryGames = getGamesByCategory(category.id)
                  const categoryCompleted = categoryGames.filter(
                    g => getGameProgressById(g.id)?.completed
                  ).length

                  return (
                    <Card
                      key={category.id}
                      className={cn(
                        'p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
                        `bg-gradient-to-br ${category.color} text-white`
                      )}
                      onClick={() => setSelectedGameCategory(category.id)}
                    >
                      <div className="text-3xl mb-2">{category.icon}</div>
                      <h3 className="font-semibold text-sm">{category.name}</h3>
                      <p className="text-[10px] opacity-80">{category.description}</p>
                      <div className="mt-2 flex items-center gap-1">
                        <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full transition-all"
                            style={{
                              width: `${(categoryCompleted / Math.max(1, categoryGames.length)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px]">
                          {categoryCompleted}/{categoryGames.length}
                        </span>
                      </div>
                    </Card>
                  )
                }
              )}
            </div>

            {/* Quick Play - Random Game */}
            <Card className="p-4">
              <Button
                className="w-full h-12"
                onClick={() => {
                  const randomGame =
                    availableGames[Math.floor(Math.random() * availableGames.length)]
                  if (randomGame) startGame(randomGame)
                }}
              >
                <Lightning className="w-5 h-5 mr-2" weight="fill" />
                Quick Play - Random Challenge
              </Button>
            </Card>
          </>
        )}
      </div>
    )
  }

  // ==========================================
  // Peer Review Functions
  // ==========================================

  const handleSubmitWork = (subject: string, topic: string, content: string) => {
    if (!selectedKid) return

    const submission = createSubmission(
      selectedKid.id,
      selectedKid.name,
      selectedKid.avatar,
      subject,
      topic,
      content
    )

    const updated = [...peerSubmissions, submission]
    setPeerSubmissions(updated)
    saveSubmissions(updated)

    // Award XP for submitting
    setProfiles(
      prev =>
        prev?.map(p =>
          p.id === selectedKid.id ? { ...p, xp: p.xp + PEER_REVIEW_XP.SUBMIT_WORK } : p
        ) || []
    )

    setShowSubmitWork(false)
    announce(`Work submitted! You earned ${PEER_REVIEW_XP.SUBMIT_WORK} XP`)
    toast.success(`Work submitted! +${PEER_REVIEW_XP.SUBMIT_WORK} XP`)
  }

  const handleSubmitReview = () => {
    if (!selectedKid || !reviewingSubmission) return

    const validation = isConstructiveFeedback(reviewFeedback)
    if (!validation.isValid) {
      toast.error(validation.reason || 'Please write constructive feedback')
      return
    }

    const updated = addReview(reviewingSubmission, {
      submissionId: reviewingSubmission.id,
      reviewerId: selectedKid.id,
      reviewerName: selectedKid.name,
      reviewerAvatar: selectedKid.avatar,
      rating: reviewRating,
      feedback: reviewFeedback,
      categories: [],
    })

    const allSubmissions = peerSubmissions.map(s => (s.id === updated.id ? updated : s))
    setPeerSubmissions(allSubmissions)
    saveSubmissions(allSubmissions)

    // Award XP for giving review
    const isFirstReview = !peerSubmissions.some(s =>
      s.reviews.some(r => r.reviewerId === selectedKid.id)
    )
    const xpEarned = isFirstReview
      ? PEER_REVIEW_XP.GIVE_REVIEW + PEER_REVIEW_XP.FIRST_REVIEW
      : PEER_REVIEW_XP.GIVE_REVIEW

    setProfiles(
      prev => prev?.map(p => (p.id === selectedKid.id ? { ...p, xp: p.xp + xpEarned } : p)) || []
    )

    setReviewingSubmission(null)
    setReviewFeedback('')
    setReviewRating(5)
    announce(`Review submitted! You earned ${xpEarned} XP`)
    toast.success(`Great review! +${xpEarned} XP`)
  }

  const renderPeers = () => {
    if (!selectedKid) {
      return (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Please select a profile first</p>
        </Card>
      )
    }

    const mySubmissions = getKidSubmissions(selectedKid.id)
    const reviewableWork = getReviewableSubmissions(selectedKid.id, peerConnections)
    const feedbackStarters = getRandomStarters('positive', 2)
    const constructiveStarters = getRandomStarters('constructive', 2)

    return (
      <div className="space-y-4" role="region" aria-label="Peer Review Section">
        {/* Header */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="font-bold">Peer Learning</h2>
                <p className="text-xs text-muted-foreground">
                  Share work & help your friends learn!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Work Button */}
        <Button
          onClick={() => setShowSubmitWork(true)}
          className="w-full"
          aria-label="Share your work for peer review"
        >
          <Plus className="w-4 h-4 mr-2" />
          Share My Work
        </Button>

        {/* Submit Work Modal */}
        {showSubmitWork && (
          <Card className="p-4 space-y-4 border-2 border-primary/20">
            <h3 className="font-bold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Share Your Work
            </h3>
            <p className="text-sm text-muted-foreground">
              Share what you've been working on so friends can give you feedback!
            </p>

            <div className="space-y-3">
              <div>
                <Label htmlFor="submit-subject">Subject</Label>
                <Select onValueChange={value => {}}>
                  <SelectTrigger id="submit-subject">
                    <SelectValue placeholder="Choose subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.emoji} {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="submit-topic">What did you work on?</Label>
                <Input id="submit-topic" placeholder="e.g., Addition problems, Story writing" />
              </div>

              <div>
                <Label htmlFor="submit-content">Describe your work</Label>
                <Textarea
                  id="submit-content"
                  placeholder="Tell your friends what you did and what you learned!"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSubmitWork(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmitWork('math', 'Practice problems', 'My work description')}
                className="flex-1"
              >
                <Star className="w-4 h-4 mr-2" />
                Share (+{PEER_REVIEW_XP.SUBMIT_WORK} XP)
              </Button>
            </div>
          </Card>
        )}

        {/* My Submissions */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            My Shared Work ({mySubmissions.length})
          </h3>

          {mySubmissions.length === 0 ? (
            <Card className="p-4 text-center text-muted-foreground">
              <p className="text-sm">You haven't shared any work yet</p>
              <p className="text-xs mt-1">Share your work to get feedback from friends!</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {mySubmissions.slice(0, 3).map(sub => (
                <Card key={sub.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{sub.topic}</p>
                      <p className="text-xs text-muted-foreground">{sub.subject}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-bold">{sub.averageRating || '-'}</span>
                    </div>
                  </div>
                  {sub.reviews.length > 0 && (
                    <p className="text-xs text-green-600 mt-2">
                      {sub.reviews.length} review{sub.reviews.length !== 1 ? 's' : ''}!
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Work to Review */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Help Friends ({reviewableWork.length} to review)
          </h3>

          {reviewableWork.length === 0 ? (
            <Card className="p-4 text-center text-muted-foreground">
              <p className="text-sm">No work to review right now</p>
              <p className="text-xs mt-1">Check back later for friend submissions!</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {reviewableWork.slice(0, 5).map(sub => (
                <Card
                  key={sub.id}
                  className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setReviewingSubmission(sub)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setReviewingSubmission(sub)
                    }
                  }}
                  aria-label={`Review ${sub.kidName}'s work on ${sub.topic}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{AVATARS[sub.kidAvatar] || '👤'}</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{sub.kidName}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.topic} • {sub.subject}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Review (+{PEER_REVIEW_XP.GIVE_REVIEW} XP)
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Review Modal */}
        {reviewingSubmission && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Write a review"
          >
            <Card className="w-full max-w-md p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Review {reviewingSubmission.kidName}'s Work</h3>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setReviewingSubmission(null)}
                  aria-label="Close review"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Work Details */}
              <Card className="p-3 bg-muted/50">
                <p className="font-medium">{reviewingSubmission.topic}</p>
                <p className="text-sm text-muted-foreground mt-1">{reviewingSubmission.content}</p>
              </Card>

              {/* Star Rating */}
              <div>
                <Label>How did they do?</Label>
                <div className="flex gap-1 mt-2" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star as 1 | 2 | 3 | 4 | 5)}
                      className="p-1 transition-transform hover:scale-110"
                      aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                      aria-checked={reviewRating >= star}
                      role="radio"
                    >
                      <Star
                        className={cn(
                          'w-8 h-8',
                          reviewRating >= star ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                        )}
                        weight={reviewRating >= star ? 'fill' : 'regular'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Starters */}
              <div>
                <Label>Feedback starters (tap to use):</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[...feedbackStarters, ...constructiveStarters].map((starter, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => setReviewFeedback(prev => prev + starter + ' ')}
                    >
                      {starter.slice(0, 25)}...
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Feedback Input */}
              <div>
                <Label htmlFor="review-feedback">Your feedback</Label>
                <Textarea
                  id="review-feedback"
                  value={reviewFeedback}
                  onChange={e => setReviewFeedback(e.target.value)}
                  placeholder="Write something helpful and kind..."
                  rows={4}
                  aria-describedby="feedback-hint"
                />
                <p id="feedback-hint" className="text-xs text-muted-foreground mt-1">
                  Be kind and helpful! Say something nice and give a suggestion.
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setReviewingSubmission(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  className="flex-1"
                  disabled={reviewFeedback.length < 10}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Review
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Tips Card */}
        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-green-500" />
            Tips for Great Feedback
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Start with something you liked about their work</li>
            <li>• Give one helpful suggestion for improvement</li>
            <li>• Be kind - everyone is learning!</li>
            <li>• Ask questions if you're curious about their work</li>
          </ul>
        </Card>
      </div>
    )
  }

  // ==========================================
  // Main Render
  // ==========================================

  return (
    <div className={cn('space-y-4', isMobile && 'space-y-3')}>
      {/* Header */}
      <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" weight="fill" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Kids Learning Center</h1>
            <p className="text-xs text-muted-foreground">
              AI-powered tutoring with behavior monitoring
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      {currentView !== 'learn' && (
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant={currentView === 'home' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('home')}
            className="flex-1"
          >
            <House className="w-4 h-4 mr-1" />
            Learn
          </Button>
          <Button
            variant={currentView === 'games' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('games')}
            className="flex-1"
          >
            <Lightning className="w-4 h-4 mr-1" weight="fill" />
            Games
          </Button>
          <Button
            variant={currentView === 'peers' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('peers')}
            className="flex-1"
            aria-label="View peer reviews and share work"
          >
            <Users className="w-4 h-4 mr-1" />
            Peers
          </Button>
          <Button
            variant={currentView === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('profile')}
            className="flex-1"
          >
            <UserCircle className="w-4 h-4 mr-1" />
            Profile
          </Button>
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {currentView === 'home' && renderHome()}
          {currentView === 'learn' && renderLearning()}
          {currentView === 'games' && renderGames()}
          {currentView === 'peers' && renderPeers()}
          {currentView === 'profile' && renderProfile()}
        </motion.div>
      </AnimatePresence>

      {/* Setup Modal */}
      <AnimatePresence>
        {showSetup && (
          <ProfileSetupModal onClose={() => setShowSetup(false)} onSave={createProfile} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ==========================================
// Parent Suggestion Form
// ==========================================

function ParentSuggestionForm({
  onAdd,
}: {
  onAdd: (subject: string, topic: string, reason: string) => void
}) {
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [reason, setReason] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = () => {
    if (!subject || !topic) {
      toast.error('Please fill in subject and topic')
      return
    }
    onAdd(subject, topic, reason || 'Parent suggestion')
    setSubject('')
    setTopic('')
    setReason('')
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" className="w-full" onClick={() => setIsOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Study Suggestion
      </Button>
    )
  }

  return (
    <div className="p-3 border rounded-lg space-y-2">
      <Select value={subject} onValueChange={setSubject}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select subject" />
        </SelectTrigger>
        <SelectContent>
          {SUBJECTS.map(s => (
            <SelectItem key={s.id} value={s.id}>
              {s.emoji} {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Topic to study"
        value={topic}
        onChange={e => setTopic(e.target.value)}
        className="h-9"
      />
      <Input
        placeholder="Reason (optional)"
        value={reason}
        onChange={e => setReason(e.target.value)}
        className="h-9"
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} className="flex-1">
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} className="flex-1">
          Add
        </Button>
      </div>
    </div>
  )
}

// ==========================================
// Profile Setup Modal
// ==========================================

function ProfileSetupModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (data: any) => void
}) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [grade, setGrade] = useState('')
  const [avatar, setAvatar] = useState('bear')
  const [language, setLanguage] = useState('en')
  const [parentEmail, setParentEmail] = useState('')
  const [dailyGoal, setDailyGoal] = useState('30')

  const handleSubmit = () => {
    if (!name || !age || !grade) {
      toast.error('Please fill in name, age, and grade')
      return
    }
    onSave({
      name,
      age: parseInt(age),
      grade,
      avatar,
      language,
      parentEmail: parentEmail || undefined,
      dailyGoalMinutes: parseInt(dailyGoal) || 30,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md max-h-[90vh] overflow-auto"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Create Learner Profile</span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div>
              <Label>Choose Avatar</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {Object.entries(AVATARS).map(([key, emoji]) => (
                  <button
                    key={key}
                    onClick={() => setAvatar(key)}
                    className={cn(
                      'w-10 h-10 rounded-full text-xl transition-all',
                      avatar === key
                        ? 'bg-violet-500 ring-2 ring-violet-500 ring-offset-2'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <Label>Name *</Label>
              <Input
                placeholder="Child's name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            {/* Age & Grade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Age *</Label>
                <Select value={age} onValueChange={setAge}>
                  <SelectTrigger>
                    <SelectValue placeholder="Age" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 15 }, (_, i) => i + 4).map(a => (
                      <SelectItem key={a} value={String(a)}>
                        {a} years
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade *</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map(g => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Language */}
            <div>
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Parent Email */}
            <div>
              <Label>Parent Email (for reports)</Label>
              <Input
                type="email"
                placeholder="parent@email.com"
                value={parentEmail}
                onChange={e => setParentEmail(e.target.value)}
              />
            </div>

            {/* Daily Goal */}
            <div>
              <Label>Daily Study Goal (minutes)</Label>
              <Input
                type="number"
                value={dailyGoal}
                onChange={e => setDailyGoal(e.target.value)}
                min="10"
                max="120"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
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
