/**
 * TutorBot Conversation Flow Manager
 *
 * This module implements a structured conversation flow for the AI tutor,
 * following educational best practices:
 *
 * FLOW PHASES:
 * 1. Welcome - Greet student, check mood, discuss interests
 * 2. Topic Selection - Display available topics, help student choose
 * 3. Question & Answer - Teach content, ask questions, provide feedback
 * 4. Summary - Recap key points, suggest next steps
 *
 * Based on NLP-driven conversational tutoring principles.
 */

// ============================================
// Types & Interfaces
// ============================================

/**
 * Represents the current phase of the tutoring conversation
 */
export type ConversationPhase =
  | 'welcome' // Initial greeting and mood check
  | 'topic_selection' // Choosing what to learn
  | 'teaching' // Active instruction
  | 'questioning' // Asking student questions
  | 'feedback' // Providing feedback on answers
  | 'summary' // Session wrap-up

/**
 * Student mood detected from conversation
 */
export type StudentMood = 'happy' | 'neutral' | 'sad' | 'anxious' | 'excited' | 'frustrated' | null

/**
 * Topic available for learning
 */
export interface LearningTopic {
  id: string
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  prerequisites?: string[]
  estimatedMinutes: number
  keywords: string[]
}

/**
 * Student response analysis result
 */
export interface ResponseAnalysis {
  isCorrect: boolean
  confidence: number // 0-1 scale
  detectedMood: StudentMood
  keywords: string[]
  suggestedTopics: string[]
  needsClarification: boolean
  emotionalCues: string[]
}

/**
 * Session state tracking
 */
export interface SessionState {
  phase: ConversationPhase
  currentTopic: LearningTopic | null
  questionsAsked: number
  correctAnswers: number
  incorrectAnswers: number
  topicsCovered: string[]
  weakAreas: string[]
  strongAreas: string[]
  mood: StudentMood
  moodHistory: StudentMood[]
  startTime: number
  keyPointsToSummarize: string[]
}

/**
 * Flow transition rules configuration
 */
export interface FlowConfig {
  welcomeDurationMs: number // How long to stay in welcome phase
  minQuestionsBeforeSummary: number // Minimum questions before allowing summary
  moodCheckInterval: number // Check mood every N messages
  weakAreaThreshold: number // Percentage wrong to mark as weak area
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_FLOW_CONFIG: FlowConfig = {
  welcomeDurationMs: 3 * 60 * 1000, // 3 minutes
  minQuestionsBeforeSummary: 5,
  moodCheckInterval: 3,
  weakAreaThreshold: 0.4, // 40% wrong = weak area
}

// ============================================
// Mood Detection
// ============================================

/**
 * Keywords and patterns for detecting student mood from text
 */
const MOOD_PATTERNS: Record<StudentMood & string, RegExp[]> = {
  happy: [
    /\b(happy|great|awesome|amazing|love|fun|excited|yay|cool|nice)\b/i,
    /[!]{2,}|[:;]-?\)|😊|😄|🎉|👍/,
  ],
  sad: [/\b(sad|unhappy|down|depressed|crying|tears|bad day|not good)\b/i, /[:(]|😢|😭|😞|💔/],
  anxious: [
    /\b(worried|anxious|nervous|scared|afraid|stress|bully|bullied|mean|hurt)\b/i,
    /\b(someone|they|kids?|people)\s+(said|called|did|made|hurt|bother)\b/i,
    /😰|😨|😟|🥺/,
  ],
  excited: [/\b(excited|can't wait|yes|let's go|ready|pumped)\b/i, /[!]{3,}|🚀|⭐|💫/],
  frustrated: [
    /\b(frustrated|confused|don't get|hard|difficult|stuck|hate|annoying)\b/i,
    /😤|😠|🤯|😫/,
  ],
  neutral: [],
}

/**
 * Analyzes text to detect the student's emotional state
 *
 * @param text - The student's message text
 * @returns Detected mood or null if uncertain
 */
export function detectMood(text: string): StudentMood {
  if (!text || text.length < 2) return null

  const lowerText = text.toLowerCase()
  const scores: Record<string, number> = {}

  // Score each mood based on pattern matches
  for (const [mood, patterns] of Object.entries(MOOD_PATTERNS)) {
    scores[mood] = patterns.reduce((score, pattern) => {
      const matches = lowerText.match(pattern)
      return score + (matches ? matches.length : 0)
    }, 0)
  }

  // Find highest scoring mood
  let maxScore = 0
  let detectedMood: StudentMood = null

  for (const [mood, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      detectedMood = mood as StudentMood
    }
  }

  // Only return mood if confidence is sufficient
  return maxScore >= 1 ? detectedMood : 'neutral'
}

/**
 * Checks if student message contains bullying or safety concerns
 *
 * @param text - The student's message
 * @returns Array of detected concerns for parent alerts
 */
export function detectSafetyConcerns(text: string): string[] {
  const concerns: string[] = []
  const lowerText = text.toLowerCase()

  const bullyingPatterns = [
    /\b(bully|bullied|bullying|pick on|picked on)\b/i,
    /\b(mean|hurt|hit|pushed|kicked)\s+(me|by)\b/i,
    /\b(someone|they|kids?|he|she)\s+(said|called|made fun)\b/i,
    /\b(hate myself|no friends|alone|nobody likes)\b/i,
  ]

  const anxietyPatterns = [
    /\b(scared|afraid|terrified)\s+(of|to go|to)\b/i,
    /\b(don't want to|can't)\s+(go to school|face)\b/i,
    /\b(panic|anxiety|anxious|worry|worried)\b/i,
  ]

  for (const pattern of bullyingPatterns) {
    if (pattern.test(lowerText)) {
      concerns.push('Potential bullying mentioned')
      break
    }
  }

  for (const pattern of anxietyPatterns) {
    if (pattern.test(lowerText)) {
      concerns.push('Signs of anxiety or distress')
      break
    }
  }

  return concerns
}

// ============================================
// Topic Analysis
// ============================================

/**
 * Analyzes user input to determine relevant topics
 *
 * @param userInput - The student's message about what they want to learn
 * @param availableTopics - List of topics that can be taught
 * @returns Sorted list of matching topics by relevance
 */
export function analyzeUserInputForTopics(
  userInput: string,
  availableTopics: LearningTopic[]
): LearningTopic[] {
  const lowerInput = userInput.toLowerCase()
  const inputWords = lowerInput.split(/\s+/)

  // Score each topic based on keyword matches
  const scoredTopics = availableTopics.map(topic => {
    let score = 0

    // Check topic name
    if (lowerInput.includes(topic.name.toLowerCase())) {
      score += 10
    }

    // Check keywords
    for (const keyword of topic.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        score += 5
      }

      // Partial word matches
      for (const inputWord of inputWords) {
        if (inputWord.length > 3 && keyword.toLowerCase().includes(inputWord)) {
          score += 2
        }
      }
    }

    // Check description
    const descWords = topic.description.toLowerCase().split(/\s+/)
    for (const descWord of descWords) {
      if (descWord.length > 4 && lowerInput.includes(descWord)) {
        score += 1
      }
    }

    return { topic, score }
  })

  // Sort by score descending and return topics
  return scoredTopics
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(t => t.topic)
}

/**
 * Extracts topic information from uploaded content
 *
 * @param content - Text content from uploaded file/image
 * @returns Extracted topic details
 */
export function extractTopicFromContent(content: string): {
  title: string | null
  subject: string | null
  objectives: string[]
  keywords: string[]
} {
  const lines = content.split('\n').map(l => l.trim())
  let title: string | null = null
  let subject: string | null = null
  const objectives: string[] = []
  const keywords: string[] = []

  // Look for title patterns
  const titlePatterns = [
    /^(?:topic|title|lesson|chapter|unit):\s*(.+)/i,
    /^(?:learning about|today we learn|subject):\s*(.+)/i,
  ]

  for (const line of lines) {
    for (const pattern of titlePatterns) {
      const match = line.match(pattern)
      if (match) {
        title = match[1].trim()
        break
      }
    }
    if (title) break
  }

  // Look for subject
  const subjectPatterns = [
    /^(?:subject|course|class):\s*(.+)/i,
    /\b(math|science|reading|writing|english|history|geography)\b/i,
  ]

  for (const line of lines) {
    for (const pattern of subjectPatterns) {
      const match = line.match(pattern)
      if (match) {
        subject = match[1].trim()
        break
      }
    }
    if (subject) break
  }

  // Look for objectives
  const objectivePatterns = [/^(?:\d+\.|[-*])\s*(.+)/, /^(?:objective|goal|learn):\s*(.+)/i]

  for (const line of lines) {
    for (const pattern of objectivePatterns) {
      const match = line.match(pattern)
      if (match && match[1].length > 10 && match[1].length < 200) {
        objectives.push(match[1].trim())
      }
    }
  }

  // Extract keywords (capitalized words, technical terms)
  const allText = content.toLowerCase()
  const wordPattern = /\b[a-z]{4,}\b/g
  const words = allText.match(wordPattern) || []

  // Count word frequency
  const wordFreq: Record<string, number> = {}
  for (const word of words) {
    wordFreq[word] = (wordFreq[word] || 0) + 1
  }

  // Get high-frequency words as keywords
  const sortedWords = Object.entries(wordFreq)
    .filter(([word, count]) => count >= 2 && !COMMON_WORDS.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)

  keywords.push(...sortedWords)

  return { title, subject, objectives, keywords }
}

// Common words to exclude from keywords
const COMMON_WORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'can',
  'had',
  'her',
  'was',
  'one',
  'our',
  'out',
  'has',
  'have',
  'been',
  'will',
  'your',
  'from',
  'they',
  'with',
  'this',
  'that',
  'what',
  'which',
  'their',
  'about',
  'would',
  'there',
  'could',
  'other',
  'into',
  'more',
  'some',
  'time',
  'very',
  'when',
  'come',
  'make',
  'than',
  'first',
  'been',
  'long',
  'little',
  'after',
  'words',
  'called',
  'just',
  'where',
  'most',
  'know',
])

// ============================================
// Answer Evaluation
// ============================================

/**
 * Analyzes a student's answer to a question
 *
 * @param studentAnswer - The student's response
 * @param expectedAnswer - The correct/expected answer
 * @param questionType - Type of question asked
 * @returns Analysis of the student's response
 */
export function analyzeStudentAnswer(
  studentAnswer: string,
  expectedAnswer: string,
  questionType: 'numeric' | 'text' | 'multiple_choice' | 'explanation'
): ResponseAnalysis {
  const analysis: ResponseAnalysis = {
    isCorrect: false,
    confidence: 0,
    detectedMood: detectMood(studentAnswer),
    keywords: [],
    suggestedTopics: [],
    needsClarification: false,
    emotionalCues: [],
  }

  const lowerStudent = studentAnswer.toLowerCase().trim()
  const lowerExpected = expectedAnswer.toLowerCase().trim()

  switch (questionType) {
    case 'numeric':
      // Extract numbers from both answers
      const studentNum = parseFloat(lowerStudent.replace(/[^0-9.-]/g, ''))
      const expectedNum = parseFloat(lowerExpected.replace(/[^0-9.-]/g, ''))

      if (!isNaN(studentNum) && !isNaN(expectedNum)) {
        analysis.isCorrect = Math.abs(studentNum - expectedNum) < 0.001
        analysis.confidence = analysis.isCorrect ? 1 : 0
      }
      break

    case 'multiple_choice':
      // Check for exact match or option letter
      analysis.isCorrect =
        lowerStudent === lowerExpected ||
        lowerStudent.startsWith(lowerExpected.charAt(0)) ||
        lowerExpected.includes(lowerStudent)
      analysis.confidence = analysis.isCorrect ? 1 : 0
      break

    case 'text':
    case 'explanation':
      // Check for key concept matches
      const expectedWords = lowerExpected.split(/\s+/).filter(w => w.length > 3)
      const studentWords = lowerStudent.split(/\s+/).filter(w => w.length > 3)

      let matchCount = 0
      for (const expected of expectedWords) {
        if (studentWords.some(s => s.includes(expected) || expected.includes(s))) {
          matchCount++
        }
      }

      const matchRatio = matchCount / Math.max(expectedWords.length, 1)
      analysis.isCorrect = matchRatio >= 0.6 // 60% match threshold
      analysis.confidence = matchRatio

      // Extract keywords from student answer
      analysis.keywords = studentWords.filter(w => !COMMON_WORDS.has(w))

      // Check if clarification needed
      if (lowerStudent.length < 10 || lowerStudent.includes('?')) {
        analysis.needsClarification = true
      }
      break
  }

  // Detect emotional cues
  const emotionalCues = detectSafetyConcerns(studentAnswer)
  analysis.emotionalCues = emotionalCues

  return analysis
}

// ============================================
// Session State Management
// ============================================

/**
 * Creates initial session state
 */
export function createInitialSessionState(): SessionState {
  return {
    phase: 'welcome',
    currentTopic: null,
    questionsAsked: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    topicsCovered: [],
    weakAreas: [],
    strongAreas: [],
    mood: null,
    moodHistory: [],
    startTime: Date.now(),
    keyPointsToSummarize: [],
  }
}

/**
 * Determines the next conversation phase based on current state
 *
 * @param state - Current session state
 * @param config - Flow configuration
 * @returns Recommended next phase
 */
export function determineNextPhase(state: SessionState, config: FlowConfig): ConversationPhase {
  const elapsed = Date.now() - state.startTime

  // Welcome phase transitions
  if (state.phase === 'welcome') {
    if (elapsed >= config.welcomeDurationMs || state.currentTopic) {
      return 'topic_selection'
    }
    return 'welcome'
  }

  // Topic selection transitions
  if (state.phase === 'topic_selection') {
    if (state.currentTopic) {
      return 'teaching'
    }
    return 'topic_selection'
  }

  // Teaching transitions
  if (state.phase === 'teaching') {
    return 'questioning'
  }

  // Questioning transitions
  if (state.phase === 'questioning') {
    return 'feedback'
  }

  // Feedback transitions
  if (state.phase === 'feedback') {
    // Check if ready for summary
    if (state.questionsAsked >= config.minQuestionsBeforeSummary) {
      // Calculate accuracy
      const total = state.correctAnswers + state.incorrectAnswers
      if (total > 0) {
        const accuracy = state.correctAnswers / total
        // If doing well or struggling, might be time to summarize
        if (accuracy >= 0.8 || state.questionsAsked >= config.minQuestionsBeforeSummary * 2) {
          return 'summary'
        }
      }
    }
    // Continue teaching
    return 'teaching'
  }

  // Summary - stays in summary until session ends
  return 'summary'
}

/**
 * Updates session state based on answer analysis
 *
 * @param state - Current session state
 * @param analysis - Result of answer analysis
 * @param config - Flow configuration
 * @returns Updated session state
 */
export function updateSessionWithAnswer(
  state: SessionState,
  analysis: ResponseAnalysis,
  config: FlowConfig
): SessionState {
  const updated = { ...state }

  updated.questionsAsked++

  if (analysis.isCorrect) {
    updated.correctAnswers++
  } else {
    updated.incorrectAnswers++
  }

  // Update mood tracking
  if (analysis.detectedMood) {
    updated.mood = analysis.detectedMood
    updated.moodHistory.push(analysis.detectedMood)
  }

  // Update weak/strong areas
  if (state.currentTopic) {
    const topicAccuracy =
      updated.correctAnswers / Math.max(updated.correctAnswers + updated.incorrectAnswers, 1)

    if (topicAccuracy < config.weakAreaThreshold) {
      if (!updated.weakAreas.includes(state.currentTopic.name)) {
        updated.weakAreas.push(state.currentTopic.name)
      }
    } else if (topicAccuracy >= 0.8) {
      if (!updated.strongAreas.includes(state.currentTopic.name)) {
        updated.strongAreas.push(state.currentTopic.name)
      }
    }
  }

  return updated
}

// ============================================
// Summary Generation
// ============================================

/**
 * Generates a session summary for the student
 *
 * @param state - Final session state
 * @returns Summary text components
 */
export function generateSessionSummary(state: SessionState): {
  performance: string
  keyPoints: string[]
  recommendations: string[]
  encouragement: string
} {
  const total = state.correctAnswers + state.incorrectAnswers
  const accuracy = total > 0 ? Math.round((state.correctAnswers / total) * 100) : 0

  // Performance summary
  let performance: string
  if (accuracy >= 90) {
    performance = `Outstanding work! You got ${accuracy}% correct!`
  } else if (accuracy >= 70) {
    performance = `Great job! You answered ${accuracy}% correctly!`
  } else if (accuracy >= 50) {
    performance = `Good effort! You got ${accuracy}% right. Keep practicing!`
  } else {
    performance = `You're learning! ${accuracy}% correct. Let's practice more next time!`
  }

  // Key points from session
  const keyPoints = state.keyPointsToSummarize.slice(0, 5)

  // Recommendations based on weak areas
  const recommendations: string[] = []
  if (state.weakAreas.length > 0) {
    recommendations.push(`Focus on: ${state.weakAreas.join(', ')}`)
  }
  if (state.topicsCovered.length > 0) {
    recommendations.push(`Review: ${state.topicsCovered.slice(-3).join(', ')}`)
  }

  // Encouragement based on mood
  let encouragement: string
  const recentMood = state.moodHistory[state.moodHistory.length - 1]

  if (recentMood === 'frustrated' || recentMood === 'sad') {
    encouragement =
      "Remember, making mistakes is how we learn! You're doing great, and I'm proud of your effort!"
  } else if (recentMood === 'anxious') {
    encouragement =
      "You did wonderfully today! Take your time, and remember - there's no rush in learning!"
  } else {
    encouragement = 'Keep up the amazing work! See you next time for more learning adventures!'
  }

  return { performance, keyPoints, recommendations, encouragement }
}

// ============================================
// Prompt Generation Helpers
// ============================================

/**
 * Generates phase-specific context for AI prompts
 *
 * @param phase - Current conversation phase
 * @param state - Session state
 * @returns Context string to include in AI prompt
 */
export function generatePhaseContext(phase: ConversationPhase, state: SessionState): string {
  switch (phase) {
    case 'welcome':
      return `CURRENT PHASE: WELCOME
- Greet the student warmly
- Ask how they're feeling today
- Show genuine interest in them as a person
- Listen for emotional cues (sadness, anxiety, excitement)
- Naturally transition to asking what they'd like to learn`

    case 'topic_selection':
      return `CURRENT PHASE: TOPIC SELECTION
- Help student choose what to learn
- Suggest topics based on their interests and skill level
- If they uploaded material, help them understand what's in it
- Make the choice feel collaborative, not forced`

    case 'teaching':
      return `CURRENT PHASE: TEACHING
${state.currentTopic ? `- Current topic: ${state.currentTopic.name}` : ''}
- Explain concepts clearly for their age level
- Use examples and analogies
- Break complex ideas into simple steps
- Build up to questions naturally`

    case 'questioning':
      return `CURRENT PHASE: QUESTIONING
- Ask a question to check understanding
- Make questions age-appropriate
- Give them time to think
- Encourage attempts even if unsure`

    case 'feedback':
      return `CURRENT PHASE: FEEDBACK
- Questions asked: ${state.questionsAsked}
- Correct: ${state.correctAnswers}, Incorrect: ${state.incorrectAnswers}
- Provide specific, helpful feedback
- Celebrate correct answers with enthusiasm (+10 XP!)
- For wrong answers: explain WHY and show the right approach
- Never make them feel bad for mistakes`

    case 'summary':
      const summary = generateSessionSummary(state)
      return `CURRENT PHASE: SUMMARY
- Wrap up the session positively
- Performance: ${summary.performance}
- Key points to reinforce: ${summary.keyPoints.join('; ') || 'General review'}
- Weak areas to address: ${state.weakAreas.join(', ') || 'None identified'}
- End with encouragement and excitement for next time`

    default:
      return ''
  }
}
