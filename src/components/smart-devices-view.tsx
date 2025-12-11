import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useDeviceType } from '@/hooks/use-mobile'
import {
  GoogleLogo,
  Devices,
  Lightbulb,
  Thermometer,
  Lock,
  LockOpen,
  Camera,
  Fan,
  SpeakerHigh,
  Television,
  Power,
  Plus,
  ArrowClockwise,
  CheckCircle,
  Warning,
  WifiHigh,
  WifiSlash,
  CaretRight,
  House,
  Lightning,
  Trash,
  Gear
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'
import {
  getSmartHomeManager,
  useSmartHome,
  SmartDevice,
  SmartDeviceType,
  SmartDeviceTrait,
  DeviceCommands
} from '@/lib/smart-home-integration'

interface Room {
  id: string
  name: string
  icon: string
  deviceCount: number
}

export function SmartDevicesView() {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  const smartHome = useSmartHome()
  const [devices, setDevices] = useState<SmartDevice[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false)

  // New device form state
  const [newDeviceName, setNewDeviceName] = useState('')
  const [newDeviceType, setNewDeviceType] = useState<SmartDeviceType>('light')
  const [newDeviceRoom, setNewDeviceRoom] = useState('Living Room')

  // Load devices on mount
  useEffect(() => {
    setDevices(smartHome.getDevices())

    const unsubscribe = smartHome.subscribe((updatedDevices) => {
      setDevices(updatedDevices)
    })

    // Start auto-refresh if connected
    if (smartHome.isGoogleConnected()) {
      smartHome.startAutoRefresh()
    }

    return () => {
      unsubscribe()
      smartHome.stopAutoRefresh()
    }
  }, [])

  // Group devices by room
  const rooms: Room[] = devices.reduce((acc, device) => {
    const existingRoom = acc.find(r => r.name === device.room)
    if (existingRoom) {
      existingRoom.deviceCount++
    } else {
      acc.push({
        id: device.room.toLowerCase().replace(/\s+/g, '-'),
        name: device.room,
        icon: getRoomIcon(device.room),
        deviceCount: 1
      })
    }
    return acc
  }, [] as Room[])

  // Get devices for selected room
  const roomDevices = selectedRoom
    ? devices.filter(d => d.room.toLowerCase() === selectedRoom.toLowerCase())
    : devices

  const handleConnectGoogle = () => {
    setIsConnecting(true)
    try {
      const authUrl = smartHome.getGoogleAuthUrl()
      window.location.href = authUrl
    } catch (error) {
      toast.error('Google Home not configured. Please set up credentials.')
      setIsConnecting(false)
    }
  }

  const handleSyncDevices = async () => {
    setIsSyncing(true)
    try {
      await smartHome.syncDevices()
      toast.success('Devices synced successfully!')
    } catch (error) {
      toast.error('Failed to sync devices')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleToggleDevice = async (deviceId: string, currentState: boolean) => {
    const success = currentState
      ? await DeviceCommands.turnOff(deviceId)
      : await DeviceCommands.turnOn(deviceId)

    if (success) {
      toast.success(currentState ? 'Device turned off' : 'Device turned on')
    } else {
      toast.error('Failed to control device')
    }
  }

  const handleBrightnessChange = async (deviceId: string, value: number[]) => {
    await DeviceCommands.setBrightness(deviceId, value[0])
  }

  const handleVolumeChange = async (deviceId: string, value: number[]) => {
    await DeviceCommands.setVolume(deviceId, value[0])
  }

  const handleTemperatureChange = async (deviceId: string, value: number[]) => {
    await DeviceCommands.setTemperature(deviceId, value[0])
  }

  const handleLockToggle = async (deviceId: string, isLocked: boolean) => {
    const success = isLocked
      ? await DeviceCommands.unlock(deviceId)
      : await DeviceCommands.lock(deviceId)

    if (success) {
      toast.success(isLocked ? 'Unlocked' : 'Locked')
    } else {
      toast.error('Failed to control lock')
    }
  }

  const handleAddDevice = () => {
    if (!newDeviceName.trim()) {
      toast.error('Please enter a device name')
      return
    }

    smartHome.addLocalDevice({
      name: newDeviceName.trim(),
      type: newDeviceType,
      traits: getTraitsForType(newDeviceType),
      room: newDeviceRoom,
      isOnline: true,
      state: { on: false }
    })

    toast.success('Device added!')
    setIsAddDeviceOpen(false)
    setNewDeviceName('')
    setNewDeviceType('light')
  }

  const handleDeleteDevice = (deviceId: string) => {
    smartHome.removeDevice(deviceId)
    toast.success('Device removed')
  }

  const getDeviceIcon = (type: SmartDeviceType) => {
    switch (type) {
      case 'light': return Lightbulb
      case 'thermostat': return Thermometer
      case 'lock': return Lock
      case 'camera': return Camera
      case 'fan': return Fan
      case 'speaker': return SpeakerHigh
      case 'display': return Television
      default: return Power
    }
  }

  return (
    <div className={cn("space-y-6", isMobile && "space-y-4")}>
      {/* Header */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
        <CardHeader className={cn(isMobile ? "pb-2" : "pb-4")}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Devices className="w-6 h-6 text-blue-500" weight="fill" />
              </div>
              <div>
                <h1 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>
                  Smart Devices
                </h1>
                <p className="text-sm text-muted-foreground">
                  Control your connected devices
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {smartHome.isGoogleConnected() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncDevices}
                  disabled={isSyncing}
                >
                  <ArrowClockwise className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                  {!isMobile && <span className="ml-2">Sync</span>}
                </Button>
              )}

              <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4" />
                    {!isMobile && <span className="ml-2">Add Device</span>}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Local Device</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Device Name</Label>
                      <Input
                        placeholder="e.g., Living Room Light"
                        value={newDeviceName}
                        onChange={(e) => setNewDeviceName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Device Type</Label>
                      <Select value={newDeviceType} onValueChange={(v) => setNewDeviceType(v as SmartDeviceType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="switch">Switch</SelectItem>
                          <SelectItem value="thermostat">Thermostat</SelectItem>
                          <SelectItem value="lock">Lock</SelectItem>
                          <SelectItem value="fan">Fan</SelectItem>
                          <SelectItem value="speaker">Speaker</SelectItem>
                          <SelectItem value="camera">Camera</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Room</Label>
                      <Select value={newDeviceRoom} onValueChange={setNewDeviceRoom}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Living Room">Living Room</SelectItem>
                          <SelectItem value="Bedroom">Bedroom</SelectItem>
                          <SelectItem value="Kitchen">Kitchen</SelectItem>
                          <SelectItem value="Bathroom">Bathroom</SelectItem>
                          <SelectItem value="Office">Office</SelectItem>
                          <SelectItem value="Garage">Garage</SelectItem>
                          <SelectItem value="Outdoor">Outdoor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddDevice} className="w-full">
                      Add Device
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Google Home Connection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                smartHome.isGoogleConnected() ? "bg-green-500/20" : "bg-muted"
              )}>
                <GoogleLogo className={cn(
                  "w-5 h-5",
                  smartHome.isGoogleConnected() ? "text-green-500" : "text-muted-foreground"
                )} weight="bold" />
              </div>
              <div>
                <h3 className="font-medium">Google Home</h3>
                <p className="text-sm text-muted-foreground">
                  {smartHome.isGoogleConnected()
                    ? 'Connected - devices synced'
                    : 'Connect to sync your devices'}
                </p>
              </div>
            </div>

            {smartHome.isGoogleConnected() ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" weight="fill" />
                <Button variant="ghost" size="sm" onClick={() => smartHome.disconnectGoogle()}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <GoogleLogo className="w-4 h-4 mr-2" weight="bold" />
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className={cn("grid gap-3", isMobile ? "grid-cols-2" : "grid-cols-4")}>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 text-center">
            <WifiHigh className="w-6 h-6 mx-auto mb-2 text-green-500" weight="fill" />
            <p className="text-2xl font-bold">{devices.filter(d => d.isOnline).length}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4 text-center">
            <WifiSlash className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{devices.filter(d => !d.isOnline).length}</p>
            <p className="text-xs text-muted-foreground">Offline</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4 text-center">
            <Lightning className="w-6 h-6 mx-auto mb-2 text-yellow-500" weight="fill" />
            <p className="text-2xl font-bold">{devices.filter(d => d.state.on).length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <House className="w-6 h-6 mx-auto mb-2 text-blue-500" weight="fill" />
            <p className="text-2xl font-bold">{rooms.length}</p>
            <p className="text-xs text-muted-foreground">Rooms</p>
          </CardContent>
        </Card>
      </div>

      <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-3")}>
        {/* Rooms Sidebar */}
        <Card className="col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <House className="w-5 h-5" />
              Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedRoom(null)}
                  className={cn(
                    "w-full p-3 rounded-lg flex items-center justify-between transition-all",
                    selectedRoom === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <House className="w-4 h-4" />
                    <span>All Devices</span>
                  </div>
                  <span className="text-sm opacity-70">{devices.length}</span>
                </button>

                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room.name)}
                    className={cn(
                      "w-full p-3 rounded-lg flex items-center justify-between transition-all",
                      selectedRoom === room.name
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>{room.icon}</span>
                      <span>{room.name}</span>
                    </div>
                    <span className="text-sm opacity-70">{room.deviceCount}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Devices Grid */}
        <Card className={cn(!isMobile && "col-span-2")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Devices className="w-5 h-5" />
                {selectedRoom || 'All Devices'}
              </div>
              <span className="text-sm font-normal text-muted-foreground">
                {roomDevices.length} devices
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roomDevices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Devices className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No devices yet</p>
                <p className="text-sm">Connect Google Home or add a local device</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "grid-cols-2")}>
                  {roomDevices.map((device) => {
                    const Icon = getDeviceIcon(device.type)
                    return (
                      <motion.div
                        key={device.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "p-4 rounded-xl border transition-all",
                          device.state.on
                            ? "bg-primary/10 border-primary/30"
                            : "bg-card border-border"
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              device.state.on ? "bg-primary/20" : "bg-muted"
                            )}>
                              <Icon className={cn(
                                "w-5 h-5",
                                device.state.on ? "text-primary" : "text-muted-foreground"
                              )} weight={device.state.on ? "fill" : "regular"} />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{device.name}</h4>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                {device.isOnline ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    Online
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    Offline
                                  </>
                                )}
                                {device.platform !== 'local' && (
                                  <span className="ml-1">• {device.platform}</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {device.platform === 'local' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteDevice(device.id)}
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            )}
                            <Switch
                              checked={device.state.on || false}
                              onCheckedChange={() => handleToggleDevice(device.id, device.state.on || false)}
                              disabled={!device.isOnline}
                            />
                          </div>
                        </div>

                        {/* Device-specific controls */}
                        {device.type === 'light' && device.state.on && device.traits.includes('Brightness') && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Brightness</span>
                              <span>{device.state.brightness || 100}%</span>
                            </div>
                            <Slider
                              value={[device.state.brightness || 100]}
                              onValueChange={(v) => handleBrightnessChange(device.id, v)}
                              max={100}
                              step={1}
                              disabled={!device.isOnline}
                            />
                          </div>
                        )}

                        {device.type === 'thermostat' && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Temperature</span>
                              <span>{device.state.targetTemperature || 72}°F</span>
                            </div>
                            <Slider
                              value={[device.state.targetTemperature || 72]}
                              onValueChange={(v) => handleTemperatureChange(device.id, v)}
                              min={60}
                              max={85}
                              step={1}
                              disabled={!device.isOnline}
                            />
                            {device.state.temperature && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Current: {device.state.temperature}°F
                              </p>
                            )}
                          </div>
                        )}

                        {device.type === 'lock' && (
                          <div className="mt-3">
                            <Button
                              variant={device.state.locked ? "secondary" : "outline"}
                              size="sm"
                              className="w-full"
                              onClick={() => handleLockToggle(device.id, device.state.locked || false)}
                              disabled={!device.isOnline}
                            >
                              {device.state.locked ? (
                                <>
                                  <Lock className="w-4 h-4 mr-2" weight="fill" />
                                  Locked
                                </>
                              ) : (
                                <>
                                  <LockOpen className="w-4 h-4 mr-2" />
                                  Unlocked
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {device.type === 'speaker' && device.traits.includes('Volume') && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Volume</span>
                              <span>{device.state.volume || 50}%</span>
                            </div>
                            <Slider
                              value={[device.state.volume || 50]}
                              onValueChange={(v) => handleVolumeChange(device.id, v)}
                              max={100}
                              step={1}
                              disabled={!device.isOnline}
                            />
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon - Other Platforms */}
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Coming Soon</h3>
          <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-3")}>
            <div className="flex items-start gap-3 opacity-50">
              <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center flex-shrink-0">
                <SpeakerHigh className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h4 className="font-medium">Amazon Alexa</h4>
                <p className="text-sm text-muted-foreground">
                  Control Alexa devices from FlowSphere
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 opacity-50">
              <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center flex-shrink-0">
                <House className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h4 className="font-medium">Apple HomeKit</h4>
                <p className="text-sm text-muted-foreground">
                  Sync with your Apple Home devices
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 opacity-50">
              <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center flex-shrink-0">
                <Lightning className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h4 className="font-medium">Matter Protocol</h4>
                <p className="text-sm text-muted-foreground">
                  Universal smart home standard
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper functions
function getRoomIcon(room: string): string {
  const icons: Record<string, string> = {
    'Living Room': '🛋️',
    'Bedroom': '🛏️',
    'Kitchen': '🍳',
    'Bathroom': '🚿',
    'Office': '💼',
    'Garage': '🚗',
    'Outdoor': '🌳',
    'Dining Room': '🍽️',
    'Hallway': '🚪'
  }
  return icons[room] || '🏠'
}

function getTraitsForType(type: SmartDeviceType): SmartDeviceTrait[] {
  const traitMap: Record<SmartDeviceType, SmartDeviceTrait[]> = {
    light: ['OnOff', 'Brightness', 'ColorSetting'],
    switch: ['OnOff'],
    thermostat: ['OnOff', 'TemperatureSetting'],
    lock: ['LockUnlock'],
    fan: ['OnOff', 'FanSpeed'],
    speaker: ['OnOff', 'Volume'],
    display: ['OnOff', 'Volume'],
    camera: ['OnOff'],
    air_purifier: ['OnOff', 'FanSpeed'],
    vacuum: ['OnOff', 'StartStop'],
    sensor: [],
    outlet: ['OnOff']
  }
  return traitMap[type] || ['OnOff']
}
