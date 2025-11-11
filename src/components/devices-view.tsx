import { motion } from 'framer-motion'
import { Lightbulb, Thermometer, Lock, Camera, Power, Plus, Television, Robot, Fan, SpeakerHigh, Wind } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
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
}

interface DevicesViewProps {
  devices: Device[]
  onDeviceUpdate: (id: string, updates: Partial<Device>) => void
  onAddDevice: (device: Omit<Device, 'id'>) => void
}

export function DevicesView({ devices, onDeviceUpdate, onAddDevice }: DevicesViewProps) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newDevice, setNewDevice] = useState<{
    name: string
    type: 'light' | 'thermostat' | 'lock' | 'camera' | 'television' | 'robot' | 'fan' | 'speaker' | 'air-purifier'
    room: string
    status: 'online' | 'offline'
    isOn: boolean
  }>({
    name: '',
    type: 'light',
    room: 'Living Room',
    status: 'online',
    isOn: false
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
      cleaningMode: newDevice.type === 'robot' ? 'Auto' : undefined
    }
    onAddDevice(deviceToAdd)
    setIsAddDialogOpen(false)
    setNewDevice({
      name: '',
      type: 'light',
      room: 'Living Room',
      status: 'online',
      isOn: false
    })
    toast.success('Device added successfully')
  }

  const rooms = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Office', 'Garage']

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Smart Devices</h1>
          <p className="text-muted-foreground">
            Manage and control all your connected devices
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90">
              <Plus className="w-5 h-5 mr-2" weight="bold" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device, index) => {
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
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-${color}/10 flex items-center justify-center`}>
                      <Icon 
                        className={`w-6 h-6 text-${color} ${device.isOn ? 'animate-pulse' : ''}`} 
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
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg mb-1">{device.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{device.room}</p>

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
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Recording</span>
                      <Badge variant={device.isOn ? 'default' : 'secondary'}>
                        {device.isOn ? 'Active' : 'Inactive'}
                      </Badge>
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
        })}
      </div>

      {devices.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No devices yet</h3>
          <p className="text-muted-foreground mb-6">
            Get started by adding your first smart device
          </p>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-accent hover:bg-accent/90"
          >
            <Plus className="w-5 h-5 mr-2" weight="bold" />
            Add Your First Device
          </Button>
        </motion.div>
      )}
    </div>
  )
}
