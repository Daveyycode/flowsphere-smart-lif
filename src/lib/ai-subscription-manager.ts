/**
 * AI Subscription Manager
 * Manages AI usage limits based on user subscription tier
 * Supports BYOK (Bring Your Own Key) for users with their own API keys
 *
 * ARCHITECTURE:
 * - Free: Rules-only (no AI)
 * - Basic: 500 AI classifications/month
 * - Pro: 5,000 AI classifications/month
 * - Enterprise: Unlimited
 * - BYOK: User's own API keys (unlimited on their budget)
 */

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise' | 'byok'

export interface SubscriptionPlan {
  id: SubscriptionTier
  name: string
  price: number // USD per month
  aiClassificationsPerMonth: number // -1 = unlimited
  features: string[]
  description: string
}

export interface UserSubscription {
  tier: SubscriptionTier
  aiUsageThisMonth: number
  aiUsageResetDate: string // ISO date
  byokKeys?: {
    groq?: string
    gemini?: string
    openrouter?: string
    openai?: string
    deepseek?: string
  }
  customRulesEnabled: boolean
  prioritySupport: boolean
}

export interface AIUsageRecord {
  timestamp: string
  emailId: string
  provider: string
  tokensUsed: number
  classification: string
}

// Subscription plans
export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    aiClassificationsPerMonth: 0, // Rules-only
    features: [
      'Rules-based classification',
      'Email monitoring (3 accounts)',
      'Basic categories',
      'Morning brief',
    ],
    description: 'Perfect for getting started. Uses smart rules for email classification.',
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 5,
    aiClassificationsPerMonth: 500,
    features: [
      'Everything in Free',
      '500 AI classifications/month',
      'Email monitoring (5 accounts)',
      'Custom work/personal rules',
      'Email search',
    ],
    description: 'AI-enhanced classification for ambiguous emails.',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 15,
    aiClassificationsPerMonth: 5000,
    features: [
      'Everything in Basic',
      '5,000 AI classifications/month',
      'Email monitoring (10 accounts)',
      'Priority AI processing',
      'Advanced analytics',
      'Email templates',
    ],
    description: 'For power users who need more AI assistance.',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 50,
    aiClassificationsPerMonth: -1, // Unlimited
    features: [
      'Everything in Pro',
      'Unlimited AI classifications',
      'Unlimited email accounts',
      'Custom AI models',
      'Dedicated support',
      'API access',
      'Team management',
    ],
    description: 'For businesses and teams with high-volume needs.',
  },
  byok: {
    id: 'byok',
    name: 'Bring Your Own Key',
    price: 3,
    aiClassificationsPerMonth: -1, // Unlimited (user's budget)
    features: [
      'Everything in Pro',
      'Use your own API keys',
      'Unlimited AI (your budget)',
      'Groq, Gemini, OpenAI, DeepSeek support',
      'Full control over AI costs',
    ],
    description: 'Use your own API keys. Pay AI providers directly.',
  },
}

const STORAGE_KEY = 'flowsphere-ai-subscription'
const USAGE_LOG_KEY = 'flowsphere-ai-usage-log'

class AISubscriptionManager {
  private subscription: UserSubscription
  private usageLog: AIUsageRecord[] = []

  constructor() {
    this.subscription = this.loadSubscription()
    this.usageLog = this.loadUsageLog()
    this.checkAndResetMonthlyUsage()
  }

  /**
   * Load subscription from localStorage
   */
  private loadSubscription(): UserSubscription {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // ignore
    }

    // Default to free tier
    const now = new Date()
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1) // First of next month

    return {
      tier: 'free',
      aiUsageThisMonth: 0,
      aiUsageResetDate: resetDate.toISOString(),
      customRulesEnabled: false,
      prioritySupport: false,
    }
  }

  /**
   * Save subscription to localStorage
   */
  private saveSubscription(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.subscription))
    } catch (error) {
      console.error('Failed to save subscription:', error)
    }
  }

  /**
   * Load usage log from localStorage
   */
  private loadUsageLog(): AIUsageRecord[] {
    try {
      const stored = localStorage.getItem(USAGE_LOG_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // ignore
    }
    return []
  }

  /**
   * Save usage log to localStorage (keep last 1000 records)
   */
  private saveUsageLog(): void {
    try {
      // Keep only last 1000 records
      const trimmed = this.usageLog.slice(-1000)
      localStorage.setItem(USAGE_LOG_KEY, JSON.stringify(trimmed))
    } catch (error) {
      console.error('Failed to save usage log:', error)
    }
  }

  /**
   * Check and reset monthly usage if needed
   */
  private checkAndResetMonthlyUsage(): void {
    const now = new Date()
    const resetDate = new Date(this.subscription.aiUsageResetDate)

    if (now >= resetDate) {
      console.log('📊 Resetting monthly AI usage counter')
      this.subscription.aiUsageThisMonth = 0
      // Set next reset date
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      this.subscription.aiUsageResetDate = nextReset.toISOString()
      this.saveSubscription()
    }
  }

  /**
   * Get current subscription
   */
  getSubscription(): UserSubscription {
    this.checkAndResetMonthlyUsage()
    return { ...this.subscription }
  }

  /**
   * Get subscription plan details
   */
  getPlan(): SubscriptionPlan {
    return SUBSCRIPTION_PLANS[this.subscription.tier]
  }

  /**
   * Check if user can use AI classification
   */
  canUseAI(): { allowed: boolean; reason?: string; remaining?: number } {
    this.checkAndResetMonthlyUsage()

    const plan = this.getPlan()

    // Free tier - no AI
    if (this.subscription.tier === 'free') {
      return {
        allowed: false,
        reason: 'Free tier uses rules-only classification. Upgrade to Basic for AI.',
      }
    }

    // BYOK - check if they have keys configured
    if (this.subscription.tier === 'byok') {
      const hasKeys = this.hasByokKeys()
      if (!hasKeys) {
        return {
          allowed: false,
          reason: 'Please configure your API keys in Settings → AI Keys',
        }
      }
      return { allowed: true, remaining: -1 } // Unlimited
    }

    // Enterprise - unlimited
    if (plan.aiClassificationsPerMonth === -1) {
      return { allowed: true, remaining: -1 }
    }

    // Check usage limit
    const remaining = plan.aiClassificationsPerMonth - this.subscription.aiUsageThisMonth
    if (remaining <= 0) {
      return {
        allowed: false,
        reason: `Monthly AI limit reached (${plan.aiClassificationsPerMonth}). Resets on ${new Date(this.subscription.aiUsageResetDate).toLocaleDateString()}`,
        remaining: 0,
      }
    }

    return { allowed: true, remaining }
  }

  /**
   * Check if BYOK user has configured keys
   */
  hasByokKeys(): boolean {
    const keys = this.subscription.byokKeys
    if (!keys) return false
    return !!(keys.groq || keys.gemini || keys.openrouter || keys.openai || keys.deepseek)
  }

  /**
   * Get BYOK API key for a provider
   */
  getByokKey(provider: 'groq' | 'gemini' | 'openrouter' | 'openai' | 'deepseek'): string | null {
    if (this.subscription.tier !== 'byok') return null
    return this.subscription.byokKeys?.[provider] || null
  }

  /**
   * Record AI usage
   */
  recordUsage(emailId: string, provider: string, tokensUsed: number, classification: string): void {
    // Don't count for BYOK or Enterprise (unlimited)
    if (this.subscription.tier !== 'byok' && this.subscription.tier !== 'enterprise') {
      this.subscription.aiUsageThisMonth++
      this.saveSubscription()
    }

    // Log the usage
    this.usageLog.push({
      timestamp: new Date().toISOString(),
      emailId,
      provider,
      tokensUsed,
      classification,
    })
    this.saveUsageLog()
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    usedThisMonth: number
    limitThisMonth: number
    percentUsed: number
    recentUsage: AIUsageRecord[]
    costEstimate: number
  } {
    const plan = this.getPlan()
    const limit = plan.aiClassificationsPerMonth
    const used = this.subscription.aiUsageThisMonth

    // Estimate cost based on provider (rough estimate)
    const avgTokensPerClassification = 800
    const avgCostPer1kTokens = 0.0002 // $0.20 per 1M tokens
    const costEstimate = (used * avgTokensPerClassification * avgCostPer1kTokens) / 1000

    return {
      usedThisMonth: used,
      limitThisMonth: limit === -1 ? Infinity : limit,
      percentUsed: limit === -1 ? 0 : Math.round((used / limit) * 100),
      recentUsage: this.usageLog.slice(-50),
      costEstimate: Math.round(costEstimate * 100) / 100,
    }
  }

  /**
   * Upgrade subscription tier
   */
  upgradeTier(tier: SubscriptionTier): void {
    this.subscription.tier = tier
    this.subscription.customRulesEnabled = tier !== 'free'
    this.subscription.prioritySupport = tier === 'enterprise'
    this.saveSubscription()

    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('flowsphere-subscription-changed', {
      detail: { tier, plan: SUBSCRIPTION_PLANS[tier] }
    }))

    console.log(`✨ Subscription upgraded to ${SUBSCRIPTION_PLANS[tier].name}`)
  }

  /**
   * Set BYOK API keys
   */
  setByokKeys(keys: UserSubscription['byokKeys']): void {
    this.subscription.byokKeys = keys
    this.saveSubscription()
    console.log('🔑 BYOK API keys updated')
  }

  /**
   * Get warning if approaching limit
   */
  getUsageWarning(): string | null {
    const plan = this.getPlan()
    if (plan.aiClassificationsPerMonth === -1) return null // Unlimited

    const percentUsed = (this.subscription.aiUsageThisMonth / plan.aiClassificationsPerMonth) * 100

    if (percentUsed >= 100) {
      return `You've reached your monthly AI limit. Upgrade for more.`
    }
    if (percentUsed >= 90) {
      return `You've used 90% of your monthly AI limit (${this.subscription.aiUsageThisMonth}/${plan.aiClassificationsPerMonth})`
    }
    if (percentUsed >= 75) {
      return `You've used 75% of your monthly AI limit`
    }
    return null
  }
}

// Global singleton
export const aiSubscriptionManager = new AISubscriptionManager()
export default aiSubscriptionManager
