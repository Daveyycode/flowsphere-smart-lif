/**
 * AI Credit System
 * Manages user credits for AI-powered features
 * Users pay $2-10/month based on usage
 */

export interface CreditBalance {
  total: number // Total credits purchased
  used: number // Credits used
  remaining: number // Credits remaining
  currency: string
  lastUpdated: string
}

export interface CreditTransaction {
  id: string
  type: 'purchase' | 'usage' | 'refund'
  amount: number
  description: string
  feature: 'ai-call' | 'ai-email' | 'ai-sms' | 'ai-search' | 'ai-booking' | 'ai-analysis'
  timestamp: string
  status: 'completed' | 'pending' | 'failed'
}

export interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  popular: boolean
  savings?: string
}

// Credit costs for different AI features
export const CREDIT_COSTS = {
  'ai-call': 2.00,        // $2 per AI phone call
  'ai-email': 0.50,       // $0.50 per AI email
  'ai-sms': 0.75,         // $0.75 per AI SMS
  'ai-search': 0.25,      // $0.25 per AI search/browser query
  'ai-booking': 1.50,     // $1.50 per AI booking attempt
  'ai-analysis': 0.50     // $0.50 per AI analysis
} as const

// Available credit packages
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 2.00,
    price: 2.00,
    popular: false
  },
  {
    id: 'basic',
    name: 'Basic Pack',
    credits: 5.00,
    price: 5.00,
    popular: true,
    savings: 'Most Popular'
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 10.00,
    price: 10.00,
    popular: false,
    savings: 'Best Value'
  }
]

/**
 * Calculate remaining credits
 */
export function calculateRemainingCredits(balance: CreditBalance): number {
  return Math.max(0, balance.total - balance.used)
}

/**
 * Check if user has enough credits for an action
 */
export function hasEnoughCredits(
  balance: CreditBalance,
  feature: keyof typeof CREDIT_COSTS
): boolean {
  const cost = CREDIT_COSTS[feature]
  const remaining = calculateRemainingCredits(balance)
  return remaining >= cost
}

/**
 * Deduct credits for a feature usage
 */
export function deductCredits(
  balance: CreditBalance,
  feature: keyof typeof CREDIT_COSTS,
  description: string
): {
  newBalance: CreditBalance
  transaction: CreditTransaction
  success: boolean
} {
  const cost = CREDIT_COSTS[feature]
  const remaining = calculateRemainingCredits(balance)

  if (remaining < cost) {
    return {
      newBalance: balance,
      transaction: {
        id: `txn-${Date.now()}`,
        type: 'usage',
        amount: cost,
        description,
        feature,
        timestamp: new Date().toISOString(),
        status: 'failed'
      },
      success: false
    }
  }

  const newBalance: CreditBalance = {
    ...balance,
    used: balance.used + cost,
    remaining: remaining - cost,
    lastUpdated: new Date().toISOString()
  }

  const transaction: CreditTransaction = {
    id: `txn-${Date.now()}`,
    type: 'usage',
    amount: cost,
    description,
    feature,
    timestamp: new Date().toISOString(),
    status: 'completed'
  }

  return {
    newBalance,
    transaction,
    success: true
  }
}

/**
 * Add credits (purchase)
 */
export function addCredits(
  balance: CreditBalance,
  amount: number,
  packageName: string
): {
  newBalance: CreditBalance
  transaction: CreditTransaction
} {
  const newBalance: CreditBalance = {
    ...balance,
    total: balance.total + amount,
    remaining: calculateRemainingCredits(balance) + amount,
    lastUpdated: new Date().toISOString()
  }

  const transaction: CreditTransaction = {
    id: `txn-${Date.now()}`,
    type: 'purchase',
    amount,
    description: `Purchased ${packageName}`,
    feature: 'ai-booking', // Default feature for display
    timestamp: new Date().toISOString(),
    status: 'completed'
  }

  return {
    newBalance,
    transaction
  }
}

/**
 * Get credit usage breakdown
 */
export function getCreditUsageBreakdown(
  transactions: CreditTransaction[]
): Record<string, { count: number; total: number }> {
  const breakdown: Record<string, { count: number; total: number }> = {}

  transactions
    .filter(t => t.type === 'usage' && t.status === 'completed')
    .forEach(transaction => {
      if (!breakdown[transaction.feature]) {
        breakdown[transaction.feature] = { count: 0, total: 0 }
      }
      breakdown[transaction.feature].count++
      breakdown[transaction.feature].total += transaction.amount
    })

  return breakdown
}

/**
 * Get recommended package based on usage
 */
export function getRecommendedPackage(
  transactions: CreditTransaction[]
): CreditPackage {
  const monthlyUsage = transactions
    .filter(t => {
      const transactionDate = new Date(t.timestamp)
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return transactionDate > monthAgo && t.type === 'usage'
    })
    .reduce((sum, t) => sum + t.amount, 0)

  if (monthlyUsage >= 8) {
    return CREDIT_PACKAGES[2] // Pro Pack
  } else if (monthlyUsage >= 4) {
    return CREDIT_PACKAGES[1] // Basic Pack
  } else {
    return CREDIT_PACKAGES[0] // Starter Pack
  }
}

/**
 * Format credit amount for display
 */
export function formatCredits(amount: number): string {
  return `$${amount.toFixed(2)}`
}

/**
 * Get feature name for display
 */
export function getFeatureName(feature: keyof typeof CREDIT_COSTS): string {
  const names = {
    'ai-call': 'AI Phone Call',
    'ai-email': 'AI Email',
    'ai-sms': 'AI Text Message',
    'ai-search': 'AI Web Search',
    'ai-booking': 'AI Booking',
    'ai-analysis': 'AI Analysis'
  }
  return names[feature]
}

/**
 * Calculate estimated cost for an action
 */
export function estimateCost(
  feature: keyof typeof CREDIT_COSTS,
  quantity: number = 1
): number {
  return CREDIT_COSTS[feature] * quantity
}

/**
 * Check if balance is low (< 20% remaining)
 */
export function isBalanceLow(balance: CreditBalance): boolean {
  const remaining = calculateRemainingCredits(balance)
  const percentageRemaining = (remaining / balance.total) * 100
  return percentageRemaining < 20 && remaining > 0
}

/**
 * Check if balance is depleted
 */
export function isBalanceDepleted(balance: CreditBalance): boolean {
  return calculateRemainingCredits(balance) <= 0
}

/**
 * Get credit status message
 */
export function getCreditStatusMessage(balance: CreditBalance): {
  message: string
  severity: 'success' | 'warning' | 'error'
} {
  if (isBalanceDepleted(balance)) {
    return {
      message: 'Your credits are depleted. Purchase more to continue using AI features.',
      severity: 'error'
    }
  }

  if (isBalanceLow(balance)) {
    return {
      message: 'Your credit balance is running low. Consider adding more credits.',
      severity: 'warning'
    }
  }

  return {
    message: `You have ${formatCredits(calculateRemainingCredits(balance))} in credits available.`,
    severity: 'success'
  }
}

/**
 * Validate API keys are user's own
 */
export interface UserAPIKeys {
  openai?: string
  anthropic?: string
  google?: string
  custom?: string
  verified: boolean
  owner: string // User ID or email
}

export function validateAPIKeys(keys: UserAPIKeys): {
  valid: boolean
  message: string
} {
  if (!keys.verified) {
    return {
      valid: false,
      message: 'API keys not verified. Please add your own API keys to use AI features.'
    }
  }

  if (!keys.openai && !keys.anthropic && !keys.google && !keys.custom) {
    return {
      valid: false,
      message: 'No API keys configured. Add at least one API key to continue.'
    }
  }

  return {
    valid: true,
    message: 'API keys validated successfully'
  }
}

/**
 * Check if feature requires confirmation
 */
export function requiresConfirmation(feature: keyof typeof CREDIT_COSTS): boolean {
  // All features that can send emails, make calls, or send SMS require confirmation
  return ['ai-call', 'ai-email', 'ai-sms', 'ai-booking'].includes(feature)
}
