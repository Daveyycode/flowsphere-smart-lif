/**
 * Bill Tracking & Alert System
 * Monitors essential bills and detects payment verification from emails
 */

import { EmailMessage } from './email-scanner'

export interface BillAlert {
  id: string
  billName: string
  provider: string
  amount: number
  currency: string
  dueDate: string
  category: 'utility' | 'rent' | 'subscription' | 'credit-card' | 'insurance' | 'loan' | 'other'
  status: 'pending' | 'paid' | 'overdue' | 'dismissed'
  priority: 'critical' | 'high' | 'medium' | 'low'
  emailId?: string
  accountNumber?: string
  paymentLink?: string
  createdAt: string
  paidAt?: string
  paymentVerificationEmailId?: string
  dismissedBy?: 'user' | 'auto'
}

export interface PaymentVerification {
  billId: string
  emailId: string
  verifiedAt: string
  amount: number
  method: string
  confirmationNumber?: string
}

/**
 * Detect bills from emails
 */
export function detectBillsFromEmails(emails: EmailMessage[]): BillAlert[] {
  const bills: BillAlert[] = []

  emails.forEach(email => {
    const bill = extractBillInfo(email)
    if (bill) {
      bills.push(bill)
    }
  })

  return bills
}

/**
 * Extract bill information from email
 */
function extractBillInfo(email: EmailMessage): BillAlert | null {
  const subject = email.subject.toLowerCase()
  const body = email.body.toLowerCase()
  const from = email.from.toLowerCase()

  // Check if email is a bill
  const isBill =
    subject.includes('bill') ||
    subject.includes('invoice') ||
    subject.includes('payment due') ||
    subject.includes('statement') ||
    subject.includes('amount due') ||
    body.includes('please pay') ||
    body.includes('payment required')

  if (!isBill) return null

  // Extract amount
  const amountMatch = email.body.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/) ||
                     email.subject.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/)
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0

  // Extract due date
  const dueDate = extractDueDate(email.body, email.subject)

  // Determine category
  const category = categorizeBill(from, subject, body)

  // Determine priority
  const priority = determinePriority(amount, dueDate, category)

  // Extract provider name
  const provider = extractProviderName(from, subject)

  return {
    id: `bill-${email.id}`,
    billName: extractBillName(subject),
    provider,
    amount,
    currency: 'USD',
    dueDate,
    category,
    status: isOverdue(dueDate) ? 'overdue' : 'pending',
    priority,
    emailId: email.id,
    accountNumber: extractAccountNumber(body),
    paymentLink: extractPaymentLink(body),
    createdAt: email.timestamp
  }
}

/**
 * Extract due date from email
 */
function extractDueDate(body: string, subject: string): string {
  const text = `${subject} ${body}`.toLowerCase()

  // Look for various date patterns
  const patterns = [
    /due\s+(?:date|by|on)?\s*:?\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
    /due\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /payment\s+due\s+(\w+\s+\d{1,2})/i,
    /before\s+(\w+\s+\d{1,2},?\s+\d{4})/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      try {
        const dateStr = match[1]
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
          return date.toISOString()
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  // Default to 30 days from now if no date found
  const defaultDate = new Date()
  defaultDate.setDate(defaultDate.getDate() + 30)
  return defaultDate.toISOString()
}

/**
 * Categorize bill type
 */
function categorizeBill(from: string, subject: string, body: string): BillAlert['category'] {
  const text = `${from} ${subject} ${body}`.toLowerCase()

  if (text.includes('electric') || text.includes('water') || text.includes('gas') || text.includes('utility')) {
    return 'utility'
  }
  if (text.includes('rent') || text.includes('lease') || text.includes('landlord')) {
    return 'rent'
  }
  if (text.includes('netflix') || text.includes('spotify') || text.includes('subscription') || text.includes('membership')) {
    return 'subscription'
  }
  if (text.includes('credit card') || text.includes('visa') || text.includes('mastercard') || text.includes('amex')) {
    return 'credit-card'
  }
  if (text.includes('insurance') || text.includes('premium') || text.includes('policy')) {
    return 'insurance'
  }
  if (text.includes('loan') || text.includes('mortgage') || text.includes('financing')) {
    return 'loan'
  }

  return 'other'
}

/**
 * Determine priority level
 */
function determinePriority(amount: number, dueDate: string, category: BillAlert['category']): BillAlert['priority'] {
  const daysUntilDue = Math.floor((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  // Critical: High amount, urgent, or essential services
  if (amount > 1000 || daysUntilDue < 3 || category === 'rent' || category === 'utility') {
    return 'critical'
  }

  // High: Moderate amount or coming soon
  if (amount > 500 || daysUntilDue < 7) {
    return 'high'
  }

  // Medium: Regular bills
  if (amount > 100 || daysUntilDue < 14) {
    return 'medium'
  }

  return 'low'
}

/**
 * Extract provider name
 */
function extractProviderName(from: string, subject: string): string {
  // Try to get domain name
  const domainMatch = from.match(/@([^.]+)/)
  if (domainMatch) {
    const domain = domainMatch[1]
    return domain.charAt(0).toUpperCase() + domain.slice(1)
  }

  // Try to extract from subject
  const subjectMatch = subject.match(/^([A-Z][a-zA-Z\s]+)/)
  if (subjectMatch) {
    return subjectMatch[1].trim()
  }

  return 'Unknown Provider'
}

/**
 * Extract bill name from subject
 */
function extractBillName(subject: string): string {
  // Remove common prefixes
  let name = subject
    .replace(/^(RE:|FWD:|Your|Statement|Bill|Invoice|Payment)[\s:]+/i, '')
    .trim()

  // Capitalize first letter
  name = name.charAt(0).toUpperCase() + name.slice(1)

  return name || 'Bill Payment'
}

/**
 * Extract account number
 */
function extractAccountNumber(body: string): string | undefined {
  const patterns = [
    /account\s+(?:number|#)?\s*:?\s*(\d+)/i,
    /acct\s*:?\s*(\d+)/i,
    /account\s+ending\s+in\s+(\d+)/i
  ]

  for (const pattern of patterns) {
    const match = body.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return undefined
}

/**
 * Extract payment link
 */
function extractPaymentLink(body: string): string | undefined {
  const urlPattern = /(https?:\/\/[^\s<>"]+(?:pay|payment|billing)[^\s<>"]*)/i
  const match = body.match(urlPattern)
  return match ? match[1] : undefined
}

/**
 * Check if bill is overdue
 */
function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

/**
 * Detect payment verification from emails
 */
export function detectPaymentVerification(
  email: EmailMessage,
  pendingBills: BillAlert[]
): PaymentVerification | null {
  const subject = email.subject.toLowerCase()
  const body = email.body.toLowerCase()

  // Check if email is a payment confirmation
  const isPaymentConfirmation =
    subject.includes('payment received') ||
    subject.includes('payment confirmed') ||
    subject.includes('thank you for your payment') ||
    subject.includes('payment successful') ||
    body.includes('payment has been received') ||
    body.includes('we received your payment') ||
    body.includes('payment processed') ||
    body.includes('payment confirmation')

  if (!isPaymentConfirmation) return null

  // Extract amount
  const amountMatch = body.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/) ||
                     subject.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/)
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0

  // Extract confirmation number
  const confirmationMatch = body.match(/confirmation\s+(?:number|#|code)?\s*:?\s*([A-Z0-9-]+)/i)
  const confirmationNumber = confirmationMatch ? confirmationMatch[1] : undefined

  // Extract payment method
  const method = extractPaymentMethod(body)

  // Try to match with pending bill
  const from = email.from.toLowerCase()
  const matchingBill = pendingBills.find(bill => {
    const providerMatch = from.includes(bill.provider.toLowerCase())
    const amountMatch = Math.abs(bill.amount - amount) < 0.01
    return providerMatch && amountMatch
  })

  if (!matchingBill) return null

  return {
    billId: matchingBill.id,
    emailId: email.id,
    verifiedAt: email.timestamp,
    amount,
    method,
    confirmationNumber
  }
}

/**
 * Extract payment method from email
 */
function extractPaymentMethod(body: string): string {
  const lowerBody = body.toLowerCase()

  if (lowerBody.includes('credit card') || lowerBody.includes('visa') || lowerBody.includes('mastercard')) {
    return 'Credit Card'
  }
  if (lowerBody.includes('debit card')) {
    return 'Debit Card'
  }
  if (lowerBody.includes('bank account') || lowerBody.includes('checking') || lowerBody.includes('ach')) {
    return 'Bank Transfer'
  }
  if (lowerBody.includes('paypal')) {
    return 'PayPal'
  }
  if (lowerBody.includes('venmo')) {
    return 'Venmo'
  }
  if (lowerBody.includes('apple pay')) {
    return 'Apple Pay'
  }

  return 'Unknown'
}

/**
 * Process emails and update bill alerts
 */
export function processBillAlerts(
  emails: EmailMessage[],
  currentAlerts: BillAlert[]
): {
  updatedAlerts: BillAlert[]
  newAlerts: BillAlert[]
  verifiedPayments: PaymentVerification[]
} {
  // Detect new bills
  const detectedBills = detectBillsFromEmails(emails)
  const newAlerts = detectedBills.filter(bill =>
    !currentAlerts.some(alert => alert.emailId === bill.emailId)
  )

  // Detect payment verifications
  const verifiedPayments: PaymentVerification[] = []
  const pendingAlerts = currentAlerts.filter(alert => alert.status === 'pending' || alert.status === 'overdue')

  emails.forEach(email => {
    const verification = detectPaymentVerification(email, pendingAlerts)
    if (verification) {
      verifiedPayments.push(verification)
    }
  })

  // Update alerts with payment verifications
  const updatedAlerts = currentAlerts.map(alert => {
    const verification = verifiedPayments.find(v => v.billId === alert.id)
    if (verification) {
      return {
        ...alert,
        status: 'paid' as const,
        paidAt: verification.verifiedAt,
        paymentVerificationEmailId: verification.emailId,
        dismissedBy: 'auto' as const
      }
    }

    // Update overdue status
    if (alert.status === 'pending' && isOverdue(alert.dueDate)) {
      return { ...alert, status: 'overdue' as const }
    }

    return alert
  })

  return {
    updatedAlerts,
    newAlerts,
    verifiedPayments
  }
}

/**
 * Get active bill alerts (not paid or dismissed)
 */
export function getActiveBillAlerts(alerts: BillAlert[]): BillAlert[] {
  return alerts
    .filter(alert => alert.status === 'pending' || alert.status === 'overdue')
    .sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff

      // Then by due date
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
}

/**
 * Get bill alert summary
 */
export function getBillAlertSummary(alerts: BillAlert[]): {
  total: number
  critical: number
  overdue: number
  totalAmount: number
  dueThisWeek: number
} {
  const activeAlerts = getActiveBillAlerts(alerts)
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return {
    total: activeAlerts.length,
    critical: activeAlerts.filter(a => a.priority === 'critical').length,
    overdue: activeAlerts.filter(a => a.status === 'overdue').length,
    totalAmount: activeAlerts.reduce((sum, a) => sum + a.amount, 0),
    dueThisWeek: activeAlerts.filter(a => new Date(a.dueDate) <= weekFromNow).length
  }
}

/**
 * Dismiss bill alert manually
 */
export function dismissBillAlert(alert: BillAlert): BillAlert {
  return {
    ...alert,
    status: 'dismissed',
    dismissedBy: 'user'
  }
}

/**
 * Format currency for display
 */
export function formatBillAmount(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

/**
 * Get days until due
 */
export function getDaysUntilDue(dueDate: string): number {
  const days = Math.floor((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return Math.max(days, 0)
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: BillAlert['category']): string {
  const icons = {
    'utility': '⚡',
    'rent': '🏠',
    'subscription': '📱',
    'credit-card': '💳',
    'insurance': '🛡️',
    'loan': '🏦',
    'other': '📄'
  }
  return icons[category]
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: BillAlert['priority']): string {
  const colors = {
    'critical': '#ef4444',
    'high': '#f97316',
    'medium': '#eab308',
    'low': '#22c55e'
  }
  return colors[priority]
}
