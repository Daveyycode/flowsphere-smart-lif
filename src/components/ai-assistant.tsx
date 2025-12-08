import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkle, X, PaperPlaneRight, SpeakerHigh, Gear, Microphone, Activity } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { Device, Automation } from '@/components/devices-automations-view'
import { FamilyMember } from '@/components/family-view'
import { Notification } from '@/components/notifications-view'
import { ColorTheme } from '@/hooks/use-theme'
import { monitorFamilyGPS, GPSAlert } from '@/lib/gps-monitor'
import { detectExitPhrase } from '@/lib/voice-commands'
import { GroqAudioRecorder, groqSpeechToText, speakWithGroq, supportsAudioRecording } from '@/lib/groq-voice'
import { processCommand as processAICommand } from '@/lib/api/openai'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AIAssistantProps {
  onTabChange?: (tab: 'dashboard' | 'devices' | 'family' | 'notifications' | 'settings' | 'subscription' | 'terms' | 'privacy' | 'prayer' | 'resources' | 'meeting-notes' | 'permissions' | 'traffic' | 'ai-voice') => void
  onDeviceUpdate?: (id: string, updates: Partial<Device>) => void
  onDndToggle?: (enabled: boolean) => void
  onAddDevice?: (device: Omit<Device, 'id'>) => void
  onToggleAutomation?: (id: string, isActive: boolean) => void
  onAddAutomation?: (automation: Omit<Automation, 'id'>) => void
  onDeleteAutomation?: (id: string) => void
  onMarkNotificationRead?: (id: string) => void
  onDeleteNotification?: (id: string) => void
  onEmergencyOverrideChange?: (value: number) => void
  onSubscriptionChange?: (plan: 'basic' | 'pro' | 'gold' | 'family') => void
  onThemeChange?: (theme: ColorTheme) => void
  onThemeModeToggle?: () => void
  devices?: Device[]
  automations?: Automation[]
  familyMembers?: FamilyMember[]
  notifications?: Notification[]
  dndEnabled?: boolean
  emergencyOverride?: number
  subscription?: 'basic' | 'pro' | 'gold' | 'family'
  currentTheme?: ColorTheme
  currentThemeMode?: 'light' | 'dark'
}

const VOICE_OPTIONS = [
  { value: 'female-warm', label: 'Nova (Female, Warm)', description: 'Friendly and conversational' },
  { value: 'male-natural', label: 'Onyx (Male, Natural)', description: 'Deep and authoritative' },
  { value: 'female-bright', label: 'Alloy (Female, Bright)', description: 'Energetic and clear' },
  { value: 'male-calm', label: 'Echo (Male, Calm)', description: 'Smooth and reassuring' },
  { value: 'female-professional', label: 'Shimmer (Female, Professional)', description: 'Polished and confident' },
  { value: 'neutral-friendly', label: 'Fable (Neutral, Friendly)', description: 'Warm and approachable' },
  { value: 'female-british', label: 'Emma (Female, British)', description: 'Elegant and sophisticated' },
  { value: 'male-australian', label: 'Jack (Male, Australian)', description: 'Casual and friendly' },
  { value: 'female-energetic', label: 'Zoe (Female, Energetic)', description: 'Upbeat and lively' },
  { value: 'male-deep', label: 'Marcus (Male, Deep)', description: 'Rich and commanding' }
]

export function AIAssistant({ 
  onTabChange, 
  onDeviceUpdate,
  onDndToggle,
  onAddDevice,
  onToggleAutomation,
  onAddAutomation,
  onDeleteAutomation,
  onMarkNotificationRead,
  onDeleteNotification,
  onEmergencyOverrideChange,
  onSubscriptionChange,
  onThemeChange,
  onThemeModeToggle,
  devices = [],
  automations = [],
  familyMembers = [],
  notifications = [],
  dndEnabled = false,
  emergencyOverride = 3,
  subscription = 'basic',
  currentTheme = 'neon-noir',
  currentThemeMode = 'light'
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your FlowSphere AI assistant! I'm here to help you with everything - from controlling your smart home to answering questions and having natural conversations. Just talk to me naturally! Toggle the mic button for hands-free control, or type your messages. I can help with devices, family tracking, schedules, and pretty much anything you need. What can I help you with today?"
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Ref to store pending handoff query
  const pendingHandoffRef = useRef<string | null>(null)
  const handleSendRef = useRef<((overrideInput?: string) => Promise<void>) | null>(null)

  // Listen for handoff events from Email Assistant
  useEffect(() => {
    const handleHandoff = (event: CustomEvent<{ query: string }>) => {
      const { query } = event.detail
      if (query) {
        setIsOpen(true)
        setInput(query)
        pendingHandoffRef.current = query
      }
    }

    window.addEventListener('flowsphere-open-ai-assistant', handleHandoff as EventListener)
    return () => {
      window.removeEventListener('flowsphere-open-ai-assistant', handleHandoff as EventListener)
    }
  }, [])

  // Process pending handoff when panel opens
  useEffect(() => {
    if (isOpen && pendingHandoffRef.current && handleSendRef.current) {
      const query = pendingHandoffRef.current
      pendingHandoffRef.current = null
      // Small delay to ensure UI is ready
      setTimeout(() => {
        handleSendRef.current?.(query)
      }, 300)
    }
  }, [isOpen])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [pendingConfirmation, setPendingConfirmation] = useState<{action: string; command: string} | null>(null)
  
  const [selectedVoice, setSelectedVoice] = useKV<string>('flowsphere-ai-voice', 'female-warm')
  const [voiceEnabled, setVoiceEnabled] = useKV<boolean>('flowsphere-ai-voice-enabled', true)
  const [speechRate, setSpeechRate] = useKV<number>('flowsphere-ai-speech-rate', 0.95)
  const [speechPitch, setSpeechPitch] = useKV<number>('flowsphere-ai-speech-pitch', 1.0)
  const [userName] = useKV<string>('flowsphere-user-name', 'Sarah Johnson')
  const [userEmail] = useKV<string>('flowsphere-user-email', 'sarah@example.com')
  const [gpsMonitoringEnabled, setGpsMonitoringEnabled] = useKV<boolean>('flowsphere-gps-monitoring', true)
  const [lastGpsCheck, setLastGpsCheck] = useKV<string>('flowsphere-last-gps-check', '')
  const [micToggled, setMicToggled] = useState(false)
  const [groqRecorder] = useState(() => new GroqAudioRecorder())
  const [useGroqVoice, setUseGroqVoice] = useState(false)

  // Refs for cleanup - prevent memory leaks
  const timeoutRefs = useRef<NodeJS.Timeout[]>([])
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Detect iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const hasAudioRecording = supportsAudioRecording()

    // Force Groq on iOS/mobile devices (Web Speech API is unreliable there)
    if ((isIOS || isMobile) && hasAudioRecording) {
      setUseGroqVoice(true)
    } else {
      setUseGroqVoice(false)
    }

    return () => {
      // Clear all pending timeouts to prevent memory leaks
      timeoutRefs.current.forEach(id => clearTimeout(id))
      timeoutRefs.current = []

      // Stop speech synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }

      // Stop speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore if already stopped
        }
      }

      if (micToggled) {
        setMicToggled(false)
        setIsListening(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!gpsMonitoringEnabled || !familyMembers || familyMembers.length === 0) {
      return
    }

    const checkGPS = () => {
      const alerts = monitorFamilyGPS(familyMembers, userEmail || 'sarah@example.com', (alert: GPSAlert) => {
        toast.error(`⚠️ GPS Alert: ${alert.memberName} is ${alert.distance}km from home!`, {
          duration: 10000,
        })
        
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `📍 GPS Alert: ${alert.memberName} has moved ${alert.distance}km away from their registered home location. An email notification has been sent to you.`
        }
        setMessages(prev => [...prev, assistantMessage])
      })

      if (alerts.length > 0) {
        setLastGpsCheck(new Date().toISOString())
      }
    }

    checkGPS()
    const interval = setInterval(checkGPS, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [gpsMonitoringEnabled, familyMembers, userEmail, setLastGpsCheck])

  const speakText = (text: string) => {
    if (!voiceEnabled) return
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = speechRate || 0.95
      utterance.pitch = speechPitch || 1.0
      
      const voices = window.speechSynthesis.getVoices()
      
      const voiceMap: Record<string, string[]> = {
        'female-warm': ['Samantha', 'Victoria', 'Microsoft Zira', 'Google US English Female', 'female'],
        'male-natural': ['Alex', 'Daniel', 'Microsoft David', 'Google US English Male', 'male'],
        'female-bright': ['Karen', 'Moira', 'Google UK English Female', 'female'],
        'male-calm': ['Fred', 'Thomas', 'Google UK English Male', 'male'],
        'female-professional': ['Fiona', 'Serena', 'Microsoft Eva', 'female'],
        'neutral-friendly': ['Samantha', 'Tessa', 'female'],
        'female-british': ['Emily', 'Kate', 'Google UK English Female', 'female'],
        'male-australian': ['Gordon', 'Karen', 'male'],
        'female-energetic': ['Vicki', 'Joanna', 'female'],
        'male-deep': ['Bruce', 'Ralph', 'male']
      }
      
      const preferredVoiceNames = voiceMap[selectedVoice || 'female-warm'] || []
      
      let selectedSynthVoice = voices.find(voice => 
        preferredVoiceNames.some(name => voice.name.toLowerCase().includes(name.toLowerCase()))
      )
      
      if (!selectedSynthVoice) {
        selectedSynthVoice = voices.find(voice => voice.lang.startsWith('en'))
      }
      
      if (selectedSynthVoice) {
        utterance.voice = selectedSynthVoice
      }
      
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      
      window.speechSynthesis.speak(utterance)
    }
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice recognition not supported in this browser')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    // Improved settings for better voice recognition
    recognition.continuous = true // Always continuous for better responsiveness
    recognition.interimResults = true // Show what's being heard in real-time
    // Support multilingual: Tagalog with English code-switching
    // tl-PH supports Tagalog/Filipino with common English words mixed in
    recognition.lang = 'tl-PH' // Tagalog (Philippines) - also understands English code-switching
    recognition.maxAlternatives = 3 // Consider multiple interpretations

    recognition.onstart = () => {
      setIsListening(true)
      if (!micToggled) {
        toast.success('🎤 Listening... speak now')
      }
    }

    recognition.onresult = async (event: any) => {
      // Get the most recent result
      const lastResult = event.results[event.results.length - 1]
      const transcript = lastResult[0].transcript.trim()

      // Check for exit phrases (user wants to stop listening)
      if (micToggled && detectExitPhrase(transcript)) {
        toast.success('Voice assistant deactivated. Goodbye!')
        setMicToggled(false)
        setIsListening(false)
        setInterimTranscript('')
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
        return
      }

      // Only process final results (not interim)
      if (!lastResult.isFinal && micToggled) {
        // Show interim results as user speaks
        setInterimTranscript(transcript)
        return
      }

      // Clear interim transcript when we get final result
      setInterimTranscript('')

      // IMPORTANT: Check micToggled state at time of transcript
      const wasMicToggled = micToggled

      if (wasMicToggled) {
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: transcript
        }
        setMessages(prev => [...prev, userMessage])

        setIsLoading(true)
        try {
          const commandResult = await executeCommand(transcript)

          if (commandResult.executed) {
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: commandResult.response
            }
            setMessages(prev => [...prev, assistantMessage])
            speakText(commandResult.response)
          } else {
            // No command matched - use conversational AI
            try {
              const cameras = devices.filter(d => d.type === 'camera')
              const deviceList = devices.map(d => `${d.name} (${d.type}${d.isOn ? ', ON' : ', OFF'})`).join(', ')
              const cameraList = cameras.map(c => `${c.name} (${c.cameraLocation || 'unknown location'}${c.isOn ? ', RECORDING' : ', OFF'})`).join(', ')
              const automationList = automations.map(a => `${a.name} (${a.isActive ? 'active' : 'inactive'})`).join(', ')
              const familyList = familyMembers.map(f => `${f.name} (${f.status})`).join(', ')

              const unreadCount = notifications.filter(n => !n.isRead).length
              const unreadEmails = notifications.filter(n => !n.isRead && n.source.toLowerCase().includes('email'))
              const emailList = unreadEmails.map(e => `"${e.title}" from ${e.source}`).join(', ')

              const context = {
                devices: deviceList || 'No devices',
                cameras: cameraList || 'No cameras',
                automations: automationList || 'No automations',
                family: familyList || 'No family members',
                notifications: `${unreadCount} unread notifications`,
                emails: emailList || 'No unread emails',
                dndEnabled,
                subscription,
                currentTheme,
                currentThemeMode
              }

              const conversationHistory = messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
              }))

              const aiResponse = await processAICommand(transcript, context, conversationHistory)

              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiResponse
              }
              setMessages(prev => [...prev, assistantMessage])
              speakText(aiResponse)
            } catch (aiError) {
              console.error('AI API error:', aiError)
              const response = "I'm here to help! You can ask me things like: control your smart home devices, check on family members, manage notifications, or change app settings. What would you like to do?"
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response
              }
              setMessages(prev => [...prev, assistantMessage])
              speakText(response)
            }
          }
        } catch (error) {
          console.error('AI error:', error)
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "I'm having trouble right now. Please try again."
          }
          setMessages(prev => [...prev, errorMessage])
        } finally {
          setIsLoading(false)
        }
      } else {
        // Not in continuous mode - just put text in input field
        setInput(transcript)
      }
    }

    recognition.onerror = (event: any) => {

      // Handle different error types
      if (event.error === 'no-speech') {
        // User didn't speak, just restart immediately
        if (micToggled) {
          const timeoutId = setTimeout(() => {
            if (micToggled) {
              try {
                recognition.start()
              } catch {
                // Could not restart recognition
              }
            }
          }, 50)
          timeoutRefs.current.push(timeoutId)
        }
      } else if (event.error === 'audio-capture') {
        toast.error('⚠️ Microphone access denied. Please enable microphone permissions.')
        setMicToggled(false)
        setIsListening(false)
      } else if (event.error === 'not-allowed') {
        toast.error('⚠️ Microphone permission not granted')
        setMicToggled(false)
        setIsListening(false)
      } else if (event.error !== 'aborted') {
        console.error('Voice recognition error:', event.error)
        // Try to recover
        if (micToggled) {
          const timeoutId = setTimeout(() => {
            if (micToggled) {
              try {
                recognition.start()
              } catch {
                // Could not restart after error
              }
            }
          }, 500)
          timeoutRefs.current.push(timeoutId)
        }
      }
    }

    recognition.onend = () => {
      if (micToggled) {
        // Automatically restart immediately for continuous listening
        const timeoutId = setTimeout(() => {
          if (micToggled) {
            try {
              recognition.start()
            } catch {
              // Recognition already started
            }
          }
        }, 50)
        timeoutRefs.current.push(timeoutId)
      } else {
        setIsListening(false)
      }
    }

    recognition.start()
  }

  const startGroqVoiceRecognition = async () => {
    try {
      setIsListening(true)
      toast.success('🎤 Listening... Speak now! (Auto-sends after 3s silence)')

      // Set up silence detection callback - auto-stop when user finishes speaking
      groqRecorder.setOnSilenceDetected(async () => {
        if (groqRecorder.isRecording() && micToggled) {
          await stopGroqVoiceRecognition()
        }
      })

      // Configure for 3 second silence detection
      groqRecorder.configureSilenceDetection(15, 3000)

      // Start recording with VAD enabled
      await groqRecorder.startRecording(true)

      // Safety timeout - auto-stop after 30 seconds max to prevent indefinite recording
      const timeoutId = setTimeout(async () => {
        if (groqRecorder.isRecording() && micToggled) {
          await stopGroqVoiceRecognition()
        }
      }, 30000) // 30 seconds max
      timeoutRefs.current.push(timeoutId)

    } catch (error) {
      console.error('Error starting Groq recording:', error)
      toast.error('Could not start recording. Please check microphone permissions.')
      setIsListening(false)
    }
  }

  const stopGroqVoiceRecognition = async () => {
    try {
      if (!groqRecorder.isRecording()) {
        return
      }

      toast.info('Processing speech...')

      // Stop recording and get audio blob
      const audioBlob = await groqRecorder.stopRecording()

      // Transcribe with Groq
      const transcript = await groqSpeechToText(audioBlob)

      if (!transcript || transcript.trim().length === 0) {
        toast.error('Could not understand speech. Please try again.')
        return
      }

      // IMPORTANT: Capture micToggled state at time of transcript
      const wasMicToggled = micToggled

      // Check for exit phrases
      if (wasMicToggled && detectExitPhrase(transcript)) {
        toast.success('Voice assistant deactivated. Goodbye!')
        setMicToggled(false)
        setIsListening(false)
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
        return
      }

      if (wasMicToggled) {
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: transcript
        }
        setMessages(prev => [...prev, userMessage])

        setIsLoading(true)
        try {
          const commandResult = await executeCommand(transcript)

          if (commandResult.executed) {
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: commandResult.response
            }
            setMessages(prev => [...prev, assistantMessage])

            // Use Groq TTS for response
            try {
              await speakWithGroq(commandResult.response, 'nova')
            } catch (ttsError) {
              console.error('Groq TTS error:', ttsError)
              // Fallback to browser TTS if Groq fails
              speakText(commandResult.response)
            }
          } else {
            // No command matched - use conversational AI
            try {
              const cameras = devices.filter(d => d.type === 'camera')
              const deviceList = devices.map(d => `${d.name} (${d.type}${d.isOn ? ', ON' : ', OFF'})`).join(', ')
              const cameraList = cameras.map(c => `${c.name} (${c.cameraLocation || 'unknown location'}${c.isOn ? ', RECORDING' : ', OFF'})`).join(', ')
              const automationList = automations.map(a => `${a.name} (${a.isActive ? 'active' : 'inactive'})`).join(', ')
              const familyList = familyMembers.map(f => `${f.name} (${f.status})`).join(', ')

              const unreadCount = notifications.filter(n => !n.isRead).length
              const unreadEmails = notifications.filter(n => !n.isRead && n.source.toLowerCase().includes('email'))
              const emailList = unreadEmails.map(e => `"${e.title}" from ${e.source}`).join(', ')

              const context = {
                devices: deviceList || 'No devices',
                cameras: cameraList || 'No cameras',
                automations: automationList || 'No automations',
                family: familyList || 'No family members',
                notifications: `${unreadCount} unread notifications`,
                emails: emailList || 'No unread emails',
                dndEnabled,
                subscription,
                currentTheme,
                currentThemeMode
              }

              const conversationHistory = messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
              }))

              const aiResponse = await processAICommand(transcript, context, conversationHistory)

              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiResponse
              }
              setMessages(prev => [...prev, assistantMessage])

              try {
                await speakWithGroq(aiResponse, 'nova')
              } catch (ttsError) {
                speakText(aiResponse)
              }
            } catch (aiError) {
              console.error('AI API error:', aiError)
              const response = "I'm here to help! You can ask me things like: control your smart home devices, check on family members, manage notifications, or change app settings. What would you like to do?"
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response
              }
              setMessages(prev => [...prev, assistantMessage])

              try {
                await speakWithGroq(response, 'nova')
              } catch (ttsError) {
                speakText(response)
              }
            }
          }
        } catch (error) {
          console.error('AI error:', error)
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "Give me just a moment. Could you try saying that again?"
          }
          setMessages(prev => [...prev, errorMessage])
        } finally {
          setIsLoading(false)
        }

        // Restart recording for continuous listening
        if (micToggled) {
          setTimeout(() => {
            if (micToggled) {
              startGroqVoiceRecognition()
            }
          }, 500)
        }
      } else {
        setInput(transcript)
      }
    } catch (error) {
      console.error('Error in stopGroqVoiceRecognition:', error)
      toast.error('Error processing speech. Please try again.')
      setIsListening(false)
    }
  }

  const toggleMic = async () => {
    if (micToggled) {
      setMicToggled(false)
      setIsListening(false)

      // Stop Groq recording if active
      if (useGroqVoice && groqRecorder.isRecording()) {
        await stopGroqVoiceRecognition()
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      toast.success('Hands-free mode disabled')
    } else {
      setMicToggled(true)

      // Use Groq or Web Speech API based on availability
      if (useGroqVoice) {
        toast.success('🎤 Hands-free mode active! Speak naturally - I\'ll respond when you pause.')
        await startGroqVoiceRecognition()
      } else {
        toast.success('🎤 Hands-free mode active! Speak naturally - I\'ll respond when you pause.')
        startVoiceRecognition()
      }
    }
  }

  const executeCommand = async (userInput: string): Promise<{ executed: boolean; response: string; needsConfirmation?: boolean; confirmAction?: string }> => {
    const input = userInput.toLowerCase().trim()

    // Helper function to check if input contains any of the keywords
    const containsAny = (keywords: string[]): boolean => {
      return keywords.some(keyword => input.includes(keyword))
    }

    // Helper function to check if input contains all keywords
    const containsAll = (keywords: string[]): boolean => {
      return keywords.every(keyword => input.includes(keyword))
    }

    // Handle pending confirmations
    if (pendingConfirmation && (input.includes('yes') || input.includes('yeah') || input.includes('sure') || input.includes('ok') || input.includes('confirm'))) {
      const action = pendingConfirmation.action
      setPendingConfirmation(null)
      
      if (action === 'check-kids-location') {
        const kids = familyMembers.filter(m => 
          m.name.toLowerCase().includes('alex') || 
          m.name.toLowerCase().includes('emily') ||
          m.status === 'school'
        )
        if (kids.length > 0) {
          const locations = kids.map(k => `${k.name} is ${k.status} at ${k.location || 'unknown location'}`).join('. ')
          return { executed: true, response: `Here are your kids' locations: ${locations}` }
        }
        return { executed: true, response: "No children found in family tracking." }
      }
      
      if (action === 'call-kids') {
        const kids = familyMembers.filter(m => 
          m.name.toLowerCase().includes('alex') || 
          m.name.toLowerCase().includes('emily') ||
          m.status === 'school'
        )
        if (kids.length > 0) {
          const names = kids.map(k => k.name).join(' and ')
          toast.success(`Calling ${names}...`)
          return { executed: true, response: `Calling ${names} now. The call should connect shortly.` }
        }
        return { executed: true, response: "No children found in family tracking." }
      }
      
      if (action === 'call-family') {
        const familyNames = familyMembers.map(m => m.name).join(', ')
        toast.success(`Initiating family call...`)
        return { executed: true, response: `Calling ${familyNames}. Connecting now.` }
      }
      
      if (action.startsWith('call-')) {
        const memberName = action.replace('call-', '')
        toast.success(`Calling ${memberName}...`)
        return { executed: true, response: `Calling ${memberName} now. The call should connect shortly.` }
      }
    }
    
    if (pendingConfirmation && (input.includes('no') || input.includes('cancel') || input.includes('nope') || input.includes('nevermind'))) {
      setPendingConfirmation(null)
      return { executed: true, response: "Okay, I've cancelled that action." }
    }

    // No activation phrase required - commands work directly

    // GREETING DETECTION - Don't trigger commands if it's just a greeting
    const isGreeting = containsAny(['good morning', 'good afternoon', 'good evening', 'goodmorning', 'goodafternoon', 'goodevening', 'hello', 'hi', 'hey', 'greetings'])

    // QUICK NAVIGATION SHORTCUTS - Single word or very short commands
    // Skip if it's part of a greeting (e.g., "good afternoon dashboard" shouldn't open dashboard)
    if (containsAny(['dashboard', 'home', 'main']) && !containsAny(['light', 'device', 'automation']) && !isGreeting) {
      onTabChange?.('dashboard')
      return { executed: true, response: "Opening dashboard." }
    }
    if (containsAny(['family', 'families', 'kid', 'kids', 'children', 'child', 'member', 'members']) && !isGreeting) {
      onTabChange?.('family')
      return { executed: true, response: "Opening family tracking." }
    }
    if (containsAny(['notification', 'notifications', 'email', 'emails', 'message', 'messages', 'inbox', 'mail']) && !isGreeting) {
      onTabChange?.('notifications')
      return { executed: true, response: "Opening notifications." }
    }
    if (containsAny(['device', 'devices', 'smart home', 'smarthome', 'automation', 'automations']) && !isGreeting) {
      onTabChange?.('devices')
      return { executed: true, response: "Opening devices." }
    }
    if (containsAny(['setting', 'settings', 'preference', 'preferences', 'config', 'configuration']) && !isGreeting) {
      onTabChange?.('settings')
      return { executed: true, response: "Opening settings." }
    }
    if (containsAny(['prayer', 'prayers', 'bible', 'scripture', 'devotion', 'devotions']) && !isGreeting) {
      onTabChange?.('prayer')
      return { executed: true, response: "Opening prayer time." }
    }

    // QUICK DEVICE COMMANDS - Handle "lights on", "lights off", etc.
    if (containsAny(['light', 'lights', 'lamp', 'lamps']) && containsAny(['on', 'enable', 'activate', 'start', 'turn on', 'switch on'])) {
      const lights = devices.filter(d => d.type === 'light')
      lights.forEach(light => onDeviceUpdate?.(light.id, { isOn: true }))
      toast.success('All lights turned on')
      return { executed: true, response: "Done! All lights are on." }
    }
    if (containsAny(['light', 'lights', 'lamp', 'lamps']) && containsAny(['off', 'disable', 'deactivate', 'stop', 'turn off', 'switch off'])) {
      const lights = devices.filter(d => d.type === 'light')
      lights.forEach(light => onDeviceUpdate?.(light.id, { isOn: false }))
      toast.success('All lights turned off')
      return { executed: true, response: "Done! All lights are off." }
    }

    // DO NOT DISTURB SHORTCUTS
    if (containsAny(['dnd', 'do not disturb', 'dont disturb', 'quiet', 'silence', 'mute']) && (containsAny(['on', 'enable', 'activate', 'start']) || input.split(' ').length <= 2)) {
      onDndToggle?.(true)
      toast.success('Do Not Disturb enabled')
      return { executed: true, response: "Done! Do Not Disturb is now on." }
    }
    if (containsAny(['dnd', 'do not disturb', 'dont disturb', 'quiet', 'silence', 'mute']) && containsAny(['off', 'disable', 'deactivate', 'stop'])) {
      onDndToggle?.(false)
      toast.success('Do Not Disturb disabled')
      return { executed: true, response: "Done! Do Not Disturb is now off." }
    }

    // SCENE SHORTCUTS
    if (containsAny(['good morning', 'morning', 'wake up', 'wakeup', 'morning scene', 'start day'])) {
      const morningDevices = devices.filter(d =>
        d.name.toLowerCase().includes('bedroom') ||
        d.name.toLowerCase().includes('kitchen') ||
        d.name.toLowerCase().includes('coffee')
      )
      morningDevices.forEach(d => onDeviceUpdate?.(d.id, { isOn: true }))
      toast.success('Good Morning scene activated')
      return { executed: true, response: "Good morning! Your morning scene is active." }
    }
    if (containsAny(['good night', 'goodnight', 'night', 'bedtime', 'sleep', 'going to bed', 'night scene'])) {
      const allLights = devices.filter(d => d.type === 'light')
      const locks = devices.filter(d => d.type === 'lock')
      allLights.forEach(light => onDeviceUpdate?.(light.id, { isOn: false }))
      locks.forEach(lock => onDeviceUpdate?.(lock.id, { isOn: true }))
      toast.success('Good Night scene activated')
      return { executed: true, response: "Good night! All lights off, doors locked. Sleep well!" }
    }

    // THEME MODE SWITCHING - Handle simple commands like "dark mode", "light mode", "bright mode" etc.
    // Check this EARLY before other commands to prioritize theme switching
    if (containsAny(['dark mode', 'dark theme', 'night mode', 'black mode']) ||
        (containsAny(['dark', 'night', 'black']) && containsAny(['mode', 'theme']) && !containsAny(['light', 'bright', 'day']))) {
      if (onThemeModeToggle && currentThemeMode !== 'dark') {
        onThemeModeToggle()
        toast.success('Switched to dark mode')
        return { executed: true, response: "Done! I've switched to dark mode." }
      } else if (currentThemeMode === 'dark') {
        return { executed: true, response: "You're already in dark mode!" }
      }
    }

    if (containsAny(['light mode', 'light theme', 'bright mode', 'bright theme', 'day mode', 'white mode']) ||
        (containsAny(['light', 'bright', 'day', 'white']) && containsAny(['mode', 'theme']) && !containsAny(['dark', 'night']))) {
      if (onThemeModeToggle && currentThemeMode !== 'light') {
        onThemeModeToggle()
        toast.success('Switched to light mode')
        return { executed: true, response: "Done! I've switched to light mode." }
      } else if (currentThemeMode === 'light') {
        return { executed: true, response: "You're already in light mode!" }
      }
    }

    if (containsAny(['check', 'show', 'find', 'where', 'locate', 'location']) && containsAny(['kid', 'kids', 'child', 'children', 'son', 'daughter'])) {
      setPendingConfirmation({ action: 'check-kids-location', command: userInput })
      return {
        executed: true,
        response: "Do you want me to check your kids' locations?",
        needsConfirmation: true,
        confirmAction: 'check-kids-location'
      }
    }

    if (containsAny(['check', 'show', 'monitor']) && containsAny(['gps', 'location', 'tracking']) && containsAny(['family', 'member', 'members', 'everyone'])) {
      const alerts = monitorFamilyGPS(familyMembers, userEmail || 'sarah@example.com', (alert: GPSAlert) => {
        toast.error(`⚠️ ${alert.memberName} is ${alert.distance}km from home!`)
      })
      
      if (alerts.length === 0) {
        return { 
          executed: true, 
          response: "All family members are within 1km of their registered home location. No alerts at this time."
        }
      }
      
      const alertMessages = alerts.map(a => 
        `${a.memberName} is ${a.distance}km away from home`
      ).join('. ')
      
      toast.success(`📧 Email notifications sent for ${alerts.length} family member${alerts.length > 1 ? 's' : ''}`)
      
      return { 
        executed: true, 
        response: `GPS check complete! ${alertMessages}. Email notifications have been sent to you.`
      }
    }
    
    if (containsAny(['monitor', 'track', 'tracking', 'watch']) && containsAny(['gps', 'location', 'family', 'member'])) {
      return {
        executed: true,
        response: "GPS monitoring is active! I'll automatically send you email notifications when any family member moves more than 1km from their registered home location. You can check GPS status anytime by saying 'check GPS family members'."
      }
    }

    if (containsAny(['call', 'dial', 'phone', 'ring', 'contact']) && containsAny(['kid', 'kids', 'child', 'children', 'son', 'daughter'])) {
      setPendingConfirmation({ action: 'call-kids', command: userInput })
      return { 
        executed: true, 
        response: "Do you want me to call your kids?",
        needsConfirmation: true,
        confirmAction: 'call-kids'
      }
    }
    
    if (containsAny(['call', 'dial', 'phone', 'ring', 'contact']) && containsAny(['family', 'everyone', 'all members'])) {
      setPendingConfirmation({ action: 'call-family', command: userInput })
      return {
        executed: true,
        response: "Do you want me to call your family members?",
        needsConfirmation: true,
        confirmAction: 'call-family'
      }
    }

    // Call by name
    for (const member of familyMembers) {
      if (containsAny(['call', 'dial', 'phone', 'ring', 'contact']) && input.toLowerCase().includes(member.name.toLowerCase())) {
        setPendingConfirmation({ action: `call-${member.name}`, command: userInput })
        return {
          executed: true,
          response: `Do you want me to call ${member.name}?`,
          needsConfirmation: true,
          confirmAction: `call-${member.name}`
        }
      }
    }

    // Call by relationship
    const relationshipMappings: { [key: string]: string[] } = {
      'husband': ['husband', 'hubby', 'partner', 'spouse', 'my husband'],
      'wife': ['wife', 'partner', 'spouse', 'my wife'],
      'mom': ['mom', 'mother', 'mama', 'mommy', 'my mom', 'my mother'],
      'dad': ['dad', 'father', 'papa', 'daddy', 'my dad', 'my father'],
      'son': ['son', 'boy', 'my son'],
      'daughter': ['daughter', 'girl', 'my daughter'],
      'brother': ['brother', 'bro', 'my brother'],
      'sister': ['sister', 'sis', 'my sister']
    }

    if (containsAny(['call', 'dial', 'phone', 'ring', 'contact'])) {
      // Check if user is trying to call by relationship
      let requestedRelationship: string | null = null
      for (const [relation, keywords] of Object.entries(relationshipMappings)) {
        if (keywords.some(keyword => input.includes(keyword))) {
          requestedRelationship = relation
          break
        }
      }

      if (requestedRelationship) {
        // User is trying to call by relationship, look for matching family member
        for (const member of familyMembers) {
          const memberRelation = member.relationship?.toLowerCase() || ''

          if (memberRelation.includes(requestedRelationship) ||
              (requestedRelationship === 'husband' && memberRelation === 'spouse') ||
              (requestedRelationship === 'wife' && memberRelation === 'spouse')) {
            setPendingConfirmation({ action: `call-${member.name}`, command: userInput })
            return {
              executed: true,
              response: `Do you want me to call ${member.name}?`,
              needsConfirmation: true,
              confirmAction: `call-${member.name}`
            }
          }
        }

        // No matching family member found
        return {
          executed: true,
          response: `I couldn't find a family member with that relationship in your family list. You can add them in the Family tab or try calling by name.`
        }
      }
    }
    
    if (containsAny(['scene', 'routine', 'automation', 'activate', 'run'])) {
      if (containsAny(['good morning', 'morning', 'wake up', 'wakeup'])) {
        const morningDevices = devices.filter(d => 
          d.name.toLowerCase().includes('bedroom') || 
          d.name.toLowerCase().includes('kitchen') ||
          d.name.toLowerCase().includes('coffee')
        )
        morningDevices.forEach(d => onDeviceUpdate?.(d.id, { isOn: true }))
        toast.success('Good Morning scene activated')
        return { executed: true, response: "Good morning! I've activated your morning scene - bedroom lights on, kitchen ready, and coffee brewing!" }
      }
      
      if (containsAny(['good night', 'goodnight', 'night', 'bedtime', 'sleep', 'going to bed'])) {
        const allLights = devices.filter(d => d.type === 'light')
        const locks = devices.filter(d => d.type === 'lock')
        allLights.forEach(light => onDeviceUpdate?.(light.id, { isOn: false }))
        locks.forEach(lock => onDeviceUpdate?.(lock.id, { isOn: true }))
        toast.success('Good Night scene activated')
        return { executed: true, response: "Good night! All lights are off and doors are locked. Sleep well!" }
      }
      
      if (containsAny(['movie', 'cinema', 'film', 'watch', 'tv', 'television'])) {
        const livingRoomLights = devices.filter(d => d.type === 'light' && d.room?.toLowerCase().includes('living'))
        livingRoomLights.forEach(light => onDeviceUpdate?.(light.id, { isOn: true, brightness: 20 }))
        toast.success('Movie scene activated')
        return { executed: true, response: "Movie scene activated! Living room lights dimmed to 20%. Enjoy your movie!" }
      }
      
      if (containsAny(['away', 'leaving', 'vacation', 'gone', 'out', 'away mode', 'leave home'])) {
        const allLights = devices.filter(d => d.type === 'light')
        const locks = devices.filter(d => d.type === 'lock')
        const thermostat = devices.find(d => d.type === 'thermostat')
        allLights.forEach(light => onDeviceUpdate?.(light.id, { isOn: false }))
        locks.forEach(lock => onDeviceUpdate?.(lock.id, { isOn: true }))
        if (thermostat) onDeviceUpdate?.(thermostat.id, { temperature: 68 })
        toast.success('Away scene activated')
        return { executed: true, response: "Away scene activated! All lights off, doors locked, and temperature set to eco mode." }
      }
      
      if (containsAny(['home', 'arrive', 'arriving', 'coming home', 'im home', "i'm home", 'back home', 'welcome home'])) {
        const entryLights = devices.filter(d => d.type === 'light' && (d.room?.toLowerCase().includes('entry') || d.room?.toLowerCase().includes('living')))
        const thermostat = devices.find(d => d.type === 'thermostat')
        entryLights.forEach(light => onDeviceUpdate?.(light.id, { isOn: true }))
        if (thermostat) onDeviceUpdate?.(thermostat.id, { temperature: 72, isOn: true })
        toast.success('Welcome Home scene activated')
        return { executed: true, response: "Welcome home! Entry lights on and temperature adjusting to 72°F." }
      }
    }
    
    if (containsAny(['room', 'in the', 'at the', 'living', 'bedroom', 'kitchen', 'bathroom', 'office', 'dining', 'garage', 'basement'])) {
      const rooms = ['living room', 'bedroom', 'kitchen', 'bathroom', 'office', 'dining room', 'garage', 'basement']

      for (const room of rooms) {
        if (input.includes(room)) {
          const turnOn = containsAny(['turn on', 'on', 'enable', 'activate', 'start', 'switch on'])
          const turnOff = containsAny(['turn off', 'off', 'disable', 'deactivate', 'stop', 'switch off'])

          if (containsAny(['light', 'lights', 'lamp', 'lamps', 'lighting'])) {
            const roomLights = devices.filter(d => d.type === 'light' && d.room?.toLowerCase().includes(room))
            if (roomLights.length > 0) {
              if (turnOn) {
                roomLights.forEach(light => onDeviceUpdate?.(light.id, { isOn: true }))
                toast.success(`${room} lights turned on`)
                return { executed: true, response: `Done! I've turned on all lights in the ${room}.` }
              } else if (turnOff) {
                roomLights.forEach(light => onDeviceUpdate?.(light.id, { isOn: false }))
                toast.success(`${room} lights turned off`)
                return { executed: true, response: `Done! I've turned off all lights in the ${room}.` }
              }
            }
          }
          
          if (containsAny(['everything', 'all devices', 'all', 'every device'])) {
            const roomDevices = devices.filter(d => d.room?.toLowerCase().includes(room))
            if (roomDevices.length > 0) {
              if (turnOn) {
                roomDevices.forEach(device => onDeviceUpdate?.(device.id, { isOn: true }))
                toast.success(`All ${room} devices turned on`)
                return { executed: true, response: `Done! I've turned on all devices in the ${room}.` }
              } else if (turnOff) {
                roomDevices.forEach(device => onDeviceUpdate?.(device.id, { isOn: false }))
                toast.success(`All ${room} devices turned off`)
                return { executed: true, response: `Done! I've turned off all devices in the ${room}.` }
              }
            }
          }
        }
      }
    }
    
    // COLOR THEME SWITCHING (Candy Shop, Neon Noir, Aurora, etc.)
    if (containsAny(['theme', 'color scheme', 'appearance', 'change color', 'color', 'style', 'look'])) {
      const themeMap: Record<string, ColorTheme> = {
        'candy shop': 'candy-shop',
        'candy': 'candy-shop',
        'candyshop': 'candy-shop',
        'neon noir': 'neon-noir',
        'neon': 'neon-noir',
        'aurora borealis': 'aurora-borealis',
        'aurora': 'aurora-borealis',
        'cosmic latte': 'cosmic-latte',
        'cosmic': 'cosmic-latte',
        'latte': 'cosmic-latte',
        'black gray': 'black-gray',
        'gray': 'black-gray',
        'grey': 'black-gray',
        'monochrome': 'black-gray'
      }
      
      for (const [keyword, themeValue] of Object.entries(themeMap)) {
        if (input.includes(keyword)) {
          if (onThemeChange) {
            onThemeChange(themeValue)
            const themeName = themeValue.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            toast.success(`Theme changed to ${themeName}`)
            return { executed: true, response: `Done! I've changed the theme to ${themeName}. You should see the new colors now!` }
          }
        }
      }
    }
    
    if (containsAny(['mark', 'set', 'make']) && containsAny(['email', 'mail', 'message']) && containsAny(['read', 'as read', 'seen'])) {
      const unreadEmails = notifications.filter(n => !n.isRead && n.source.toLowerCase().includes('email'))
      
      if (unreadEmails.length === 0) {
        return { executed: true, response: "There are no unread emails to mark as read." }
      }
      
      let markedCount = 0
      
      for (const email of unreadEmails) {
        const emailTitleLower = email.title.toLowerCase()
        const emailSourceLower = email.source.toLowerCase()
        
        if (input.includes('all')) {
          onMarkNotificationRead?.(email.id)
          markedCount++
        } else if (emailTitleLower.split(' ').some(word => input.includes(word) && word.length > 3)) {
          onMarkNotificationRead?.(email.id)
          markedCount++
        } else if (emailSourceLower.split(' ').some(word => input.includes(word) && word.length > 3)) {
          onMarkNotificationRead?.(email.id)
          markedCount++
        }
      }
      
      if (markedCount > 0) {
        toast.success(`Marked ${markedCount} email${markedCount > 1 ? 's' : ''} as read`)
        return { 
          executed: true, 
          response: markedCount === 1 
            ? `Done! I've marked that email as read.`
            : `Done! I've marked ${markedCount} emails as read.`
        }
      }
      
      return { executed: false, response: '' }
    }
    
    if (containsAny(['read', 'show', 'tell', 'what', 'check']) && containsAny(['email', 'mail', 'message', 'inbox'])) {
      const unreadEmails = notifications.filter(n => !n.isRead && n.source.toLowerCase().includes('email'))
      
      if (unreadEmails.length === 0) {
        return { executed: true, response: "You have no unread emails at the moment. Your inbox is clear!" }
      }
      
      let emailsToRead = unreadEmails
      
      if (input.includes('all')) {
        const emailDetails = emailsToRead.map(email => `"${email.title}" from ${email.source}`).join('. ')
        const response = `You have ${emailsToRead.length} unread email${emailsToRead.length > 1 ? 's' : ''}. ${emailDetails}`
        return { executed: true, response }
      }
      
      for (const email of unreadEmails) {
        const emailTitleLower = email.title.toLowerCase()
        const emailSourceLower = email.source.toLowerCase()
        
        if (emailTitleLower.split(' ').some(word => input.includes(word) && word.length > 3)) {
          const response = `Email from ${email.source}: "${email.title}"`
          return { executed: true, response }
        } else if (emailSourceLower.split(' ').some(word => input.includes(word) && word.length > 3)) {
          emailsToRead = unreadEmails.filter(e => e.source.toLowerCase().includes(emailSourceLower))
          const emailDetails = emailsToRead.map(e => `"${e.title}"`).join(', ')
          const response = `You have ${emailsToRead.length} email${emailsToRead.length > 1 ? 's' : ''} from ${email.source}: ${emailDetails}`
          return { executed: true, response }
        }
      }
      
      const emailSubjects = emailsToRead.map(email => `"${email.title}" from ${email.source}`).join('. ')
      const response = emailsToRead.length === 1 
        ? `You have 1 unread email: ${emailSubjects}`
        : `You have ${emailsToRead.length} unread emails. ${emailSubjects}`
      
      return { executed: true, response }
    }
    
    if (containsAny(['turn on', 'turn off', 'switch on', 'switch off', 'enable', 'disable', 'activate', 'deactivate', 'start', 'stop'])) {
      const turnOn = containsAny(['turn on', 'switch on', 'enable', 'activate', 'start', 'on'])

      if (containsAny(['dnd', 'do not disturb', 'dont disturb', 'quiet mode'])) {
        onDndToggle?.(turnOn)
        toast.success(`Do Not Disturb ${turnOn ? 'enabled' : 'disabled'}`)
        return { executed: true, response: `Done! I've ${turnOn ? 'enabled' : 'disabled'} Do Not Disturb mode for you.` }
      }
      
      for (const device of devices) {
        const deviceNameLower = device.name.toLowerCase()
        if (input.includes(deviceNameLower)) {
          onDeviceUpdate?.(device.id, { isOn: turnOn })
          toast.success(`${device.name} ${turnOn ? 'turned on' : 'turned off'}`)
          return { executed: true, response: `Done! I've turned ${turnOn ? 'on' : 'off'} ${device.name}.` }
        }
      }
      
      if (containsAny(['light', 'lights', 'lamp', 'lamps', 'lighting', 'bulb', 'bulbs'])) {
        const lights = devices.filter(d => d.type === 'light')
        lights.forEach(light => onDeviceUpdate?.(light.id, { isOn: turnOn }))
        toast.success(`All lights ${turnOn ? 'turned on' : 'turned off'}`)
        return { executed: true, response: `Done! I've turned ${turnOn ? 'on' : 'off'} all lights.` }
      }
      
      if (containsAny(['thermostat', 'temperature', 'heating', 'cooling', 'heat', 'cool', 'ac', 'air conditioning'])) {
        const thermostat = devices.find(d => d.type === 'thermostat')
        if (thermostat) {
          onDeviceUpdate?.(thermostat.id, { isOn: turnOn })
          toast.success(`Thermostat ${turnOn ? 'turned on' : 'turned off'}`)
          return { executed: true, response: `Done! I've turned ${turnOn ? 'on' : 'off'} the thermostat.` }
        }
      }
    }
    
    if (containsAny(['start recording', 'stop recording', 'record', 'recording', 'camera'])) {
      const startRecording = containsAny(['start', 'begin', 'enable', 'activate', 'turn on'])
      const cameras = devices.filter(d => d.type === 'camera')

      for (const camera of cameras) {
        const cameraNameLower = camera.name.toLowerCase()
        if (input.includes(cameraNameLower)) {
          onDeviceUpdate?.(camera.id, { isOn: startRecording })
          toast.success(`${camera.name} ${startRecording ? 'started' : 'stopped'} recording`)
          return { executed: true, response: `Done! ${camera.name} is now ${startRecording ? 'recording' : 'stopped'}.` }
        }
      }
      
      if (containsAny(['all cameras', 'all camera', 'every camera', 'cameras'])) {
        cameras.forEach(camera => onDeviceUpdate?.(camera.id, { isOn: startRecording }))
        toast.success(`All cameras ${startRecording ? 'started' : 'stopped'} recording`)
        return { executed: true, response: `Done! All cameras are now ${startRecording ? 'recording' : 'stopped'}.` }
      }
    }
    
    if (containsAny(['activate automation', 'deactivate automation', 'run automation', 'automation', 'start automation', 'stop automation'])) {
      const activate = containsAny(['activate', 'run', 'start', 'enable', 'turn on'])
      
      for (const automation of automations) {
        const automationNameLower = automation.name.toLowerCase()
        if (input.includes(automationNameLower)) {
          onToggleAutomation?.(automation.id, activate)
          toast.success(`${automation.name} ${activate ? 'activated' : 'deactivated'}`)
          return { executed: true, response: `Done! ${automation.name} is now ${activate ? 'active' : 'inactive'}.` }
        }
      }
    }
    
    if (containsAny(['delete automation', 'remove automation', 'delete', 'remove'])) {
      for (const automation of automations) {
        const automationNameLower = automation.name.toLowerCase()
        if (input.includes(automationNameLower)) {
          onDeleteAutomation?.(automation.id)
          toast.success(`${automation.name} deleted`)
          return { executed: true, response: `Done! I've deleted ${automation.name}.` }
        }
      }
    }
    
    if (containsAny(['clear notifications', 'delete all notifications', 'clear all', 'remove all notifications', 'delete notifications'])) {
      notifications.forEach(notif => onDeleteNotification?.(notif.id))
      toast.success('All notifications cleared')
      return { executed: true, response: "Done! I've cleared all your notifications." }
    }
    
    if (containsAny(['mark all read', 'read all notifications', 'mark all', 'read all'])) {
      notifications.forEach(notif => onMarkNotificationRead?.(notif.id))
      toast.success('All notifications marked as read')
      return { executed: true, response: "Done! All notifications are marked as read." }
    }
    
    if (containsAny(['emergency override', 'set emergency', 'emergency', 'override'])) {
      const numMatch = input.match(/\d+/)
      if (numMatch) {
        const value = parseInt(numMatch[0])
        onEmergencyOverrideChange?.(value)
        toast.success(`Emergency override set to ${value} contacts`)
        return { executed: true, response: `Done! Emergency override is now set to ${value} contacts.` }
      }
    }
    
    if (containsAny(['upgrade', 'change plan', 'subscription', 'plan', 'downgrade', 'switch plan'])) {
      if (containsAny(['pro']) && !containsAny(['family'])) {
        onSubscriptionChange?.('pro')
        toast.success('Upgraded to Pro plan')
        return { executed: true, response: "Done! You're now on the Pro plan." }
      }
      if (containsAny(['gold', 'premium'])) {
        onSubscriptionChange?.('gold')
        toast.success('Upgraded to Gold plan')
        return { executed: true, response: "Done! You're now on the Gold plan with premium features!" }
      }
      if (containsAny(['family', 'team'])) {
        onSubscriptionChange?.('family')
        toast.success('Upgraded to Family / Team plan')
        return { executed: true, response: "Done! You're now on the Family / Team plan." }
      }
      if (containsAny(['basic', 'downgrade', 'free'])) {
        onSubscriptionChange?.('basic')
        toast.success('Changed to Basic plan')
        return { executed: true, response: "Done! You're now on the Basic plan." }
      }
    }
    
    if (containsAny(['add device', 'create device', 'new device', 'add new'])) {
      const deviceTypes = ['light', 'lock', 'thermostat', 'camera', 'speaker']
      for (const type of deviceTypes) {
        if (input.includes(type)) {
          const nameMatch = input.match(new RegExp(`${type}\\s+(?:called|named)?\\s*([\\w\\s]+)`, 'i'))
          const deviceName = nameMatch ? nameMatch[1].trim() : `New ${type.charAt(0).toUpperCase() + type.slice(1)}`
          
          onAddDevice?.({
            name: deviceName,
            type: type as Device['type'],
            status: 'online',
            isOn: false,
            room: 'Living Room'
          })
          toast.success(`${deviceName} added`)
          return { executed: true, response: `Done! I've added ${deviceName} to your devices.` }
        }
      }
    }
    
    if (containsAny(['set temperature', 'change temperature', 'temperature', 'set temp', 'make it', 'adjust temperature'])) {
      const tempMatch = input.match(/\d+/)
      if (tempMatch) {
        const temp = parseInt(tempMatch[0])
        const thermostat = devices.find(d => d.type === 'thermostat')
        if (thermostat) {
          onDeviceUpdate?.(thermostat.id, { temperature: temp, isOn: true })
          toast.success(`Temperature set to ${temp}°F`)
          return { executed: true, response: `Done! I've set the temperature to ${temp}°F.` }
        }
      }
    }
    
    if (containsAny(['dim', 'brightness', 'bright', 'set brightness', 'adjust brightness', 'dimmer'])) {
      const brightnessMatch = input.match(/\d+/)
      if (brightnessMatch) {
        const brightness = parseInt(brightnessMatch[0])
        const lights = devices.filter(d => d.type === 'light')
        lights.forEach(light => onDeviceUpdate?.(light.id, { brightness, isOn: true }))
        toast.success(`Lights dimmed to ${brightness}%`)
        return { executed: true, response: `Done! I've set the lights to ${brightness}% brightness.` }
      }
    }
    
    if (containsAny(['open', 'go to', 'show', 'navigate', 'display', 'view', 'see'])) {
      if (containsAny(['dashboard', 'home', 'main'])) {
        onTabChange?.('dashboard')
        return { executed: true, response: "Opening your dashboard now." }
      }
      if (containsAny(['device', 'devices', 'smart home', 'smarthome'])) {
        onTabChange?.('devices')
        return { executed: true, response: "Opening your devices." }
      }
      if (containsAny(['family', 'families', 'kid', 'kids', 'member', 'members'])) {
        onTabChange?.('family')
        return { executed: true, response: "Opening family tracking." }
      }
      if (containsAny(['notification', 'notifications', 'email', 'emails', 'mail', 'message', 'messages', 'inbox'])) {
        onTabChange?.('notifications')
        return { executed: true, response: "Opening your notifications and emails." }
      }
      if (containsAny(['camera', 'cameras', 'cctv', 'automation', 'automations', 'routine', 'routines'])) {
        onTabChange?.('devices')
        return { executed: true, response: "Opening devices & automations." }
      }
      if (containsAny(['setting', 'settings', 'preference', 'preferences', 'config'])) {
        onTabChange?.('settings')
        return { executed: true, response: "Opening settings." }
      }
      if (containsAny(['prayer', 'prayers', 'bible', 'scripture', 'devotion'])) {
        onTabChange?.('prayer')
        return { executed: true, response: "Opening prayer & Bible time." }
      }
      if (containsAny(['traffic', 'commute', 'route', 'drive'])) {
        onTabChange?.('traffic')
        return { executed: true, response: "Opening traffic updates." }
      }
      if (containsAny(['weather', 'forecast', 'temperature', 'climate'])) {
        onTabChange?.('dashboard')
        return { executed: true, response: "Opening weather information on your dashboard." }
      }
      if (containsAny(['calendar', 'schedule', 'events', 'appointments'])) {
        onTabChange?.('dashboard')
        return { executed: true, response: "Opening your calendar on the dashboard." }
      }
      if (containsAny(['sleep', 'sleep tracker', 'sleep guardian', 'bedtime'])) {
        onTabChange?.('dashboard')
        return { executed: true, response: "Opening sleep information on your dashboard." }
      }
      if (containsAny(['resource', 'resources', 'help', 'support'])) {
        onTabChange?.('resources')
        return { executed: true, response: "Opening resources." }
      }
      if (containsAny(['meeting', 'meetings', 'notes', 'meeting notes'])) {
        onTabChange?.('meeting-notes')
        return { executed: true, response: "Opening meeting notes." }
      }
      if (containsAny(['permission', 'permissions', 'access'])) {
        onTabChange?.('permissions')
        return { executed: true, response: "Opening permissions settings." }
      }
      if (containsAny(['subscription', 'plan', 'billing'])) {
        onTabChange?.('subscription')
        return { executed: true, response: "Opening subscription management." }
      }
    }
    
    return { executed: false, response: '' }
  }

  const handleSend = async (overrideInput?: string) => {
    const userInput = overrideInput || input
    if (!userInput.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput
    }

    setMessages(prev => [...prev, userMessage])
    if (!overrideInput) {
      setInput('')
    }
    setIsLoading(true)

    try {
      const commandResult = await executeCommand(userInput)
      
      if (commandResult.executed) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: commandResult.response
        }
        setMessages(prev => [...prev, assistantMessage])
        speakText(commandResult.response)
      } else {
        // No command matched - use conversational AI
        const cameras = devices.filter(d => d.type === 'camera')
        const deviceList = devices.map(d => `${d.name} (${d.type}${d.isOn ? ', ON' : ', OFF'})`).join(', ')
        const cameraList = cameras.map(c => `${c.name} (${c.cameraLocation || 'unknown location'}${c.isOn ? ', RECORDING' : ', OFF'})`).join(', ')
        const automationList = automations.map(a => `${a.name} (${a.isActive ? 'active' : 'inactive'})`).join(', ')
        const familyList = familyMembers.map(f => `${f.name} (${f.status})`).join(', ')

        const unreadCount = notifications.filter(n => !n.isRead).length
        const unreadEmails = notifications.filter(n => !n.isRead && n.source.toLowerCase().includes('email'))
        const emailList = unreadEmails.map(e => `"${e.title}" from ${e.source}`).join(', ')

        // Build context for AI
        const context = {
          devices: deviceList || 'No devices',
          cameras: cameraList || 'No cameras',
          automations: automationList || 'No automations',
          family: familyList || 'No family members',
          notifications: `${unreadCount} unread notifications`,
          emails: emailList || 'No unread emails',
          dndEnabled,
          subscription,
          currentTheme,
          currentThemeMode
        }

        // Convert messages to conversation history
        const conversationHistory = messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }))

        try {
          // Call conversational AI with context and history
          const aiResponse = await processAICommand(userInput, context, conversationHistory)

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: aiResponse
          }

          setMessages(prev => [...prev, assistantMessage])
          speakText(aiResponse)
        } catch (aiError) {
          console.error('AI API error:', aiError)
          // Fallback to friendly response if AI fails
          let response = "I'm here to help with your smart home and family! "

          // Provide context-aware suggestions based on what's available
          if (devices.length > 0) {
            response += `You can say things like "turn on ${devices[0].name}", `
          } else {
            response += `You can try `
          }
          if (familyMembers.length > 0) {
            response += `"check on family", `
          }
          response += `"switch to dark mode", or "show my notifications". What would you like to do?`

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response
          }

          setMessages(prev => [...prev, assistantMessage])
          speakText(response)
        }
      }
    } catch (error) {
      console.error('AI error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Give me just a moment. Could you try that again?"
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Keep handleSendRef updated for handoff functionality
  handleSendRef.current = handleSend

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-light via-blue-mid to-blue-deep shadow-2xl flex items-center justify-center group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{
          boxShadow: [
            '0 0 20px rgba(96, 165, 250, 0.4)',
            '0 0 40px rgba(96, 165, 250, 0.6)',
            '0 0 20px rgba(96, 165, 250, 0.4)',
          ]
        }}
        transition={{
          boxShadow: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        }}
      >
        <Sparkle className="w-7 h-7 sm:w-8 sm:h-8 text-white" weight="fill" />
      </motion.button>

      <AnimatePresence>
        {isOpen && !showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', bounce: 0.3 }}
            className="fixed bottom-32 md:bottom-28 right-3 md:right-6 left-3 md:left-auto z-50 md:w-96"
          >
            <Card className="shadow-2xl border-accent/20 overflow-hidden">
              <div className="bg-gradient-to-r from-accent via-primary to-coral p-3 sm:p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Sparkle className="w-5 h-5 sm:w-6 sm:h-6 text-white" weight="fill" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm sm:text-base">AI Assistant</h3>
                    <p className="text-white/80 text-[10px] sm:text-xs">Always here to help</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isSpeaking && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={stopSpeaking}
                      className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <SpeakerHigh className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" weight="fill" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(true)}
                    className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
                  >
                    <Gear className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-80 sm:h-96 p-3 sm:p-4">
                <div className="space-y-3 sm:space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-blue-mid to-blue-deep text-white'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-xs sm:text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <div className="flex space-x-2">
                          <motion.div
                            className="w-2 h-2 bg-muted-foreground/50 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          />
                          <motion.div
                            className="w-2 h-2 bg-muted-foreground/50 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.div
                            className="w-2 h-2 bg-muted-foreground/50 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {interimTranscript && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-blue-mid/60 to-blue-deep/60 text-white border-2 border-blue-light/50">
                        <div className="flex items-center gap-2">
                          <Microphone className="w-4 h-4 animate-pulse" weight="fill" />
                          <p className="text-xs sm:text-sm italic">{interimTranscript}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border">
                <div className="flex space-x-2">
                  <Button
                    onClick={toggleMic}
                    disabled={isLoading}
                    size="icon"
                    variant={micToggled ? "default" : "outline"}
                    className={micToggled ? 'bg-red-500 hover:bg-red-600 relative overflow-hidden' : ''}
                    title={micToggled ? "Stop hands-free mode" : "Start hands-free mode (auto-responds after you pause)"}
                  >
                    {micToggled ? (
                      <motion.div
                        className="flex items-center justify-center"
                        animate={{
                          scale: [1, 1.3, 1],
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Activity className="w-5 h-5 text-white" weight="bold" />
                      </motion.div>
                    ) : (
                      <Activity className="w-5 h-5" weight="regular" />
                    )}
                  </Button>
                  <Input
                    placeholder={micToggled ? "🎤 Hands-free mode - speak naturally, I'll respond when you pause..." : "Ask me anything..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    disabled={isLoading || micToggled}
                    className="flex-1"
                  />
                  {!micToggled && (
                    <>
                      <Button
                        onClick={startVoiceRecognition}
                        disabled={isLoading || isListening}
                        size="icon"
                        variant="outline"
                        className={isListening ? 'bg-accent/20 border-accent' : ''}
                        title="Voice input (one-time)"
                      >
                        <Microphone className="w-5 h-5" weight={isListening ? 'fill' : 'regular'} />
                      </Button>
                      <Button
                        onClick={() => handleSend()}
                        disabled={isLoading || !input.trim()}
                        size="icon"
                        className="bg-gradient-to-r from-blue-mid to-blue-deep hover:from-blue-mid/90 hover:to-blue-deep/90"
                        title="Send message"
                      >
                        <PaperPlaneRight className="w-5 h-5 text-white" weight="fill" />
                      </Button>
                    </>
                  )}
                </div>
                {micToggled && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    🎤 Continuous listening active - speak naturally, I'll auto-respond
                  </p>
                )}
                {pendingConfirmation && (
                  <div className="mt-2 p-2 bg-accent/10 border border-accent/20 rounded-lg">
                    <p className="text-xs text-accent-foreground text-center">
                      ⚠️ Awaiting confirmation - say "yes" or "no"
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {isOpen && showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', bounce: 0.3 }}
            className="fixed bottom-32 md:bottom-28 right-3 md:right-6 left-3 md:left-auto z-50 md:w-96"
          >
            <Card className="shadow-2xl border-blue-mid/30 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-light via-blue-mid to-blue-deep p-3 sm:p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Gear className="w-5 h-5 sm:w-6 sm:h-6 text-white" weight="fill" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm sm:text-base">Voice Settings</h3>
                    <p className="text-white/80 text-[10px] sm:text-xs">Customize AI voice</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(false)}
                  className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>

              <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="voice-toggle" className="text-sm font-medium">
                    Enable Voice Responses
                  </Label>
                  <Button
                    id="voice-toggle"
                    variant={voiceEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                  >
                    {voiceEnabled ? 'On' : 'Off'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voice-select" className="text-sm font-medium">
                    Voice Character
                  </Label>
                  <Select
                    value={selectedVoice}
                    onValueChange={setSelectedVoice}
                    disabled={!voiceEnabled}
                  >
                    <SelectTrigger id="voice-select">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_OPTIONS.map((voice) => (
                        <SelectItem key={voice.value} value={voice.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{voice.label}</span>
                            <span className="text-xs text-muted-foreground">{voice.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="speech-rate" className="text-sm font-medium">
                      Speech Rate
                    </Label>
                    <span className="text-xs text-muted-foreground">{speechRate?.toFixed(1)}x</span>
                  </div>
                  <Slider
                    id="speech-rate"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={[speechRate || 0.95]}
                    onValueChange={([value]) => setSpeechRate(value)}
                    disabled={!voiceEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="speech-pitch" className="text-sm font-medium">
                      Speech Pitch
                    </Label>
                    <span className="text-xs text-muted-foreground">{speechPitch?.toFixed(1)}x</span>
                  </div>
                  <Slider
                    id="speech-pitch"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={[speechPitch || 1.0]}
                    onValueChange={([value]) => setSpeechPitch(value)}
                    disabled={!voiceEnabled}
                  />
                </div>

                <Button
                  onClick={() => {
                    const selectedVoiceOption = VOICE_OPTIONS.find(v => v.value === selectedVoice)
                    speakText(`Hello! This is ${selectedVoiceOption?.label.split(' ')[0]}. I'm your FlowSphere AI assistant, ready to help you manage your daily flow.`)
                  }}
                  disabled={!voiceEnabled}
                  className="w-full"
                  variant="outline"
                >
                  <SpeakerHigh className="w-4 h-4 mr-2" />
                  Test Voice
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
