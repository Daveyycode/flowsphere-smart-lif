import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, NavigationArrow, Clock, Car, Alarm, MapTrifold, CaretRight, MagnifyingGlass, X } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DeviceInfo } from '@/hooks/use-mobile'
import { getResponsiveSize, getResponsiveLayout, getTouchTargetSize } from '@/lib/responsive-utils'

interface SavedRoute {
  id: string
  name: string
  from: string
  to: string
  preferredArrivalTime: string
  mapProvider: 'google' | 'waze' | 'apple'
}

interface TrafficCondition {
  route: string
  currentTime: string
  normalTime: string
  delay: string
  severity: 'light' | 'moderate' | 'heavy'
  incidents: number
}

interface Location {
  id: string
  name: string
  address: string
  category: 'home' | 'work' | 'school' | 'shopping' | 'restaurant' | 'other'
  coordinates?: { lat: number; lng: number }
}

const popularLocations: Location[] = [
  { id: '1', name: 'Home', address: '123 Main Street, Downtown', category: 'home' },
  { id: '2', name: 'Office - Tech Hub', address: '456 Business Park, Tech District', category: 'work' },
  { id: '3', name: 'City Mall', address: '789 Shopping Center, Central', category: 'shopping' },
  { id: '4', name: 'Kids School', address: '321 Education Ave, Northside', category: 'school' },
  { id: '5', name: 'Gym & Fitness', address: '654 Wellness Blvd, Eastside', category: 'other' },
  { id: '6', name: 'Airport', address: 'International Airport Terminal', category: 'other' },
  { id: '7', name: 'Downtown Center', address: 'Main Plaza, City Center', category: 'other' },
  { id: '8', name: 'Beach Park', address: '987 Coastal Drive, Beachfront', category: 'other' },
  { id: '9', name: 'Hospital', address: '147 Medical Center Dr, Healthcare District', category: 'other' },
  { id: '10', name: 'Train Station', address: 'Central Station, Transit Hub', category: 'other' },
]

interface TrafficUpdateProps {
  deviceInfo: DeviceInfo
}

export function TrafficUpdate({ deviceInfo }: TrafficUpdateProps) {
  const layout = getResponsiveLayout(deviceInfo.type)
  const { isMobile, isTablet, isTouch } = layout

  // Responsive sizing
  const textBase = getResponsiveSize(deviceInfo.type, 'text', 'base')
  const textSm = getResponsiveSize(deviceInfo.type, 'text', 'sm')
  const textLg = getResponsiveSize(deviceInfo.type, 'text', 'lg')
  const text2xl = getResponsiveSize(deviceInfo.type, 'text', '2xl')
  const iconMd = getResponsiveSize(deviceInfo.type, 'icon', 'md')
  const iconSm = getResponsiveSize(deviceInfo.type, 'icon', 'sm')
  const cardPadding = getResponsiveSize(deviceInfo.type, 'spacing', 'md')
  const gapMd = getResponsiveSize(deviceInfo.type, 'gap', 'md')
  const touchTarget = getTouchTargetSize(deviceInfo.type)

  const [savedRoutes, setSavedRoutes] = useKV<SavedRoute[]>('flowsphere-saved-routes', [
    {
      id: '1',
      name: 'Home to Work',
      from: '123 Home Street',
      to: '456 Office Boulevard',
      preferredArrivalTime: '09:00',
      mapProvider: 'google'
    }
  ])
  
  const [isAddingRoute, setIsAddingRoute] = useState(false)
  const [newRouteName, setNewRouteName] = useState('')
  const [newRouteFrom, setNewRouteFrom] = useState('')
  const [newRouteTo, setNewRouteTo] = useState('')
  const [newRouteTime, setNewRouteTime] = useState('09:00')
  const [newRouteProvider, setNewRouteProvider] = useState<'google' | 'waze' | 'apple'>('google')

  const [showFromDropdown, setShowFromDropdown] = useState(false)
  const [showToDropdown, setShowToDropdown] = useState(false)
  const [fromSearchQuery, setFromSearchQuery] = useState('')
  const [toSearchQuery, setToSearchQuery] = useState('')
  const [selectedRoute, setSelectedRoute] = useState<SavedRoute | null>(null)
  const [showMapPreview, setShowMapPreview] = useState(false)

  const filteredFromLocations = popularLocations.filter(loc =>
    loc.name.toLowerCase().includes(fromSearchQuery.toLowerCase()) ||
    loc.address.toLowerCase().includes(fromSearchQuery.toLowerCase())
  )

  const filteredToLocations = popularLocations.filter(loc =>
    loc.name.toLowerCase().includes(toSearchQuery.toLowerCase()) ||
    loc.address.toLowerCase().includes(toSearchQuery.toLowerCase())
  )

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[id^="route-"]')) {
        setShowFromDropdown(false)
        setShowToDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentTraffic: TrafficCondition[] = [
    {
      route: 'Home to Work',
      currentTime: '25 min',
      normalTime: '20 min',
      delay: '+5 min',
      severity: 'moderate',
      incidents: 1
    }
  ]

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'light': return 'mint'
      case 'moderate': return 'coral'
      case 'heavy': return 'destructive'
      default: return 'muted'
    }
  }

  const getLeaveTime = (arrivalTime: string, travelMinutes: number) => {
    const [hours, minutes] = arrivalTime.split(':').map(Number)
    const arrivalDate = new Date()
    arrivalDate.setHours(hours, minutes, 0, 0)
    
    const leaveDate = new Date(arrivalDate.getTime() - travelMinutes * 60000)
    
    const leaveHours = leaveDate.getHours()
    const leaveMinutes = leaveDate.getMinutes()
    const ampm = leaveHours >= 12 ? 'PM' : 'AM'
    const displayHours = leaveHours % 12 || 12
    
    return `${displayHours}:${leaveMinutes.toString().padStart(2, '0')} ${ampm}`
  }

  const openInMap = (route: SavedRoute) => {
    const encodedFrom = encodeURIComponent(route.from)
    const encodedTo = encodeURIComponent(route.to)
    
    let url = ''
    switch (route.mapProvider) {
      case 'google':
        url = `https://www.google.com/maps/dir/?api=1&origin=${encodedFrom}&destination=${encodedTo}`
        break
      case 'waze':
        url = `https://waze.com/ul?ll=${encodedTo}&navigate=yes`
        break
      case 'apple':
        url = `http://maps.apple.com/?saddr=${encodedFrom}&daddr=${encodedTo}`
        break
    }
    
    window.open(url, '_blank')
    toast.success(`Opening in ${route.mapProvider === 'google' ? 'Google Maps' : route.mapProvider === 'waze' ? 'Waze' : 'Apple Maps'}`)
  }

  const addRoute = () => {
    if (!newRouteName || !newRouteFrom || !newRouteTo) {
      toast.error('Please fill in all fields')
      return
    }

    const newRoute: SavedRoute = {
      id: Date.now().toString(),
      name: newRouteName,
      from: newRouteFrom,
      to: newRouteTo,
      preferredArrivalTime: newRouteTime,
      mapProvider: newRouteProvider
    }

    setSavedRoutes((current) => [...(current || []), newRoute])
    
    setNewRouteName('')
    setNewRouteFrom('')
    setNewRouteTo('')
    setNewRouteTime('09:00')
    setNewRouteProvider('google')
    setFromSearchQuery('')
    setToSearchQuery('')
    setIsAddingRoute(false)

    toast.success('Route saved!')
  }

  const deleteRoute = (id: string) => {
    setSavedRoutes((current) => (current || []).filter(route => route.id !== id))
    toast.success('Route deleted')
  }

  const selectFromLocation = (location: Location) => {
    setNewRouteFrom(location.address)
    setFromSearchQuery(location.name)
    setShowFromDropdown(false)
  }

  const selectToLocation = (location: Location) => {
    setNewRouteTo(location.address)
    setToSearchQuery(location.name)
    setShowToDropdown(false)
  }

  const getMapUrl = (from: string, to: string) => {
    const encodedFrom = encodeURIComponent(from)
    const encodedTo = encodeURIComponent(to)
    return `https://www.google.com/maps/embed/v1/directions?key=YOUR_API_KEY&origin=${encodedFrom}&destination=${encodedTo}&mode=driving`
  }

  const getCategoryIcon = (category: Location['category']) => {
    switch (category) {
      case 'home': return '🏠'
      case 'work': return '💼'
      case 'school': return '🎓'
      case 'shopping': return '🛍️'
      case 'restaurant': return '🍽️'
      default: return '📍'
    }
  }

  const currentHour = new Date().getHours()
  const isMorning = currentHour >= 5 && currentHour < 12

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Traffic Updates</h1>
        <p className="text-muted-foreground">
          Real-time traffic conditions and smart departure reminders
        </p>
      </div>

      {/* Live Map Preview */}
      {selectedRoute && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden border-accent/30">
            <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapTrifold className="w-5 h-5 text-accent" weight="duotone" />
                  Live Route Preview - {selectedRoute.name}
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedRoute(null)}
                  className="h-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative w-full h-96 bg-muted flex items-center justify-center">
                {/* Simulated Map View - In production, use Google Maps iframe or API */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-light/20 via-mint/20 to-accent/20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4 p-6">
                      <MapTrifold className="w-16 h-16 mx-auto text-accent" weight="duotone" />
                      <div className="space-y-2">
                        <p className="text-lg font-semibold">
                          🗺️ Real-Time Map View
                        </p>
                        <div className="max-w-md mx-auto space-y-2 text-sm">
                          <div className="flex items-center gap-2 justify-center">
                            <Badge variant="secondary" className="bg-primary/20">
                              From: {selectedRoute.from}
                            </Badge>
                          </div>
                          <NavigationArrow className="w-6 h-6 mx-auto text-accent" weight="fill" />
                          <div className="flex items-center gap-2 justify-center">
                            <Badge variant="secondary" className="bg-accent/20">
                              To: {selectedRoute.to}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          In production: Google Maps, Waze, or Apple Maps integration
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-muted/30 flex items-center justify-between">
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    ETA: 25 min
                  </Badge>
                  <Badge variant="secondary" className="bg-coral/20 text-coral">
                    Moderate Traffic
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => openInMap(selectedRoute)}
                  className="gap-2"
                >
                  <MapTrifold className="w-4 h-4" />
                  Open in App
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {isMorning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-accent/30 bg-gradient-to-br from-accent/10 via-coral/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Alarm className="w-6 h-6 text-accent" weight="fill" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Morning Commute Reminder</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    To arrive at work by 9:00 AM with current traffic conditions, 
                    you should leave by <span className="font-bold text-accent">{getLeaveTime('09:00', 25)}</span>
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Current delay: +5 minutes
                    </Badge>
                    <Badge variant="secondary" className="bg-coral/20 text-coral text-xs">
                      Moderate traffic
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border-blue-mid/30 bg-gradient-to-br from-blue-light/10 via-blue-mid/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Car className="w-5 h-5" weight="duotone" />
              <span>Current Traffic Conditions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentTraffic.map((traffic, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{traffic.route}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Usually {traffic.normalTime}</span>
                      <CaretRight className="w-4 h-4" />
                      <span className="font-medium text-foreground">Now {traffic.currentTime}</span>
                    </div>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={`bg-${getSeverityColor(traffic.severity)}/20 text-${getSeverityColor(traffic.severity)}`}
                  >
                    {traffic.severity} traffic
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full bg-${getSeverityColor(traffic.severity)}`} />
                    <span>{traffic.delay} delay</span>
                    {traffic.incidents > 0 && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span>{traffic.incidents} {traffic.incidents === 1 ? 'incident' : 'incidents'}</span>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                  >
                    View Details
                  </Button>
                </div>
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" weight="duotone" />
                <span>Saved Routes</span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingRoute(!isAddingRoute)}
              >
                {isAddingRoute ? 'Cancel' : 'Add Route'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAddingRoute && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-muted/30 rounded-lg p-4 space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="route-name">Route Name</Label>
                  <Input
                    id="route-name"
                    placeholder="e.g., Home to Work"
                    value={newRouteName}
                    onChange={(e) => setNewRouteName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="route-from">From</Label>
                  <div className="relative">
                    <div className="relative">
                      <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <Input
                        id="route-from"
                        placeholder="Search starting location..."
                        value={fromSearchQuery}
                        onChange={(e) => {
                          setFromSearchQuery(e.target.value)
                          setShowFromDropdown(true)
                        }}
                        onFocus={() => setShowFromDropdown(true)}
                        className="pl-10 pr-10"
                      />
                      {fromSearchQuery && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => {
                            setFromSearchQuery('')
                            setNewRouteFrom('')
                            setShowFromDropdown(false)
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <AnimatePresence>
                      {showFromDropdown && filteredFromLocations.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
                        >
                          <ScrollArea className="max-h-60">
                            {filteredFromLocations.map((location) => (
                              <button
                                key={location.id}
                                onClick={() => selectFromLocation(location)}
                                className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors flex items-start gap-3 border-b border-border/50 last:border-0"
                              >
                                <span className="text-2xl">{getCategoryIcon(location.category)}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{location.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{location.address}</p>
                                </div>
                              </button>
                            ))}
                          </ScrollArea>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="route-to">To</Label>
                  <div className="relative">
                    <div className="relative">
                      <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <Input
                        id="route-to"
                        placeholder="Search destination..."
                        value={toSearchQuery}
                        onChange={(e) => {
                          setToSearchQuery(e.target.value)
                          setShowToDropdown(true)
                        }}
                        onFocus={() => setShowToDropdown(true)}
                        className="pl-10 pr-10"
                      />
                      {toSearchQuery && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => {
                            setToSearchQuery('')
                            setNewRouteTo('')
                            setShowToDropdown(false)
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <AnimatePresence>
                      {showToDropdown && filteredToLocations.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
                        >
                          <ScrollArea className="max-h-60">
                            {filteredToLocations.map((location) => (
                              <button
                                key={location.id}
                                onClick={() => selectToLocation(location)}
                                className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors flex items-start gap-3 border-b border-border/50 last:border-0"
                              >
                                <span className="text-2xl">{getCategoryIcon(location.category)}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{location.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{location.address}</p>
                                </div>
                              </button>
                            ))}
                          </ScrollArea>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="arrival-time">Preferred Arrival Time</Label>
                  <Input
                    id="arrival-time"
                    type="time"
                    value={newRouteTime}
                    onChange={(e) => setNewRouteTime(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Preferred Map Provider</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={newRouteProvider === 'google' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewRouteProvider('google')}
                      className="flex-1"
                    >
                      Google Maps
                    </Button>
                    <Button
                      variant={newRouteProvider === 'waze' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewRouteProvider('waze')}
                      className="flex-1"
                    >
                      Waze
                    </Button>
                    <Button
                      variant={newRouteProvider === 'apple' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewRouteProvider('apple')}
                      className="flex-1"
                    >
                      Apple Maps
                    </Button>
                  </div>
                </div>
                
                <Button onClick={addRoute} className="w-full bg-accent hover:bg-accent/90">
                  Save Route
                </Button>
              </motion.div>
            )}

            <Separator />

            <div className="space-y-3">
              {(savedRoutes || []).map((route, index) => (
                <motion.div
                  key={route.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-border rounded-lg p-4 hover:border-accent/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{route.name}</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" weight="fill" />
                          <span>{route.from}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <NavigationArrow className="w-4 h-4" weight="fill" />
                          <span>{route.to}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRoute(route.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      Arrive by {route.preferredArrivalTime}
                    </Badge>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {route.mapProvider} Maps
                    </Badge>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => setSelectedRoute(route)}
                      variant="outline"
                      className="flex-1"
                    >
                      <MapPin className="w-4 h-4 mr-2" weight="fill" />
                      View on Map
                    </Button>
                    <Button
                      onClick={() => openInMap(route)}
                      className="flex-1 bg-blue-mid hover:bg-blue-deep text-white"
                    >
                      <MapTrifold className="w-4 h-4 mr-2" weight="fill" />
                      Open in App
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {(savedRoutes || []).length === 0 && !isAddingRoute && (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" weight="duotone" />
                <p className="text-sm">No saved routes yet. Add your first route to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
