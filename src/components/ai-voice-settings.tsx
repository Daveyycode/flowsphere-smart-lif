import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SpeakerHigh, Play, Pause, Check } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

export interface VoiceSettings {
  name: string
  rate: number
  pitch: number
  volume: number
}

interface VoiceOption {
  name: string
  lang: string
  description: string
  gender: 'male' | 'female'
  accent: string
  recommended?: boolean
}

const voiceOptions: VoiceOption[] = [
  { name: 'Samantha', lang: 'en-US', description: 'Professional American female voice', gender: 'female', accent: 'American', recommended: true },
  { name: 'Alex', lang: 'en-US', description: 'Clear American male voice', gender: 'male', accent: 'American' },
  { name: 'Victoria', lang: 'en-GB', description: 'Elegant British female voice', gender: 'female', accent: 'British' },
  { name: 'Daniel', lang: 'en-GB', description: 'Distinguished British male voice', gender: 'male', accent: 'British' },
  { name: 'Karen', lang: 'en-AU', description: 'Friendly Australian female voice', gender: 'female', accent: 'Australian' },
  { name: 'Tom', lang: 'en-US', description: 'Energetic American male voice', gender: 'male', accent: 'American' },
  { name: 'Fiona', lang: 'en-scotland', description: 'Warm Scottish female voice', gender: 'female', accent: 'Scottish' },
  { name: 'Moira', lang: 'en-IE', description: 'Charming Irish female voice', gender: 'female', accent: 'Irish' },
  { name: 'Tessa', lang: 'en-ZA', description: 'Professional South African female voice', gender: 'female', accent: 'South African' },
  { name: 'Veena', lang: 'en-IN', description: 'Clear Indian female voice', gender: 'female', accent: 'Indian' },
  { name: 'Rishi', lang: 'en-IN', description: 'Professional Indian male voice', gender: 'male', accent: 'Indian' },
  { name: 'Tian-Tian', lang: 'zh-CN', description: 'Natural Mandarin female voice', gender: 'female', accent: 'Mandarin' }
]

export function AIVoiceSettings() {
  const [voiceSettings, setVoiceSettings] = useKV<VoiceSettings>('flowsphere-voice-settings', {
    name: 'Samantha',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  })
  
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [testingVoice, setTestingVoice] = useState<string | null>(null)

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        setAvailableVoices(voices)
      }

      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  const testVoice = (voiceName: string) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported in your browser')
      return
    }

    if (isPlaying && testingVoice === voiceName) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
      setTestingVoice(null)
      return
    }

    window.speechSynthesis.cancel()
    setIsPlaying(true)
    setTestingVoice(voiceName)

    const testText = "Hello! This is how I sound. I'm FlowSphere's AI assistant, here to help you manage your daily life."
    const utterance = new SpeechSynthesisUtterance(testText)
    
    const voice = availableVoices.find(v => v.name.includes(voiceName))
    if (voice) {
      utterance.voice = voice
    }
    
    utterance.rate = voiceSettings?.rate || 1.0
    utterance.pitch = voiceSettings?.pitch || 1.0
    utterance.volume = voiceSettings?.volume || 1.0

    utterance.onend = () => {
      setIsPlaying(false)
      setTestingVoice(null)
    }

    utterance.onerror = () => {
      setIsPlaying(false)
      setTestingVoice(null)
      toast.error('Failed to play voice sample')
    }

    window.speechSynthesis.speak(utterance)
  }

  const selectVoice = (voiceName: string) => {
    setVoiceSettings((current) => ({
      ...(current || { rate: 1.0, pitch: 1.0, volume: 1.0 }),
      name: voiceName
    }))
    toast.success(`Voice changed to ${voiceName}`)
  }

  const updateRate = (value: number[]) => {
    setVoiceSettings((current) => ({
      ...(current || { name: 'Samantha', pitch: 1.0, volume: 1.0 }),
      rate: value[0]
    }))
  }

  const updatePitch = (value: number[]) => {
    setVoiceSettings((current) => ({
      ...(current || { name: 'Samantha', rate: 1.0, volume: 1.0 }),
      pitch: value[0]
    }))
  }

  const updateVolume = (value: number[]) => {
    setVoiceSettings((current) => ({
      ...(current || { name: 'Samantha', rate: 1.0, pitch: 1.0 }),
      volume: value[0]
    }))
  }

  const resetToDefaults = () => {
    setVoiceSettings({
      name: 'Samantha',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    })
    toast.success('Voice settings reset to defaults')
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">AI Voice Settings</h1>
        <p className="text-muted-foreground">
          Customize how FlowSphere's AI assistant sounds
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-accent/30 bg-gradient-to-br from-accent/5 via-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <SpeakerHigh className="w-5 h-5" weight="duotone" />
              <span>Voice Selection</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {voiceOptions.map((voice, index) => {
                const isSelected = voiceSettings?.name === voice.name
                const isTesting = testingVoice === voice.name && isPlaying

                return (
                  <motion.div
                    key={voice.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent/50 bg-card'
                    }`}
                    onClick={() => !isTesting && selectVoice(voice.name)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{voice.name}</h4>
                          {voice.recommended && (
                            <Badge variant="secondary" className="bg-mint/20 text-mint text-xs">
                              Recommended
                            </Badge>
                          )}
                          {isSelected && (
                            <Check className="w-4 h-4 text-accent" weight="bold" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{voice.description}</p>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {voice.gender === 'female' ? 'Female' : 'Male'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {voice.accent}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          testVoice(voice.name)
                        }}
                        className="flex-shrink-0"
                      >
                        {isTesting ? (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity }}
                          >
                            <Pause className="w-5 h-5" weight="fill" />
                          </motion.div>
                        ) : (
                          <Play className="w-5 h-5" weight="fill" />
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Voice Customization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="rate-slider">Speed</Label>
                <span className="text-sm text-muted-foreground">
                  {((voiceSettings?.rate || 1.0) * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                id="rate-slider"
                min={0.5}
                max={2.0}
                step={0.1}
                value={[voiceSettings?.rate || 1.0]}
                onValueChange={updateRate}
              />
              <p className="text-xs text-muted-foreground">
                Adjust how fast the AI speaks
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="pitch-slider">Pitch</Label>
                <span className="text-sm text-muted-foreground">
                  {((voiceSettings?.pitch || 1.0) * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                id="pitch-slider"
                min={0.5}
                max={2.0}
                step={0.1}
                value={[voiceSettings?.pitch || 1.0]}
                onValueChange={updatePitch}
              />
              <p className="text-xs text-muted-foreground">
                Adjust the voice tone (higher or lower)
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="volume-slider">Volume</Label>
                <span className="text-sm text-muted-foreground">
                  {((voiceSettings?.volume || 1.0) * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                id="volume-slider"
                min={0}
                max={1.0}
                step={0.1}
                value={[voiceSettings?.volume || 1.0]}
                onValueChange={updateVolume}
              />
              <p className="text-xs text-muted-foreground">
                Control the voice loudness
              </p>
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                variant="outline"
                onClick={resetToDefaults}
                className="flex-1"
              >
                Reset to Defaults
              </Button>
              <Button
                onClick={() => testVoice(voiceSettings?.name || 'Samantha')}
                className="flex-1 bg-accent hover:bg-accent/90"
              >
                <Play className="w-4 h-4 mr-2" weight="fill" />
                Test Current Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
