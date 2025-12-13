/**
 * GPS Monitoring and Smart Alerts
 * Only triggers alerts when family members are outside their safe zones
 */

import type { FamilyMember, SafeZone } from '@/components/family-view'
import { logger } from '@/lib/security-utils'

export interface GPSAlert {
  id: string
  memberId: string
  memberName: string
  timestamp: string
  location: { lat: number; lng: number }
  address?: string
  distance: number // distance from nearest safe zone in meters
  nearestSafeZone?: SafeZone
  status: 'active' | 'resolved'
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

/**
 * Check if a GPS coordinate is within a safe zone
 */
export function isWithinSafeZone(
  location: { lat: number; lng: number },
  safeZone: SafeZone
): boolean {
  const distance = calculateDistance(
    location.lat,
    location.lng,
    safeZone.coordinates.lat,
    safeZone.coordinates.lng
  )

  return distance <= safeZone.radius
}

/**
 * Check if a family member is within ANY of their safe zones
 */
export function isInAnySafeZone(
  member: FamilyMember,
  globalSafeZones: SafeZone[]
): {
  isInSafeZone: boolean
  nearestZone?: SafeZone
  distanceToNearestZone: number
} {
  if (!member.gpsCoordinates) {
    return { isInSafeZone: false, distanceToNearestZone: Infinity }
  }

  // Combine member's personal safe zones with global safe zones
  const allSafeZones = [...(globalSafeZones || []), ...(member.safeZones || [])]

  if (allSafeZones.length === 0) {
    return { isInSafeZone: false, distanceToNearestZone: Infinity }
  }

  let nearestZone: SafeZone | undefined
  let minDistance = Infinity

  // Check each safe zone
  for (const zone of allSafeZones) {
    const distance = calculateDistance(
      member.gpsCoordinates.lat,
      member.gpsCoordinates.lng,
      zone.coordinates.lat,
      zone.coordinates.lng
    )

    // Update nearest zone
    if (distance < minDistance) {
      minDistance = distance
      nearestZone = zone
    }

    // If within this zone's radius, they're safe
    if (distance <= zone.radius) {
      return {
        isInSafeZone: true,
        nearestZone: zone,
        distanceToNearestZone: distance,
      }
    }
  }

  // Not in any safe zone
  return {
    isInSafeZone: false,
    nearestZone,
    distanceToNearestZone: minDistance,
  }
}

/**
 * Get all family members who are outside their safe zones
 */
export function getMembersOutsideSafeZones(
  members: FamilyMember[],
  globalSafeZones: SafeZone[]
): Array<{
  member: FamilyMember
  distanceFromNearestZone: number
  nearestZone?: SafeZone
}> {
  const outsideMembers: Array<{
    member: FamilyMember
    distanceFromNearestZone: number
    nearestZone?: SafeZone
  }> = []

  for (const member of members) {
    if (!member.gpsCoordinates) continue

    const { isInSafeZone, nearestZone, distanceToNearestZone } = isInAnySafeZone(
      member,
      globalSafeZones
    )

    if (!isInSafeZone) {
      outsideMembers.push({
        member,
        distanceFromNearestZone: distanceToNearestZone,
        nearestZone,
      })
    }
  }

  return outsideMembers
}

/**
 * Generate alert message for a member outside safe zone
 */
export function generateAlertMessage(
  memberName: string,
  distanceFromZone: number,
  nearestZone?: SafeZone
): string {
  const distanceKm = (distanceFromZone / 1000).toFixed(2)

  if (nearestZone) {
    return `${memberName} is ${distanceKm}km away from ${nearestZone.name}`
  }

  return `${memberName} is outside all safe zones (${distanceKm}km from nearest zone)`
}

/**
 * GPS Monitoring Service
 */
export class GPSMonitoringService {
  private alertsKey = 'flowsphere-gps-alerts'
  private lastCheckKey = 'flowsphere-last-gps-check'
  private alertHistoryKey = 'flowsphere-gps-alert-history'

  /**
   * Check all family members and create alerts for those outside safe zones
   */
  checkMembersAndAlert(
    members: FamilyMember[],
    globalSafeZones: SafeZone[],
    onAlert?: (alerts: GPSAlert[]) => void
  ): GPSAlert[] {
    const outsideMembers = getMembersOutsideSafeZones(members, globalSafeZones)
    const alerts: GPSAlert[] = []

    // Get existing active alerts
    const existingAlerts = this.getActiveAlerts()

    for (const { member, distanceFromNearestZone, nearestZone } of outsideMembers) {
      // Check if we already have an active alert for this member
      const existingAlert = existingAlerts.find(a => a.memberId === member.id)

      if (!existingAlert && member.gpsCoordinates) {
        // Create new alert
        const alert: GPSAlert = {
          id: `alert-${member.id}-${Date.now()}`,
          memberId: member.id,
          memberName: member.name,
          timestamp: new Date().toISOString(),
          location: member.gpsCoordinates,
          distance: distanceFromNearestZone,
          nearestSafeZone: nearestZone,
          status: 'active',
        }

        alerts.push(alert)
        this.saveAlert(alert)

        // Trigger email notification if enabled
        if (member.emailNotificationsEnabled && onAlert) {
          onAlert([alert])
        }
      }
    }

    // Update last check timestamp
    this.updateLastCheck()

    return alerts
  }

  /**
   * Resolve alert when member returns to safe zone
   */
  resolveAlert(memberId: string): void {
    const alerts = this.getActiveAlerts()
    const alert = alerts.find(a => a.memberId === memberId && a.status === 'active')

    if (alert) {
      alert.status = 'resolved'
      this.saveAlertHistory(alert)
      this.removeActiveAlert(alert.id)
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): GPSAlert[] {
    try {
      const stored = localStorage.getItem(this.alertsKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      logger.debug('Failed to load GPS alerts from storage', error)
      return []
    }
  }

  /**
   * Save alert
   */
  private saveAlert(alert: GPSAlert): void {
    const alerts = this.getActiveAlerts()
    alerts.push(alert)
    localStorage.setItem(this.alertsKey, JSON.stringify(alerts))
  }

  /**
   * Remove active alert
   */
  private removeActiveAlert(alertId: string): void {
    const alerts = this.getActiveAlerts()
    const filtered = alerts.filter(a => a.id !== alertId)
    localStorage.setItem(this.alertsKey, JSON.stringify(filtered))
  }

  /**
   * Save to alert history
   */
  private saveAlertHistory(alert: GPSAlert): void {
    try {
      const history = localStorage.getItem(this.alertHistoryKey)
      const alerts: GPSAlert[] = history ? JSON.parse(history) : []
      alerts.unshift(alert) // Add to beginning

      // Keep only last 100 alerts
      const trimmed = alerts.slice(0, 100)
      localStorage.setItem(this.alertHistoryKey, JSON.stringify(trimmed))
    } catch (error) {
      console.error('Failed to save alert history:', error)
    }
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 50): GPSAlert[] {
    try {
      const stored = localStorage.getItem(this.alertHistoryKey)
      const alerts: GPSAlert[] = stored ? JSON.parse(stored) : []
      return alerts.slice(0, limit)
    } catch (error) {
      logger.debug('Failed to load GPS alert history from storage', error)
      return []
    }
  }

  /**
   * Update last check timestamp
   */
  private updateLastCheck(): void {
    localStorage.setItem(this.lastCheckKey, new Date().toISOString())
  }

  /**
   * Get last check timestamp
   */
  getLastCheck(): string | null {
    return localStorage.getItem(this.lastCheckKey)
  }

  /**
   * Clear all alerts
   */
  clearAllAlerts(): void {
    localStorage.removeItem(this.alertsKey)
  }
}

/**
 * Initialize GPS monitoring service
 */
export function initializeGPSMonitoring(): GPSMonitoringService {
  return new GPSMonitoringService()
}
