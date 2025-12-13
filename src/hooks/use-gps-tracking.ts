/**
 * React Hook for GPS Tracking
 * Provides real-time location tracking for family safety
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  GPSLocation,
  getCurrentLocation,
  startContinuousTracking,
  stopContinuousTracking,
  isGeolocationSupported,
  isTrackingEnabled,
  getLastKnownLocation,
  getLocationHistory,
  formatLocationTime,
  formatDistance,
  calculateDistance,
  createSOSAlert,
  getSOSAlerts,
  acknowledgeSOSAlert,
  SOSAlert,
} from '@/lib/gps-tracking'
import { toast } from 'sonner'

export interface UseGPSTrackingReturn {
  // Current state
  currentLocation: GPSLocation | null
  isTracking: boolean
  isLoading: boolean
  error: string | null

  // Permissions
  hasPermission: boolean | null
  isSupported: boolean

  // Actions
  requestLocation: () => Promise<GPSLocation | null>
  startTracking: () => void
  stopTracking: () => void

  // Location history
  locationHistory: GPSLocation[]

  // Helpers
  formatTime: (timestamp: number) => string
  formatDist: (meters: number) => string
  getDistanceFrom: (lat: number, lng: number) => number | null

  // SOS
  sendSOS: (memberName: string, message?: string) => SOSAlert | null
  sosAlerts: SOSAlert[]
  acknowledgeSOS: (alertId: string, memberId: string) => void
}

export function useGPSTracking(): UseGPSTrackingReturn {
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [locationHistory, setLocationHistory] = useState<GPSLocation[]>([])
  const [sosAlerts, setSOSAlerts] = useState<SOSAlert[]>([])

  const watchIdRef = useRef<number | null>(null)
  const isSupported = isGeolocationSupported()

  // Check initial state
  useEffect(() => {
    // Load last known location
    const lastLocation = getLastKnownLocation()
    if (lastLocation) {
      setCurrentLocation(lastLocation)
    }

    // Check if tracking was previously enabled
    if (isTrackingEnabled()) {
      setIsTracking(true)
    }

    // Load location history
    setLocationHistory(getLocationHistory('me'))

    // Load SOS alerts
    setSOSAlerts(getSOSAlerts())

    // Check permission state
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then(result => {
          setHasPermission(result.state === 'granted')

          result.onchange = () => {
            setHasPermission(result.state === 'granted')
          }
        })
        .catch(() => {
          // Permission API not fully supported
        })
    }
  }, [])

  // Request single location update
  const requestLocation = useCallback(async (): Promise<GPSLocation | null> => {
    if (!isSupported) {
      setError('Geolocation is not supported by your browser')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const location = await getCurrentLocation()
      setCurrentLocation(location)
      setHasPermission(true)

      // Update history
      setLocationHistory(getLocationHistory('me'))

      toast.success('Location updated', {
        description: location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
      })

      return location
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get location'
      setError(errorMsg)
      setHasPermission(false)

      toast.error('Location error', {
        description: errorMsg,
      })

      return null
    } finally {
      setIsLoading(false)
    }
  }, [isSupported])

  // Start continuous tracking
  const startTracking = useCallback(() => {
    if (!isSupported) {
      setError('Geolocation is not supported')
      return
    }

    setIsLoading(true)
    setError(null)

    const watchId = startContinuousTracking(
      location => {
        setCurrentLocation(location)
        setIsLoading(false)
        setHasPermission(true)
        setLocationHistory(getLocationHistory('me'))
      },
      geoError => {
        let errorMsg = 'Location tracking failed'
        if (geoError.code === 1) {
          errorMsg = 'Location permission denied'
          setHasPermission(false)
        }
        setError(errorMsg)
        setIsLoading(false)
      }
    )

    if (watchId !== null) {
      watchIdRef.current = watchId
      setIsTracking(true)
      toast.success('GPS tracking started', {
        description: 'Your location is being monitored for family safety',
      })
    }
  }, [isSupported])

  // Stop continuous tracking
  const stopTracking = useCallback(() => {
    stopContinuousTracking()
    watchIdRef.current = null
    setIsTracking(false)
    toast.info('GPS tracking stopped')
  }, [])

  // Calculate distance from current location
  const getDistanceFrom = useCallback(
    (lat: number, lng: number): number | null => {
      if (!currentLocation) return null
      return calculateDistance(currentLocation.lat, currentLocation.lng, lat, lng)
    },
    [currentLocation]
  )

  // Send SOS alert
  const sendSOS = useCallback(
    (memberName: string, message?: string): SOSAlert | null => {
      if (!currentLocation) {
        toast.error('Cannot send SOS', {
          description: 'Location not available. Please enable GPS.',
        })
        return null
      }

      const alert = createSOSAlert('me', memberName, currentLocation, message)
      setSOSAlerts(getSOSAlerts())

      toast.error('SOS ALERT SENT', {
        description: `Emergency alert sent with your current location`,
        duration: 10000,
      })

      return alert
    },
    [currentLocation]
  )

  // Acknowledge SOS
  const acknowledgeSOS = useCallback((alertId: string, memberId: string) => {
    acknowledgeSOSAlert(alertId, memberId)
    setSOSAlerts(getSOSAlerts())
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't stop tracking on unmount - let it continue in background
    }
  }, [])

  return {
    currentLocation,
    isTracking,
    isLoading,
    error,
    hasPermission,
    isSupported,
    requestLocation,
    startTracking,
    stopTracking,
    locationHistory,
    formatTime: formatLocationTime,
    formatDist: formatDistance,
    getDistanceFrom,
    sendSOS,
    sosAlerts,
    acknowledgeSOS,
  }
}

export default useGPSTracking
