/**
 * FlowSphere Vault Storage Subscription Management
 *
 * Handles subscription tiers, billing, grace periods, and receipt privacy.
 *
 * Pricing:
 * - Basic (5GB): $3/month
 * - Pro (12GB): $5/month
 * - Gold (30GB): $8/month
 *
 * Grace Period: 14 days after expiration
 * - During grace: Can view/download, cannot upload new files
 * - After grace: Read-only mode until renewed
 *
 * Receipt Privacy:
 * - User chooses how subscription appears on bank statement
 * - Can bundle with main FlowSphere subscription
 * - Custom labels available (never shows "vault" or "secret")
 *
 * @author FlowSphere Team
 * @version 1.0.0
 */

import { supabase } from './supabase'
import { logger } from '@/lib/security-utils'

// ============================================
// TYPES
// ============================================

export type VaultTier = 'basic' | 'pro' | 'gold'

export type SubscriptionStatus = 'active' | 'grace_period' | 'expired' | 'cancelled'

export type ReceiptMode = 'bundled' | 'separate'

export interface VaultSubscription {
  id: string
  userId: string
  tier: VaultTier
  storageLimitGb: number
  storageUsedBytes: number

  // Receipt privacy
  receiptMode: ReceiptMode
  receiptLabel: string | null // Custom label for bank statement

  // Stripe integration
  stripeSubscriptionId: string | null
  stripeCustomerId: string | null

  // Status & dates
  status: SubscriptionStatus
  subscribedAt: string
  expiresAt: string
  gracePeriodEndsAt: string | null // 14 days after expiresAt
  cancelledAt: string | null

  // Timestamps
  createdAt: string
  updatedAt: string
}

export interface SubscriptionTier {
  id: VaultTier
  name: string
  storageLimitGb: number
  storageLimitBytes: number
  priceMonthly: number
  priceYearly: number
  features: string[]
}

export interface ReceiptOption {
  id: string
  label: string
  description: string
}

// ============================================
// CONSTANTS
// ============================================

export const GRACE_PERIOD_DAYS = 14

export const SUBSCRIPTION_TIERS: Record<VaultTier, SubscriptionTier> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    storageLimitGb: 5,
    storageLimitBytes: 5 * 1024 * 1024 * 1024,
    priceMonthly: 3,
    priceYearly: 30, // 2 months free
    features: [
      '5 GB encrypted storage',
      'Hidden file disguise',
      'Device-bound encryption',
      'PIN/Biometric protection',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    storageLimitGb: 12,
    storageLimitBytes: 12 * 1024 * 1024 * 1024,
    priceMonthly: 5,
    priceYearly: 50, // 2 months free
    features: [
      '12 GB encrypted storage',
      'Hidden file disguise',
      'Device-bound encryption',
      'PIN/Biometric protection',
      'Priority support',
    ],
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    storageLimitGb: 30,
    storageLimitBytes: 30 * 1024 * 1024 * 1024,
    priceMonthly: 8,
    priceYearly: 80, // 2 months free
    features: [
      '30 GB encrypted storage',
      'Hidden file disguise',
      'Device-bound encryption',
      'PIN/Biometric protection',
      'Priority support',
      'Early access to new features',
    ],
  },
}

// Receipt labels that NEVER mention vault/secret/hidden
export const RECEIPT_LABELS: ReceiptOption[] = [
  { id: 'cloud', label: 'FS Cloud Services', description: 'Appears as cloud storage service' },
  { id: 'premium', label: 'FS Premium Features', description: 'Appears as premium app features' },
  { id: 'storage', label: 'FS Storage Plan', description: 'Appears as general storage plan' },
  { id: 'backup', label: 'FS Cloud Backup', description: 'Appears as backup service' },
  { id: 'data', label: 'FS Data Services', description: 'Appears as data management' },
  { id: 'addon', label: 'FlowSphere Add-on', description: 'Appears as app add-on' },
]

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Get user's vault subscription
 */
export async function getVaultSubscription(userId: string): Promise<VaultSubscription | null> {
  const { data, error } = await supabase
    .from('vault_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  // Check and update status based on dates
  const subscription = mapToSubscription(data)
  const updatedStatus = calculateCurrentStatus(subscription)

  if (updatedStatus !== subscription.status) {
    await updateSubscriptionStatus(subscription.id, updatedStatus)
    subscription.status = updatedStatus
  }

  return subscription
}

/**
 * Create a new vault subscription
 */
export async function createVaultSubscription(
  userId: string,
  tier: VaultTier,
  receiptMode: ReceiptMode,
  receiptLabel: string | null,
  stripeSubscriptionId: string
): Promise<VaultSubscription> {
  const tierInfo = SUBSCRIPTION_TIERS[tier]
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setMonth(expiresAt.getMonth() + 1) // 1 month subscription

  const { data, error } = await supabase
    .from('vault_subscriptions')
    .insert({
      user_id: userId,
      tier,
      storage_limit_gb: tierInfo.storageLimitGb,
      storage_used_bytes: 0,
      receipt_mode: receiptMode,
      receipt_label: receiptLabel,
      stripe_subscription_id: stripeSubscriptionId,
      status: 'active',
      subscribed_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      grace_period_ends_at: null,
    })
    .select()
    .single()

  if (error) {
    logger.error('[VAULT SUB] Failed to create subscription:', error)
    throw new Error('Failed to create subscription')
  }

  return mapToSubscription(data)
}

/**
 * Update subscription tier (upgrade/downgrade)
 */
export async function updateSubscriptionTier(
  subscriptionId: string,
  newTier: VaultTier
): Promise<VaultSubscription> {
  const tierInfo = SUBSCRIPTION_TIERS[newTier]

  const { data, error } = await supabase
    .from('vault_subscriptions')
    .update({
      tier: newTier,
      storage_limit_gb: tierInfo.storageLimitGb,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single()

  if (error) {
    logger.error('[VAULT SUB] Failed to update tier:', error)
    throw new Error('Failed to update subscription tier')
  }

  return mapToSubscription(data)
}

/**
 * Renew subscription (called after successful payment)
 */
export async function renewSubscription(subscriptionId: string): Promise<VaultSubscription> {
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setMonth(expiresAt.getMonth() + 1)

  const { data, error } = await supabase
    .from('vault_subscriptions')
    .update({
      status: 'active',
      expires_at: expiresAt.toISOString(),
      grace_period_ends_at: null,
      updated_at: now.toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single()

  if (error) {
    logger.error('[VAULT SUB] Failed to renew subscription:', error)
    throw new Error('Failed to renew subscription')
  }

  return mapToSubscription(data)
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('vault_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)

  if (error) {
    logger.error('[VAULT SUB] Failed to cancel subscription:', error)
    throw new Error('Failed to cancel subscription')
  }
}

/**
 * Update storage used
 */
export async function updateStorageUsed(
  subscriptionId: string,
  bytesChange: number // positive for add, negative for delete
): Promise<void> {
  // Get current usage
  const { data: current } = await supabase
    .from('vault_subscriptions')
    .select('storage_used_bytes')
    .eq('id', subscriptionId)
    .single()

  if (!current) return

  const newUsage = Math.max(0, (current.storage_used_bytes || 0) + bytesChange)

  await supabase
    .from('vault_subscriptions')
    .update({
      storage_used_bytes: newUsage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
}

// ============================================
// STATUS MANAGEMENT
// ============================================

/**
 * Calculate current status based on dates
 */
function calculateCurrentStatus(subscription: VaultSubscription): SubscriptionStatus {
  if (subscription.status === 'cancelled') {
    return 'cancelled'
  }

  const now = new Date()
  const expiresAt = new Date(subscription.expiresAt)
  const gracePeriodEnds = subscription.gracePeriodEndsAt
    ? new Date(subscription.gracePeriodEndsAt)
    : new Date(expiresAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)

  if (now < expiresAt) {
    return 'active'
  } else if (now < gracePeriodEnds) {
    return 'grace_period'
  } else {
    return 'expired'
  }
}

/**
 * Update subscription status in database
 */
async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  // Set grace period end date when entering grace period
  if (status === 'grace_period') {
    const gracePeriodEnds = new Date()
    gracePeriodEnds.setDate(gracePeriodEnds.getDate() + GRACE_PERIOD_DAYS)
    updates.grace_period_ends_at = gracePeriodEnds.toISOString()
  }

  await supabase.from('vault_subscriptions').update(updates).eq('id', subscriptionId)
}

// ============================================
// PERMISSION CHECKS
// ============================================

/**
 * Check if user can upload new files
 */
export function canUpload(subscription: VaultSubscription | null): {
  allowed: boolean
  reason?: string
} {
  if (!subscription) {
    return {
      allowed: false,
      reason: 'No active vault storage subscription. Subscribe to start hiding files.',
    }
  }

  if (subscription.status === 'active') {
    return { allowed: true }
  }

  if (subscription.status === 'grace_period') {
    const graceDaysLeft = getGraceDaysRemaining(subscription)
    return {
      allowed: false,
      reason: `Your subscription expired. You have ${graceDaysLeft} days to renew. Currently in read-only mode.`,
    }
  }

  if (subscription.status === 'expired') {
    return {
      allowed: false,
      reason:
        'Your subscription has expired. Renew to upload new files. Your existing files are safe.',
    }
  }

  return {
    allowed: false,
    reason: 'Subscription is not active.',
  }
}

/**
 * Check if user can view/download files
 */
export function canViewFiles(subscription: VaultSubscription | null): boolean {
  // Users can always view their files, even if subscription expired
  // This is the "read-only" mode
  return subscription !== null
}

/**
 * Check if user can delete files
 */
export function canDeleteFiles(subscription: VaultSubscription | null): boolean {
  if (!subscription) return false

  // Can delete during active or grace period (helps manage storage)
  return subscription.status === 'active' || subscription.status === 'grace_period'
}

/**
 * Check storage limit
 */
export function checkStorageLimit(
  subscription: VaultSubscription,
  additionalBytes: number
): { allowed: boolean; reason?: string } {
  const limitBytes = subscription.storageLimitGb * 1024 * 1024 * 1024
  const newTotal = subscription.storageUsedBytes + additionalBytes

  if (newTotal > limitBytes) {
    const usedFormatted = formatBytes(subscription.storageUsedBytes)
    const limitFormatted = `${subscription.storageLimitGb} GB`

    return {
      allowed: false,
      reason: `Storage limit exceeded (${usedFormatted} / ${limitFormatted}). Upgrade your plan or delete some files.`,
    }
  }

  return { allowed: true }
}

// ============================================
// GRACE PERIOD HELPERS
// ============================================

/**
 * Get days remaining in grace period
 */
export function getGraceDaysRemaining(subscription: VaultSubscription): number {
  if (subscription.status !== 'grace_period') return 0

  const gracePeriodEnds = subscription.gracePeriodEndsAt
    ? new Date(subscription.gracePeriodEndsAt)
    : new Date(new Date(subscription.expiresAt).getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)

  const now = new Date()
  const msRemaining = gracePeriodEnds.getTime() - now.getTime()
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000))

  return Math.max(0, daysRemaining)
}

/**
 * Get notification message based on status
 */
export function getStatusNotification(subscription: VaultSubscription): {
  type: 'info' | 'warning' | 'error'
  title: string
  message: string
  action?: string
} | null {
  if (subscription.status === 'active') {
    return null // No notification needed
  }

  if (subscription.status === 'grace_period') {
    const daysLeft = getGraceDaysRemaining(subscription)

    if (daysLeft <= 1) {
      return {
        type: 'error',
        title: 'Last Day of Grace Period',
        message: 'Your grace period ends tomorrow. Renew now to continue uploading files.',
        action: 'Renew Now',
      }
    } else if (daysLeft <= 7) {
      return {
        type: 'warning',
        title: `${daysLeft} Days Left`,
        message: 'Your subscription is in grace period. Renew to upload new files.',
        action: 'Renew Now',
      }
    } else {
      return {
        type: 'warning',
        title: 'Subscription Expired',
        message: `You have ${daysLeft} days to renew. Currently in read-only mode.`,
        action: 'Renew Now',
      }
    }
  }

  if (subscription.status === 'expired') {
    return {
      type: 'error',
      title: 'Read-Only Mode',
      message:
        'Your subscription has expired. Renew anytime to upload new files. Your existing files are safe.',
      action: 'Renew Now',
    }
  }

  return null
}

// ============================================
// RECEIPT PRIVACY
// ============================================

/**
 * Get Stripe statement descriptor based on user preference
 */
export function getStatementDescriptor(
  receiptMode: ReceiptMode,
  receiptLabel: string | null
): {
  descriptor: string
  suffix: string
} {
  if (receiptMode === 'bundled') {
    return {
      descriptor: 'FLOWSPHERE',
      suffix: 'APP',
    }
  }

  // Find the label or use default
  const labelInfo = RECEIPT_LABELS.find(l => l.label === receiptLabel)
  const label = labelInfo?.label || 'FS Cloud Services'

  // Stripe limits: descriptor max 22 chars, suffix max 12 chars
  const parts = label.split(' ')
  const descriptor = parts.slice(0, -1).join(' ').substring(0, 22) || 'FLOWSPHERE'
  const suffix = parts[parts.length - 1].substring(0, 12) || 'SERVICE'

  return { descriptor, suffix }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Map database row to TypeScript interface
 */
function mapToSubscription(data: Record<string, unknown>): VaultSubscription {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    tier: data.tier as VaultTier,
    storageLimitGb: data.storage_limit_gb as number,
    storageUsedBytes: data.storage_used_bytes as number,
    receiptMode: data.receipt_mode as ReceiptMode,
    receiptLabel: data.receipt_label as string | null,
    stripeSubscriptionId: data.stripe_subscription_id as string | null,
    stripeCustomerId: data.stripe_customer_id as string | null,
    status: data.status as SubscriptionStatus,
    subscribedAt: data.subscribed_at as string,
    expiresAt: data.expires_at as string,
    gracePeriodEndsAt: data.grace_period_ends_at as string | null,
    cancelledAt: data.cancelled_at as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ============================================
// EXPORTS
// ============================================

export default {
  SUBSCRIPTION_TIERS,
  RECEIPT_LABELS,
  GRACE_PERIOD_DAYS,
  getVaultSubscription,
  createVaultSubscription,
  updateSubscriptionTier,
  renewSubscription,
  cancelSubscription,
  updateStorageUsed,
  canUpload,
  canViewFiles,
  canDeleteFiles,
  checkStorageLimit,
  getGraceDaysRemaining,
  getStatusNotification,
  getStatementDescriptor,
}
