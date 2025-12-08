/**
 * FlowSphere Interactive Map Component
 * Uses Mapbox GL JS for professional mapping
 * Features: Live GPS, Route display, Custom markers, Traffic layer
 *
 * SETUP: Add your Mapbox access token to .env as VITE_MAPBOX_ACCESS_TOKEN
 * Get a free token at https://account.mapbox.com/access-tokens/
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  NavigationArrow,
  MapPin,
  Crosshair,
  Car,
  Path,
  Warning,
  Clock,
  ArrowRight,
  Gear
} from '@phosphor-icons/react'
import { getRoute, type RouteResult, type RouteCoordinate } from '@/lib/api/routing'

// Set Mapbox access token from environment
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''

interface Location {
  lat: number
  lng: number
  accuracy?: number
  heading?: number
  speed?: number
  timestamp?: number
}

interface Route {
  id: string
  name: string
  from: { lat: number; lng: number; address: string }
  to: { lat: number; lng: number; address: string }
  arrivalTime?: string
  distance?: string
  duration?: string
  trafficCondition?: 'light' | 'moderate' | 'heavy' | 'severe'
  polyline?: RouteCoordinate[]
}

interface FlowSphereMapProps {
  routes?: Route[]
  selectedRoute?: Route | null
  onRouteSelect?: (route: Route) => void
  onLocationUpdate?: (location: Location) => void
  showTraffic?: boolean
  height?: string
  className?: string
}

export function FlowSphereMap({
  routes = [],
  selectedRoute,
  onRouteSelect,
  onLocationUpdate,
  showTraffic = true,
  height = '400px',
  className = '',
}: FlowSphereMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const userMarker = useRef<mapboxgl.Marker | null>(null)
  const watchId = useRef<number | null>(null)

  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'dark'>('streets')
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [routePolylines, setRoutePolylines] = useState<Map<string, RouteResult>>(new Map())
  const [hasToken, setHasToken] = useState(!!MAPBOX_TOKEN)

  // Map style URLs
  const mapStyles = {
    streets: 'mapbox://styles/mapbox/streets-v12',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    dark: 'mapbox://styles/mapbox/dark-v11'
  }

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    if (!MAPBOX_TOKEN) {
      console.warn('[Map] No Mapbox token found. Add VITE_MAPBOX_ACCESS_TOKEN to .env')
      setHasToken(false)
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyles[mapStyle],
      center: [120.9842, 14.5995], // Manila default
      zoom: 13,
      attributionControl: false
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-left')

    // Add attribution
    map.current.addControl(new mapboxgl.AttributionControl({
      compact: true
    }))

    // Get initial location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }
          setCurrentLocation(loc)

          if (map.current) {
            map.current.setCenter([loc.lng, loc.lat])
            addUserMarker(loc)
          }
        },
        () => {
          // Use default location
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }

    // Add traffic layer if enabled
    map.current.on('load', () => {
      if (showTraffic && map.current) {
        map.current.addSource('mapbox-traffic', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-traffic-v1'
        })

        map.current.addLayer({
          id: 'traffic',
          type: 'line',
          source: 'mapbox-traffic',
          'source-layer': 'traffic',
          paint: {
            'line-color': [
              'match',
              ['get', 'congestion'],
              'low', '#10B981',
              'moderate', '#F59E0B',
              'heavy', '#EF4444',
              'severe', '#7C3AED',
              '#94A3B8'
            ],
            'line-width': 2
          }
        })
      }
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update map style
  useEffect(() => {
    if (map.current && MAPBOX_TOKEN) {
      map.current.setStyle(mapStyles[mapStyle])
    }
  }, [mapStyle])

  // Add user location marker
  const addUserMarker = (loc: Location) => {
    if (!map.current) return

    // Remove existing marker
    if (userMarker.current) {
      userMarker.current.remove()
    }

    // Create custom marker element
    const el = document.createElement('div')
    el.className = 'user-location-marker'
    el.innerHTML = `
      <div style="
        width: 24px;
        height: 24px;
        background: #3B82F6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 10px rgba(59, 130, 246, 0.5);
        animation: pulse 2s infinite;
      "></div>
    `

    userMarker.current = new mapboxgl.Marker(el)
      .setLngLat([loc.lng, loc.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div style="padding: 8px;">
          <strong>Your Location</strong>
          ${loc.accuracy ? `<p style="font-size: 12px; color: #666;">Accuracy: ${Math.round(loc.accuracy)}m</p>` : ''}
          ${loc.speed ? `<p style="font-size: 12px; color: #666;">Speed: ${Math.round(loc.speed * 3.6)} km/h</p>` : ''}
        </div>
      `))
      .addTo(map.current)
  }

  // Handle location tracking
  useEffect(() => {
    if (!isTracking || !map.current) return

    if ('geolocation' in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const loc: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          }
          setCurrentLocation(loc)
          onLocationUpdate?.(loc)

          if (map.current) {
            map.current.easeTo({
              center: [loc.lng, loc.lat],
              duration: 1000
            })
            addUserMarker(loc)
          }
        },
        (error) => {
          console.error('Geolocation error:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
  }, [isTracking, onLocationUpdate])

  // Fetch routes using Mapbox Directions API
  useEffect(() => {
    const fetchRoutes = async () => {
      if (!routes.length || !MAPBOX_TOKEN) return

      setIsLoadingRoute(true)
      const newPolylines = new Map(routePolylines)

      for (const route of routes) {
        if (newPolylines.has(route.id)) continue

        try {
          // Use Mapbox Directions API
          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${route.from.lng},${route.from.lat};${route.to.lng},${route.to.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
          )
          const data = await response.json()

          if (data.routes && data.routes[0]) {
            const routeData = data.routes[0]
            newPolylines.set(route.id, {
              polyline: routeData.geometry.coordinates.map((coord: number[]) => ({
                lng: coord[0],
                lat: coord[1]
              })),
              distanceText: `${(routeData.distance / 1000).toFixed(1)} km`,
              durationText: `${Math.round(routeData.duration / 60)} min`
            })
          }
        } catch (error) {
          console.error('[Map] Failed to fetch route:', route.id, error)
        }
      }

      setRoutePolylines(newPolylines)
      setIsLoadingRoute(false)
    }

    fetchRoutes()
  }, [routes])

  // Draw routes on map
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return

    // Remove existing route layers
    routes.forEach(route => {
      if (map.current?.getLayer(`route-${route.id}`)) {
        map.current.removeLayer(`route-${route.id}`)
      }
      if (map.current?.getSource(`route-${route.id}`)) {
        map.current.removeSource(`route-${route.id}`)
      }
    })

    // Add route lines
    routes.forEach(route => {
      const routeData = routePolylines.get(route.id)
      if (!routeData?.polyline || !map.current) return

      const coordinates = routeData.polyline.map(p => [p.lng, p.lat])

      map.current.addSource(`route-${route.id}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates
          }
        }
      })

      const isSelected = selectedRoute?.id === route.id
      const color = isSelected ? getTrafficColor(route.trafficCondition) : '#94A3B8'

      map.current.addLayer({
        id: `route-${route.id}`,
        type: 'line',
        source: `route-${route.id}`,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': color,
          'line-width': isSelected ? 6 : 4,
          'line-opacity': isSelected ? 1 : 0.6
        }
      })

      // Add markers
      addRouteMarkers(route)
    })

    // Fit bounds to selected route
    if (selectedRoute && routePolylines.has(selectedRoute.id)) {
      const routeData = routePolylines.get(selectedRoute.id)
      if (routeData?.polyline && map.current) {
        const bounds = new mapboxgl.LngLatBounds()
        routeData.polyline.forEach(p => bounds.extend([p.lng, p.lat]))
        map.current.fitBounds(bounds, { padding: 50 })
      }
    }
  }, [routes, routePolylines, selectedRoute])

  // Add route markers
  const addRouteMarkers = (route: Route) => {
    if (!map.current) return

    // Start marker
    new mapboxgl.Marker({ color: '#10B981' })
      .setLngLat([route.from.lng, route.from.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div style="padding: 8px;">
          <strong>${route.name}</strong>
          <p style="font-size: 12px;">${route.from.address}</p>
        </div>
      `))
      .addTo(map.current)

    // End marker
    new mapboxgl.Marker({ color: '#EF4444' })
      .setLngLat([route.to.lng, route.to.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div style="padding: 8px;">
          <strong>Destination</strong>
          <p style="font-size: 12px;">${route.to.address}</p>
        </div>
      `))
      .addTo(map.current)
  }

  const getTrafficColor = (condition?: string) => {
    switch (condition) {
      case 'light': return '#10B981'
      case 'moderate': return '#F59E0B'
      case 'heavy': return '#EF4444'
      case 'severe': return '#7C3AED'
      default: return '#3B82F6'
    }
  }

  const centerOnLocation = () => {
    setIsLocating(true)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setCurrentLocation(loc)

          if (map.current) {
            map.current.easeTo({
              center: [loc.lng, loc.lat],
              zoom: 15,
              duration: 1000
            })
            addUserMarker(loc)
          }
          setIsLocating(false)
        },
        () => {
          setIsLocating(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }

  // No token warning
  if (!hasToken) {
    return (
      <div className={`relative rounded-xl overflow-hidden bg-muted ${className}`} style={{ height }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <Warning className="w-12 h-12 text-yellow-500 mb-4" weight="duotone" />
          <h3 className="text-lg font-semibold mb-2">Mapbox Token Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            To enable maps, add your Mapbox access token to the environment:
          </p>
          <code className="bg-background px-3 py-2 rounded text-xs mb-4">
            VITE_MAPBOX_ACCESS_TOKEN=your_token_here
          </code>
          <p className="text-xs text-muted-foreground">
            Get a free token at{' '}
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              mapbox.com
            </a>
            {' '}(50,000 free map loads/month)
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`} style={{ height }}>
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Loading indicator */}
      {isLoadingRoute && (
        <div className="absolute top-3 left-14 z-10">
          <Card className="px-3 py-2 bg-white/90 backdrop-blur shadow-lg flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-600">Loading route...</span>
          </Card>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
        <Button
          size="icon"
          variant="secondary"
          className="h-10 w-10 rounded-full bg-white/90 backdrop-blur shadow-lg hover:bg-white"
          onClick={centerOnLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Crosshair className="w-5 h-5 text-blue-600" />
            </motion.div>
          ) : (
            <Crosshair className="w-5 h-5 text-gray-700" />
          )}
        </Button>

        <Button
          size="icon"
          variant={isTracking ? 'default' : 'secondary'}
          className={`h-10 w-10 rounded-full shadow-lg ${
            isTracking
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-white/90 backdrop-blur hover:bg-white'
          }`}
          onClick={() => setIsTracking(!isTracking)}
        >
          <NavigationArrow
            className={`w-5 h-5 ${isTracking ? 'text-white' : 'text-gray-700'}`}
            weight={isTracking ? 'fill' : 'regular'}
          />
        </Button>

        {/* Map style toggle */}
        <Button
          size="icon"
          variant="secondary"
          className="h-10 w-10 rounded-full bg-white/90 backdrop-blur shadow-lg hover:bg-white"
          onClick={() => {
            const styles: ('streets' | 'satellite' | 'dark')[] = ['streets', 'satellite', 'dark']
            const currentIndex = styles.indexOf(mapStyle)
            setMapStyle(styles[(currentIndex + 1) % styles.length])
          }}
        >
          <Gear className="w-5 h-5 text-gray-700" />
        </Button>
      </div>

      {/* Style indicator */}
      <div className="absolute top-3 left-14 z-10">
        <Badge variant="secondary" className="bg-white/90 backdrop-blur text-xs capitalize">
          {mapStyle}
        </Badge>
      </div>

      {/* Traffic Legend */}
      {showTraffic && (
        <div className="absolute bottom-3 left-3 z-10">
          <Card className="p-2 bg-white/90 backdrop-blur shadow-lg">
            <p className="text-xs font-medium mb-1">Traffic</p>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-3 h-1 bg-green-500 rounded" />
                Light
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-1 bg-yellow-500 rounded" />
                Moderate
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-1 bg-red-500 rounded" />
                Heavy
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Selected Route Info */}
      <AnimatePresence>
        {selectedRoute && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-3 right-3 left-20 z-10"
          >
            <Card className="p-3 bg-white/95 backdrop-blur shadow-lg">
              {(() => {
                const routeData = routePolylines.get(selectedRoute.id)
                return (
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{selectedRoute.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                        {(routeData?.durationText || selectedRoute.duration) && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {routeData?.durationText || selectedRoute.duration}
                          </span>
                        )}
                        {(routeData?.distanceText || selectedRoute.distance) && (
                          <span>{routeData?.distanceText || selectedRoute.distance}</span>
                        )}
                        {selectedRoute.trafficCondition && (
                          <span
                            className="px-1.5 py-0.5 rounded text-white text-xs"
                            style={{ backgroundColor: getTrafficColor(selectedRoute.trafficCondition) }}
                          >
                            {selectedRoute.trafficCondition}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" className="ml-2">
                      <NavigationArrow className="w-4 h-4 mr-1" />
                      Go
                    </Button>
                  </div>
                )
              })()}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse animation style */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
          70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
    </div>
  )
}

export default FlowSphereMap
