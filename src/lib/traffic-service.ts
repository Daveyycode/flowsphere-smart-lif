/**
 * Traffic Service - Stub module for traffic monitoring
 */

export interface TrafficData {
  condition: 'light' | 'moderate' | 'heavy' | 'severe'
  incidents: TrafficIncident[]
  estimatedDelay: number
  timestamp: string
  // Additional properties used by traffic-monitor.ts
  delay: number
  currentTime: number
  normalTime: number
  currentTravelTime: number
  normalTravelTime: number
  trafficLevel: 'low' | 'medium' | 'high' | 'critical'
  alternativeRoutes: AlternativeRoute[]
}

export interface AlternativeRoute {
  name: string
  time: number
  savings: number
  distance?: number
  via?: string
}

export interface TrafficIncident {
  id: string
  type: 'accident' | 'construction' | 'closure' | 'event'
  location: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  // Additional properties
  affectedRoads?: string[]
  delay?: number
  estimatedClearTime?: string
}

export async function getTrafficData(_origin: string, _destination: string): Promise<TrafficData> {
  // Stub implementation - would integrate with real traffic API
  return {
    condition: 'light',
    incidents: [],
    estimatedDelay: 0,
    timestamp: new Date().toISOString(),
    delay: 0,
    currentTime: 25,
    normalTime: 25,
    currentTravelTime: 25,
    normalTravelTime: 25,
    trafficLevel: 'low',
    alternativeRoutes: []
  }
}

export async function getRouteTraffic(_routeId: string, _to?: string): Promise<TrafficData> {
  return getTrafficData('', '')
}

export async function getTrafficIncidents(_lat: number, _lng: number, _radiusMiles: number): Promise<TrafficIncident[]> {
  // Stub implementation - would integrate with real traffic API
  return []
}

export function formatTrafficCondition(condition: TrafficData['condition']): string {
  const labels = {
    light: 'Light traffic',
    moderate: 'Moderate traffic',
    heavy: 'Heavy traffic',
    severe: 'Severe congestion'
  }
  return labels[condition]
}
