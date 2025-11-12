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
import { useDeviceType } from '@/hooks/use-mobile'
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
}

export function DashboardView({ stats, recentActivity, onTabChange }: DashboardViewProps) {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'
  const isTablet = deviceType === 'tablet'
  
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

  const [quickAccessBoxes, setQuickAccessBoxes] = useKV<string[]>('flowsphere-quick-access', ['weather', 'emergency', 'meeting-notes'])
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
      const currentBoxes = current || ['weather', 'prayer', 'emergency']
      
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
    (quickAccessBoxes || ['weather', 'emergency', 'meeting-notes']).includes(box.id)
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
      trend: '+12%'
    },
    {
      title: 'Family Members',
      value: stats.familyMembers,
      icon: UsersIcon,
      color: 'coral',
      trend: 'All safe'
    },
    {
      title: 'Automations',
      value: stats.automations,
      icon: Lightning,
      color: 'accent',
      trend: '3 active'
    },
    {
      title: 'Energy Usage',
      value: 87,
      unit: '%',
      icon: TrendUp,
      color: 'primary',
      trend: '-5% vs yesterday'
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

  const cardGridCols = isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-2' : 'grid-cols-4'
  const quickAccessCols = isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-3' : 'grid-cols-2'
  const iconSize = isMobile ? 'w-5 h-5' : isTablet ? 'w-5 h-5' : 'w-6 h-6'
  const cardPadding = isMobile ? 'p-4' : isTablet ? 'p-5' : 'p-6'

  return (
    <div className={cn("space-y-6 pb-8", isMobile && "space-y-6", isTablet && "space-y-7")}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className={cn("font-bold mb-1", isMobile ? "text-2xl" : isTablet ? "text-3xl" : "text-4xl")}>
          {greeting()}
        </h1>
        <p className={cn("text-muted-foreground", isMobile ? "text-sm" : isTablet ? "text-base" : "text-lg")}>
          Here's what's happening in your sphere today
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className={cn("bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20", cardPadding)}>
          <div className={cn("flex flex-col items-center text-center", isMobile ? "space-y-4" : "space-y-6")}>
            <div className={cn("rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center", isMobile ? "w-12 h-12" : "w-16 h-16")}>
              <BookOpen className={cn("text-white", isMobile ? "w-6 h-6" : "w-8 h-8")} weight="fill" />
            </div>

            {!currentVerse ? (
              <>
                <div>
                  <h2 className={cn("font-semibold mb-2 font-heading", isMobile ? "text-lg" : isTablet ? "text-xl" : "text-2xl")}>
                    Word of God
                  </h2>
                  <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                    Would you like to hear God's word today?
                  </p>
                </div>

                <Button
                  size={isMobile ? "default" : "lg"}
                  onClick={handleStartReading}
                  className="min-touch-target bg-primary hover:bg-primary/90"
                >
                  <Play className={cn("mr-2", isMobile ? "w-4 h-4" : "w-5 h-5")} weight="fill" />
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
                  className={cn("w-full", isMobile ? "space-y-4" : "space-y-6")}
                >
                  <div>
                    <p className={cn("font-semibold text-primary mb-3", isMobile ? "text-xs" : "text-sm")}>
                      {currentVerse.reference}
                    </p>
                    <p className={cn("text-foreground leading-relaxed", isMobile ? "text-sm" : "text-base")}>
                      {currentVerse.text}
                    </p>
                  </div>

                  <div className={cn("flex flex-wrap justify-center", isMobile ? "gap-2" : "gap-3")}>
                    {isReading ? (
                      <Button
                        variant="destructive"
                        onClick={handleStopReading}
                        size={isMobile ? "default" : "lg"}
                        className="min-touch-target"
                      >
                        <Pause className={cn("mr-2", isMobile ? "w-4 h-4" : "w-5 h-5")} weight="fill" />
                        Stop
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStartReading}
                        size={isMobile ? "default" : "lg"}
                        className="min-touch-target"
                      >
                        <Play className={cn("mr-2", isMobile ? "w-4 h-4" : "w-5 h-5")} weight="fill" />
                        Read Aloud
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={handleNewVerse}
                      size={isMobile ? "default" : "lg"}
                      className="min-touch-target"
                    >
                      <ArrowClockwise className={cn("mr-2", isMobile ? "w-4 h-4" : "w-5 h-5")} />
                      New Verse
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </Card>
      </motion.div>

      <div className={cn("grid gap-3", cardGridCols, isMobile && "gap-3", isTablet && "gap-4")}>
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg">
                <CardContent className={cardPadding}>
                  <div className={cn("flex items-start justify-between", isMobile ? "mb-3" : "mb-4")}>
                    <div className={cn("rounded-xl bg-${stat.color}/10 flex items-center justify-center", isMobile ? "w-10 h-10" : "w-12 h-12")}>
                      <Icon className={cn(`text-${stat.color}`, isMobile ? "w-5 h-5" : "w-6 h-6")} weight="duotone" />
                    </div>
                    <Badge variant="secondary" className={isMobile ? "text-[10px]" : "text-xs"}>
                      {stat.trend}
                    </Badge>
                  </div>
                  <h3 className={cn("font-medium text-muted-foreground mb-1", isMobile ? "text-xs" : "text-sm")}>
                    {stat.title}
                  </h3>
                  <div className={cn("flex items-baseline", isMobile ? "space-x-1" : "space-x-2")}>
                    <p className={cn("font-bold", isMobile ? "text-2xl" : "text-3xl")}>
                      {stat.value}
                    </p>
                    {stat.total && (
                      <span className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>/ {stat.total}</span>
                    )}
                    {stat.unit && (
                      <span className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>{stat.unit}</span>
                    )}
                  </div>
                  {stat.total && (
                    <Progress 
                      value={(stat.value / stat.total) * 100} 
                      className={cn("h-1.5", isMobile ? "mt-2" : "mt-3")}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2", isMobile && "gap-4", isTablet && "gap-6")}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-blue-mid/20 bg-gradient-to-br from-blue-light/10 via-blue-mid/5 to-transparent">
            <CardHeader className={cn(isMobile ? "pb-3" : "pb-6")}>
              <div className="flex items-center justify-between">
                <CardTitle className={cn("flex items-center space-x-2", isMobile ? "text-base" : "text-lg")}>
                  <House className={cn(isMobile ? "w-4 h-4" : "w-5 h-5")} weight="duotone" />
                  <span>Quick Access</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 min-touch-target"
                  onClick={() => setIsCustomizing(true)}
                >
                  <PencilSimple className="w-4 h-4" weight="duotone" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className={cn("grid gap-2", quickAccessCols, isMobile && "gap-2", isTablet && "gap-3")}>
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
                      `rounded-xl ${colors.bg} ${colors.hover} border ${colors.border} transition-all duration-200 hover:scale-105 active:scale-95 group min-touch-target`,
                      isMobile ? "p-3" : "p-4"
                    )}
                  >
                    <Icon className={cn(`${colors.text} mb-1 group-hover:scale-110 transition-transform`, isMobile ? "w-5 h-5" : "w-6 h-6", isMobile && "mb-1", isTablet && "mb-2")} weight="duotone" />
                    <p className={cn("font-medium leading-tight", isMobile ? "text-xs" : "text-sm")}>{box.label}</p>
                    <p className={cn("text-muted-foreground mt-1", isMobile ? "text-[10px]" : "text-xs")}>{box.description}</p>
                  </motion.button>
                )
              })}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader className={cn(isMobile ? "pb-3" : "pb-6")}>
              <CardTitle className={isMobile ? "text-base" : "text-lg"}>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(isMobile ? "space-y-3" : "space-y-4")}>
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
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Card className="border-blue-mid/30 bg-gradient-to-br from-blue-light/10 via-accent/5 to-coral/10 relative overflow-hidden">
          <div className="absolute inset-0 blue-ombre opacity-5" />
          <CardContent className={cn("relative", cardPadding)}>
            <div className={cn("flex items-start", isMobile ? "space-x-3" : "space-x-4")}>
              <div className={cn("rounded-full bg-gradient-to-br from-blue-light to-blue-deep flex items-center justify-center flex-shrink-0", isMobile ? "w-10 h-10" : "w-12 h-12")}>
                <Lightning className={cn("text-white", isMobile ? "w-5 h-5" : "w-6 h-6")} weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn("font-semibold mb-1", isMobile ? "text-base" : "text-lg", isMobile && "mb-1", isTablet && "mb-2")}>AI Insight</h3>
                <p className={cn("text-muted-foreground mb-2", isMobile ? "text-xs" : "text-sm", isMobile && "mb-2", isTablet && "mb-3")}>
                  Your living room lights have been on for 3+ hours during daytime. 
                  Consider creating an automation to turn them off when natural light is sufficient.
                </p>
                <button className={cn("font-medium text-blue-mid hover:underline", isMobile ? "text-xs" : "text-sm")}>
                  Create automation →
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
                const isSelected = (quickAccessBoxes || ['weather', 'emergency', 'meeting-notes']).includes(box.id)
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
