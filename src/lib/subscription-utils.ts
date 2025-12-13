export type SubscriptionTier = 'trial' | 'basic' | 'pro' | 'gold' | 'family'

export interface SubscriptionFeatures {
  aiUsage: 'limited' | 'unlimited'
  prioritySupport: boolean
  analytics: 'basic' | 'advanced'
  betaAccess: boolean
  multiUser: boolean
  maxUsers: number
  integrations: boolean
  subscriptionMonitoring: boolean
}

export const SUBSCRIPTION_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
  trial: {
    aiUsage: 'limited',
    prioritySupport: false,
    analytics: 'basic',
    betaAccess: false,
    multiUser: false,
    maxUsers: 1,
    integrations: false,
    subscriptionMonitoring: false,
  },
  basic: {
    aiUsage: 'limited',
    prioritySupport: false,
    analytics: 'basic',
    betaAccess: false,
    multiUser: false,
    maxUsers: 1,
    integrations: false,
    subscriptionMonitoring: false,
  },
  pro: {
    aiUsage: 'unlimited',
    prioritySupport: true,
    analytics: 'basic',
    betaAccess: false,
    multiUser: false,
    maxUsers: 1,
    integrations: true,
    subscriptionMonitoring: true,
  },
  gold: {
    aiUsage: 'unlimited',
    prioritySupport: true,
    analytics: 'advanced',
    betaAccess: true,
    multiUser: false,
    maxUsers: 1,
    integrations: true,
    subscriptionMonitoring: true,
  },
  family: {
    aiUsage: 'unlimited',
    prioritySupport: true,
    analytics: 'advanced',
    betaAccess: true,
    multiUser: true,
    maxUsers: 5,
    integrations: true,
    subscriptionMonitoring: true,
  },
}

export function hasFeatureAccess(
  currentTier: SubscriptionTier,
  feature: keyof SubscriptionFeatures
): boolean {
  return SUBSCRIPTION_FEATURES[currentTier][feature] as boolean
}

export function getFeatureValue<K extends keyof SubscriptionFeatures>(
  currentTier: SubscriptionTier,
  feature: K
): SubscriptionFeatures[K] {
  return SUBSCRIPTION_FEATURES[currentTier][feature]
}

export function getRequiredTierForFeature(feature: keyof SubscriptionFeatures): SubscriptionTier {
  const tiers: SubscriptionTier[] = ['basic', 'pro', 'gold', 'family']

  for (const tier of tiers) {
    const featureValue = SUBSCRIPTION_FEATURES[tier][feature]
    if (
      featureValue === true ||
      (featureValue !== 'limited' &&
        featureValue !== 'basic' &&
        featureValue !== false &&
        featureValue !== 0 &&
        featureValue !== 1)
    ) {
      return tier
    }
  }

  return 'basic'
}

export function isTrialActive(trialStartDate: string | null, trialDays: number = 3): boolean {
  if (!trialStartDate) return false

  const startDate = new Date(trialStartDate)
  const currentDate = new Date()
  const daysSinceStart = Math.floor(
    (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return daysSinceStart < trialDays
}

export function getEffectiveTier(
  subscriptionTier: 'basic' | 'pro' | 'gold' | 'family',
  trialStartDate: string | null
): SubscriptionTier {
  if (isTrialActive(trialStartDate)) {
    return 'trial'
  }
  return subscriptionTier
}

export function getRemainingTrialDays(
  trialStartDate: string | null,
  trialDays: number = 3
): number {
  if (!trialStartDate) return 0

  const startDate = new Date(trialStartDate)
  const currentDate = new Date()
  const daysSinceStart = Math.floor(
    (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const remaining = trialDays - daysSinceStart

  return Math.max(0, remaining)
}
