import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Lock, Crown, DiamondsFour, Users } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SubscriptionTier } from '@/lib/subscription-utils'

interface SubscriptionGateProps {
  children: ReactNode
  requiredTier: 'basic' | 'pro' | 'gold' | 'family'
  currentTier: SubscriptionTier
  featureName: string
  onUpgrade: () => void
}

const tierInfo = {
  basic: {
    name: 'Basic',
    icon: Lock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    emoji: '🩶'
  },
  pro: {
    name: 'Pro',
    icon: Crown,
    color: 'text-blue-mid',
    bgColor: 'bg-blue-mid/10',
    emoji: '🩵'
  },
  gold: {
    name: 'Gold',
    icon: DiamondsFour,
    color: 'text-[#FFB700]',
    bgColor: 'bg-[#FFB700]/10',
    emoji: '💛'
  },
  family: {
    name: 'Family',
    icon: Users,
    color: 'text-[#7B61FF]',
    bgColor: 'bg-[#7B61FF]/10',
    emoji: '💎'
  }
}

const tierLevel = {
  trial: 0,
  basic: 1,
  pro: 2,
  gold: 3,
  family: 4
}

export function SubscriptionGate({
  children,
  requiredTier,
  currentTier,
  featureName,
  onUpgrade
}: SubscriptionGateProps) {
  const hasAccess = tierLevel[currentTier] >= tierLevel[requiredTier]

  if (hasAccess) {
    return <>{children}</>
  }

  const info = tierInfo[requiredTier]
  const Icon = info.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`border-2 ${info.bgColor} border-dashed relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-background/50 to-background/80 backdrop-blur-[2px]" />
        <CardContent className="relative py-12 px-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className={`w-16 h-16 rounded-full ${info.bgColor} flex items-center justify-center`}>
              <Icon className={`w-8 h-8 ${info.color}`} weight="duotone" />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Badge className={`${info.bgColor} ${info.color} border-0 text-sm`}>
                <span className="mr-1">{info.emoji}</span>
                {info.name} Required
              </Badge>
            </div>
            <h3 className="text-xl font-bold">
              {featureName}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              This feature is available for {info.name} plan subscribers and above.
              {currentTier === 'trial' && ' Your trial includes limited access.'}
            </p>
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={onUpgrade}
              size="lg"
              className={`gap-2 ${
                requiredTier === 'gold'
                  ? 'bg-gradient-to-r from-[#FFD700] to-[#FFB700] hover:from-[#FFB700] hover:to-[#FF9500] text-foreground'
                  : requiredTier === 'family'
                  ? 'bg-[#7B61FF] hover:bg-[#6B51EF] text-white'
                  : requiredTier === 'pro'
                  ? 'bg-blue-mid hover:bg-blue-deep text-white'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              <Icon className="w-5 h-5" weight="bold" />
              Upgrade to {info.name}
            </Button>
          </motion.div>

          {currentTier === 'trial' && (
            <p className="text-xs text-muted-foreground">
              Unlock this feature after your trial by choosing a plan
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
