import { motion } from 'framer-motion'
import { MapPin, Phone, Clock, Plus, Shield, Crosshair, Bell, EnvelopeSimple } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

export interface FamilyMember {
  id: string
  name: string
  avatar?: string
  location: string
  battery: number
  status: 'home' | 'work' | 'school' | 'traveling'
  lastSeen: string
  gpsCoordinates?: { lat: number; lng: number }
  registeredIpLocation?: { lat: number; lng: number; address: string }
  emailNotificationsEnabled?: boolean
}

interface FamilyViewProps {
  members: FamilyMember[]
}

export function FamilyView({ members }: FamilyViewProps) {
  const [gpsMonitoringEnabled, setGpsMonitoringEnabled] = useKV<boolean>('flowsphere-gps-monitoring', true)
  const [lastGpsCheck] = useKV<string>('flowsphere-last-gps-check', '')
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'home': return 'mint'
      case 'work': return 'accent'
      case 'school': return 'coral'
      case 'traveling': return 'primary'
      default: return 'muted'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }
  
  const handleGpsToggle = (enabled: boolean) => {
    setGpsMonitoringEnabled(enabled)
    if (enabled) {
      toast.success('GPS monitoring enabled - Email alerts will be sent when family members move >1km from home')
    } else {
      toast.info('GPS monitoring disabled')
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Family Safety</h1>
          <p className="text-muted-foreground">
            Keep track of your loved ones' locations and safety
          </p>
        </div>
        <Button variant="outline">
          <Plus className="w-5 h-5 mr-2" weight="bold" />
          Invite Member
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
                  Receive instant email alerts when any family member's GPS location moves more than 1 kilometer away from their registered home IP address.
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
                  ? "Active monitoring - Checks every 5 minutes" 
                  : "GPS monitoring is currently disabled"}
              </span>
            </div>
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
                        {member.name.split(' ').map(n => n[0]).join('')}
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
                  <Button variant="ghost" size="icon">
                    <Phone className="w-5 h-5" weight="duotone" />
                  </Button>
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
          <Button className="bg-accent hover:bg-accent/90">
            <Plus className="w-5 h-5 mr-2" weight="bold" />
            Invite Family Member
          </Button>
        </motion.div>
      )}
    </div>
  )
}
