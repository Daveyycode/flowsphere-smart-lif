import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Thermometer, Lock, Eye, Lightning, TrendUp, Users as UsersIcon, House, Camera, CalendarBlank, Cloud, MapTrifold, Notebook, Plus, PencilSimple, BookOpen, Play, Pause, ArrowClockwise } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmergencyDialog } from '@/components/emergency-dialog'
import { useKV } from '@github/spark/hooks'
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

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">{greeting()}</h1>
        <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
          Here's what's happening in your sphere today
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" weight="fill" />
            </div>

            {!currentVerse ? (
              <>
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2 font-heading">
                    Word of God
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Would you like to hear God's word today?
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={handleStartReading}
                  className="min-touch-target bg-primary hover:bg-primary/90"
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" weight="fill" />
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
                  className="space-y-4 sm:space-y-6 w-full"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-primary mb-3 sm:mb-4">
                      {currentVerse.reference}
                    </p>
                    <p className="text-sm sm:text-base text-foreground leading-relaxed">
                      {currentVerse.text}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                    {isReading ? (
                      <Button
                        variant="destructive"
                        onClick={handleStopReading}
                        className="min-touch-target"
                      >
                        <Pause className="w-4 h-4 sm:w-5 sm:h-5 mr-2" weight="fill" />
                        Stop
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStartReading}
                        className="min-touch-target"
                      >
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" weight="fill" />
                        Read Aloud
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={handleNewVerse}
                      className="min-touch-target"
                    >
                      <ArrowClockwise className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      New Verse
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${stat.color}`} weight="duotone" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                      {stat.trend}
                    </Badge>
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </h3>
                  <div className="flex items-baseline space-x-1 sm:space-x-2">
                    <p className="text-2xl sm:text-3xl font-bold">
                      {stat.value}
                    </p>
                    {stat.total && (
                      <span className="text-muted-foreground text-xs sm:text-sm">/ {stat.total}</span>
                    )}
                    {stat.unit && (
                      <span className="text-muted-foreground text-xs sm:text-sm">{stat.unit}</span>
                    )}
                  </div>
                  {stat.total && (
                    <Progress 
                      value={(stat.value / stat.total) * 100} 
                      className="mt-2 sm:mt-3 h-1.5"
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-blue-mid/20 bg-gradient-to-br from-blue-light/10 via-blue-mid/5 to-transparent">
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <House className="w-4 h-4 sm:w-5 sm:h-5" weight="duotone" />
                  <span>Quick Access</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsCustomizing(true)}
                >
                  <PencilSimple className="w-4 h-4" weight="duotone" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">
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
                    className={`p-3 sm:p-4 rounded-xl ${colors.bg} ${colors.hover} border ${colors.border} transition-all duration-200 hover:scale-105 active:scale-95 group`}
                  >
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text} mb-1 sm:mb-2 group-hover:scale-110 transition-transform`} weight="duotone" />
                    <p className="text-xs sm:text-sm font-medium leading-tight">{box.label}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{box.description}</p>
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
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                    className="flex items-start space-x-2 sm:space-x-3 pb-3 border-b border-border/50 last:border-0 last:pb-0"
                  >
                    <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{activity.message}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{activity.time}</p>
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
          <CardContent className="p-4 sm:p-5 md:p-6 relative">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-light to-blue-deep flex items-center justify-center flex-shrink-0">
                <Lightning className="w-5 h-5 sm:w-6 sm:h-6 text-white" weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">AI Insight</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                  Your living room lights have been on for 3+ hours during daytime. 
                  Consider creating an automation to turn them off when natural light is sufficient.
                </p>
                <button className="text-xs sm:text-sm font-medium text-blue-mid hover:underline">
                  Create automation →
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isCustomizing} onOpenChange={setIsCustomizing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Quick Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
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
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} weight="duotone" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{box.label}</p>
                      <p className="text-xs text-muted-foreground">{box.description}</p>
                    </div>
                    {isSelected && (
                      <Badge variant="secondary" className="bg-mint/20 text-mint">
                        Selected
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
            <Button
              onClick={() => setIsCustomizing(false)}
              className="w-full bg-accent hover:bg-accent/90"
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
