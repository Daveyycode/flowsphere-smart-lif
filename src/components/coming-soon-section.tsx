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

interface ComingSoonFeature {
  id: string
  title: string
  description: string
  icon: any
  iconColor: string
  bgColor: string
}

export function ComingSoonSection() {
  const features: ComingSoonFeature[] = [
    {
      id: 'tutor-ai',
      title: 'FlowSphere Tutor AI',
      description: 'Your personal at-home learning companion — ready to teach, quiz, and inspire.',
      icon: Brain,
      iconColor: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    },
    {
      id: 'focus-report',
      title: 'Focus & Attention Report',
      description: 'Track how well your child (or you) stay focused during learning sessions.',
      icon: Eye,
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      id: 'smart-integration',
      title: 'Smart Device Integration',
      description: 'Soon, FlowSphere will connect seamlessly to your smart home and gadgets.',
      icon: Devices,
      iconColor: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      id: 'smart-timer',
      title: 'Smart Remote Timer',
      description: 'Accessible across devices: perfect for focus sessions or shared family time and pep talks.',
      icon: Timer,
      iconColor: 'text-orange-400',
      bgColor: 'bg-orange-500/20'
    },
    {
      id: 'flowai-scheduler',
      title: 'FlowAI Scheduler',
      description: 'Your personal AI that auto-manages your week, syncs events, reminds you gently, and tracks progress.',
      icon: CalendarCheck,
      iconColor: 'text-pink-400',
      bgColor: 'bg-pink-500/20'
    },
    {
      id: 'privacy-first',
      title: 'Privacy-First System',
      description: 'User data stored locally on their device (encrypted within the phone OS), not in FlowSphere\'s cloud.',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20'
    },
    {
      id: 'offline-mode',
      title: 'Offline Mode',
      description: 'Key tools still work without internet, keeping data secure and accessible.',
      icon: WifiSlash,
      iconColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20'
    },
    {
      id: 'tutorbot',
      title: 'FlowSphere TutorBot',
      description: 'Our future home companion — an AI robot that can teach, observe, and adapt.',
      icon: Robot,
      iconColor: 'text-amber-400',
      bgColor: 'bg-amber-500/20'
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/50 overflow-hidden">
        <CardContent className="p-4 sm:p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 glow-accent">
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-accent" weight="fill" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-100 truncate">Coming Soon...</h2>
                <p className="text-xs sm:text-sm text-gray-400">Features under development</p>
              </div>
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            {features.map((feature) => {
              const IconComponent = feature.icon
              return (
                <motion.div
                  key={feature.id}
                  variants={cardVariants}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${feature.bgColor} flex items-center justify-center`}>
                      <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 ${feature.iconColor}`} weight="duotone" />
                    </div>
                  </div>
                  <h4 className="font-semibold mb-1 text-xs sm:text-sm text-gray-100">{feature.title}</h4>
                  <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-3">{feature.description}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </CardContent>
      </Card>
    </div>
  )
}
