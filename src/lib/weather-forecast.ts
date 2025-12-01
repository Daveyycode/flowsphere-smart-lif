/**
 * Weather Forecasting System
 * Real-time responsive weather updates with forecasts
 */

export interface WeatherData {
  location: {
    city: string
    country: string
    coordinates: { lat: number; lon: number }
  }
  current: {
    temperature: number // Celsius
    feelsLike: number
    condition: string // Clear, Clouds, Rain, Snow, etc.
    description: string
    icon: string
    humidity: number // percentage
    windSpeed: number // km/h
    pressure: number // hPa
    visibility: number // km
    uvIndex: number
    cloudCoverage: number // percentage
  }
  forecast: {
    hourly: HourlyForecast[]
    daily: DailyForecast[]
  }
  alerts?: WeatherAlert[]
  timestamp: string
  sunrise: string
  sunset: string
}

export interface HourlyForecast {
  time: string
  temperature: number
  condition: string
  icon: string
  precipitation: number // probability 0-100
  windSpeed: number
}

export interface DailyForecast {
  date: string
  dayOfWeek: string
  tempHigh: number
  tempLow: number
  condition: string
  icon: string
  precipitation: number
  sunrise: string
  sunset: string
}

export interface WeatherAlert {
  type: 'warning' | 'watch' | 'advisory'
  severity: 'minor' | 'moderate' | 'severe' | 'extreme'
  title: string
  description: string
  startTime: string
  endTime: string
}

/**
 * Weather Forecast Manager
 */
export class WeatherForecastManager {
  private cacheKey = 'flowsphere-weather-cache'
  private locationKey = 'flowsphere-weather-location'
  private apiKey: string = '' // Set via environment or config
  private cacheTimeout: number = 10 * 60 * 1000 // 10 minutes

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey
    }
  }

  /**
   * Get current weather (with caching)
   */
  async getCurrentWeather(forceRefresh: boolean = false): Promise<WeatherData | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.getCachedWeather()
      if (cached) return cached
    }

    try {
      // Get user location
      const location = await this.getUserLocation()

      // Fetch weather data
      const weatherData = await this.fetchWeatherData(location.lat, location.lon)

      // Cache the data
      this.cacheWeather(weatherData)

      return weatherData
    } catch (error) {
      console.error('Weather fetch error:', error)

      // Return cached data if available, even if expired
      const cached = this.getCachedWeather(true)
      return cached
    }
  }

  /**
   * Get weather for specific location
   */
  async getWeatherForLocation(city: string, country?: string): Promise<WeatherData | null> {
    try {
      // Geocode the location first
      const coordinates = await this.geocodeLocation(city, country)

      if (!coordinates) {
        throw new Error('Location not found')
      }

      // Fetch weather
      const weatherData = await this.fetchWeatherData(coordinates.lat, coordinates.lon)

      return weatherData
    } catch (error) {
      console.error('Weather for location error:', error)
      return null
    }
  }

  /**
   * Get weather recommendation for activity
   */
  getActivityRecommendation(weatherData: WeatherData): {
    suitable: boolean
    recommendation: string
    tips: string[]
  } {
    const temp = weatherData.current.temperature
    const condition = weatherData.current.condition.toLowerCase()
    const windSpeed = weatherData.current.windSpeed

    let suitable = true
    let recommendation = ''
    const tips: string[] = []

    // Temperature checks
    if (temp < 0) {
      suitable = false
      recommendation = 'Too cold for outdoor activities'
      tips.push('Dress in warm layers', 'Limit outdoor time')
    } else if (temp < 10) {
      recommendation = 'Chilly weather - dress warmly'
      tips.push('Wear a jacket', 'Warm beverages recommended')
    } else if (temp > 30) {
      recommendation = 'Hot weather - stay hydrated'
      tips.push('Drink plenty of water', 'Avoid midday sun', 'Wear sunscreen')
    } else {
      recommendation = 'Perfect weather for outdoor activities!'
      tips.push('Great day to be outside')
    }

    // Condition checks
    if (condition.includes('rain') || condition.includes('drizzle')) {
      suitable = false
      recommendation = 'Rainy weather - indoor activities recommended'
      tips.push('Bring an umbrella if going out', 'Waterproof clothing advised')
    } else if (condition.includes('snow')) {
      recommendation = 'Snowy weather - drive carefully'
      tips.push('Wear warm, waterproof clothing', 'Watch for slippery surfaces')
    } else if (condition.includes('storm') || condition.includes('thunder')) {
      suitable = false
      recommendation = 'Severe weather - stay indoors'
      tips.push('Avoid outdoor activities', 'Stay away from windows')
    }

    // Wind checks
    if (windSpeed > 40) {
      suitable = false
      recommendation = 'Very windy - indoor activities recommended'
      tips.push('Secure loose objects', 'Be cautious when driving')
    }

    // UV Index
    if (weatherData.current.uvIndex >= 8) {
      tips.push('High UV - wear sunscreen and sunglasses')
    }

    return { suitable, recommendation, tips }
  }

  /**
   * Get commute weather impact
   */
  getCommuteImpact(weatherData: WeatherData): {
    impact: 'none' | 'minor' | 'moderate' | 'severe'
    message: string
    estimatedDelay: number // minutes
    suggestions: string[]
  } {
    const condition = weatherData.current.condition.toLowerCase()
    const windSpeed = weatherData.current.windSpeed
    const visibility = weatherData.current.visibility

    let impact: 'none' | 'minor' | 'moderate' | 'severe' = 'none'
    let message = 'Normal commute conditions'
    let estimatedDelay = 0
    const suggestions: string[] = []

    if (condition.includes('heavy rain') || condition.includes('storm')) {
      impact = 'severe'
      message = 'Heavy rain may cause significant delays'
      estimatedDelay = 20
      suggestions.push('Leave earlier', 'Drive carefully', 'Consider public transport')
    } else if (condition.includes('rain')) {
      impact = 'moderate'
      message = 'Rain may cause minor delays'
      estimatedDelay = 10
      suggestions.push('Allow extra time', 'Reduce speed')
    }

    if (condition.includes('snow') || condition.includes('ice')) {
      impact = 'severe'
      message = 'Snow/ice conditions - expect major delays'
      estimatedDelay = 30
      suggestions.push('Leave much earlier', 'Use winter tires', 'Consider working from home')
    }

    if (condition.includes('fog') || visibility < 1) {
      impact = impact === 'severe' ? 'severe' : 'moderate'
      message = 'Low visibility conditions'
      estimatedDelay += 15
      suggestions.push('Use fog lights', 'Drive slowly', 'Increase following distance')
    }

    if (windSpeed > 50) {
      impact = 'moderate'
      message = 'Strong winds may affect driving'
      suggestions.push('Be cautious of crosswinds', 'Watch for debris')
    }

    if (weatherData.alerts && weatherData.alerts.length > 0) {
      const severeAlert = weatherData.alerts.find(a => a.severity === 'severe' || a.severity === 'extreme')
      if (severeAlert) {
        impact = 'severe'
        message = severeAlert.title
        suggestions.push('Check local news', 'Consider delaying travel')
      }
    }

    return { impact, message, estimatedDelay, suggestions }
  }

  // Private methods

  /**
   * Get user's current location
   */
  private async getUserLocation(): Promise<{ lat: number; lon: number }> {
    // Try to get saved location first
    const savedLocation = this.getSavedLocation()
    if (savedLocation) {
      return savedLocation
    }

    // Use Geolocation API
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          }
          this.saveLocation(location)
          resolve(location)
        },
        (error) => {
          console.error('Geolocation error:', error)
          // Fallback to default location (San Francisco)
          resolve({ lat: 37.7749, lon: -122.4194 })
        },
        { timeout: 10000 }
      )
    })
  }

  /**
   * Fetch weather data from API
   */
  private async fetchWeatherData(lat: number, lon: number): Promise<WeatherData> {
    if (this.apiKey) {
      // In production, use OpenWeatherMap API
      // const response = await fetch(
      //   `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
      // )
      // const data = await response.json()
      // return this.transformWeatherData(data)
    }

    // Mock data for development
    return this.getMockWeatherData(lat, lon)
  }

  /**
   * Geocode location string to coordinates
   */
  private async geocodeLocation(city: string, country?: string): Promise<{ lat: number; lon: number } | null> {
    // In production, use geocoding API
    // For now, return mock coordinates
    const locations: Record<string, { lat: number; lon: number }> = {
      'san francisco': { lat: 37.7749, lon: -122.4194 },
      'new york': { lat: 40.7128, lon: -74.0060 },
      'london': { lat: 51.5074, lon: -0.1278 },
      'tokyo': { lat: 35.6762, lon: 139.6503 },
      'paris': { lat: 48.8566, lon: 2.3522 }
    }

    return locations[city.toLowerCase()] || null
  }

  /**
   * Get mock weather data
   */
  private getMockWeatherData(lat: number, lon: number): WeatherData {
    const now = new Date()
    const hour = now.getHours()

    // Simulate varying weather throughout the day
    const conditions = ['Clear', 'Clouds', 'Rain', 'Partly Cloudy']
    const condition = conditions[hour % conditions.length]

    const hourlyForecast: HourlyForecast[] = Array.from({ length: 24 }, (_, i) => {
      const forecastHour = (hour + i) % 24
      return {
        time: `${forecastHour.toString().padStart(2, '0')}:00`,
        temperature: 15 + Math.sin((forecastHour - 6) / 12 * Math.PI) * 8,
        condition: conditions[forecastHour % conditions.length],
        icon: this.getWeatherIcon(conditions[forecastHour % conditions.length]),
        precipitation: forecastHour > 12 && forecastHour < 18 ? 60 : 20,
        windSpeed: 10 + Math.random() * 15
      }
    })

    const dailyForecast: DailyForecast[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now)
      date.setDate(date.getDate() + i)

      return {
        date: date.toISOString().split('T')[0],
        dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
        tempHigh: 20 + Math.random() * 10,
        tempLow: 10 + Math.random() * 5,
        condition: conditions[i % conditions.length],
        icon: this.getWeatherIcon(conditions[i % conditions.length]),
        precipitation: i % 3 === 0 ? 70 : 30,
        sunrise: '06:30',
        sunset: '18:45'
      }
    })

    return {
      location: {
        city: 'San Francisco',
        country: 'US',
        coordinates: { lat, lon }
      },
      current: {
        temperature: 18,
        feelsLike: 17,
        condition,
        description: condition === 'Clear' ? 'Clear sky' : condition === 'Clouds' ? 'Scattered clouds' : 'Light rain',
        icon: this.getWeatherIcon(condition),
        humidity: 65,
        windSpeed: 15,
        pressure: 1013,
        visibility: 10,
        uvIndex: hour > 10 && hour < 16 ? 7 : 2,
        cloudCoverage: condition === 'Clouds' ? 75 : 25
      },
      forecast: {
        hourly: hourlyForecast,
        daily: dailyForecast
      },
      timestamp: now.toISOString(),
      sunrise: '06:30',
      sunset: '18:45'
    }
  }

  /**
   * Get weather icon
   */
  private getWeatherIcon(condition: string): string {
    const icons: Record<string, string> = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Partly Cloudy': '⛅',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '❄️',
      'Mist': '🌫️',
      'Fog': '🌫️'
    }

    return icons[condition] || '🌤️'
  }

  /**
   * Cache weather data
   */
  private cacheWeather(data: WeatherData): void {
    const cache = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(this.cacheKey, JSON.stringify(cache))
  }

  /**
   * Get cached weather
   */
  private getCachedWeather(ignoreExpiry: boolean = false): WeatherData | null {
    try {
      const cached = localStorage.getItem(this.cacheKey)
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)

      // Check if cache is still valid
      if (!ignoreExpiry && Date.now() - timestamp > this.cacheTimeout) {
        return null
      }

      return data
    } catch {
      return null
    }
  }

  /**
   * Save location
   */
  private saveLocation(location: { lat: number; lon: number }): void {
    localStorage.setItem(this.locationKey, JSON.stringify(location))
  }

  /**
   * Get saved location
   */
  private getSavedLocation(): { lat: number; lon: number } | null {
    try {
      const saved = localStorage.getItem(this.locationKey)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }
}

/**
 * Auto-refresh weather service
 */
export class WeatherAutoRefresh {
  private manager: WeatherForecastManager
  private intervalId: NodeJS.Timeout | null = null
  private refreshInterval: number = 10 * 60 * 1000 // 10 minutes

  constructor(manager: WeatherForecastManager, intervalMinutes: number = 10) {
    this.manager = manager
    this.refreshInterval = intervalMinutes * 60 * 1000
  }

  start(onUpdate: (weather: WeatherData | null) => void): void {
    if (this.intervalId) return

    // Initial fetch
    this.manager.getCurrentWeather(true).then(onUpdate)

    // Set up interval
    this.intervalId = setInterval(() => {
      this.manager.getCurrentWeather(true).then(onUpdate)
    }, this.refreshInterval)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}
