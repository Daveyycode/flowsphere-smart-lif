/**
 * AI Email Classifier - Smart classification with rules-first approach
 *
 * STRATEGY:
 * 1. PRIMARY: Rules-based classification (no API needed, instant)
 * 2. FALLBACK: AI classification only for ambiguous emails
 * 3. PROVIDERS: Groq → Gemini → OpenRouter → Rules-only
 *
 * This ensures the app works even without API keys or when APIs fail.
 */

import { Email } from './email-service'
import { logger } from '@/lib/security-utils'
import { EmailClassificationRulesStore } from './email-classification-rules'
import { aiSubscriptionManager } from '@/lib/ai-subscription-manager'

export interface EmailClassification {
  category: 'emergency' | 'subscription' | 'important' | 'regular' | 'work' | 'personal'
  priority: 'high' | 'medium' | 'low'
  summary: string
  tags: string[]
  isUrgent: boolean
  requiresAction: boolean
  suggestedActions?: string[]
}

export interface WorkCategorizationSettings {
  workKeywords: string[]
  workDomains: string[]
  personalDomains: string[]
}

// Available AI providers for classification (free first)
interface AIProvider {
  name: string
  endpoint: string
  getKey: () => string
  model: string
  formatRequest: (prompt: string, systemPrompt: string) => object
  parseResponse: (data: any) => string
}

export class EmailAIClassifier {
  private settings: WorkCategorizationSettings
  private providers: AIProvider[]
  private failedProviders: Set<string> = new Set()
  private lastProviderReset: number = 0

  constructor() {
    this.loadSettings()

    // Define AI providers in priority order (free first)
    this.providers = [
      {
        name: 'groq',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        getKey: () => import.meta.env.VITE_GROQ_API_KEY || '',
        model: 'llama-3.3-70b-versatile',
        formatRequest: (prompt, systemPrompt) => ({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 600,
        }),
        parseResponse: (data) => data.choices?.[0]?.message?.content || '',
      },
      {
        name: 'gemini',
        endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
        getKey: () => import.meta.env.VITE_GEMINI_API_KEY || '',
        model: 'gemini-1.5-flash',
        formatRequest: (prompt, systemPrompt) => ({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
        }),
        parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      },
      {
        name: 'openrouter',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        getKey: () => import.meta.env.VITE_OPENROUTER_API_KEY || '',
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        formatRequest: (prompt, systemPrompt) => ({
          model: 'meta-llama/llama-3.2-3b-instruct:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 600,
        }),
        parseResponse: (data) => data.choices?.[0]?.message?.content || '',
      },
    ]
  }

  /**
   * Load categorization settings from localStorage
   * Called before each classification to pick up any user changes
   * NO DEFAULT SETTINGS - user must configure via the setup wizard
   */
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem('flowsphere-work-categorization')
      if (stored) {
        this.settings = JSON.parse(stored)
        console.log('📋 Loaded user work settings:', {
          workKeywords: this.settings.workKeywords?.length || 0,
          workDomains: this.settings.workDomains?.length || 0,
          personalDomains: this.settings.personalDomains?.length || 0,
        })
      } else {
        // NO DEFAULT SETTINGS - user must set up via Email Categorization Setup wizard
        // Empty settings means AI will classify purely based on email content
        // without any user-specific work/personal rules
        this.settings = {
          workKeywords: [],
          workDomains: [],
          personalDomains: [],
        }
        console.log('📋 No user settings found - using empty defaults (setup wizard not completed)')
      }
    } catch (error) {
      logger.debug('Failed to load email classifier settings', error)
      this.settings = {
        workKeywords: [],
        workDomains: [],
        personalDomains: [],
      }
    }
  }

  /**
   * Reload settings (call this when user changes settings)
   */
  public reloadSettings(): void {
    this.loadSettings()
  }

  /**
   * Get user's custom settings for inclusion in AI prompt
   * These settings are the PRIMARY classification rules - they OVERRIDE general AI logic
   */
  private getUserSettingsPrompt(): string {
    const hasWorkKeywords = this.settings.workKeywords?.length > 0
    const hasWorkDomains = this.settings.workDomains?.length > 0
    const hasPersonalDomains = this.settings.personalDomains?.length > 0

    const workKeywords = hasWorkKeywords
      ? this.settings.workKeywords.join(', ')
      : 'NOT CONFIGURED BY USER'
    const workDomains = hasWorkDomains
      ? this.settings.workDomains.join(', ')
      : 'NOT CONFIGURED BY USER'
    const personalDomains = hasPersonalDomains
      ? this.settings.personalDomains.join(', ')
      : 'NOT CONFIGURED BY USER'

    // If user hasn't set up ANY categorization preferences, use a different prompt
    const noUserSettings = !hasWorkKeywords && !hasWorkDomains && !hasPersonalDomains

    if (noUserSettings) {
      return `
=== USER CATEGORIZATION SETTINGS: NOT YET CONFIGURED ===

The user has NOT set up their email categorization preferences yet.
This means you should:
1. DO NOT classify any email as WORK (no work domains/keywords defined)
2. DO NOT classify any email as PERSONAL (no personal domains defined)
3. Use only the standard categories: EMERGENCY, IMPORTANT, SUBSCRIPTION, REGULAR
4. When in doubt, classify as REGULAR

**IMPORTANT:** Without user settings, be very conservative. Most emails should be REGULAR.
Only use EMERGENCY for true safety alerts, IMPORTANT for security/login emails, and SUBSCRIPTION for billing.
`
    }

    return `
=== USER'S CUSTOM CATEGORIZATION SETTINGS (PRIMARY - MUST FOLLOW) ===

These are the user's EXPLICIT rules. They OVERRIDE general classification logic.

**WORK Keywords (user-defined):** ${workKeywords}
**WORK Domains (user-defined):** ${workDomains}
→ ONLY classify as WORK if:
  1. Email sender domain MATCHES one of the user's work domains, OR
  2. Email subject/body contains one of the user's work keywords
→ If the user hasn't configured any work keywords/domains = NOTHING should be classified as WORK by default

**PERSONAL Domains (user-defined):** ${personalDomains}
→ ONLY classify as PERSONAL if sender is from one of these domains AND it's a real person (not automated)

**CRITICAL RULE:**
If an email does NOT match the user's work keywords/domains, it is NOT WORK.
Promotional emails, sales, newsletters are NEVER work even if they have generic "business" words.
If user's work domains = "myflowsphere.com" and email is from "lazada.com.ph" → NOT WORK (it's REGULAR).
`
  }

  /**
   * Reset failed providers after 5 minutes
   */
  private resetFailedProvidersIfNeeded(): void {
    const RESET_INTERVAL = 5 * 60 * 1000 // 5 minutes
    if (Date.now() - this.lastProviderReset > RESET_INTERVAL) {
      this.failedProviders.clear()
      this.lastProviderReset = Date.now()
    }
  }

  /**
   * Get available provider (one that has a key and hasn't failed recently)
   * Checks BYOK keys first if user is on BYOK plan
   */
  private getAvailableProvider(): AIProvider | null {
    this.resetFailedProvidersIfNeeded()

    const subscription = aiSubscriptionManager.getSubscription()

    // For BYOK users, check their own keys first
    if (subscription.tier === 'byok') {
      const byokProviders: Array<{ name: string; key: string | null }> = [
        { name: 'groq', key: aiSubscriptionManager.getByokKey('groq') },
        { name: 'gemini', key: aiSubscriptionManager.getByokKey('gemini') },
        { name: 'openrouter', key: aiSubscriptionManager.getByokKey('openrouter') },
        { name: 'openai', key: aiSubscriptionManager.getByokKey('openai') },
        { name: 'deepseek', key: aiSubscriptionManager.getByokKey('deepseek') },
      ]

      for (const { name, key } of byokProviders) {
        if (key && !this.failedProviders.has(name)) {
          const provider = this.providers.find(p => p.name === name)
          if (provider) {
            // Override the getKey function to return BYOK key
            return {
              ...provider,
              getKey: () => key,
            }
          }
        }
      }
    }

    // For other users, use system keys
    for (const provider of this.providers) {
      const key = provider.getKey()
      if (key && !this.failedProviders.has(provider.name)) {
        return provider
      }
    }
    return null
  }

  /**
   * Call AI provider with automatic fallback
   */
  private async callAIProvider(prompt: string, systemPrompt: string): Promise<string | null> {
    this.resetFailedProvidersIfNeeded()

    for (const provider of this.providers) {
      const key = provider.getKey()
      if (!key || this.failedProviders.has(provider.name)) {
        continue
      }

      try {
        console.log(`🤖 Trying ${provider.name}...`)

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        // Different auth for different providers
        if (provider.name === 'gemini') {
          // Gemini uses URL parameter for key
        } else {
          headers['Authorization'] = `Bearer ${key}`
        }

        const endpoint = provider.name === 'gemini'
          ? `${provider.endpoint}?key=${key}`
          : provider.endpoint

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(provider.formatRequest(prompt, systemPrompt)),
        })

        if (!response.ok) {
          const status = response.status
          console.warn(`⚠️ ${provider.name} returned ${status}`)

          // Mark provider as failed for this session
          if (status === 401 || status === 403 || status === 429) {
            this.failedProviders.add(provider.name)
            console.warn(`   Marking ${provider.name} as unavailable (will retry in 5 min)`)
          }
          continue
        }

        const data = await response.json()
        const content = provider.parseResponse(data)

        if (content) {
          console.log(`✅ ${provider.name} responded successfully`)
          return content
        }
      } catch (error) {
        console.warn(`⚠️ ${provider.name} error:`, error)
        this.failedProviders.add(provider.name)
      }
    }

    console.log('📋 All AI providers unavailable, using rules-only classification')
    return null
  }

  /**
   * Classify email - RULES FIRST, AI as fallback for ambiguous cases
   *
   * Strategy:
   * 1. Use rules-based classification (instant, no API)
   * 2. If rules have high confidence (>0.7), use that result
   * 3. Only call AI for ambiguous emails (low confidence from rules)
   * 4. If AI fails, use rules result anyway
   */
  async classifyEmail(email: Email): Promise<EmailClassification> {
    // Reload settings to pick up any user changes
    this.loadSettings()

    console.log(`📧 Classifying: "${email.subject}"`)

    // Include user's custom settings in the prompt
    const userSettingsPrompt = this.getUserSettingsPrompt()

    const prompt = `You are FlowSphere's email classification AI. Analyze this email and classify it accurately.
${userSettingsPrompt}

=== EMAIL TO CLASSIFY ===
FROM: ${email.from.name} <${email.from.email}>
SUBJECT: ${email.subject}
BODY: ${(email.snippet || email.body || '').substring(0, 1000)}

=== CLASSIFICATION CATEGORIES (in priority order) ===

**FIRST: CHECK IF PROMOTIONAL/MARKETING (always REGULAR)**
Before any other classification, check these indicators:
- Sender contains: "promotion", "promo", "marketing", "newsletter", "noreply", "no-reply", "deals", "offers", "sales"
- Subject contains: "sale", "% off", "discount", "voucher", "coupon", "deal", "offer", "free shipping", "limited time"
- Content about: shopping, products, sales events (12.12, 11.11, Black Friday, etc.)
→ If ANY of these match, classify as REGULAR immediately. Do NOT classify promos as work/personal/important.

1. **EMERGENCY** - Life/safety/security critical issues ONLY:
   - Security alerts: "motion detected", "alarm triggered", "security breach", "intruder"
   - Safety: "accident", "hospital", "911", "danger", "fire alarm", "break-in"
   - System critical: server down, production outage, data breach
   - NEVER classify marketing/promos as emergency

2. **SUBSCRIPTION** - Recurring billing/membership emails:
   MUST contain "subscription" + at least ONE of:
   - Money/amount: "$", "₱", "amounting", "payment", "charge", "fee"
   - Company/service name: "subscription to [Name]"
   - Billing action: "renewal", "cancelled", "failed", "unsuccessful", "expired", "suspended"

   EXAMPLES that ARE subscription:
   - "your subscription to FlowSphere amounting $35 is unsuccessful"
   - "Netflix subscription renewal - payment failed"
   - "Google Play subscription charge $9.99"

   EXAMPLES that are NOT subscription (→ REGULAR):
   - Sales/promos: "12.12 Sale", "Gift sneakers $80" → regular
   - One-time orders: "Your Amazon order shipped" → regular
   - Newsletters without billing: "Tips from LocationIQ" → regular

3. **WORK** - Professional/business context (USE USER'S SETTINGS!):
   - ONLY classify as WORK if it matches USER'S configured work keywords or work domains (see settings above)
   - If user configured work domains = "myflowsphere.com", ONLY emails from myflowsphere.com are WORK
   - If user configured work keywords = "boss", ONLY emails containing "boss" are WORK
   - NEVER use generic work keywords unless user configured them
   - NEVER classify retail/shopping promos as work (Lazada, Shopee, Amazon = REGULAR, not work)
   - If sender domain doesn't match user's work domains → NOT WORK

4. **PERSONAL** - Real messages from real people (USE USER'S SETTINGS!):
   - ONLY classify as PERSONAL if sender domain matches USER'S configured personal domains (see settings above)
   - User configured "icloud.com" = emails from @icloud.com individuals are PERSONAL
   - Must be from a real person (not automated/noreply)
   - Personal conversations, sharing files/prompts/documents
   - Example: "Alpha San" sharing a prompt = PERSONAL (not urgent!)
   - NOT automated marketing emails (even if from gmail.com)

5. **IMPORTANT** - Account/security notifications (NOT urgent!):
   - Login links, magic links, secure sign-in (Anthropic, Google, etc.)
   - Password resets, 2FA codes, verification emails
   - Example: "Secure link to log in to Claude.ai" = IMPORTANT (not urgent!)
   - Banking alerts, security notifications
   - NOTE: These need attention but are NOT time-critical emergencies

6. **REGULAR** - Default for everything else:
   - ALL promotional/marketing emails
   - ALL sales emails (12.12, Black Friday, etc.)
   - ALL newsletters and digests
   - ALL voucher/coupon emails
   - Social media notifications
   - Retail store emails (Lazada, Shopee, Amazon, etc.)

=== URGENT FLAG (VERY STRICT - rarely used) ===
The urgent flag should be RARELY set. Only set isUrgent=true for TRULY time-sensitive emails that require immediate action.

**NEVER set isUrgent=true for:**
- Promotional/marketing emails (even if they say "urgent" or "limited time")
- Login/authentication emails (those are "important", not urgent) - includes: sign in, log in, magic link, secure link, verification
- Newsletters, digests, updates
- Sales, vouchers, coupons, shopping offers
- Retail store emails (Lazada, Shopee, Amazon, etc.)
- Generic account notifications
- Social media notifications
- Password reset emails
- 2FA/verification codes
- "Secure link" or "Magic link" emails (Anthropic, Google, etc.)

**ONLY set isUrgent=true for:**
- Actual emergency situations (security breach where account is compromised, accident, medical emergency)
- Work deadlines with explicit due dates from your manager/team that are TODAY or TOMORROW
- Time-sensitive personal requests from real people you know
- System outages affecting production
- Flight/travel alerts where departure is within hours

**CRITICAL: These are NEVER urgent (common mistakes):**
- "Secure link to log in to Claude.ai" from Anthropic → IMPORTANT, NOT urgent
- "Sign in to Google" → IMPORTANT, NOT urgent
- "Your login link" → IMPORTANT, NOT urgent
- "Verify your email" → IMPORTANT, NOT urgent
- "Password reset" → IMPORTANT, NOT urgent

**Examples:**
- "Your flight departs in 2 hours" from airline → urgent ✓
- "Server is down, fix now!" from your boss → urgent ✓
- "Limited time offer! Shop now!" from Lazada → NOT urgent ✗
- "Secure link to log in to Claude.ai" from Anthropic → NOT urgent ✗ (category: IMPORTANT)
- "Sign in to your account" from Google → NOT urgent ✗ (category: IMPORTANT)
- "Win a shopping spree!" → NOT urgent ✗

=== CLASSIFICATION RULES ===
1. Check EMERGENCY first (safety/security only)
2. Check SUBSCRIPTION (must have subscription + billing context)
3. Check WORK (professional context)
4. Check PERSONAL (casual/relational)
5. Check IMPORTANT (needs attention)
6. Default to REGULAR

=== RESPONSE FORMAT ===
Respond ONLY with valid JSON:
{
  "category": "emergency|subscription|work|personal|important|regular",
  "priority": "high|medium|low",
  "summary": "one sentence summary of the email",
  "tags": ["relevant", "tags"],
  "isUrgent": true|false,
  "requiresAction": true|false,
  "suggestedActions": ["action if needed"],
  "classificationReason": "brief reason for this classification"
}`

    // STEP 1: Try rules-based classification first (instant, no API)
    const rulesResult = EmailClassificationRulesStore.classifyByRules({
      subject: email.subject,
      body: email.body || email.snippet || '',
      from: email.from,
    })

    console.log(`📋 Rules result: ${rulesResult.category} (confidence: ${rulesResult.confidence})`)
    if (rulesResult.matchedRule) {
      console.log(`   Matched: ${rulesResult.matchedRule}`)
    }

    // Map rules category to email category
    const categoryMap: Record<string, EmailClassification['category']> = {
      urgent: 'emergency',
      work: 'work',
      personal: 'personal',
      subs: 'subscription',
      bills: 'regular',
      all: 'regular',
    }

    // STEP 2: If rules have high confidence, use that result (skip AI)
    if (rulesResult.confidence >= 0.7) {
      console.log(`✅ Using rules result (high confidence)`)
      return {
        category: categoryMap[rulesResult.category] || 'regular',
        priority: rulesResult.category === 'urgent' ? 'high' : rulesResult.category === 'work' ? 'medium' : 'low',
        summary: email.subject,
        tags: [rulesResult.category],
        isUrgent: rulesResult.category === 'urgent',
        requiresAction: rulesResult.category === 'urgent' || rulesResult.category === 'bills',
      }
    }

    // STEP 3: Check subscription before using AI
    const aiCheck = aiSubscriptionManager.canUseAI()
    if (!aiCheck.allowed) {
      console.log(`📋 AI not available: ${aiCheck.reason}`)
      // For ambiguous emails without AI, use default classification
      return this.getDefaultClassification(email)
    }

    // Check if any AI provider is available
    const hasAnyProvider = this.getAvailableProvider() !== null
    if (!hasAnyProvider) {
      console.log('📋 No AI providers configured, using rules result')
      return this.getDefaultClassification(email)
    }

    // Log remaining AI usage
    if (aiCheck.remaining !== undefined && aiCheck.remaining !== -1) {
      console.log(`📊 AI usage: ${aiCheck.remaining} classifications remaining this month`)
    }

    try {
      console.log('🤖 Low confidence from rules, trying AI classification...')

      const systemPrompt = `You are FlowSphere's intelligent email classification AI. Accurate classification is CRITICAL for the app's flow.

**MOST IMPORTANT: USER'S CUSTOM SETTINGS ARE PRIMARY**
The user has configured their own work keywords, work domains, and personal domains.
You MUST use these settings as the PRIMARY classifier. Do NOT use generic keywords.

CRITICAL RULES:
- Promotional/marketing emails = REGULAR (never work, never urgent)
- If user's work domains = "myflowsphere.com" and email from "lazada.com.ph" → REGULAR
- When in doubt: REGULAR
- isUrgent = RARELY true (only real emergencies)

Respond with valid JSON only.`

      const content = await this.callAIProvider(prompt, systemPrompt)

      if (!content) {
        // AI failed, use rules result
        console.log('📋 AI unavailable, using rules result')
        return this.getDefaultClassification(email)
      }

      // Parse JSON response from AI
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn('⚠️ AI response was not valid JSON')
        return this.getDefaultClassification(email)
      }

      const classification = JSON.parse(jsonMatch[0])

      // Log AI classification decision
      console.log(`✅ AI Category: ${classification.category}`)
      console.log(`   Priority: ${classification.priority}, Urgent: ${classification.isUrgent}`)

      // Record AI usage for subscription tracking
      aiSubscriptionManager.recordUsage(
        email.id,
        'ai-classifier',
        600, // Approximate tokens used
        classification.category
      )

      // Ensure all required fields exist
      return {
        category: classification.category || 'regular',
        priority: classification.priority || 'medium',
        summary: classification.summary || email.subject,
        tags: classification.tags || [],
        isUrgent: classification.isUrgent || false,
        requiresAction: classification.requiresAction || false,
        suggestedActions: classification.suggestedActions,
      }
    } catch (error) {
      console.error('❌ AI classification failed:', error)
      console.log('📋 Falling back to rules-based classification')
      return this.getDefaultClassification(email)
    }
  }

  /**
   * Batch classify multiple emails
   */
  async classifyEmails(emails: Email[]): Promise<Map<string, EmailClassification>> {
    const results = new Map<string, EmailClassification>()

    // Classify in parallel (max 5 at a time)
    const batchSize = 5
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      const classifications = await Promise.all(batch.map(email => this.classifyEmail(email)))

      batch.forEach((email, index) => {
        results.set(email.id, classifications[index])
      })
    }

    return results
  }

  /**
   * Check if email contains emergency keywords (strict - not newsletters/promos)
   */
  private containsEmergencyKeywords(email: Email): boolean {
    const emergencyKeywords = [
      'emergency',
      'motion detected',
      'alarm triggered',
      'security breach',
      'sos',
      '911',
      'hospital',
      'accident',
      'danger',
      'intruder',
      'fire alarm',
      'break-in',
    ]

    const text = `${email.subject} ${email.body}`.toLowerCase()

    // First check if it's a subscription/newsletter - these are NOT emergencies
    const subscriptionIndicators = [
      'newsletter',
      'digest',
      'unsubscribe',
      'weekly',
      'monthly',
      'tips',
      'best practices',
      'get the most',
    ]
    const isNewsletter = subscriptionIndicators.some(ind => text.includes(ind))
    if (isNewsletter) return false

    // Also exclude promo emails
    const promoIndicators = ['sale', 'discount', 'off', 'deal', 'gift', 'sneakers', 'shop', 'buy']
    const isPromo = promoIndicators.some(ind => text.includes(ind))
    if (isPromo) return false

    return emergencyKeywords.some(keyword => text.includes(keyword))
  }

  /**
   * SUBSCRIPTION TRIGGER WORDS - Automated service emails (billing, newsletters, promos)
   * Based on user-defined trigger words
   */
  private readonly SUBSCRIPTION_TRIGGER_WORDS = [
    // Core subscription triggers
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
    // Service names
    'netflix',
    'spotify',
    'amazon',
    'medium',
    'substack',
    'patreon',
    'google play',
    'apple',
    'microsoft',
    'adobe',
    'dropbox',
    'slack',
    'notion',
    'figma',
    'github',
    'zoom',
    'canva',
    'openai',
    'anthropic',
  ]

  /**
   * WORK TRIGGER WORDS - Professional/business context
   */
  private readonly WORK_TRIGGER_WORDS = [
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
  ]

  /**
   * PERSONAL TRIGGER WORDS - Informal/relational emails
   */
  private readonly PERSONAL_TRIGGER_WORDS = [
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
  ]

  /**
   * URGENT TRIGGER WORDS - Time-sensitive (FLAG, can overlap)
   */
  private readonly URGENT_TRIGGER_WORDS = [
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
  ]

  /**
   * MISC/SPAM TRIGGER WORDS - Catch-all for spam/irrelevant
   */
  private readonly MISC_TRIGGER_WORDS = [
    'click here',
    'free offer',
    'win a prize',
    'congratulations you won',
    'verify your account',
    'enlarge',
    'viagra',
    'prince from nigeria',
    'act now',
    'limited spots',
    'guarantee',
    '100% free',
  ]

  /**
   * Check if email is a subscription email using trigger patterns
   * Subscription must have: "subscription" + (amount/money OR company name)
   * Example: "your subscription to Flowsphere amounting $35 is unsuccessful..."
   */
  isRealSubscriptionEmail(email: Email): {
    isSubscription: boolean
    reason?: string
    confidence: number
  } {
    const text = `${email.subject} ${email.body || email.snippet || ''}`.toLowerCase()

    // PATTERN 1: "subscription" + money amount
    // Matches: subscription $35, subscription 35$, subscription amounting $35, subscription of $35
    const hasSubscriptionWithMoney =
      /subscription[\s\w]*(\$[\d.,]+|[\d.,]+\$|amounting[\s]*\$?[\d.,]+|[\d.,]+[\s]?(dollars?|usd|eur|gbp|php|peso))/i.test(
        text
      )

    if (hasSubscriptionWithMoney) {
      return {
        isSubscription: true,
        reason: 'Contains "subscription" with money amount',
        confidence: 0.95,
      }
    }

    // PATTERN 2: "subscription to [company/service]"
    // Matches: subscription to Netflix, your subscription to Spotify
    const subscriptionToMatch = text.match(/subscription\s+to\s+([\w\s]+)/i)
    if (subscriptionToMatch) {
      return {
        isSubscription: true,
        reason: `Contains "subscription to ${subscriptionToMatch[1].trim()}"`,
        confidence: 0.9,
      }
    }

    // PATTERN 3: Payment keywords with subscription context
    // Matches: payment for subscription, subscription payment, subscription charge
    const paymentSubscriptionPatterns = [
      'payment.*subscription',
      'subscription.*payment',
      'subscription.*charge',
      'subscription.*renewal',
      'subscription.*billing',
      'subscription.*cancelled',
      'subscription.*canceled',
      'subscription.*suspended',
      'subscription.*expired',
      'subscription.*unsuccessful',
      'renew.*subscription',
      'cancel.*subscription',
    ]

    for (const pattern of paymentSubscriptionPatterns) {
      if (new RegExp(pattern, 'i').test(text)) {
        return {
          isSubscription: true,
          reason: `Matches subscription payment pattern: "${pattern}"`,
          confidence: 0.9,
        }
      }
    }

    // PATTERN 4: Known subscription service names + billing context
    const knownServices = [
      'netflix',
      'spotify',
      'amazon prime',
      'apple music',
      'youtube premium',
      'hulu',
      'disney+',
      'hbo max',
      'adobe',
      'microsoft 365',
      'dropbox',
      'google one',
      'icloud',
      'slack',
      'notion',
      'figma',
      'github',
      'anthropic',
      'openai',
      'patreon',
      'substack',
      'flowsphere',
      'google play',
      'app store',
    ]

    const billingContext = [
      'billing',
      'payment',
      'charge',
      'invoice',
      'receipt',
      'renewal',
      'trial',
      'unsuccessful',
      'failed',
      'declined',
      'expired',
      'suspended',
    ]

    for (const service of knownServices) {
      if (text.includes(service)) {
        // Check if there's also billing context
        const hasBillingContext = billingContext.some(word => text.includes(word))
        if (hasBillingContext) {
          return {
            isSubscription: true,
            reason: `Known service "${service}" with billing context`,
            confidence: 0.85,
          }
        }
      }
    }

    // PATTERN 5: Generic subscription keywords (lower confidence)
    const genericTriggers = [
      'your membership',
      'account billing',
      'billing statement',
      'payment receipt',
      'monthly charge',
      'recurring payment',
      'auto-renewal',
      'subscription plan',
      'your plan',
      'plan renewal',
    ]

    const matchedGeneric = genericTriggers.find(trigger => text.includes(trigger))
    if (matchedGeneric) {
      return {
        isSubscription: true,
        reason: `Contains generic billing trigger: "${matchedGeneric}"`,
        confidence: 0.7,
      }
    }

    return {
      isSubscription: false,
      reason: 'No subscription pattern found (need "subscription" + amount/company)',
      confidence: 0.3,
    }
  }

  /**
   * Check if email matches WORK category using trigger words
   */
  private isWorkEmailByTriggers(email: Email): { isWork: boolean; reason?: string } {
    const text = `${email.subject} ${email.body || email.snippet || ''}`.toLowerCase()
    const matchedTrigger = this.WORK_TRIGGER_WORDS.find(trigger =>
      text.includes(trigger.toLowerCase())
    )
    return {
      isWork: !!matchedTrigger,
      reason: matchedTrigger ? `Contains work trigger: "${matchedTrigger}"` : undefined,
    }
  }

  /**
   * Check if email matches PERSONAL category using trigger words
   */
  private isPersonalEmailByTriggers(email: Email): { isPersonal: boolean; reason?: string } {
    const text = `${email.subject} ${email.body || email.snippet || ''}`.toLowerCase()
    const matchedTrigger = this.PERSONAL_TRIGGER_WORDS.find(trigger =>
      text.includes(trigger.toLowerCase())
    )

    // Also check for personal email domains (non-work context)
    const personalDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'outlook.com']
    const isFromPersonalDomain = personalDomains.some(d =>
      email.from.email.toLowerCase().includes(d)
    )

    return {
      isPersonal:
        !!matchedTrigger || (isFromPersonalDomain && !this.isWorkEmailByTriggers(email).isWork),
      reason: matchedTrigger ? `Contains personal trigger: "${matchedTrigger}"` : undefined,
    }
  }

  /**
   * Check if email has URGENT flag using trigger words
   */
  private hasUrgentFlag(email: Email): boolean {
    const text = `${email.subject} ${email.body || email.snippet || ''}`.toLowerCase()
    const subject = email.subject

    // Check for urgent trigger words
    const hasUrgentWord = this.URGENT_TRIGGER_WORDS.some(trigger =>
      text.includes(trigger.toLowerCase())
    )

    // Check for ALL CAPS subject
    const hasAllCapsSubject = subject.length > 5 && subject === subject.toUpperCase()

    // Check for multiple exclamation marks
    const hasMultipleExclamations = (subject.match(/!/g) || []).length >= 2

    return hasUrgentWord || hasAllCapsSubject || hasMultipleExclamations
  }

  /**
   * Check if email is MISC/SPAM using trigger words
   */
  private isMiscEmail(email: Email): boolean {
    const text = `${email.subject} ${email.body || email.snippet || ''}`.toLowerCase()
    return this.MISC_TRIGGER_WORDS.some(trigger => text.includes(trigger.toLowerCase()))
  }

  /**
   * Use Groq AI to verify if email is a true subscription email
   * This provides additional verification beyond the main classification
   */
  async verifySubscriptionWithAI(
    email: Email
  ): Promise<{ isSubscription: boolean; reason: string; confidence: number }> {
    if (!this.groqApiKey) {
      console.log('⚠️ No Groq API key for subscription verification, using local check')
      const result = this.isRealSubscriptionEmail(email)
      return { ...result, reason: result.reason || 'No reason available' }
    }

    try {
      console.log(`🔍 [GROQ AI] Verifying subscription status for: "${email.subject}"`)

      const prompt = `Determine if this email is a TRUE SUBSCRIPTION/BILLING email.

EMAIL:
From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Content: ${(email.body || email.snippet || '').substring(0, 1000)}

=== SUBSCRIPTION EMAIL CRITERIA ===
A TRUE subscription email MUST have "subscription" + at least ONE of:
- Money/payment amount ($, charge, payment, fee)
- Company/service name ("subscription to [Name]")
- Billing action (renewal, cancelled, failed, expired, suspended)

EXAMPLES - IS SUBSCRIPTION:
✅ "your subscription to FlowSphere amounting $35 is unsuccessful"
✅ "Netflix subscription renewal failed"
✅ "Your Spotify subscription has been cancelled"
✅ "Google Play subscription charge $9.99"

EXAMPLES - NOT SUBSCRIPTION:
❌ "Get the most out of LocationIQ" (newsletter/tips)
❌ "Gift sneakers $80 and under" (promo/sale)
❌ "Your Amazon order shipped" (one-time order)
❌ "Weekly digest from Medium" (newsletter)
❌ "Special offer: 50% off" (marketing)

Respond ONLY in JSON:
{
  "isSubscription": true|false,
  "reason": "specific explanation referencing the criteria",
  "confidence": 0.0-1.0
}`

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content:
                'You are a subscription email detector. Be strict: only emails with "subscription" + billing/payment context are true subscription emails. Newsletters, promos, and order confirmations are NOT subscription emails.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1, // Very low for consistent decisions
          max_tokens: 250,
        }),
      })

      if (!response.ok) {
        console.warn('⚠️ Groq API unavailable for subscription verification')
        const result = this.isRealSubscriptionEmail(email)
        return { ...result, reason: result.reason || 'API unavailable' }
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      const jsonMatch = content.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        console.log(`✅ [GROQ AI] Subscription: ${result.isSubscription} (${result.confidence})`)
        console.log(`   Reason: ${result.reason}`)
        return result
      }
    } catch (error) {
      console.error('❌ Groq subscription verification failed:', error)
    }

    const fallbackResult = this.isRealSubscriptionEmail(email)
    return { ...fallbackResult, reason: fallbackResult.reason || 'Fallback classification' }
  }

  /**
   * Check if email is from known services (legacy, still used as fallback)
   */
  private detectSubscriptionService(email: Email): boolean {
    const subscriptionDomains = [
      'netflix.com',
      'spotify.com',
      'amazon.com',
      'apple.com',
      'google.com',
      'microsoft.com',
      'adobe.com',
      'stripe.com',
      'paypal.com',
    ]

    // Only return true if it also has subscription content
    const isFromServiceDomain = subscriptionDomains.some(domain =>
      email.from.email.includes(domain)
    )
    if (isFromServiceDomain) {
      const result = this.isRealSubscriptionEmail(email)
      return result.isSubscription
    }
    return false
  }

  /**
   * Check if email is work-related based on user settings
   */
  private isWorkEmail(email: Email): boolean {
    const text = `${email.subject} ${email.body}`.toLowerCase()

    // Check work keywords
    const hasWorkKeyword = this.settings.workKeywords.some(keyword =>
      text.includes(keyword.toLowerCase())
    )

    // Check work domains
    const fromWorkDomain = this.settings.workDomains.some(domain =>
      email.from.email.toLowerCase().includes(domain.toLowerCase())
    )

    return hasWorkKeyword || fromWorkDomain
  }

  /**
   * Check if email is promotional (should always be REGULAR)
   * Promotional emails should NEVER be classified as work or personal
   */
  private isPromotionalEmail(email: Email): boolean {
    const text = `${email.subject} ${email.body || email.snippet || ''}`.toLowerCase()
    const senderEmail = email.from.email.toLowerCase()
    const senderName = (email.from.name || '').toLowerCase()

    // Sender indicators (promotional/marketing senders)
    const promoSenderPatterns = [
      'promotion',
      'promo',
      'marketing',
      'newsletter',
      'noreply',
      'no-reply',
      'deals',
      'offers',
      'sales',
      'campaign',
      'mailer',
      'info@',
      'support@',
    ]
    const isFromPromoSender = promoSenderPatterns.some(
      p => senderEmail.includes(p) || senderName.includes(p)
    )

    // Subject/content indicators
    const promoContentPatterns = [
      'sale',
      '% off',
      'discount',
      'voucher',
      'coupon',
      'deal',
      'offer',
      'free shipping',
      'limited time',
      'shop now',
      'buy now',
      'exclusive',
      '12.12',
      '11.11',
      '10.10',
      'black friday',
      'cyber monday',
      'flash sale',
      'clearance',
      'save',
      'win',
      'prize',
      'giveaway',
      'spree',
    ]
    const hasPromoContent = promoContentPatterns.some(p => text.includes(p))

    // Known retail stores (always promotional unless subscription billing)
    const retailStores = [
      'lazada',
      'shopee',
      'amazon',
      'zalora',
      'shein',
      'aliexpress',
      'ebay',
      'wish',
      'taobao',
      'uniqlo',
      'h&m',
      'zara',
      'nike',
      'adidas',
    ]
    const isFromRetail = retailStores.some(r => senderEmail.includes(r) || senderName.includes(r))

    return isFromPromoSender || hasPromoContent || isFromRetail
  }

  /**
   * Check if email is personal based on sender domain
   */
  private isPersonalEmail(email: Email): boolean {
    // Check if from personal email domain
    const fromPersonalDomain = this.settings.personalDomains.some(domain =>
      email.from.email.toLowerCase().includes(domain.toLowerCase())
    )

    // Check if from individual (not noreply, no-reply, etc.)
    const isFromIndividual =
      !email.from.email.toLowerCase().includes('noreply') &&
      !email.from.email.toLowerCase().includes('no-reply') &&
      !email.from.email.toLowerCase().includes('donotreply')

    return fromPersonalDomain && isFromIndividual
  }

  /**
   * Get default classification (fallback) using trigger words AND user settings
   * Priority: Check primary category first, then add urgent flag if applicable
   */
  private getDefaultClassification(email: Email): EmailClassification {
    // Check for MISC/SPAM first (lowest priority, but filter it out)
    if (this.isMiscEmail(email)) {
      return {
        category: 'regular', // Map misc to regular
        priority: 'low',
        summary: email.subject,
        tags: ['bills'],
        isUrgent: false,
        requiresAction: false,
      }
    }

    // Check urgent flag (can overlap with other categories)
    const isUrgent = this.hasUrgentFlag(email)

    // USER SETTINGS ARE PRIMARY - do not use generic trigger words
    const subscriptionCheck = this.isRealSubscriptionEmail(email)
    const workByUserSettings = this.isWorkEmail(email) // User's custom keywords/domains ONLY
    const personalByUserSettings = this.isPersonalEmail(email) // User's custom personal domains ONLY
    const isEmergency = this.containsEmergencyKeywords(email)

    // Check if email is promotional (always regular)
    const isPromotional = this.isPromotionalEmail(email)

    // USER SETTINGS ONLY - no generic trigger words
    const workCheck = {
      isWork: workByUserSettings,
      reason: workByUserSettings ? 'Matched user work settings' : undefined,
    }
    const personalCheck = {
      isPersonal: personalByUserSettings,
      reason: personalByUserSettings ? 'Matched user personal settings' : undefined,
    }

    // PROMOTIONAL CHECK FIRST - always REGULAR
    if (isPromotional && !subscriptionCheck.isSubscription) {
      console.log('📋 [FALLBACK] Promotional email detected → REGULAR')
      return {
        category: 'regular',
        priority: 'low',
        summary: email.subject,
        tags: ['promo', 'retail'],
        isUrgent: false,
        requiresAction: false,
      }
    }

    // SUBSCRIPTION - billing, newsletters, service emails
    if (subscriptionCheck.isSubscription) {
      return {
        category: 'subscription',
        priority: isUrgent ? 'high' : 'medium',
        summary: email.subject,
        tags: ['subscription', 'service'],
        isUrgent: isUrgent,
        requiresAction:
          subscriptionCheck.reason?.includes('payment') ||
          subscriptionCheck.reason?.includes('unsuccessful') ||
          false,
      }
    }

    // EMERGENCY - security alerts, critical issues
    if (isEmergency) {
      return {
        category: 'emergency',
        priority: 'high',
        summary: email.subject,
        tags: ['alert', 'urgent'],
        isUrgent: true,
        requiresAction: true,
      }
    }

    // WORK - professional/business context
    if (workCheck.isWork) {
      return {
        category: 'work',
        priority: isUrgent ? 'high' : 'medium',
        summary: email.subject,
        tags: ['work', 'business'],
        isUrgent: isUrgent,
        requiresAction: true,
      }
    }

    // PERSONAL - informal/relational emails
    if (personalCheck.isPersonal) {
      return {
        category: 'personal',
        priority: isUrgent ? 'high' : 'low',
        summary: email.subject,
        tags: ['personal'],
        isUrgent: isUrgent,
        requiresAction: false,
      }
    }

    // Legacy subscription check as final fallback
    if (this.detectSubscriptionService(email)) {
      return {
        category: 'subscription',
        priority: 'medium',
        summary: email.subject,
        tags: ['billing', 'service'],
        isUrgent: false,
        requiresAction: false,
      }
    }

    return {
      category: 'regular',
      priority: 'low',
      summary: email.subject,
      tags: [],
      isUrgent: false,
      requiresAction: false,
    }
  }
}
