/**
 * Unit Tests for TutorBot Conversation Flow Manager
 *
 * Tests cover:
 * - Mood detection from student messages
 * - Safety concern detection (bullying, anxiety)
 * - Topic analysis and extraction
 * - Answer evaluation
 * - Session state management
 * - Summary generation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  detectMood,
  detectSafetyConcerns,
  analyzeUserInputForTopics,
  extractTopicFromContent,
  analyzeStudentAnswer,
  createInitialSessionState,
  determineNextPhase,
  updateSessionWithAnswer,
  generateSessionSummary,
  generatePhaseContext,
  DEFAULT_FLOW_CONFIG,
  type LearningTopic,
  type SessionState,
} from './tutor-conversation-flow'

// ============================================
// Test Data
// ============================================

const mockTopics: LearningTopic[] = [
  {
    id: 'math-1',
    name: 'Addition',
    description: 'Learn to add numbers together',
    difficulty: 'easy',
    estimatedMinutes: 15,
    keywords: ['add', 'plus', 'sum', 'total', 'numbers'],
  },
  {
    id: 'math-2',
    name: 'Multiplication',
    description: 'Learn to multiply numbers',
    difficulty: 'medium',
    estimatedMinutes: 20,
    keywords: ['multiply', 'times', 'product', 'tables'],
  },
  {
    id: 'reading-1',
    name: 'Reading Comprehension',
    description: 'Understanding what you read',
    difficulty: 'medium',
    estimatedMinutes: 25,
    keywords: ['read', 'understand', 'story', 'passage', 'questions'],
  },
]

// ============================================
// Mood Detection Tests
// ============================================

describe('detectMood', () => {
  it('should detect happy mood from positive words', () => {
    expect(detectMood("I'm so happy today!")).toBe('happy')
    expect(detectMood('This is awesome!')).toBe('happy')
    expect(detectMood('I love learning math!')).toBe('happy')
  })

  it('should detect sad mood from negative words', () => {
    expect(detectMood("I'm feeling sad")).toBe('sad')
    expect(detectMood('I had a bad day')).toBe('sad')
  })

  it('should detect anxious mood from worried expressions', () => {
    expect(detectMood("I'm worried about the test")).toBe('anxious')
    expect(detectMood("I'm scared of making mistakes")).toBe('anxious')
  })

  it('should detect frustrated mood', () => {
    expect(detectMood("I don't get this, it's too hard!")).toBe('frustrated')
    expect(detectMood("I'm so confused")).toBe('frustrated')
  })

  it('should detect excited mood', () => {
    expect(detectMood("I can't wait to learn more!!!")).toBe('excited')
    expect(detectMood("Yes! Let's go!")).toBe('excited')
  })

  it('should return neutral for ambiguous messages', () => {
    expect(detectMood('okay')).toBe('neutral')
    expect(detectMood('the answer is 5')).toBe('neutral')
  })

  it('should return null for very short messages', () => {
    expect(detectMood('')).toBe(null)
    expect(detectMood('a')).toBe(null)
  })
})

// ============================================
// Safety Concern Detection Tests
// ============================================

describe('detectSafetyConcerns', () => {
  it('should detect bullying mentions', () => {
    const concerns = detectSafetyConcerns('Some kids were bullying me at school')
    expect(concerns).toContain('Potential bullying mentioned')
  })

  it('should detect being picked on', () => {
    const concerns = detectSafetyConcerns('They always pick on me')
    expect(concerns).toContain('Potential bullying mentioned')
  })

  it('should detect anxiety about school', () => {
    const concerns = detectSafetyConcerns("I'm scared to go to school")
    expect(concerns).toContain('Signs of anxiety or distress')
  })

  it('should return empty array for normal messages', () => {
    const concerns = detectSafetyConcerns('I learned about fractions today!')
    expect(concerns).toHaveLength(0)
  })

  it('should detect both bullying and anxiety', () => {
    const concerns = detectSafetyConcerns("Someone bullied me and now I'm scared to go back")
    expect(concerns.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================
// Topic Analysis Tests
// ============================================

describe('analyzeUserInputForTopics', () => {
  it('should find topics matching user input', () => {
    const result = analyzeUserInputForTopics('I want to learn addition', mockTopics)
    expect(result[0].id).toBe('math-1')
  })

  it('should find topics from keywords', () => {
    const result = analyzeUserInputForTopics('help me multiply numbers', mockTopics)
    expect(result[0].id).toBe('math-2')
  })

  it('should return empty array for unrelated input', () => {
    const result = analyzeUserInputForTopics('random unrelated text', mockTopics)
    expect(result).toHaveLength(0)
  })

  it('should rank multiple matches by relevance', () => {
    const result = analyzeUserInputForTopics('I need help with math numbers', mockTopics)
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('extractTopicFromContent', () => {
  it('should extract topic title from formatted content', () => {
    const content = `Topic: Double Bar Graphs
    Learn to read and interpret double bar graphs.
    Objectives:
    - Understand how to read legends
    - Compare two data sets`

    const result = extractTopicFromContent(content)
    expect(result.title).toBe('Double Bar Graphs')
  })

  it('should extract subject from content', () => {
    const content = `Subject: Mathematics
    Today we learn about fractions.`

    const result = extractTopicFromContent(content)
    expect(result.subject?.toLowerCase()).toContain('math')
  })

  it('should extract objectives from bullet points', () => {
    const content = `Lesson Plan
    1. Learn addition
    2. Practice with examples
    3. Complete worksheet`

    const result = extractTopicFromContent(content)
    expect(result.objectives.length).toBeGreaterThan(0)
  })

  it('should extract keywords from content', () => {
    const content = `Mathematics Multiplication
    Today we will learn multiplication tables.
    Multiplication is repeated addition.
    Practice multiplication every day.`

    const result = extractTopicFromContent(content)
    expect(result.keywords).toContain('multiplication')
  })
})

// ============================================
// Answer Evaluation Tests
// ============================================

describe('analyzeStudentAnswer', () => {
  it('should correctly evaluate numeric answers', () => {
    const result = analyzeStudentAnswer('25', '25', 'numeric')
    expect(result.isCorrect).toBe(true)
    expect(result.confidence).toBe(1)
  })

  it('should handle numeric answers with text', () => {
    const result = analyzeStudentAnswer('The answer is 42', '42', 'numeric')
    expect(result.isCorrect).toBe(true)
  })

  it('should correctly evaluate wrong numeric answers', () => {
    const result = analyzeStudentAnswer('10', '15', 'numeric')
    expect(result.isCorrect).toBe(false)
  })

  it('should evaluate multiple choice answers', () => {
    const result = analyzeStudentAnswer('B', 'B', 'multiple_choice')
    expect(result.isCorrect).toBe(true)
  })

  it('should evaluate text answers with keyword matching', () => {
    const result = analyzeStudentAnswer(
      'Photosynthesis is how plants make food using sunlight',
      'Plants use photosynthesis to convert sunlight into food',
      'explanation'
    )
    expect(result.isCorrect).toBe(true)
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('should detect mood in answers', () => {
    const result = analyzeStudentAnswer("I don't understand, this is too hard!", '5', 'numeric')
    expect(result.detectedMood).toBe('frustrated')
  })

  it('should detect need for clarification', () => {
    const result = analyzeStudentAnswer('what?', 'The answer is 5', 'text')
    expect(result.needsClarification).toBe(true)
  })
})

// ============================================
// Session State Tests
// ============================================

describe('createInitialSessionState', () => {
  it('should create valid initial state', () => {
    const state = createInitialSessionState()

    expect(state.phase).toBe('welcome')
    expect(state.currentTopic).toBe(null)
    expect(state.questionsAsked).toBe(0)
    expect(state.correctAnswers).toBe(0)
    expect(state.incorrectAnswers).toBe(0)
    expect(state.topicsCovered).toEqual([])
    expect(state.mood).toBe(null)
    expect(state.startTime).toBeLessThanOrEqual(Date.now())
  })
})

describe('determineNextPhase', () => {
  let state: SessionState

  beforeEach(() => {
    state = createInitialSessionState()
  })

  it('should stay in welcome phase initially', () => {
    const nextPhase = determineNextPhase(state, DEFAULT_FLOW_CONFIG)
    expect(nextPhase).toBe('welcome')
  })

  it('should transition from welcome to topic_selection after timeout', () => {
    state.startTime = Date.now() - (DEFAULT_FLOW_CONFIG.welcomeDurationMs + 1000)
    const nextPhase = determineNextPhase(state, DEFAULT_FLOW_CONFIG)
    expect(nextPhase).toBe('topic_selection')
  })

  it('should transition to teaching when topic is selected', () => {
    state.phase = 'topic_selection'
    state.currentTopic = mockTopics[0]
    const nextPhase = determineNextPhase(state, DEFAULT_FLOW_CONFIG)
    expect(nextPhase).toBe('teaching')
  })

  it('should transition from teaching to questioning', () => {
    state.phase = 'teaching'
    const nextPhase = determineNextPhase(state, DEFAULT_FLOW_CONFIG)
    expect(nextPhase).toBe('questioning')
  })

  it('should transition from questioning to feedback', () => {
    state.phase = 'questioning'
    const nextPhase = determineNextPhase(state, DEFAULT_FLOW_CONFIG)
    expect(nextPhase).toBe('feedback')
  })

  it('should transition to summary after enough questions', () => {
    state.phase = 'feedback'
    state.questionsAsked = DEFAULT_FLOW_CONFIG.minQuestionsBeforeSummary * 2
    state.correctAnswers = 8
    state.incorrectAnswers = 2
    const nextPhase = determineNextPhase(state, DEFAULT_FLOW_CONFIG)
    expect(nextPhase).toBe('summary')
  })
})

describe('updateSessionWithAnswer', () => {
  let state: SessionState

  beforeEach(() => {
    state = createInitialSessionState()
    state.currentTopic = mockTopics[0]
  })

  it('should increment correct answers', () => {
    const analysis = {
      isCorrect: true,
      confidence: 1,
      detectedMood: null,
      keywords: [],
      suggestedTopics: [],
      needsClarification: false,
      emotionalCues: [],
    }

    const updated = updateSessionWithAnswer(state, analysis, DEFAULT_FLOW_CONFIG)
    expect(updated.correctAnswers).toBe(1)
    expect(updated.questionsAsked).toBe(1)
  })

  it('should increment incorrect answers', () => {
    const analysis = {
      isCorrect: false,
      confidence: 0,
      detectedMood: null,
      keywords: [],
      suggestedTopics: [],
      needsClarification: false,
      emotionalCues: [],
    }

    const updated = updateSessionWithAnswer(state, analysis, DEFAULT_FLOW_CONFIG)
    expect(updated.incorrectAnswers).toBe(1)
  })

  it('should update mood tracking', () => {
    const analysis = {
      isCorrect: true,
      confidence: 1,
      detectedMood: 'happy' as const,
      keywords: [],
      suggestedTopics: [],
      needsClarification: false,
      emotionalCues: [],
    }

    const updated = updateSessionWithAnswer(state, analysis, DEFAULT_FLOW_CONFIG)
    expect(updated.mood).toBe('happy')
    expect(updated.moodHistory).toContain('happy')
  })

  it('should track weak areas', () => {
    state.correctAnswers = 1
    state.incorrectAnswers = 5

    const analysis = {
      isCorrect: false,
      confidence: 0,
      detectedMood: null,
      keywords: [],
      suggestedTopics: [],
      needsClarification: false,
      emotionalCues: [],
    }

    const updated = updateSessionWithAnswer(state, analysis, DEFAULT_FLOW_CONFIG)
    expect(updated.weakAreas).toContain('Addition')
  })
})

// ============================================
// Summary Generation Tests
// ============================================

describe('generateSessionSummary', () => {
  it('should generate outstanding performance message for 90%+', () => {
    const state = createInitialSessionState()
    state.correctAnswers = 9
    state.incorrectAnswers = 1

    const summary = generateSessionSummary(state)
    expect(summary.performance).toContain('90%')
  })

  it('should generate encouraging message for lower scores', () => {
    const state = createInitialSessionState()
    state.correctAnswers = 3
    state.incorrectAnswers = 7

    const summary = generateSessionSummary(state)
    expect(summary.performance).toContain('learning')
  })

  it('should include recommendations for weak areas', () => {
    const state = createInitialSessionState()
    state.weakAreas = ['Multiplication', 'Division']

    const summary = generateSessionSummary(state)
    expect(summary.recommendations).toContainEqual(expect.stringContaining('Multiplication'))
  })

  it('should provide supportive encouragement for frustrated students', () => {
    const state = createInitialSessionState()
    state.moodHistory = ['neutral', 'frustrated']

    const summary = generateSessionSummary(state)
    expect(summary.encouragement).toContain('mistake')
  })
})

// ============================================
// Phase Context Generation Tests
// ============================================

describe('generatePhaseContext', () => {
  it('should generate welcome phase context', () => {
    const state = createInitialSessionState()
    const context = generatePhaseContext('welcome', state)

    expect(context).toContain('WELCOME')
    expect(context).toContain('Greet')
    expect(context).toContain('feeling')
  })

  it('should generate teaching phase context with topic', () => {
    const state = createInitialSessionState()
    state.currentTopic = mockTopics[0]

    const context = generatePhaseContext('teaching', state)
    expect(context).toContain('TEACHING')
    expect(context).toContain('Addition')
  })

  it('should generate feedback phase context with stats', () => {
    const state = createInitialSessionState()
    state.questionsAsked = 5
    state.correctAnswers = 3
    state.incorrectAnswers = 2

    const context = generatePhaseContext('feedback', state)
    expect(context).toContain('5')
    expect(context).toContain('3')
    expect(context).toContain('2')
  })

  it('should generate summary phase context', () => {
    const state = createInitialSessionState()
    state.correctAnswers = 8
    state.incorrectAnswers = 2

    const context = generatePhaseContext('summary', state)
    expect(context).toContain('SUMMARY')
    expect(context).toContain('80%')
  })
})
