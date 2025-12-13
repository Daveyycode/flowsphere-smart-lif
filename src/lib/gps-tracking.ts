/**
 * Real GPS Tracking Service using Browser Geolocation API
 * For family safety - emergency life-saving feature
 */

import { logger } from '@/lib/security-utils'

export interface GPSLocation {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
  address?: string
  speed?: number | null
  heading?: number | null
  altitude?: number | null
}

export interface LocationHistory {
  memberId: string
  locations: GPSLocation[]
  lastUpdated: number
}

export interface GeofenceZone {
  id: string
  name: string
  lat: number
  lng: number
  radius: number // in meters
}

// Storage keys
const LOCATION_HISTORY_KEY = 'flowsphere-location-history'
const MY_LOCATION_KEY = 'flowsphere-my-location'
const TRACKING_ENABLED_KEY = 'flowsphere-gps-tracking-enabled'
const WATCH_ID_KEY = 'flowsphere-gps-watch-id'

/**
 * Check if browser supports geolocation
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator
}

/**
 * Get current location with high accuracy
 */
export async function getCurrentLocation(): Promise<GPSLocation> {
  if (!isGeolocationSupported()) {
    throw new Error('Geolocation is not supported by this browser')
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async position => {
        const location: GPSLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
          speed: position.coords.speed,
          heading: position.coords.heading,
          altitude: position.coords.altitude,
        }

        // Try to get address via reverse geocoding
        try {
          location.address = await reverseGeocode(location.lat, location.lng)
        } catch (e) {
          logger.warn('Failed to reverse geocode:', e)
        }

        // Store for later use
        localStorage.setItem(MY_LOCATION_KEY, JSON.stringify(location))

        resolve(location)
      },
      error => {
        let errorMessage = 'Failed to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              'Location permission denied. Please enable location access in your browser settings.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.'
            break
        }
        reject(new Error(errorMessage))
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  })
}

/**
 * Start continuous GPS tracking with callback
 */
export function startContinuousTracking(
  onLocationUpdate: (location: GPSLocation) => void,
  onError?: (error: GeolocationPositionError) => void
): number | null {
  if (!isGeolocationSupported()) {
    logger.error('Geolocation not supported')
    return null
  }

  const watchId = navigator.geolocation.watchPosition(
    async position => {
      const location: GPSLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
        speed: position.coords.speed,
        heading: position.coords.heading,
        altitude: position.coords.altitude,
      }

      // Try to get address
      try {
        location.address = await reverseGeocode(location.lat, location.lng)
      } catch (e) {
        // Ignore geocoding errors
      }

      // Store current location
      localStorage.setItem(MY_LOCATION_KEY, JSON.stringify(location))

      // Add to history
      addToLocationHistory('me', location)

      onLocationUpdate(location)
    },
    error => {
      logger.error('GPS tracking error:', error)
      onError?.(error)
    },
    {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 5000, // Allow cached position up to 5 seconds old
    }
  )

  localStorage.setItem(WATCH_ID_KEY, String(watchId))
  localStorage.setItem(TRACKING_ENABLED_KEY, 'true')

  return watchId
}

/**
 * Stop continuous GPS tracking
 */
export function stopContinuousTracking(): void {
  const watchIdStr = localStorage.getItem(WATCH_ID_KEY)
  if (watchIdStr) {
    const watchId = parseInt(watchIdStr, 10)
    navigator.geolocation.clearWatch(watchId)
    localStorage.removeItem(WATCH_ID_KEY)
  }
  localStorage.setItem(TRACKING_ENABLED_KEY, 'false')
}

/**
 * Check if tracking is enabled
 */
export function isTrackingEnabled(): boolean {
  return localStorage.getItem(TRACKING_ENABLED_KEY) === 'true'
}

/**
 * Get last known location
 */
export function getLastKnownLocation(): GPSLocation | null {
  const stored = localStorage.getItem(MY_LOCATION_KEY)
  if (stored) {
    return JSON.parse(stored)
  }
  return null
}

/**
 * Add location to history
 */
function addToLocationHistory(memberId: string, location: GPSLocation): void {
  const historyStr = localStorage.getItem(LOCATION_HISTORY_KEY)
  const allHistory: Record<string, LocationHistory> = historyStr ? JSON.parse(historyStr) : {}

  if (!allHistory[memberId]) {
    allHistory[memberId] = {
      memberId,
      locations: [],
      lastUpdated: Date.now(),
    }
  }

  // Keep last 100 locations (about 8 hours at 5 min intervals)
  allHistory[memberId].locations.push(location)
  if (allHistory[memberId].locations.length > 100) {
    allHistory[memberId].locations.shift()
  }
  allHistory[memberId].lastUpdated = Date.now()

  localStorage.setItem(LOCATION_HISTORY_KEY, JSON.stringify(allHistory))
}

/**
 * Get location history for a member
 */
export function getLocationHistory(memberId: string): GPSLocation[] {
  const historyStr = localStorage.getItem(LOCATION_HISTORY_KEY)
  if (!historyStr) return []

  const allHistory: Record<string, LocationHistory> = JSON.parse(historyStr)
  return allHistory[memberId]?.locations || []
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * Returns distance in meters
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Check if a location is inside a geofence zone
 */
export function isInsideGeofence(location: GPSLocation, zone: GeofenceZone): boolean {
  const distance = calculateDistance(location.lat, location.lng, zone.lat, zone.lng)
  return distance <= zone.radius
}

/**
 * Check all geofences and return violations
 */
export function checkGeofenceViolations(
  location: GPSLocation,
  zones: GeofenceZone[],
  expectedInside: boolean = true
): GeofenceZone[] {
  const violations: GeofenceZone[] = []

  for (const zone of zones) {
    const inside = isInsideGeofence(location, zone)
    if (expectedInside && !inside) {
      violations.push(zone)
    } else if (!expectedInside && inside) {
      violations.push(zone)
    }
  }

  return violations
}

/**
 * Reverse geocode coordinates to address using OpenStreetMap Nominatim (free)
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
      {
        headers: {
          'User-Agent': 'FlowSphere Family Safety App',
        },
      }
    )

    if (!response.ok) {
      throw new Error('Geocoding failed')
    }

    const data = await response.json()
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } catch (error) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

/**
 * Format timestamp for display
 */
export function formatLocationTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return date.toLocaleDateString()
}

/**
 * Open location in maps app
 */
export function openInMaps(lat: number, lng: number, label?: string): void {
  const url = label
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(label)}`
    : `https://www.google.com/maps?q=${lat},${lng}`

  window.open(url, '_blank')
}

/**
 * Create an emergency SOS with current location
 */
export interface SOSAlert {
  id: string
  timestamp: number
  location: GPSLocation
  memberId: string
  memberName: string
  message?: string
  audioData?: string // Base64 encoded audio
  acknowledged: string[] // List of member IDs who acknowledged
}

export function createSOSAlert(
  memberId: string,
  memberName: string,
  location: GPSLocation,
  message?: string,
  audioData?: string
): SOSAlert {
  const alert: SOSAlert = {
    id: `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    location,
    memberId,
    memberName,
    message,
    audioData,
    acknowledged: [],
  }

  // Store SOS alerts
  const alertsStr = localStorage.getItem('flowsphere-sos-alerts')
  const alerts: SOSAlert[] = alertsStr ? JSON.parse(alertsStr) : []
  alerts.unshift(alert) // Add to beginning

  // Keep last 50 alerts
  if (alerts.length > 50) {
    alerts.splice(50)
  }

  localStorage.setItem('flowsphere-sos-alerts', JSON.stringify(alerts))

  return alert
}

/**
 * Get all SOS alerts
 */
export function getSOSAlerts(): SOSAlert[] {
  const alertsStr = localStorage.getItem('flowsphere-sos-alerts')
  return alertsStr ? JSON.parse(alertsStr) : []
}

/**
 * Acknowledge an SOS alert
 */
export function acknowledgeSOSAlert(alertId: string, memberId: string): void {
  const alerts = getSOSAlerts()
  const alert = alerts.find(a => a.id === alertId)
  if (alert && !alert.acknowledged.includes(memberId)) {
    alert.acknowledged.push(memberId)
    localStorage.setItem('flowsphere-sos-alerts', JSON.stringify(alerts))
  }
}

/**
 * GPS tracking hook state interface
 */
export interface GPSTrackingState {
  currentLocation: GPSLocation | null
  isTracking: boolean
  error: string | null
  locationHistory: GPSLocation[]
  lastUpdate: number | null
}
