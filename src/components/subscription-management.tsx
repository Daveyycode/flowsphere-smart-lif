import { motion } from 'framer-motion'
import { Check, Crown, Users, Sparkle } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'

interface SubscriptionManagementProps {
  currentPlan: 'free' | 'premium' | 'family'
  onPlanChange: (plan: 'free' | 'premium' | 'family') => void
}

export function SubscriptionManagement({ currentPlan, onPlanChange }: SubscriptionManagementProps) {
  const [billingCycle] = useKV<'monthly' | 'annual'>('flowsphere-billing-cycle', 'monthly')

  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: Sparkle,
      price: 0,
      priceAnnual: 0,
      description: 'Perfect for getting started with smart home basics',
      features: [
        'Up to 5 smart devices',
        'Basic automations',
        'Email notifications',
        '1 family member tracking',
        '24-hour CCTV history',
        'Community support'
      ],
      limitations: [
        'No AI assistant',
        'Limited automation rules',
        'Basic analytics'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      icon: Crown,
      price: 9.99,
      priceAnnual: 99.99,
      description: 'Advanced features for power users and smart homes',
      features: [
        'Unlimited smart devices',
        'Advanced automations with conditions',
        'AI-powered insights & assistant',
        'Up to 3 family members tracking',
        '30-day CCTV history',
        'Priority support',
        'Custom notification rules',
        'Voice control integration',
        'Energy monitoring',
        'Advanced analytics'
      ],
      popular: true
    },
    {
      id: 'family',
      name: 'Family',
      icon: Users,
      price: 19.99,
      priceAnnual: 199.99,
      description: 'Everything Premium plus family-focused features',
      features: [
        'Everything in Premium',
        'Unlimited family members tracking',
        'Geo-fencing & safety zones',
        'Emergency alerts',
        '90-day CCTV history',
        'Multiple homes support',
        'Shared calendars & routines',
        'Parental controls',
        'Family activity dashboard',
        'Dedicated account manager'
      ]
    }
  ]

  const handleUpgrade = (planId: string) => {
    if (planId === currentPlan) {
      toast.info('You are already on this plan')
      return
    }

    onPlanChange(planId as 'free' | 'premium' | 'family')
    toast.success(`Successfully ${getPlanLevel(planId) > getPlanLevel(currentPlan) ? 'upgraded' : 'changed'} to ${planId} plan!`)
  }

  const getPlanLevel = (plan: string) => {
    const levels = { free: 0, premium: 1, family: 2 }
    return levels[plan as keyof typeof levels] || 0
  }

  const getButtonText = (planId: string) => {
    if (planId === currentPlan) return 'Current Plan'
    if (getPlanLevel(planId) > getPlanLevel(currentPlan)) return 'Upgrade'
    return 'Switch Plan'
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">Choose Your Plan</h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
          Unlock the full potential of your smart home with FlowSphere
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {plans.map((plan, index) => {
          const Icon = plan.icon
          const isCurrentPlan = plan.id === currentPlan
          const isPopular = 'popular' in plan && plan.popular

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="relative"
            >
              {isPopular && (
                <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-accent text-accent-foreground px-3 sm:px-4 py-1 text-[10px] sm:text-xs">
                    Most Popular
                  </Badge>
                </div>
              )}
              <Card 
                className={`h-full ${isCurrentPlan ? 'border-primary border-2 shadow-lg' : ''} ${isPopular ? 'border-accent/50' : ''}`}
              >
                <CardHeader className="pb-4 sm:pb-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-${plan.id === 'free' ? 'muted' : plan.id === 'premium' ? 'accent' : 'coral'}/10 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${plan.id === 'free' ? 'muted-foreground' : plan.id === 'premium' ? 'accent' : 'coral'}`} weight="duotone" />
                    </div>
                    {isCurrentPlan && (
                      <Badge variant="default" className="text-[10px] sm:text-xs">Active</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl sm:text-2xl mb-1 sm:mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{plan.description}</CardDescription>
                  <div className="mt-3 sm:mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-bold">
                        ${billingCycle === 'monthly' ? plan.price : plan.priceAnnual}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          /{billingCycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      )}
                    </div>
                    {billingCycle === 'annual' && plan.price > 0 && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        Save ${((plan.price * 12) - plan.priceAnnual).toFixed(2)}/year
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrentPlan}
                    className={`w-full min-touch-target text-sm sm:text-base ${
                      isPopular ? 'bg-accent hover:bg-accent/90' : ''
                    }`}
                    variant={isCurrentPlan ? 'secondary' : 'default'}
                  >
                    {getButtonText(plan.id)}
                  </Button>

                  <div className="space-y-3">
                    <p className="text-xs sm:text-sm font-semibold">What's included:</p>
                    <ul className="space-y-2 sm:space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 sm:gap-3">
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-mint shrink-0 mt-0.5" weight="bold" />
                          <span className="text-xs sm:text-sm text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.id === 'free' && 'limitations' in plan && plan.limitations && (
                    <div className="pt-3 sm:pt-4 border-t border-border/50">
                      <p className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3">Limitations:</p>
                      <ul className="space-y-1.5 sm:space-y-2">
                        {plan.limitations.map((limitation, idx) => (
                          <li key={idx} className="text-xs sm:text-sm text-muted-foreground">
                            • {limitation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Card className="mt-6 sm:mt-8">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Billing Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Current Plan</p>
              <p className="text-base sm:text-lg font-semibold capitalize">{currentPlan}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Billing Cycle</p>
              <p className="text-base sm:text-lg font-semibold capitalize">{billingCycle}</p>
            </div>
          </div>
          {currentPlan !== 'free' && (
            <div className="pt-4 border-t border-border/50">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                Update Payment Method
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center pt-6 sm:pt-8">
        <p className="text-xs sm:text-sm text-muted-foreground">
          All plans include 14-day money-back guarantee. Cancel anytime.
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Need help choosing? <button className="text-accent hover:underline">Contact our team</button>
        </p>
      </div>
    </div>
  )
}
