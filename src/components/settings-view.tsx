import { motion } from 'framer-motion'
import { User, Bell, Lock, Palette, CreditCard, Info, ShieldCheck, SpeakerHigh, Check, SignOut, TestTube } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTheme, ColorTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { VoiceCommandTester } from '@/components/voice-command-tester'
import { useState } from 'react'

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
  onNavigate: (tab: 'subscription' | 'subscription-monitoring' | 'terms' | 'privacy' | 'permissions' | 'ai-voice') => void
  onLogout?: () => void
}

export function SettingsView({ 
  userName, 
  userEmail, 
  subscription,
  notifications,
  onNotificationChange,
  onNavigate,
  onLogout
}: SettingsViewProps) {
  const { mode, colorTheme, setColorTheme } = useTheme()
  const [showVoiceTester, setShowVoiceTester] = useState(false)
  
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
    }
  ]

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
        { label: 'Last login', value: 'Today at 10:30 AM' },
        { label: 'Active sessions', value: '2 devices' }
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
                  Choose your preferred color theme. Current mode: <span className="font-semibold capitalize">{mode}</span>
                </p>
                {themeOptions.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => setColorTheme(theme.value)}
                    className={cn(
                      'w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all hover:shadow-lg',
                      colorTheme === theme.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-12 h-12 rounded-lg shadow-md"
                        style={{ background: theme.preview }}
                      />
                      <div className="text-left">
                        <p className="font-semibold">{theme.label}</p>
                        <p className="text-xs text-muted-foreground">{theme.description}</p>
                      </div>
                    </div>
                    {colorTheme === theme.value && (
                      <Check className="w-6 h-6 text-primary" weight="bold" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
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
                  <CardTitle className="flex items-center space-x-2">
                    <Icon className="w-5 h-5" weight="duotone" />
                    <span>{section.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.items?.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-medium">{item.value}</span>
                      </div>
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SpeakerHigh className="w-5 h-5" weight="duotone" />
                <span>AI Voice & Assistance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Customize FlowSphere's AI voice, including accent, speed, and pitch preferences for voice summaries and alerts.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onNavigate('ai-voice')}
              >
                <SpeakerHigh className="w-4 h-4 mr-2" />
                Customize AI Voice
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <Card className="border-accent/30">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TestTube className="w-5 h-5" weight="duotone" />
                <span>Voice Command Tester</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Test voice commands and confirmation flows. Verify that all AI assistant commands work correctly with voice input.
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
                <span>Permissions & Privacy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Control what FlowSphere can access. Manage email accounts, calendar sync, location sharing, and more.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onNavigate('permissions')}
              >
                <Lock className="w-4 h-4 mr-2" />
                Manage Permissions
              </Button>
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
                <CreditCard className="w-5 h-5" weight="duotone" />
                <span>Subscription & Billing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Current Plan</span>
                {getSubscriptionBadge()}
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Manage your subscription, update payment methods, and view billing history.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onNavigate('subscription')}
              >
                Manage Subscription & Payment
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="w-5 h-5" weight="duotone" />
                <span>About</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-sm font-medium">1.0.0</span>
              </div>
              <Separator />
              <div className="pt-2 space-x-4">
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-accent"
                  onClick={() => onNavigate('privacy')}
                >
                  Privacy Policy
                </Button>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-accent"
                  onClick={() => onNavigate('terms')}
                >
                  Terms of Service
                </Button>
                <Button variant="link" className="p-0 h-auto text-accent">
                  Support
                </Button>
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
    </div>
  )
}
