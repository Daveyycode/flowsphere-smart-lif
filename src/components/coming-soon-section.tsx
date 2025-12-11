import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, CheckCircle } from '@phosphor-icons/react'
import {
  Brain,
  Eye,
  Devices,
  Timer,
  CalendarCheck,
  ShieldCheck,
  WifiSlash,
  Robot,
  Camera
} from '@phosphor-icons/react'
import { useDeviceType } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ComingSoonFeature {
  id: string
  title: string
  description: string
  icon: any
  iconColor: string
  bgColor: string
  isAvailable?: boolean
  isSoon?: boolean // Feature is being actively developed
  navigateTo?: string
}

interface ComingSoonSectionProps {
  onNavigate?: (tab: string) => void
}

export function ComingSoonSection({ onNavigate }: ComingSoonSectionProps) {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'
  const isTablet = deviceType === 'tablet'

  const features: ComingSoonFeature[] = [
    {
      id: 'smart-timer',
      title: 'Smart Remote Timer',
      description: 'Accessible across devices: perfect for focus sessions or shared family time and pep talks.',
      icon: Timer,
      iconColor: 'text-green-400',
      bgColor: 'bg-green-500/20',
      isAvailable: true,
      navigateTo: 'smart-timer'
    },
    {
      id: 'privacy-first',
      title: 'Privacy-First System',
      description: 'User data stored locally on their device (encrypted within the phone OS), not in FlowSphere\'s cloud.',
      icon: ShieldCheck,
      iconColor: 'text-green-400',
      bgColor: 'bg-green-500/20',
      isAvailable: true,
      navigateTo: 'vault'
    },
    {
      id: 'tutor-ai',
      title: 'FlowSphere Tutor AI',
      description: 'Your personal at-home learning companion — ready to teach, quiz, and inspire.',
      icon: Brain,
      iconColor: 'text-green-400',
      bgColor: 'bg-green-500/20',
      isAvailable: true,
      navigateTo: 'tutor-ai'
    },
    {
      id: 'study-monitor',
      title: 'AI Study Monitor',
      description: 'Camera-powered focus tracking — alerts parents when kids get distracted.',
      icon: Camera,
      iconColor: 'text-green-400',
      bgColor: 'bg-green-500/20',
      isAvailable: true,
      navigateTo: 'study-monitor'
    },
    {
      id: 'focus-report',
      title: 'Focus & Attention Report',
      description: 'Track how well your child (or you) stay focused during learning sessions.',
      icon: Eye,
      iconColor: 'text-green-400',
      bgColor: 'bg-green-500/20',
      isAvailable: true,
      navigateTo: 'focus-report'
    },
    {
      id: 'smart-integration',
      title: 'Smart Device Integration',
      description: 'Connect to Google Home, Alexa & smart devices. Control lights, thermostats & more.',
      icon: Devices,
      iconColor: 'text-green-400',
      bgColor: 'bg-green-500/20',
      isAvailable: true,
      navigateTo: 'smart-devices'
    },
    {
      id: 'flowai-scheduler',
      title: 'FlowAI Scheduler',
      description: 'AI auto-manages your week — syncs with Google Calendar, suggests optimal times & tracks progress.',
      icon: CalendarCheck,
      iconColor: 'text-green-400',
      bgColor: 'bg-green-500/20',
      isAvailable: true,
      navigateTo: 'scheduler'
    },
    {
      id: 'offline-mode',
      title: 'Offline Mode',
      description: 'Essential tools work without internet. Data syncs automatically when back online.',
      icon: WifiSlash,
      iconColor: 'text-green-400',
      bgColor: 'bg-green-500/20',
      isAvailable: true
    },
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

  const handleFeatureClick = (feature: ComingSoonFeature) => {
    if (feature.isAvailable && feature.navigateTo && onNavigate) {
      onNavigate(feature.navigateTo)
      toast.success(`Opening ${feature.title}`)
    } else if (feature.isAvailable && feature.navigateTo) {
      toast.success(
        `${feature.title} is available!`,
        {
          description: 'Navigate from the dashboard or settings to access this feature.',
          duration: 4000
        }
      )
    } else if (feature.isSoon) {
      toast.info(
        `${feature.title}`,
        {
          description: `${feature.description} This feature is being actively developed and will be available very soon!`,
          duration: 5000,
          icon: '🚀'
        }
      )
    } else {
      toast.info(
        `${feature.title}`,
        {
          description: `${feature.description} This feature is planned for future release.`,
          duration: 5000
        }
      )
    }
  }

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
                <motion.button
                  key={feature.id}
                  variants={cardVariants}
                  onClick={() => handleFeatureClick(feature)}
                  className={cn(
                    "backdrop-blur-sm rounded-xl border transition-all cursor-pointer hover:scale-105 active:scale-95 text-left w-full relative",
                    feature.isAvailable
                      ? "bg-green-900/20 border-green-600/40 hover:border-green-500/60"
                      : feature.isSoon
                        ? "bg-yellow-900/20 border-yellow-600/40 hover:border-yellow-500/60"
                        : "bg-gray-700/30 border-gray-600/40 hover:border-gray-500/50",
                    isMobile ? "p-3" : "p-4"
                  )}
                >
                  {feature.isAvailable && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="w-5 h-5 text-green-500" weight="fill" />
                    </div>
                  )}
                  {feature.isSoon && !feature.isAvailable && (
                    <div className="absolute top-2 right-2">
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-yellow-500 text-yellow-900 rounded">SOON</span>
                    </div>
                  )}
                  <div className={cn("flex items-start justify-between", isMobile ? "mb-2" : "mb-3")}>
                    <div className={cn("rounded-lg flex items-center justify-center", feature.bgColor, isMobile ? "w-8 h-8" : "w-10 h-10")}>
                      <IconComponent className={cn(feature.iconColor, isMobile ? "w-4 h-4" : "w-5 h-5")} weight="duotone" />
                    </div>
                  </div>
                  <h4 className={cn(
                    "font-semibold mb-1",
                    feature.isAvailable ? "text-green-100" : feature.isSoon ? "text-yellow-100" : "text-gray-100",
                    isMobile ? "text-xs" : "text-sm"
                  )}>{feature.title}</h4>
                  <p className={cn(
                    "line-clamp-3",
                    feature.isAvailable ? "text-green-300/70" : feature.isSoon ? "text-yellow-300/70" : "text-gray-400",
                    isMobile ? "text-[10px]" : "text-xs"
                  )}>
                    {feature.description}
                  </p>
                  {feature.isAvailable && (
                    <p className={cn("mt-1 text-green-400 font-medium", isMobile ? "text-[9px]" : "text-[10px]")}>
                      Tap to open
                    </p>
                  )}
                  {feature.isSoon && !feature.isAvailable && (
                    <p className={cn("mt-1 text-yellow-400 font-medium", isMobile ? "text-[9px]" : "text-[10px]")}>
                      Coming very soon
                    </p>
                  )}
                </motion.button>
              )
            })}
          </motion.div>
        </CardContent>
      </Card>
    </div>
  )
}
