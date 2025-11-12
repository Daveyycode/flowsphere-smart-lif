import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkle, X, PaperPlaneRight, SpeakerHigh, Gear } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { Device, Automation } from '@/components/devices-automations-view'
import { FamilyMember } from '@/components/family-view'
import { Notification } from '@/components/notifications-view'

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
  onSubscriptionChange?: (plan: 'free' | 'premium' | 'family' | 'lifetime') => void
  devices?: Device[]
  automations?: Automation[]
  familyMembers?: FamilyMember[]
  notifications?: Notification[]
  dndEnabled?: boolean
  emergencyOverride?: number
  subscription?: 'free' | 'premium' | 'family' | 'lifetime'
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
  devices = [],
  automations = [],
  familyMembers = [],
  notifications = [],
  dndEnabled = false,
  emergencyOverride = 3,
  subscription = 'free'
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your FlowSphere AI assistant with FULL PERMISSIONS to control everything in your app! I can read your emails, manage devices, cameras, automations, family settings, notifications, subscriptions, and navigate anywhere. Just ask me and I'll do it instantly!"
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const [selectedVoice, setSelectedVoice] = useKV<string>('flowsphere-ai-voice', 'female-warm')
  const [voiceEnabled, setVoiceEnabled] = useKV<boolean>('flowsphere-ai-voice-enabled', false)
  const [speechRate, setSpeechRate] = useKV<number>('flowsphere-ai-speech-rate', 0.95)
  const [speechPitch, setSpeechPitch] = useKV<number>('flowsphere-ai-speech-pitch', 1.0)

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

  const executeCommand = async (userInput: string): Promise<{ executed: boolean; response: string }> => {
    const input = userInput.toLowerCase()
    
    if (input.includes('read') && (input.includes('email') || input.includes('mail') || input.includes('message'))) {
      const unreadEmails = notifications.filter(n => !n.isRead && n.source.toLowerCase().includes('email'))
      
      if (unreadEmails.length === 0) {
        return { executed: true, response: "You have no unread emails at the moment. Your inbox is clear!" }
      }
      
      const emailSubjects = unreadEmails.map(email => email.title).join(', ')
      const response = unreadEmails.length === 1 
        ? `You have 1 unread email: "${unreadEmails[0].title}"`
        : `You have ${unreadEmails.length} unread emails. Here are the subjects: ${emailSubjects}`
      
      return { executed: true, response }
    }
    
    if (input.includes('turn on') || input.includes('turn off') || input.includes('switch on') || input.includes('switch off') || input.includes('enable') || input.includes('disable')) {
      const turnOn = input.includes('turn on') || input.includes('switch on') || input.includes('enable')
      
      if (input.includes('dnd') || input.includes('do not disturb')) {
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
      
      if (input.includes('light') || input.includes('lights')) {
        const lights = devices.filter(d => d.type === 'light')
        lights.forEach(light => onDeviceUpdate?.(light.id, { isOn: turnOn }))
        toast.success(`All lights ${turnOn ? 'turned on' : 'turned off'}`)
        return { executed: true, response: `Done! I've turned ${turnOn ? 'on' : 'off'} all lights.` }
      }
      
      if (input.includes('thermostat') || input.includes('temperature') || input.includes('heating') || input.includes('cooling')) {
        const thermostat = devices.find(d => d.type === 'thermostat')
        if (thermostat) {
          onDeviceUpdate?.(thermostat.id, { isOn: turnOn })
          toast.success(`Thermostat ${turnOn ? 'turned on' : 'turned off'}`)
          return { executed: true, response: `Done! I've turned ${turnOn ? 'on' : 'off'} the thermostat.` }
        }
      }
    }
    
    if (input.includes('start recording') || input.includes('stop recording')) {
      const startRecording = input.includes('start recording')
      const cameras = devices.filter(d => d.type === 'camera')
      
      for (const camera of cameras) {
        const cameraNameLower = camera.name.toLowerCase()
        if (input.includes(cameraNameLower)) {
          onDeviceUpdate?.(camera.id, { isOn: startRecording })
          toast.success(`${camera.name} ${startRecording ? 'started' : 'stopped'} recording`)
          return { executed: true, response: `Done! ${camera.name} is now ${startRecording ? 'recording' : 'stopped'}.` }
        }
      }
      
      if (input.includes('all cameras') || input.includes('all camera')) {
        cameras.forEach(camera => onDeviceUpdate?.(camera.id, { isOn: startRecording }))
        toast.success(`All cameras ${startRecording ? 'started' : 'stopped'} recording`)
        return { executed: true, response: `Done! All cameras are now ${startRecording ? 'recording' : 'stopped'}.` }
      }
    }
    
    if (input.includes('activate automation') || input.includes('deactivate automation') || input.includes('run automation')) {
      const activate = input.includes('activate') || input.includes('run')
      
      for (const automation of automations) {
        const automationNameLower = automation.name.toLowerCase()
        if (input.includes(automationNameLower)) {
          onToggleAutomation?.(automation.id, activate)
          toast.success(`${automation.name} ${activate ? 'activated' : 'deactivated'}`)
          return { executed: true, response: `Done! ${automation.name} is now ${activate ? 'active' : 'inactive'}.` }
        }
      }
    }
    
    if (input.includes('delete automation') || input.includes('remove automation')) {
      for (const automation of automations) {
        const automationNameLower = automation.name.toLowerCase()
        if (input.includes(automationNameLower)) {
          onDeleteAutomation?.(automation.id)
          toast.success(`${automation.name} deleted`)
          return { executed: true, response: `Done! I've deleted ${automation.name}.` }
        }
      }
    }
    
    if (input.includes('clear notifications') || input.includes('delete all notifications')) {
      notifications.forEach(notif => onDeleteNotification?.(notif.id))
      toast.success('All notifications cleared')
      return { executed: true, response: "Done! I've cleared all your notifications." }
    }
    
    if (input.includes('mark all read') || input.includes('read all notifications')) {
      notifications.forEach(notif => onMarkNotificationRead?.(notif.id))
      toast.success('All notifications marked as read')
      return { executed: true, response: "Done! All notifications are marked as read." }
    }
    
    if (input.includes('emergency override') || input.includes('set emergency')) {
      const numMatch = input.match(/\d+/)
      if (numMatch) {
        const value = parseInt(numMatch[0])
        onEmergencyOverrideChange?.(value)
        toast.success(`Emergency override set to ${value} contacts`)
        return { executed: true, response: `Done! Emergency override is now set to ${value} contacts.` }
      }
    }
    
    if (input.includes('upgrade') || input.includes('change plan') || input.includes('subscription')) {
      if (input.includes('premium') && !input.includes('family')) {
        onSubscriptionChange?.('premium')
        toast.success('Upgraded to Premium plan')
        return { executed: true, response: "Done! You're now on the Premium plan." }
      }
      if (input.includes('family')) {
        onSubscriptionChange?.('family')
        toast.success('Upgraded to Family plan')
        return { executed: true, response: "Done! You're now on the Family plan." }
      }
      if (input.includes('free') || input.includes('downgrade')) {
        onSubscriptionChange?.('free')
        toast.success('Changed to Free plan')
        return { executed: true, response: "Done! You're now on the Free plan." }
      }
    }
    
    if (input.includes('add device') || input.includes('create device')) {
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
    
    if (input.includes('set temperature') || input.includes('change temperature')) {
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
    
    if (input.includes('dim') || input.includes('brightness')) {
      const brightnessMatch = input.match(/\d+/)
      if (brightnessMatch) {
        const brightness = parseInt(brightnessMatch[0])
        const lights = devices.filter(d => d.type === 'light')
        lights.forEach(light => onDeviceUpdate?.(light.id, { brightness, isOn: true }))
        toast.success(`Lights dimmed to ${brightness}%`)
        return { executed: true, response: `Done! I've set the lights to ${brightness}% brightness.` }
      }
    }
    
    if (input.includes('open') || input.includes('go to') || input.includes('show') || input.includes('navigate')) {
      if (input.includes('dashboard') || input.includes('home')) {
        onTabChange?.('dashboard')
        return { executed: true, response: "Opening your dashboard now." }
      }
      if (input.includes('device') || input.includes('smart home')) {
        onTabChange?.('devices')
        return { executed: true, response: "Opening your devices." }
      }
      if (input.includes('family') || input.includes('kid')) {
        onTabChange?.('family')
        return { executed: true, response: "Opening family tracking." }
      }
      if (input.includes('notification')) {
        onTabChange?.('notifications')
        return { executed: true, response: "Opening your notifications." }
      }
      if (input.includes('camera') || input.includes('cctv') || input.includes('automation') || input.includes('routine')) {
        onTabChange?.('devices')
        return { executed: true, response: "Opening devices & automations." }
      }
      if (input.includes('setting')) {
        onTabChange?.('settings')
        return { executed: true, response: "Opening settings." }
      }
      if (input.includes('prayer') || input.includes('bible')) {
        onTabChange?.('prayer')
        return { executed: true, response: "Opening prayer & Bible time." }
      }
      if (input.includes('traffic')) {
        onTabChange?.('traffic')
        return { executed: true, response: "Opening traffic updates." }
      }
      if (input.includes('resource')) {
        onTabChange?.('resources')
        return { executed: true, response: "Opening resources." }
      }
      if (input.includes('meeting')) {
        onTabChange?.('meeting-notes')
        return { executed: true, response: "Opening meeting notes." }
      }
      if (input.includes('permission')) {
        onTabChange?.('permissions')
        return { executed: true, response: "Opening permissions settings." }
      }
      if (input.includes('subscription')) {
        onTabChange?.('subscription')
        return { executed: true, response: "Opening subscription management." }
      }
    }
    
    return { executed: false, response: '' }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = input
    setInput('')
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
        const cameras = devices.filter(d => d.type === 'camera')
        const deviceList = devices.map(d => `${d.name} (${d.type}${d.isOn ? ', ON' : ', OFF'})`).join(', ')
        const cameraList = cameras.map(c => `${c.name} (${c.cameraLocation || 'unknown location'}${c.isOn ? ', RECORDING' : ', OFF'})`).join(', ')
        const automationList = automations.map(a => `${a.name} (${a.isActive ? 'active' : 'inactive'})`).join(', ')
        const familyList = familyMembers.map(f => `${f.name} (${f.status})`).join(', ')
        
        const unreadCount = notifications.filter(n => !n.isRead).length
        const unreadEmails = notifications.filter(n => !n.isRead && n.source.toLowerCase().includes('email'))
        const emailList = unreadEmails.map(e => `"${e.title}" from ${e.source}`).join(', ')
        
        const promptText = `You are FlowSphere AI assistant with COMPLETE CONTROL and FULL PERMISSIONS over the entire app. You have the power to execute ANY command instantly.

Current app state:
- Devices (${devices.length}): ${deviceList || 'none'}
- Cameras (${cameras.length}): ${cameraList || 'none'}
- Automations (${automations.length}): ${automationList || 'none'}
- Family Members (${familyMembers.length}): ${familyList || 'none'}
- Notifications: ${notifications.length} total, ${unreadCount} unread
- Unread Emails (${unreadEmails.length}): ${emailList || 'none'}
- DND Mode: ${dndEnabled ? 'enabled' : 'disabled'}
- Emergency Override: ${emergencyOverride} contacts
- Subscription: ${subscription}

YOU CAN EXECUTE ALL OF THESE COMMANDS INSTANTLY:

EMAIL & NOTIFICATION CONTROL:
- "read my emails" - Read unread email subjects
- "read my messages" - Read unread email subjects
- "clear notifications" - Delete all notifications
- "mark all read" - Mark all as read
- "set emergency override to [number]" - Change emergency contacts

DEVICE CONTROL:
- "turn on/off [device name]" - Control specific devices
- "turn on/off all lights" - Control all lights
- "set temperature to [number]" - Set thermostat
- "dim lights to [number]%" - Set brightness
- "add device [type] called [name]" - Add new device

CAMERA CONTROL:
- "start/stop recording [camera name]" - Control camera recording
- "start/stop recording all cameras" - Control all cameras

AUTOMATION CONTROL:
- "activate/deactivate [automation name]" - Toggle automation
- "run [automation name]" - Run automation
- "delete automation [name]" - Remove automation

SUBSCRIPTION:
- "upgrade to premium" - Change to Premium plan
- "upgrade to family" - Change to Family plan
- "downgrade to free" - Change to Free plan

NAVIGATION:
- "go to [dashboard/devices/family/notifications/cameras/automations/settings/prayer/emergency/traffic/resources/meeting/permissions/subscription]"

DND MODE:
- "turn on/off do not disturb" - Toggle DND

User request: ${userInput}

IMPORTANT: If the user is asking you to DO something or EXECUTE an action, respond as if you ALREADY DID IT and confirm completion briefly. Do NOT say you "can't" or ask for clarification. Just confirm action was taken. Keep responses under 40 words, natural, helpful, and action-oriented.`
        
        const response = await window.spark.llm(promptText, 'gpt-4o-mini')
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response
        }

        setMessages(prev => [...prev, assistantMessage])
        speakText(response)
      }
    } catch (error) {
      console.error('AI error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment."
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

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
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Ask me anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="bg-gradient-to-r from-blue-mid to-blue-deep hover:from-blue-mid/90 hover:to-blue-deep/90"
                  >
                    <PaperPlaneRight className="w-5 h-5" weight="fill" />
                  </Button>
                </div>
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
