/**
 * Location Tracking Service
 * Real-time GPS location tracking with reverse geocoding
 */

export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
  address?: LocationAddress
}

export interface LocationAddress {
  street?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  fullAddress?: string
}

export class LocationTracker {
  private watchId: number | null = null
  private currentLocation: LocationData | null = null
  private locationHistory: LocationData[] = []
  private listeners: ((location: LocationData) => void)[] = []
  private isTracking: boolean = false

  constructor() {
    this.loadLocationHistory()
  }

  /**
   * Start tracking user's location in real-time
   */
  startTracking(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by your browser'))
        return
      }

      if (this.isTracking) {
        resolve()
        return
      }

      // Request high accuracy location tracking
      this.watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          }

          // Reverse geocode to get address
          try {
            const address = await this.reverseGeocode(
              locationData.latitude,
              locationData.longitude
            )
            locationData.address = address
          } catch (error) {
            console.error('Reverse geocoding failed:', error)
          }

          this.currentLocation = locationData
          this.addToHistory(locationData)
          this.notifyListeners(locationData)

          if (!this.isTracking) {
            this.isTracking = true
            resolve()
          }
        },
        (error) => {
          console.error('Location tracking error:', error)
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })
  }

  /**
   * Stop tracking location
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
      this.isTracking = false
    }
  }

  /**
   * Get current location once (one-time request)
   */
  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          }

          try {
            const address = await this.reverseGeocode(
              locationData.latitude,
              locationData.longitude
            )
            locationData.address = address
          } catch (error) {
            console.error('Reverse geocoding failed:', error)
          }

          this.currentLocation = locationData
          resolve(locationData)
        },
        (error) => {
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })
  }

  /**
   * Reverse geocode coordinates to address using Nominatim (OpenStreetMap)
   */
  private async reverseGeocode(lat: number, lon: number): Promise<LocationAddress> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'FlowSphere-App'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Reverse geocoding failed')
      }

      const data = await response.json()

      const address: LocationAddress = {
        street: data.address?.road || data.address?.street || data.address?.suburb,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        country: data.address?.country,
        postalCode: data.address?.postcode,
        fullAddress: data.display_name
      }

      return address
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      throw error
    }
  }

  /**
   * Get current location data
   */
  getLocation(): LocationData | null {
    return this.currentLocation
  }

  /**
   * Get readable address string
   */
  getCurrentAddress(): string {
    if (!this.currentLocation?.address) {
      return 'Location not available'
    }

    const addr = this.currentLocation.address
    const parts: string[] = []

    if (addr.street) parts.push(addr.street)
    if (addr.city) parts.push(addr.city)
    if (addr.state) parts.push(addr.state)

    return parts.length > 0 ? parts.join(', ') : addr.fullAddress || 'Unknown location'
  }

  /**
   * Get current street name
   */
  getCurrentStreet(): string {
    return this.currentLocation?.address?.street || 'Unknown street'
  }

  /**
   * Get current city
   */
  getCurrentCity(): string {
    return this.currentLocation?.address?.city || 'Unknown city'
  }

  /**
   * Subscribe to location updates
   */
  onLocationUpdate(callback: (location: LocationData) => void): () => void {
    this.listeners.push(callback)

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback)
    }
  }

  /**
   * Notify all listeners of location update
   */
  private notifyListeners(location: LocationData): void {
    this.listeners.forEach(callback => {
      try {
        callback(location)
      } catch (error) {
        console.error('Location listener error:', error)
      }
    })
  }

  /**
   * Add location to history
   */
  private addToHistory(location: LocationData): void {
    this.locationHistory.push(location)

    // Keep only last 100 locations
    if (this.locationHistory.length > 100) {
      this.locationHistory.shift()
    }

    this.saveLocationHistory()
  }

  /**
   * Get location history
   */
  getHistory(): LocationData[] {
    return [...this.locationHistory]
  }

  /**
   * Save location history to localStorage
   */
  private saveLocationHistory(): void {
    try {
      localStorage.setItem(
        'flowsphere-location-history',
        JSON.stringify(this.locationHistory.slice(-10)) // Save last 10 only
      )
    } catch (error) {
      console.error('Failed to save location history:', error)
    }
  }

  /**
   * Load location history from localStorage
   */
  private loadLocationHistory(): void {
    try {
      const saved = localStorage.getItem('flowsphere-location-history')
      if (saved) {
        this.locationHistory = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load location history:', error)
    }
  }

  /**
   * Check if location tracking is active
   */
  isActive(): boolean {
    return this.isTracking
  }
}

// Global instance
let globalLocationTracker: LocationTracker | null = null

/**
 * Get or create global location tracker instance
 */
export function getLocationTracker(): LocationTracker {
  if (!globalLocationTracker) {
    globalLocationTracker = new LocationTracker()
  }
  return globalLocationTracker
}

/**
 * Request location permission and start tracking
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const tracker = getLocationTracker()
    await tracker.startTracking()
    return true
  } catch (error) {
    console.error('Location permission denied:', error)
    return false
  }
}
