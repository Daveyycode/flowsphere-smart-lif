import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Phone, 
  FirstAid, 
  FireExtinguisher, 
  ShieldWarning,
  Warning,
  HeartStraight,
  HandHeart,
  MapPin
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Hotline {
  id: string
  name: string
  number: string
  description: string
  icon: React.ReactNode
  color: string
}

interface EmergencyDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function EmergencyDialog({ isOpen, onClose }: EmergencyDialogProps) {
  const [location, setLocation] = useState<string>('United States')
  const [isDetecting, setIsDetecting] = useState(false)

  const getHotlinesForLocation = (loc: string): Hotline[] => {
    const baseHotlines = [
      {
        id: '1',
        name: 'Emergency Services',
        number: '911',
        description: 'Police, Fire, Medical Emergency',
        icon: <ShieldWarning className="w-6 h-6" weight="fill" />,
        color: 'bg-destructive'
      },
      {
        id: '2',
        name: 'Fire Department',
        number: '911',
        description: 'Fire emergency and rescue',
        icon: <FireExtinguisher className="w-6 h-6" weight="fill" />,
        color: 'bg-coral'
      },
      {
        id: '3',
        name: 'Medical Emergency',
        number: '911',
        description: 'Ambulance and medical assistance',
        icon: <FirstAid className="w-6 h-6" weight="fill" />,
        color: 'bg-destructive'
      },
      {
        id: '4',
        name: 'Poison Control',
        number: '1-800-222-1222',
        description: '24/7 poison emergency helpline',
        icon: <Warning className="w-6 h-6" weight="fill" />,
        color: 'bg-accent'
      },
      {
        id: '5',
        name: 'Suicide Prevention',
        number: '988',
        description: 'Crisis support and prevention',
        icon: <HeartStraight className="w-6 h-6" weight="fill" />,
        color: 'bg-coral'
      },
      {
        id: '6',
        name: 'Domestic Violence',
        number: '1-800-799-7233',
        description: 'National domestic violence hotline',
        icon: <HandHeart className="w-6 h-6" weight="fill" />,
        color: 'bg-primary'
      }
    ]
    
    return baseHotlines
  }

  const detectLocation = async () => {
    setIsDetecting(true)
    try {
      const response = await fetch('https://ipapi.co/json/')
      const data = await response.json()
      setLocation(data.country_name || 'United States')
      toast.success(`Location detected: ${data.country_name}`)
    } catch (error) {
      toast.error('Could not detect location. Showing US numbers.')
      setLocation('United States')
    } finally {
      setIsDetecting(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      detectLocation()
    }
  }, [isOpen])

  const hotlines = getHotlinesForLocation(location)

  const handleCall = (number: string, name: string) => {
    window.location.href = `tel:${number}`
    toast.info(`Calling ${name}...`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <ShieldWarning className="w-6 h-6 text-destructive" weight="fill" />
              Emergency Hotlines
            </DialogTitle>
            <Badge variant="secondary" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {isDetecting ? 'Detecting...' : location}
            </Badge>
          </div>
        </DialogHeader>

        <Card className="p-4 bg-destructive/10 border-destructive/20 mb-4">
          <div className="flex items-start gap-3">
            <ShieldWarning className="w-6 h-6 text-destructive flex-shrink-0 mt-1" weight="fill" />
            <div>
              <h3 className="font-semibold text-destructive mb-1">Emergency Notice</h3>
              <p className="text-sm text-muted-foreground">
                If you or someone else is in immediate danger, call 911 immediately. 
                These hotlines are for emergencies and crisis support.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {hotlines.map((hotline) => (
            <Card 
              key={hotline.id}
              className="p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`${hotline.color} text-white p-3 rounded-lg flex-shrink-0`}>
                    {hotline.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1">
                      {hotline.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {hotline.description}
                    </p>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <Button
                    className="w-full"
                    onClick={() => handleCall(hotline.number, hotline.name)}
                  >
                    <Phone className="w-4 h-4 mr-2" weight="fill" />
                    {hotline.number}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-4 mt-4">
          <h3 className="text-lg font-semibold mb-3">
            International Emergency Numbers
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-sm font-semibold mb-1">Europe</p>
              <p className="text-sm text-muted-foreground">112 - Universal emergency</p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">UK</p>
              <p className="text-sm text-muted-foreground">999 or 112</p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Australia</p>
              <p className="text-sm text-muted-foreground">000 - Emergency services</p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Canada</p>
              <p className="text-sm text-muted-foreground">911 - Emergency services</p>
            </div>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
