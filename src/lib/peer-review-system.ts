/**
 * Peer Review System for Kids Learning Center
 *
 * Enables students to:
 * - Share their work with classmates (with parent approval)
 * - Review and provide feedback on each other's work
 * - Earn XP for helpful, constructive reviews
 * - Learn collaboration and communication skills
 *
 * @module peer-review-system
 */

// ============================================
// Types & Interfaces
// ============================================

/**
 * Work submission that can be shared for peer review
 */
export interface PeerSubmission {
  id: string
  kidId: string
  kidName: string
  kidAvatar: string
  subject: string
  topic: string
  content: string
  attachments?: {
    type: 'image' | 'file'
    name: string
    data: string
  }[]
  submittedAt: number
  status: 'pending_approval' | 'approved' | 'shared' | 'reviewed'
  parentApproved: boolean
  parentApprovedAt?: number
  reviews: PeerReview[]
  averageRating: number
}

/**
 * Review given by a peer
 */
export interface PeerReview {
  id: string
  submissionId: string
  reviewerId: string
  reviewerName: string
  reviewerAvatar: string
  rating: 1 | 2 | 3 | 4 | 5 // Star rating
  feedback: string
  helpfulVotes: number
  createdAt: number
  categories: ReviewCategory[]
}

/**
 * Categories for structured feedback
 */
export interface ReviewCategory {
  name: string
  rating: 'great' | 'good' | 'needs_work'
  comment?: string
}

/**
 * Peer connection between students
 */
export interface PeerConnection {
  id: string
  kidId: string
  peerId: string
  peerName: string
  peerAvatar: string
  status: 'pending' | 'approved' | 'blocked'
  parentApproved: boolean
  connectedAt?: number
}

/**
 * Review prompt templates for kids
 */
export interface ReviewPrompt {
  category: string
  prompts: string[]
  ageRange: [number, number]
}

// ============================================
// Constants
// ============================================

export const STORAGE_KEYS = {
  SUBMISSIONS: 'flowsphere-peer-submissions',
  CONNECTIONS: 'flowsphere-peer-connections',
  REVIEW_STATS: 'flowsphere-review-stats',
}

/**
 * XP rewards for peer review activities
 */
export const PEER_REVIEW_XP = {
  SUBMIT_WORK: 5,
  GIVE_REVIEW: 10,
  RECEIVE_REVIEW: 5,
  HELPFUL_REVIEW: 15, // When review is marked helpful
  FIRST_REVIEW: 20, // Bonus for first review
}

/**
 * Review prompt templates by age group
 */
export const REVIEW_PROMPTS: ReviewPrompt[] = [
  {
    category: 'Understanding',
    prompts: [
      'Did they explain it clearly?',
      'Could you understand what they meant?',
      'Did they show their work?',
    ],
    ageRange: [5, 8],
  },
  {
    category: 'Effort',
    prompts: [
      'Did they try their best?',
      'Is their work neat and organized?',
      'Did they finish everything?',
    ],
    ageRange: [5, 8],
  },
  {
    category: 'Creativity',
    prompts: [
      'Did they have cool ideas?',
      'Was it interesting to look at?',
      'Did they try something new?',
    ],
    ageRange: [5, 8],
  },
  {
    category: 'Problem Solving',
    prompts: [
      'Did they solve the problem correctly?',
      'Did they show their thinking process?',
      'Could you follow their steps?',
    ],
    ageRange: [8, 12],
  },
  {
    category: 'Communication',
    prompts: [
      'Is their explanation clear and logical?',
      'Did they use proper vocabulary?',
      'Would someone else understand their work?',
    ],
    ageRange: [8, 12],
  },
  {
    category: 'Critical Thinking',
    prompts: [
      'Did they consider different approaches?',
      'Is their reasoning sound?',
      'Did they support their conclusions?',
    ],
    ageRange: [10, 18],
  },
]

/**
 * Feedback sentence starters for kids
 */
export const FEEDBACK_STARTERS = {
  positive: [
    'I really liked how you...',
    'Great job with...',
    'You did awesome at...',
    'I learned from your...',
    'Your work on... was really cool!',
  ],
  constructive: [
    'Maybe you could try...',
    'It might help if you...',
    'One idea is to...',
    'Next time, you could...',
    'I think it would be even better if...',
  ],
  questions: [
    'How did you figure out...?',
    'Can you explain more about...?',
    'What made you decide to...?',
    'I was wondering about...',
  ],
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique ID
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get appropriate review prompts for a child's age
 */
export function getPromptsForAge(age: number): ReviewPrompt[] {
  return REVIEW_PROMPTS.filter(prompt => age >= prompt.ageRange[0] && age <= prompt.ageRange[1])
}

/**
 * Get random feedback starters
 */
export function getRandomStarters(
  type: 'positive' | 'constructive' | 'questions',
  count = 2
): string[] {
  const starters = FEEDBACK_STARTERS[type]
  const shuffled = [...starters].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * Calculate average rating from reviews
 */
export function calculateAverageRating(reviews: PeerReview[]): number {
  if (reviews.length === 0) return 0
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

/**
 * Check if feedback is constructive (basic content moderation)
 */
export function isConstructiveFeedback(feedback: string): { isValid: boolean; reason?: string } {
  const lowerFeedback = feedback.toLowerCase()

  // Check minimum length
  if (feedback.length < 10) {
    return { isValid: false, reason: 'Please write a bit more to help your friend!' }
  }

  // Check for mean or inappropriate words
  const inappropriatePatterns = [
    /\b(stupid|dumb|idiot|hate|ugly|bad|worst|terrible)\b/i,
    /\b(suck|loser|fail)\b/i,
  ]

  for (const pattern of inappropriatePatterns) {
    if (pattern.test(lowerFeedback)) {
      return {
        isValid: false,
        reason: "Let's use kind words! Try saying what they could do better instead.",
      }
    }
  }

  // Check for at least one positive or constructive element
  const hasPositive = FEEDBACK_STARTERS.positive.some(starter =>
    lowerFeedback.includes(starter.toLowerCase().slice(0, 10))
  )
  const hasConstructive = FEEDBACK_STARTERS.constructive.some(starter =>
    lowerFeedback.includes(starter.toLowerCase().slice(0, 10))
  )
  const hasQuestion = lowerFeedback.includes('?')

  if (!hasPositive && !hasConstructive && !hasQuestion && feedback.length < 50) {
    return {
      isValid: false,
      reason: 'Try to include something positive or a helpful suggestion!',
    }
  }

  return { isValid: true }
}

// ============================================
// Submission Management
// ============================================

/**
 * Create a new peer submission
 */
export function createSubmission(
  kidId: string,
  kidName: string,
  kidAvatar: string,
  subject: string,
  topic: string,
  content: string,
  attachments?: PeerSubmission['attachments']
): PeerSubmission {
  return {
    id: generateId('sub'),
    kidId,
    kidName,
    kidAvatar,
    subject,
    topic,
    content,
    attachments,
    submittedAt: Date.now(),
    status: 'pending_approval',
    parentApproved: false,
    reviews: [],
    averageRating: 0,
  }
}

/**
 * Approve a submission for sharing (parent action)
 */
export function approveSubmission(submission: PeerSubmission): PeerSubmission {
  return {
    ...submission,
    status: 'approved',
    parentApproved: true,
    parentApprovedAt: Date.now(),
  }
}

/**
 * Share a submission with peers
 */
export function shareSubmission(submission: PeerSubmission): PeerSubmission {
  if (!submission.parentApproved) {
    throw new Error('Submission must be approved by parent before sharing')
  }
  return {
    ...submission,
    status: 'shared',
  }
}

/**
 * Add a review to a submission
 */
export function addReview(
  submission: PeerSubmission,
  review: Omit<PeerReview, 'id' | 'createdAt' | 'helpfulVotes'>
): PeerSubmission {
  const newReview: PeerReview = {
    ...review,
    id: generateId('rev'),
    createdAt: Date.now(),
    helpfulVotes: 0,
  }

  const updatedReviews = [...submission.reviews, newReview]

  return {
    ...submission,
    status: 'reviewed',
    reviews: updatedReviews,
    averageRating: calculateAverageRating(updatedReviews),
  }
}

/**
 * Mark a review as helpful
 */
export function markReviewHelpful(submission: PeerSubmission, reviewId: string): PeerSubmission {
  return {
    ...submission,
    reviews: submission.reviews.map(review =>
      review.id === reviewId ? { ...review, helpfulVotes: review.helpfulVotes + 1 } : review
    ),
  }
}

// ============================================
// Connection Management
// ============================================

/**
 * Create a peer connection request
 */
export function createConnectionRequest(
  kidId: string,
  peerId: string,
  peerName: string,
  peerAvatar: string
): PeerConnection {
  return {
    id: generateId('conn'),
    kidId,
    peerId,
    peerName,
    peerAvatar,
    status: 'pending',
    parentApproved: false,
  }
}

/**
 * Approve a peer connection (parent action)
 */
export function approveConnection(connection: PeerConnection): PeerConnection {
  return {
    ...connection,
    status: 'approved',
    parentApproved: true,
    connectedAt: Date.now(),
  }
}

// ============================================
// Storage Functions
// ============================================

/**
 * Get all submissions from storage
 */
export function getSubmissions(): PeerSubmission[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Save submissions to storage
 */
export function saveSubmissions(submissions: PeerSubmission[]): void {
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions))
}

/**
 * Get all peer connections from storage
 */
export function getConnections(): PeerConnection[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONNECTIONS)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Save connections to storage
 */
export function saveConnections(connections: PeerConnection[]): void {
  localStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify(connections))
}

/**
 * Get submissions available for a kid to review (from their peers)
 */
export function getReviewableSubmissions(
  kidId: string,
  connections: PeerConnection[]
): PeerSubmission[] {
  const approvedPeerIds = connections
    .filter(c => c.kidId === kidId && c.status === 'approved')
    .map(c => c.peerId)

  const submissions = getSubmissions()

  return submissions.filter(
    sub =>
      sub.status === 'shared' &&
      approvedPeerIds.includes(sub.kidId) &&
      !sub.reviews.some(r => r.reviewerId === kidId) // Not already reviewed by this kid
  )
}

/**
 * Get a kid's own submissions
 */
export function getKidSubmissions(kidId: string): PeerSubmission[] {
  return getSubmissions().filter(sub => sub.kidId === kidId)
}

// ============================================
// AI-Assisted Review Suggestions
// ============================================

/**
 * Generate AI-assisted feedback suggestions based on work content
 */
export function generateFeedbackSuggestions(
  workContent: string,
  subject: string,
  reviewerAge: number
): string[] {
  const suggestions: string[] = []

  // Based on subject, provide relevant feedback starters
  const subjectPrompts: Record<string, string[]> = {
    math: [
      'I like how you showed your work on...',
      'Your answer for... makes sense because...',
      'Maybe double-check the... step',
    ],
    science: [
      'Your hypothesis about... was interesting!',
      'I learned something new about...',
      'Have you thought about why...?',
    ],
    reading: [
      'I agree with your idea about...',
      'The way you explained... helped me understand',
      'What do you think the author meant by...?',
    ],
    general: [
      'I noticed you worked hard on...',
      'Your explanation of... was clear',
      "One thing I'd suggest is...",
    ],
  }

  const prompts = subjectPrompts[subject.toLowerCase()] || subjectPrompts.general
  suggestions.push(...prompts)

  // Add age-appropriate general suggestions
  if (reviewerAge < 8) {
    suggestions.push('I think your work is neat!', 'You did a good job!', 'Keep practicing!')
  } else {
    suggestions.push(
      'Your reasoning shows good understanding',
      'Consider adding more detail to...',
      'Strong effort on the challenging parts'
    )
  }

  return suggestions
}
