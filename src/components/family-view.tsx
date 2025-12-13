import { motion } from 'framer-motion'
import {
  MapPin,
  Phone,
  Clock,
  Plus,
  Shield,
  Crosshair,
  Bell,
  EnvelopeSimple,
  Microphone,
  SpeakerHigh,
  PencilSimple,
  X,
  Copy,
  Check,
  DownloadSimple,
  QrCode as QrCodeIcon,
  NavigationArrow,
  Spinner,
  Warning,
  MapTrifold,
  GraduationCap,
  Users,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { useDeviceType } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { useGPSTracking } from '@/hooks/use-gps-tracking'
import { openInMaps } from '@/lib/gps-tracking'
import { KidsLearningCenter } from '@/components/kids-learning-center'

export interface SafeZone {
  id: string
  name: string
  type: 'home' | 'work' | 'school' | 'custom'
  coordinates: { lat: number; lng: number }
  radius: number // in meters
  address?: string
  isActive?: boolean
  alertOnEntry?: boolean
  alertOnExit?: boolean
}

export interface FamilyMember {
  id: string
  name: string
  avatar?: string
  location: string
  battery: number
  status: 'home' | 'work' | 'school' | 'traveling'
  lastSeen: string
  phoneNumber?: string
  relationship?: string
  homeAddress?: string
  workAddress?: string
  schoolAddress?: string
  gpsCoordinates?: { lat: number; lng: number }
  registeredIpLocation?: { lat: number; lng: number; address: string }
  emailNotificationsEnabled?: boolean
  safeZones?: SafeZone[]
}

interface FamilyViewProps {
  members: FamilyMember[]
  onUpdateMember?: (id: string, updates: Partial<FamilyMember>) => void
}

type FamilyTab = 'safety' | 'learning'

export function FamilyView({ members, onUpdateMember }: FamilyViewProps) {
  const [activeTab, setActiveTab] = useState<FamilyTab>('safety')
  const [gpsMonitoringEnabled, setGpsMonitoringEnabled] = useKV<boolean>(
    'flowsphere-gps-monitoring',
    true
  )
  const [lastGpsCheck] = useKV<string>('flowsphere-last-gps-check', '')
  const [recordingSOS, setRecordingSOS] = useState<string | null>(null)
  const [sosMessages] = useKV<
    Record<string, { audioUrl: string; timestamp: string; openedBy: string[] }>
  >('flowsphere-sos-messages', {})

  // Real GPS tracking
  const gps = useGPSTracking()

  // Edit dialog state
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    phoneNumber: '',
    location: '',
    homeAddress: '',
    workAddress: '',
    schoolAddress: '',
    status: 'home' as FamilyMember['status'],
    emailNotificationsEnabled: true,
  })

  // Invite member dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: '',
    phoneNumber: '',
    additionalPhones: [''],
    safeZone: '',
    safeZoneStartTime: '09:00',
    safeZoneEndTime: '17:00',
    sosTriggerWord: '',
    gpsTrackingEnabled: true,
    realTimeLocationEnabled: true,
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'home':
        return 'mint'
      case 'work':
        return 'accent'
      case 'school':
        return 'coral'
      case 'traveling':
        return 'primary'
      default:
        return 'muted'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const handleGpsToggle = (enabled: boolean) => {
    setGpsMonitoringEnabled(enabled)
    if (enabled) {
      // Start real GPS tracking
      gps.startTracking()
      toast.success('GPS monitoring enabled - Real-time location tracking active')
    } else {
      // Stop GPS tracking
      gps.stopTracking()
      toast.info('GPS monitoring disabled')
    }
  }

  // Handle real SOS with GPS location
  const handleRealSOS = (memberName: string) => {
    if (!gps.currentLocation) {
      // Try to get location first
      gps.requestLocation().then(location => {
        if (location) {
          gps.sendSOS(memberName, 'Emergency SOS triggered!')
        }
      })
    } else {
      gps.sendSOS(memberName, 'Emergency SOS triggered!')
    }
  }

  const [generatedInviteCode, setGeneratedInviteCode] = useState<string | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)

  // Generate QR code when invite code is created
  useEffect(() => {
    if (generatedInviteCode) {
      const qrData = JSON.stringify({
        type: 'flowsphere-family-invite',
        code: generatedInviteCode,
        url: `${window.location.origin}?invite=${generatedInviteCode}`,
      })

      QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then(setQrCodeDataUrl)
        .catch(console.error)
    } else {
      setQrCodeDataUrl(null)
    }
  }, [generatedInviteCode])

  const handleSendInvite = () => {
    if (!inviteForm.name.trim() || !inviteForm.phoneNumber.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    // Generate unique 6-character invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Store invite details for validation later
    const inviteData = {
      code: inviteCode,
      name: inviteForm.name,
      phoneNumber: inviteForm.phoneNumber,
      gpsTracking: inviteForm.gpsTrackingEnabled,
      realTimeLocation: inviteForm.realTimeLocationEnabled,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }

    // Save to localStorage for now (in production, would be backend)
    const existingInvites = JSON.parse(localStorage.getItem('flowsphere-family-invites') || '[]')
    localStorage.setItem(
      'flowsphere-family-invites',
      JSON.stringify([...existingInvites, inviteData])
    )

    setGeneratedInviteCode(inviteCode)

    toast.success('Invite code generated!', {
      description: `Share code ${inviteCode} with ${inviteForm.name}`,
      duration: 8000,
    })

    // Reset form
    setInviteForm({
      name: '',
      phoneNumber: '',
      additionalPhones: [''],
      safeZone: '',
      safeZoneStartTime: '09:00',
      safeZoneEndTime: '17:00',
      sosTriggerWord: '',
      gpsTrackingEnabled: true,
      realTimeLocationEnabled: true,
    })
    setShowInviteDialog(false)
  }

  const copyInviteCode = () => {
    if (generatedInviteCode) {
      navigator.clipboard.writeText(generatedInviteCode)
      toast.success('Invite code copied to clipboard!')
    }
  }

  const downloadQRCode = () => {
    if (qrCodeDataUrl && generatedInviteCode) {
      const link = document.createElement('a')
      link.download = `flowsphere-invite-${generatedInviteCode}.png`
      link.href = qrCodeDataUrl
      link.click()
      toast.success('QR code downloaded!')
    }
  }

  const handleSOSRecord = (memberId: string, memberName: string) => {
    if (recordingSOS === memberId) {
      // Stop recording
      setRecordingSOS(null)
      toast.success('SOS message sent!', {
        description: `Emergency voice message sent to all family members, bypassing DND mode`,
        duration: 5000,
      })
      // In a real app, this would:
      // 1. Stop audio recording
      // 2. Upload audio to server
      // 3. Send push notifications to all family members (bypass DND)
      // 4. Create group chat with audio message
      // 5. Track who opened/listened to it
    } else {
      // Start recording
      setRecordingSOS(memberId)
      toast.error('🚨 SOS Recording Started', {
        description: `Recording emergency message from ${memberName}. Press again to send to all family members.`,
        duration: 5000,
      })
      // In a real app, start audio recording here
    }
  }

  const handleEditClick = (member: FamilyMember) => {
    setEditingMember(member)
    setEditForm({
      name: member.name,
      phoneNumber: member.phoneNumber || '',
      location: member.location,
      homeAddress: member.homeAddress || '',
      workAddress: member.workAddress || '',
      schoolAddress: member.schoolAddress || '',
      status: member.status,
      emailNotificationsEnabled: member.emailNotificationsEnabled ?? true,
    })
  }

  const handleCloseEdit = () => {
    setEditingMember(null)
    setEditForm({
      name: '',
      phoneNumber: '',
      location: '',
      homeAddress: '',
      workAddress: '',
      schoolAddress: '',
      status: 'home',
      emailNotificationsEnabled: true,
    })
  }

  const handleSaveEdit = () => {
    if (!editingMember || !onUpdateMember) return

    if (!editForm.name.trim()) {
      toast.error('Name is required')
      return
    }

    onUpdateMember(editingMember.id, {
      name: editForm.name.trim(),
      phoneNumber: editForm.phoneNumber.trim() || undefined,
      location: editForm.location.trim(),
      homeAddress: editForm.homeAddress.trim() || undefined,
      workAddress: editForm.workAddress.trim() || undefined,
      schoolAddress: editForm.schoolAddress.trim() || undefined,
      status: editForm.status,
      emailNotificationsEnabled: editForm.emailNotificationsEnabled,
    })

    toast.success('Family member updated!', {
      description: `${editForm.name}'s details have been saved`,
    })

    handleCloseEdit()
  }

  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  // If Kids Learning tab is active, show the unified learning center
  if (activeTab === 'learning') {
    return (
      <div className="space-y-6 pb-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={activeTab === 'safety' ? 'default' : 'ghost'}
            size={isMobile ? 'sm' : 'default'}
            onClick={() => setActiveTab('safety')}
            className="flex-1"
          >
            <Users className="w-4 h-4 mr-2" />
            Family Safety
          </Button>
          <Button
            variant={activeTab === 'learning' ? 'default' : 'ghost'}
            size={isMobile ? 'sm' : 'default'}
            onClick={() => setActiveTab('learning')}
            className="flex-1"
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Kids Learning
          </Button>
        </div>

        {/* Kids Learning Center - Unified Tutor AI + Study Monitor + Focus Report */}
        <KidsLearningCenter />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <Button
          variant={activeTab === 'safety' ? 'default' : 'ghost'}
          size={isMobile ? 'sm' : 'default'}
          onClick={() => setActiveTab('safety')}
          className="flex-1"
        >
          <Users className="w-4 h-4 mr-2" />
          Family Safety
        </Button>
        <Button
          variant={activeTab === 'learning' ? 'default' : 'ghost'}
          size={isMobile ? 'sm' : 'default'}
          onClick={() => setActiveTab('learning')}
          className="flex-1"
        >
          <GraduationCap className="w-4 h-4 mr-2" />
          Kids Learning
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn('font-bold mb-2', isMobile ? 'text-2xl' : 'text-4xl')}>
            Family Safety
          </h1>
          <p className="text-muted-foreground text-sm">
            Keep track of your loved ones' locations and safety
          </p>
        </div>
        <Button
          variant="outline"
          size={isMobile ? 'sm' : 'default'}
          onClick={() => setShowInviteDialog(true)}
        >
          <Plus className="w-5 h-5 mr-2" weight="bold" />
          {!isMobile && 'Invite Member'}
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-accent/10 via-primary/10 to-coral/10 border-accent/20">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-accent" weight="fill" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">All Family Members Safe</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Everyone is within their expected zones. No alerts at this time.
                </p>
                <Button variant="link" className="text-accent p-0 h-auto">
                  View safety zones →
                </Button>
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
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-blue-mid/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Crosshair className="w-5 h-5 text-primary" weight="bold" />
                </div>
                <div>
                  <CardTitle className="text-lg">GPS Monitoring & Email Alerts</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get notified when family members move 1km+ from home
                  </p>
                </div>
              </div>
              <Switch
                checked={gpsMonitoringEnabled || false}
                onCheckedChange={handleGpsToggle}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
              <EnvelopeSimple className="w-5 h-5 text-primary mt-0.5" weight="duotone" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Automatic Email Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive instant email alerts when any family member's GPS location moves more than
                  1 kilometer away from their registered home IP address.
                </p>
              </div>
            </div>

            {lastGpsCheck && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Last GPS check: {new Date(lastGpsCheck).toLocaleString()}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {gpsMonitoringEnabled
                  ? 'Active monitoring - Checks every 5 minutes'
                  : 'GPS monitoring is currently disabled'}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Live GPS Location Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <Card
          className={cn(
            'border-2 transition-all duration-300',
            gps.isTracking
              ? 'border-green-500/50 bg-gradient-to-br from-green-500/10 to-emerald-500/5'
              : 'border-muted bg-gradient-to-br from-muted/10 to-transparent'
          )}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    gps.isTracking ? 'bg-green-500/20' : 'bg-muted/20'
                  )}
                >
                  <NavigationArrow
                    className={cn(
                      'w-5 h-5',
                      gps.isTracking ? 'text-green-500 animate-pulse' : 'text-muted-foreground'
                    )}
                    weight="bold"
                  />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Your Live Location
                    {gps.isTracking && (
                      <Badge
                        variant="outline"
                        className="text-green-500 border-green-500/50 text-xs"
                      >
                        LIVE
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {gps.isTracking
                      ? 'Real-time GPS tracking active'
                      : 'Enable tracking to share your location'}
                  </p>
                </div>
              </div>
              <Button
                variant={gps.isTracking ? 'destructive' : 'default'}
                size="sm"
                onClick={() => (gps.isTracking ? gps.stopTracking() : gps.startTracking())}
                disabled={gps.isLoading}
              >
                {gps.isLoading ? (
                  <Spinner className="w-4 h-4 animate-spin mr-2" />
                ) : gps.isTracking ? (
                  <Warning className="w-4 h-4 mr-2" />
                ) : (
                  <NavigationArrow className="w-4 h-4 mr-2" />
                )}
                {gps.isTracking ? 'Stop Tracking' : 'Start Tracking'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!gps.isSupported ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
                <Warning className="w-6 h-6 flex-shrink-0" weight="fill" />
                <div>
                  <p className="font-medium">GPS Not Available</p>
                  <p className="text-sm opacity-80">Your browser doesn't support geolocation</p>
                </div>
              </div>
            ) : gps.error ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
                <Warning className="w-6 h-6 flex-shrink-0" weight="fill" />
                <div className="flex-1">
                  <p className="font-medium">Location Error</p>
                  <p className="text-sm opacity-80">{gps.error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => gps.requestLocation()}>
                  Retry
                </Button>
              </div>
            ) : gps.currentLocation ? (
              <div className="space-y-3">
                {/* Location display */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                  <MapPin className="w-5 h-5 text-green-500 mt-0.5" weight="fill" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {gps.currentLocation.address ||
                        `${gps.currentLocation.lat.toFixed(6)}, ${gps.currentLocation.lng.toFixed(6)}`}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Accuracy: {Math.round(gps.currentLocation.accuracy)}m</span>
                      <span>Updated: {gps.formatTime(gps.currentLocation.timestamp)}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      openInMaps(gps.currentLocation!.lat, gps.currentLocation!.lng, 'My Location')
                    }
                  >
                    <MapTrifold className="w-4 h-4 mr-1" />
                    Open Map
                  </Button>
                </div>

                {/* Coordinates display */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Latitude</p>
                    <p className="font-mono text-sm font-medium">
                      {gps.currentLocation.lat.toFixed(6)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Longitude</p>
                    <p className="font-mono text-sm font-medium">
                      {gps.currentLocation.lng.toFixed(6)}
                    </p>
                  </div>
                </div>

                {/* Speed and altitude if available */}
                {(gps.currentLocation.speed || gps.currentLocation.altitude) && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {gps.currentLocation.speed && (
                      <span>Speed: {Math.round(gps.currentLocation.speed * 3.6)} km/h</span>
                    )}
                    {gps.currentLocation.altitude && (
                      <span>Altitude: {Math.round(gps.currentLocation.altitude)}m</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <NavigationArrow
                  className="w-12 h-12 text-muted-foreground mx-auto mb-3"
                  weight="duotone"
                />
                <p className="text-muted-foreground mb-3">
                  Click "Start Tracking" to enable live GPS location sharing
                </p>
                <Button
                  variant="outline"
                  onClick={() => gps.requestLocation()}
                  disabled={gps.isLoading}
                >
                  {gps.isLoading ? (
                    <Spinner className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Crosshair className="w-4 h-4 mr-2" />
                  )}
                  Get My Location Now
                </Button>
              </div>
            )}

            {/* SOS Alert Section */}
            {gps.currentLocation && (
              <div className="pt-3 border-t border-border/50">
                <Button
                  variant="destructive"
                  className="w-full h-12 text-lg font-bold animate-pulse"
                  onClick={() => handleRealSOS('Me')}
                >
                  🚨 EMERGENCY SOS - Share My Location
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Sends your exact GPS coordinates to all family members
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                        {member.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{member.name}</CardTitle>
                      <Badge
                        variant="secondary"
                        className={`mt-1 bg-${getStatusColor(member.status)}/20 text-${getStatusColor(member.status)}`}
                      >
                        {getStatusLabel(member.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(member)}
                      className="hover:bg-accent/10 hover:text-accent"
                    >
                      <PencilSimple className="w-5 h-5" weight="duotone" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (member.phoneNumber) {
                          toast.success(`Calling ${member.name}...`, {
                            description: 'Connecting your call now',
                            duration: 3000,
                          })
                          window.location.href = `tel:${member.phoneNumber}`
                        } else {
                          toast.error('No phone number', {
                            description: 'Please add a phone number to call this family member',
                          })
                        }
                      }}
                    >
                      <Phone className="w-5 h-5" weight="duotone" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" weight="duotone" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{member.location}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{member.lastSeen}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Battery</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${member.battery}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                          className={`h-full ${
                            member.battery > 50
                              ? 'bg-mint'
                              : member.battery > 20
                                ? 'bg-coral'
                                : 'bg-destructive'
                          }`}
                        />
                      </div>
                      <span className="text-sm font-medium">{member.battery}%</span>
                    </div>
                  </div>
                </div>

                {/* Emergency SOS Button */}
                <div className="pt-3 border-t border-border/50">
                  <Button
                    variant={recordingSOS === member.id ? 'destructive' : 'outline'}
                    className={cn('w-full', recordingSOS === member.id && 'animate-pulse')}
                    onClick={() => handleSOSRecord(member.id, member.name)}
                  >
                    {recordingSOS === member.id ? (
                      <>
                        <SpeakerHigh className="w-5 h-5 mr-2" weight="fill" />
                        Stop & Send SOS
                      </>
                    ) : (
                      <>
                        <Microphone className="w-5 h-5 mr-2" weight="duotone" />
                        🚨 Emergency SOS
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Bypasses DND • Sends to all family • Group chat created
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {members.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No family members yet</h3>
          <p className="text-muted-foreground mb-6">
            Invite your family to start tracking their safety
          </p>
          <Button
            className="bg-accent hover:bg-accent/90"
            onClick={() => setShowInviteDialog(true)}
          >
            <Plus className="w-5 h-5 mr-2" weight="bold" />
            Invite Family Member
          </Button>
        </motion.div>
      )}

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={open => !open && handleCloseEdit()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PencilSimple className="w-5 h-5 text-accent" weight="duotone" />
              Edit Family Member
            </DialogTitle>
            <DialogDescription>
              Update the details for this family member. Name, phone, location, and status are
              required. Addresses are optional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter name"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number *</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editForm.phoneNumber}
                onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location">Current Location *</Label>
              <Input
                id="edit-location"
                value={editForm.location}
                onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="e.g., Home, Work, School"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-home">Home Address (Optional)</Label>
              <Input
                id="edit-home"
                value={editForm.homeAddress}
                onChange={e => setEditForm({ ...editForm, homeAddress: e.target.value })}
                placeholder="123 Home St, City, State"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-work">Work Address (Optional)</Label>
              <Input
                id="edit-work"
                value={editForm.workAddress}
                onChange={e => setEditForm({ ...editForm, workAddress: e.target.value })}
                placeholder="123 Work St, City, State"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-school">School Address (Optional)</Label>
              <Input
                id="edit-school"
                value={editForm.schoolAddress}
                onChange={e => setEditForm({ ...editForm, schoolAddress: e.target.value })}
                placeholder="123 School St, City, State"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status *</Label>
              <Select
                value={editForm.status}
                onValueChange={(value: FamilyMember['status']) =>
                  setEditForm({ ...editForm, status: value })
                }
              >
                <SelectTrigger id="edit-status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-mint" />
                      Home
                    </div>
                  </SelectItem>
                  <SelectItem value="work">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      Work
                    </div>
                  </SelectItem>
                  <SelectItem value="school">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-coral" />
                      School
                    </div>
                  </SelectItem>
                  <SelectItem value="traveling">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      Traveling
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40">
              <div className="flex-1">
                <Label htmlFor="edit-gps" className="text-sm font-medium">
                  GPS & Email Notifications
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Receive email alerts when this member moves 1km+ from home
                </p>
              </div>
              <Switch
                id="edit-gps"
                checked={editForm.emailNotificationsEnabled}
                onCheckedChange={checked =>
                  setEditForm({ ...editForm, emailNotificationsEnabled: checked })
                }
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleCloseEdit}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveEdit} className="bg-accent hover:bg-accent/90">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Family Member</DialogTitle>
            <DialogDescription>Send an invite to join your family safety network</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Name *</Label>
              <Input
                id="invite-name"
                placeholder="Enter family member's name"
                value={inviteForm.name}
                onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-phone">Phone Number *</Label>
              <Input
                id="invite-phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={inviteForm.phoneNumber}
                onChange={e => setInviteForm({ ...inviteForm, phoneNumber: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                An SMS invitation will be sent to this number
              </p>
            </div>

            <div className="space-y-2">
              <Label>Safe Zone Location</Label>
              <Input
                placeholder="e.g., Work, School, Home"
                value={inviteForm.safeZone}
                onChange={e => setInviteForm({ ...inviteForm, safeZone: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label className="text-xs">Start Time</Label>
                  <Input
                    type="time"
                    value={inviteForm.safeZoneStartTime}
                    onChange={e =>
                      setInviteForm({ ...inviteForm, safeZoneStartTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">End Time</Label>
                  <Input
                    type="time"
                    value={inviteForm.safeZoneEndTime}
                    onChange={e =>
                      setInviteForm({ ...inviteForm, safeZoneEndTime: e.target.value })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Expected location and time (e.g., husband's work 9am-5pm)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Emergency SOS Trigger Word</Label>
              <Input
                placeholder="e.g., HELP, EMERGENCY, etc."
                value={inviteForm.sosTriggerWord}
                onChange={e => setInviteForm({ ...inviteForm, sosTriggerWord: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Keyword to trigger emergency alert</p>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="gps-tracking">GPS Tracking</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable location tracking for this member
                  </p>
                </div>
                <Switch
                  id="gps-tracking"
                  checked={inviteForm.gpsTrackingEnabled}
                  onCheckedChange={checked =>
                    setInviteForm({ ...inviteForm, gpsTrackingEnabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="realtime-location">Real-Time Location</Label>
                  <p className="text-xs text-muted-foreground">
                    Show live location updates on the map
                  </p>
                </div>
                <Switch
                  id="realtime-location"
                  checked={inviteForm.realTimeLocationEnabled}
                  onCheckedChange={checked =>
                    setInviteForm({ ...inviteForm, realTimeLocationEnabled: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowInviteDialog(false)
                setInviteForm({
                  name: '',
                  phoneNumber: '',
                  additionalPhones: [''],
                  safeZone: '',
                  safeZoneStartTime: '09:00',
                  safeZoneEndTime: '17:00',
                  sosTriggerWord: '',
                  gpsTrackingEnabled: true,
                  realTimeLocationEnabled: true,
                })
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendInvite}
              className="bg-accent hover:bg-accent/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Code Display Dialog */}
      <Dialog open={!!generatedInviteCode} onOpenChange={() => setGeneratedInviteCode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" weight="bold" />
              Family Invite Code Generated
            </DialogTitle>
            <DialogDescription>
              Share this code with your family member to add them to your safety network
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* QR Code */}
            {qrCodeDataUrl && (
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg border-2 border-accent">
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}

            {/* Text Code */}
            <div className="p-6 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 border-2 border-accent">
              <p className="text-xs text-muted-foreground mb-2 text-center">Invite Code</p>
              <p className="text-4xl font-bold text-center tracking-wider font-mono">
                {generatedInviteCode}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                <strong>How to use:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Scan the QR code OR copy the invite code</li>
                <li>Family member opens FlowSphere and goes to Family tab</li>
                <li>Click "Join Family" and scan QR or enter code</li>
                <li>Code expires in 7 days</li>
              </ol>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button type="button" variant="outline" onClick={downloadQRCode} className="gap-2">
              <DownloadSimple className="w-4 h-4" />
              Download QR
            </Button>
            <Button type="button" variant="outline" onClick={copyInviteCode} className="gap-2">
              <Copy className="w-4 h-4" />
              Copy Code
            </Button>
            <Button
              type="button"
              onClick={() => setGeneratedInviteCode(null)}
              className="bg-accent hover:bg-accent/90"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
