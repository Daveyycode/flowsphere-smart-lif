/**
 * Zapier Webhook Handler
 * Receives email/social media data from Zapier and processes it
 */

import { EmailAIClassifier } from './email-ai-classifier'
import { toast } from 'sonner'
import { logger } from '@/lib/security-utils'

export interface ZapierEmailPayload {
  provider: 'gmail' | 'yahoo' | 'outlook' | 'twitter' | 'facebook' | 'instagram'
  from: string
  fromName?: string
  subject?: string
  body: string
  snippet?: string
  timestamp: string
  link?: string
  type: 'email' | 'mention' | 'message' | 'comment'
}

export interface ZapierAlert {
  id: string
  provider: string
  type: string
  content: string
  from: string
  timestamp: string
  category?: string
  priority?: string
  summary?: string
}

export class ZapierWebhookHandler {
  private aiClassifier: EmailAIClassifier

  constructor() {
    this.aiClassifier = new EmailAIClassifier()
  }

  /**
   * Process incoming Zapier webhook
   */
  async processWebhook(payload: ZapierEmailPayload): Promise<ZapierAlert> {
    // Convert to email format for AI classification
    const email = {
      id: `zapier-${Date.now()}`,
      provider: payload.provider as any,
      from: {
        email: payload.from,
        name: payload.fromName || payload.from,
      },
      to: [],
      subject: payload.subject || `${payload.type} from ${payload.provider}`,
      body: payload.body,
      snippet: payload.snippet || payload.body.substring(0, 200),
      timestamp: payload.timestamp,
      read: false,
    }

    // Classify with AI
    const classification = await this.aiClassifier.classifyEmail(email)

    // Create alert
    const alert: ZapierAlert = {
      id: email.id,
      provider: payload.provider,
      type: payload.type,
      content: payload.body,
      from: payload.from,
      timestamp: payload.timestamp,
      category: classification.category,
      priority: classification.priority,
      summary: classification.summary,
    }

    // Store alert
    this.storeZapierAlert(alert)

    // Show notification
    this.showNotification(alert)

    return alert
  }

  /**
   * Store Zapier alert
   */
  private storeZapierAlert(alert: ZapierAlert): void {
    try {
      const alerts = this.getZapierAlerts()
      alerts.unshift(alert)

      // Keep only last 100
      const trimmed = alerts.slice(0, 100)

      localStorage.setItem('flowsphere-zapier-alerts', JSON.stringify(trimmed))
    } catch (error) {
      console.error('Failed to store Zapier alert:', error)
    }
  }

  /**
   * Get stored Zapier alerts
   */
  getZapierAlerts(): ZapierAlert[] {
    try {
      const alerts = localStorage.getItem('flowsphere-zapier-alerts')
      return alerts ? JSON.parse(alerts) : []
    } catch (error) {
      logger.debug('Failed to load Zapier alerts from storage', error)
      return []
    }
  }

  /**
   * Show notification based on alert
   */
  private showNotification(alert: ZapierAlert): void {
    const icon = this.getProviderIcon(alert.provider)

    if (alert.category === 'emergency') {
      toast.error(`${icon} Emergency Alert`, {
        description: `${alert.provider}: ${alert.summary}`,
        duration: 10000,
      })
    } else if (alert.category === 'important') {
      toast.warning(`${icon} Important Update`, {
        description: `${alert.provider}: ${alert.summary}`,
        duration: 5000,
      })
    } else {
      toast.info(`${icon} New ${alert.type}`, {
        description: `${alert.provider}: ${alert.summary}`,
        duration: 3000,
      })
    }
  }

  /**
   * Get icon for provider
   */
  private getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      gmail: '📧',
      yahoo: '📨',
      outlook: '📬',
      twitter: '🐦',
      facebook: '👥',
      instagram: '📸',
    }
    return icons[provider] || '📬'
  }

  /**
   * Clear all Zapier alerts
   */
  clearZapierAlerts(): void {
    localStorage.removeItem('flowsphere-zapier-alerts')
  }
}

// Global webhook handler
export const zapierWebhookHandler = new ZapierWebhookHandler()

/**
 * Webhook endpoint URL that Zapier will call
 * This would be: https://myflowsphere.com/api/zapier-webhook
 *
 * For now, we'll simulate it with a function that can be called
 */
export function handleZapierWebhook(payload: ZapierEmailPayload) {
  zapierWebhookHandler.processWebhook(payload)
}
