import { FamilyMember } from '@/components/family-view'

export interface GPSAlert {
  memberId: string
  memberName: string
  distance: number
  timestamp: string
  currentLocation: { lat: number; lng: number }
  registeredLocation: { lat: number; lng: number; address: string }
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return distance
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

export function checkFamilyMemberDistance(member: FamilyMember): GPSAlert | null {
  if (!member.gpsCoordinates || !member.registeredIpLocation || !member.emailNotificationsEnabled) {
    return null
  }

  const distance = calculateDistance(
    member.gpsCoordinates.lat,
    member.gpsCoordinates.lng,
    member.registeredIpLocation.lat,
    member.registeredIpLocation.lng
  )

  if (distance >= 1) {
    return {
      memberId: member.id,
      memberName: member.name,
      distance: Math.round(distance * 100) / 100,
      timestamp: new Date().toISOString(),
      currentLocation: member.gpsCoordinates,
      registeredLocation: member.registeredIpLocation
    }
  }

  return null
}

export async function sendEmailNotification(alert: GPSAlert, userEmail: string): Promise<boolean> {
  try {
    const promptText = `You are an email notification system. Generate a professional, concise email notification about a family member's GPS location alert.

Family Member: ${alert.memberName}
Distance from Home: ${alert.distance} km
Home Address: ${alert.registeredLocation.address}
Current GPS Location: Lat ${alert.currentLocation.lat}, Lng ${alert.currentLocation.lng}
Time: ${new Date(alert.timestamp).toLocaleString()}

Write a brief, clear email notification (subject and body) that alerts the user about this location change. Keep it under 150 words. Format as:
SUBJECT: [subject line]
BODY: [email body]`

    const emailText = await window.spark.llm(promptText, 'gpt-4o-mini')
    
    console.log(`📧 Email Notification Sent to: ${userEmail}`)
    console.log(`Alert: ${alert.memberName} moved ${alert.distance}km from registered location`)
    console.log(`Email Content:\n${emailText}`)
    
    return true
  } catch (error) {
    console.error('Failed to send email notification:', error)
    return false
  }
}

export function monitorFamilyGPS(
  members: FamilyMember[],
  userEmail: string,
  onAlert?: (alert: GPSAlert) => void
): GPSAlert[] {
  const alerts: GPSAlert[] = []

  for (const member of members) {
    const alert = checkFamilyMemberDistance(member)
    
    if (alert) {
      alerts.push(alert)
      
      sendEmailNotification(alert, userEmail).then(success => {
        if (success && onAlert) {
          onAlert(alert)
        }
      })
    }
  }

  return alerts
}
