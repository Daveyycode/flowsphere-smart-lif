import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Lightning, 
  Plus, 
  Clock, 
  Lightbulb, 
  Thermometer, 
  Lock,
  Sun,
  Moon,
  MapPin,
  Play,
  Pause,
  Trash
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export interface Automation {
  id: string
  name: string
  trigger: 'time' | 'location' | 'device' | 'condition'
  triggerDetails: string
  actions: string[]
  isActive: boolean
  lastRun?: string
  icon: 'sun' | 'moon' | 'lightning' | 'lock' | 'lightbulb' | 'thermometer'
}

interface AutomationsViewProps {
  automations: Automation[]
  onToggleAutomation: (id: string, isActive: boolean) => void
  onDeleteAutomation: (id: string) => void
  onAddAutomation: (automation: Omit<Automation, 'id'>) => void
}

export function AutomationsView({
  automations,
  onToggleAutomation,
  onDeleteAutomation,
  onAddAutomation
}: AutomationsViewProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newAutomation, setNewAutomation] = useState<{
    name: string
    trigger: 'time' | 'location' | 'device' | 'condition'
    triggerDetails: string
    actions: string[]
    icon: 'sun' | 'moon' | 'lightning' | 'lock' | 'lightbulb' | 'thermometer'
  }>({
    name: '',
    trigger: 'time',
    triggerDetails: '',
    actions: [],
    icon: 'lightning'
  })

  const getAutomationIcon = (icon: string) => {
    switch (icon) {
      case 'sun': return Sun
      case 'moon': return Moon
      case 'lock': return Lock
      case 'lightbulb': return Lightbulb
      case 'thermometer': return Thermometer
      default: return Lightning
    }
  }

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'time': return Clock
      case 'location': return MapPin
      case 'device': return Lightbulb
      default: return Lightning
    }
  }

  const getIconColor = (icon: string) => {
    switch (icon) {
      case 'sun': return 'coral'
      case 'moon': return 'primary'
      case 'lock': return 'accent'
      case 'lightbulb': return 'mint'
      case 'thermometer': return 'coral'
      default: return 'accent'
    }
  }

  const handleToggle = (id: string, isActive: boolean) => {
    onToggleAutomation(id, isActive)
    toast.success(isActive ? 'Automation enabled' : 'Automation paused')
  }

  const handleDelete = (id: string, name: string) => {
    onDeleteAutomation(id)
    toast.success(`"${name}" deleted`)
  }

  const handleAddAutomation = () => {
    if (!newAutomation.name || !newAutomation.triggerDetails) {
      toast.error('Please fill in all required fields')
      return
    }

    onAddAutomation({
      ...newAutomation,
      isActive: true,
      actions: newAutomation.actions.length > 0 ? newAutomation.actions : ['Turn on lights']
    })
    
    setIsAddDialogOpen(false)
    setNewAutomation({
      name: '',
      trigger: 'time',
      triggerDetails: '',
      actions: [],
      icon: 'lightning'
    })
    toast.success('Automation created successfully')
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Automations</h1>
          <p className="text-muted-foreground">
            Create intelligent routines for your smart home
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90">
              <Plus className="w-5 h-5 mr-2" weight="bold" />
              Create Automation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Automation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="automation-name">Automation Name</Label>
                <Input
                  id="automation-name"
                  placeholder="Morning Routine"
                  value={newAutomation.name}
                  onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="trigger-type">Trigger Type</Label>
                <Select
                  value={newAutomation.trigger}
                  onValueChange={(value: any) => setNewAutomation({ ...newAutomation, trigger: value })}
                >
                  <SelectTrigger id="trigger-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">Time-based</SelectItem>
                    <SelectItem value="location">Location-based</SelectItem>
                    <SelectItem value="device">Device-based</SelectItem>
                    <SelectItem value="condition">Condition-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trigger-details">Trigger Details</Label>
                <Input
                  id="trigger-details"
                  placeholder={
                    newAutomation.trigger === 'time' ? '6:45 AM' :
                    newAutomation.trigger === 'location' ? 'When arriving home' :
                    newAutomation.trigger === 'device' ? 'When light turns on' :
                    'Temperature below 65°F'
                  }
                  value={newAutomation.triggerDetails}
                  onChange={(e) => setNewAutomation({ ...newAutomation, triggerDetails: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon-select">Icon</Label>
                <Select
                  value={newAutomation.icon}
                  onValueChange={(value: any) => setNewAutomation({ ...newAutomation, icon: value })}
                >
                  <SelectTrigger id="icon-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sun">☀️ Sun</SelectItem>
                    <SelectItem value="moon">🌙 Moon</SelectItem>
                    <SelectItem value="lightning">⚡ Lightning</SelectItem>
                    <SelectItem value="lock">🔒 Lock</SelectItem>
                    <SelectItem value="lightbulb">💡 Lightbulb</SelectItem>
                    <SelectItem value="thermometer">🌡️ Thermometer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleAddAutomation} 
                className="w-full bg-accent hover:bg-accent/90"
              >
                Create Automation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                <Lightning className="w-6 h-6 text-accent" weight="fill" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Automate Your Life</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Set up intelligent automations that respond to your daily patterns. Save time and energy by letting FlowSphere handle routine tasks automatically.
                </p>
                <Button variant="link" className="text-accent p-0 h-auto">
                  Learn about automation best practices →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {automations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Lightning className="w-10 h-10 text-muted-foreground" weight="duotone" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No automations yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first automation to start saving time
          </p>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-accent hover:bg-accent/90"
          >
            <Plus className="w-5 h-5 mr-2" weight="bold" />
            Create Your First Automation
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {automations.map((automation, index) => {
            const Icon = getAutomationIcon(automation.icon)
            const TriggerIcon = getTriggerIcon(automation.trigger)
            const color = getIconColor(automation.icon)

            return (
              <motion.div
                key={automation.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className={`border-border/50 hover:border-${color}/50 transition-all duration-300 ${automation.isActive ? 'hover:shadow-lg' : 'opacity-70'}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        <div className={`w-12 h-12 rounded-xl bg-${color}/10 flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-6 h-6 text-${color}`} weight="duotone" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{automation.name}</h3>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <TriggerIcon className="w-4 h-4" weight="duotone" />
                            <span className="capitalize">{automation.trigger}</span>
                            <span>•</span>
                            <span>{automation.triggerDetails}</span>
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={automation.isActive}
                        onCheckedChange={(checked) => handleToggle(automation.id, checked)}
                      />
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium text-muted-foreground">Actions:</p>
                      <div className="flex flex-wrap gap-2">
                        {automation.actions.map((action, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {automation.lastRun && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Last run: {automation.lastRun}
                      </p>
                    )}

                    <div className="flex items-center space-x-2 pt-3 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        disabled={!automation.isActive}
                      >
                        {automation.isActive ? (
                          <>
                            <Play className="w-4 h-4 mr-2" weight="fill" />
                            Run Now
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4 mr-2" weight="fill" />
                            Paused
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(automation.id, automation.name)}
                      >
                        <Trash className="w-4 h-4" weight="duotone" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
