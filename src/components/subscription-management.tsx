import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Star, Users, Sparkle, CreditCard, CalendarBlank, Diamond } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import { PaymentModal } from '@/components/payment-modal'

interface SubscriptionManagementProps {
  currentPlan: 'basic' | 'pro' | 'gold' | 'family'
  onPlanChange: (plan: 'basic' | 'pro' | 'gold' | 'family') => void
}

export function SubscriptionManagement({ currentPlan, onPlanChange }: SubscriptionManagementProps) {
  const [billingCycle, setBillingCycle] = useKV<'monthly' | 'yearly'>('flowsphere-billing-cycle', 'monthly')
  const [paymentMethod] = useKV<{type: 'card' | 'paypal' | 'apple', last4?: string} | null>('flowsphere-payment-method', null)
  const [nextBillingDate] = useKV<string>('flowsphere-next-billing', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<{id: string, name: string, price: number} | null>(null)

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      emoji: '🩶',
      icon: Sparkle,
      monthlyPrice: 9,
      yearlyPrice: 4.50,
      yearlyTotal: 54,
      description: 'Perfect for exploring the app.',
      color: 'gray',
      features: [
        'Access to essential tools',
        'Limited AI usage',
        'Standard speed & support',
        'Basic comparison and search'
      ],
      cta: 'Get Started'
    },
    {
      id: 'pro',
      name: 'Pro',
      emoji: '🩵',
      icon: Sparkle,
      monthlyPrice: 19.99,
      yearlyPrice: 9.99,
      yearlyTotal: 119.88,
      description: 'Unlocks more power and integrations.',
      color: 'blue',
      features: [
        'Everything in Basic',
        'Unlimited AI usage',
        'Payment & integration tools (PayPal, affiliate links)',
        'Priority processing speed',
        'Saved searches and preferences'
      ],
      cta: 'Upgrade to Pro'
    },
    {
      id: 'gold',
      name: 'Gold',
      emoji: '💛',
      icon: Star,
      monthlyPrice: 39.99,
      yearlyPrice: 19.99,
      yearlyTotal: 239.88,
      description: 'Full access for creators, sellers & professionals.',
      color: 'gold',
      features: [
        'Everything in Pro',
        'Advanced analytics and automation tools',
        'Beta feature access',
        'Dedicated priority support'
      ],
      cta: 'Go Gold',
      popular: true
    },
    {
      id: 'family',
      name: 'Family / Team',
      emoji: '💎',
      icon: Users,
      monthlyPrice: 79.99,
      yearlyPrice: 39.99,
      yearlyTotal: 479.88,
      description: 'For families or small teams sharing one plan.',
      color: 'purple',
      features: [
        'Everything in Gold',
        'Up to 5 user accounts',
        'Shared data analytics',
        'Team management & concierge support'
      ],
      cta: 'Get Family Plan'
    }
  ]

  const handleUpgrade = (planId: string, planName: string, price: number) => {
    if (planId === currentPlan) {
      toast.info('You are already on this plan')
      return
    }

    setSelectedPlan({ id: planId, name: planName, price })
    setIsPaymentModalOpen(true)
  }

  const handlePaymentComplete = () => {
    if (selectedPlan) {
      onPlanChange(selectedPlan.id as 'basic' | 'pro' | 'gold' | 'family')
      toast.success(`Successfully ${getPlanLevel(selectedPlan.id) > getPlanLevel(currentPlan) ? 'upgraded' : 'changed'} to ${selectedPlan.name} plan!`)
    }
  }

  const getPlanLevel = (plan: string) => {
    const levels = { basic: 0, pro: 1, gold: 2, family: 3 }
    return levels[plan as keyof typeof levels] || 0
  }

  const getButtonText = (planId: string) => {
    if (planId === currentPlan) return 'Current Plan'
    if (getPlanLevel(planId) > getPlanLevel(currentPlan)) return 'Upgrade'
    return 'Switch Plan'
  }

  const getCardColor = (color: string) => {
    switch(color) {
      case 'gray': return 'border-muted-foreground/20'
      case 'blue': return 'border-blue-mid/30'
      case 'gold': return 'border-[#FFB700]/40'
      case 'purple': return 'border-[#7B61FF]/40'
      default: return ''
    }
  }

  const getIconColor = (color: string) => {
    switch(color) {
      case 'gray': return 'text-muted-foreground'
      case 'blue': return 'text-blue-mid'
      case 'gold': return 'text-[#FFB700]'
      case 'purple': return 'text-[#7B61FF]'
      default: return 'text-foreground'
    }
  }

  const getButtonStyles = (color: string, isCurrentPlan: boolean) => {
    if (isCurrentPlan) return 'bg-muted text-muted-foreground cursor-not-allowed'
    
    switch(color) {
      case 'gray': 
        return 'bg-muted-foreground/10 hover:bg-muted-foreground/20 text-foreground'
      case 'blue': 
        return 'bg-blue-mid hover:bg-blue-deep text-white'
      case 'gold': 
        return 'bg-gradient-to-r from-[#FFD700] to-[#FFB700] hover:from-[#FFB700] hover:to-[#FF9500] text-foreground font-semibold'
      case 'purple': 
        return 'bg-[#7B61FF] hover:bg-[#6B51EF] text-white'
      default: 
        return 'bg-primary hover:bg-primary/90 text-primary-foreground'
    }
  }

  return (
    <div className="space-y-6 pb-8 px-4">
      <div className="text-center max-w-4xl mx-auto mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
          Pricing Plans That Fit Every Lifestyle
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
          Choose your plan — switch to yearly billing and save 50%!
        </p>
        <p className="text-xs sm:text-sm text-accent font-medium mt-2">
          🎉 All plans include a 3-day free trial
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-10">
        <Label htmlFor="billing-toggle" className={`text-sm sm:text-base font-medium transition-colors ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
          Monthly
        </Label>
        <motion.div
          whileTap={{ scale: 0.95 }}
        >
          <Switch
            id="billing-toggle"
            checked={billingCycle === 'yearly'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
            className="data-[state=checked]:bg-accent"
          />
        </motion.div>
        <Label htmlFor="billing-toggle" className={`text-sm sm:text-base font-medium transition-colors ${billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>
          Yearly
          <Badge variant="secondary" className="ml-2 text-[10px] sm:text-xs bg-accent/20 text-accent-foreground">
            Save 50%
          </Badge>
        </Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 max-w-7xl mx-auto">
        {plans.map((plan, index) => {
          const Icon = plan.icon
          const isCurrentPlan = plan.id === currentPlan
          const isPopular = plan.popular || false
          const displayPrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
          const yearlyTotal = plan.yearlyTotal

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="relative"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              {isPopular && (
                <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-[#FFD700] to-[#FFB700] text-foreground px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-semibold shadow-md">
                    ⭐ Most Popular
                  </Badge>
                </div>
              )}
              {billingCycle === 'yearly' && (
                <div className="absolute -top-2 -right-2 z-10">
                  <Badge variant="secondary" className="bg-accent/90 text-accent-foreground text-[9px] sm:text-[10px] px-2 py-0.5 shadow-sm">
                    Save 50%
                  </Badge>
                </div>
              )}
              <Card 
                className={`h-full transition-all duration-300 ${
                  isCurrentPlan ? 'border-primary border-2 shadow-xl' : 'border-2'
                } ${
                  getCardColor(plan.color)
                } ${
                  isPopular ? 'shadow-xl glow-accent' : 'shadow-md hover:shadow-xl'
                } bg-card/50 backdrop-blur-sm`}
              >
                <CardHeader className="pb-4 sm:pb-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl sm:text-3xl">{plan.emoji}</span>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${getIconColor(plan.color)}`} weight="duotone" />
                    </div>
                    {isCurrentPlan && (
                      <Badge variant="default" className="text-[10px] sm:text-xs bg-primary">Active</Badge>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl mb-1.5">{plan.name}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm leading-relaxed">
                      {plan.description}
                    </CardDescription>
                  </div>
                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-bold tracking-tight">
                        ${displayPrice}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        /month
                      </span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5">
                        ${yearlyTotal} billed yearly
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-5">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={() => handleUpgrade(
                        plan.id, 
                        plan.name, 
                        billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyTotal
                      )}
                      disabled={isCurrentPlan}
                      className={`w-full min-touch-target text-sm sm:text-base font-semibold rounded-xl transition-all duration-200 ${
                        getButtonStyles(plan.color, isCurrentPlan)
                      }`}
                    >
                      {isCurrentPlan ? 'Current Plan' : plan.cta}
                    </Button>
                  </motion.div>

                  <div className="space-y-3 pt-2">
                    <ul className="space-y-2.5 sm:space-y-3">
                      {plan.features.map((feature, idx) => (
                        <motion.li 
                          key={idx} 
                          className="flex items-start gap-2.5"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 + idx * 0.05 }}
                        >
                          <Check className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${getIconColor(plan.color)}`} weight="bold" />
                          <span className="text-xs sm:text-sm text-foreground leading-relaxed">{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mt-8 sm:mt-12 text-center bg-gradient-to-r from-accent/10 via-primary/10 to-accent/10 rounded-2xl p-8 sm:p-12 max-w-3xl mx-auto"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">
          Ready to experience the future of smart living?
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mb-6">
          Start your 3-day free trial today — no credit card required
        </p>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white font-semibold px-8 py-6 text-base sm:text-lg rounded-xl shadow-lg"
          >
            Start Free Trial
          </Button>
        </motion.div>
      </motion.div>

      <Card className="mt-6 sm:mt-8 max-w-3xl mx-auto">
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
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Next Billing Date</p>
              <p className="text-base sm:text-lg font-semibold">
                {new Date(nextBillingDate || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Payment Method</p>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <p className="text-base sm:text-lg font-semibold">
                  {paymentMethod?.type === 'card' && paymentMethod?.last4 
                    ? `•••• ${paymentMethod.last4}` 
                    : paymentMethod?.type === 'paypal'
                    ? 'PayPal'
                    : paymentMethod?.type === 'apple'
                    ? 'Apple Pay'
                    : 'No payment method'}
                </p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-border/50 flex flex-wrap gap-3">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              <CreditCard className="w-4 h-4 mr-2" />
              Update Payment Method
            </Button>
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              <CalendarBlank className="w-4 h-4 mr-2" />
              View Billing History
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center pt-6 sm:pt-8">
        <p className="text-xs sm:text-sm text-muted-foreground">
          All plans include 3-day free trial. Cancel anytime during your trial period.
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Need help choosing? <button className="text-accent hover:underline font-medium">Contact our team</button>
        </p>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        planName={selectedPlan?.name || ''}
        planPrice={selectedPlan?.price || 0}
        billingCycle={billingCycle || 'monthly'}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  )
}
