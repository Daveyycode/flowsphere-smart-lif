import { motion, AnimatePresence } from 'framer-motion'
import { User, Bell, Lock, Palette, CreditCard, Info, ShieldCheck, SpeakerHigh, Check, SignOut, TestTube, CaretDown, TextAa, Sliders, Key, Eye, EyeSlash, PencilSimple, At, Link as LinkIcon, Plus, X, DownloadSimple, DeviceMobile } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTheme, ColorTheme, CustomColors, applyColorsRealTime } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { VoiceCommandTester } from '@/components/voice-command-tester'
import { Vault } from '@/components/vault'
import { useState, useRef, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface SettingsViewProps {
  userName: string
  userEmail: string
  subscription: 'basic' | 'pro' | 'gold' | 'family'
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  onNotificationChange: (type: 'email' | 'push' | 'sms', value: boolean) => void
  onUserNameChange: (name: string) => void
  onUserEmailChange: (email: string) => void
  onNavigate: (tab: 'subscription' | 'subscription-monitoring' | 'terms' | 'privacy' | 'permissions' | 'ai-voice') => void
  onLogout?: () => void
}

export function SettingsView({
  userName,
  userEmail,
  subscription,
  notifications,
  onNotificationChange,
  onUserNameChange,
  onUserEmailChange,
  onNavigate,
  onLogout
}: SettingsViewProps) {
  const { mode, colorTheme, customColors, setColorTheme, setCustomColors } = useTheme()
  const [showVoiceTester, setShowVoiceTester] = useState(false)
  const [showVault, setShowVault] = useState(false)
  const [showCustomColors, setShowCustomColors] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showThemeModal, setShowThemeModal] = useState(false)
  const [tapCount, setTapCount] = useState(0)
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const colorSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Account editing state
  const [showAccountEdit, setShowAccountEdit] = useState(false)
  const [editName, setEditName] = useState(userName)
  const [editEmail, setEditEmail] = useState(userEmail)

  // Sync edit fields when dialog opens or props change
  useEffect(() => {
    if (showAccountEdit) {
      setEditName(userName)
      setEditEmail(userEmail)
    }
  }, [showAccountEdit, userName, userEmail])
  const [socialAccounts, setSocialAccounts] = useState(() => {
    const stored = localStorage.getItem('flowsphere-social-accounts')
    return stored ? JSON.parse(stored) : {
      google: '',
      yahoo: '',
      outlook: '',
      facebook: '',
      twitter: '',
      instagram: ''
    }
  })

  // Security sessions state
  const [showSessions, setShowSessions] = useState(false)
  const [sessions] = useState([
    { id: '1', device: 'MacBook Pro', location: 'San Francisco, CA', lastActive: 'Just now', current: true },
    { id: '2', device: 'iPhone 15 Pro', location: 'San Francisco, CA', lastActive: '5 minutes ago', current: false }
  ])

  // Custom API keys state
  const [customApiKeys, setCustomApiKeys] = useState<Array<{id: string, name: string, value: string}>>(() => {
    const stored = localStorage.getItem('flowsphere-custom-api-keys')
    return stored ? JSON.parse(stored) : []
  })
  const [showAddCustomKey, setShowAddCustomKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')

  // API Keys state
  const [openaiApiKey, setOpenaiApiKey] = useState(() =>
    localStorage.getItem('flowsphere-openai-api-key') || ''
  )
  const [anthropicApiKey, setAnthropicApiKey] = useState(() =>
    localStorage.getItem('flowsphere-anthropic-api-key') || ''
  )
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)

  // Font settings state
  const [fontFamily, setFontFamily] = useState(() =>
    localStorage.getItem('flowsphere-font-family') || 'Inter'
  )
  const [fontSize, setFontSize] = useState(() =>
    Number(localStorage.getItem('flowsphere-font-size')) || 16
  )
  const [lineHeight, setLineHeight] = useState(() =>
    Number(localStorage.getItem('flowsphere-line-height')) || 1.5
  )
  const [letterSpacing, setLetterSpacing] = useState(() =>
    Number(localStorage.getItem('flowsphere-letter-spacing')) || 0
  )

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  // Apply font settings in real-time as they change
  useEffect(() => {
    document.documentElement.style.setProperty('--font-family', fontFamily)
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`)
    document.documentElement.style.setProperty('--line-height', lineHeight.toString())
    document.documentElement.style.setProperty('--letter-spacing', `${letterSpacing}px`)
  }, [fontFamily, fontSize, lineHeight, letterSpacing])

  // PWA Install prompt listener
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Initialize custom colors with defaults
  const [tempCustomColors, setTempCustomColors] = useState<CustomColors>(
    customColors || {
      primary: 'oklch(0.65 0.28 328)',
      primaryOpacity: 100,
      accent: 'oklch(0.70 0.25 320)',
      accentOpacity: 100,
      background: mode === 'light' ? 'oklch(0.98 0.005 270)' : 'oklch(0.10 0.02 270)',
      backgroundOpacity: 100,
      foreground: mode === 'light' ? 'oklch(0.12 0.02 270)' : 'oklch(0.98 0.005 270)',
      foregroundOpacity: 100,
    }
  )

  // Apply colors in real-time as they change (visual updates instant, save debounced)
  useEffect(() => {
    if (colorTheme === 'custom') {
      // Apply visual changes immediately
      applyColorsRealTime(tempCustomColors, mode)

      // Debounce the save to KV store to avoid rate limiting
      if (colorSaveTimeoutRef.current) {
        clearTimeout(colorSaveTimeoutRef.current)
      }

      colorSaveTimeoutRef.current = setTimeout(() => {
        setCustomColors(tempCustomColors)
      }, 800) // Save after 800ms of no changes
    }
  }, [tempCustomColors, mode, colorTheme, setCustomColors])
  
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
      }
      if (colorSaveTimeoutRef.current) {
        clearTimeout(colorSaveTimeoutRef.current)
      }
    }
  }, [])

  const handleAboutClick = () => {
    setTapCount((prev) => {
      const newCount = prev + 1
      
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
      }
      
      if (newCount === 7) {
        setShowVault(true)
        toast.success('🔐 Vault unlocked!', {
          description: 'Secret vault access granted'
        })
        return 0
      }
      
      tapTimeoutRef.current = setTimeout(() => {
        setTapCount(0)
      }, 2000)
      
      return newCount
    })
  }
  
  const getSubscriptionBadge = () => {
    switch (subscription) {
      case 'pro':
        return <Badge className="bg-blue-mid text-white">Pro</Badge>
      case 'gold':
        return <Badge className="bg-gradient-to-r from-[#FFD700] to-[#FFB700] text-foreground">Gold</Badge>
      case 'family':
        return <Badge className="bg-[#7B61FF] text-white">Family / Team</Badge>
      default:
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Basic</Badge>
    }
  }

  const themeOptions: { value: ColorTheme; label: string; description: string; preview: string }[] = [
    {
      value: 'neon-noir',
      label: 'Neon Noir',
      description: 'Vibrant neon accents with dark undertones',
      preview: 'linear-gradient(135deg, oklch(0.65 0.28 328) 0%, oklch(0.70 0.25 320) 100%)'
    },
    {
      value: 'aurora-borealis',
      label: 'Aurora Borealis',
      description: 'Cool blues and teals like northern lights',
      preview: 'linear-gradient(135deg, oklch(0.55 0.25 250) 0%, oklch(0.65 0.22 160) 100%)'
    },
    {
      value: 'cosmic-latte',
      label: 'Cosmic Latte',
      description: 'Warm beige tones inspired by the universe',
      preview: 'linear-gradient(135deg, oklch(0.50 0.18 70) 0%, oklch(0.65 0.15 50) 100%)'
    },
    {
      value: 'candy-shop',
      label: 'Candy Shop',
      description: 'Sweet pink and purple candy colors',
      preview: 'linear-gradient(135deg, oklch(0.60 0.22 340) 0%, oklch(0.70 0.20 290) 100%)'
    },
    {
      value: 'black-gray',
      label: 'Black & Gray',
      description: 'Classic monochrome elegance',
      preview: 'linear-gradient(135deg, oklch(0.30 0 0) 0%, oklch(0.60 0 0) 100%)'
    },
    {
      value: 'custom',
      label: 'Custom Colors',
      description: 'Create your own color palette',
      preview: customColors
        ? `linear-gradient(135deg, ${customColors.primary} 0%, ${customColors.accent} 100%)`
        : 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)'
    }
  ]

  const applyCustomColors = () => {
    setCustomColors(tempCustomColors)
    toast.success('Custom colors applied!')
  }

  const applyFontSettings = () => {
    localStorage.setItem('flowsphere-font-family', fontFamily)
    localStorage.setItem('flowsphere-font-size', fontSize.toString())
    localStorage.setItem('flowsphere-line-height', lineHeight.toString())
    localStorage.setItem('flowsphere-letter-spacing', letterSpacing.toString())
    toast.success('Font settings saved!')
  }

  const handleSaveApiKeys = () => {
    if (openaiApiKey) {
      localStorage.setItem('flowsphere-openai-api-key', openaiApiKey)
    } else {
      localStorage.removeItem('flowsphere-openai-api-key')
    }

    if (anthropicApiKey) {
      localStorage.setItem('flowsphere-anthropic-api-key', anthropicApiKey)
    } else {
      localStorage.removeItem('flowsphere-anthropic-api-key')
    }

    toast.success('API keys saved securely!')
  }

  const handleSaveAccount = () => {
    onUserNameChange(editName)
    onUserEmailChange(editEmail)
    localStorage.setItem('flowsphere-social-accounts', JSON.stringify(socialAccounts))
    toast.success('Account details saved!')
    setShowAccountEdit(false)
  }

  const handleAddCustomKey = () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast.error('Please fill in both fields')
      return
    }
    const newKey = {
      id: Date.now().toString(),
      name: newKeyName.trim(),
      value: newKeyValue.trim()
    }
    const updated = [...customApiKeys, newKey]
    setCustomApiKeys(updated)
    localStorage.setItem('flowsphere-custom-api-keys', JSON.stringify(updated))
    setNewKeyName('')
    setNewKeyValue('')
    setShowAddCustomKey(false)
    toast.success('Custom API key added!')
  }

  const handleDeleteCustomKey = (id: string) => {
    const updated = customApiKeys.filter(k => k.id !== id)
    setCustomApiKeys(updated)
    localStorage.setItem('flowsphere-custom-api-keys', JSON.stringify(updated))
    toast.success('API key removed')
  }

  const handleInstallClick = async () => {
    if (isInstalled) {
      toast.info('FlowSphere is already installed on this device')
      return
    }

    if (!deferredPrompt) {
      // Show manual install instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isAndroid = /Android/.test(navigator.userAgent)

      let instructions = 'To install FlowSphere:\n\n'

      if (isIOS) {
        instructions += 'iOS/Safari:\n1. Tap the Share button (⬆️)\n2. Tap "Add to Home Screen"\n3. Tap "Add"'
      } else if (isAndroid) {
        instructions += 'Android/Chrome:\n1. Tap menu (⋮) at top right\n2. Tap "Install app" or "Add to Home screen"\n3. Tap "Install"'
      } else {
        instructions += 'Desktop:\n1. Look for install icon (⊕) in the address bar\n2. Click "Install"\n\nOr use your browser menu → "Install FlowSphere"'
      }

      alert(instructions)
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        toast.success('✅ FlowSphere installed successfully!')
        setIsInstalled(true)
      } else {
        toast.info('Installation cancelled')
      }

      setDeferredPrompt(null)
    } catch (error) {
      console.error('Install error:', error)
      toast.error('Installation failed. Please try again.')
    }
  }

  const settingsSections = [
    {
      title: 'Account',
      icon: User,
      items: [
        { label: 'Name', value: userName },
        { label: 'Email', value: userEmail }
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      controls: [
        { 
          label: 'Email Notifications', 
          description: 'Receive updates via email',
          checked: notifications.email,
          onChange: (checked: boolean) => onNotificationChange('email', checked)
        },
        { 
          label: 'Push Notifications', 
          description: 'Get real-time alerts',
          checked: notifications.push,
          onChange: (checked: boolean) => onNotificationChange('push', checked)
        },
        { 
          label: 'SMS Notifications', 
          description: 'Emergency alerts only',
          checked: notifications.sms,
          onChange: (checked: boolean) => onNotificationChange('sms', checked)
        }
      ]
    },
    {
      title: 'Security',
      icon: Lock,
      items: [
        { label: 'Two-Factor Authentication', value: <Badge variant="secondary">Not enabled</Badge> },
        {
          label: 'Last login',
          value: 'Today at 10:30 AM',
          clickable: true,
          onClick: () => setShowSessions(!showSessions)
        },
        { label: 'Active sessions', value: `${sessions.length} devices` }
      ]
    }
  ]

  return (
    <div className="space-y-6 pb-8 max-w-4xl">
      <div>
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <Card className="bg-gradient-to-br from-accent/10 via-primary/10 to-accent/5 border-accent/30">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 text-white" weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-1">Subscription Status</h3>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {subscription === 'pro' && (
                        <>
                          <Check className="w-5 h-5 text-blue-mid" weight="bold" />
                          <span className="text-sm sm:text-base font-medium">You're subscribed to FlowSphere Pro</span>
                        </>
                      )}
                      {subscription === 'gold' && (
                        <>
                          <Check className="w-5 h-5 text-[#FFB700]" weight="bold" />
                          <span className="text-sm sm:text-base font-medium">You're subscribed to FlowSphere Gold</span>
                        </>
                      )}
                      {subscription === 'family' && (
                        <>
                          <Check className="w-5 h-5 text-[#7B61FF]" weight="bold" />
                          <span className="text-sm sm:text-base font-medium">You're subscribed to FlowSphere Family / Team</span>
                        </>
                      )}
                      {subscription === 'basic' && (
                        <>
                          <span className="text-sm sm:text-base text-muted-foreground">You're on the Basic plan</span>
                        </>
                      )}
                    </div>
                    {getSubscriptionBadge()}
                  </div>
                </div>
                <Button 
                  onClick={() => onNavigate('subscription')}
                  className="bg-accent hover:bg-accent/90 min-touch-target"
                >
                  Manage Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subscription Monitoring Card - Hidden per user request */}
        {/*
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" weight="duotone" />
                <span>Subscription Monitoring</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                AI-powered tracking and optimization of all your subscriptions. Get alerts for price increases, duplicate services, and unused subscriptions.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onNavigate('subscription-monitoring')}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Subscriptions
                </Button>
                {(subscription === 'basic' || subscription === 'pro' || subscription === 'gold' || subscription === 'family') && (
                  <Badge className={
                    subscription === 'pro' || subscription === 'gold' || subscription === 'family'
                      ? 'bg-blue-mid text-white'
                      : 'bg-muted text-muted-foreground'
                  }>
                    {subscription === 'pro' || subscription === 'gold' || subscription === 'family' ? 'Pro Feature' : 'Pro Required'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" weight="duotone" />
                <span>Theme Colors</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Current theme: <span className="font-semibold capitalize">{colorTheme}</span> • Mode: <span className="font-semibold capitalize">{mode}</span>
                </p>
                <Button
                  onClick={() => setShowThemeModal(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Customize Theme Colors
                </Button>
                {/* Theme selection moved to modal - see end of component */}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Advanced Settings - Typography & Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
              >
                <CardTitle className="flex items-center space-x-2">
                  <Sliders className="w-5 h-5" weight="duotone" />
                  <span>Advanced Settings</span>
                </CardTitle>
                <CaretDown
                  className={cn(
                    'w-5 h-5 transition-transform',
                    showAdvancedSettings && 'rotate-180'
                  )}
                />
              </button>
            </CardHeader>
            <AnimatePresence>
              {showAdvancedSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <TextAa className="w-5 h-5 text-primary" weight="duotone" />
                        <h4 className="font-semibold">Typography & Layout</h4>
                      </div>

                      {/* Font Family */}
                      <div className="space-y-2">
                        <Label htmlFor="font-family">Font Family</Label>
                        <Select value={fontFamily} onValueChange={setFontFamily}>
                          <SelectTrigger id="font-family">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Inter">Inter (Default)</SelectItem>
                            <SelectItem value="system-ui">System UI</SelectItem>
                            <SelectItem value="Arial">Arial</SelectItem>
                            <SelectItem value="Helvetica">Helvetica</SelectItem>
                            <SelectItem value="Georgia">Georgia</SelectItem>
                            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                            <SelectItem value="Courier New">Courier New</SelectItem>
                            <SelectItem value="Verdana">Verdana</SelectItem>
                            <SelectItem value="monospace">Monospace</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Font Size */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Base Font Size</Label>
                          <span className="text-sm font-medium">{fontSize}px</span>
                        </div>
                        <Slider
                          value={[fontSize]}
                          onValueChange={([value]) => setFontSize(value)}
                          min={12}
                          max={24}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Adjust the base font size for all text in the app
                        </p>
                      </div>

                      {/* Line Height */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Line Height</Label>
                          <span className="text-sm font-medium">{lineHeight.toFixed(2)}</span>
                        </div>
                        <Slider
                          value={[lineHeight]}
                          onValueChange={([value]) => setLineHeight(value)}
                          min={1.0}
                          max={2.0}
                          step={0.1}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Control spacing between lines of text
                        </p>
                      </div>

                      {/* Letter Spacing */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Letter Spacing</Label>
                          <span className="text-sm font-medium">{letterSpacing}px</span>
                        </div>
                        <Slider
                          value={[letterSpacing]}
                          onValueChange={([value]) => setLetterSpacing(value)}
                          min={-2}
                          max={4}
                          step={0.5}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Adjust spacing between characters
                        </p>
                      </div>

                      {/* Preview Text */}
                      <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
                        <div
                          style={{
                            fontFamily: fontFamily,
                            fontSize: `${fontSize}px`,
                            lineHeight: lineHeight,
                            letterSpacing: `${letterSpacing}px`
                          }}
                        >
                          <p className="font-semibold mb-2">The quick brown fox jumps over the lazy dog</p>
                          <p className="text-sm text-muted-foreground">
                            FlowSphere is your command center for modern life. AI-powered assistance for work, family, and home.
                          </p>
                        </div>
                      </div>

                      {/* Apply Button */}
                      <Button
                        onClick={applyFontSettings}
                        className="w-full"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Apply Typography Settings
                      </Button>
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {settingsSections.map((section, sectionIndex) => {
          const Icon = section.icon
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: sectionIndex * 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Icon className="w-5 h-5" weight="duotone" />
                      <span>{section.title}</span>
                    </CardTitle>
                    {section.title === 'Account' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAccountEdit(true)}
                      >
                        <PencilSimple className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.items?.map((item: any, index) => (
                    <div key={index}>
                      <div
                        className={cn(
                          "flex items-center justify-between py-2",
                          item.clickable && "cursor-pointer hover:bg-muted/50 -mx-4 px-4 rounded-lg transition-colors"
                        )}
                        onClick={item.onClick}
                      >
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-medium">{item.value}</span>
                      </div>
                      {item.clickable && showSessions && section.title === 'Security' && item.label === 'Last login' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pl-4 space-y-3 py-3"
                        >
                          <h5 className="text-xs font-medium text-muted-foreground">Active Login Sessions</h5>
                          {sessions.map((sess) => (
                            <div key={sess.id} className="p-3 rounded-lg bg-muted/40 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{sess.device}</span>
                                {sess.current && <Badge variant="secondary" className="text-xs">Current</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">{sess.location}</p>
                              <p className="text-xs text-muted-foreground">Last active: {sess.lastActive}</p>
                            </div>
                          ))}
                        </motion.div>
                      )}
                      {index < section.items!.length - 1 && <Separator />}
                    </div>
                  ))}

                  {section.controls?.map((control, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label htmlFor={`control-${sectionIndex}-${index}`}>
                            {control.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {control.description}
                          </p>
                        </div>
                        <Switch
                          id={`control-${sectionIndex}-${index}`}
                          checked={control.checked}
                          onCheckedChange={control.onChange}
                        />
                      </div>
                      {index < section.controls!.length - 1 && <Separator />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}

        {/* API Keys Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <Card className="border-accent/30">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="w-5 h-5" weight="duotone" />
                <span>API Keys</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure your AI service API keys for enhanced features like the AI Assistant and Meeting Notes transcription.
              </p>

              {/* OpenAI API Key */}
              <div className="space-y-2">
                <Label htmlFor="openai-key" className="text-sm font-medium">
                  OpenAI API Key
                  <Badge variant="secondary" className="ml-2 text-[10px]">Optional</Badge>
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="openai-key"
                      type={showOpenaiKey ? 'text' : 'password'}
                      placeholder="sk-..."
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    >
                      {showOpenaiKey ? (
                        <EyeSlash className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for AI Assistant chat and Meeting Notes transcription
                </p>
              </div>

              {/* Anthropic API Key */}
              <div className="space-y-2">
                <Label htmlFor="anthropic-key" className="text-sm font-medium">
                  Anthropic API Key
                  <Badge variant="secondary" className="ml-2 text-[10px]">Optional</Badge>
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="anthropic-key"
                      type={showAnthropicKey ? 'text' : 'password'}
                      placeholder="sk-ant-..."
                      value={anthropicApiKey}
                      onChange={(e) => setAnthropicApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                    >
                      {showAnthropicKey ? (
                        <EyeSlash className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Alternative AI provider for AI Assistant (Claude models)
                </p>
              </div>

              <Separator />

              {/* Custom API Keys */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Custom API Keys</Label>
                    <p className="text-xs text-muted-foreground mt-1">Add other API keys (Weather, Maps, Calendar, etc.)</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddCustomKey(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Key
                  </Button>
                </div>
                {customApiKeys.length > 0 && (
                  <div className="space-y-2">
                    {customApiKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <span className="text-sm font-medium">{key.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCustomKey(key.id)}
                          className="h-8"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleSaveApiKeys}
                className="w-full"
              >
                <Check className="w-4 h-4 mr-2" />
                Save API Keys
              </Button>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  🔒 Your API keys are stored locally in your browser and never sent to our servers. Get your keys from:
                  <br />• OpenAI: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com/api-keys</a>
                  <br />• Anthropic: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.anthropic.com/settings/keys</a>
                  <br />• Weather API, Maps API, Calendar sync APIs can be added as custom keys
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SpeakerHigh className="w-5 h-5" weight="duotone" />
                <span>Voice & AI Assistant</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <SpeakerHigh className="w-4 h-4" />
                    AI Voice Settings
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Customize FlowSphere's AI voice, including accent, speed, and pitch preferences.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onNavigate('ai-voice')}
                  >
                    <SpeakerHigh className="w-4 h-4 mr-2" />
                    Customize AI Voice
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <TestTube className="w-4 h-4" />
                    Voice Command Tester
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Test voice commands and confirmation flows.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowVoiceTester(!showVoiceTester)}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {showVoiceTester ? 'Hide Tester' : 'Show Tester'}
                  </Button>
                  {showVoiceTester && (
                    <div className="mt-4">
                      <VoiceCommandTester />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* PWA Install Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <Card className="border-blue-mid/30 bg-gradient-to-br from-blue-light/10 via-blue-mid/10 to-blue-deep/5">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DeviceMobile className="w-5 h-5 text-blue-mid" weight="duotone" />
                <span>Install FlowSphere App</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInstalled ? (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" weight="bold" />
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      FlowSphere is installed
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You can access it from your home screen
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Install FlowSphere as a progressive web app for a native app experience:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-mid mt-0.5 flex-shrink-0" />
                      <span>Works offline - access your data anytime</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-mid mt-0.5 flex-shrink-0" />
                      <span>Instant loading from your home screen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-mid mt-0.5 flex-shrink-0" />
                      <span>Push notifications for important updates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-mid mt-0.5 flex-shrink-0" />
                      <span>Native app feel on all devices</span>
                    </li>
                  </ul>
                  <Button
                    onClick={handleInstallClick}
                    className="w-full bg-gradient-to-r from-blue-mid to-blue-deep hover:from-blue-mid/90 hover:to-blue-deep/90 gap-2"
                    size="lg"
                  >
                    <DownloadSimple className="w-5 h-5" weight="bold" />
                    Install FlowSphere
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    💡 If the button doesn't work, use your browser's menu to "Install App" or "Add to Home Screen"
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5" weight="duotone" />
                <span>Account Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Permissions & Privacy
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Control what FlowSphere can access.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onNavigate('permissions')}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Manage Permissions
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Subscription & Billing
                  </h4>
                  <div className="flex items-center justify-between py-2 mb-3">
                    <span className="text-xs text-muted-foreground">Current Plan</span>
                    {getSubscriptionBadge()}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onNavigate('subscription')}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4
                    className="text-sm font-medium mb-2 flex items-center gap-2 cursor-pointer select-none"
                    onClick={handleAboutClick}
                  >
                    <Info className="w-4 h-4" />
                    About & Support
                  </h4>
                  <div className="flex items-center justify-between py-2 mb-3">
                    <span className="text-xs text-muted-foreground">Version</span>
                    <span className="text-xs font-medium">1.0.0</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs text-accent"
                      onClick={() => onNavigate('privacy')}
                    >
                      Privacy
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs text-accent"
                      onClick={() => onNavigate('terms')}
                    >
                      Terms
                    </Button>
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs text-accent">
                      Support
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-destructive">
                <SignOut className="w-5 h-5" weight="duotone" />
                <span>Sign Out</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sign out of your FlowSphere account. You can always sign back in anytime.
              </p>
              <Button 
                variant="destructive" 
                className="w-full gap-2"
                onClick={() => {
                  if (onLogout) {
                    toast.success('Signed out successfully')
                    onLogout()
                  }
                }}
              >
                <SignOut className="w-4 h-4" weight="bold" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add Custom API Key Dialog */}
      <Dialog open={showAddCustomKey} onOpenChange={setShowAddCustomKey}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom API Key</DialogTitle>
            <DialogDescription>
              Add an API key for additional services like Weather, Maps, or Calendar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Service Name</Label>
              <Input
                id="key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Weather API, Maps API"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-value">API Key</Label>
              <Input
                id="key-value"
                type="password"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                placeholder="Enter your API key"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCustomKey(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomKey}>Add Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Edit Dialog */}
      <Dialog open={showAccountEdit} onOpenChange={setShowAccountEdit}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-accent" weight="duotone" />
              Edit Account Details
            </DialogTitle>
            <DialogDescription>
              Update your personal information and connected accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Basic Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Social Media Connections */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Connected Accounts
                </h4>
                <Badge variant="secondary" className="text-xs">Optional</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="social-google" className="text-xs">Google</Label>
                  <Input
                    id="social-google"
                    type="email"
                    value={socialAccounts.google}
                    onChange={(e) => setSocialAccounts({...socialAccounts, google: e.target.value})}
                    placeholder="google@email.com"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social-yahoo" className="text-xs">Yahoo</Label>
                  <Input
                    id="social-yahoo"
                    type="email"
                    value={socialAccounts.yahoo}
                    onChange={(e) => setSocialAccounts({...socialAccounts, yahoo: e.target.value})}
                    placeholder="yahoo@email.com"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social-outlook" className="text-xs">Outlook</Label>
                  <Input
                    id="social-outlook"
                    type="email"
                    value={socialAccounts.outlook}
                    onChange={(e) => setSocialAccounts({...socialAccounts, outlook: e.target.value})}
                    placeholder="outlook@email.com"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social-facebook" className="text-xs">Facebook</Label>
                  <Input
                    id="social-facebook"
                    value={socialAccounts.facebook}
                    onChange={(e) => setSocialAccounts({...socialAccounts, facebook: e.target.value})}
                    placeholder="@username"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social-twitter" className="text-xs">Twitter/X</Label>
                  <Input
                    id="social-twitter"
                    value={socialAccounts.twitter}
                    onChange={(e) => setSocialAccounts({...socialAccounts, twitter: e.target.value})}
                    placeholder="@username"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social-instagram" className="text-xs">Instagram</Label>
                  <Input
                    id="social-instagram"
                    value={socialAccounts.instagram}
                    onChange={(e) => setSocialAccounts({...socialAccounts, instagram: e.target.value})}
                    placeholder="@username"
                    className="text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Connect your accounts to enable cross-platform features and notifications.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAccountEdit(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveAccount}
              className="bg-accent hover:bg-accent/90"
            >
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Theme Colors Modal */}
      <Dialog open={showThemeModal} onOpenChange={setShowThemeModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Theme Colors</DialogTitle>
            <DialogDescription>
              Choose your preferred color theme. Current mode: {mode}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4">
            {themeOptions.map((theme) => (
              <button
                key={theme.value}
                onClick={() => {
                  setColorTheme(theme.value)
                  if (theme.value === 'custom') {
                    setShowCustomColors(true)
                  } else {
                    setShowCustomColors(false)
                  }
                }}
                className={cn(
                  'flex flex-col items-center p-6 rounded-xl border-2 transition-all hover:shadow-lg justify-center gap-3',
                  colorTheme === theme.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div
                  className="w-20 h-20 rounded-full shadow-lg relative"
                  style={{ background: theme.preview }}
                >
                  {colorTheme === theme.value && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                      <Check className="w-10 h-10 text-white" weight="bold" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="font-semibold">{theme.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{theme.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Custom Colors Section - shown when custom theme is selected */}
          {colorTheme === 'custom' && showCustomColors && (
            <div className="border-t pt-6 space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Customize Your Colors
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Primary Color */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Primary</Label>
                    <input
                      type="color"
                      value={tempCustomColors.primary.startsWith('#') ? tempCustomColors.primary : '#8B5CF6'}
                      onChange={(e) => setTempCustomColors({ ...tempCustomColors, primary: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Opacity: {tempCustomColors.primaryOpacity}%</Label>
                    <Slider
                      value={[tempCustomColors.primaryOpacity]}
                      onValueChange={([value]) => setTempCustomColors({ ...tempCustomColors, primaryOpacity: value })}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Accent</Label>
                    <input
                      type="color"
                      value={tempCustomColors.accent.startsWith('#') ? tempCustomColors.accent : '#EC4899'}
                      onChange={(e) => setTempCustomColors({ ...tempCustomColors, accent: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Opacity: {tempCustomColors.accentOpacity}%</Label>
                    <Slider
                      value={[tempCustomColors.accentOpacity]}
                      onValueChange={([value]) => setTempCustomColors({ ...tempCustomColors, accentOpacity: value })}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>

                {/* Background Color */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Background</Label>
                    <input
                      type="color"
                      value={tempCustomColors.background.startsWith('#') ? tempCustomColors.background : '#FFFFFF'}
                      onChange={(e) => setTempCustomColors({ ...tempCustomColors, background: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Opacity: {tempCustomColors.backgroundOpacity}%</Label>
                    <Slider
                      value={[tempCustomColors.backgroundOpacity]}
                      onValueChange={([value]) => setTempCustomColors({ ...tempCustomColors, backgroundOpacity: value })}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>

                {/* Text Color */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Text</Label>
                    <input
                      type="color"
                      value={tempCustomColors.foreground.startsWith('#') ? tempCustomColors.foreground : '#000000'}
                      onChange={(e) => setTempCustomColors({ ...tempCustomColors, foreground: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Opacity: {tempCustomColors.foregroundOpacity}%</Label>
                    <Slider
                      value={[tempCustomColors.foregroundOpacity]}
                      onValueChange={([value]) => setTempCustomColors({ ...tempCustomColors, foregroundOpacity: value })}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowThemeModal(false)}>
              Close
            </Button>
            {colorTheme === 'custom' && showCustomColors && (
              <Button onClick={() => {
                applyCustomColors()
                setShowThemeModal(false)
              }}>
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Vault isOpen={showVault} onClose={() => setShowVault(false)} />
    </div>
  )
}
