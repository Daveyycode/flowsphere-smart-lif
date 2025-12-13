import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  Star,
  Users,
  Sparkle,
  CreditCard,
  CalendarBlank,
  Diamond,
  GraduationCap,
  DeviceMobile,
  Database,
  Infinity,
  Lock,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'
import { PaymentModal } from '@/components/payment-modal'

export interface AddOn {
  id: string
  name: string
  price: number
  description: string
  icon: typeof GraduationCap
  quantity?: number
  quantityLabel?: string
}

interface SubscriptionManagementProps {
  currentPlan: 'basic' | 'pro' | 'gold' | 'family'
  onPlanChange: (plan: 'basic' | 'pro' | 'gold' | 'family') => void
}

export function SubscriptionManagement({ currentPlan, onPlanChange }: SubscriptionManagementProps) {
  const [billingCycle, setBillingCycle] = useKV<'monthly' | 'yearly'>(
    'flowsphere-billing-cycle',
    'monthly'
  )
  const [paymentMethod] = useKV<{ type: 'card' | 'paypal' | 'apple'; last4?: string } | null>(
    'flowsphere-payment-method',
    null
  )
  const [nextBillingDate] = useKV<string>(
    'flowsphere-next-billing',
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  )
  const [isEarlyBirdActive, setIsEarlyBirdActive] = useKV<boolean>(
    'flowsphere-early-bird-active',
    true
  )
  const [earlyBirdStartDate, setEarlyBirdStartDate] = useKV<string | null>(
    'flowsphere-early-bird-start',
    null
  )
  const [hasLifetimeGold, setHasLifetimeGold] = useKV<boolean>('flowsphere-lifetime-gold', false)
  const [activeAddOns, setActiveAddOns] = useKV<{
    aiTutor: number
    smartDevicePack: number
    extendedMemory: boolean
  }>('flowsphere-active-addons', {
    aiTutor: 0,
    smartDevicePack: 0,
    extendedMemory: false,
  })

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<{
    id: string
    name: string
    price: number
    isLifetime?: boolean
  } | null>(null)
  const [tempAddOns, setTempAddOns] = useState({
    aiTutor: activeAddOns?.aiTutor || 0,
    smartDevicePack: activeAddOns?.smartDevicePack || 0,
    extendedMemory: activeAddOns?.extendedMemory || false,
  })

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      emoji: '🩶',
      icon: Sparkle,
      monthlyPrice: 14.99,
      yearlyPrice: 13.49,
      yearlyTotal: 161.88,
      description: 'First-time users',
      color: 'gray',
      features: ['Email sorting', 'Daily prayers', 'Basic scheduler', 'Limited AI usage'],
      cta: 'Get Started',
    },
    {
      id: 'pro',
      name: 'Pro',
      emoji: '🩵',
      icon: Sparkle,
      monthlyPrice: 24.99,
      yearlyPrice: 22.49,
      yearlyTotal: 269.88,
      description: 'Busy individuals',
      color: 'blue',
      features: [
        'Everything in Basic',
        'Traffic alerts',
        'Learning scheduler',
        'AI automation',
        'Unlimited AI usage',
      ],
      cta: 'Upgrade to Pro',
    },
    {
      id: 'gold',
      name: 'Gold',
      emoji: '💛',
      icon: Star,
      monthlyPrice: 49.99,
      yearlyPrice: 44.99,
      yearlyTotal: 539.88,
      description: 'Professionals / Smart-home users',
      color: 'gold',
      features: [
        'Everything in Pro',
        'Full automation',
        'Family dashboard',
        'Voice control',
        'Advanced analytics',
      ],
      cta: 'Go Gold',
      popular: true,
    },
    {
      id: 'family',
      name: 'Family / Team',
      emoji: '💎',
      icon: Users,
      monthlyPrice: 99.99,
      yearlyPrice: 89.99,
      yearlyTotal: 1079.88,
      description: 'Households / small orgs',
      color: 'purple',
      features: [
        'Everything in Gold',
        'Multi-account (up to 5 users)',
        'Tutor AI',
        'Complete home integration',
        'Team management & concierge support',
      ],
      cta: 'Get Family Plan',
    },
  ]

  const addOns: AddOn[] = [
    {
      id: 'aiTutor',
      name: 'AI Tutor Module',
      price: 14.99,
      description: 'Per child per month - Interactive learning assistant with homework help',
      icon: GraduationCap,
      quantityLabel: 'Number of children',
    },
    {
      id: 'smartDevicePack',
      name: 'Smart Device Pack',
      price: 4.99,
      description: 'Per pack per month - Add 5 more smart devices to your ecosystem',
      icon: DeviceMobile,
      quantityLabel: 'Number of packs',
    },
    {
      id: 'extendedMemory',
      name: 'Extended Memory & Analytics',
      price: 3.99,
      description: 'Per month - Extended data retention and advanced insights',
      icon: Database,
    },
  ]

  const getEarlyBirdDiscount = () => {
    if (!isEarlyBirdActive || !earlyBirdStartDate) return 0

    const startDate = new Date(earlyBirdStartDate)
    const currentDate = new Date()
    const monthsSinceStart = Math.floor(
      (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    )

    if (monthsSinceStart < 3) {
      return 0.1
    }
    return 0
  }

  const earlyBirdDiscount = getEarlyBirdDiscount()
  const hasEarlyBirdDiscount = earlyBirdDiscount > 0

  const handleUpgrade = (planId: string, planName: string, price: number, isLifetime?: boolean) => {
    if (planId === currentPlan && !isLifetime) {
      toast.info('You are already on this plan')
      return
    }

    if (isLifetime && hasLifetimeGold) {
      toast.info('You already have Lifetime Gold Access')
      return
    }

    setSelectedPlan({ id: planId, name: planName, price, isLifetime })
    setIsPaymentModalOpen(true)
  }

  const handlePaymentComplete = () => {
    if (selectedPlan) {
      if (selectedPlan.isLifetime) {
        setHasLifetimeGold(true)
        onPlanChange('gold')
        toast.success('🎉 Lifetime Gold Access activated! Welcome to the family!')
      } else {
        onPlanChange(selectedPlan.id as 'basic' | 'pro' | 'gold' | 'family')
        toast.success(
          `Successfully ${getPlanLevel(selectedPlan.id) > getPlanLevel(currentPlan) ? 'upgraded' : 'changed'} to ${selectedPlan.name} plan!`
        )
      }

      if (!earlyBirdStartDate && isEarlyBirdActive) {
        setEarlyBirdStartDate(new Date().toISOString())
      }
    }
  }

  const handleUpdateAddOns = () => {
    setActiveAddOns({
      aiTutor: tempAddOns.aiTutor,
      smartDevicePack: tempAddOns.smartDevicePack,
      extendedMemory: tempAddOns.extendedMemory,
    })
    toast.success('Add-ons updated successfully!')
  }

  const calculateAddOnTotal = () => {
    let total = 0
    total += tempAddOns.aiTutor * 14.99
    total += tempAddOns.smartDevicePack * 4.99
    if (tempAddOns.extendedMemory) total += 3.99
    return total
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
    switch (color) {
      case 'gray':
        return 'border-muted-foreground/20'
      case 'blue':
        return 'border-blue-mid/30'
      case 'gold':
        return 'border-[#FFB700]/40'
      case 'purple':
        return 'border-[#7B61FF]/40'
      default:
        return ''
    }
  }

  const getIconColor = (color: string) => {
    switch (color) {
      case 'gray':
        return 'text-muted-foreground'
      case 'blue':
        return 'text-blue-mid'
      case 'gold':
        return 'text-[#FFB700]'
      case 'purple':
        return 'text-[#7B61FF]'
      default:
        return 'text-foreground'
    }
  }

  const getButtonStyles = (color: string, isCurrentPlan: boolean) => {
    if (isCurrentPlan) return 'bg-muted text-muted-foreground cursor-not-allowed'

    switch (color) {
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
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
          Choose your plan — switch to yearly billing and save 10%!
        </p>
        <p className="text-xs sm:text-sm text-accent font-medium mt-2">
          🎉 All plans include a 3-day free trial
        </p>
        {hasEarlyBirdDiscount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 inline-block"
          >
            <Badge className="bg-gradient-to-r from-[#FFD700] to-[#FFB700] text-foreground px-4 py-2 text-sm font-bold shadow-lg">
              🚀 Early Bird Special: 10% OFF First 3 Months!
            </Badge>
          </motion.div>
        )}
      </div>

      {!hasLifetimeGold && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-5xl mx-auto mb-8"
        >
          <Card className="border-2 border-[#FFD700] bg-gradient-to-br from-[#FFD700]/10 via-[#FFB700]/5 to-background shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FFD700] to-[#FFB700] opacity-20 blur-3xl rounded-full"></div>
            <CardHeader className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <Infinity className="w-8 h-8 text-[#FFD700]" weight="bold" />
                <Badge className="bg-gradient-to-r from-[#FFD700] to-[#FFB700] text-foreground font-bold">
                  🔥 LAUNCH OFFER
                </Badge>
              </div>
              <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FFD700] to-[#FFB700] bg-clip-text text-transparent">
                Lifetime Gold Access
              </CardTitle>
              <CardDescription className="text-base sm:text-lg mt-2">
                Pay once, enjoy Gold features forever. Limited-time launch pricing.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#FFD700]">
                      $349
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground line-through">$599</span>
                      <span className="text-xs text-accent font-semibold">Save $250</span>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-5 h-5 text-[#FFD700]" weight="bold" />
                      <span>All Gold features forever</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-5 h-5 text-[#FFD700]" weight="bold" />
                      <span>No monthly or yearly fees</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-5 h-5 text-[#FFD700]" weight="bold" />
                      <span>Priority support for life</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-5 h-5 text-[#FFD700]" weight="bold" />
                      <span>Early access to all future features</span>
                    </li>
                  </ul>
                </div>
                <div className="w-full sm:w-auto">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => handleUpgrade('gold', 'Lifetime Gold', 349, true)}
                      className="w-full sm:w-auto bg-gradient-to-r from-[#FFD700] to-[#FFB700] hover:from-[#FFB700] hover:to-[#FF9500] text-foreground font-bold px-8 py-6 text-lg rounded-xl shadow-lg"
                    >
                      <Infinity className="w-5 h-5 mr-2" weight="bold" />
                      Get Lifetime Access
                    </Button>
                  </motion.div>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    One-time payment • Forever yours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {hasLifetimeGold && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto mb-8"
        >
          <Card className="border-2 border-[#FFD700] bg-gradient-to-br from-[#FFD700]/10 to-background">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-3">
                <Infinity className="w-8 h-8 text-[#FFD700]" weight="bold" />
                <p className="text-lg font-semibold text-[#FFD700]">
                  🎉 You have Lifetime Gold Access - Enjoy forever!
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="flex items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-10">
        <Label
          htmlFor="billing-toggle"
          className={`text-sm sm:text-base font-medium transition-colors ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Monthly
        </Label>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Switch
            id="billing-toggle"
            checked={billingCycle === 'yearly'}
            onCheckedChange={checked => setBillingCycle(checked ? 'yearly' : 'monthly')}
            className="data-[state=checked]:bg-accent"
          />
        </motion.div>
        <Label
          htmlFor="billing-toggle"
          className={`text-sm sm:text-base font-medium transition-colors ${billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Yearly
          <Badge
            variant="secondary"
            className="ml-2 text-[10px] sm:text-xs bg-accent/20 text-accent-foreground"
          >
            Save 10%
          </Badge>
        </Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 max-w-7xl mx-auto">
        {plans.map((plan, index) => {
          const Icon = plan.icon
          const isCurrentPlan = plan.id === currentPlan && !hasLifetimeGold
          const isPopular = plan.popular || false
          let displayPrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
          const yearlyTotal = plan.yearlyTotal

          if (hasEarlyBirdDiscount) {
            displayPrice = displayPrice * (1 - earlyBirdDiscount)
          }

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
              {billingCycle === 'yearly' && !hasEarlyBirdDiscount && (
                <div className="absolute -top-2 -right-2 z-10">
                  <Badge
                    variant="secondary"
                    className="bg-accent/90 text-accent-foreground text-[9px] sm:text-[10px] px-2 py-0.5 shadow-sm"
                  >
                    Save 10%
                  </Badge>
                </div>
              )}
              {hasEarlyBirdDiscount && (
                <div className="absolute -top-2 -right-2 z-10">
                  <Badge className="bg-gradient-to-r from-[#FFD700] to-[#FFB700] text-foreground text-[9px] sm:text-[10px] px-2 py-0.5 shadow-sm font-bold">
                    🚀 10% OFF
                  </Badge>
                </div>
              )}
              <Card
                className={`h-full transition-all duration-300 ${
                  isCurrentPlan ? 'border-primary border-2 shadow-xl' : 'border-2'
                } ${getCardColor(plan.color)} ${
                  isPopular ? 'shadow-xl glow-accent' : 'shadow-md hover:shadow-xl'
                } bg-card/50 backdrop-blur-sm`}
              >
                <CardHeader className="pb-4 sm:pb-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl sm:text-3xl">{plan.emoji}</span>
                      <Icon
                        className={`w-5 h-5 sm:w-6 sm:h-6 ${getIconColor(plan.color)}`}
                        weight="duotone"
                      />
                    </div>
                    {isCurrentPlan && (
                      <Badge variant="default" className="text-[10px] sm:text-xs bg-primary">
                        Active
                      </Badge>
                    )}
                    {hasLifetimeGold && plan.id === 'gold' && (
                      <Badge
                        variant="default"
                        className="text-[10px] sm:text-xs bg-[#FFD700] text-foreground"
                      >
                        <Infinity className="w-3 h-3 mr-1" weight="bold" />
                        Lifetime
                      </Badge>
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
                      {hasEarlyBirdDiscount && (
                        <span className="text-lg text-muted-foreground line-through mr-1">
                          ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                        </span>
                      )}
                      <span className="text-4xl sm:text-5xl font-bold tracking-tight">
                        ${displayPrice.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                    {hasEarlyBirdDiscount && (
                      <p className="text-[10px] sm:text-xs text-[#FFD700] font-semibold mt-1">
                        Early bird pricing - first 3 months only
                      </p>
                    )}
                    {billingCycle === 'yearly' && !hasEarlyBirdDiscount && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5">
                        ${yearlyTotal} billed yearly
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-5">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={() =>
                        handleUpgrade(
                          plan.id,
                          plan.name,
                          hasEarlyBirdDiscount
                            ? displayPrice
                            : billingCycle === 'monthly'
                              ? plan.monthlyPrice
                              : plan.yearlyTotal
                        )
                      }
                      disabled={isCurrentPlan || (!!hasLifetimeGold && plan.id === 'gold')}
                      className={`w-full min-touch-target text-sm sm:text-base font-semibold rounded-xl transition-all duration-200 ${getButtonStyles(
                        plan.color,
                        isCurrentPlan || (!!hasLifetimeGold && plan.id === 'gold')
                      )}`}
                    >
                      {hasLifetimeGold && plan.id === 'gold'
                        ? 'Lifetime Active'
                        : isCurrentPlan
                          ? 'Current Plan'
                          : plan.cta}
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
                          <Check
                            className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${getIconColor(plan.color)}`}
                            weight="bold"
                          />
                          <span className="text-xs sm:text-sm text-foreground leading-relaxed">
                            {feature}
                          </span>
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
        transition={{ duration: 0.4, delay: 0.6 }}
        className="mt-12 sm:mt-16 max-w-5xl mx-auto"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Optional Add-Ons</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Enhance your FlowSphere experience with these powerful extras
          </p>
        </div>

        <Card className="border-2 border-accent/20 shadow-lg">
          <CardContent className="p-6 sm:p-8 space-y-6">
            {addOns.map((addOn, index) => {
              const Icon = addOn.icon
              const isActive =
                addOn.id === 'extendedMemory'
                  ? tempAddOns.extendedMemory
                  : (tempAddOns[addOn.id as keyof typeof tempAddOns] as number) > 0

              return (
                <motion.div
                  key={addOn.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="border-b border-border/50 last:border-0 pb-6 last:pb-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-accent/10 rounded-lg">
                        <Icon className="w-6 h-6 text-accent" weight="duotone" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base sm:text-lg font-semibold">{addOn.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            ${addOn.price}/mo
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {addOn.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:ml-4">
                      {addOn.quantityLabel ? (
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`addon-${addOn.id}`}
                            className="text-xs sm:text-sm whitespace-nowrap"
                          >
                            {addOn.quantityLabel}:
                          </Label>
                          <Input
                            id={`addon-${addOn.id}`}
                            type="number"
                            min="0"
                            max="10"
                            value={tempAddOns[addOn.id as keyof typeof tempAddOns] as number}
                            onChange={e =>
                              setTempAddOns({
                                ...tempAddOns,
                                [addOn.id]: Math.max(
                                  0,
                                  Math.min(10, parseInt(e.target.value) || 0)
                                ),
                              })
                            }
                            className="w-20 text-center"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`addon-${addOn.id}`}
                            checked={tempAddOns.extendedMemory}
                            onCheckedChange={checked =>
                              setTempAddOns({
                                ...tempAddOns,
                                extendedMemory: checked as boolean,
                              })
                            }
                          />
                          <Label htmlFor={`addon-${addOn.id}`} className="text-sm cursor-pointer">
                            Enable
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}

            <div className="pt-6 border-t border-border/50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Add-Ons Total</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    ${calculateAddOnTotal().toFixed(2)}/month
                  </p>
                  {calculateAddOnTotal() > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Added to your base subscription
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleUpdateAddOns}
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6 py-2.5"
                  disabled={
                    tempAddOns.aiTutor === (activeAddOns?.aiTutor || 0) &&
                    tempAddOns.smartDevicePack === (activeAddOns?.smartDevicePack || 0) &&
                    tempAddOns.extendedMemory === (activeAddOns?.extendedMemory || false)
                  }
                >
                  Update Add-Ons
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
              <div className="flex items-center gap-2">
                <p className="text-base sm:text-lg font-semibold capitalize">{currentPlan}</p>
                {hasLifetimeGold && (
                  <Badge className="bg-[#FFD700] text-foreground text-xs">
                    <Infinity className="w-3 h-3 mr-1" weight="bold" />
                    Lifetime
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Billing Cycle</p>
              <p className="text-base sm:text-lg font-semibold capitalize">{billingCycle}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Next Billing Date</p>
              <p className="text-base sm:text-lg font-semibold">
                {hasLifetimeGold
                  ? 'Never (Lifetime)'
                  : new Date(nextBillingDate || Date.now()).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
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

          {((activeAddOns?.aiTutor || 0) > 0 ||
            (activeAddOns?.smartDevicePack || 0) > 0 ||
            activeAddOns?.extendedMemory) && (
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">Active Add-Ons</p>
              <div className="space-y-2">
                {(activeAddOns?.aiTutor || 0) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-accent" />
                      <span>AI Tutor Module × {activeAddOns?.aiTutor}</span>
                    </div>
                    <span className="font-semibold">
                      ${((activeAddOns?.aiTutor || 0) * 14.99).toFixed(2)}/mo
                    </span>
                  </div>
                )}
                {(activeAddOns?.smartDevicePack || 0) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <DeviceMobile className="w-4 h-4 text-accent" />
                      <span>Smart Device Pack × {activeAddOns?.smartDevicePack}</span>
                    </div>
                    <span className="font-semibold">
                      ${((activeAddOns?.smartDevicePack || 0) * 4.99).toFixed(2)}/mo
                    </span>
                  </div>
                )}
                {activeAddOns?.extendedMemory && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-accent" />
                      <span>Extended Memory & Analytics</span>
                    </div>
                    <span className="font-semibold">$3.99/mo</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border/30 flex items-center justify-between font-semibold">
                  <span>Add-Ons Total</span>
                  <span className="text-accent">${calculateAddOnTotal().toFixed(2)}/mo</span>
                </div>
              </div>
            </div>
          )}

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
        {hasEarlyBirdDiscount && (
          <p className="text-xs sm:text-sm text-[#FFD700] font-semibold mt-2">
            🚀 Early Bird Beta: You're getting 10% off for your first 3 months!
          </p>
        )}
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Need help choosing?{' '}
          <button className="text-accent hover:underline font-medium">Contact our team</button>
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
