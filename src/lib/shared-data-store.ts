/**
 * Shared Data Store - Centralized data synchronization
 * Provides a single source of truth for data shared across multiple components
 *
 * SYNC ISSUES FIXED:
 * 1. Weather data: morning-brief and weather-view now use same cached data
 * 2. Traffic data: morning-brief now gets real traffic data
 * 3. Notifications: Email alerts now sync to notification list
 * 4. Family locations: Now available for traffic route suggestions
 */

import { logger } from '@/lib/security-utils'

// ==========================================
// WEATHER DATA STORE
// ==========================================

export interface SharedWeatherData {
  condition: string
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  high: number
  low: number
  description: string
  city: string
  lastUpdated: string
}

const WEATHER_CACHE_KEY = 'flowsphere-weather-cache'
const WEATHER_CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

export const WeatherStore = {
  /**
   * Get cached weather data
   */
  get(): SharedWeatherData | null {
    try {
      const cached = localStorage.getItem(WEATHER_CACHE_KEY)
      if (!cached) return null

      const data = JSON.parse(cached) as SharedWeatherData
      const lastUpdated = new Date(data.lastUpdated).getTime()
      const now = Date.now()

      // Return null if cache is expired
      if (now - lastUpdated > WEATHER_CACHE_DURATION) {
        return null
      }

      return data
    } catch (error) {
      logger.error('Failed to get weather cache', error, 'WeatherStore')
      return null
    }
  },

  /**
   * Set weather data and notify listeners
   */
  set(data: Omit<SharedWeatherData, 'lastUpdated'>): void {
    try {
      const weatherData: SharedWeatherData = {
        ...data,
        lastUpdated: new Date().toISOString(),
      }
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherData))

      // Dispatch event for cross-component sync
      window.dispatchEvent(
        new CustomEvent('flowsphere-weather-update', {
          detail: weatherData,
        })
      )
    } catch (error) {
      logger.error('Failed to set weather cache', error, 'WeatherStore')
    }
  },

  /**
   * Subscribe to weather updates
   */
  subscribe(callback: (data: SharedWeatherData) => void): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<SharedWeatherData>
      callback(customEvent.detail)
    }
    window.addEventListener('flowsphere-weather-update', handler)
    return () => window.removeEventListener('flowsphere-weather-update', handler)
  },

  /**
   * Check if cache is valid
   */
  isValid(): boolean {
    return this.get() !== null
  },

  /**
   * Clear cache
   */
  clear(): void {
    localStorage.removeItem(WEATHER_CACHE_KEY)
  },
}

// ==========================================
// TRAFFIC DATA STORE
// ==========================================

export interface SharedTrafficData {
  status: 'light' | 'moderate' | 'heavy' | 'severe'
  duration: string
  delay: string
  delayMinutes: number
  fromLocation: string
  toLocation: string
  lastUpdated: string
  alternativeRoutes?: Array<{
    name: string
    duration: string
    savings: number
  }>
}

const TRAFFIC_CACHE_KEY = 'flowsphere-traffic-cache'
const TRAFFIC_CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

export const TrafficStore = {
  get(): SharedTrafficData | null {
    try {
      const cached = localStorage.getItem(TRAFFIC_CACHE_KEY)
      if (!cached) return null

      const data = JSON.parse(cached) as SharedTrafficData
      const lastUpdated = new Date(data.lastUpdated).getTime()
      const now = Date.now()

      if (now - lastUpdated > TRAFFIC_CACHE_DURATION) {
        return null
      }

      return data
    } catch (error) {
      logger.error('Failed to get traffic cache', error, 'TrafficStore')
      return null
    }
  },

  set(data: Omit<SharedTrafficData, 'lastUpdated'>): void {
    try {
      const trafficData: SharedTrafficData = {
        ...data,
        lastUpdated: new Date().toISOString(),
      }
      localStorage.setItem(TRAFFIC_CACHE_KEY, JSON.stringify(trafficData))

      window.dispatchEvent(
        new CustomEvent('flowsphere-traffic-update', {
          detail: trafficData,
        })
      )
    } catch (error) {
      logger.error('Failed to set traffic cache', error, 'TrafficStore')
    }
  },

  subscribe(callback: (data: SharedTrafficData) => void): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<SharedTrafficData>
      callback(customEvent.detail)
    }
    window.addEventListener('flowsphere-traffic-update', handler)
    return () => window.removeEventListener('flowsphere-traffic-update', handler)
  },

  isValid(): boolean {
    return this.get() !== null
  },

  clear(): void {
    localStorage.removeItem(TRAFFIC_CACHE_KEY)
  },
}

// ==========================================
// NOTIFICATION SYNC STORE
// ==========================================

export interface EmailNotification {
  id: string
  type: 'email'
  title: string
  message: string
  from: string
  category: 'emergency' | 'important' | 'regular' | 'work' | 'personal'
  priority: 'high' | 'medium' | 'low'
  timestamp: string
  isRead: boolean
  emailId?: string
  provider?: string
}

const NOTIFICATION_QUEUE_KEY = 'flowsphere-notification-queue'

export const NotificationSyncStore = {
  /**
   * Queue a new notification from email monitor
   */
  queueNotification(notification: Omit<EmailNotification, 'id' | 'timestamp' | 'isRead'>): void {
    try {
      const queue = this.getQueue()
      const newNotification: EmailNotification = {
        ...notification,
        id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        isRead: false,
      }
      queue.push(newNotification)
      localStorage.setItem(NOTIFICATION_QUEUE_KEY, JSON.stringify(queue))

      // Dispatch event for App.tsx to consume
      window.dispatchEvent(
        new CustomEvent('flowsphere-notification-new', {
          detail: newNotification,
        })
      )
    } catch (error) {
      logger.error('Failed to queue notification', error, 'NotificationSyncStore')
    }
  },

  /**
   * Get queued notifications
   */
  getQueue(): EmailNotification[] {
    try {
      const queue = localStorage.getItem(NOTIFICATION_QUEUE_KEY)
      return queue ? JSON.parse(queue) : []
    } catch {
      return []
    }
  },

  /**
   * Clear processed notifications from queue
   */
  clearQueue(): void {
    localStorage.removeItem(NOTIFICATION_QUEUE_KEY)
  },

  /**
   * Subscribe to new notifications
   */
  subscribe(callback: (notification: EmailNotification) => void): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<EmailNotification>
      callback(customEvent.detail)
    }
    window.addEventListener('flowsphere-notification-new', handler)
    return () => window.removeEventListener('flowsphere-notification-new', handler)
  },

  /**
   * Get notification counts for dashboard
   */
  getCounts(): { unread: number; important: number; emergency: number } {
    try {
      const notificationsRaw = localStorage.getItem('flowsphere-notifications-list')
      const notifications = notificationsRaw ? JSON.parse(notificationsRaw) : []

      return {
        unread: notifications.filter((n: any) => !n.isRead).length,
        important: notifications.filter((n: any) => n.type === 'important' || n.priority === 'high')
          .length,
        emergency: notifications.filter((n: any) => n.type === 'emergency' || n.type === 'urgent')
          .length,
      }
    } catch {
      return { unread: 0, important: 0, emergency: 0 }
    }
  },
}

// ==========================================
// FAMILY LOCATION STORE
// ==========================================

export interface FamilyLocationData {
  id: string
  name: string
  location: string
  coordinates?: {
    lat: number
    lng: number
  }
  lastUpdated: string
  status: string
}

const FAMILY_LOCATIONS_KEY = 'flowsphere-family-locations-cache'

export const FamilyLocationStore = {
  /**
   * Get all family member locations
   */
  getLocations(): FamilyLocationData[] {
    try {
      // Try to get from family members store
      const familyRaw = localStorage.getItem('flowsphere-family')
      if (!familyRaw) return []

      const family = JSON.parse(familyRaw)
      return family.map((member: any) => ({
        id: member.id,
        name: member.name,
        location: member.location || 'Unknown',
        coordinates: member.gpsCoordinates,
        lastUpdated: member.lastSeen || new Date().toISOString(),
        status: member.status || 'Unknown',
      }))
    } catch (error) {
      logger.error('Failed to get family locations', error, 'FamilyLocationStore')
      return []
    }
  },

  /**
   * Update a family member's location
   */
  updateLocation(
    memberId: string,
    location: string,
    coordinates?: { lat: number; lng: number }
  ): void {
    try {
      const familyRaw = localStorage.getItem('flowsphere-family')
      if (!familyRaw) return

      const family = JSON.parse(familyRaw)
      const memberIndex = family.findIndex((m: any) => m.id === memberId)

      if (memberIndex >= 0) {
        family[memberIndex] = {
          ...family[memberIndex],
          location,
          gpsCoordinates: coordinates,
          lastSeen: new Date().toISOString(),
        }
        localStorage.setItem('flowsphere-family', JSON.stringify(family))

        // Dispatch update event
        window.dispatchEvent(
          new CustomEvent('flowsphere-family-location-update', {
            detail: { memberId, location, coordinates },
          })
        )
      }
    } catch (error) {
      logger.error('Failed to update family location', error, 'FamilyLocationStore')
    }
  },

  /**
   * Subscribe to family location updates
   */
  subscribe(
    callback: (data: {
      memberId: string
      location: string
      coordinates?: { lat: number; lng: number }
    }) => void
  ): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent
      callback(customEvent.detail)
    }
    window.addEventListener('flowsphere-family-location-update', handler)
    return () => window.removeEventListener('flowsphere-family-location-update', handler)
  },

  /**
   * Get locations as route suggestions for traffic
   */
  getRouteDestinations(): Array<{ label: string; address: string; type: 'family' }> {
    const locations = this.getLocations()
    return locations
      .filter(loc => loc.location && loc.location !== 'Unknown')
      .map(loc => ({
        label: `${loc.name}'s Location`,
        address: loc.location,
        type: 'family' as const,
      }))
  },
}

// ==========================================
// SYNC STATUS TRACKER
// ==========================================

export interface SyncStatus {
  weather: { lastSync: string | null; isStale: boolean }
  traffic: { lastSync: string | null; isStale: boolean }
  notifications: { lastSync: string | null; isStale: boolean }
  family: { lastSync: string | null; isStale: boolean }
}

export const SyncStatusTracker = {
  getStatus(): SyncStatus {
    const weatherData = WeatherStore.get()
    const trafficData = TrafficStore.get()

    return {
      weather: {
        lastSync: weatherData?.lastUpdated || null,
        isStale: !WeatherStore.isValid(),
      },
      traffic: {
        lastSync: trafficData?.lastUpdated || null,
        isStale: !TrafficStore.isValid(),
      },
      notifications: {
        lastSync: new Date().toISOString(),
        isStale: false,
      },
      family: {
        lastSync: new Date().toISOString(),
        isStale: false,
      },
    }
  },

  /**
   * Log sync status for debugging
   */
  logStatus(): void {
    const status = this.getStatus()
    logger.info('Data Sync Status:', status, 'SyncStatusTracker')
  },
}

// Export all stores
export default {
  WeatherStore,
  TrafficStore,
  NotificationSyncStore,
  FamilyLocationStore,
  SyncStatusTracker,
}
