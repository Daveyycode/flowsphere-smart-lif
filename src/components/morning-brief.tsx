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
  X,
  Envelope,
  PencilSimple,
  Plus,
  Trash,
  CheckCircle,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { detectExitPhrase } from '@/lib/voice-commands'
import { getTodaySleepData } from '@/lib/sleep-tracking'
import { WeatherStore, TrafficStore, NotificationSyncStore } from '@/lib/shared-data-store'

interface MorningBriefProps {
  isVisible: boolean
  onDismiss: () => void
  onTabChange?: (
    tab: 'dashboard' | 'devices' | 'family' | 'notifications' | 'traffic' | 'settings'
  ) => void
}

interface DailyNote {
  id: string
  text: string
  createdAt: string
}

interface BriefData {
  weather: {
    condition: string
    temperature: number
    high: number
    low: number
  }
  sleep: {
    hours: number
    quality: number
  }
  traffic: {
    status: string
    duration: string
    delay: string
  }
  schedule: {
    events: number
    nextEvent: string
  }
  notifications: {
    unread: number
    important: number
  }
}

export function MorningBrief({ isVisible, onDismiss, onTabChange }: MorningBriefProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [dailyNotes, setDailyNotes] = useKV<DailyNote[]>('flowsphere-daily-notes', [])
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null)
  const [inactivityTimeout, setInactivityTimeout] = useState<NodeJS.Timeout | null>(null)
  const [completedCards, setCompletedCards] = useKV<string[]>('flowsphere-completed-cards', [])

  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  // Get real sleep data from tracking
  const sleepData = getTodaySleepData()

  // Configurable brief data - stored in useKV for persistence and user customization
  const [briefData, setBriefData] = useKV<BriefData>('flowsphere-brief-data', {
    weather: {
      condition: 'sunny',
      temperature: 72,
      high: 78,
      low: 65,
    },
    sleep: {
      hours: sleepData.hours || 0,
      quality: sleepData.quality || 0,
    },
    traffic: {
      status: 'light',
      duration: '--',
      delay: '--',
    },
    schedule: {
      events: 0,
      nextEvent: 'No upcoming events',
    },
    notifications: {
      unread: 0,
      important: 0,
    },
  })

  // Update sleep data whenever it changes
  useEffect(() => {
    if (sleepData.hours > 0 && briefData) {
      setBriefData({
        ...briefData,
        sleep: {
          hours: sleepData.hours,
          quality: sleepData.quality,
        },
      })
    }
  }, [sleepData.hours, sleepData.quality, briefData, setBriefData])

  // Sync weather data from shared store
  useEffect(() => {
    const cachedWeather = WeatherStore.get()
    if (cachedWeather && briefData) {
      setBriefData(prev => ({
        ...prev!,
        weather: {
          condition: cachedWeather.condition.toLowerCase().includes('rain')
            ? 'rainy'
            : cachedWeather.condition.toLowerCase().includes('cloud')
              ? 'cloudy'
              : 'sunny',
          temperature: cachedWeather.temperature,
          high: cachedWeather.high,
          low: cachedWeather.low,
        },
      }))
    }

    // Subscribe to weather updates
    const unsubscribe = WeatherStore.subscribe(weatherData => {
      setBriefData(prev => ({
        ...prev!,
        weather: {
          condition: weatherData.condition.toLowerCase().includes('rain')
            ? 'rainy'
            : weatherData.condition.toLowerCase().includes('cloud')
              ? 'cloudy'
              : 'sunny',
          temperature: weatherData.temperature,
          high: weatherData.high,
          low: weatherData.low,
        },
      }))
    })

    return unsubscribe
  }, [])

  // Sync traffic data from shared store
  useEffect(() => {
    const cachedTraffic = TrafficStore.get()
    if (cachedTraffic && briefData) {
      setBriefData(prev => ({
        ...prev!,
        traffic: {
          status: cachedTraffic.status,
          duration: cachedTraffic.duration,
          delay: cachedTraffic.delay,
        },
      }))
    }

    // Subscribe to traffic updates
    const unsubscribe = TrafficStore.subscribe(trafficData => {
      setBriefData(prev => ({
        ...prev!,
        traffic: {
          status: trafficData.status,
          duration: trafficData.duration,
          delay: trafficData.delay,
        },
      }))
    })

    return unsubscribe
  }, [])

  // Sync notification counts from shared store
  useEffect(() => {
    const counts = NotificationSyncStore.getCounts()
    if (briefData) {
      setBriefData(prev => ({
        ...prev!,
        notifications: {
          unread: counts.unread,
          important: counts.important,
        },
      }))
    }

    // Subscribe to new notifications
    const unsubscribe = NotificationSyncStore.subscribe(() => {
      const updatedCounts = NotificationSyncStore.getCounts()
      setBriefData(prev => ({
        ...prev!,
        notifications: {
          unread: updatedCounts.unread,
          important: updatedCounts.important,
        },
      }))
    })

    return unsubscribe
  }, [])

  const getWeatherIcon = () => {
    switch (briefData?.weather?.condition) {
      case 'sunny':
        return Sun
      case 'rainy':
        return CloudRain
      default:
        return Cloud
    }
  }

  const WeatherIcon = getWeatherIcon()

  const stopListening = () => {
    setIsListening(false)
    if (recognitionInstance) {
      try {
        recognitionInstance.stop()
      } catch (e) {
        console.error('Error stopping recognition:', e)
      }
      setRecognitionInstance(null)
    }
    if (inactivityTimeout) {
      clearTimeout(inactivityTimeout)
      setInactivityTimeout(null)
    }
  }

  const startContinuousListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.info('Voice commands not supported in this browser')
      return
    }

    // Stop any existing instance first
    if (recognitionInstance) {
      stopListening()
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let localTimeout: NodeJS.Timeout | null = null

    recognition.onstart = () => {
      setIsListening(true)
      toast.success('Voice assistant activated! Say your commands or say "that\'s all" to stop.')

      // Start inactivity timer
      localTimeout = setTimeout(() => {
        toast.info('3 minutes of inactivity. Turning off voice assistant.')
        stopListening()
      }, 180000) // 3 minutes
    }

    recognition.onresult = (event: any) => {
      // Reset inactivity timeout
      if (localTimeout) {
        clearTimeout(localTimeout)
      }
      localTimeout = setTimeout(() => {
        toast.info('3 minutes of inactivity. Turning off voice assistant.')
        stopListening()
      }, 180000)

      setInactivityTimeout(localTimeout)

      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim()

      // Check for exit commands using shared utility
      if (detectExitPhrase(transcript)) {
        toast.success('Voice assistant deactivated. Goodbye!')
        stopListening()
        return
      }

      // Check for commands (only on final results)
      if (event.results[event.results.length - 1].isFinal) {
        toast.info(`You said: "${transcript}"`)

        // Check for specific section commands (with or without "open")
        if (transcript.includes('weather')) {
          handleCardClick('weather')
        } else if (transcript.includes('sleep')) {
          handleCardClick('sleep')
        } else if (transcript.includes('commute') || transcript.includes('traffic')) {
          handleCardClick('commute')
        } else if (
          transcript.includes('important') ||
          transcript.includes('email') ||
          transcript.includes('notification')
        ) {
          handleCardClick('important')
        } else if (
          transcript.includes('add note') ||
          transcript.includes('create note') ||
          transcript.includes('new note')
        ) {
          setIsAddingNote(true)
          toast.success('Note creator opened')
        } else if (
          (transcript.includes('open') || transcript.includes('show')) &&
          !transcript.includes('weather') &&
          !transcript.includes('sleep') &&
          !transcript.includes('commute') &&
          !transcript.includes('important')
        ) {
          // User said "open" but didn't specify what
          toast.info('Please say "open weather", "open sleep", "open commute", or "open important"')
          const helpMessage =
            'What would you like to open? You can say: weather, sleep, commute, or important emails.'
          const utterance = new SpeechSynthesisUtterance(helpMessage)
          utterance.rate = 1.0
          utterance.pitch = 1.0
          utterance.volume = 1.0
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(utterance)
        }
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Recognition error:', event.error)
      if (event.error === 'no-speech') {
        // Don't stop on no-speech, just continue
        return
      }
      if (event.error === 'aborted') {
        // Intentional stop, don't show error
        return
      }
      toast.error(`Voice error: ${event.error}`)
      stopListening()
    }

    recognition.onend = () => {
      // Only restart if we're still supposed to be listening
      console.log('Recognition ended, isListening:', isListening)
      // Don't auto-restart - let it end naturally
      if (localTimeout) {
        clearTimeout(localTimeout)
      }
      setIsListening(false)
    }

    try {
      recognition.start()
      setRecognitionInstance(recognition)
    } catch (e) {
      console.error('Failed to start recognition:', e)
      toast.error('Failed to start voice recognition')
    }
  }

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

    // Build voice script with notes/reminders
    let voiceScript = `${greeting}! You slept ${briefData?.sleep?.hours} hours with ${briefData?.sleep?.quality}% quality.
    Weather is ${briefData?.weather?.condition} at ${briefData?.weather?.temperature} degrees.
    Traffic to work is ${briefData?.traffic?.status}, about ${briefData?.traffic?.duration}.
    You have ${briefData?.schedule?.events} meetings today.
    Your next event is ${briefData?.schedule?.nextEvent}.
    You have ${briefData?.notifications.unread} unread notifications and ${briefData?.notifications.important} important messages.`

    // Add daily notes/reminders if any exist
    if (dailyNotes && dailyNotes.length > 0) {
      voiceScript += `\n\nYou have ${dailyNotes.length} reminder${dailyNotes.length > 1 ? 's' : ''} for today: `
      dailyNotes.forEach((note, index) => {
        voiceScript += `${index + 1}. ${note.text}. `
      })
    }

    const utterance = new SpeechSynthesisUtterance(voiceScript)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => {
      toast.success('Playing voice summary')
    }

    utterance.onend = () => {
      setIsPlaying(false)
      toast.info('Summary complete. Starting voice assistant...')
      // Start continuous listening after announcement
      setTimeout(() => {
        startContinuousListening()
      }, 500)
    }

    utterance.onerror = () => {
      setIsPlaying(false)
      toast.error('Failed to play voice summary')
    }

    window.speechSynthesis.speak(utterance)
  }

  const handleCardClick = async (cardType: 'weather' | 'sleep' | 'commute' | 'important') => {
    // Mark card as completed
    setCompletedCards(prev => [...(prev || []), cardType])

    // Navigate to relevant sections
    switch (cardType) {
      case 'weather':
        try {
          const weatherUrl = `weather://`
          window.location.href = weatherUrl
          setTimeout(() => {
            window.open('https://weather.com', '_blank')
          }, 1000)
        } catch (error) {
          window.open('https://weather.com', '_blank')
        }
        break
      case 'sleep':
        toast.info('Sleep tracking details coming soon!')
        break
      case 'commute':
        if (onTabChange) {
          onTabChange('traffic')
        }
        break
      case 'important':
        if (onTabChange) {
          onTabChange('notifications')
        }
        break
    }
  }

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note')
      return
    }

    const note: DailyNote = {
      id: Date.now().toString(),
      text: newNote.trim(),
      createdAt: new Date().toISOString(),
    }

    setDailyNotes(current => [...(current || []), note])
    setNewNote('')
    setIsAddingNote(false)
    toast.success('Note added')
  }

  const handleDeleteNote = (noteId: string) => {
    setDailyNotes(current => (current || []).filter(note => note.id !== noteId))
    toast.success('Note deleted')
  }

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      stopListening()
    }
  }, [recognitionInstance, inactivityTimeout])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', bounce: 0.3 }}
          className="mb-2 sm:mb-3"
        >
          <Card className="bg-gradient-to-br from-accent/10 via-primary/10 to-coral/10 border-accent/30 overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0">
                    <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" weight="fill" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold truncate">{greeting}!</h2>
                    <p className="text-xs text-muted-foreground">Here's your daily brief</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePlayVoice}
                    disabled={isPlaying}
                    className="relative h-8 w-8 sm:h-9 sm:w-9"
                  >
                    {isPlaying ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                      >
                        <SpeakerHigh className="w-4 h-4" weight="fill" />
                      </motion.div>
                    ) : (
                      <Play className="w-4 h-4" weight="fill" />
                    )}
                  </Button>
                  {!isListening ? (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={startContinuousListening}
                      className="relative h-8 w-8 sm:h-9 sm:w-9"
                      title="Start voice assistant"
                    >
                      <SpeakerHigh className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={stopListening}
                      className="relative h-8 w-8 sm:h-9 sm:w-9"
                      title="Stop voice assistant"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => handleCardClick('weather')}
                  className="bg-card/50 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 border border-border/50 hover:border-coral/50 hover:bg-card/70 transition-all cursor-pointer group text-left"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-coral/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <WeatherIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-coral" weight="fill" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
                      {briefData?.weather?.high}° / {briefData?.weather?.low}°
                    </Badge>
                  </div>
                  <h4 className="font-semibold mb-0.5 text-xs">Weather</h4>
                  <p className="text-lg sm:text-xl font-bold mb-0.5">
                    {briefData?.weather?.temperature}°F
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground capitalize">
                    {briefData?.weather?.condition}
                  </p>
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => handleCardClick('sleep')}
                  className={`bg-card/50 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 border transition-all cursor-pointer group text-left relative ${(completedCards || []).includes('sleep') ? 'border-green-500/50 bg-green-500/10' : 'border-border/50 hover:border-primary/50 hover:bg-card/70'}`}
                >
                  {(completedCards || []).includes('sleep') && (
                    <CheckCircle
                      className="absolute top-2 right-2 w-4 h-4 text-green-500"
                      weight="fill"
                    />
                  )}
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MoonStars className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" weight="fill" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
                      {briefData?.sleep?.quality}%
                    </Badge>
                  </div>
                  <h4 className="font-semibold mb-0.5 text-xs">Sleep</h4>
                  <p className="text-lg sm:text-xl font-bold mb-1.5">{briefData?.sleep?.hours}h</p>
                  <Progress value={briefData?.sleep?.quality} className="h-1" />
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => handleCardClick('commute')}
                  className={`bg-card/50 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 border transition-all cursor-pointer group text-left relative ${(completedCards || []).includes('commute') ? 'border-green-500/50 bg-green-500/10' : 'border-border/50 hover:border-mint/50 hover:bg-card/70'}`}
                >
                  {(completedCards || []).includes('commute') && (
                    <CheckCircle
                      className="absolute top-2 right-2 w-4 h-4 text-green-500"
                      weight="fill"
                    />
                  )}
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-mint/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-mint" weight="fill" />
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] sm:text-xs px-1.5 py-0 ${briefData?.traffic?.status === 'heavy' ? 'bg-destructive/20' : ''}`}
                    >
                      {briefData?.traffic?.status}
                    </Badge>
                  </div>
                  <h4 className="font-semibold mb-0.5 text-xs">Commute</h4>
                  <p className="text-lg sm:text-xl font-bold mb-0.5">
                    {briefData?.traffic?.duration}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {briefData?.traffic?.delay} from usual
                  </p>
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => handleCardClick('important')}
                  className={`bg-card/50 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 border transition-all cursor-pointer group text-left relative ${(completedCards || []).includes('important') ? 'border-green-500/50 bg-green-500/10' : 'border-border/50 hover:border-accent/50 hover:bg-card/70'}`}
                >
                  {(completedCards || []).includes('important') && (
                    <CheckCircle
                      className="absolute top-2 right-2 w-4 h-4 text-green-500"
                      weight="fill"
                    />
                  )}
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Envelope className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" weight="fill" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
                      {(briefData?.notifications?.unread ?? 0) +
                        (briefData?.notifications?.important ?? 0)}
                    </Badge>
                  </div>
                  <h4 className="font-semibold mb-0.5 text-xs">Important</h4>
                  <p className="text-[10px] sm:text-xs mb-0.5 leading-tight">
                    📄 {briefData?.notifications?.unread} bills due
                  </p>
                  <p className="text-[10px] sm:text-xs mb-0.5 leading-tight">
                    ✉️ {briefData?.notifications?.important} work emails
                  </p>
                  <p className="text-[10px] sm:text-xs leading-tight">
                    📅 {briefData?.schedule?.events} events today
                  </p>
                </motion.button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-3 sm:mt-4 space-y-2.5"
              >
                <div className="p-2.5 sm:p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <h4 className="font-semibold text-xs mb-1.5">Day Optimizer Suggestion</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                    Consider leaving 10 minutes earlier due to current traffic conditions. Your
                    morning routine looks good - you have buffer time before your first meeting at
                    10:00 AM.
                  </p>
                </div>

                <div className="p-2.5 sm:p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-xs flex items-center gap-1.5">
                      <PencilSimple className="w-3.5 h-3.5" weight="duotone" />
                      Daily Notes & Reminders
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAddingNote(true)}
                      className="h-7 px-2 text-[10px]"
                    >
                      <Plus className="w-3.5 h-3.5 mr-0.5" />
                      Add
                    </Button>
                  </div>

                  {isAddingNote && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-2 flex gap-1.5"
                    >
                      <Input
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        placeholder="Enter a note or reminder..."
                        className="text-[10px] sm:text-xs h-8"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            handleAddNote()
                          } else if (e.key === 'Escape') {
                            setIsAddingNote(false)
                            setNewNote('')
                          }
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={handleAddNote} className="h-8 px-2 text-[10px]">
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsAddingNote(false)
                          setNewNote('')
                        }}
                        className="h-8 px-2 text-[10px]"
                      >
                        Cancel
                      </Button>
                    </motion.div>
                  )}

                  <div className="space-y-1.5">
                    {dailyNotes && dailyNotes.length > 0 ? (
                      dailyNotes.map(note => (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="flex items-start gap-2 p-2 bg-card/50 rounded border border-border/30 group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] sm:text-xs text-foreground break-words leading-tight">
                              {note.text}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNote(note.id)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash className="w-3 h-3 text-destructive" />
                          </Button>
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-[10px] sm:text-xs text-muted-foreground italic text-center py-1.5">
                        No notes yet. Click "Add" to create your first reminder.
                      </p>
                    )}
                  </div>
                </div>

                {isListening && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-2.5 sm:p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 flex items-center gap-2"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <SpeakerHigh className="w-4 h-4 text-blue-500" weight="fill" />
                    </motion.div>
                    <p className="text-[10px] sm:text-xs text-blue-500 font-medium">
                      Listening for voice command...
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
