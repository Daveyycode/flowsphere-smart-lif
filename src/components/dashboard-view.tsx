import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Thermometer, Lock, Eye, Lightning, TrendUp, Users as UsersIcon, House, Camera, CalendarBlank, Cloud, MapTrifold, Notebook, Plus, PencilSimple, BookOpen, Play, Pause, ArrowClockwise } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmergencyDialog } from '@/components/emergency-dialog'
import { ComingSoonSection } from '@/components/coming-soon-section'
import { useKV } from '@github/spark/hooks'
import { DeviceInfo } from '@/hooks/use-mobile'
import { getResponsiveSize, getResponsiveLayout, getTouchTargetSize } from '@/lib/responsive-utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BibleVerse {
  reference: string
  text: string
}

const bibleVerses: BibleVerse[] = [
  {
    reference: 'Philippians 4:6-7',
    text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.'
  },
  {
    reference: 'Psalm 46:1',
    text: 'God is our refuge and strength, an ever-present help in trouble.'
  },
  {
    reference: 'Jeremiah 29:11',
    text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.'
  },
  {
    reference: 'Isaiah 41:10',
    text: 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.'
  },
  {
    reference: 'Proverbs 3:5-6',
    text: 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.'
  },
  {
    reference: 'Matthew 11:28',
    text: 'Come to me, all you who are weary and burdened, and I will give you rest.'
  },
  {
    reference: 'Romans 8:28',
    text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.'
  },
  {
    reference: 'Joshua 1:9',
    text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.'
  },
  {
    reference: 'Psalm 23:1-4',
    text: 'The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul. He guides me along the right paths for his name\'s sake. Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.'
  },
  {
    reference: '2 Corinthians 12:9',
    text: 'But he said to me, "My grace is sufficient for you, for my power is made perfect in weakness." Therefore I will boast all the more gladly about my weaknesses, so that Christ\'s power may rest on me.'
  }
]

interface QuickAccessBox {
  id: string
  label: string
  description: string
  icon: any
  color: string
  action?: string
}

interface DashboardViewProps {
  stats: {
    activeDevices: number
    totalDevices: number
    familyMembers: number
    automations: number
  }
  recentActivity: Array<{
    id: string
    type: string
    message: string
    time: string
  }>
  onTabChange?: (tab: 'dashboard' | 'devices' | 'family' | 'notifications' | 'settings' | 'subscription' | 'terms' | 'privacy' | 'resources' | 'meeting-notes' | 'permissions' | 'traffic' | 'ai-voice') => void
  deviceInfo: DeviceInfo
}

export function DashboardView({ stats, recentActivity, onTabChange, deviceInfo }: DashboardViewProps) {
  const layout = getResponsiveLayout(deviceInfo.type)
  const { isMobile, isTablet, isTouch } = layout
  
  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const availableBoxes: QuickAccessBox[] = [
    { id: 'weather', label: 'Weather', description: 'Local forecast', icon: Cloud, color: 'blue-mid', action: 'dashboard' },
    { id: 'emergency', label: 'Emergency Hotlines', description: 'Quick access hotlines', icon: Lightning, color: 'destructive', action: 'emergency' },
    { id: 'meeting-notes', label: 'Meeting Notes', description: 'Voice transcription', icon: Notebook, color: 'accent', action: 'meeting-notes' },
    { id: 'traffic', label: 'Traffic Update', description: 'Real-time conditions', icon: MapTrifold, color: 'mint', action: 'traffic' },
    { id: 'locks', label: 'Lock All Doors', description: 'Quick security', icon: Lock, color: 'blue-deep', action: 'devices' },
    { id: 'family', label: 'Family Safety', description: 'Track loved ones', icon: UsersIcon, color: 'coral', action: 'family' }
  ]

  const [quickAccessBoxes, setQuickAccessBoxes] = useKV<string[]>('flowsphere-quick-access', ['emergency', 'meeting-notes', 'traffic', 'locks', 'family'])
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false)

  const handleBoxClick = (box: QuickAccessBox) => {
    if (box.id === 'emergency') {
      setShowEmergencyDialog(true)
    } else if (box.action) {
      onTabChange?.(box.action as any)
    }
  }

  const toggleBox = (boxId: string) => {
    setQuickAccessBoxes((current) => {
      const currentBoxes = current || ['weather', 'emergency', 'meeting-notes', 'traffic', 'locks', 'family']

      if (currentBoxes.includes(boxId)) {
        if (currentBoxes.length <= 3) {
          toast.error('You must have at least 3 boxes')
          return currentBoxes
        }
        return currentBoxes.filter(id => id !== boxId)
      } else {
        if (currentBoxes.length >= 6) {
          toast.error('You can only have up to 6 boxes')
          return currentBoxes
        }
        return [...currentBoxes, boxId]
      }
    })
  }

  const selectedBoxes = availableBoxes.filter(box =>
    (quickAccessBoxes || ['weather', 'emergency', 'meeting-notes', 'traffic', 'locks', 'family']).includes(box.id)
  )

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string, border: string, text: string, hover: string }> = {
      'blue-mid': {
        bg: 'bg-blue-mid/10',
        hover: 'hover:bg-blue-mid/20',
        border: 'border-blue-mid/30',
        text: 'text-blue-mid'
      },
      'accent': {
        bg: 'bg-accent/10',
        hover: 'hover:bg-accent/20',
        border: 'border-accent/30',
        text: 'text-accent'
      },
      'mint': {
        bg: 'bg-mint/10',
        hover: 'hover:bg-mint/20',
        border: 'border-mint/30',
        text: 'text-mint'
      },
      'blue-deep': {
        bg: 'bg-blue-deep/10',
        hover: 'hover:bg-blue-deep/20',
        border: 'border-blue-deep/30',
        text: 'text-blue-deep'
      },
      'coral': {
        bg: 'bg-coral/10',
        hover: 'hover:bg-coral/20',
        border: 'border-coral/30',
        text: 'text-coral'
      },
      'primary': {
        bg: 'bg-primary/10',
        hover: 'hover:bg-primary/20',
        border: 'border-primary/30',
        text: 'text-primary'
      },
      'destructive': {
        bg: 'bg-destructive/10',
        hover: 'hover:bg-destructive/20',
        border: 'border-destructive/30',
        text: 'text-destructive'
      }
    }
    return colorMap[color] || colorMap['accent']
  }

  const statCards = [
    {
      title: 'Active Devices',
      value: stats.activeDevices,
      total: stats.totalDevices,
      icon: Lightbulb,
      color: 'mint',
      trend: '+12%',
      onClick: () => onTabChange?.('devices')
    },
    {
      title: 'Family Members',
      value: stats.familyMembers,
      icon: UsersIcon,
      color: 'coral',
      trend: 'All safe',
      onClick: () => onTabChange?.('family')
    },
    {
      title: 'Automations',
      value: stats.automations,
      icon: Lightning,
      color: 'accent',
      trend: '3 active',
      onClick: () => onTabChange?.('devices')
    },
    {
      title: 'Energy Usage',
      value: 87,
      unit: '%',
      icon: TrendUp,
      color: 'primary',
      trend: '-5% vs yesterday',
      onClick: () => onTabChange?.('devices')
    }
  ]

  const [currentVerse, setCurrentVerse] = useState<BibleVerse | null>(null)
  const [isReading, setIsReading] = useState(false)

  const getRandomVerse = () => {
    const randomIndex = Math.floor(Math.random() * bibleVerses.length)
    return bibleVerses[randomIndex]
  }

  const handleStartReading = () => {
    const verse = getRandomVerse()
    setCurrentVerse(verse)
    setIsReading(true)
    
    const utterance = new SpeechSynthesisUtterance(`${verse.reference}. ${verse.text}`)
    utterance.rate = 0.85
    utterance.pitch = 1
    utterance.volume = 1
    
    utterance.onend = () => {
      setIsReading(false)
      toast.success('May God\'s word bless your day')
    }
    
    utterance.onerror = () => {
      setIsReading(false)
      toast.error('Unable to read aloud. Please check your device settings.')
    }
    
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const handleStopReading = () => {
    window.speechSynthesis.cancel()
    setIsReading(false)
  }

  const handleNewVerse = () => {
    if (isReading) {
      handleStopReading()
    }
    const verse = getRandomVerse()
    setCurrentVerse(verse)
  }

  // Use responsive utilities
  const cardGridCols = getResponsiveSize(deviceInfo.type, 'grid', '4')
  const quickAccessCols = isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-3' : 'grid-cols-3'
  const iconSize = getResponsiveSize(deviceInfo.type, 'icon', 'md')
  const cardPadding = getResponsiveSize(deviceInfo.type, 'spacing', 'md')
  const textBase = getResponsiveSize(deviceInfo.type, 'text', 'base')
  const textSm = getResponsiveSize(deviceInfo.type, 'text', 'sm')
  const textLg = getResponsiveSize(deviceInfo.type, 'text', 'lg')
  const textXl = getResponsiveSize(deviceInfo.type, 'text', 'xl')
  const gapMd = getResponsiveSize(deviceInfo.type, 'gap', 'md')
  const gapSm = getResponsiveSize(deviceInfo.type, 'gap', 'sm')
  const touchTarget = getTouchTargetSize(deviceInfo.type)

  return (
    <div className={cn("space-y-3 pb-4", isMobile && "space-y-2.5", isTablet && "space-y-3")}>
      {/* Greeting moved to morning brief card - removed duplicate */}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className={cn("bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20", isMobile ? "p-3" : "p-4")}>
          <div className={cn("flex flex-col items-center text-center", isMobile ? "space-y-2.5" : "space-y-3")}>
            <div className={cn("rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center", isMobile ? "w-8 h-8" : "w-9 h-9")}>
              <BookOpen className={cn("text-white", isMobile ? "w-4 h-4" : "w-4.5 h-4.5")} weight="fill" />
            </div>

            {!currentVerse ? (
              <>
                <div>
                  <h2 className={cn("font-semibold mb-1.5 font-heading", isMobile ? "text-base" : isTablet ? "text-lg" : "text-xl")}>
                    Word of God
                  </h2>
                  <p className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>
                    Would you like to hear God's word today?
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={handleStartReading}
                  className="min-touch-target bg-primary hover:bg-primary/90"
                >
                  <Play className="w-4 h-4 mr-2" weight="fill" />
                  Start Reading
                </Button>
              </>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentVerse.reference}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn("w-full", isMobile ? "space-y-3" : "space-y-4")}
                >
                  <div>
                    <p className={cn("font-semibold text-primary mb-2", isMobile ? "text-[10px]" : "text-xs")}>
                      {currentVerse.reference}
                    </p>
                    <p className={cn("text-foreground leading-tight", isMobile ? "text-xs" : "text-sm")}>
                      {currentVerse.text}
                    </p>
                  </div>

                  <div className={cn("flex flex-wrap justify-center", isMobile ? "gap-1.5" : "gap-2")}>
                    {isReading ? (
                      <Button
                        variant="destructive"
                        onClick={handleStopReading}
                        size="sm"
                        className="min-touch-target"
                      >
                        <Pause className="w-4 h-4 mr-2" weight="fill" />
                        Stop
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStartReading}
                        size="sm"
                        className="min-touch-target"
                      >
                        <Play className="w-4 h-4 mr-2" weight="fill" />
                        Read Aloud
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={handleNewVerse}
                      size="sm"
                      className="min-touch-target"
                    >
                      <ArrowClockwise className="w-4 h-4 mr-2" />
                      New Verse
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </Card>
      </motion.div>

      <div className={cn("grid gap-2 sm:gap-3", cardGridCols)}>
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card
                className="border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg cursor-pointer"
                onClick={stat.onClick}
              >
                <CardContent className={cn(isMobile ? "p-2.5" : "p-3")}>
                  <div className={cn("flex items-start justify-between", isMobile ? "mb-2" : "mb-2.5")}>
                    <div className={cn("rounded-xl bg-${stat.color}/10 flex items-center justify-center", isMobile ? "w-7 h-7" : "w-8 h-8")}>
                      <Icon className={cn(`text-${stat.color}`, isMobile ? "w-3.5 h-3.5" : "w-4 h-4")} weight="duotone" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {stat.trend}
                    </Badge>
                  </div>
                  <h3 className={cn("font-medium text-muted-foreground mb-1", isMobile ? "text-[10px]" : "text-xs")}>
                    {stat.title}
                  </h3>
                  <div className={cn("flex items-baseline", isMobile ? "space-x-1" : "space-x-1.5")}>
                    <p className={cn("font-bold", isMobile ? "text-lg" : "text-xl")}>
                      {stat.value}
                    </p>
                    {stat.total && (
                      <span className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>/ {stat.total}</span>
                    )}
                    {stat.unit && (
                      <span className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>{stat.unit}</span>
                    )}
                  </div>
                  {stat.total && (
                    <Progress
                      value={(stat.value / stat.total) * 100}
                      className={cn("h-1", isMobile ? "mt-1.5" : "mt-2")}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Quick Access - Full Width */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border-blue-mid/20 bg-gradient-to-br from-blue-light/10 via-blue-mid/5 to-transparent">
          <CardHeader className={cn(isMobile ? "pb-1.5 pt-2.5 px-3" : "pb-2 pt-3 px-4")}>
            <div className="flex items-center justify-between">
              <CardTitle className={cn("flex items-center space-x-1.5", isMobile ? "text-sm" : "text-base")}>
                <House className={cn(isMobile ? "w-3.5 h-3.5" : "w-4 h-4")} weight="duotone" />
                <span>Quick Access</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 min-touch-target"
                onClick={() => setIsCustomizing(true)}
              >
                <PencilSimple className="w-3 h-3" weight="duotone" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className={cn("grid pt-0 px-3 pb-3", isMobile ? "gap-2" : "gap-2.5", quickAccessCols)}>
            {selectedBoxes.map((box, index) => {
              const Icon = box.icon
              const colors = getColorClasses(box.color)
              return (
                <motion.button
                  key={box.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleBoxClick(box)}
                  className={cn(
                    `rounded-lg ${colors.bg} ${colors.hover} border ${colors.border} transition-all duration-200 hover:scale-105 active:scale-95 group min-touch-target`,
                    isMobile ? "p-2" : "p-2.5"
                  )}
                >
                  <Icon className={cn(`${colors.text} mb-1 group-hover:scale-110 transition-transform`, isMobile ? "w-4 h-4" : "w-4.5 h-4.5")} weight="duotone" />
                  <p className={cn("font-medium leading-tight", isMobile ? "text-[10px]" : "text-[11px]")}>{box.label}</p>
                  <p className={cn("text-muted-foreground mt-0.5", isMobile ? "text-[8px]" : "text-[9px]")}>{box.description}</p>
                </motion.button>
              )
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity - Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader className={cn(isMobile ? "pb-2 pt-3 px-3" : "pb-2.5 pt-4 px-4")}>
            <CardTitle className={isMobile ? "text-sm" : "text-base"}>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className={cn(isMobile ? "px-3 pb-3" : "px-4 pb-4")}>
            <div className={cn(isMobile ? "space-y-2" : "space-y-2.5")}>
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                  className={cn("flex items-start pb-3 border-b border-border/50 last:border-0 last:pb-0", isMobile ? "space-x-2" : "space-x-3")}
                >
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium truncate", isMobile ? "text-xs" : "text-sm")}>{activity.message}</p>
                    <p className={cn("text-muted-foreground", isMobile ? "text-[10px] mt-0.5" : "text-xs mt-1")}>{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-coral/10 relative overflow-hidden hover:shadow-lg transition-all">
          <div className="absolute inset-0 opacity-5" />
          <CardContent className={cn("relative", isMobile ? "p-3" : "p-4")}>
            <div className={cn("flex items-start", isMobile ? "space-x-2.5" : "space-x-3")}>
              <div className={cn("rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0", isMobile ? "w-7 h-7" : "w-8 h-8")}>
                <BookOpen className={cn("text-white", isMobile ? "w-3.5 h-3.5" : "w-4 h-4")} weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn("font-semibold mb-1", isMobile ? "text-sm" : "text-base")}>Daily Blessing</h3>
                <p className={cn("text-muted-foreground mb-1.5", isMobile ? "text-[11px]" : "text-xs")}>
                  "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you." - Numbers 6:24-25
                </p>
                <p className={cn("text-muted-foreground mb-1.5", isMobile ? "text-[11px]" : "text-xs")}>
                  Remember: Your faithfulness and love for others reflects God's light in this world. Every small act of kindness matters.
                </p>
                <button
                  onClick={() => {
                    const scriptures = [
                      "Psalm 23:1 - The Lord is my shepherd; I shall not want.",
                      "Proverbs 3:5-6 - Trust in the Lord with all your heart and lean not on your own understanding.",
                      "Philippians 4:13 - I can do all things through Christ who strengthens me.",
                      "Romans 8:28 - And we know that in all things God works for the good of those who love him.",
                      "Isaiah 41:10 - Fear not, for I am with you; be not dismayed, for I am your God.",
                      "Matthew 11:28 - Come to me, all you who are weary and burdened, and I will give you rest."
                    ]
                    const randomScripture = scriptures[Math.floor(Math.random() * scriptures.length)]
                    toast.success('Daily Scripture', {
                      description: randomScripture,
                      duration: 8000
                    })
                  }}
                  className={cn("font-medium text-primary hover:underline cursor-pointer", isMobile ? "text-xs" : "text-sm")}
                >
                  Read more scripture →
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <ComingSoonSection />
      </motion.div>

      <Dialog open={isCustomizing} onOpenChange={setIsCustomizing}>
        <DialogContent className={cn(isMobile ? "max-w-[95vw]" : "max-w-md")}>
          <DialogHeader>
            <DialogTitle className={isMobile ? "text-base" : "text-lg"}>Customize Quick Access</DialogTitle>
          </DialogHeader>
          <div className={cn(isMobile ? "space-y-3 pt-3" : "space-y-4 pt-4")}>
            <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
              Select 3-6 shortcuts to display on your dashboard
            </p>
            <div className="space-y-2">
              {availableBoxes.map((box) => {
                const Icon = box.icon
                const isSelected = (quickAccessBoxes || ['emergency', 'meeting-notes', 'traffic', 'locks', 'family']).includes(box.id)
                const colors = getColorClasses(box.color)
                
                return (
                  <button
                    key={box.id}
                    onClick={() => toggleBox(box.id)}
                    className={cn(
                      "w-full flex items-center rounded-lg border-2 transition-all min-touch-target",
                      isMobile ? "gap-2 p-2" : "gap-3 p-3",
                      isSelected
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent/50'
                    )}
                  >
                    <div className={cn("rounded-lg flex items-center justify-center flex-shrink-0", colors.bg, isMobile ? "w-8 h-8" : "w-10 h-10")}>
                      <Icon className={cn(colors.text, isMobile ? "w-4 h-4" : "w-5 h-5")} weight="duotone" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>{box.label}</p>
                      <p className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>{box.description}</p>
                    </div>
                    {isSelected && (
                      <Badge variant="secondary" className={cn("bg-mint/20 text-mint", isMobile ? "text-[10px]" : "text-xs")}>
                        Selected
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
            <Button
              onClick={() => setIsCustomizing(false)}
              className="w-full bg-accent hover:bg-accent/90 min-touch-target"
              size={isMobile ? "default" : "lg"}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EmergencyDialog 
        isOpen={showEmergencyDialog}
        onClose={() => setShowEmergencyDialog(false)}
      />
    </div>
  )
}
