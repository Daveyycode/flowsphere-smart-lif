import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Phone, 
  FirstAid, 
  FireExtinguisher, 
  ShieldWarning,
  Warning,
  HeartStraight,
  HandHeart
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

const hotlines: Hotline[] = [
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
  },
  {
    id: '7',
    name: 'Child Abuse',
    number: '1-800-422-4453',
    description: 'Childhelp National hotline',
    icon: <HandHeart className="w-6 h-6" weight="fill" />,
    color: 'bg-accent'
  },
  {
    id: '8',
    name: 'Disaster Distress',
    number: '1-800-985-5990',
    description: 'Crisis counseling and support',
    icon: <ShieldWarning className="w-6 h-6" weight="fill" />,
    color: 'bg-primary'
  }
]

export function EmergencyHotlines() {
  const handleCall = (number: string, name: string) => {
    window.location.href = `tel:${number}`
    toast.info(`Calling ${name}...`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 font-heading">
          Emergency Hotlines
        </h1>
        <p className="text-muted-foreground">
          Quick access to important emergency numbers
        </p>
      </div>

      <Card className="p-4 sm:p-6 bg-destructive/10 border-destructive/20">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {hotlines.map((hotline) => (
          <Card 
            key={hotline.id}
            className="p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-start gap-3 mb-4">
                <div className={`${hotline.color} text-white p-3 rounded-lg flex-shrink-0`}>
                  {hotline.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-1 font-heading">
                    {hotline.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {hotline.description}
                  </p>
                </div>
              </div>
              
              <div className="mt-auto">
                <Button
                  className="w-full min-touch-target"
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

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 font-heading">
          International Emergency Numbers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2">Europe</p>
            <p className="text-sm text-muted-foreground">112 - Universal emergency number</p>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">UK</p>
            <p className="text-sm text-muted-foreground">999 or 112 - Emergency services</p>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Australia</p>
            <p className="text-sm text-muted-foreground">000 - Emergency services</p>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Canada</p>
            <p className="text-sm text-muted-foreground">911 - Emergency services</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
