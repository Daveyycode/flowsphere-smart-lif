import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  Lock,
  LockOpen,
  MapPin,
  Lightning,
  Check,
  CaretDown
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'

interface VPNLocation {
  id: string
  country: string
  city: string
  flag: string
  speed: 'fast' | 'medium' | 'slow'
  services: string[]
  popular: boolean
}

const VPN_LOCATIONS: VPNLocation[] = [
  {
    id: 'us-ny',
    country: 'United States',
    city: 'New York',
    flag: '🇺🇸',
    speed: 'fast',
    services: ['Netflix US', 'Hulu', 'Disney+', 'HBO Max', 'Spotify'],
    popular: true
  },
  {
    id: 'us-la',
    country: 'United States',
    city: 'Los Angeles',
    flag: '🇺🇸',
    speed: 'fast',
    services: ['Netflix US', 'Hulu', 'Disney+', 'HBO Max', 'YouTube Premium'],
    popular: true
  },
  {
    id: 'uk-london',
    country: 'United Kingdom',
    city: 'London',
    flag: '🇬🇧',
    speed: 'fast',
    services: ['Netflix UK', 'BBC iPlayer', 'ITV Hub', 'Spotify', 'YouTube'],
    popular: true
  },
  {
    id: 'ca-toronto',
    country: 'Canada',
    city: 'Toronto',
    flag: '🇨🇦',
    speed: 'fast',
    services: ['Netflix CA', 'Disney+', 'Crave', 'Spotify', 'YouTube'],
    popular: false
  },
  {
    id: 'jp-tokyo',
    country: 'Japan',
    city: 'Tokyo',
    flag: '🇯🇵',
    speed: 'medium',
    services: ['Netflix JP', 'Amazon Prime JP', 'YouTube', 'Spotify'],
    popular: true
  },
  {
    id: 'au-sydney',
    country: 'Australia',
    city: 'Sydney',
    flag: '🇦🇺',
    speed: 'medium',
    services: ['Netflix AU', 'Stan', 'Disney+', 'Spotify', 'YouTube'],
    popular: false
  },
  {
    id: 'de-berlin',
    country: 'Germany',
    city: 'Berlin',
    flag: '🇩🇪',
    speed: 'fast',
    services: ['Netflix DE', 'Amazon Prime DE', 'Spotify', 'YouTube'],
    popular: false
  },
  {
    id: 'fr-paris',
    country: 'France',
    city: 'Paris',
    flag: '🇫🇷',
    speed: 'fast',
    services: ['Netflix FR', 'Canal+', 'Disney+', 'Spotify', 'YouTube'],
    popular: false
  },
  {
    id: 'sg-singapore',
    country: 'Singapore',
    city: 'Singapore',
    flag: '🇸🇬',
    speed: 'fast',
    services: ['Netflix SG', 'Disney+', 'HBO Go', 'Spotify', 'YouTube'],
    popular: false
  },
  {
    id: 'br-sao',
    country: 'Brazil',
    city: 'São Paulo',
    flag: '🇧🇷',
    speed: 'medium',
    services: ['Netflix BR', 'Globoplay', 'Disney+', 'Spotify', 'YouTube'],
    popular: false
  }
]

const STREAMING_SERVICES = [
  { name: 'Netflix', icon: '🎬', color: '#E50914' },
  { name: 'YouTube', icon: '📺', color: '#FF0000' },
  { name: 'Spotify', icon: '🎵', color: '#1DB954' },
  { name: 'Disney+', icon: '🏰', color: '#113CCF' },
  { name: 'HBO Max', icon: '🎭', color: '#0F0F0F' },
  { name: 'Hulu', icon: '📡', color: '#1CE783' },
  { name: 'Amazon Prime', icon: '📦', color: '#00A8E1' }
]

export function VPNStreamingAccess() {
  const [isConnected, setIsConnected] = useKV<boolean>('flowsphere-vpn-connected', false)
  const [currentLocation, setCurrentLocation] = useKV<VPNLocation | null>('flowsphere-vpn-location', null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [selectedService, setSelectedService] = useState<string>('all')
  const [showLocations, setShowLocations] = useState(false)

  const handleConnect = async (location: VPNLocation) => {
    setIsConnecting(true)
    toast.loading('Connecting to VPN...')

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    setCurrentLocation(location)
    setIsConnected(true)
    setIsConnecting(false)
    setShowLocations(false)

    toast.success(`Connected to ${location.city}, ${location.country}!`)
    toast.info(`You can now access: ${location.services.join(', ')}`)
  }

  const handleDisconnect = async () => {
    setIsConnecting(true)
    toast.loading('Disconnecting...')

    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsConnected(false)
    setCurrentLocation(null)
    setIsConnecting(false)

    toast.success('Disconnected from VPN')
  }

  const handleQuickConnect = async () => {
    // Connect to most popular location
    const popularLocation = VPN_LOCATIONS.find(loc => loc.popular)
    if (popularLocation) {
      await handleConnect(popularLocation)
    }
  }

  const filteredLocations = selectedService === 'all'
    ? VPN_LOCATIONS
    : VPN_LOCATIONS.filter(loc =>
        loc.services.some(service =>
          service.toLowerCase().includes(selectedService.toLowerCase())
        )
      )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Streaming VPN Access</h2>
        <p className="text-muted-foreground">
          Bypass geo-restrictions and access content worldwide
        </p>
      </div>

      {/* Connection Status Card */}
      <Card className={`border-2 ${isConnected ? 'border-green-500' : 'border-border'}`}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ scale: isConnected ? [1, 1.1, 1] : 1 }}
                transition={{ repeat: isConnected ? Infinity : 0, duration: 2 }}
                className={`p-4 rounded-full ${
                  isConnected ? 'bg-green-500/20' : 'bg-muted'
                }`}
              >
                {isConnected ? (
                  <LockOpen className="w-8 h-8 text-green-500" weight="duotone" />
                ) : (
                  <Lock className="w-8 h-8 text-muted-foreground" weight="duotone" />
                )}
              </motion.div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-semibold">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </h3>
                  <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-green-500' : ''}>
                    {isConnected ? 'Protected' : 'Not Protected'}
                  </Badge>
                </div>

                {isConnected && currentLocation ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {currentLocation.flag} {currentLocation.city}, {currentLocation.country}
                    </span>
                    <Lightning
                      className={`w-4 h-4 ${
                        currentLocation.speed === 'fast'
                          ? 'text-green-500'
                          : currentLocation.speed === 'medium'
                          ? 'text-yellow-500'
                          : 'text-orange-500'
                      }`}
                      weight="fill"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Your real location is exposed
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {!isConnected ? (
                <>
                  <Button
                    onClick={handleQuickConnect}
                    disabled={isConnecting}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Lightning className="w-4 h-4 mr-2" weight="fill" />
                    Quick Connect
                  </Button>
                  <Button
                    onClick={() => setShowLocations(true)}
                    variant="outline"
                    disabled={isConnecting}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Choose Location
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleDisconnect}
                  variant="destructive"
                  disabled={isConnecting}
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>

          {/* Available Services */}
          {isConnected && currentLocation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 pt-6 border-t"
            >
              <p className="text-sm font-medium mb-3">Available Streaming Services:</p>
              <div className="flex flex-wrap gap-2">
                {currentLocation.services.map(service => (
                  <Badge key={service} variant="outline" className="text-xs">
                    {service}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Streaming Services Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Popular Streaming Services</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {STREAMING_SERVICES.map(service => (
            <Card
              key={service.name}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              style={{ borderLeft: `4px solid ${service.color}` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{service.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{service.name}</p>
                    {isConnected && currentLocation?.services.some(s => s.includes(service.name)) && (
                      <Badge variant="secondary" className="text-xs mt-1 bg-green-500/20 text-green-700">
                        <Check className="w-3 h-3 mr-1" weight="bold" />
                        Available
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Location Selection Modal */}
      <AnimatePresence>
        {showLocations && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLocations(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[80vh] overflow-hidden"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Select VPN Location</CardTitle>
                      <CardDescription>
                        Choose a server location to access content
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowLocations(false)}
                    >
                      ✕
                    </Button>
                  </div>

                  <div className="mt-4">
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Services</SelectItem>
                        <SelectItem value="netflix">Netflix</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="spotify">Spotify</SelectItem>
                        <SelectItem value="disney">Disney+</SelectItem>
                        <SelectItem value="hbo">HBO Max</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="max-h-[500px] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredLocations.map(location => (
                      <motion.div
                        key={location.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all ${
                            location.popular
                              ? 'border-2 border-accent'
                              : 'hover:border-accent'
                          }`}
                          onClick={() => handleConnect(location)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-3xl">{location.flag}</span>
                                <div>
                                  <p className="font-semibold">{location.city}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {location.country}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {location.popular && (
                                  <Badge variant="secondary" className="text-xs">
                                    Popular
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    location.speed === 'fast'
                                      ? 'border-green-500 text-green-700'
                                      : location.speed === 'medium'
                                      ? 'border-yellow-500 text-yellow-700'
                                      : 'border-orange-500 text-orange-700'
                                  }`}
                                >
                                  <Lightning className="w-3 h-3 mr-1" weight="fill" />
                                  {location.speed}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {location.services.slice(0, 3).map(service => (
                                <Badge
                                  key={service}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {service}
                                </Badge>
                              ))}
                              {location.services.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{location.services.length - 3}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Globe className="w-8 h-8 mx-auto mb-2 text-accent" weight="duotone" />
            <h4 className="font-semibold mb-1">Global Access</h4>
            <p className="text-xs text-muted-foreground">
              Access content from 10+ countries worldwide
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Lightning className="w-8 h-8 mx-auto mb-2 text-accent" weight="duotone" />
            <h4 className="font-semibold mb-1">Fast Speeds</h4>
            <p className="text-xs text-muted-foreground">
              Optimized servers for streaming quality
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Lock className="w-8 h-8 mx-auto mb-2 text-accent" weight="duotone" />
            <h4 className="font-semibold mb-1">Secure Connection</h4>
            <p className="text-xs text-muted-foreground">
              Encrypted connection for privacy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
