import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Check, Star } from '@phosphor-icons/react'

interface PricingSectionProps {
  onGetStarted?: () => void
}

interface PricingPlan {
  name: string
  monthlyPrice: number
  yearlyPrice: number
  description: string
  features: string[]
  cta: string
  color: 'gray' | 'blue' | 'gold' | 'purple'
  isPopular?: boolean
  icon: string
}

export function PricingSection({ onGetStarted }: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false)

  const plans: PricingPlan[] = [
    {
      name: 'Basic',
      monthlyPrice: 14.99,
      yearlyPrice: 13.49,
      description: 'First-time users',
      features: ['Email sorting', 'Daily prayers', 'Basic scheduler', 'Limited AI usage'],
      cta: 'Get Started',
      color: 'gray',
      icon: '🩶',
    },
    {
      name: 'Pro',
      monthlyPrice: 24.99,
      yearlyPrice: 22.49,
      description: 'Busy individuals',
      features: [
        'Everything in Basic',
        'Traffic alerts',
        'Learning scheduler',
        'AI automation',
        'Unlimited AI usage',
      ],
      cta: 'Upgrade to Pro',
      color: 'blue',
      icon: '🩵',
    },
    {
      name: 'Gold',
      monthlyPrice: 49.99,
      yearlyPrice: 44.99,
      description: 'Professionals / Smart-home users',
      features: [
        'Everything in Pro',
        'Full automation',
        'Family dashboard',
        'Voice control',
        'Advanced analytics',
      ],
      cta: 'Go Gold',
      color: 'gold',
      isPopular: true,
      icon: '💛',
    },
    {
      name: 'Family / Team',
      monthlyPrice: 99.99,
      yearlyPrice: 89.99,
      description: 'Households / small orgs',
      features: [
        'Everything in Gold',
        'Multi-account (up to 5 users)',
        'Tutor AI',
        'Complete home integration',
        'Team management & concierge support',
      ],
      cta: 'Get Family Plan',
      color: 'purple',
      icon: '💎',
    },
  ]

  const getColorClasses = (color: string, isPopular?: boolean) => {
    const baseClasses = {
      gray: {
        border: 'border-gray-300',
        gradient: 'from-gray-50 to-gray-100',
        button: 'bg-gray-700 hover:bg-gray-800 text-white',
        badge: 'bg-gray-100 text-gray-700',
        glow: '',
      },
      blue: {
        border: 'border-blue-300',
        gradient: 'from-blue-50 to-blue-100',
        button: 'bg-blue-600 hover:bg-blue-700 text-white',
        badge: 'bg-blue-100 text-blue-700',
        glow: '',
      },
      gold: {
        border: 'border-yellow-400',
        gradient: 'from-yellow-50 to-yellow-100',
        button:
          'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white',
        badge: 'bg-yellow-100 text-yellow-800',
        glow: 'shadow-[0_0_30px_-10px_rgba(234,179,8,0.8)]',
      },
      purple: {
        border: 'border-purple-400',
        gradient: 'from-purple-50 to-purple-100',
        button: 'bg-purple-600 hover:bg-purple-700 text-white',
        badge: 'bg-purple-100 text-purple-700',
        glow: '',
      },
    }

    return baseClasses[color as keyof typeof baseClasses]
  }

  return (
    <section className="w-full py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-12"
        >
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8">
            Choose your plan — switch to yearly billing and save 10%!
          </p>

          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <span
              className={`text-sm sm:text-base font-medium transition-colors ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              Monthly
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-primary"
            />
            <span
              className={`text-sm sm:text-base font-medium transition-colors ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              Yearly
            </span>
            <span className="text-xs sm:text-sm bg-green-100 text-green-700 px-2 sm:px-3 py-1 rounded-full font-semibold">
              Save 10%
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {plans.map((plan, index) => {
            const colors = getColorClasses(plan.color, plan.isPopular)
            const displayPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice
            const billingText = isYearly ? '/month' : '/month'
            const yearlyTotal = (plan.yearlyPrice * 12).toFixed(2)

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <Card
                  className={`relative p-5 sm:p-6 h-full flex flex-col border-2 transition-all duration-300 hover:scale-105 bg-gradient-to-br ${colors.gradient} ${colors.border} ${plan.isPopular ? colors.glow : ''}`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1 shadow-lg">
                      <Star weight="fill" className="w-3 h-3 sm:w-4 sm:h-4" />
                      Most Popular
                    </div>
                  )}

                  {isYearly && (
                    <div className="absolute top-3 right-3 bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold">
                      Save 10%
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <span className="text-2xl sm:text-3xl">{plan.icon}</span>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground font-heading">
                      {plan.name}
                    </h3>
                  </div>

                  <div className="mb-3 sm:mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
                        ${displayPrice}
                      </span>
                      <span className="text-sm sm:text-base text-muted-foreground">
                        {billingText}
                      </span>
                    </div>
                    {isYearly && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        ${yearlyTotal} billed yearly
                      </p>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                    {plan.description}
                  </p>

                  <ul className="space-y-2 sm:space-y-3 mb-5 sm:mb-6 flex-1">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check
                          weight="bold"
                          className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5"
                        />
                        <span className="text-xs sm:text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={onGetStarted}
                    className={`w-full text-sm sm:text-base py-4 sm:py-6 rounded-lg font-semibold transition-all duration-300 hover:scale-105 ${colors.button}`}
                  >
                    {plan.cta}
                  </Button>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
