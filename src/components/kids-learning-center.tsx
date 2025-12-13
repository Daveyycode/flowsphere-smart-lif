/**
 * Kids Learning Center - Unified AI-Powered Learning Platform
 *
 * Features:
 * - Single unified interface (no redundant tabs)
 * - Textbook/Lesson plan upload for AI analysis
 * - Age & grade-appropriate content generation
 * - Parent suggestions for daily topics
 * - Camera-based behavior monitoring with AI
 * - Daily/monthly behavior reports
 * - Cheapest AI first with usage limits
 * - User credit system for AI usage
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Paperclip
} from '@phosphor-icons/react'
import { smartCompletion, checkUsageLimits, getTodayUsage, AI_PROVIDERS, type AIProvider } from '@/lib/smart-ai-router'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'
import { supabase } from '@/lib/supabase'

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

// ==========================================
// Constants
// ==========================================

const SUBJECTS = [
  { id: 'math', name: 'Mathematics', icon: Lightbulb, color: 'from-blue-500 to-indigo-600', emoji: '🧮' },
  { id: 'science', name: 'Science', icon: Sparkle, color: 'from-green-500 to-emerald-600', emoji: '🔬' },
  { id: 'reading', name: 'Reading & Writing', icon: BookOpen, color: 'from-purple-500 to-violet-600', emoji: '📚' },
  { id: 'language', name: 'Languages', icon: Globe, color: 'from-orange-500 to-amber-600', emoji: '🌍' },
  { id: 'general', name: 'General Knowledge', icon: GraduationCap, color: 'from-pink-500 to-rose-600', emoji: '💡' }
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
  { value: '12th', label: '12th Grade (Senior)', ages: [17, 18] }
]

const AVATARS: Record<string, string> = {
  bear: '🐻', rabbit: '🐰', fox: '🦊', owl: '🦉',
  dolphin: '🐬', lion: '🦁', panda: '🐼', penguin: '🐧'
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'zh', name: 'Chinese' },
  { code: 'tl', name: 'Filipino/Tagalog' },
  { code: 'other', name: 'Other' }
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
  PARENT_SETTINGS: 'flowsphere-kids-parent-settings-v2'
}

// Game Categories
const GAME_CATEGORIES = [
  { id: 'math', name: 'Math Games', icon: '🧮', color: 'from-blue-500 to-indigo-600', description: 'Numbers & Calculations' },
  { id: 'memory', name: 'Memory Games', icon: '🧠', color: 'from-purple-500 to-violet-600', description: 'Remember & Recall' },
  { id: 'logic', name: 'Logic Puzzles', icon: '🧩', color: 'from-green-500 to-emerald-600', description: 'Think & Solve' },
  { id: 'words', name: 'Word Games', icon: '📝', color: 'from-orange-500 to-amber-600', description: 'Letters & Words' },
  { id: 'pattern', name: 'Pattern Games', icon: '🔷', color: 'from-cyan-500 to-teal-600', description: 'Find the Pattern' },
  { id: 'speed', name: 'Speed Challenges', icon: '⚡', color: 'from-yellow-500 to-orange-600', description: 'Quick Thinking' },
  { id: 'creativity', name: 'Creative Games', icon: '🎨', color: 'from-pink-500 to-rose-600', description: 'Imagine & Create' }
]

// 100+ Game Challenges
const GAME_CHALLENGES: GameChallenge[] = [
  // Math Games (20 challenges)
  { id: 'math-1', category: 'math', name: 'Number Buddies', description: 'Find numbers that add up to 10', minAge: 4, maxAge: 6, difficulty: 'easy', xpReward: 10, icon: '➕', type: 'match' },
  { id: 'math-2', category: 'math', name: 'Count the Stars', description: 'Count objects and pick the right number', minAge: 3, maxAge: 5, difficulty: 'easy', xpReward: 10, icon: '⭐', type: 'multiple-choice' },
  { id: 'math-3', category: 'math', name: 'Addition Adventure', description: 'Solve simple addition problems', minAge: 5, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🎯', type: 'fill-blank' },
  { id: 'math-4', category: 'math', name: 'Subtraction Safari', description: 'Take away and find the answer', minAge: 5, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🦁', type: 'fill-blank' },
  { id: 'math-5', category: 'math', name: 'Shape Counter', description: 'Count different shapes', minAge: 3, maxAge: 5, difficulty: 'easy', xpReward: 10, icon: '🔺', type: 'multiple-choice' },
  { id: 'math-6', category: 'math', name: 'Number Order', description: 'Put numbers in the right order', minAge: 4, maxAge: 6, difficulty: 'easy', xpReward: 15, icon: '📊', type: 'sequence' },
  { id: 'math-7', category: 'math', name: 'Double Trouble', description: 'Double the numbers!', minAge: 6, maxAge: 8, difficulty: 'medium', xpReward: 20, icon: '✖️', type: 'fill-blank' },
  { id: 'math-8', category: 'math', name: 'Times Tables', description: 'Practice multiplication', minAge: 7, maxAge: 10, difficulty: 'medium', xpReward: 25, icon: '🔢', type: 'speed' },
  { id: 'math-9', category: 'math', name: 'Division Detective', description: 'Solve division mysteries', minAge: 8, maxAge: 11, difficulty: 'medium', xpReward: 25, icon: '🔍', type: 'fill-blank' },
  { id: 'math-10', category: 'math', name: 'Fraction Fun', description: 'Match fractions to pictures', minAge: 7, maxAge: 10, difficulty: 'medium', xpReward: 20, icon: '🍕', type: 'match' },
  { id: 'math-11', category: 'math', name: 'Money Math', description: 'Count coins and bills', minAge: 6, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '💰', type: 'multiple-choice' },
  { id: 'math-12', category: 'math', name: 'Clock Challenge', description: 'Tell the time correctly', minAge: 6, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '🕐', type: 'multiple-choice' },
  { id: 'math-13', category: 'math', name: 'Greater or Less', description: 'Compare numbers quickly', minAge: 5, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '⚖️', type: 'speed' },
  { id: 'math-14', category: 'math', name: 'Number Bonds', description: 'Find pairs that make a number', minAge: 5, maxAge: 8, difficulty: 'medium', xpReward: 20, icon: '🤝', type: 'match' },
  { id: 'math-15', category: 'math', name: 'Math Maze', description: 'Solve equations to find the path', minAge: 8, maxAge: 12, difficulty: 'hard', xpReward: 30, icon: '🏃', type: 'sequence' },
  { id: 'math-16', category: 'math', name: 'Place Value Pro', description: 'Understand tens and ones', minAge: 6, maxAge: 8, difficulty: 'medium', xpReward: 20, icon: '🏠', type: 'multiple-choice' },
  { id: 'math-17', category: 'math', name: 'Skip Counting', description: 'Count by 2s, 5s, and 10s', minAge: 5, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🐰', type: 'sequence' },
  { id: 'math-18', category: 'math', name: 'Equation Builder', description: 'Build correct equations', minAge: 9, maxAge: 12, difficulty: 'hard', xpReward: 35, icon: '🏗️', type: 'fill-blank' },
  { id: 'math-19', category: 'math', name: 'Odd & Even Sort', description: 'Sort numbers into groups', minAge: 5, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🎲', type: 'match' },
  { id: 'math-20', category: 'math', name: 'Mental Math Race', description: 'Quick calculations challenge', minAge: 8, maxAge: 12, difficulty: 'hard', xpReward: 40, icon: '🏎️', type: 'speed' },

  // Memory Games (15 challenges)
  { id: 'mem-1', category: 'memory', name: 'Animal Match', description: 'Match pairs of cute animals', minAge: 3, maxAge: 6, difficulty: 'easy', xpReward: 10, icon: '🐶', type: 'memory' },
  { id: 'mem-2', category: 'memory', name: 'Color Memory', description: 'Remember the color sequence', minAge: 4, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🌈', type: 'sequence' },
  { id: 'mem-3', category: 'memory', name: 'Picture Recall', description: 'Remember what you saw', minAge: 5, maxAge: 8, difficulty: 'medium', xpReward: 20, icon: '🖼️', type: 'memory' },
  { id: 'mem-4', category: 'memory', name: 'Number Memory', description: 'Remember number sequences', minAge: 6, maxAge: 10, difficulty: 'medium', xpReward: 25, icon: '🔢', type: 'sequence' },
  { id: 'mem-5', category: 'memory', name: 'Shape Shuffle', description: 'Remember where shapes were', minAge: 4, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🔷', type: 'memory' },
  { id: 'mem-6', category: 'memory', name: 'Sound Memory', description: 'Match sounds to pictures', minAge: 3, maxAge: 6, difficulty: 'easy', xpReward: 10, icon: '🔊', type: 'match' },
  { id: 'mem-7', category: 'memory', name: 'Story Recall', description: 'Remember details from a story', minAge: 6, maxAge: 10, difficulty: 'medium', xpReward: 25, icon: '📖', type: 'multiple-choice' },
  { id: 'mem-8', category: 'memory', name: 'Simon Says', description: 'Follow the pattern sequence', minAge: 5, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '🎮', type: 'sequence' },
  { id: 'mem-9', category: 'memory', name: "What's Missing?", description: 'Find the missing item', minAge: 4, maxAge: 8, difficulty: 'medium', xpReward: 20, icon: '❓', type: 'multiple-choice' },
  { id: 'mem-10', category: 'memory', name: 'Face Match', description: 'Match faces with names', minAge: 5, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '😊', type: 'match' },
  { id: 'mem-11', category: 'memory', name: 'Word Memory', description: 'Remember lists of words', minAge: 7, maxAge: 11, difficulty: 'hard', xpReward: 30, icon: '📝', type: 'sequence' },
  { id: 'mem-12', category: 'memory', name: 'Pattern Recall', description: 'Remember complex patterns', minAge: 8, maxAge: 12, difficulty: 'hard', xpReward: 35, icon: '🎯', type: 'memory' },
  { id: 'mem-13', category: 'memory', name: 'Emoji Match', description: 'Match emoji pairs', minAge: 4, maxAge: 8, difficulty: 'easy', xpReward: 15, icon: '😀', type: 'memory' },
  { id: 'mem-14', category: 'memory', name: 'Location Memory', description: 'Remember item locations', minAge: 5, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '📍', type: 'memory' },
  { id: 'mem-15', category: 'memory', name: 'Sequence Master', description: 'Master long sequences', minAge: 9, maxAge: 12, difficulty: 'hard', xpReward: 40, icon: '🏆', type: 'sequence' },

  // Logic Puzzles (15 challenges)
  { id: 'logic-1', category: 'logic', name: 'Odd One Out', description: 'Find what does not belong', minAge: 4, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🤔', type: 'multiple-choice' },
  { id: 'logic-2', category: 'logic', name: 'Simple Sudoku', description: 'Fill in the grid (4x4)', minAge: 6, maxAge: 9, difficulty: 'medium', xpReward: 25, icon: '📊', type: 'fill-blank' },
  { id: 'logic-3', category: 'logic', name: 'Sort It Out', description: 'Group items by category', minAge: 4, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '📦', type: 'match' },
  { id: 'logic-4', category: 'logic', name: 'If-Then Puzzles', description: 'Solve logical statements', minAge: 7, maxAge: 11, difficulty: 'medium', xpReward: 25, icon: '🔀', type: 'multiple-choice' },
  { id: 'logic-5', category: 'logic', name: 'Picture Puzzles', description: 'Complete the picture logic', minAge: 5, maxAge: 8, difficulty: 'easy', xpReward: 15, icon: '🧩', type: 'multiple-choice' },
  { id: 'logic-6', category: 'logic', name: 'Who Lives Where?', description: 'Solve simple logic grids', minAge: 8, maxAge: 12, difficulty: 'hard', xpReward: 35, icon: '🏠', type: 'fill-blank' },
  { id: 'logic-7', category: 'logic', name: 'Balance Scale', description: 'Make both sides equal', minAge: 5, maxAge: 8, difficulty: 'medium', xpReward: 20, icon: '⚖️', type: 'fill-blank' },
  { id: 'logic-8', category: 'logic', name: 'Code Breaker', description: 'Crack the secret code', minAge: 7, maxAge: 11, difficulty: 'medium', xpReward: 30, icon: '🔐', type: 'fill-blank' },
  { id: 'logic-9', category: 'logic', name: 'Tower Builder', description: 'Stack blocks correctly', minAge: 4, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🗼', type: 'sequence' },
  { id: 'logic-10', category: 'logic', name: 'Mirror Image', description: 'Find the correct reflection', minAge: 5, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '🪞', type: 'multiple-choice' },
  { id: 'logic-11', category: 'logic', name: 'Maze Runner', description: 'Find the path through', minAge: 5, maxAge: 10, difficulty: 'medium', xpReward: 20, icon: '🏃', type: 'sequence' },
  { id: 'logic-12', category: 'logic', name: 'True or False', description: 'Evaluate statements', minAge: 6, maxAge: 10, difficulty: 'medium', xpReward: 20, icon: '✅', type: 'multiple-choice' },
  { id: 'logic-13', category: 'logic', name: 'Riddle Time', description: 'Solve fun riddles', minAge: 6, maxAge: 11, difficulty: 'medium', xpReward: 25, icon: '🎭', type: 'multiple-choice' },
  { id: 'logic-14', category: 'logic', name: 'Tangram Puzzle', description: 'Arrange shapes to match', minAge: 6, maxAge: 10, difficulty: 'medium', xpReward: 25, icon: '📐', type: 'match' },
  { id: 'logic-15', category: 'logic', name: 'Brain Teaser', description: 'Advanced logic challenges', minAge: 10, maxAge: 12, difficulty: 'hard', xpReward: 40, icon: '🧠', type: 'fill-blank' },

  // Word Games (15 challenges)
  { id: 'word-1', category: 'words', name: 'Letter Hunt', description: 'Find hidden letters', minAge: 4, maxAge: 6, difficulty: 'easy', xpReward: 10, icon: '🔤', type: 'match' },
  { id: 'word-2', category: 'words', name: 'Rhyme Time', description: 'Match words that rhyme', minAge: 4, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🎵', type: 'match' },
  { id: 'word-3', category: 'words', name: 'Spell It Right', description: 'Choose correct spelling', minAge: 6, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '✏️', type: 'multiple-choice' },
  { id: 'word-4', category: 'words', name: 'Word Builder', description: 'Make words from letters', minAge: 6, maxAge: 10, difficulty: 'medium', xpReward: 25, icon: '🏗️', type: 'fill-blank' },
  { id: 'word-5', category: 'words', name: 'Alphabet Order', description: 'Put letters in order', minAge: 4, maxAge: 6, difficulty: 'easy', xpReward: 10, icon: '📝', type: 'sequence' },
  { id: 'word-6', category: 'words', name: 'Picture Words', description: 'Match pictures to words', minAge: 4, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🖼️', type: 'match' },
  { id: 'word-7', category: 'words', name: 'Opposite Words', description: 'Find the opposites', minAge: 5, maxAge: 8, difficulty: 'medium', xpReward: 20, icon: '↔️', type: 'match' },
  { id: 'word-8', category: 'words', name: 'Word Search', description: 'Find words in the grid', minAge: 6, maxAge: 10, difficulty: 'medium', xpReward: 25, icon: '🔍', type: 'match' },
  { id: 'word-9', category: 'words', name: 'Fill the Gap', description: 'Complete the sentence', minAge: 6, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '📝', type: 'fill-blank' },
  { id: 'word-10', category: 'words', name: 'Word Categories', description: 'Sort words into groups', minAge: 5, maxAge: 8, difficulty: 'easy', xpReward: 15, icon: '📂', type: 'match' },
  { id: 'word-11', category: 'words', name: 'Synonym Match', description: 'Find words with same meaning', minAge: 7, maxAge: 11, difficulty: 'medium', xpReward: 25, icon: '🔗', type: 'match' },
  { id: 'word-12', category: 'words', name: 'Unscramble', description: 'Rearrange jumbled letters', minAge: 7, maxAge: 11, difficulty: 'medium', xpReward: 25, icon: '🔀', type: 'fill-blank' },
  { id: 'word-13', category: 'words', name: 'Story Words', description: 'Put story words in order', minAge: 6, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '📖', type: 'sequence' },
  { id: 'word-14', category: 'words', name: 'Compound Words', description: 'Make compound words', minAge: 7, maxAge: 10, difficulty: 'medium', xpReward: 25, icon: '🔧', type: 'match' },
  { id: 'word-15', category: 'words', name: 'Crossword Kids', description: 'Simple crossword puzzles', minAge: 8, maxAge: 12, difficulty: 'hard', xpReward: 35, icon: '📰', type: 'fill-blank' },

  // Pattern Games (15 challenges)
  { id: 'pat-1', category: 'pattern', name: 'Color Patterns', description: 'Complete the color sequence', minAge: 3, maxAge: 6, difficulty: 'easy', xpReward: 10, icon: '🌈', type: 'sequence' },
  { id: 'pat-2', category: 'pattern', name: 'Shape Sequence', description: 'What comes next?', minAge: 4, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🔷', type: 'multiple-choice' },
  { id: 'pat-3', category: 'pattern', name: 'Number Patterns', description: 'Find the number pattern', minAge: 6, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '🔢', type: 'fill-blank' },
  { id: 'pat-4', category: 'pattern', name: 'Growing Patterns', description: 'Patterns that grow', minAge: 5, maxAge: 8, difficulty: 'medium', xpReward: 20, icon: '📈', type: 'sequence' },
  { id: 'pat-5', category: 'pattern', name: 'Repeating Beats', description: 'Complete the rhythm pattern', minAge: 4, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🥁', type: 'sequence' },
  { id: 'pat-6', category: 'pattern', name: 'Picture Pattern', description: 'What picture comes next?', minAge: 4, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🎨', type: 'multiple-choice' },
  { id: 'pat-7', category: 'pattern', name: 'AB Patterns', description: 'Simple alternating patterns', minAge: 3, maxAge: 5, difficulty: 'easy', xpReward: 10, icon: '🔄', type: 'sequence' },
  { id: 'pat-8', category: 'pattern', name: 'ABC Patterns', description: 'Three-part patterns', minAge: 4, maxAge: 7, difficulty: 'medium', xpReward: 15, icon: '🔁', type: 'sequence' },
  { id: 'pat-9', category: 'pattern', name: 'Tile Patterns', description: 'Complete the tile design', minAge: 5, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '🎴', type: 'match' },
  { id: 'pat-10', category: 'pattern', name: 'Symmetry Finder', description: 'Find symmetrical patterns', minAge: 6, maxAge: 10, difficulty: 'medium', xpReward: 25, icon: '🦋', type: 'multiple-choice' },
  { id: 'pat-11', category: 'pattern', name: 'Pattern Rules', description: 'Discover the rule', minAge: 7, maxAge: 11, difficulty: 'hard', xpReward: 30, icon: '📏', type: 'fill-blank' },
  { id: 'pat-12', category: 'pattern', name: 'Missing Piece', description: 'Find what fits', minAge: 5, maxAge: 8, difficulty: 'medium', xpReward: 20, icon: '🧩', type: 'multiple-choice' },
  { id: 'pat-13', category: 'pattern', name: 'Pattern Matrix', description: 'Complex pattern grids', minAge: 8, maxAge: 12, difficulty: 'hard', xpReward: 35, icon: '📊', type: 'multiple-choice' },
  { id: 'pat-14', category: 'pattern', name: 'Rotation Pattern', description: 'Patterns that rotate', minAge: 7, maxAge: 11, difficulty: 'hard', xpReward: 30, icon: '🔄', type: 'multiple-choice' },
  { id: 'pat-15', category: 'pattern', name: 'Pattern Detective', description: 'Find hidden patterns', minAge: 9, maxAge: 12, difficulty: 'hard', xpReward: 40, icon: '🕵️', type: 'fill-blank' },

  // Speed Challenges (15 challenges)
  { id: 'speed-1', category: 'speed', name: 'Quick Count', description: 'Count objects fast!', minAge: 4, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '⏱️', type: 'speed' },
  { id: 'speed-2', category: 'speed', name: 'Flash Cards', description: 'Quick math answers', minAge: 5, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '⚡', type: 'speed' },
  { id: 'speed-3', category: 'speed', name: 'Color Tap', description: 'Tap the right color fast', minAge: 4, maxAge: 8, difficulty: 'easy', xpReward: 15, icon: '🎯', type: 'speed' },
  { id: 'speed-4', category: 'speed', name: 'Shape Race', description: 'Identify shapes quickly', minAge: 4, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🏁', type: 'speed' },
  { id: 'speed-5', category: 'speed', name: 'Word Dash', description: 'Spell words against time', minAge: 6, maxAge: 10, difficulty: 'medium', xpReward: 25, icon: '💨', type: 'speed' },
  { id: 'speed-6', category: 'speed', name: 'Number Ninja', description: 'Quick number recognition', minAge: 5, maxAge: 8, difficulty: 'medium', xpReward: 20, icon: '🥷', type: 'speed' },
  { id: 'speed-7', category: 'speed', name: 'Match Sprint', description: 'Find matches quickly', minAge: 5, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '🏃‍♂️', type: 'speed' },
  { id: 'speed-8', category: 'speed', name: 'Reflex Test', description: 'Test your reaction time', minAge: 6, maxAge: 12, difficulty: 'medium', xpReward: 20, icon: '👆', type: 'speed' },
  { id: 'speed-9', category: 'speed', name: 'Quick Sort', description: 'Sort items fast', minAge: 5, maxAge: 8, difficulty: 'medium', xpReward: 20, icon: '📤', type: 'speed' },
  { id: 'speed-10', category: 'speed', name: '60 Second Math', description: 'Solve max problems in a minute', minAge: 7, maxAge: 12, difficulty: 'hard', xpReward: 35, icon: '⏰', type: 'speed' },
  { id: 'speed-11', category: 'speed', name: 'Letter Race', description: 'Find letters quickly', minAge: 4, maxAge: 7, difficulty: 'easy', xpReward: 15, icon: '🔠', type: 'speed' },
  { id: 'speed-12', category: 'speed', name: 'Pattern Speed', description: 'Complete patterns fast', minAge: 6, maxAge: 10, difficulty: 'medium', xpReward: 25, icon: '⚡', type: 'speed' },
  { id: 'speed-13', category: 'speed', name: 'Memory Sprint', description: 'Quick memory challenges', minAge: 6, maxAge: 10, difficulty: 'medium', xpReward: 25, icon: '🧠', type: 'speed' },
  { id: 'speed-14', category: 'speed', name: 'Tap Master', description: 'Tap targets accurately', minAge: 4, maxAge: 8, difficulty: 'easy', xpReward: 15, icon: '👇', type: 'speed' },
  { id: 'speed-15', category: 'speed', name: 'Ultimate Speed', description: 'Mixed speed challenges', minAge: 8, maxAge: 12, difficulty: 'hard', xpReward: 40, icon: '🏆', type: 'speed' },

  // Creativity Games (15 challenges)
  { id: 'create-1', category: 'creativity', name: 'Color Mix', description: 'Create new colors', minAge: 4, maxAge: 8, difficulty: 'easy', xpReward: 15, icon: '🎨', type: 'match' },
  { id: 'create-2', category: 'creativity', name: 'Shape Art', description: 'Make pictures with shapes', minAge: 4, maxAge: 8, difficulty: 'easy', xpReward: 15, icon: '🔶', type: 'draw' },
  { id: 'create-3', category: 'creativity', name: 'Story Builder', description: 'Create your own story', minAge: 5, maxAge: 10, difficulty: 'medium', xpReward: 25, icon: '📚', type: 'sequence' },
  { id: 'create-4', category: 'creativity', name: 'Pattern Creator', description: 'Design your own pattern', minAge: 5, maxAge: 9, difficulty: 'medium', xpReward: 20, icon: '✨', type: 'draw' },
  { id: 'create-5', category: 'creativity', name: 'Animal Mix-up', description: 'Create funny animals', minAge: 4, maxAge: 8, difficulty: 'easy', xpReward: 15, icon: '🦄', type: 'draw' },
  { id: 'create-6', category: 'creativity', name: 'Emoji Story', description: 'Tell stories with emojis', minAge: 5, maxAge: 10, difficulty: 'easy', xpReward: 15, icon: '😊', type: 'sequence' },
  { id: 'create-7', category: 'creativity', name: 'Music Maker', description: 'Create simple tunes', minAge: 5, maxAge: 10, difficulty: 'medium', xpReward: 20, icon: '🎵', type: 'sequence' },
  { id: 'create-8', category: 'creativity', name: 'Dream House', description: 'Design your dream house', minAge: 5, maxAge: 10, difficulty: 'medium', xpReward: 20, icon: '🏠', type: 'draw' },
  { id: 'create-9', category: 'creativity', name: 'Invention Time', description: 'Create a new invention', minAge: 6, maxAge: 12, difficulty: 'medium', xpReward: 25, icon: '💡', type: 'draw' },
  { id: 'create-10', category: 'creativity', name: 'Comic Strip', description: 'Make a mini comic', minAge: 6, maxAge: 11, difficulty: 'medium', xpReward: 25, icon: '📰', type: 'draw' },
  { id: 'create-11', category: 'creativity', name: 'Recipe Creator', description: 'Invent a silly recipe', minAge: 5, maxAge: 9, difficulty: 'easy', xpReward: 15, icon: '🍳', type: 'sequence' },
  { id: 'create-12', category: 'creativity', name: 'Monster Designer', description: 'Create friendly monsters', minAge: 4, maxAge: 9, difficulty: 'easy', xpReward: 15, icon: '👾', type: 'draw' },
  { id: 'create-13', category: 'creativity', name: 'World Builder', description: 'Design your own world', minAge: 7, maxAge: 12, difficulty: 'hard', xpReward: 35, icon: '🌍', type: 'draw' },
  { id: 'create-14', category: 'creativity', name: 'Character Quest', description: 'Create a story character', minAge: 6, maxAge: 11, difficulty: 'medium', xpReward: 25, icon: '🦸', type: 'draw' },
  { id: 'create-15', category: 'creativity', name: 'Art Challenge', description: 'Complete creative challenges', minAge: 5, maxAge: 12, difficulty: 'medium', xpReward: 25, icon: '🎭', type: 'draw' }
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
    lastReset: new Date().toISOString().split('T')[0]
  })

  // Game State
  const [gameProgress, setGameProgress] = useKV<GameProgress[]>(STORAGE_KEYS.GAME_PROGRESS, [])
  const [parentSettings, setParentSettings] = useKV<ParentSettings>(STORAGE_KEYS.PARENT_SETTINGS, {
    gamesEnabled: true,
    maxDailyGameMinutes: 60,
    allowedCategories: ['math', 'memory', 'logic', 'words', 'pattern', 'speed', 'creativity']
  })

  // UI State
  const [selectedKid, setSelectedKid] = useState<KidProfile | null>(null)
  const [currentView, setCurrentView] = useState<'home' | 'learn' | 'profile' | 'games'>('home')
  const [selectedSubject, setSelectedSubject] = useState<typeof SUBJECTS[0] | null>(null)
  const [showSetup, setShowSetup] = useState(false)

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
  }>({ score: 0, timeLeft: 60, currentQuestion: 0, answers: [], isPlaying: false, showResult: false })
  const [showParentSettings, setShowParentSettings] = useState(false)
  const gameTimerRef = useRef<number | null>(null)

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
          lastReset: today
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

  // ==========================================
  // Credit System
  // ==========================================

  const hasCredits = (): boolean => {
    if (!credits) return false
    return (credits.free + credits.purchased) >= CREDIT_COST_PER_MESSAGE
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
  // Camera & Behavior Monitoring
  // ==========================================

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 }
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
        setCurrentSession(prev => prev ? {
          ...prev,
          focusScores: [...prev.focusScores, focusScore]
        } : prev)
      }
    }, 5000)
  }

  const recordBehaviorNote = (note: string) => {
    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        behaviorNotes: [...prev.behaviorNotes, `${new Date().toLocaleTimeString()}: ${note}`]
      } : prev)
    }
  }

  // ==========================================
  // Learning Session
  // ==========================================

  const startLearningSession = (subject: typeof SUBJECTS[0]) => {
    if (!selectedKid) return

    setSelectedSubject(subject)
    setMessages([])
    setCurrentView('learn')

    const session: StudySession = {
      id: `session-${Date.now()}`,
      kidId: selectedKid.id,
      subject: subject.id,
      topic: '',
      startTime: Date.now(),
      focusScores: [],
      behaviorNotes: [],
      xpEarned: 0,
      completed: false
    }
    setCurrentSession(session)

    // Generate welcome message
    generateWelcome(subject)
  }

  const endLearningSession = (xpEarned: number = 10) => {
    if (!currentSession || !selectedKid) return

    const completedSession: StudySession = {
      ...currentSession,
      endTime: Date.now(),
      xpEarned,
      completed: true
    }

    setSessions(prev => [...(prev || []), completedSession])

    // Update kid stats
    const duration = Math.round((Date.now() - currentSession.startTime) / 1000 / 60)
    setProfiles(prev => (prev || []).map(p => {
      if (p.id === selectedKid.id) {
        const newXP = p.xp + xpEarned
        return {
          ...p,
          xp: newXP,
          level: Math.floor(newXP / 100) + 1,
          totalSessions: p.totalSessions + 1,
          totalStudyMinutes: p.totalStudyMinutes + duration,
          lastActiveDate: new Date().toISOString().split('T')[0],
          streak: updateStreak(p)
        }
      }
      return p
    }))

    // Generate behavior report if camera was active
    if (cameraActive && currentSession.focusScores.length > 0) {
      generateBehaviorReport(completedSession)
    }

    stopCamera()
    setCurrentSession(null)
    setSelectedSubject(null)
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

  const generateWelcome = async (subject: typeof SUBJECTS[0]) => {
    if (!selectedKid || !hasCredits()) {
      if (!hasCredits()) {
        toast.error('No AI credits remaining. Purchase more or wait for daily reset.')
      }
      const fallback: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Hi ${selectedKid?.name || 'there'}! ${subject.emoji} Ready to learn ${subject.name}? What topic would you like to explore today?`,
        timestamp: Date.now()
      }
      setMessages([fallback])
      return
    }

    setIsLoading(true)
    useCredit()

    try {
      const gradeInfo = GRADES.find(g => g.value === selectedKid.grade)
      const lessonContext = currentLessonPlan
        ? `\n\nThe parent has uploaded a lesson plan with these topics: ${currentLessonPlan.topics.join(', ')}. Focus on these topics.`
        : ''

      const suggestionContext = getTodaySuggestion()
        ? `\n\nToday's parent suggestion: "${getTodaySuggestion()?.topic}" - Prioritize this topic.`
        : ''

      const systemPrompt = `You are FlowSphere Kids Tutor, a friendly AI tutor for children.

Student Profile:
- Name: ${selectedKid.name}
- Age: ${selectedKid.age} years old
- Grade: ${gradeInfo?.label || selectedKid.grade}
- Subject: ${subject.name}
- Language: ${LANGUAGES.find(l => l.code === selectedKid.language)?.name || 'English'}
${lessonContext}${suggestionContext}

CRITICAL RULES:
1. ALWAYS use age-appropriate vocabulary for a ${selectedKid.age}-year-old
2. Keep explanations SHORT (2-3 sentences for young kids, 3-4 for older)
3. Use fun examples and analogies kids can relate to
4. Include interactive elements (ask questions, give mini-quizzes)
5. Celebrate correct answers enthusiastically
6. Gently correct mistakes with encouragement
7. Award XP for correct answers (say "+10 XP!")
8. If the student seems confused, try a different approach
9. Never use complex jargon - explain everything simply`

      const result = await smartCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Start a ${subject.name} lesson. Greet me by name, then suggest 3 topics appropriate for my grade level that we could learn today. Make it fun!` }
      ], { temperature: 0.8 })

      const msg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result.content,
        timestamp: Date.now(),
        provider: result.provider
      }
      setMessages([msg])

      if (ttsEnabled) speak(result.content)
    } catch (error: any) {
      toast.error('Could not connect to AI tutor')
      const fallback: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Hi ${selectedKid.name}! ${subject.emoji} Let's learn some ${subject.name} today! What topic interests you?`,
        timestamp: Date.now()
      }
      setMessages([fallback])
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if ((!inputMessage.trim() && attachments.length === 0) || !selectedKid || !selectedSubject || isLoading) return

    if (!hasCredits()) {
      toast.error('No AI credits remaining', {
        description: 'Purchase more credits or wait for daily reset'
      })
      return
    }

    // Build message content including attachments
    let messageContent = inputMessage.trim()
    if (attachments.length > 0) {
      const attachmentDescriptions = attachments.map(att => {
        if (att.type === 'url') return `[Attached URL: ${att.url}]`
        if (att.type === 'image') return `[Attached Image: ${att.name}]`
        return `[Attached File: ${att.name}]`
      }).join('\n')
      messageContent = messageContent
        ? `${messageContent}\n\n${attachmentDescriptions}`
        : attachmentDescriptions
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    }

    setMessages(prev => [...prev, userMsg])
    setInputMessage('')
    setAttachments([]) // Clear attachments after sending
    setIsLoading(true)
    useCredit()

    try {
      const gradeInfo = GRADES.find(g => g.value === selectedKid.grade)
      const lessonContext = currentLessonPlan
        ? `\n\nLesson plan topics: ${currentLessonPlan.topics.join(', ')}`
        : ''

      const systemPrompt = `You are FlowSphere Kids Tutor for ${selectedKid.name}, age ${selectedKid.age}, in ${gradeInfo?.label || selectedKid.grade}.
Subject: ${selectedSubject.name}
${lessonContext}

Rules:
- Use age-appropriate language for a ${selectedKid.age}-year-old
- Keep responses concise (2-4 sentences)
- Be encouraging and fun
- Award "+10 XP!" for correct answers
- Ask follow-up questions to check understanding
- If the user shares files, images or URLs, acknowledge them and incorporate them into your teaching`

      const history = messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

      const result = await smartCompletion([
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: messageContent }
      ], { temperature: 0.7 })

      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: result.content,
        timestamp: Date.now(),
        provider: result.provider
      }

      setMessages(prev => [...prev, assistantMsg])

      // Check for XP award
      if (result.content.includes('+10 XP') || result.content.toLowerCase().includes('correct')) {
        if (currentSession) {
          setCurrentSession(prev => prev ? { ...prev, xpEarned: prev.xpEarned + 10 } : prev)
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

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
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
          mimeType: file.type
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
        url: url
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

    return GAME_CHALLENGES.filter(game =>
      selectedKid.age >= game.minAge &&
      selectedKid.age <= game.maxAge &&
      parentSettings.allowedCategories.includes(game.category)
    )
  }, [selectedKid, parentSettings])

  // Get games by category
  const getGamesByCategory = useCallback((category: string) => {
    return getAvailableGames().filter(game => game.category === category)
  }, [getAvailableGames])

  // Get game progress for a specific game
  const getGameProgressById = useCallback((gameId: string) => {
    return gameProgress.find(p => p.challengeId === gameId)
  }, [gameProgress])

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
      showResult: false
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
        score: isHighScore ? finalScore : (existingProgress?.score || 0),
        bestTime: gameState.timeLeft,
        attempts: (existingProgress?.attempts || 0) + 1,
        lastPlayed: new Date().toISOString()
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
        setProfiles(prev => prev.map(p =>
          p.id === selectedKid.id
            ? { ...p, xp: p.xp + xpToAward, level: Math.floor((p.xp + xpToAward) / 100) + 1 }
            : p
        ))
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
    setGameState({ score: 0, timeLeft: 60, currentQuestion: 0, answers: [], isPlaying: false, showResult: false })
  }

  // Toggle parent settings
  const toggleGameCategory = (categoryId: string) => {
    setParentSettings(prev => ({
      ...prev,
      allowedCategories: prev.allowedCategories.includes(categoryId)
        ? prev.allowedCategories.filter(c => c !== categoryId)
        : [...prev.allowedCategories, categoryId]
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
      const result = await smartCompletion([
        {
          role: 'system',
          content: `You are an educational curriculum analyzer. Extract key topics and create a learning outline for a ${selectedKid.age}-year-old in ${selectedKid.grade} grade. Be specific about what can be taught.`
        },
        {
          role: 'user',
          content: `Analyze this lesson material and extract 5-10 key topics suitable for my grade level:\n\n${lessonPlanText.slice(0, 3000)}`
        }
      ], { temperature: 0.5 })

      // Extract topics from AI response
      const topics = result.content.split('\n')
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
        createdAt: Date.now()
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

    const avgFocus = session.focusScores.length > 0
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
      aiInsights: `${selectedKid.name} maintained ${avgFocus}% focus during this ${SUBJECTS.find(s => s.id === session.subject)?.name} session.`
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
      completed: false
    }

    setSuggestions(prev => [...(prev || []), suggestion])
    toast.success('Study suggestion added!')
  }

  // ==========================================
  // Text-to-Speech
  // ==========================================

  const speak = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.replace(/\*\*/g, '').slice(0, 500))
    utterance.rate = 0.9
    utterance.pitch = 1.1
    window.speechSynthesis.speak(utterance)
  }

  // ==========================================
  // Profile Management
  // ==========================================

  const createProfile = (data: Omit<KidProfile, 'id' | 'xp' | 'level' | 'streak' | 'totalSessions' | 'totalStudyMinutes' | 'lastActiveDate'>) => {
    const profile: KidProfile = {
      ...data,
      id: `kid-${Date.now()}`,
      xp: 0,
      level: 1,
      streak: 0,
      totalSessions: 0,
      totalStudyMinutes: 0,
      lastActiveDate: ''
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
                <p className="text-sm text-muted-foreground">{selectedKid.grade} • Age {selectedKid.age}</p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{selectedKid.xp % 100} XP</span>
                    <span>{xpToNext} to Level {selectedKid.level + 1}</span>
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
            {SUBJECTS.map((subject) => {
              const Icon = subject.icon
              return (
                <button
                  key={subject.id}
                  onClick={() => startLearningSession(subject)}
                  className={cn(
                    "p-4 rounded-xl text-left text-white shadow-lg transition-transform hover:scale-105",
                    "bg-gradient-to-br",
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
            <Button variant="ghost" size="icon" onClick={() => endLearningSession(currentSession?.xpEarned || 10)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white", selectedSubject.color)}>
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
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
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
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={cn(ttsEnabled && "text-green-500")}
            >
              {ttsEnabled ? <SpeakerHigh className="w-4 h-4" /> : <SpeakerSlash className="w-4 h-4" />}
            </Button>

            {/* Credits */}
            <Badge variant="outline" className="text-xs">
              <Coin className="w-3 h-3 mr-1" />
              {getTotalCredits()}
            </Badge>
          </div>
        </div>

        {/* Focus Score (if camera active) */}
        {cameraActive && (
          <div className="mb-3 p-2 bg-muted rounded-lg flex items-center gap-3">
            <Eye className="w-4 h-4 text-green-500" />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span>Focus Score</span>
                <span className={cn(
                  "font-bold",
                  focusScore >= 70 ? "text-green-500" : focusScore >= 40 ? "text-yellow-500" : "text-red-500"
                )}>
                  {Math.round(focusScore)}%
                </span>
              </div>
              <Progress value={focusScore} className="h-1" />
            </div>
          </div>
        )}

        {/* Lesson Plan Upload */}
        {!currentLessonPlan && messages.length <= 1 && (
          <Card className="mb-3 p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Upload Lesson Plan (Optional)</span>
            </div>
            <Textarea
              placeholder="Paste textbook content or lesson plan here..."
              value={lessonPlanText}
              onChange={(e) => setLessonPlanText(e.target.value)}
              className="min-h-[60px] text-sm mb-2"
            />
            <Button
              size="sm"
              onClick={analyzeLessonPlan}
              disabled={!lessonPlanText.trim() || analyzingLesson}
            >
              {analyzingLesson ? 'Analyzing...' : 'Analyze & Use'}
            </Button>
          </Card>
        )}

        {/* Current Lesson Plan */}
        {currentLessonPlan && (
          <div className="mb-3 p-2 bg-blue-500/10 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-500">Lesson Plan Active</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setCurrentLessonPlan(null)}>
                Clear
              </Button>
            </div>
            <p className="text-xs text-muted-foreground truncate">Topics: {currentLessonPlan.topics.slice(0, 3).join(', ')}...</p>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 pr-2" ref={scrollRef}>
          <div className="space-y-3 pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'assistant' && (
                  <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0", selectedSubject.color)}>
                    <Robot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2",
                  msg.role === 'user'
                    ? "bg-violet-500 text-white rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                )}>
                  {/* Show attachment previews */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {msg.attachments.map(att => (
                        <div
                          key={att.id}
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                            msg.role === 'user' ? "bg-white/20" : "bg-muted-foreground/10"
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
                  {msg.provider && (
                    <p className="text-[9px] opacity-50 mt-1">{msg.provider}</p>
                  )}
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
                <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", selectedSubject.color)}>
                  <Robot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
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
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlAdd()}
                autoFocus
                className="text-sm"
              />
              <Button size="sm" onClick={handleUrlAdd} disabled={!urlInput.trim()}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowUrlInput(false); setUrlInput('') }}>
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
                      onClick={() => { setShowUrlInput(true); setShowAttachmentMenu(false) }}
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
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={isLoading || (!inputMessage.trim() && attachments.length === 0)}>
              <PaperPlaneTilt className="w-5 h-5" weight="fill" />
            </Button>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileUpload(e, 'image')}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
            multiple
            onChange={(e) => handleFileUpload(e, 'file')}
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
          {(profiles || []).map((kid) => (
            <Card
              key={kid.id}
              className={cn(
                "cursor-pointer transition-all",
                selectedKid?.id === kid.id && "ring-2 ring-violet-500"
              )}
              onClick={() => setSelectedKid(kid)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg">
                  {AVATARS[kid.avatar] || '🎓'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium">{kid.name}</h4>
                  <p className="text-xs text-muted-foreground">{kid.grade} • {kid.age} years</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Star className="w-3 h-3 mr-1" weight="fill" />
                    L{kid.level}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={(e) => {
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
                  .map((sug) => (
                    <div key={sug.id} className="p-2 bg-muted rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{sug.topic}</span>
                        <Badge variant={sug.completed ? "default" : "secondary"} className="text-[10px]">
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
                  .map((report) => (
                    <div key={report.id} className="p-2 border-b last:border-0">
                      <div className="flex items-center justify-between text-sm">
                        <span>{report.date}</span>
                        <Badge
                          variant={report.focusScore >= 70 ? "default" : report.focusScore >= 40 ? "secondary" : "destructive"}
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
                  <span className="font-medium">{credits?.free || 0} / {FREE_DAILY_CREDITS}</span>
                </div>
                <Progress value={(credits?.free || 0) / FREE_DAILY_CREDITS * 100} className="h-2" />
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
                  {gameState.score >= 80 ? 'Amazing!' : gameState.score >= 50 ? 'Good Job!' : 'Keep Practicing!'}
                </h2>
                <div className="text-4xl font-bold text-violet-500">{gameState.score}%</div>
                <p className="text-muted-foreground">
                  {gameState.score >= 50 && `+${Math.round((activeGame.xpReward * gameState.score) / 100)} XP earned!`}
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
                        {[1, 2, 3, 4].map((option) => {
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
                                setGameState(prev => ({ ...prev, score: newScore, currentQuestion: prev.currentQuestion + 1 }))
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
                              setGameState(prev => ({ ...prev, score: newScore, currentQuestion: prev.currentQuestion + 1 }))
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
                        {['A', 'B', 'C', 'D'].map((option) => (
                          <Button
                            key={option}
                            variant="outline"
                            size="lg"
                            className="h-16 text-xl"
                            onClick={() => {
                              const newScore = Math.min(100, gameState.score + 25)
                              setGameState(prev => ({ ...prev, score: newScore, currentQuestion: prev.currentQuestion + 1 }))
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
                  <p className="text-center text-xs text-muted-foreground mt-1">Progress: {gameState.score}%</p>
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
                  onClick={() => setParentSettings(prev => ({ ...prev, gamesEnabled: !prev.gamesEnabled }))}
                >
                  {parentSettings.gamesEnabled ? 'On' : 'Off'}
                </Button>
              </div>

              {/* Daily Time Limit */}
              <div>
                <p className="font-medium mb-2">Daily Game Time: {parentSettings.maxDailyGameMinutes} minutes</p>
                <div className="flex gap-2">
                  {[15, 30, 60, 90, 120].map(mins => (
                    <Button
                      key={mins}
                      variant={parentSettings.maxDailyGameMinutes === mins ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setParentSettings(prev => ({ ...prev, maxDailyGameMinutes: mins }))}
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
                      variant={parentSettings.allowedCategories.includes(cat.id) ? 'default' : 'outline'}
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
                    "p-4 cursor-pointer transition-all hover:shadow-md",
                    progress?.completed && "border-green-500/50 bg-green-500/5"
                  )}
                  onClick={() => startGame(game)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{game.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{game.name}</h3>
                        {progress?.completed && <CheckCircle className="w-4 h-4 text-green-500" weight="fill" />}
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
                <span className="text-sm text-muted-foreground">{completedCount}/{availableGames.length}</span>
              </div>
              <Progress value={(completedCount / Math.max(1, availableGames.length)) * 100} className="h-2" />
            </Card>

            {/* Game Categories Grid */}
            <div className="grid grid-cols-2 gap-3">
              {GAME_CATEGORIES.filter(cat => parentSettings.allowedCategories.includes(cat.id)).map(category => {
                const categoryGames = getGamesByCategory(category.id)
                const categoryCompleted = categoryGames.filter(g => getGameProgressById(g.id)?.completed).length

                return (
                  <Card
                    key={category.id}
                    className={cn(
                      "p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
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
                          style={{ width: `${(categoryCompleted / Math.max(1, categoryGames.length)) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px]">{categoryCompleted}/{categoryGames.length}</span>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Quick Play - Random Game */}
            <Card className="p-4">
              <Button
                className="w-full h-12"
                onClick={() => {
                  const randomGame = availableGames[Math.floor(Math.random() * availableGames.length)]
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
  // Main Render
  // ==========================================

  return (
    <div className={cn("space-y-4", isMobile && "space-y-3")}>
      {/* Header */}
      <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" weight="fill" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Kids Learning Center</h1>
            <p className="text-xs text-muted-foreground">AI-powered tutoring with behavior monitoring</p>
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
          {currentView === 'profile' && renderProfile()}
        </motion.div>
      </AnimatePresence>

      {/* Setup Modal */}
      <AnimatePresence>
        {showSetup && (
          <ProfileSetupModal
            onClose={() => setShowSetup(false)}
            onSave={createProfile}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ==========================================
// Parent Suggestion Form
// ==========================================

function ParentSuggestionForm({ onAdd }: { onAdd: (subject: string, topic: string, reason: string) => void }) {
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
            <SelectItem key={s.id} value={s.id}>{s.emoji} {s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Topic to study"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        className="h-9"
      />
      <Input
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-9"
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} className="flex-1">Cancel</Button>
        <Button size="sm" onClick={handleSubmit} className="flex-1">Add</Button>
      </div>
    </div>
  )
}

// ==========================================
// Profile Setup Modal
// ==========================================

function ProfileSetupModal({
  onClose,
  onSave
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
      dailyGoalMinutes: parseInt(dailyGoal) || 30
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
                      "w-10 h-10 rounded-full text-xl transition-all",
                      avatar === key
                        ? "bg-violet-500 ring-2 ring-violet-500 ring-offset-2"
                        : "bg-muted hover:bg-muted/80"
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
                onChange={(e) => setName(e.target.value)}
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
                      <SelectItem key={a} value={String(a)}>{a} years</SelectItem>
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
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
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
                    <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
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
                onChange={(e) => setParentEmail(e.target.value)}
              />
            </div>

            {/* Daily Goal */}
            <div>
              <Label>Daily Study Goal (minutes)</Label>
              <Input
                type="number"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
                min="10"
                max="120"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={handleSubmit} className="flex-1">Create Profile</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
