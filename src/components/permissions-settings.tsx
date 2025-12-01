import { motion } from 'framer-motion'
import { ShieldCheck, EnvelopeSimple, Phone, CalendarBlank, MapPin, Camera, Bell, House, Users, Lock, Key } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

interface Permission {
  id: string
  name: string
  description: string
  icon: any
  isGranted: boolean
  category: 'communication' | 'location' | 'home' | 'data'
}

export function PermissionsSettings() {
  const [gmailPermission, setGmailPermission] = useKV<boolean>('flowsphere-permission-gmail', false)
  const [outlookPermission, setOutlookPermission] = useKV<boolean>('flowsphere-permission-outlook', false)
  const [yahooPermission, setYahooPermission] = useKV<boolean>('flowsphere-permission-yahoo', false)
  const [callsPermission, setCallsPermission] = useKV<boolean>('flowsphere-permission-calls', false)
  const [smsPermission, setSmsPermission] = useKV<boolean>('flowsphere-permission-sms', false)
  const [calendarPermission, setCalendarPermission] = useKV<boolean>('flowsphere-permission-calendar', false)
  const [googleCalendarPermission, setGoogleCalendarPermission] = useKV<boolean>('flowsphere-permission-google-calendar', false)
  const [outlookCalendarPermission, setOutlookCalendarPermission] = useKV<boolean>('flowsphere-permission-outlook-calendar', false)
  const [locationPermission, setLocationPermission] = useKV<boolean>('flowsphere-permission-location', false)
  const [familyLocationPermission, setFamilyLocationPermission] = useKV<boolean>('flowsphere-permission-family-location', false)
  const [homeDevicesPermission, setHomeDevicesPermission] = useKV<boolean>('flowsphere-permission-home-devices', false)
  const [camerasPermission, setCamerasPermission] = useKV<boolean>('flowsphere-permission-cameras', false)
  const [notificationsPermission, setNotificationsPermission] = useKV<boolean>('flowsphere-permission-notifications', true)
  const [contactsPermission, setContactsPermission] = useKV<boolean>('flowsphere-permission-contacts', false)
  const [storagePermission, setStoragePermission] = useKV<boolean>('flowsphere-permission-storage', true)

  const communicationPermissions = [
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Access your Gmail inbox for smart email management and notifications',
      icon: EnvelopeSimple,
      isGranted: gmailPermission || false,
      setter: setGmailPermission,
      color: 'coral'
    },
    {
      id: 'outlook',
      name: 'Outlook Mail',
      description: 'Connect your Outlook email for unified inbox experience',
      icon: EnvelopeSimple,
      isGranted: outlookPermission || false,
      setter: setOutlookPermission,
      color: 'accent'
    },
    {
      id: 'yahoo',
      name: 'Yahoo Mail',
      description: 'Integrate Yahoo Mail for complete email management',
      icon: EnvelopeSimple,
      isGranted: yahooPermission || false,
      setter: setYahooPermission,
      color: 'primary'
    },
    {
      id: 'calls',
      name: 'Phone Calls',
      description: 'Allow FlowSphere to manage call logs and emergency calling',
      icon: Phone,
      isGranted: callsPermission || false,
      setter: setCallsPermission,
      color: 'mint'
    },
    {
      id: 'sms',
      name: 'SMS Messages',
      description: 'Read and send text messages for important notifications',
      icon: Phone,
      isGranted: smsPermission || false,
      setter: setSmsPermission,
      color: 'accent'
    },
    {
      id: 'contacts',
      name: 'Contacts',
      description: 'Access your contacts for quick communication',
      icon: Users,
      isGranted: contactsPermission || false,
      setter: setContactsPermission,
      color: 'coral'
    }
  ]

  const calendarPermissions = [
    {
      id: 'calendar',
      name: 'Device Calendar',
      description: 'Access your default calendar app for schedule management',
      icon: CalendarBlank,
      isGranted: calendarPermission || false,
      setter: setCalendarPermission,
      color: 'primary'
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sync with Google Calendar for complete schedule overview',
      icon: CalendarBlank,
      isGranted: googleCalendarPermission || false,
      setter: setGoogleCalendarPermission,
      color: 'coral'
    },
    {
      id: 'outlook-calendar',
      name: 'Outlook Calendar',
      description: 'Connect Outlook Calendar for work schedule integration',
      icon: CalendarBlank,
      isGranted: outlookCalendarPermission || false,
      setter: setOutlookCalendarPermission,
      color: 'accent'
    }
  ]

  const locationPermissions = [
    {
      id: 'location',
      name: 'Your Location',
      description: 'Track your location for commute times and location-based automations',
      icon: MapPin,
      isGranted: locationPermission || false,
      setter: setLocationPermission,
      color: 'mint'
    },
    {
      id: 'family-location',
      name: 'Family Location Sharing',
      description: 'Share and track family member locations for safety',
      icon: MapPin,
      isGranted: familyLocationPermission || false,
      setter: setFamilyLocationPermission,
      color: 'coral'
    }
  ]

  const homePermissions = [
    {
      id: 'home-devices',
      name: 'Smart Home Devices',
      description: 'Control lights, thermostats, locks, and other smart devices',
      icon: House,
      isGranted: homeDevicesPermission || false,
      setter: setHomeDevicesPermission,
      color: 'accent'
    },
    {
      id: 'cameras',
      name: 'Security Cameras',
      description: 'Access and manage your home security cameras and recordings',
      icon: Camera,
      isGranted: camerasPermission || false,
      setter: setCamerasPermission,
      color: 'primary'
    }
  ]

  const dataPermissions = [
    {
      id: 'notifications',
      name: 'Notifications',
      description: 'Display system notifications for alerts and updates',
      icon: Bell,
      isGranted: notificationsPermission || false,
      setter: setNotificationsPermission,
      color: 'coral'
    },
    {
      id: 'storage',
      name: 'Local Storage',
      description: 'Store app data and preferences on your device',
      icon: Lock,
      isGranted: storagePermission || false,
      setter: setStoragePermission,
      color: 'mint'
    }
  ]

  const handlePermissionToggle = (setter: any, currentValue: boolean, name: string) => {
    setter(!currentValue)
    toast.success(`${name} permission ${!currentValue ? 'granted' : 'revoked'}`)
  }

  const grantAllPermissions = () => {
    setGmailPermission(true)
    setOutlookPermission(true)
    setYahooPermission(true)
    setCallsPermission(true)
    setSmsPermission(true)
    setCalendarPermission(true)
    setGoogleCalendarPermission(true)
    setOutlookCalendarPermission(true)
    setLocationPermission(true)
    setFamilyLocationPermission(true)
    setHomeDevicesPermission(true)
    setCamerasPermission(true)
    setNotificationsPermission(true)
    setContactsPermission(true)
    setStoragePermission(true)
    toast.success('All permissions granted')
  }

  const revokeAllPermissions = () => {
    setGmailPermission(false)
    setOutlookPermission(false)
    setYahooPermission(false)
    setCallsPermission(false)
    setSmsPermission(false)
    setCalendarPermission(false)
    setGoogleCalendarPermission(false)
    setOutlookCalendarPermission(false)
    setLocationPermission(false)
    setFamilyLocationPermission(false)
    setHomeDevicesPermission(false)
    setCamerasPermission(false)
    setContactsPermission(false)
    toast.success('Non-essential permissions revoked')
  }

  const PermissionItem = ({ permission, onToggle }: any) => {
    const Icon = permission.icon
    return (
      <div className="flex items-start justify-between py-4 space-x-4">
        <div className="flex items-start space-x-4 flex-1">
          <div className={`w-12 h-12 rounded-xl bg-${permission.color}/10 flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 text-${permission.color}`} weight="duotone" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Label className="font-medium">{permission.name}</Label>
              {permission.isGranted && (
                <Badge variant="secondary" className="bg-mint/20 text-mint text-xs">
                  Granted
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{permission.description}</p>
          </div>
        </div>
        <Switch
          checked={permission.isGranted}
          onCheckedChange={() => onToggle(permission.setter, permission.isGranted, permission.name)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Permissions & Privacy</h1>
        <p className="text-muted-foreground">
          Control what FlowSphere can access. You have full control over your data.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-accent/30 bg-gradient-to-br from-accent/5 via-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6 text-accent" weight="fill" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Privacy First</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  FlowSphere respects your privacy. All permissions are opt-in and can be revoked at any time. 
                  Your data is encrypted and stored locally on your device.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={grantAllPermissions}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Grant All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={revokeAllPermissions}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Revoke Non-Essential
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
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <EnvelopeSimple className="w-5 h-5" weight="duotone" />
              <span>Communication & Contacts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {communicationPermissions.map((permission, index) => (
              <div key={permission.id}>
                <PermissionItem permission={permission} onToggle={handlePermissionToggle} />
                {index < communicationPermissions.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarBlank className="w-5 h-5" weight="duotone" />
              <span>Calendar & Schedule</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calendarPermissions.map((permission, index) => (
              <div key={permission.id}>
                <PermissionItem permission={permission} onToggle={handlePermissionToggle} />
                {index < calendarPermissions.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" weight="duotone" />
              <span>Location Services</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locationPermissions.map((permission, index) => (
              <div key={permission.id}>
                <PermissionItem permission={permission} onToggle={handlePermissionToggle} />
                {index < locationPermissions.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <House className="w-5 h-5" weight="duotone" />
              <span>Smart Home & Security</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {homePermissions.map((permission, index) => (
              <div key={permission.id}>
                <PermissionItem permission={permission} onToggle={handlePermissionToggle} />
                {index < homePermissions.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="w-5 h-5" weight="duotone" />
              <span>App Data & Storage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataPermissions.map((permission, index) => (
              <div key={permission.id}>
                <PermissionItem permission={permission} onToggle={handlePermissionToggle} />
                {index < dataPermissions.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
