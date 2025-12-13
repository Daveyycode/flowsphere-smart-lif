/**
 * Tests for Peer Review System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateId,
  getPromptsForAge,
  getRandomStarters,
  calculateAverageRating,
  isConstructiveFeedback,
  createSubmission,
  approveSubmission,
  shareSubmission,
  addReview,
  markReviewHelpful,
  createConnectionRequest,
  approveConnection,
  PEER_REVIEW_XP,
  REVIEW_PROMPTS,
  FEEDBACK_STARTERS,
  type PeerSubmission,
  type PeerReview,
  type PeerConnection,
} from './peer-review-system'

describe('Peer Review System', () => {
  describe('generateId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateId('sub')
      const id2 = generateId('sub')

      expect(id1).toMatch(/^sub-\d+-[a-z0-9]+$/)
      expect(id2).toMatch(/^sub-\d+-[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })

    it('should use different prefixes correctly', () => {
      const subId = generateId('sub')
      const revId = generateId('rev')
      const connId = generateId('conn')

      expect(subId).toMatch(/^sub-/)
      expect(revId).toMatch(/^rev-/)
      expect(connId).toMatch(/^conn-/)
    })
  })

  describe('getPromptsForAge', () => {
    it('should return prompts for young children (5-8)', () => {
      const prompts = getPromptsForAge(6)

      expect(prompts.length).toBeGreaterThan(0)
      expect(prompts.some(p => p.category === 'Understanding')).toBe(true)
      expect(prompts.some(p => p.category === 'Effort')).toBe(true)
      expect(prompts.some(p => p.category === 'Creativity')).toBe(true)
    })

    it('should return prompts for older children (8-12)', () => {
      const prompts = getPromptsForAge(10)

      expect(prompts.length).toBeGreaterThan(0)
      expect(prompts.some(p => p.category === 'Problem Solving')).toBe(true)
      expect(prompts.some(p => p.category === 'Communication')).toBe(true)
      expect(prompts.some(p => p.category === 'Critical Thinking')).toBe(true)
    })

    it('should return empty array for age outside range', () => {
      const prompts = getPromptsForAge(3)
      expect(prompts.length).toBe(0)
    })
  })

  describe('getRandomStarters', () => {
    it('should return positive starters', () => {
      const starters = getRandomStarters('positive', 2)

      expect(starters.length).toBe(2)
      starters.forEach(starter => {
        expect(FEEDBACK_STARTERS.positive).toContain(starter)
      })
    })

    it('should return constructive starters', () => {
      const starters = getRandomStarters('constructive', 3)

      expect(starters.length).toBe(3)
      starters.forEach(starter => {
        expect(FEEDBACK_STARTERS.constructive).toContain(starter)
      })
    })

    it('should return question starters', () => {
      const starters = getRandomStarters('questions', 2)

      expect(starters.length).toBe(2)
      starters.forEach(starter => {
        expect(FEEDBACK_STARTERS.questions).toContain(starter)
      })
    })
  })

  describe('calculateAverageRating', () => {
    it('should return 0 for empty reviews', () => {
      expect(calculateAverageRating([])).toBe(0)
    })

    it('should calculate average correctly', () => {
      const reviews: PeerReview[] = [
        {
          id: '1',
          submissionId: 's1',
          reviewerId: 'r1',
          reviewerName: 'Test',
          reviewerAvatar: '',
          rating: 4,
          feedback: 'Good',
          helpfulVotes: 0,
          createdAt: Date.now(),
          categories: [],
        },
        {
          id: '2',
          submissionId: 's1',
          reviewerId: 'r2',
          reviewerName: 'Test2',
          reviewerAvatar: '',
          rating: 5,
          feedback: 'Great',
          helpfulVotes: 0,
          createdAt: Date.now(),
          categories: [],
        },
      ]

      expect(calculateAverageRating(reviews)).toBe(4.5)
    })

    it('should round to one decimal place', () => {
      const reviews: PeerReview[] = [
        {
          id: '1',
          submissionId: 's1',
          reviewerId: 'r1',
          reviewerName: 'Test',
          reviewerAvatar: '',
          rating: 3,
          feedback: 'OK',
          helpfulVotes: 0,
          createdAt: Date.now(),
          categories: [],
        },
        {
          id: '2',
          submissionId: 's1',
          reviewerId: 'r2',
          reviewerName: 'Test2',
          reviewerAvatar: '',
          rating: 4,
          feedback: 'Good',
          helpfulVotes: 0,
          createdAt: Date.now(),
          categories: [],
        },
        {
          id: '3',
          submissionId: 's1',
          reviewerId: 'r3',
          reviewerName: 'Test3',
          reviewerAvatar: '',
          rating: 5,
          feedback: 'Great',
          helpfulVotes: 0,
          createdAt: Date.now(),
          categories: [],
        },
      ]

      expect(calculateAverageRating(reviews)).toBe(4)
    })
  })

  describe('isConstructiveFeedback', () => {
    it('should reject feedback that is too short', () => {
      const result = isConstructiveFeedback('Good')

      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('write a bit more')
    })

    it('should reject feedback with inappropriate words', () => {
      const result = isConstructiveFeedback('This is stupid work and I hate it')

      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('kind words')
    })

    it('should accept feedback with positive starters', () => {
      const result = isConstructiveFeedback('I really liked how you solved the problem!')

      expect(result.isValid).toBe(true)
    })

    it('should accept feedback with constructive starters', () => {
      const result = isConstructiveFeedback('Maybe you could try adding more details next time.')

      expect(result.isValid).toBe(true)
    })

    it('should accept feedback with questions', () => {
      const result = isConstructiveFeedback('How did you figure out the answer?')

      expect(result.isValid).toBe(true)
    })

    it('should accept long feedback without starters', () => {
      const result = isConstructiveFeedback(
        'Your work shows great understanding of the concepts. The way you organized your thoughts was clear and logical. I could follow your reasoning throughout.'
      )

      expect(result.isValid).toBe(true)
    })
  })

  describe('createSubmission', () => {
    it('should create a submission with correct properties', () => {
      const submission = createSubmission(
        'kid1',
        'Alex',
        '👧',
        'Math',
        'Fractions',
        'My work on fractions'
      )

      expect(submission.id).toMatch(/^sub-/)
      expect(submission.kidId).toBe('kid1')
      expect(submission.kidName).toBe('Alex')
      expect(submission.kidAvatar).toBe('👧')
      expect(submission.subject).toBe('Math')
      expect(submission.topic).toBe('Fractions')
      expect(submission.content).toBe('My work on fractions')
      expect(submission.status).toBe('pending_approval')
      expect(submission.parentApproved).toBe(false)
      expect(submission.reviews).toEqual([])
      expect(submission.averageRating).toBe(0)
    })

    it('should include attachments when provided', () => {
      const attachments = [{ type: 'image' as const, name: 'work.png', data: 'base64...' }]
      const submission = createSubmission(
        'kid1',
        'Alex',
        '👧',
        'Math',
        'Fractions',
        'Work',
        attachments
      )

      expect(submission.attachments).toEqual(attachments)
    })
  })

  describe('approveSubmission', () => {
    it('should approve a submission', () => {
      const submission = createSubmission('kid1', 'Alex', '👧', 'Math', 'Fractions', 'Work')
      const approved = approveSubmission(submission)

      expect(approved.status).toBe('approved')
      expect(approved.parentApproved).toBe(true)
      expect(approved.parentApprovedAt).toBeDefined()
    })
  })

  describe('shareSubmission', () => {
    it('should share an approved submission', () => {
      const submission = createSubmission('kid1', 'Alex', '👧', 'Math', 'Fractions', 'Work')
      const approved = approveSubmission(submission)
      const shared = shareSubmission(approved)

      expect(shared.status).toBe('shared')
    })

    it('should throw error for unapproved submission', () => {
      const submission = createSubmission('kid1', 'Alex', '👧', 'Math', 'Fractions', 'Work')

      expect(() => shareSubmission(submission)).toThrow('must be approved')
    })
  })

  describe('addReview', () => {
    it('should add a review to a submission', () => {
      const submission = createSubmission('kid1', 'Alex', '👧', 'Math', 'Fractions', 'Work')
      const approved = approveSubmission(submission)
      const shared = shareSubmission(approved)

      const reviewed = addReview(shared, {
        submissionId: shared.id,
        reviewerId: 'kid2',
        reviewerName: 'Sam',
        reviewerAvatar: '👦',
        rating: 4,
        feedback: 'Great work on fractions!',
        categories: [],
      })

      expect(reviewed.status).toBe('reviewed')
      expect(reviewed.reviews.length).toBe(1)
      expect(reviewed.reviews[0].rating).toBe(4)
      expect(reviewed.averageRating).toBe(4)
    })

    it('should update average rating with multiple reviews', () => {
      let submission = createSubmission('kid1', 'Alex', '👧', 'Math', 'Fractions', 'Work')
      submission = approveSubmission(submission)
      submission = shareSubmission(submission)

      submission = addReview(submission, {
        submissionId: submission.id,
        reviewerId: 'kid2',
        reviewerName: 'Sam',
        reviewerAvatar: '👦',
        rating: 4,
        feedback: 'Good work!',
        categories: [],
      })

      submission = addReview(submission, {
        submissionId: submission.id,
        reviewerId: 'kid3',
        reviewerName: 'Jordan',
        reviewerAvatar: '🧒',
        rating: 5,
        feedback: 'Excellent!',
        categories: [],
      })

      expect(submission.reviews.length).toBe(2)
      expect(submission.averageRating).toBe(4.5)
    })
  })

  describe('markReviewHelpful', () => {
    it('should increment helpful votes for a review', () => {
      let submission = createSubmission('kid1', 'Alex', '👧', 'Math', 'Fractions', 'Work')
      submission = approveSubmission(submission)
      submission = shareSubmission(submission)

      submission = addReview(submission, {
        submissionId: submission.id,
        reviewerId: 'kid2',
        reviewerName: 'Sam',
        reviewerAvatar: '👦',
        rating: 4,
        feedback: 'Good work!',
        categories: [],
      })

      const reviewId = submission.reviews[0].id
      const updated = markReviewHelpful(submission, reviewId)

      expect(updated.reviews[0].helpfulVotes).toBe(1)
    })
  })

  describe('createConnectionRequest', () => {
    it('should create a pending connection', () => {
      const connection = createConnectionRequest('kid1', 'kid2', 'Sam', '👦')

      expect(connection.id).toMatch(/^conn-/)
      expect(connection.kidId).toBe('kid1')
      expect(connection.peerId).toBe('kid2')
      expect(connection.peerName).toBe('Sam')
      expect(connection.status).toBe('pending')
      expect(connection.parentApproved).toBe(false)
    })
  })

  describe('approveConnection', () => {
    it('should approve a connection', () => {
      const connection = createConnectionRequest('kid1', 'kid2', 'Sam', '👦')
      const approved = approveConnection(connection)

      expect(approved.status).toBe('approved')
      expect(approved.parentApproved).toBe(true)
      expect(approved.connectedAt).toBeDefined()
    })
  })

  describe('XP Constants', () => {
    it('should have correct XP values', () => {
      expect(PEER_REVIEW_XP.SUBMIT_WORK).toBe(5)
      expect(PEER_REVIEW_XP.GIVE_REVIEW).toBe(10)
      expect(PEER_REVIEW_XP.RECEIVE_REVIEW).toBe(5)
      expect(PEER_REVIEW_XP.HELPFUL_REVIEW).toBe(15)
      expect(PEER_REVIEW_XP.FIRST_REVIEW).toBe(20)
    })
  })

  describe('Review Prompts', () => {
    it('should have prompts for all age groups', () => {
      expect(REVIEW_PROMPTS.length).toBeGreaterThan(0)

      const youngKidPrompts = REVIEW_PROMPTS.filter(p => p.ageRange[0] <= 5 && p.ageRange[1] >= 8)
      const olderKidPrompts = REVIEW_PROMPTS.filter(p => p.ageRange[0] <= 8 && p.ageRange[1] >= 12)

      expect(youngKidPrompts.length).toBeGreaterThan(0)
      expect(olderKidPrompts.length).toBeGreaterThan(0)
    })
  })
})
