import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Lightbulb, 
  Thermometer, 
  Lock, 
  Camera, 
  Power, 
  Plus, 
  Television, 
  Robot, 
  Fan, 
  SpeakerHigh, 
  Wind,
  Lightning,
  Clock,
  Sun,
  Moon,
  MapPin,
  Play,
  Pause,
  Trash
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

export interface Device {
  id: string
  name: string
  type: 'light' | 'thermostat' | 'lock' | 'camera' | 'television' | 'robot' | 'fan' | 'speaker' | 'air-purifier'
  status: 'online' | 'offline'
  isOn: boolean
  brightness?: number
  temperature?: number
  locked?: boolean
  volume?: number
  speed?: number
  channel?: string
  batteryLevel?: number
  cleaningMode?: string
  room: string
  cameraLocation?: 'outside' | 'inside'
  isRecording?: boolean
}

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

interface DevicesAutomationsViewProps {
  devices: Device[]
  automations: Automation[]
  onDeviceUpdate: (id: string, updates: Partial<Device>) => void
  onAddDevice: (device: Omit<Device, 'id'>) => void
  onDeleteDevice: (id: string) => void
  onToggleAutomation: (id: string, isActive: boolean) => void
  onDeleteAutomation: (id: string) => void
  onAddAutomation: (automation: Omit<Automation, 'id'>) => void
}

export function DevicesAutomationsView({
  devices,
  automations,
  onDeviceUpdate,
  onAddDevice,
  onDeleteDevice,
  onToggleAutomation,
  onDeleteAutomation,
  onAddAutomation
}: DevicesAutomationsViewProps) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [isAddDeviceDialogOpen, setIsAddDeviceDialogOpen] = useState(false)
  const [isAddAutomationDialogOpen, setIsAddAutomationDialogOpen] = useState(false)
  
  const [newDevice, setNewDevice] = useState<{
    name: string
    type: 'light' | 'thermostat' | 'lock' | 'camera' | 'television' | 'robot' | 'fan' | 'speaker' | 'air-purifier'
    room: string
    status: 'online' | 'offline'
    isOn: boolean
    cameraLocation?: 'outside' | 'inside'
  }>({
    name: '',
    type: 'light',
    room: 'Living Room',
    status: 'online',
    isOn: false,
    cameraLocation: 'outside'
  })

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

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'light': return Lightbulb
      case 'thermostat': return Thermometer
      case 'lock': return Lock
      case 'camera': return Camera
      case 'television': return Television
      case 'robot': return Robot
      case 'fan': return Fan
      case 'speaker': return SpeakerHigh
      case 'air-purifier': return Wind
      default: return Power
    }
  }

  const getDeviceColor = (type: string) => {
    switch (type) {
      case 'light': return 'mint'
      case 'thermostat': return 'coral'
      case 'lock': return 'primary'
      case 'camera': return 'accent'
      case 'television': return 'accent'
      case 'robot': return 'primary'
      case 'fan': return 'mint'
      case 'speaker': return 'coral'
      case 'air-purifier': return 'mint'
      default: return 'muted'
    }
  }

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

  const getAutomationColor = (icon: string) => {
    switch (icon) {
      case 'sun': return 'coral'
      case 'moon': return 'primary'
      case 'lock': return 'accent'
      case 'lightbulb': return 'mint'
      case 'thermometer': return 'coral'
      default: return 'accent'
    }
  }

  const handleToggleDevice = (device: Device) => {
    onDeviceUpdate(device.id, { isOn: !device.isOn })
    toast.success(`${device.name} turned ${!device.isOn ? 'on' : 'off'}`)
  }

  const handleBrightnessChange = (device: Device, value: number[]) => {
    onDeviceUpdate(device.id, { brightness: value[0] })
  }

  const handleTemperatureChange = (device: Device, value: number[]) => {
    onDeviceUpdate(device.id, { temperature: value[0] })
  }

  const handleAddDevice = () => {
    const deviceToAdd: any = {
      ...newDevice,
      brightness: newDevice.type === 'light' ? 100 : undefined,
      temperature: newDevice.type === 'thermostat' ? 72 : undefined,
      locked: newDevice.type === 'lock' ? true : undefined,
      volume: (newDevice.type === 'television' || newDevice.type === 'speaker') ? 50 : undefined,
      speed: (newDevice.type === 'fan' || newDevice.type === 'air-purifier') ? 2 : undefined,
      channel: newDevice.type === 'television' ? 'HDMI 1' : undefined,
      batteryLevel: newDevice.type === 'robot' ? 100 : undefined,
      cleaningMode: newDevice.type === 'robot' ? 'Auto' : undefined,
      isRecording: newDevice.type === 'camera' ? false : undefined,
      cameraLocation: newDevice.type === 'camera' ? newDevice.cameraLocation : undefined
    }
    onAddDevice(deviceToAdd)
    setIsAddDeviceDialogOpen(false)
    setNewDevice({
      name: '',
      type: 'light',
      room: 'Living Room',
      status: 'online',
      isOn: false,
      cameraLocation: 'outside'
    })
    toast.success('Device added successfully')
  }

  const handleDeleteDevice = (id: string, name: string) => {
    onDeleteDevice(id)
    toast.success(`"${name}" removed`)
  }

  const handleToggleAutomation = (id: string, isActive: boolean) => {
    onToggleAutomation(id, isActive)
    toast.success(isActive ? 'Automation enabled' : 'Automation paused')
  }

  const handleDeleteAutomation = (id: string, name: string) => {
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
    
    setIsAddAutomationDialogOpen(false)
    setNewAutomation({
      name: '',
      trigger: 'time',
      triggerDetails: '',
      actions: [],
      icon: 'lightning'
    })
    toast.success('Automation created successfully')
  }

  const rooms = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Office', 'Garage', 'Outside', 'Driveway', 'Front Door', 'Backyard']

  const cameras = devices.filter(d => d.type === 'camera')
  const outsideCameras = cameras.filter(c => c.cameraLocation === 'outside')
  const insideCameras = cameras.filter(c => c.cameraLocation === 'inside')
  const otherDevices = devices.filter(d => d.type !== 'camera')

  const renderDeviceCard = (device: Device, index: number) => {
    const Icon = getDeviceIcon(device.type)
    const color = getDeviceColor(device.type)
    
    return (
      <motion.div
        key={device.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <Card 
          className={`border-border/50 hover:border-${color}/50 transition-all duration-300 hover:shadow-lg cursor-pointer ${
            device.isOn ? 'glow-accent' : ''
          }`}
          onClick={() => setSelectedDevice(device)}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-${color}/10 flex items-center justify-center`}>
                <Icon 
                  className={`w-5 h-5 sm:w-6 sm:h-6 text-${color} ${device.isOn ? 'animate-pulse' : ''}`} 
                  weight="duotone" 
                />
              </div>
              <div className="flex items-center space-x-2">
                <Badge
                  variant={device.status === 'online' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {device.status}
                </Badge>
                <Switch
                  checked={device.isOn}
                  onCheckedChange={() => handleToggleDevice(device)}
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteDevice(device.id, device.name)
                  }}
                >
                  <Trash className="w-4 h-4 text-destructive" weight="duotone" />
                </Button>
              </div>
            </div>

            <h3 className="font-semibold text-base sm:text-lg mb-1">{device.name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{device.room}</p>

            {device.type === 'light' && device.brightness !== undefined && device.isOn && (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Brightness</span>
                  <span className="font-medium">{device.brightness}%</span>
                </div>
                <Slider
                  value={[device.brightness]}
                  onValueChange={(value) => handleBrightnessChange(device, value)}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
            )}

            {device.type === 'thermostat' && device.temperature !== undefined && device.isOn && (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Temperature</span>
                  <span className="font-medium">{device.temperature}°F</span>
                </div>
                <Slider
                  value={[device.temperature]}
                  onValueChange={(value) => handleTemperatureChange(device, value)}
                  min={60}
                  max={85}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
            )}

            {device.type === 'lock' && device.locked !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={device.locked ? 'default' : 'destructive'}>
                  {device.locked ? 'Locked' : 'Unlocked'}
                </Badge>
              </div>
            )}

            {device.type === 'camera' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Recording</span>
                  <Badge variant={device.isOn ? 'destructive' : 'secondary'}>
                    {device.isOn ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {device.cameraLocation && (
                  <Badge variant="outline" className="text-xs">
                    {device.cameraLocation === 'outside' ? 'Outside' : 'Inside'} Camera
                  </Badge>
                )}
              </div>
            )}

            {device.type === 'television' && device.volume !== undefined && device.isOn && (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Volume</span>
                  <span className="font-medium">{device.volume}%</span>
                </div>
                <Slider
                  value={[device.volume]}
                  onValueChange={(value) => onDeviceUpdate(device.id, { volume: value[0] })}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
                {device.channel && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <span>Channel</span>
                    <span className="font-medium">{device.channel}</span>
                  </div>
                )}
              </div>
            )}

            {device.type === 'robot' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Battery</span>
                  <span className="font-medium">{device.batteryLevel || 100}%</span>
                </div>
                {device.cleaningMode && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Mode</span>
                    <Badge variant="default">{device.cleaningMode}</Badge>
                  </div>
                )}
              </div>
            )}

            {(device.type === 'fan' || device.type === 'air-purifier') && device.speed !== undefined && device.isOn && (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Speed</span>
                  <span className="font-medium">Level {device.speed}</span>
                </div>
                <Slider
                  value={[device.speed]}
                  onValueChange={(value) => onDeviceUpdate(device.id, { speed: value[0] })}
                  min={1}
                  max={5}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
            )}

            {device.type === 'speaker' && device.volume !== undefined && device.isOn && (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Volume</span>
                  <span className="font-medium">{device.volume}%</span>
                </div>
                <Slider
                  value={[device.volume]}
                  onValueChange={(value) => onDeviceUpdate(device.id, { volume: value[0] })}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">Devices & Automations</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your smart devices and intelligent routines
          </p>
        </div>
      </div>

      <Tabs defaultValue="devices" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2">
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" weight="duotone" />
            <span>Devices</span>
          </TabsTrigger>
          <TabsTrigger value="automations" className="flex items-center gap-2">
            <Lightning className="w-4 h-4" weight="duotone" />
            <span>Automations</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <div className="flex justify-end">
            <Dialog open={isAddDeviceDialogOpen} onOpenChange={setIsAddDeviceDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" weight="bold" />
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Device</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="device-name">Device Name</Label>
                    <Input
                      id="device-name"
                      placeholder="Living Room Light"
                      value={newDevice.name}
                      onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="device-type">Device Type</Label>
                    <Select
                      value={newDevice.type}
                      onValueChange={(value: any) => setNewDevice({ ...newDevice, type: value })}
                    >
                      <SelectTrigger id="device-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="thermostat">Thermostat</SelectItem>
                        <SelectItem value="lock">Lock</SelectItem>
                        <SelectItem value="camera">Camera</SelectItem>
                        <SelectItem value="television">Television</SelectItem>
                        <SelectItem value="robot">Robot Vacuum</SelectItem>
                        <SelectItem value="fan">Fan</SelectItem>
                        <SelectItem value="speaker">Speaker</SelectItem>
                        <SelectItem value="air-purifier">Air Purifier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="device-room">Room</Label>
                    <Select
                      value={newDevice.room}
                      onValueChange={(value) => setNewDevice({ ...newDevice, room: value })}
                    >
                      <SelectTrigger id="device-room">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room} value={room}>{room}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newDevice.type === 'camera' && (
                    <div className="space-y-2">
                      <Label htmlFor="camera-location">Camera Location</Label>
                      <Select
                        value={newDevice.cameraLocation}
                        onValueChange={(value: 'outside' | 'inside') => setNewDevice({ ...newDevice, cameraLocation: value })}
                      >
                        <SelectTrigger id="camera-location">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="outside">Outside Camera</SelectItem>
                          <SelectItem value="inside">Inside Camera</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button 
                    onClick={handleAddDevice} 
                    className="w-full bg-accent hover:bg-accent/90"
                    disabled={!newDevice.name}
                  >
                    Add Device
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {outsideCameras.length > 0 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-accent" weight="duotone" />
                Outside Cameras
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {outsideCameras.map((device, index) => renderDeviceCard(device, index))}
              </div>
            </div>
          )}

          {insideCameras.length > 0 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-accent" weight="duotone" />
                Inside Cameras
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {insideCameras.map((device, index) => renderDeviceCard(device, index))}
              </div>
            </div>
          )}

          {otherDevices.length > 0 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Other Devices</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {otherDevices.map((device, index) => renderDeviceCard(device, index))}
              </div>
            </div>
          )}

          {devices.length === 0 && (
            <Card className="p-8 sm:p-12 text-center">
              <Power className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground" weight="duotone" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No Devices Connected</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                Add your first smart device to get started
              </p>
              <Button 
                onClick={() => setIsAddDeviceDialogOpen(true)}
                className="bg-accent hover:bg-accent/90"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" weight="bold" />
                Add Your First Device
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="automations" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <div className="flex justify-end">
            <Dialog open={isAddAutomationDialogOpen} onOpenChange={setIsAddAutomationDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" weight="bold" />
                  Create Automation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
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
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Lightning className="w-5 h-5 sm:w-6 sm:h-6 text-accent" weight="fill" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Automate Your Life</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                      Set up intelligent automations that respond to your daily patterns. Save time and energy by letting FlowSphere handle routine tasks automatically.
                    </p>
                    <Button variant="link" className="text-accent p-0 h-auto text-xs sm:text-sm">
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
              className="text-center py-8 sm:py-12"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Lightning className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" weight="duotone" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No automations yet</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                Create your first automation to start saving time
              </p>
              <Button 
                onClick={() => setIsAddAutomationDialogOpen(true)}
                className="bg-accent hover:bg-accent/90"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" weight="bold" />
                Create Your First Automation
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {automations.map((automation, index) => {
                const Icon = getAutomationIcon(automation.icon)
                const TriggerIcon = getTriggerIcon(automation.trigger)
                const color = getAutomationColor(automation.icon)

                return (
                  <motion.div
                    key={automation.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className={`border-border/50 hover:border-${color}/50 transition-all duration-300 ${automation.isActive ? 'hover:shadow-lg' : 'opacity-70'}`}>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                          <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-${color}/10 flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${color}`} weight="duotone" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base sm:text-lg mb-1 truncate">{automation.name}</h3>
                              <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-muted-foreground">
                                <TriggerIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" weight="duotone" />
                                <span className="capitalize truncate">{automation.trigger}</span>
                                <span className="flex-shrink-0">•</span>
                                <span className="truncate">{automation.triggerDetails}</span>
                              </div>
                            </div>
                          </div>
                          <Switch
                            checked={automation.isActive}
                            onCheckedChange={(checked) => handleToggleAutomation(automation.id, checked)}
                            className="flex-shrink-0 ml-2"
                          />
                        </div>

                        <div className="space-y-2 mb-3 sm:mb-4">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground">Actions:</p>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {automation.actions.map((action, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] sm:text-xs">
                                {action}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {automation.lastRun && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
                            Last run: {automation.lastRun}
                          </p>
                        )}

                        <div className="flex items-center space-x-2 pt-2 sm:pt-3 border-t border-border/50">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                            disabled={!automation.isActive}
                          >
                            {automation.isActive ? (
                              <>
                                <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" weight="fill" />
                                Run Now
                              </>
                            ) : (
                              <>
                                <Pause className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" weight="fill" />
                                Paused
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-8 w-8 sm:h-9 sm:w-9 p-0"
                            onClick={() => handleDeleteAutomation(automation.id, automation.name)}
                          >
                            <Trash className="w-3 h-3 sm:w-4 sm:h-4" weight="duotone" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
