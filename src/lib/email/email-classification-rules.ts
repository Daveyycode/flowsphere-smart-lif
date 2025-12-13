/**
 * Email Classification Rules - User-customizable rules for email categorization
 * NO AUTOMATIC DEFAULTS - User must configure via Email Categorization Setup Wizard
 *
 * This integrates with the setup wizard settings in:
 * - flowsphere-email-categorization-setup (full wizard settings)
 * - flowsphere-work-categorization (work/personal specific)
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
const WIZARD_SETTINGS_KEY = 'flowsphere-email-categorization-setup'
const WIZARD_COMPLETE_KEY = 'flowsphere-email-categorization-complete'
const WORK_SETTINGS_KEY = 'flowsphere-work-categorization'

/**
 * Check if user has completed the categorization setup wizard
 */
function isSetupComplete(): boolean {
  return localStorage.getItem(WIZARD_COMPLETE_KEY) === 'true'
}

/**
 * Get user's work/personal settings from the wizard
 */
function getWizardSettings(): {
  workKeywords: string[]
  workDomains: string[]
  personalDomains: string[]
} {
  try {
    const stored = localStorage.getItem(WORK_SETTINGS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // ignore
  }
  return { workKeywords: [], workDomains: [], personalDomains: [] }
}

/**
 * EMPTY DEFAULT RULES - No automatic categorization
 * User must configure via the Email Categorization Setup Wizard
 */
const EMPTY_RULES: EmailClassificationRules = {
  urgent: {
    // URGENT - Only truly urgent items (user can add keywords)
    // NO DEFAULT KEYWORDS - marketing emails like Bubble should NOT be urgent
    keywords: [],
    senderEmails: [],
    senderDomains: [],
    enabled: false, // Disabled until user enables
  },
  work: {
    // WORK - User defines what "work" means to them
    keywords: [],
    senderDomains: [],
    senderEmails: [],
    enabled: false, // Disabled until user configures
  },
  personal: {
    // PERSONAL - User defines their personal email domains
    keywords: [],
    senderEmails: [],
    senderDomains: [],
    enabled: false, // Disabled until user configures
  },
  subs: {
    // SUBSCRIPTION - Billing and subscription emails
    // These defaults are safe as they're very specific
    keywords: [
      'subscription',
      'billing',
      'renewal',
      'payment was unsuccessful',
      'payment unsuccessful',
      'payment declined',
      'subscription suspended',
      'subscription cancelled',
      'subscription canceled',
      'trial ending',
      'trial expires',
    ],
    senderEmails: [
      'billing@',
      'subscriptions@',
      'payments@',
    ],
    senderDomains: [
      'netflix.com',
      'spotify.com',
      'adobe.com',
      'microsoft.com',
      'apple.com',
      'google.com',
    ],
    enabled: true,
  },
  bills: {
    // BILLS - Utility bills, these are specific enough
    keywords: [
      'bill',
      'statement',
      'payment due',
      'amount due',
      'overdue',
      'past due',
      'late fee',
      'disconnection notice',
    ],
    senderEmails: [
      'billing@',
      'statements@',
      'ebill@',
    ],
    senderDomains: [
      'meralco.com.ph',
      'pldt.com.ph',
      'globe.com.ph',
      'maynilad.com.ph',
      'manilawater.com',
    ],
    enabled: true,
  },
}

/**
 * Build rules from wizard settings
 * Merges user's wizard configuration with minimal safe defaults
 */
function buildRulesFromWizard(): EmailClassificationRules {
  const wizardSettings = getWizardSettings()
  const setupComplete = isSetupComplete()

  const rules: EmailClassificationRules = {
    ...EMPTY_RULES,
    work: {
      keywords: wizardSettings.workKeywords || [],
      senderDomains: wizardSettings.workDomains || [],
      senderEmails: [],
      enabled: setupComplete && (wizardSettings.workKeywords?.length > 0 || wizardSettings.workDomains?.length > 0),
    },
    personal: {
      keywords: [],
      senderDomains: wizardSettings.personalDomains || [],
      senderEmails: [],
      enabled: setupComplete && wizardSettings.personalDomains?.length > 0,
    },
  }

  return rules
}

export const EmailClassificationRulesStore = {
  /**
   * Get all classification rules - now respects wizard settings
   */
  getRules(): EmailClassificationRules {
    // First, build rules from wizard settings
    const wizardRules = buildRulesFromWizard()

    // Then check for any custom overrides
    try {
      const stored = localStorage.getItem(RULES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge custom overrides with wizard rules
        return {
          urgent: { ...wizardRules.urgent, ...parsed.urgent },
          work: { ...wizardRules.work, ...parsed.work },
          personal: { ...wizardRules.personal, ...parsed.personal },
          subs: { ...wizardRules.subs, ...parsed.subs },
          bills: { ...wizardRules.bills, ...parsed.bills },
        }
      }
      return wizardRules
    } catch {
      return wizardRules
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
    // Reset to empty rules - user should configure via wizard
    this.saveRules(EMPTY_RULES)
  },

  /**
   * Check if email is promotional/marketing (should NOT be urgent or work)
   */
  isPromotionalEmail(email: { subject: string; body: string; from: { email: string; name: string } }): boolean {
    const text = `${email.subject} ${email.body}`.toLowerCase()
    const senderEmail = email.from.email.toLowerCase()
    const senderName = (email.from.name || '').toLowerCase()

    // Promotional sender patterns
    const promoSenderPatterns = [
      'marketing', 'promo', 'newsletter', 'noreply', 'no-reply',
      'news@', 'info@', 'hello@', 'team@', 'updates@'
    ]
    if (promoSenderPatterns.some(p => senderEmail.includes(p) || senderName.includes(p))) {
      return true
    }

    // Promotional content patterns
    const promoContentPatterns = [
      'sale', '% off', 'discount', 'deal', 'offer', 'free shipping',
      'limited time', 'shop now', 'buy now', 'exclusive', 'save',
      'unsubscribe', 'view in browser', 'click here', 'learn more'
    ]
    if (promoContentPatterns.some(p => text.includes(p))) {
      return true
    }

    // Known marketing/product companies (not urgent, not work)
    const marketingCompanies = [
      'bubble', 'shopify', 'squarespace', 'wix', 'canva', 'figma',
      'notion', 'slack', 'zoom', 'dropbox', 'mailchimp', 'hubspot'
    ]
    if (marketingCompanies.some(c => senderEmail.includes(c) || senderName.includes(c))) {
      return true
    }

    return false
  },

  /**
   * Classify an email based on user rules (fast, no AI)
   * CONSERVATIVE: Only categories explicitly enabled by user in wizard
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

    // FIRST: Check if this is promotional/marketing - never classify as urgent or work
    const isPromo = this.isPromotionalEmail(email)
    if (isPromo) {
      // Promotional emails should be subscription or regular, never urgent/work
      // Check if it's a billing-related promo (subscription)
      const hasBilling = ['subscription', 'billing', 'payment', 'renewal'].some(k => text.includes(k))
      if (hasBilling) {
        return {
          category: 'subs',
          confidence: 0.7,
          matchedRule: 'promotional with billing context',
        }
      }
      // Regular promotional email
      return {
        category: 'all',
        confidence: 0.8,
        matchedRule: 'promotional/marketing email',
      }
    }

    // Priority order: bills > subs > work > personal > urgent
    // Note: urgent is last because it's often misclassified
    const categories: (keyof EmailClassificationRules)[] = [
      'bills',
      'subs',
      'work',
      'personal',
      'urgent',
    ]

    for (const category of categories) {
      const rule = rules[category]
      if (!rule.enabled) continue

      // Check sender domains FIRST (more reliable)
      for (const domain of rule.senderDomains) {
        if (
          senderDomain === domain.toLowerCase() ||
          senderEmail.includes(`@${domain.toLowerCase()}`)
        ) {
          return {
            category,
            confidence: 0.85,
            matchedRule: `domain: "${domain}"`,
          }
        }
      }

      // Check sender email patterns
      for (const emailPattern of rule.senderEmails) {
        if (senderEmail.includes(emailPattern.toLowerCase())) {
          return {
            category,
            confidence: 0.8,
            matchedRule: `sender: "${emailPattern}"`,
          }
        }
      }

      // Check keywords (less reliable, especially for urgent)
      // For urgent category, require MORE evidence
      if (category === 'urgent') {
        // Urgent requires multiple signals or very specific keywords
        const urgentSpecific = ['emergency', 'security breach', 'account compromised', 'action required immediately']
        const hasSpecificUrgent = urgentSpecific.some(k => text.includes(k))
        if (hasSpecificUrgent) {
          return {
            category,
            confidence: 0.75,
            matchedRule: 'specific urgent keyword',
          }
        }
        // Skip generic urgent keywords for promotional senders
        continue
      }

      for (const keyword of rule.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          return {
            category,
            confidence: 0.7,
            matchedRule: `keyword: "${keyword}"`,
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
