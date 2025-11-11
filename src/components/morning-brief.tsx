import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sun, 
  CloudRain, 
  Cloud, 
  Thermometer, 
  Car, 
  CalendarDots, 
  MoonStars,
  SpeakerHigh,
  Play,
  X
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

interface MorningBriefProps {
  isVisible: boolean
  onDismiss: () => void
}

export function MorningBrief({ isVisible, onDismiss }: MorningBriefProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  
  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'
  
  const briefData = {
    weather: {
      condition: 'sunny',
      temperature: 72,
      high: 78,
      low: 65
    },
    sleep: {
      hours: 7.5,
      quality: 85
    },
    traffic: {
      status: 'moderate',
      duration: '25 min',
      delay: '+5 min'
    },
    schedule: {
      events: 3,
      nextEvent: 'Team Meeting at 10:00 AM'
    },
    notifications: {
      urgent: 2,
      work: 5,
      total: 12
    }
  }

  const getWeatherIcon = () => {
    switch (briefData.weather.condition) {
      case 'sunny': return Sun
      case 'rainy': return CloudRain
      default: return Cloud
    }
  }

  const WeatherIcon = getWeatherIcon()

  const handlePlayVoice = async () => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported in your browser')
      return
    }

    if (isPlaying) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
      return
    }
    
    setIsPlaying(true)
    
    const voiceScript = `${greeting}! You slept ${briefData.sleep.hours} hours with ${briefData.sleep.quality}% quality. 
    Weather is ${briefData.weather.condition} at ${briefData.weather.temperature} degrees. 
    Traffic to work is ${briefData.traffic.status}, about ${briefData.traffic.duration}. 
    You have ${briefData.schedule.events} meetings today. 
    Your next event is ${briefData.schedule.nextEvent}.
    You have ${briefData.notifications.urgent} urgent notifications and ${briefData.notifications.work} work messages.`
    
    const utterance = new SpeechSynthesisUtterance(voiceScript)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0
    
    utterance.onstart = () => {
      toast.success('Playing voice summary')
    }
    
    utterance.onend = () => {
      setIsPlaying(false)
      toast.info('Summary complete')
    }
    
    utterance.onerror = () => {
      setIsPlaying(false)
      toast.error('Failed to play voice summary')
    }
    
    window.speechSynthesis.speak(utterance)
  }
  
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', bounce: 0.3 }}
          className="mb-4 sm:mb-6"
        >
          <Card className="bg-gradient-to-br from-accent/10 via-primary/10 to-coral/10 border-accent/30 overflow-hidden">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0">
                    <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-white" weight="fill" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold truncate">{greeting}!</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Here's your daily brief</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePlayVoice}
                    disabled={isPlaying}
                    className="relative h-8 w-8 sm:h-10 sm:w-10"
                  >
                    {isPlaying ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                      >
                        <SpeakerHigh className="w-4 h-4 sm:w-5 sm:h-5" weight="fill" />
                      </motion.div>
                    ) : (
                      <Play className="w-4 h-4 sm:w-5 sm:h-5" weight="fill" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8 sm:h-10 sm:w-10">
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-card/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-border/50"
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-coral/20 flex items-center justify-center">
                      <WeatherIcon className="w-4 h-4 sm:w-5 sm:h-5 text-coral" weight="fill" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                      {briefData.weather.high}° / {briefData.weather.low}°
                    </Badge>
                  </div>
                  <h4 className="font-semibold mb-1 text-xs sm:text-sm">Weather</h4>
                  <p className="text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1">{briefData.weather.temperature}°F</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground capitalize">{briefData.weather.condition}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-card/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-border/50"
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <MoonStars className="w-4 h-4 sm:w-5 sm:h-5 text-primary" weight="fill" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                      {briefData.sleep.quality}%
                    </Badge>
                  </div>
                  <h4 className="font-semibold mb-1 text-xs sm:text-sm">Sleep</h4>
                  <p className="text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1">{briefData.sleep.hours}h</p>
                  <Progress value={briefData.sleep.quality} className="h-1.5" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-card/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-border/50"
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-mint/20 flex items-center justify-center">
                      <Car className="w-4 h-4 sm:w-5 sm:h-5 text-mint" weight="fill" />
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-[10px] sm:text-xs ${briefData.traffic.status === 'heavy' ? 'bg-destructive/20' : ''}`}
                    >
                      {briefData.traffic.status}
                    </Badge>
                  </div>
                  <h4 className="font-semibold mb-1 text-xs sm:text-sm">Commute</h4>
                  <p className="text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1">{briefData.traffic.duration}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{briefData.traffic.delay} from usual</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-card/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-border/50"
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                      <CalendarDots className="w-4 h-4 sm:w-5 sm:h-5 text-accent" weight="fill" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                      {briefData.schedule.events} events
                    </Badge>
                  </div>
                  <h4 className="font-semibold mb-1 text-xs sm:text-sm">Schedule</h4>
                  <p className="text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 line-clamp-2">
                    {briefData.schedule.nextEvent}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Next up</p>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-3 sm:mt-4 p-3 sm:p-4 bg-accent/10 rounded-lg border border-accent/20"
              >
                <h4 className="font-semibold text-xs sm:text-sm mb-1 sm:mb-2">Day Optimizer Suggestion</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Consider leaving 10 minutes earlier due to traffic. Your morning routine looks good - you have buffer time before your first meeting.
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
