import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Microphone,
  SpeakerHigh,
  CheckCircle,
  XCircle,
  Warning,
  Sparkle,
  LightbulbFilament,
  LockKey,
  ThermometerSimple,
  VideoCamera,
  Phone,
  MapPin,
  Moon,
  House,
  FilmSlate,
  Palette,
} from '@phosphor-icons/react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CommandTest {
  category: string
  command: string
  description: string
  requiresConfirmation: boolean
  icon: React.ElementType
  status?: 'pass' | 'fail' | 'pending'
}

const commandTests: CommandTest[] = [
  {
    category: 'device',
    command: 'Turn on living room light',
    description: 'Turns on the living room light',
    requiresConfirmation: false,
    icon: LightbulbFilament,
  },
  {
    category: 'device',
    command: 'Turn off all lights',
    description: 'Turns off all lights in the house',
    requiresConfirmation: false,
    icon: LightbulbFilament,
  },
  {
    category: 'device',
    command: 'Lock all doors',
    description: 'Locks all smart locks',
    requiresConfirmation: false,
    icon: LockKey,
  },
  {
    category: 'device',
    command: 'Set temperature to 72',
    description: 'Sets thermostat to 72°F',
    requiresConfirmation: false,
    icon: ThermometerSimple,
  },
  {
    category: 'device',
    command: 'Start recording front camera',
    description: 'Starts recording on front camera',
    requiresConfirmation: false,
    icon: VideoCamera,
  },
  {
    category: 'scene',
    command: 'Good morning scene',
    description: 'Activates morning routine',
    requiresConfirmation: false,
    icon: House,
  },
  {
    category: 'scene',
    command: 'Good night scene',
    description: 'Turns off lights and locks doors',
    requiresConfirmation: false,
    icon: Moon,
  },
  {
    category: 'scene',
    command: 'Movie scene',
    description: 'Dims living room lights to 20%',
    requiresConfirmation: false,
    icon: FilmSlate,
  },
  {
    category: 'theme',
    command: 'Change theme to aurora borealis',
    description: 'Changes app theme',
    requiresConfirmation: false,
    icon: Palette,
  },
  {
    category: 'confirmation',
    command: 'Check kids location',
    description: "Checks children's GPS locations (requires confirmation)",
    requiresConfirmation: true,
    icon: MapPin,
  },
  {
    category: 'confirmation',
    command: 'Call the kids',
    description: 'Initiates call to children (requires confirmation)',
    requiresConfirmation: true,
    icon: Phone,
  },
  {
    category: 'confirmation',
    command: 'Call family',
    description: 'Initiates group call (requires confirmation)',
    requiresConfirmation: true,
    icon: Phone,
  },
]

export function VoiceCommandTester() {
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail'>>({})
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null)
  const [ttsSupported, setTtsSupported] = useState<boolean | null>(null)

  const checkSupport = () => {
    const voiceRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    const textToSpeech = 'speechSynthesis' in window

    setVoiceSupported(voiceRecognition)
    setTtsSupported(textToSpeech)
  }

  const testVoiceRecognition = () => {
    if (!voiceSupported) {
      alert('Voice recognition not supported in this browser')
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      alert(`You said: "${transcript}"`)
    }

    recognition.onerror = (event: any) => {
      alert(`Voice recognition error: ${event.error}`)
    }

    recognition.start()
  }

  const testTextToSpeech = () => {
    if (!ttsSupported) {
      alert('Text-to-speech not supported in this browser')
      return
    }

    const utterance = new SpeechSynthesisUtterance(
      'Hello! This is a test of the text to speech system.'
    )
    utterance.rate = 0.95
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }

  const markTest = (command: string, status: 'pass' | 'fail') => {
    setTestResults(prev => ({ ...prev, [command]: status }))
  }

  const resetTests = () => {
    setTestResults({})
    setVoiceSupported(null)
    setTtsSupported(null)
  }

  const getStats = () => {
    const total = Object.keys(testResults).length
    const passed = Object.values(testResults).filter(r => r === 'pass').length
    return { total, passed, percentage: total > 0 ? Math.round((passed / total) * 100) : 0 }
  }

  const stats = getStats()

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-blue-light via-blue-mid to-blue-deep text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Sparkle className="w-7 h-7" weight="fill" />
          </div>
          <div>
            <CardTitle className="text-2xl">Voice Command Tester</CardTitle>
            <CardDescription className="text-white/80">
              Test AI Assistant voice commands and confirmations
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Microphone className="w-8 h-8 mx-auto text-blue-mid" weight="fill" />
                <div className="text-2xl font-bold">
                  {voiceSupported === null ? '?' : voiceSupported ? '✅' : '❌'}
                </div>
                <div className="text-sm text-muted-foreground">Voice Recognition</div>
                <Button
                  onClick={testVoiceRecognition}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  Test
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <SpeakerHigh className="w-8 h-8 mx-auto text-primary" weight="fill" />
                <div className="text-2xl font-bold">
                  {ttsSupported === null ? '?' : ttsSupported ? '✅' : '❌'}
                </div>
                <div className="text-sm text-muted-foreground">Text-to-Speech</div>
                <Button onClick={testTextToSpeech} size="sm" variant="outline" className="w-full">
                  Test
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <CheckCircle className="w-8 h-8 mx-auto text-mint" weight="fill" />
                <div className="text-2xl font-bold">
                  {stats.total > 0 ? `${stats.passed}/${stats.total}` : '0/0'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Tests Passed ({stats.percentage}%)
                </div>
                <Button onClick={resetTests} size="sm" variant="outline" className="w-full">
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Button onClick={checkSupport} className="w-full" size="lg">
          Check Browser Support
        </Button>

        {(voiceSupported !== null || ttsSupported !== null) && (
          <Alert>
            <Sparkle className="w-4 h-4" />
            <AlertDescription>
              {voiceSupported && ttsSupported && (
                <span className="text-mint font-medium">
                  ✅ Your browser fully supports voice features!
                </span>
              )}
              {voiceSupported && !ttsSupported && (
                <span className="text-amber-500 font-medium">
                  ⚠️ Voice recognition works, but text-to-speech is not supported
                </span>
              )}
              {!voiceSupported && ttsSupported && (
                <span className="text-amber-500 font-medium">
                  ⚠️ Text-to-speech works, but voice recognition is not supported
                </span>
              )}
              {!voiceSupported && !ttsSupported && (
                <span className="text-destructive font-medium">
                  ❌ Voice features not supported. Try Chrome, Edge, or Safari.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="device" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="device">Device</TabsTrigger>
            <TabsTrigger value="scene">Scenes</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="confirmation">Confirmation</TabsTrigger>
          </TabsList>

          <TabsContent value="device" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {commandTests
                  .filter(t => t.category === 'device')
                  .map(test => (
                    <CommandTestCard
                      key={test.command}
                      test={test}
                      status={testResults[test.command]}
                      onMark={markTest}
                    />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="scene" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {commandTests
                  .filter(t => t.category === 'scene')
                  .map(test => (
                    <CommandTestCard
                      key={test.command}
                      test={test}
                      status={testResults[test.command]}
                      onMark={markTest}
                    />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="theme" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {commandTests
                  .filter(t => t.category === 'theme')
                  .map(test => (
                    <CommandTestCard
                      key={test.command}
                      test={test}
                      status={testResults[test.command]}
                      onMark={markTest}
                    />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="confirmation" className="space-y-4">
            <Alert>
              <Warning className="w-4 h-4" />
              <AlertDescription>
                These commands require user confirmation. The AI will ask "Do you want me to..."
                before executing.
              </AlertDescription>
            </Alert>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {commandTests
                  .filter(t => t.category === 'confirmation')
                  .map(test => (
                    <CommandTestCard
                      key={test.command}
                      test={test}
                      status={testResults[test.command]}
                      onMark={markTest}
                    />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Sparkle className="w-4 h-4 text-accent" />
            Testing Instructions
          </h4>
          <ol className="text-sm text-muted-foreground space-y-1 ml-6 list-decimal">
            <li>Click the AI Assistant button (sparkle icon at bottom right)</li>
            <li>Enable voice responses in settings (gear icon)</li>
            <li>Try each command by typing or speaking</li>
            <li>Mark each test as Pass ✅ or Fail ❌</li>
            <li>For confirmation commands, verify that AI asks for confirmation first</li>
            <li>Test both typing and voice input methods</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}

interface CommandTestCardProps {
  test: CommandTest
  status?: 'pass' | 'fail'
  onMark: (command: string, status: 'pass' | 'fail') => void
}

function CommandTestCard({ test, status, onMark }: CommandTestCardProps) {
  const Icon = test.icon

  return (
    <Card
      className={`
      ${status === 'pass' ? 'border-mint bg-mint/5' : ''}
      ${status === 'fail' ? 'border-destructive bg-destructive/5' : ''}
    `}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-foreground" weight="duotone" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-mono text-sm font-medium text-foreground">
                  "{test.command}"
                </div>
                <div className="text-xs text-muted-foreground mt-1">{test.description}</div>
              </div>
              <div className="flex items-center gap-1">
                {test.requiresConfirmation && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                    <Warning className="w-3 h-3 mr-1" />
                    Confirm
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant={status === 'pass' ? 'default' : 'outline'}
                onClick={() => onMark(test.command, 'pass')}
                className="flex-1"
              >
                <CheckCircle
                  className="w-4 h-4 mr-1"
                  weight={status === 'pass' ? 'fill' : 'regular'}
                />
                Pass
              </Button>
              <Button
                size="sm"
                variant={status === 'fail' ? 'destructive' : 'outline'}
                onClick={() => onMark(test.command, 'fail')}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-1" weight={status === 'fail' ? 'fill' : 'regular'} />
                Fail
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
