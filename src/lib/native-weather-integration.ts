/**
 * Native Weather App Integration
 * Connects to device's native weather capabilities for real-time responsive updates
 */

import { WeatherData, WeatherForecastManager } from './weather-forecast'
import { logger } from '@/lib/security-utils'

export interface NativeWeatherCapabilities {
  geolocation: boolean
  notifications: boolean
  backgroundSync: boolean
  vibration: boolean
}

export interface WeatherNotificationSettings {
  enabled: boolean
  alerts: boolean
  dailyForecast: boolean
  severeWeather: boolean
  temperature: boolean
}

/**
 * Native Weather Integration Manager
 * Provides real-time weather updates using device capabilities
 */
export class NativeWeatherIntegration {
  private weatherManager: WeatherForecastManager
  private autoRefreshInterval: NodeJS.Timeout | null = null
  private watchId: number | null = null
  private notificationSettings: WeatherNotificationSettings
  private storageKey = 'flowsphere-weather-notifications'

  constructor(apiKey?: string) {
    this.weatherManager = new WeatherForecastManager(apiKey)
    this.notificationSettings = this.loadNotificationSettings()
  }

  /**
   * Check device capabilities
   */
  getDeviceCapabilities(): NativeWeatherCapabilities {
    return {
      geolocation: 'geolocation' in navigator,
      notifications: 'Notification' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in (ServiceWorkerRegistration.prototype || {}),
      vibration: 'vibrate' in navigator
    }
  }

  /**
   * Initialize native weather integration
   */
  async initialize(onWeatherUpdate: (weather: WeatherData | null) => void): Promise<boolean> {
    try {
      // Request necessary permissions
      await this.requestPermissions()

      // Get initial weather
      const weather = await this.weatherManager.getCurrentWeather(true)
      onWeatherUpdate(weather)

      // Set up real-time location tracking if available
      if ('geolocation' in navigator) {
        this.startLocationTracking(onWeatherUpdate)
      }

      // Set up auto-refresh
      this.startAutoRefresh(onWeatherUpdate)

      return true
    } catch (error) {
      console.error('Native weather initialization error:', error)
      return false
    }
  }

  /**
   * Request necessary permissions from device
   */
  private async requestPermissions(): Promise<void> {
    const capabilities = this.getDeviceCapabilities()

    // Request location permission
    if (capabilities.geolocation) {
      try {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            (error) => reject(error),
            { timeout: 5000 }
          )
        })
      } catch (error) {
        console.warn('Location permission denied:', error)
      }
    }

    // Request notification permission
    if (capabilities.notifications && this.notificationSettings.enabled) {
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          console.warn('Notification permission denied')
        }
      } catch (error) {
        console.warn('Notification permission error:', error)
      }
    }
  }

  /**
   * Start real-time location tracking
   */
  private startLocationTracking(onWeatherUpdate: (weather: WeatherData | null) => void): void {
    if (this.watchId !== null) return

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        // Update weather when location changes significantly
        const weather = await this.weatherManager.getCurrentWeather(true)
        onWeatherUpdate(weather)
      },
      (error) => {
        console.error('Location tracking error:', error)
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000, // 5 minutes
        timeout: 10000
      }
    )
  }

  /**
   * Stop location tracking
   */
  stopLocationTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
  }

  /**
   * Start auto-refresh timer
   */
  private startAutoRefresh(onWeatherUpdate: (weather: WeatherData | null) => void): void {
    if (this.autoRefreshInterval) return

    // Refresh every 10 minutes
    this.autoRefreshInterval = setInterval(async () => {
      const weather = await this.weatherManager.getCurrentWeather(true)
      onWeatherUpdate(weather)
    }, 10 * 60 * 1000)
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval)
      this.autoRefreshInterval = null
    }
  }

  /**
   * Send native notification
   */
  async sendWeatherNotification(
    title: string,
    body: string,
    options?: {
      icon?: string
      vibrate?: boolean
      tag?: string
    }
  ): Promise<void> {
    const capabilities = this.getDeviceCapabilities()

    if (!capabilities.notifications || !this.notificationSettings.enabled) {
      return
    }

    if (Notification.permission !== 'granted') {
      return
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: options?.icon || '/weather-icon.png',
        badge: '/weather-badge.png',
        tag: options?.tag || 'weather-update',
        requireInteraction: false,
        silent: false
      })

      // Vibrate if enabled and supported
      if (options?.vibrate && capabilities.vibration) {
        navigator.vibrate([200, 100, 200])
      }

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000)
    } catch (error) {
      console.error('Notification error:', error)
    }
  }

  /**
   * Check weather and send alerts
   */
  async checkWeatherAlerts(): Promise<void> {
    const weather = await this.weatherManager.getCurrentWeather()
    if (!weather) return

    // Check for severe weather alerts
    if (this.notificationSettings.alerts && weather.alerts) {
      for (const alert of weather.alerts) {
        if (alert.severity === 'severe' || alert.severity === 'extreme') {
          await this.sendWeatherNotification(
            `⚠️ ${alert.title}`,
            alert.description,
            {
              vibrate: true,
              tag: `alert-${alert.type}`
            }
          )
        }
      }
    }

    // Check for temperature extremes
    if (this.notificationSettings.temperature) {
      if (weather.current.temperature < 0) {
        await this.sendWeatherNotification(
          '❄️ Freezing Temperature Alert',
          `Current temperature is ${Math.round(weather.current.temperature)}°C. Dress warmly!`,
          { vibrate: true }
        )
      } else if (weather.current.temperature > 35) {
        await this.sendWeatherNotification(
          '🌡️ High Temperature Alert',
          `Current temperature is ${Math.round(weather.current.temperature)}°C. Stay hydrated!`,
          { vibrate: true }
        )
      }
    }

    // Check for rain
    const rainCheck = weather.forecast.hourly.slice(0, 3).some(h => h.condition.toLowerCase().includes('rain'))
    if (rainCheck && this.notificationSettings.alerts) {
      await this.sendWeatherNotification(
        '🌧️ Rain Expected',
        'Rain expected in the next 3 hours. Don\'t forget your umbrella!',
        { tag: 'rain-alert' }
      )
    }
  }

  /**
   * Update notification settings
   */
  updateNotificationSettings(settings: Partial<WeatherNotificationSettings>): void {
    this.notificationSettings = {
      ...this.notificationSettings,
      ...settings
    }
    this.saveNotificationSettings()
  }

  /**
   * Get current weather
   */
  async getCurrentWeather(forceRefresh = false): Promise<WeatherData | null> {
    return this.weatherManager.getCurrentWeather(forceRefresh)
  }

  /**
   * Get weather for specific location
   */
  async getWeatherForLocation(city: string, country?: string): Promise<WeatherData | null> {
    return this.weatherManager.getWeatherForLocation(city, country)
  }

  /**
   * Open native weather app (platform-specific)
   */
  openNativeWeatherApp(): void {
    // Try to open native weather app using URL schemes
    const userAgent = navigator.userAgent.toLowerCase()

    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      // iOS Weather app
      window.location.href = 'weather://'
    } else if (userAgent.includes('android')) {
      // Android weather apps
      const androidWeatherApps = [
        'com.google.android.apps.weather', // Google Weather
        'com.weather.Weather', // Weather.com
        'com.accuweather.android' // AccuWeather
      ]

      // Try to open with intent
      window.location.href = `intent://weather#Intent;scheme=weather;end`
    } else {
      // Fallback: Open weather website
      window.open('https://weather.com', '_blank')
    }
  }

  /**
   * Share weather data
   */
  async shareWeather(weather: WeatherData): Promise<void> {
    if (!('share' in navigator)) {
      console.warn('Web Share API not supported')
      return
    }

    try {
      await navigator.share({
        title: `Weather in ${weather.location.city}`,
        text: `Currently ${Math.round(weather.current.temperature)}°C and ${weather.current.description}. ${weather.current.icon}`,
        url: window.location.href
      })
    } catch (error) {
      console.error('Share error:', error)
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopLocationTracking()
    this.stopAutoRefresh()
  }

  // Private methods

  private loadNotificationSettings(): WeatherNotificationSettings {
    try {
      const saved = localStorage.getItem(this.storageKey)
      return saved ? JSON.parse(saved) : {
        enabled: true,
        alerts: true,
        dailyForecast: true,
        severeWeather: true,
        temperature: true
      }
    } catch (error) {
      logger.debug('Failed to load weather notification settings', error)
      return {
        enabled: true,
        alerts: true,
        dailyForecast: true,
        severeWeather: true,
        temperature: true
      }
    }
  }

  private saveNotificationSettings(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.notificationSettings))
  }
}

/**
 * Weather Widget Hook
 */
export function useNativeWeather() {
  const integration = new NativeWeatherIntegration()
  return integration
}
