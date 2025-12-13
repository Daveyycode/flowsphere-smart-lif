/**
 * Email Classification Rules - User-customizable rules for email categorization
 * Allows users to define trigger words, senders, and domains for each category
 */

export interface CategoryRule {
  keywords: string[]
  senderEmails: string[]
  senderDomains: string[]
  enabled: boolean
}

export interface EmailClassificationRules {
  urgent: CategoryRule
  work: CategoryRule
  personal: CategoryRule
  subs: CategoryRule // subscriptions
  bills: CategoryRule // bills & payments
}

const RULES_STORAGE_KEY = 'flowsphere-email-classification-rules'

// Default rules with user-defined trigger words
const DEFAULT_RULES: EmailClassificationRules = {
  urgent: {
    // URGENT (FLAG - can overlap with other categories)
    keywords: [
      'urgent',
      'asap',
      'immediate',
      'now',
      'today',
      'tomorrow',
      'emergency',
      'critical',
      'action required',
      'help needed',
      'outage',
      'down',
      'crash',
      'fix now',
      'call me',
      'important',
      'high priority',
      'reply by eod',
      'due today',
      'final notice',
      'expiring today',
    ],
    senderEmails: [],
    senderDomains: [],
    enabled: true,
  },
  work: {
    // WORK - Professional/business context
    keywords: [
      'meeting',
      'deadline',
      'project',
      'report',
      'client',
      'invoice',
      'follow-up',
      'task',
      'collaboration',
      'team update',
      'standup',
      'sprint',
      'review',
      'approval',
      'fyi',
      'q4 goals',
      'deliverable',
      'status update',
      'onboarding',
      'offboarding',
      'performance review',
      'budget',
      'expenses',
      'contract',
      'nda',
      'manager',
      'supervisor',
      'hr',
      'compliance',
      'policy',
    ],
    senderEmails: [],
    senderDomains: [
      // User can add their @company.com domains
    ],
    enabled: true,
  },
  personal: {
    // PERSONAL - Informal/relational emails
    keywords: [
      'hey',
      'hi there',
      'how are you',
      'dinner',
      'lunch',
      'coffee',
      'catch up',
      'weekend plans',
      'birthday',
      'happy birthday',
      'congratulations',
      'thank you',
      'sorry',
      'family',
      'mom',
      'dad',
      'love you',
      'see you soon',
      'thinking of you',
      'photos attached',
      'party',
      'invitation',
      'wedding',
      'vacation',
      'trip',
      'hangout',
      'miss you',
    ],
    senderEmails: [],
    senderDomains: [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'icloud.com',
      'aol.com',
      'protonmail.com',
    ],
    enabled: true,
  },
  subs: {
    // SUBSCRIPTION - Automated service emails (billing, newsletters, promos)
    keywords: [
      'newsletter',
      'update',
      'your account',
      'renewal',
      'receipt',
      'order confirmation',
      'shipping',
      'unsubscribe',
      'promotion',
      'deal',
      'discount',
      'weekly digest',
      'monthly roundup',
      'new post',
      "you're invited",
      'exclusive offer',
      'limited time',
      'flash sale',
      'welcome to',
      'thank you for subscribing',
      'subscription',
      'billing',
      // Payment-related
      'payment was unsuccessful',
      'payment unsuccessful',
      'payment declined',
      'payment to',
      'unable to charge',
      'charge the credit card',
      'subscription suspended',
      'subscription cancelled',
      'subscription canceled',
      'trial started',
      'trial ending',
      'trial expires',
      'free trial',
    ],
    senderEmails: [
      'billing@',
      'subscriptions@',
      'membership@',
      'payments@',
      'accounts@',
      'noreply@',
      'no-reply@',
      'notifications@',
      'updates@',
    ],
    senderDomains: [
      // Service names from user's list
      'netflix.com',
      'spotify.com',
      'amazon.com',
      'medium.com',
      'substack.com',
      'patreon.com',
      'apple.com',
      'google.com',
      'microsoft.com',
      'adobe.com',
      'dropbox.com',
      'slack.com',
      'notion.so',
      'figma.com',
      'github.com',
      'stripe.com',
      'zoom.us',
      'canva.com',
      'openai.com',
      'anthropic.com',
    ],
    enabled: true,
  },
  bills: {
    // BILLS - Utility bills, credit cards, loans, due payments
    keywords: [
      'bill',
      'invoice',
      'statement',
      'due date',
      'payment due',
      'amount due',
      'electricity bill',
      'water bill',
      'internet bill',
      'phone bill',
      'gas bill',
      'credit card statement',
      'credit card bill',
      'minimum payment',
      'balance due',
      'utility bill',
      'rent due',
      'mortgage payment',
      'loan payment',
      'installment',
      'overdue',
      'past due',
      'late fee',
      'pay now',
      'pay by',
      'final reminder',
      'disconnection notice',
      'service interruption',
      'meralco',
      'pldt',
      'globe',
      'maynilad',
      'manila water',
      'bpi',
      'bdo',
      'metrobank',
      'gcash',
      'maya',
      'your bill is ready',
      'view your statement',
      'e-statement',
      'e-bill',
    ],
    senderEmails: [
      'billing@',
      'statements@',
      'ebill@',
      'noreply@',
      'payments@',
      'accounts@',
      'collections@',
      'notices@',
    ],
    senderDomains: [
      'meralco.com.ph',
      'pldt.com.ph',
      'globe.com.ph',
      'smart.com.ph',
      'maynilad.com.ph',
      'manilawater.com',
      'bpiexpressonline.com',
      'bdo.com.ph',
      'metrobank.com.ph',
      'gcash.com',
      'maya.ph',
      'unionbankph.com',
      'securitybank.com',
      'chinabank.ph',
      'landbank.com',
    ],
    enabled: true,
  },
}

export const EmailClassificationRulesStore = {
  /**
   * Get all classification rules
   */
  getRules(): EmailClassificationRules {
    try {
      const stored = localStorage.getItem(RULES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with defaults to ensure all categories exist
        return {
          ...DEFAULT_RULES,
          ...parsed,
          urgent: { ...DEFAULT_RULES.urgent, ...parsed.urgent },
          work: { ...DEFAULT_RULES.work, ...parsed.work },
          personal: { ...DEFAULT_RULES.personal, ...parsed.personal },
          subs: { ...DEFAULT_RULES.subs, ...parsed.subs },
          bills: { ...DEFAULT_RULES.bills, ...parsed.bills },
        }
      }
      return DEFAULT_RULES
    } catch {
      return DEFAULT_RULES
    }
  },

  /**
   * Save classification rules
   */
  saveRules(rules: EmailClassificationRules): void {
    try {
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules))
      // Dispatch event for other components
      window.dispatchEvent(
        new CustomEvent('flowsphere-email-rules-updated', {
          detail: rules,
        })
      )
    } catch (error) {
      console.error('Failed to save email rules:', error)
    }
  },

  /**
   * Update a single category's rules
   */
  updateCategoryRules(
    category: keyof EmailClassificationRules,
    updates: Partial<CategoryRule>
  ): void {
    const rules = this.getRules()
    rules[category] = { ...rules[category], ...updates }
    this.saveRules(rules)
  },

  /**
   * Add a keyword to a category
   */
  addKeyword(category: keyof EmailClassificationRules, keyword: string): void {
    const rules = this.getRules()
    if (!rules[category].keywords.includes(keyword.toLowerCase())) {
      rules[category].keywords.push(keyword.toLowerCase())
      this.saveRules(rules)
    }
  },

  /**
   * Remove a keyword from a category
   */
  removeKeyword(category: keyof EmailClassificationRules, keyword: string): void {
    const rules = this.getRules()
    rules[category].keywords = rules[category].keywords.filter(
      k => k.toLowerCase() !== keyword.toLowerCase()
    )
    this.saveRules(rules)
  },

  /**
   * Add a sender email pattern to a category
   */
  addSenderEmail(category: keyof EmailClassificationRules, email: string): void {
    const rules = this.getRules()
    if (!rules[category].senderEmails.includes(email.toLowerCase())) {
      rules[category].senderEmails.push(email.toLowerCase())
      this.saveRules(rules)
    }
  },

  /**
   * Add a sender domain to a category
   */
  addSenderDomain(category: keyof EmailClassificationRules, domain: string): void {
    const rules = this.getRules()
    const cleanDomain = domain.toLowerCase().replace(/^@/, '')
    if (!rules[category].senderDomains.includes(cleanDomain)) {
      rules[category].senderDomains.push(cleanDomain)
      this.saveRules(rules)
    }
  },

  /**
   * Reset to default rules
   */
  resetToDefaults(): void {
    this.saveRules(DEFAULT_RULES)
  },

  /**
   * Classify an email based on user rules (fast, no AI)
   */
  classifyByRules(email: {
    subject: string
    body: string
    from: { email: string; name: string }
  }): {
    category: 'urgent' | 'work' | 'personal' | 'subs' | 'bills' | 'all'
    confidence: number
    matchedRule?: string
  } {
    const rules = this.getRules()
    const text = `${email.subject} ${email.body}`.toLowerCase()
    const senderEmail = email.from.email.toLowerCase()
    const senderDomain = senderEmail.split('@')[1] || ''

    // Check BILLS and SUBSCRIPTION FIRST - payment/billing emails are high priority
    // Priority order: bills > subs > urgent > work > personal
    const categories: (keyof EmailClassificationRules)[] = [
      'bills',
      'subs',
      'urgent',
      'work',
      'personal',
    ]

    for (const category of categories) {
      const rule = rules[category]
      if (!rule.enabled) continue

      // Check keywords
      for (const keyword of rule.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          return {
            category,
            confidence: 0.9,
            matchedRule: `keyword: "${keyword}"`,
          }
        }
      }

      // Check sender email patterns
      for (const emailPattern of rule.senderEmails) {
        if (senderEmail.includes(emailPattern.toLowerCase())) {
          return {
            category,
            confidence: 0.85,
            matchedRule: `sender: "${emailPattern}"`,
          }
        }
      }

      // Check sender domains
      for (const domain of rule.senderDomains) {
        if (
          senderDomain === domain.toLowerCase() ||
          senderEmail.includes(`@${domain.toLowerCase()}`)
        ) {
          return {
            category,
            confidence: 0.8,
            matchedRule: `domain: "${domain}"`,
          }
        }
      }
    }

    // Default to 'all' if no rules match
    return {
      category: 'all',
      confidence: 0.5,
      matchedRule: undefined,
    }
  },

  /**
   * Subscribe to rules changes
   */
  subscribe(callback: (rules: EmailClassificationRules) => void): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<EmailClassificationRules>
      callback(customEvent.detail)
    }
    window.addEventListener('flowsphere-email-rules-updated', handler)
    return () => window.removeEventListener('flowsphere-email-rules-updated', handler)
  },
}

export default EmailClassificationRulesStore
