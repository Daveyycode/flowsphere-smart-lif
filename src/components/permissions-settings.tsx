import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, EnvelopeSimple, Phone, CalendarBlank, MapPin, Camera, Bell, House, Users, Lock, Key, CheckCircle, XCircle, WarningCircle, Microphone } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import {
  requestPermission,
  checkPermissionStatus,
  getAllPermissionStatuses,
  type BrowserPermissionType,
  type PermissionStatus
} from '@/lib/browser-permissions'

interface PermissionsState {
  // App-level permissions (stored in localStorage)
  gmail: boolean
  outlook: boolean
  yahoo: boolean
  calls: boolean
  sms: boolean
  calendar: boolean
  googleCalendar: boolean
  outlookCalendar: boolean
  familyLocation: boolean
  homeDevices: boolean
  storage: boolean
  hasSeenPrompt: boolean
  // REAL browser permissions (synced from browser state)
  location: boolean
  notifications: boolean
  cameras: boolean
  microphone: boolean
  contacts: boolean
}

// Browser permission status cache
interface BrowserPermissionState {
  location: PermissionStatus
  notifications: PermissionStatus
  camera: PermissionStatus
  microphone: PermissionStatus
}

export function PermissionsSettings() {
  const [permissions, setPermissions] = useKV<PermissionsState>('flowsphere-permissions', {
    gmail: false,
    outlook: false,
    yahoo: false,
    calls: false,
    sms: false,
    calendar: false,
    googleCalendar: false,
    outlookCalendar: false,
    location: false,
    familyLocation: false,
    homeDevices: false,
    cameras: false,
    notifications: false,
    contacts: false,
    storage: true,
    microphone: false,
    hasSeenPrompt: false
  })

  // Track REAL browser permission status
  const [browserPermissions, setBrowserPermissions] = useState<BrowserPermissionState>({
    location: 'prompt',
    notifications: 'prompt',
    camera: 'prompt',
    microphone: 'prompt'
  })

  const [isRequestingPermission, setIsRequestingPermission] = useState<string | null>(null)

  // Check browser permission status on mount and sync with our state
  useEffect(() => {
    const checkBrowserPermissions = async () => {
      const statuses = await getAllPermissionStatuses()
      setBrowserPermissions(statuses)

      // Sync browser status with our stored permissions
      if (permissions) {
        const updates: Partial<PermissionsState> = {}
        if (statuses.location === 'granted' && !permissions.location) updates.location = true
        if (statuses.notifications === 'granted' && !permissions.notifications) updates.notifications = true
        if (statuses.camera === 'granted' && !permissions.cameras) updates.cameras = true
        if (statuses.microphone === 'granted' && !permissions.microphone) updates.microphone = true

        if (Object.keys(updates).length > 0) {
          setPermissions({ ...permissions, ...updates })
        }
      }
    }

    checkBrowserPermissions()
    // Re-check every 5 seconds in case user changed permissions in browser settings
    const interval = setInterval(checkBrowserPermissions, 5000)
    return () => clearInterval(interval)
  }, [])

  // Handle REAL browser permission request
  const handleBrowserPermission = async (
    type: BrowserPermissionType,
    stateKey: keyof PermissionsState
  ) => {
    setIsRequestingPermission(type)

    try {
      const result = await requestPermission(type)

      if (result.status === 'granted') {
        setPermissions({ ...permissions!, [stateKey]: true })
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} permission granted!`)

        // Update browser permission state
        setBrowserPermissions(prev => ({
          ...prev,
          [type === 'camera' ? 'camera' : type]: 'granted'
        }))
      } else if (result.status === 'denied') {
        setPermissions({ ...permissions!, [stateKey]: false })
        toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} permission denied. Please enable in browser settings.`)

        setBrowserPermissions(prev => ({
          ...prev,
          [type === 'camera' ? 'camera' : type]: 'denied'
        }))
      } else if (result.status === 'unsupported') {
        toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} is not supported in this browser.`)
      }
    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error)
      toast.error(`Failed to request ${type} permission`)
    } finally {
      setIsRequestingPermission(null)
    }
  }

  const updatePermission = (key: keyof PermissionsState, value: boolean) => {
    if (!permissions) return
    const newPermissions: PermissionsState = { ...permissions, [key]: value }
    setPermissions(newPermissions)
    console.log(`[PERMISSION CHANGE] ${key}: ${value ? 'GRANTED' : 'REVOKED'} at ${new Date().toISOString()}`)
  }

  // Get badge for browser permission status
  const getPermissionBadge = (status: PermissionStatus) => {
    switch (status) {
      case 'granted':
        return (
          <Badge variant="secondary" className="bg-mint/20 text-mint text-xs flex items-center gap-1">
            <CheckCircle className="w-3 h-3" weight="fill" />
            Granted
          </Badge>
        )
      case 'denied':
        return (
          <Badge variant="secondary" className="bg-destructive/20 text-destructive text-xs flex items-center gap-1">
            <XCircle className="w-3 h-3" weight="fill" />
            Blocked
          </Badge>
        )
      case 'unsupported':
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs flex items-center gap-1">
            <WarningCircle className="w-3 h-3" />
            Unsupported
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 text-xs flex items-center gap-1">
            <WarningCircle className="w-3 h-3" />
            Not Set
          </Badge>
        )
    }
  }

  const communicationPermissions = [
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Access your Gmail inbox for smart email management and notifications',
      icon: EnvelopeSimple,
      isGranted: permissions?.gmail || false,
      setter: (val: boolean) => updatePermission('gmail', val),
      color: 'coral',
      isRealBrowser: false
    },
    {
      id: 'outlook',
      name: 'Outlook Mail',
      description: 'Connect your Outlook email for unified inbox experience',
      icon: EnvelopeSimple,
      isGranted: permissions?.outlook || false,
      setter: (val: boolean) => updatePermission('outlook', val),
      color: 'accent',
      isRealBrowser: false
    },
    {
      id: 'yahoo',
      name: 'Yahoo Mail',
      description: 'Integrate Yahoo Mail for complete email management',
      icon: EnvelopeSimple,
      isGranted: permissions?.yahoo || false,
      setter: (val: boolean) => updatePermission('yahoo', val),
      color: 'primary',
      isRealBrowser: false
    },
    {
      id: 'calls',
      name: 'Phone Calls',
      description: 'Allow FlowSphere to manage call logs and emergency calling',
      icon: Phone,
      isGranted: permissions?.calls || false,
      setter: (val: boolean) => updatePermission('calls', val),
      color: 'mint',
      isRealBrowser: false
    },
    {
      id: 'sms',
      name: 'SMS Messages',
      description: 'Read and send text messages for important notifications',
      icon: Phone,
      isGranted: permissions?.sms || false,
      setter: (val: boolean) => updatePermission('sms', val),
      color: 'accent',
      isRealBrowser: false
    },
    {
      id: 'contacts',
      name: 'Contacts',
      description: 'Access your contacts for quick communication',
      icon: Users,
      isGranted: permissions?.contacts || false,
      setter: (val: boolean) => updatePermission('contacts', val),
      color: 'coral',
      isRealBrowser: false
    }
  ]

  const calendarPermissions = [
    {
      id: 'calendar',
      name: 'Device Calendar',
      description: 'Access your default calendar app for schedule management',
      icon: CalendarBlank,
      isGranted: permissions?.calendar || false,
      setter: (val: boolean) => updatePermission('calendar', val),
      color: 'primary',
      isRealBrowser: false
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sync with Google Calendar for complete schedule overview',
      icon: CalendarBlank,
      isGranted: permissions?.googleCalendar || false,
      setter: (val: boolean) => updatePermission('googleCalendar', val),
      color: 'coral',
      isRealBrowser: false
    },
    {
      id: 'outlook-calendar',
      name: 'Outlook Calendar',
      description: 'Connect Outlook Calendar for work schedule integration',
      icon: CalendarBlank,
      isGranted: permissions?.outlookCalendar || false,
      setter: (val: boolean) => updatePermission('outlookCalendar', val),
      color: 'accent',
      isRealBrowser: false
    }
  ]

  const locationPermissions = [
    {
      id: 'location',
      name: 'Your Location',
      description: 'Track your location for commute times and location-based automations',
      icon: MapPin,
      isGranted: permissions?.location || false,
      browserStatus: browserPermissions.location,
      color: 'mint',
      isRealBrowser: true,
      browserType: 'geolocation' as BrowserPermissionType,
      stateKey: 'location' as keyof PermissionsState
    },
    {
      id: 'family-location',
      name: 'Family Location Sharing',
      description: 'Share and track family member locations for safety',
      icon: MapPin,
      isGranted: permissions?.familyLocation || false,
      setter: (val: boolean) => updatePermission('familyLocation', val),
      color: 'coral',
      isRealBrowser: false
    }
  ]

  const homePermissions = [
    {
      id: 'home-devices',
      name: 'Smart Home Devices',
      description: 'Control lights, thermostats, locks, and other smart devices',
      icon: House,
      isGranted: permissions?.homeDevices || false,
      setter: (val: boolean) => updatePermission('homeDevices', val),
      color: 'accent',
      isRealBrowser: false
    },
    {
      id: 'cameras',
      name: 'Camera Access',
      description: 'Access your device camera for video calls and scanning',
      icon: Camera,
      isGranted: permissions?.cameras || false,
      browserStatus: browserPermissions.camera,
      color: 'primary',
      isRealBrowser: true,
      browserType: 'camera' as BrowserPermissionType,
      stateKey: 'cameras' as keyof PermissionsState
    },
    {
      id: 'microphone',
      name: 'Microphone Access',
      description: 'Access your microphone for voice commands and calls',
      icon: Microphone,
      isGranted: permissions?.microphone || false,
      browserStatus: browserPermissions.microphone,
      color: 'coral',
      isRealBrowser: true,
      browserType: 'microphone' as BrowserPermissionType,
      stateKey: 'microphone' as keyof PermissionsState
    }
  ]

  const dataPermissions = [
    {
      id: 'notifications',
      name: 'Push Notifications',
      description: 'Display system notifications for alerts and updates',
      icon: Bell,
      isGranted: permissions?.notifications || false,
      browserStatus: browserPermissions.notifications,
      color: 'coral',
      isRealBrowser: true,
      browserType: 'notifications' as BrowserPermissionType,
      stateKey: 'notifications' as keyof PermissionsState
    },
    {
      id: 'storage',
      name: 'Local Storage',
      description: 'Store app data and preferences on your device',
      icon: Lock,
      isGranted: permissions?.storage || false,
      setter: (val: boolean) => updatePermission('storage', val),
      color: 'mint',
      isRealBrowser: false
    }
  ]

  const handlePermissionToggle = (permission: any) => {
    if (permission.isRealBrowser) {
      // This is a REAL browser permission - request it
      handleBrowserPermission(permission.browserType, permission.stateKey)
    } else if (permission.setter) {
      // This is an app-level permission - just toggle
      const newValue = !permission.isGranted
      permission.setter(newValue)
      toast.success(`${permission.name} permission ${newValue ? 'granted' : 'revoked'}`)
    }
  }

  const grantAllPermissions = async () => {
    // First, request REAL browser permissions
    toast.info('Requesting browser permissions...')

    await handleBrowserPermission('geolocation', 'location')
    await handleBrowserPermission('notifications', 'notifications')
    await handleBrowserPermission('camera', 'cameras')
    await handleBrowserPermission('microphone', 'microphone')

    // Then grant all app-level permissions
    const allGranted: PermissionsState = {
      gmail: true,
      outlook: true,
      yahoo: true,
      calls: true,
      sms: true,
      calendar: true,
      googleCalendar: true,
      outlookCalendar: true,
      location: browserPermissions.location === 'granted',
      familyLocation: true,
      homeDevices: true,
      cameras: browserPermissions.camera === 'granted',
      notifications: browserPermissions.notifications === 'granted',
      contacts: true,
      storage: true,
      microphone: browserPermissions.microphone === 'granted',
      hasSeenPrompt: true
    }
    setPermissions(allGranted)

    console.log(`[PERMISSION CHANGE] ALL PERMISSIONS REQUESTED at ${new Date().toISOString()}`)
    toast.success('All permissions have been processed')
  }

  const revokeAllPermissions = () => {
    const allRevoked: PermissionsState = {
      gmail: false,
      outlook: false,
      yahoo: false,
      calls: false,
      sms: false,
      calendar: false,
      googleCalendar: false,
      outlookCalendar: false,
      location: false,
      familyLocation: false,
      homeDevices: false,
      cameras: false,
      notifications: false,
      contacts: false,
      storage: true, // Keep storage
      microphone: false,
      hasSeenPrompt: true
    }
    setPermissions(allRevoked)

    console.log(`[PERMISSION CHANGE] ALL NON-ESSENTIAL PERMISSIONS REVOKED at ${new Date().toISOString()}`)
    toast.success('Non-essential permissions revoked. Note: Browser permissions must be revoked in browser settings.')
  }

  const PermissionItem = ({ permission }: { permission: any }) => {
    const Icon = permission.icon
    const isRequesting = isRequestingPermission === permission.browserType

    return (
      <div className="flex items-start justify-between py-4 space-x-4">
        <div className="flex items-start space-x-4 flex-1">
          <div className={`w-12 h-12 rounded-xl bg-${permission.color}/10 flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 text-${permission.color}`} weight="duotone" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Label className="font-medium">{permission.name}</Label>
              {permission.isRealBrowser ? (
                <>
                  {getPermissionBadge(permission.browserStatus)}
                  <Badge variant="outline" className="text-xs">Browser</Badge>
                </>
              ) : (
                permission.isGranted && (
                  <Badge variant="secondary" className="bg-mint/20 text-mint text-xs">
                    Granted
                  </Badge>
                )
              )}
            </div>
            <p className="text-sm text-muted-foreground">{permission.description}</p>
            {permission.isRealBrowser && permission.browserStatus === 'denied' && (
              <p className="text-xs text-destructive mt-1">
                Permission blocked. Please enable in your browser settings.
              </p>
            )}
          </div>
        </div>
        {permission.isRealBrowser ? (
          <Button
            size="sm"
            variant={permission.browserStatus === 'granted' ? 'secondary' : 'default'}
            onClick={() => handlePermissionToggle(permission)}
            disabled={isRequesting || permission.browserStatus === 'unsupported'}
            className="min-w-[100px]"
          >
            {isRequesting ? (
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Asking...
              </span>
            ) : permission.browserStatus === 'granted' ? (
              'Granted'
            ) : permission.browserStatus === 'denied' ? (
              'Re-request'
            ) : (
              'Allow'
            )}
          </Button>
        ) : (
          <Switch
            checked={permission.isGranted}
            onCheckedChange={() => handlePermissionToggle(permission)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Permissions & Privacy</h1>
        <p className="text-muted-foreground">
          Control what FlowSphere can access. Browser permissions are real and require your approval.
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
                <h3 className="text-lg font-semibold mb-2">Real Browser Permissions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Location, Camera, Microphone, and Notifications require <strong>real browser permissions</strong>.
                  When you click "Allow", your browser will prompt you for access.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={grantAllPermissions}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Request All
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
                <PermissionItem permission={permission} />
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
                <PermissionItem permission={permission} />
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
                <PermissionItem permission={permission} />
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
              <span>Device Access</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {homePermissions.map((permission, index) => (
              <div key={permission.id}>
                <PermissionItem permission={permission} />
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
              <span>App Data & Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataPermissions.map((permission, index) => (
              <div key={permission.id}>
                <PermissionItem permission={permission} />
                {index < dataPermissions.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
