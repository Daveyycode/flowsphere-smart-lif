/**
 * Weather API Integration
 * Get free API key from: https://openweathermap.org/api
 */

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY

export interface WeatherData {
  temp: number
  feelsLike: number
  condition: string
  icon: string
  humidity: number
  windSpeed: number
  description: string
}

export interface ForecastData {
  date: string
  tempHigh: number
  tempLow: number
  condition: string
  icon: string
}

export async function getCurrentWeather(city: string = 'San Francisco'): Promise<WeatherData> {
  if (!API_KEY) {
    // Return mock data if no API key
    return {
      temp: 72,
      feelsLike: 70,
      condition: 'Partly Cloudy',
      icon: '02d',
      humidity: 65,
      windSpeed: 8,
      description: 'Add VITE_WEATHER_API_KEY to .env for real weather data',
    }
  }

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=imperial`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch weather data')
  }

  const data = await response.json()

  return {
    temp: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    condition: data.weather[0].main,
    icon: data.weather[0].icon,
    humidity: data.main.humidity,
    windSpeed: Math.round(data.wind.speed),
    description: data.weather[0].description,
  }
}

export async function get5DayForecast(city: string = 'San Francisco'): Promise<ForecastData[]> {
  if (!API_KEY) {
    // Return mock data
    return [
      { date: 'Today', tempHigh: 75, tempLow: 62, condition: 'Sunny', icon: '01d' },
      { date: 'Tomorrow', tempHigh: 73, tempLow: 60, condition: 'Cloudy', icon: '02d' },
      { date: 'Wednesday', tempHigh: 70, tempLow: 58, condition: 'Rainy', icon: '10d' },
      { date: 'Thursday', tempHigh: 72, tempLow: 59, condition: 'Partly Cloudy', icon: '02d' },
      { date: 'Friday', tempHigh: 74, tempLow: 61, condition: 'Sunny', icon: '01d' },
    ]
  }

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=imperial`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch forecast data')
  }

  const data = await response.json()

  // Group by day and get daily highs/lows
  const daily: Record<string, any> = {}

  data.list.forEach((item: any) => {
    const date = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })

    if (!daily[date]) {
      daily[date] = {
        date,
        tempHigh: item.main.temp_max,
        tempLow: item.main.temp_min,
        condition: item.weather[0].main,
        icon: item.weather[0].icon,
      }
    } else {
      daily[date].tempHigh = Math.max(daily[date].tempHigh, item.main.temp_max)
      daily[date].tempLow = Math.min(daily[date].tempLow, item.main.temp_min)
    }
  })

  return Object.values(daily)
    .slice(0, 5)
    .map((day: any) => ({
      ...day,
      tempHigh: Math.round(day.tempHigh),
      tempLow: Math.round(day.tempLow),
    }))
}

export function getWeatherIcon(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`
}
