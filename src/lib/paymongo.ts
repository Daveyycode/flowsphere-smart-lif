/**
 * PayMongo Payment Gateway Integration
 * For Philippine payments: GCash, Maya, Cards, Bank Transfers
 */

export interface PayMongoPaymentLink {
  id: string
  type: 'link'
  attributes: {
    amount: number
    archived: boolean
    currency: string
    description: string
    livemode: boolean
    fee: number
    remarks: string
    status: 'unpaid' | 'paid' | 'expired'
    tax_amount: number | null
    checkout_url: string
    reference_number: string
    created_at: number
    updated_at: number
    payments: PayMongoPayment[]
  }
}

export interface PayMongoPayment {
  id: string
  type: 'payment'
  attributes: {
    amount: number
    currency: string
    description: string
    status: 'pending' | 'paid' | 'failed'
    source: {
      type: 'gcash' | 'grab_pay' | 'paymaya' | 'card' | 'dob' | 'billease'
    }
    created_at: number
    paid_at: number | null
    fee: number
    net_amount: number
  }
}

export interface CreatePaymentLinkOptions {
  amount: number // in centavos (e.g., 10000 = PHP 100.00)
  description: string
  remarks?: string
}

export interface PayMongoWebhook {
  id: string
  type: 'webhook'
  attributes: {
    type: 'link.payment.paid' | 'payment.paid' | 'payment.failed'
    livemode: boolean
    data: {
      id: string
      type: string
      attributes: Record<string, unknown>
    }
    created_at: number
  }
}

class PayMongoService {
  private baseUrl = 'https://api.paymongo.com/v1'

  private getSecretKey(): string | null {
    return localStorage.getItem('flowsphere-ceo-paymongo-secret')
  }

  private getPublicKey(): string | null {
    return localStorage.getItem('flowsphere-ceo-paymongo-public')
  }

  /**
   * Check if PayMongo is configured
   */
  isConfigured(): boolean {
    return !!this.getSecretKey()
  }

  /**
   * Get authorization header
   */
  private getAuthHeader(): string {
    const secretKey = this.getSecretKey()
    if (!secretKey) throw new Error('PAYMONGO_NOT_CONFIGURED')
    return 'Basic ' + btoa(secretKey + ':')
  }

  /**
   * Create a payment link
   */
  async createPaymentLink(options: CreatePaymentLinkOptions): Promise<PayMongoPaymentLink> {
    const response = await fetch(`${this.baseUrl}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: options.amount,
            description: options.description,
            remarks: options.remarks || 'FlowSphere Payment',
          },
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('[PayMongo] Create link error:', error)

      if (response.status === 401) {
        throw new Error('INVALID_API_KEY')
      }
      throw new Error(error.errors?.[0]?.detail || 'Failed to create payment link')
    }

    const data = await response.json()
    return data.data as PayMongoPaymentLink
  }

  /**
   * Get payment link details
   */
  async getPaymentLink(linkId: string): Promise<PayMongoPaymentLink> {
    const response = await fetch(`${this.baseUrl}/links/${linkId}`, {
      headers: {
        Authorization: this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error('Failed to get payment link')
    }

    const data = await response.json()
    return data.data as PayMongoPaymentLink
  }

  /**
   * List all payment links
   */
  async listPaymentLinks(): Promise<PayMongoPaymentLink[]> {
    const response = await fetch(`${this.baseUrl}/links`, {
      headers: {
        Authorization: this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error('Failed to list payment links')
    }

    const data = await response.json()
    return data.data as PayMongoPaymentLink[]
  }

  /**
   * Archive a payment link
   */
  async archivePaymentLink(linkId: string): Promise<PayMongoPaymentLink> {
    const response = await fetch(`${this.baseUrl}/links/${linkId}/archive`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error('Failed to archive payment link')
    }

    const data = await response.json()
    return data.data as PayMongoPaymentLink
  }

  /**
   * Unarchive a payment link
   */
  async unarchivePaymentLink(linkId: string): Promise<PayMongoPaymentLink> {
    const response = await fetch(`${this.baseUrl}/links/${linkId}/unarchive`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error('Failed to unarchive payment link')
    }

    const data = await response.json()
    return data.data as PayMongoPaymentLink
  }

  /**
   * Get a specific payment
   */
  async getPayment(paymentId: string): Promise<PayMongoPayment> {
    const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      headers: {
        Authorization: this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error('Failed to get payment')
    }

    const data = await response.json()
    return data.data as PayMongoPayment
  }

  /**
   * List recent payments
   */
  async listPayments(): Promise<PayMongoPayment[]> {
    const response = await fetch(`${this.baseUrl}/payments`, {
      headers: {
        Authorization: this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error('Failed to list payments')
    }

    const data = await response.json()
    return data.data as PayMongoPayment[]
  }

  /**
   * Format amount for display (centavos to PHP)
   */
  formatAmount(centavos: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(centavos / 100)
  }

  /**
   * Parse amount from PHP to centavos
   */
  parseAmount(php: number): number {
    return Math.round(php * 100)
  }

  /**
   * Get payment method display name
   */
  getPaymentMethodName(type: string): string {
    const methods: Record<string, string> = {
      gcash: 'GCash',
      grab_pay: 'GrabPay',
      paymaya: 'Maya',
      card: 'Card',
      dob: 'Direct Online Banking',
      billease: 'BillEase',
    }
    return methods[type] || type
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      paid: 'bg-mint/20 text-mint',
      unpaid: 'bg-yellow-500/20 text-yellow-500',
      pending: 'bg-yellow-500/20 text-yellow-500',
      expired: 'bg-muted text-muted-foreground',
      failed: 'bg-destructive/20 text-destructive',
    }
    return colors[status] || 'bg-muted text-muted-foreground'
  }
}

// Export singleton instance
export const paymongo = new PayMongoService()
