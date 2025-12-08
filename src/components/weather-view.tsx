import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Cloud, CloudRain, CloudSnow, Sun, Wind, Drop, ThermometerSimple, MapPin, ArrowClockwise } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getCurrentWeather, get5DayForecast, WeatherData, ForecastData } from '@/lib/api/weather'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DeviceInfo } from '@/hooks/use-mobile'
import { getResponsiveSize } from '@/lib/responsive-utils'
import { WeatherStore } from '@/lib/shared-data-store'

interface WeatherViewProps {
  deviceInfo: DeviceInfo
}

export function WeatherView({ deviceInfo }: WeatherViewProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [forecast, setForecast] = useState<ForecastData[]>([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useKV<string>('flowsphere-weather-city', 'San Francisco')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const loadWeatherData = async (forceRefresh = false) => {
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cachedWeather = WeatherStore.get()
      if (cachedWeather && cachedWeather.city === city) {
        setWeather({
          temp: cachedWeather.temperature,
          feelsLike: cachedWeather.feelsLike,
          humidity: cachedWeather.humidity,
          windSpeed: cachedWeather.windSpeed,
          condition: cachedWeather.condition,
          description: cachedWeather.description,
          icon: cachedWeather.condition.toLowerCase().includes('clear') ? '01d' : '03d'
        })
        setLastUpdated(new Date(cachedWeather.lastUpdated))
        setLoading(false)
        return
      }
    }

    setLoading(true)
    try {
      const [currentWeather, forecastData] = await Promise.all([
        getCurrentWeather(city),
        get5DayForecast(city)
      ])
      setWeather(currentWeather)
      setForecast(forecastData)
      setLastUpdated(new Date())

      // Sync to shared store for other components (morning brief, dashboard)
      WeatherStore.set({
        condition: currentWeather.condition,
        temperature: currentWeather.temp,
        feelsLike: currentWeather.feelsLike,
        humidity: currentWeather.humidity,
        windSpeed: currentWeather.windSpeed,
        high: forecastData[0]?.tempHigh || currentWeather.temp + 5,
        low: forecastData[0]?.tempLow || currentWeather.temp - 5,
        description: currentWeather.description,
        city: city
      })

      toast.success('Weather updated')
    } catch (error) {
      console.error('Failed to load weather:', error)
      toast.error('Failed to load weather data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWeatherData()
  }, [city])

  const getWeatherIconComponent = (condition: string) => {
    const lower = condition.toLowerCase()
    if (lower.includes('rain') || lower.includes('drizzle')) return CloudRain
    if (lower.includes('snow')) return CloudSnow
    if (lower.includes('cloud')) return Cloud
    if (lower.includes('clear') || lower.includes('sun')) return Sun
    return Cloud
  }

  const getWeatherColor = (condition: string) => {
    const lower = condition.toLowerCase()
    if (lower.includes('rain') || lower.includes('storm')) return 'blue-deep'
    if (lower.includes('snow')) return 'blue-mid'
    if (lower.includes('cloud')) return 'accent'
    if (lower.includes('clear') || lower.includes('sun')) return 'coral'
    return 'mint'
  }

  const iconSize = { mobile: 32, tablet: 40, desktop: 48 }[deviceInfo.type] || 40

  if (loading && !weather) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Cloud className="w-16 h-16 mx-auto mb-4 text-blue-mid animate-pulse" />
          <p className="text-muted-foreground">Loading weather data...</p>
        </motion.div>
      </div>
    )
  }

  const WeatherIcon = weather ? getWeatherIconComponent(weather.condition) : Cloud
  const weatherColor = weather ? getWeatherColor(weather.condition) : 'mint'

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold mb-1">Weather</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{city}</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => loadWeatherData(true)}
          disabled={loading}
          className={cn(loading && "animate-spin")}
        >
          <ArrowClockwise className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Current Weather */}
      {weather && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br from-${weatherColor}/5 to-${weatherColor}/10`} />
            <CardContent className="relative pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-20 h-20 rounded-2xl bg-${weatherColor}/20 flex items-center justify-center`}>
                      <WeatherIcon className={`w-12 h-12 text-${weatherColor}`} />
                    </div>
                    <div>
                      <div className="text-6xl font-bold">{weather.temp}°</div>
                      <div className="text-lg text-muted-foreground capitalize">{weather.condition}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <ThermometerSimple className="w-5 h-5 text-coral" />
                      <div>
                        <div className="text-xs text-muted-foreground">Feels Like</div>
                        <div className="font-semibold">{weather.feelsLike}°</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Drop className="w-5 h-5 text-blue-mid" />
                      <div>
                        <div className="text-xs text-muted-foreground">Humidity</div>
                        <div className="font-semibold">{weather.humidity}%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wind className="w-5 h-5 text-mint" />
                      <div>
                        <div className="text-xs text-muted-foreground">Wind</div>
                        <div className="font-semibold">{weather.windSpeed} mph</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {weather.description && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground capitalize">{weather.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 5-Day Forecast */}
      {forecast.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5-Day Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {forecast.map((day, index) => {
                  const DayIcon = getWeatherIconComponent(day.condition)
                  const dayColor = getWeatherColor(day.condition)

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex flex-col items-center text-center p-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="text-sm font-medium mb-2">{day.date}</div>
                      <div className={`w-12 h-12 rounded-xl bg-${dayColor}/20 flex items-center justify-center mb-2`}>
                        <DayIcon className={`w-6 h-6 text-${dayColor}`} />
                      </div>
                      <div className="text-xs text-muted-foreground mb-1 capitalize">{day.condition}</div>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="font-semibold">{day.tempHigh}°</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{day.tempLow}°</span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Last Updated */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-xs text-muted-foreground"
      >
        Last updated: {lastUpdated.toLocaleTimeString()}
      </motion.div>

      {/* API Key Notice */}
      {weather?.description.includes('Add VITE_WEATHER_API_KEY') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-coral/50 bg-coral/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-coral/20 flex items-center justify-center flex-shrink-0">
                  <Cloud className="w-5 h-5 text-coral" />
                </div>
                <div>
                  <div className="font-semibold mb-1">Using Mock Weather Data</div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add <code className="px-1 py-0.5 rounded bg-accent/50 text-xs">VITE_WEATHER_API_KEY</code> to your .env file for real-time weather data.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Get a free API key from: <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="text-coral hover:underline">OpenWeatherMap</a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
