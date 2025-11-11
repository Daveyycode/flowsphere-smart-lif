import { motion } from 'framer-motion'
import { User, Bell, Lock, Palette, CreditCard, Info, ShieldCheck, SpeakerHigh } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface SettingsViewProps {
  userName: string
  userEmail: string
  subscription: 'free' | 'premium' | 'family'
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  onNotificationChange: (type: 'email' | 'push' | 'sms', value: boolean) => void
  onNavigate: (tab: 'subscription' | 'terms' | 'privacy' | 'permissions' | 'ai-voice') => void
}

export function SettingsView({ 
  userName, 
  userEmail, 
  subscription,
  notifications,
  onNotificationChange,
  onNavigate 
}: SettingsViewProps) {
  const getSubscriptionBadge = () => {
    switch (subscription) {
      case 'premium':
        return <Badge className="bg-accent">Premium</Badge>
      case 'family':
        return <Badge className="bg-gradient-to-r from-accent to-primary">Family</Badge>
      default:
        return <Badge variant="secondary">Free</Badge>
    }
  }

  const settingsSections = [
    {
      title: 'Account',
      icon: User,
      items: [
        { label: 'Name', value: userName },
        { label: 'Email', value: userEmail },
        { label: 'Subscription', value: getSubscriptionBadge() }
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

        {subscription === 'free' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-accent/10 via-primary/10 to-coral/10 border-accent/20">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6 text-accent" weight="duotone" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Upgrade to Premium</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Unlock unlimited devices, AI-powered insights, family safety tracking, and advanced automations.
                    </p>
                    <Button 
                      className="bg-accent hover:bg-accent/90"
                      onClick={() => onNavigate('subscription')}
                    >
                      View Plans
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: subscription === 'free' ? 0.5 : 0.4 }}
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
          transition={{ duration: 0.5, delay: subscription === 'free' ? 0.6 : 0.5 }}
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
          transition={{ duration: 0.5, delay: subscription === 'free' ? 0.6 : 0.5 }}
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
          transition={{ duration: 0.5, delay: subscription === 'free' ? 0.7 : 0.6 }}
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
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Built with</span>
                <span className="text-sm font-medium">React & TypeScript</span>
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
      </div>
    </div>
  )
}
