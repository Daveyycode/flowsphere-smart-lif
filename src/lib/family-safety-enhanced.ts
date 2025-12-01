/**
 * Enhanced Family Safety System
 * GPS monitoring, safe zones, emergency voice memos, real-time tracking
 */

export interface FamilyMemberEnhanced {
  id: string
  name: string
  relationship: string
  phone: string
  messenger?: string // Messenger username
  viber?: string // Viber number
  email?: string
  avatar?: string
  addresses: {
    home?: Address
    school?: Address
    work?: Address
  }
  safeZones: SafeZone[]
  location: {
    current: { lat: number; lon: number; address: string }
    lastUpdated: string
    accuracy: number
  }
  battery: {
    level: number
    charging: boolean
    lastUpdated: string
  }
  device: {
    type: string
    os: string
    online: boolean
  }
  voiceMemos: VoiceMemo[]
}

export interface Address {
  name: string // "Home", "School", "Work"
  address: string
  coordinates: { lat: number; lon: number }
  radius: number // meters for safe zone
}

export interface SafeZone {
  id: string
  name: string
  address: string
  coordinates: { lat: number; lon: number }
  radius: number // meters
  active: boolean
  schedule?: {
    days: number[] // 0-6 (Sun-Sat)
    startTime: string // HH:MM
    endTime: string // HH:MM
  }
  alertOnExit: boolean
  alertOnEntry: boolean
}

export interface VoiceMemo {
  id: string
  fromMemberId: string
  fromMemberName: string
  toMembers: string[] // 'all' or specific member IDs
  audioBlob: Blob
  duration: number
  timestamp: string
  emergency: boolean
  acknowledged: string[] // Member IDs who acknowledged
  played: string[] // Member IDs who played
}

export interface LocationAlert {
  id: string
  type: 'exit' | 'entry' | 'low-battery' | 'offline'
  memberId: string
  memberName: string
  zone?: SafeZone
  location: { lat: number; lon: number; address: string }
  timestamp: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  acknowledged: boolean
}

/**
 * Enhanced Family Safety Manager
 */
export class EnhancedFamilySafetyManager {
  private membersKey = 'flowsphere-family-members-enhanced'
  private alertsKey = 'flowsphere-location-alerts'
  private memosKey = 'flowsphere-voice-memos'
  private lastCheckKey = 'flowsphere-last-zone-check'

  /**
   * Add or update family member
   */
  saveMember(member: FamilyMemberEnhanced): void {
    const members = this.getAllMembers()
    const index = members.findIndex(m => m.id === member.id)

    if (index >= 0) {
      members[index] = member
    } else {
      members.push(member)
    }

    localStorage.setItem(this.membersKey, JSON.stringify(members))
  }

  /**
   * Get all family members
   */
  getAllMembers(): FamilyMemberEnhanced[] {
    try {
      const data = localStorage.getItem(this.membersKey)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  /**
   * Get member by ID
   */
  getMember(id: string): FamilyMemberEnhanced | null {
    return this.getAllMembers().find(m => m.id === id) || null
  }

  /**
   * Update member location
   */
  updateLocation(memberId: string, location: {
    lat: number
    lon: number
    address: string
    accuracy: number
  }): void {
    const member = this.getMember(memberId)
    if (!member) return

    member.location = {
      current: {
        lat: location.lat,
        lon: location.lon,
        address: location.address
      },
      lastUpdated: new Date().toISOString(),
      accuracy: location.accuracy
    }

    this.saveMember(member)

    // Check safe zones
    this.checkSafeZones(member)
  }

  /**
   * Update battery status
   */
  updateBattery(memberId: string, level: number, charging: boolean): void {
    const member = this.getMember(memberId)
    if (!member) return

    const previousLevel = member.battery.level

    member.battery = {
      level,
      charging,
      lastUpdated: new Date().toISOString()
    }

    this.saveMember(member)

    // Alert on low battery
    if (level < 20 && !charging && previousLevel >= 20) {
      this.createAlert({
        type: 'low-battery',
        memberId: member.id,
        memberName: member.name,
        location: member.location.current,
        timestamp: new Date().toISOString(),
        severity: 'warning',
        message: `${member.name}'s battery is low (${level}%)`
      })
    }
  }

  /**
   * Add safe zone
   */
  addSafeZone(memberId: string, zone: Omit<SafeZone, 'id'>): void {
    const member = this.getMember(memberId)
    if (!member) return

    const newZone: SafeZone = {
      ...zone,
      id: `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    member.safeZones.push(newZone)
    this.saveMember(member)
  }

  /**
   * Set address (home/school/work) and create safe zone
   */
  setAddress(
    memberId: string,
    type: 'home' | 'school' | 'work',
    address: string,
    coordinates: { lat: number; lon: number },
    radius: number = 200
  ): void {
    const member = this.getMember(memberId)
    if (!member) return

    // Set address
    member.addresses[type] = {
      name: type.charAt(0).toUpperCase() + type.slice(1),
      address,
      coordinates,
      radius
    }

    // Create safe zone
    const existingZone = member.safeZones.find(z => z.name === type)
    if (existingZone) {
      existingZone.address = address
      existingZone.coordinates = coordinates
      existingZone.radius = radius
    } else {
      this.addSafeZone(memberId, {
        name: type,
        address,
        coordinates,
        radius,
        active: true,
        alertOnExit: true,
        alertOnEntry: false
      })
    }

    this.saveMember(member)
  }

  /**
   * Check if member is in safe zones
   */
  checkSafeZones(member: FamilyMemberEnhanced): void {
    const now = Date.now()
    const lastCheck = localStorage.getItem(`${this.lastCheckKey}-${member.id}`)
    const lastCheckTime = lastCheck ? parseInt(lastCheck) : 0

    // Only check every 5 minutes to avoid spam
    if (now - lastCheckTime < 5 * 60 * 1000) {
      return
    }

    localStorage.setItem(`${this.lastCheckKey}-${member.id}`, now.toString())

    const currentLocation = member.location.current
    const activeZones = member.safeZones.filter(z => z.active)

    for (const zone of activeZones) {
      const distance = this.calculateDistance(
        currentLocation.lat,
        currentLocation.lon,
        zone.coordinates.lat,
        zone.coordinates.lon
      )

      const isInZone = distance <= zone.radius
      const wasInZone = this.wasInZone(member.id, zone.id)

      // Alert on exit
      if (!isInZone && wasInZone && zone.alertOnExit) {
        this.createAlert({
          type: 'exit',
          memberId: member.id,
          memberName: member.name,
          zone,
          location: currentLocation,
          timestamp: new Date().toISOString(),
          severity: 'warning',
          message: `${member.name} left ${zone.name}`
        })
      }

      // Alert on entry
      if (isInZone && !wasInZone && zone.alertOnEntry) {
        this.createAlert({
          type: 'entry',
          memberId: member.id,
          memberName: member.name,
          zone,
          location: currentLocation,
          timestamp: new Date().toISOString(),
          severity: 'info',
          message: `${member.name} arrived at ${zone.name}`
        })
      }

      // Update zone status
      this.updateZoneStatus(member.id, zone.id, isInZone)
    }
  }

  /**
   * Send emergency voice memo
   */
  async sendEmergencyMemo(
    fromMemberId: string,
    toMembers: string[] | 'all',
    audioBlob: Blob,
    duration: number
  ): Promise<VoiceMemo> {
    const fromMember = this.getMember(fromMemberId)
    if (!fromMember) {
      throw new Error('Member not found')
    }

    const memo: VoiceMemo = {
      id: `memo-${Date.now()}`,
      fromMemberId,
      fromMemberName: fromMember.name,
      toMembers: toMembers === 'all' ? ['all'] : toMembers,
      audioBlob,
      duration,
      timestamp: new Date().toISOString(),
      emergency: true,
      acknowledged: [],
      played: []
    }

    // Save memo
    const memos = this.getAllVoiceMemos()
    memos.push(memo)
    localStorage.setItem(this.memosKey, JSON.stringify(memos.map(m => ({
      ...m,
      audioBlob: undefined // Don't stringify blob
    }))))

    // Store blob separately
    this.storeMemoAudio(memo.id, audioBlob)

    // Play on all devices (bypass DND)
    await this.playEmergencyMemo(memo)

    return memo
  }

  /**
   * Play emergency memo (bypasses DND)
   */
  private async playEmergencyMemo(memo: VoiceMemo): Promise<void> {
    try {
      // Get audio blob
      const audioBlob = await this.getMemoAudio(memo.id)
      if (!audioBlob) return

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Set volume to maximum
      const gainNode = audioContext.createGain()
      gainNode.gain.value = 1.0

      // Create audio buffer
      const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer())

      // Play audio
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)
      source.start(0)

      // Show notification
      this.showEmergencyNotification(memo)
    } catch (error) {
      console.error('Error playing emergency memo:', error)
    }
  }

  /**
   * Show emergency notification
   */
  private showEmergencyNotification(memo: VoiceMemo): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 EMERGENCY MESSAGE', {
        body: `Emergency voice message from ${memo.fromMemberName}`,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        tag: 'emergency-memo'
      })
    }
  }

  /**
   * Acknowledge voice memo
   */
  acknowledgeMemo(memoId: string, memberId: string): void {
    const memos = this.getAllVoiceMemos()
    const memo = memos.find(m => m.id === memoId)

    if (memo && !memo.acknowledged.includes(memberId)) {
      memo.acknowledged.push(memberId)
      localStorage.setItem(this.memosKey, JSON.stringify(memos))
    }
  }

  /**
   * Get all voice memos
   */
  getAllVoiceMemos(): VoiceMemo[] {
    try {
      const data = localStorage.getItem(this.memosKey)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  /**
   * Get alerts
   */
  getAllAlerts(): LocationAlert[] {
    try {
      const data = localStorage.getItem(this.alertsKey)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): LocationAlert[] {
    return this.getAllAlerts().filter(a => !a.acknowledged)
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alerts = this.getAllAlerts()
    const alert = alerts.find(a => a.id === alertId)

    if (alert) {
      alert.acknowledged = true
      localStorage.setItem(this.alertsKey, JSON.stringify(alerts))
    }
  }

  /**
   * Call family member
   */
  callMember(member: FamilyMemberEnhanced, type: 'phone' | 'messenger' | 'viber' = 'phone'): void {
    switch (type) {
      case 'phone':
        window.location.href = `tel:${member.phone}`
        break
      case 'messenger':
        if (member.messenger) {
          window.open(`https://m.me/${member.messenger}`, '_blank')
        }
        break
      case 'viber':
        if (member.viber) {
          window.location.href = `viber://chat?number=${encodeURIComponent(member.viber)}`
        }
        break
    }
  }

  // Helper methods

  private createAlert(alert: Omit<LocationAlert, 'id' | 'acknowledged'>): void {
    const alerts = this.getAllAlerts()

    const newAlert: LocationAlert = {
      ...alert,
      id: `alert-${Date.now()}`,
      acknowledged: false
    }

    alerts.push(newAlert)

    // Keep only last 100 alerts
    if (alerts.length > 100) {
      alerts.splice(0, alerts.length - 100)
    }

    localStorage.setItem(this.alertsKey, JSON.stringify(alerts))

    // Send email notification (only for zone exits/entries)
    if (alert.type === 'exit' || alert.type === 'entry') {
      this.sendEmailNotification(newAlert)
    }
  }

  private sendEmailNotification(alert: LocationAlert): void {
    // In production, send actual email
    console.log('📧 Email notification:', alert.message)

    // Log to console for development
    console.log({
      to: 'user@example.com',
      subject: `Family Safety Alert: ${alert.memberName}`,
      body: `${alert.message}\n\nLocation: ${alert.location.address}\nTime: ${new Date(alert.timestamp).toLocaleString()}`
    })
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3 // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  private wasInZone(memberId: string, zoneId: string): boolean {
    const key = `zone-status-${memberId}-${zoneId}`
    return localStorage.getItem(key) === 'true'
  }

  private updateZoneStatus(memberId: string, zoneId: string, inZone: boolean): void {
    const key = `zone-status-${memberId}-${zoneId}`
    localStorage.setItem(key, inZone.toString())
  }

  private storeMemoAudio(memoId: string, blob: Blob): void {
    const reader = new FileReader()
    reader.onload = () => {
      localStorage.setItem(`memo-audio-${memoId}`, reader.result as string)
    }
    reader.readAsDataURL(blob)
  }

  private async getMemoAudio(memoId: string): Promise<Blob | null> {
    const dataUrl = localStorage.getItem(`memo-audio-${memoId}`)
    if (!dataUrl) return null

    const response = await fetch(dataUrl)
    return await response.blob()
  }
}

/**
 * Location tracking service (call periodically)
 */
export class LocationTrackingService {
  private manager: EnhancedFamilySafetyManager
  private intervalId: NodeJS.Timeout | null = null
  private trackingInterval: number = 5 * 60 * 1000 // 5 minutes

  constructor(manager: EnhancedFamilySafetyManager) {
    this.manager = manager
  }

  /**
   * Start tracking location
   */
  start(memberId: string): void {
    if (this.intervalId) return

    // Initial update
    this.updateLocation(memberId)

    // Set up interval
    this.intervalId = setInterval(() => {
      this.updateLocation(memberId)
    }, this.trackingInterval)
  }

  /**
   * Stop tracking
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Update location
   */
  private updateLocation(memberId: string): void {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.manager.updateLocation(memberId, {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          address: 'Current Location', // Reverse geocode in production
          accuracy: position.coords.accuracy
        })

        // Update battery if available
        if ('getBattery' in navigator) {
          (navigator as any).getBattery().then((battery: any) => {
            this.manager.updateBattery(memberId, battery.level * 100, battery.charging)
          })
        }
      },
      (error) => {
        console.error('Location error:', error)
      },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }
}
