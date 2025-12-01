/**
 * Proactive Traffic Monitoring System
 * Learns user's daily routine and provides real-time traffic alerts
 */

export interface UserLocation {
  name: string
  address: string
  coordinates?: { lat: number; lng: number }
}

export interface DailyRoutine {
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  departureTime: string // HH:MM format
  route: 'home-to-work' | 'work-to-home'
  typicalDuration: number // minutes
}

export interface TrafficPreferences {
  homeLocation: UserLocation
  workLocation: UserLocation
  enableProactiveAlerts: boolean
  alertLeadTime: number // minutes before departure
  monitoringEnabled: boolean
  learnRoutine: boolean
  notificationMethods: {
    push: boolean
    email: boolean
    inApp: boolean
  }
}

export interface ProactiveAlert {
  id: string
  timestamp: string
  priority: 'info' | 'warning' | 'urgent'
  type: 'traffic' | 'accident' | 'delay' | 'route-suggestion' | 'routine-reminder'
  title: string
  message: string
  actionable: boolean
  actions?: Array<{
    label: string
    type: 'view-route' | 'leave-now' | 'dismiss'
  }>
  routeInfo?: {
    from: string
    to: string
    currentTime: number
    normalTime: number
    delay: number
    trafficLevel: string
    bestAlternative?: {
      name: string
      time: number
      savings: number
    }
  }
}

/**
 * Learn user's daily routine from their location data
 */
export function learnDailyRoutine(locationHistory: Array<{
  timestamp: string
  location: 'home' | 'work' | 'other'
}>): DailyRoutine[] {
  const routines: DailyRoutine[] = []
  const weekDayPatterns: Record<number, Array<{ time: string; route: string }>> = {}

  // Analyze location transitions
  for (let i = 1; i < locationHistory.length; i++) {
    const prev = locationHistory[i - 1]
    const curr = locationHistory[i]

    if (prev.location === 'home' && curr.location === 'work') {
      const date = new Date(curr.timestamp)
      const dayOfWeek = date.getDay()
      const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`

      if (!weekDayPatterns[dayOfWeek]) weekDayPatterns[dayOfWeek] = []
      weekDayPatterns[dayOfWeek].push({ time, route: 'home-to-work' })
    } else if (prev.location === 'work' && curr.location === 'home') {
      const date = new Date(curr.timestamp)
      const dayOfWeek = date.getDay()
      const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`

      if (!weekDayPatterns[dayOfWeek]) weekDayPatterns[dayOfWeek] = []
      weekDayPatterns[dayOfWeek].push({ time, route: 'work-to-home' })
    }
  }

  // Find most common times for each day/route combination
  Object.entries(weekDayPatterns).forEach(([day, patterns]) => {
    const homeToWork = patterns.filter(p => p.route === 'home-to-work')
    const workToHome = patterns.filter(p => p.route === 'work-to-home')

    if (homeToWork.length > 0) {
      const avgTime = getMostCommonTime(homeToWork.map(p => p.time))
      routines.push({
        dayOfWeek: parseInt(day),
        departureTime: avgTime,
        route: 'home-to-work',
        typicalDuration: 25 // Will be calculated from actual data
      })
    }

    if (workToHome.length > 0) {
      const avgTime = getMostCommonTime(workToHome.map(p => p.time))
      routines.push({
        dayOfWeek: parseInt(day),
        departureTime: avgTime,
        route: 'work-to-home',
        typicalDuration: 25
      })
    }
  })

  return routines
}

function getMostCommonTime(times: string[]): string {
  const frequency: Record<string, number> = {}
  times.forEach(time => {
    frequency[time] = (frequency[time] || 0) + 1
  })

  let maxCount = 0
  let mostCommon = times[0]
  Object.entries(frequency).forEach(([time, count]) => {
    if (count > maxCount) {
      maxCount = count
      mostCommon = time
    }
  })

  return mostCommon
}

/**
 * Start proactive traffic monitoring
 */
export async function startProactiveMonitoring(
  preferences: TrafficPreferences,
  routines: DailyRoutine[],
  onAlert: (alert: ProactiveAlert) => void
): Promise<() => void> {

  if (!preferences.monitoringEnabled) {
    console.log('Proactive monitoring disabled')
    return () => {}
  }

  const checkInterval = 5 * 60 * 1000 // Check every 5 minutes
  let intervals: NodeJS.Timeout[] = []

  // Monitor routine-based departures
  routines.forEach(routine => {
    const now = new Date()
    const [hours, minutes] = routine.departureTime.split(':').map(Number)

    // Check if we should monitor this routine today
    if (now.getDay() === routine.dayOfWeek) {
      const departureTime = new Date(now)
      departureTime.setHours(hours, minutes, 0, 0)

      const alertTime = new Date(departureTime.getTime() - preferences.alertLeadTime * 60 * 1000)
      const timeUntilAlert = alertTime.getTime() - now.getTime()

      if (timeUntilAlert > 0 && timeUntilAlert < 24 * 60 * 60 * 1000) {
        // Schedule alert
        const timeout = setTimeout(async () => {
          await checkAndAlert(preferences, routine, onAlert)
        }, timeUntilAlert)

        intervals.push(timeout as unknown as NodeJS.Timeout)
      }
    }
  })

  // Continuous monitoring for real-time incidents
  const monitorInterval = setInterval(async () => {
    await monitorIncidents(preferences, onAlert)
  }, checkInterval)

  intervals.push(monitorInterval)

  // Cleanup function
  return () => {
    intervals.forEach(interval => clearInterval(interval))
  }
}

async function checkAndAlert(
  preferences: TrafficPreferences,
  routine: DailyRoutine,
  onAlert: (alert: ProactiveAlert) => void
) {
  try {
    const { homeLocation, workLocation } = preferences
    const from = routine.route === 'home-to-work' ? homeLocation.address : workLocation.address
    const to = routine.route === 'home-to-work' ? workLocation.address : homeLocation.address

    // Import traffic service
    const { getRouteTraffic } = await import('./traffic-service')
    const traffic = await getRouteTraffic(from, to)

    // Check if there's significant delay
    if (traffic.delay > 10) {
      const severity = traffic.delay > 30 ? 'urgent' : traffic.delay > 20 ? 'warning' : 'info'

      onAlert({
        id: `traffic-alert-${Date.now()}`,
        timestamp: new Date().toISOString(),
        priority: severity,
        type: 'delay',
        title: `⚠️ Heavy Traffic Ahead`,
        message: `Your usual route to ${routine.route === 'home-to-work' ? 'work' : 'home'} has a ${traffic.delay}-minute delay. Current travel time: ${traffic.currentTime} min (normal: ${traffic.normalTime} min).`,
        actionable: true,
        actions: [
          { label: 'View Route', type: 'view-route' },
          { label: 'Leave Now', type: 'leave-now' },
          { label: 'Dismiss', type: 'dismiss' }
        ],
        routeInfo: {
          from,
          to,
          currentTime: traffic.currentTravelTime,
          normalTime: traffic.normalTravelTime,
          delay: traffic.delay,
          trafficLevel: traffic.trafficLevel,
          bestAlternative: traffic.alternativeRoutes[0] ? {
            name: traffic.alternativeRoutes[0].name,
            time: traffic.alternativeRoutes[0].travelTime,
            savings: traffic.alternativeRoutes[0].savings
          } : undefined
        }
      })

      // Send best route suggestion if available
      if (traffic.alternativeRoutes.length > 0 && traffic.alternativeRoutes[0].savings > 10) {
        onAlert({
          id: `route-suggestion-${Date.now()}`,
          timestamp: new Date().toISOString(),
          priority: 'info',
          type: 'route-suggestion',
          title: `💡 Faster Route Available`,
          message: `Take ${traffic.alternativeRoutes[0].name} instead - saves ${traffic.alternativeRoutes[0].savings} minutes!`,
          actionable: true,
          actions: [
            { label: 'View Route', type: 'view-route' },
            { label: 'Dismiss', type: 'dismiss' }
          ]
        })
      }
    }

    // Check for accidents
    if (traffic.incidents.length > 0) {
      traffic.incidents.forEach(incident => {
        if (incident.severity === 'high' || incident.severity === 'critical') {
          onAlert({
            id: `accident-${incident.id}`,
            timestamp: new Date().toISOString(),
            priority: 'urgent',
            type: 'accident',
            title: `🚨 ${incident.type.toUpperCase()} on Your Route`,
            message: `${incident.description} on ${incident.affectedRoads[0]}. Expected delay: ${incident.delay} minutes.`,
            actionable: true,
            actions: [
              { label: 'View Alternative Route', type: 'view-route' },
              { label: 'Dismiss', type: 'dismiss' }
            ]
          })
        }
      })
    }

    // Routine reminder with traffic info
    const trafficEmoji = traffic.trafficLevel === 'light' ? '🟢' :
                        traffic.trafficLevel === 'moderate' ? '🟡' :
                        traffic.trafficLevel === 'heavy' ? '🟠' : '🔴'

    onAlert({
      id: `routine-${Date.now()}`,
      timestamp: new Date().toISOString(),
      priority: traffic.delay > 15 ? 'warning' : 'info',
      type: 'routine-reminder',
      title: `${trafficEmoji} Time to Leave for ${routine.route === 'home-to-work' ? 'Work' : 'Home'}`,
      message: `Current traffic: ${traffic.trafficLevel}. Travel time: ${traffic.currentTravelTime} min. ${traffic.delay > 0 ? `Leave ${Math.ceil(traffic.delay / 5) * 5} min early.` : 'Good time to leave!'}`,
      actionable: true,
      actions: [
        { label: 'View Traffic', type: 'view-route' },
        { label: 'Dismiss', type: 'dismiss' }
      ],
      routeInfo: {
        from,
        to,
        currentTime: traffic.currentTravelTime,
        normalTime: traffic.normalTravelTime,
        delay: traffic.delay,
        trafficLevel: traffic.trafficLevel
      }
    })

  } catch (error) {
    console.error('Error checking traffic for alert:', error)
  }
}

async function monitorIncidents(
  preferences: TrafficPreferences,
  onAlert: (alert: ProactiveAlert) => void
) {
  try {
    // Get user's home coordinates (you'd geocode the address)
    const lat = 37.7749 // Example: San Francisco
    const lng = -122.4194

    const { getTrafficIncidents } = await import('./traffic-service')
    const incidents = await getTrafficIncidents(lat, lng, 15)

    incidents.forEach(incident => {
      if (incident.severity === 'high' || incident.severity === 'critical') {
        // Only alert about new incidents (you'd track seen incidents)
        onAlert({
          id: `incident-${incident.id}`,
          timestamp: new Date().toISOString(),
          priority: incident.severity === 'critical' ? 'urgent' : 'warning',
          type: 'accident',
          title: `🚨 ${incident.type.toUpperCase()} Near You`,
          message: `${incident.description} at ${incident.location}. Delay: ${incident.delay} minutes.`,
          actionable: false,
          actions: [{ label: 'Dismiss', type: 'dismiss' }]
        })
      }
    })
  } catch (error) {
    console.error('Error monitoring incidents:', error)
  }
}

/**
 * Get traffic update for next planned trip
 */
export async function getNextTripTraffic(
  preferences: TrafficPreferences,
  routines: DailyRoutine[]
): Promise<ProactiveAlert | null> {
  const now = new Date()
  const currentDay = now.getDay()
  const currentTime = now.getHours() * 60 + now.getMinutes()

  // Find next routine
  const todayRoutines = routines
    .filter(r => r.dayOfWeek === currentDay)
    .map(r => {
      const [hours, minutes] = r.departureTime.split(':').map(Number)
      return { ...r, minutesFromMidnight: hours * 60 + minutes }
    })
    .filter(r => r.minutesFromMidnight > currentTime)
    .sort((a, b) => a.minutesFromMidnight - b.minutesFromMidnight)

  if (todayRoutines.length === 0) return null

  const nextRoutine = todayRoutines[0]
  const from = nextRoutine.route === 'home-to-work' ? preferences.homeLocation.address : preferences.workLocation.address
  const to = nextRoutine.route === 'home-to-work' ? preferences.workLocation.address : preferences.homeLocation.address

  try {
    const { getRouteTraffic } = await import('./traffic-service')
    const traffic = await getRouteTraffic(from, to)

    const trafficEmoji = traffic.trafficLevel === 'light' ? '🟢' :
                        traffic.trafficLevel === 'moderate' ? '🟡' :
                        traffic.trafficLevel === 'heavy' ? '🟠' : '🔴'

    return {
      id: `next-trip-${Date.now()}`,
      timestamp: new Date().toISOString(),
      priority: traffic.delay > 20 ? 'warning' : 'info',
      type: 'traffic',
      title: `${trafficEmoji} Next Trip: ${nextRoutine.route === 'home-to-work' ? 'To Work' : 'To Home'}`,
      message: `Leave at ${nextRoutine.departureTime}. Current traffic: ${traffic.trafficLevel}. Travel time: ${traffic.currentTravelTime} min (${traffic.delay > 0 ? `+${traffic.delay} min delay` : 'on time'}).`,
      actionable: true,
      actions: [
        { label: 'View Details', type: 'view-route' },
        { label: 'Dismiss', type: 'dismiss' }
      ],
      routeInfo: {
        from,
        to,
        currentTime: traffic.currentTravelTime,
        normalTime: traffic.normalTravelTime,
        delay: traffic.delay,
        trafficLevel: traffic.trafficLevel,
        bestAlternative: traffic.alternativeRoutes[0] ? {
          name: traffic.alternativeRoutes[0].name,
          time: traffic.alternativeRoutes[0].travelTime,
          savings: traffic.alternativeRoutes[0].savings
        } : undefined
      }
    }
  } catch (error) {
    console.error('Error getting next trip traffic:', error)
    return null
  }
}

/**
 * Detect user's current location (home/work/other) from GPS
 */
export function detectCurrentLocation(
  userCoords: { lat: number; lng: number },
  preferences: TrafficPreferences
): 'home' | 'work' | 'other' {
  if (!preferences.homeLocation.coordinates || !preferences.workLocation.coordinates) {
    return 'other'
  }

  const distanceToHome = calculateDistance(
    userCoords,
    preferences.homeLocation.coordinates
  )

  const distanceToWork = calculateDistance(
    userCoords,
    preferences.workLocation.coordinates
  )

  const threshold = 0.5 // km

  if (distanceToHome < threshold) return 'home'
  if (distanceToWork < threshold) return 'work'
  return 'other'
}

function calculateDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(coord2.lat - coord1.lat)
  const dLon = toRad(coord2.lng - coord1.lng)
  const lat1 = toRad(coord1.lat)
  const lat2 = toRad(coord2.lat)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}
