import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Lock } from '@phosphor-icons/react'
import { 
  Brain, 
  Eye, 
  Devices, 
  Timer, 
  CalendarCheck, 
  ShieldCheck, 
  WifiSlash,
  Robot
} from '@phosphor-icons/react'
import { useDeviceType } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface ComingSoonFeature {
  id: string
  title: string
  description: string
  icon: any
  iconColor: string
  bgColor: string
}

export function ComingSoonSection() {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'
  const isTablet = deviceType === 'tablet'
  
  const features: ComingSoonFeature[] = [
    {
      id: 'tutor-ai',
      title: 'FlowSphere Tutor AI',
      description: 'Your personal at-home learning companion — ready to teach, quiz, and inspire.',
      icon: Brain,
      iconColor: 'text-gray-400',
      bgColor: 'bg-gray-500/20'
    },
    {
      id: 'focus-report',
      title: 'Focus & Attention Report',
      description: 'Track how well your child (or you) stay focused during learning sessions.',
      icon: Eye,
      iconColor: 'text-gray-400',
      bgColor: 'bg-gray-500/20'
    },
    {
      id: 'smart-integration',
      title: 'Smart Device Integration',
      description: 'Soon, FlowSphere will connect seamlessly to your smart home and gadgets.',
      icon: Devices,
      iconColor: 'text-gray-400',
      bgColor: 'bg-gray-500/20'
    },
    {
      id: 'smart-timer',
      title: 'Smart Remote Timer',
      description: 'Accessible across devices: perfect for focus sessions or shared family time and pep talks.',
      icon: Timer,
      iconColor: 'text-gray-400',
      bgColor: 'bg-gray-500/20'
    },
    {
      id: 'flowai-scheduler',
      title: 'FlowAI Scheduler',
      description: 'Your personal AI that auto-manages your week, syncs events, reminds you gently, and tracks progress.',
      icon: CalendarCheck,
      iconColor: 'text-gray-400',
      bgColor: 'bg-gray-500/20'
    },
    {
      id: 'privacy-first',
      title: 'Privacy-First System',
      description: 'User data stored locally on their device (encrypted within the phone OS), not in FlowSphere\'s cloud.',
      icon: ShieldCheck,
      iconColor: 'text-gray-400',
      bgColor: 'bg-gray-500/20'
    },
    {
      id: 'offline-mode',
      title: 'Offline Mode',
      description: 'Key tools still work without internet, keeping data secure and accessible.',
      icon: WifiSlash,
      iconColor: 'text-gray-400',
      bgColor: 'bg-gray-500/20'
    },
    {
      id: 'tutorbot',
      title: 'FlowSphere TutorBot',
      description: 'Our future home companion — an AI robot that can teach, observe, and adapt.',
      icon: Robot,
      iconColor: 'text-gray-400',
      bgColor: 'bg-gray-500/20'
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4
      }
    }
  }

  const gridCols = isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-3' : 'grid-cols-4'
  const cardPadding = isMobile ? 'p-4' : isTablet ? 'p-5' : 'p-6'

  return (
    <div className={cn(isMobile ? "space-y-4" : "space-y-6")}>
      <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/50 overflow-hidden">
        <CardContent className={cardPadding}>
          <div className={cn("flex items-center justify-between", isMobile ? "mb-4" : "mb-4")}>
            <div className={cn("flex items-center min-w-0", isMobile ? "space-x-2" : "space-x-3")}>
              <div className={cn("rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0", isMobile ? "w-10 h-10" : "w-12 h-12")} style={{ boxShadow: '0 0 20px -5px rgba(234, 179, 8, 0.4)' }}>
                <Lock className={cn("text-yellow-500", isMobile ? "w-5 h-5" : "w-6 h-6")} weight="fill" />
              </div>
              <div className="min-w-0">
                <h2 className={cn("font-bold text-gray-100", isMobile ? "text-xl" : "text-2xl")}>Coming Soon...</h2>
                <p className={cn("text-gray-400", isMobile ? "text-xs" : "text-sm")}>Features under development</p>
              </div>
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={cn("grid gap-3", gridCols, isMobile && "gap-3", isTablet && "gap-4")}
          >
            {features.map((feature) => {
              const IconComponent = feature.icon
              return (
                <motion.div
                  key={feature.id}
                  variants={cardVariants}
                  className={cn("bg-gray-700/30 backdrop-blur-sm rounded-xl border border-gray-600/40 hover:border-gray-500/50 transition-colors", isMobile ? "p-3" : "p-4")}
                >
                  <div className={cn("flex items-start justify-between", isMobile ? "mb-2" : "mb-3")}>
                    <div className={cn("rounded-lg flex items-center justify-center", feature.bgColor, isMobile ? "w-8 h-8" : "w-10 h-10")}>
                      <IconComponent className={cn(feature.iconColor, isMobile ? "w-4 h-4" : "w-5 h-5")} weight="duotone" />
                    </div>
                  </div>
                  <h4 className={cn("font-semibold mb-1 text-gray-100", isMobile ? "text-xs" : "text-sm")}>{feature.title}</h4>
                  <p className={cn("text-gray-400 line-clamp-3", isMobile ? "text-[10px]" : "text-xs")}>{feature.description}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </CardContent>
      </Card>
    </div>
  )
}
