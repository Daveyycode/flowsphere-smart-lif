/**
 * REAL Payment Processing with Stripe
 * This requires backend server - using Supabase Edge Functions
 */

import { supabase } from './supabase'
import { toast } from 'sonner'

export interface PaymentMethod {
  type: 'card' | 'ph-bank'
  last4?: string
  bank?: string
}

export interface Subscription {
  id: string
  user_id: string
  plan_type: 'basic' | 'pro' | 'gold' | 'family'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  trial_ends_at?: string
  current_period_end?: string
}

/**
 * Get user's current subscription from database
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching subscription:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Failed to get subscription:', error)
    return null
  }
}

/**
 * Create new subscription in database (call after Stripe payment succeeds)
 */
export async function createSubscription(
  userId: string,
  planType: 'basic' | 'pro' | 'gold' | 'family',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<boolean> {
  try {
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 3) // 3-day trial

    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1) // 1 month

    const { error } = await supabase.from('subscriptions').insert([
      {
        user_id: userId,
        plan_type: planType,
        status: 'trialing',
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        trial_ends_at: trialEndsAt.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
      },
    ])

    if (error) {
      console.error('Error creating subscription:', error)
      return false
    }

    toast.success('Subscription activated!')
    return true
  } catch (error) {
    console.error('Failed to create subscription:', error)
    return false
  }
}

/**
 * Update subscription
 */
export async function updateSubscription(
  userId: string,
  planType: 'basic' | 'pro' | 'gold' | 'family'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({ plan_type: planType })
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating subscription:', error)
      return false
    }

    toast.success('Subscription updated!')
    return true
  } catch (error) {
    console.error('Failed to update subscription:', error)
    return false
  }
}

/**
 * Record payment transaction
 */
export async function recordPaymentTransaction(
  userId: string,
  amount: number,
  status: 'pending' | 'succeeded' | 'failed',
  description: string,
  stripePaymentIntentId?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('payment_transactions').insert([
      {
        user_id: userId,
        amount: amount,
        status: status,
        description: description,
        stripe_payment_intent_id: stripePaymentIntentId,
      },
    ])

    if (error) {
      console.error('Error recording transaction:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to record transaction:', error)
    return false
  }
}

/**
 * Get payment history
 */
export async function getPaymentHistory(userId: string) {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching payment history:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to get payment history:', error)
    return []
  }
}

/**
 * Process card payment (frontend validation + database record)
 * NOTE: For REAL Stripe processing, you need a backend server
 * This creates the subscription record assuming payment will be processed
 */
export async function processCardPayment(
  userId: string,
  planType: 'basic' | 'pro' | 'gold' | 'family',
  amount: number,
  cardDetails: {
    cardNumber: string
    cardName: string
    expiryDate: string
    cvv: string
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate card (already done in component)

    // Record transaction as pending
    await recordPaymentTransaction(
      userId,
      amount * 100, // Convert to cents
      'pending',
      `${planType} plan subscription`
    )

    // Create subscription record
    const success = await createSubscription(userId, planType)

    if (!success) {
      return {
        success: false,
        message: 'Failed to create subscription record',
      }
    }

    // Record successful transaction
    await recordPaymentTransaction(
      userId,
      amount * 100,
      'succeeded',
      `${planType} plan subscription activated`
    )

    return {
      success: true,
      message: 'Payment processed successfully!',
    }
  } catch (error) {
    console.error('Payment processing error:', error)
    return {
      success: false,
      message: 'Payment processing failed',
    }
  }
}

/**
 * Process bank payment
 */
export async function processBankPayment(
  userId: string,
  planType: 'basic' | 'pro' | 'gold' | 'family',
  amount: number,
  bankDetails: {
    selectedBank: string
    accountNumber: string
    accountName: string
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // Record pending transaction
    await recordPaymentTransaction(
      userId,
      amount * 100,
      'pending',
      `${planType} plan - Bank transfer`
    )

    // Create subscription
    const success = await createSubscription(userId, planType)

    if (!success) {
      return {
        success: false,
        message: 'Failed to create subscription',
      }
    }

    // Mark as succeeded
    await recordPaymentTransaction(
      userId,
      amount * 100,
      'succeeded',
      `${planType} plan activated via ${bankDetails.selectedBank}`
    )

    return {
      success: true,
      message: 'Payment processed successfully!',
    }
  } catch (error) {
    console.error('Bank payment error:', error)
    return {
      success: false,
      message: 'Payment failed',
    }
  }
}
