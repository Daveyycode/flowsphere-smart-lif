/**
 * OSRM Routing API - Free turn-by-turn directions
 * Uses the public OSRM demo server (free, no API key needed)
 */

export interface RouteCoordinate {
  lat: number
  lng: number
}

export interface RouteResult {
  distance: number // meters
  duration: number // seconds
  distanceText: string
  durationText: string
  polyline: RouteCoordinate[]
  steps?: RouteStep[]
}

export interface RouteStep {
  instruction: string
  distance: number
  duration: number
  name: string
}

/**
 * Get route between two points using OSRM
 * @param from Starting coordinates
 * @param to Destination coordinates
 * @returns Route with polyline and metadata
 */
export async function getRoute(
  from: RouteCoordinate,
  to: RouteCoordinate
): Promise<RouteResult | null> {
  try {
    // OSRM expects coordinates as lng,lat (reversed from lat,lng)
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`

    const response = await fetch(url)

    if (!response.ok) {
      console.error('[Routing] OSRM request failed:', response.status)
      return null
    }

    const data = await response.json()

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('[Routing] No route found:', data.code)
      return null
    }

    const route = data.routes[0]
    const geometry = route.geometry

    // Convert GeoJSON coordinates to our format (OSRM returns [lng, lat])
    const polyline: RouteCoordinate[] = geometry.coordinates.map((coord: [number, number]) => ({
      lat: coord[1],
      lng: coord[0],
    }))

    // Format distance and duration
    const distanceKm = route.distance / 1000
    const distanceText =
      distanceKm >= 1 ? `${distanceKm.toFixed(1)} km` : `${Math.round(route.distance)} m`

    const durationMinutes = Math.round(route.duration / 60)
    const durationText =
      durationMinutes >= 60
        ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}min`
        : `${durationMinutes} min`

    // Parse steps if available
    const steps: RouteStep[] = []
    if (route.legs && route.legs[0] && route.legs[0].steps) {
      for (const step of route.legs[0].steps) {
        steps.push({
          instruction: step.maneuver?.instruction || step.name || 'Continue',
          distance: step.distance,
          duration: step.duration,
          name: step.name || '',
        })
      }
    }

    return {
      distance: route.distance,
      duration: route.duration,
      distanceText,
      durationText,
      polyline,
      steps,
    }
  } catch (error) {
    console.error('[Routing] Error fetching route:', error)
    return null
  }
}

/**
 * Get multiple alternative routes
 */
export async function getAlternativeRoutes(
  from: RouteCoordinate,
  to: RouteCoordinate
): Promise<RouteResult[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&alternatives=true`

    const response = await fetch(url)

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    if (data.code !== 'Ok' || !data.routes) {
      return []
    }

    return data.routes.map((route: any) => {
      const polyline: RouteCoordinate[] = route.geometry.coordinates.map(
        (coord: [number, number]) => ({
          lat: coord[1],
          lng: coord[0],
        })
      )

      const distanceKm = route.distance / 1000
      const distanceText =
        distanceKm >= 1 ? `${distanceKm.toFixed(1)} km` : `${Math.round(route.distance)} m`

      const durationMinutes = Math.round(route.duration / 60)
      const durationText =
        durationMinutes >= 60
          ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}min`
          : `${durationMinutes} min`

      return {
        distance: route.distance,
        duration: route.duration,
        distanceText,
        durationText,
        polyline,
      }
    })
  } catch (error) {
    console.error('[Routing] Error fetching alternatives:', error)
    return []
  }
}
