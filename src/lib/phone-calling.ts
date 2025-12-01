/**
 * Phone Calling Service
 * AI-powered phone calling with location awareness
 */

import { FamilyMember } from '@/components/family-view'
import { getLocationTracker } from './location-tracking'

export interface CallLog {
  id: string
  recipientName: string
  recipientPhone: string
  timestamp: number
  initiatedBy: 'user' | 'ai-voice' | 'emergency'
  userLocation?: string
  duration?: number
  status: 'initiated' | 'completed' | 'failed'
}

export class PhoneCallingService {
  private callHistory: CallLog[] = []
  private familyMembers: FamilyMember[] = []

  constructor() {
    this.loadCallHistory()
  }

  /**
   * Set family members data
   */
  setFamilyMembers(members: FamilyMember[]): void {
    this.familyMembers = members
  }

  /**
   * Call a family member by name
   */
  async callByName(name: string, initiatedBy: 'user' | 'ai-voice' | 'emergency' = 'ai-voice'): Promise<boolean> {
    const member = this.familyMembers.find(m =>
      m.name.toLowerCase().includes(name.toLowerCase())
    )

    if (!member) {
      console.error(`Family member "${name}" not found`)
      return false
    }

    if (!member.phoneNumber) {
      console.error(`${member.name} does not have a phone number`)
      return false
    }

    return this.initiateCall(member.name, member.phoneNumber, initiatedBy)
  }

  /**
   * Call a family member by relationship (e.g., "husband", "son", "daughter")
   */
  async callByRelationship(relationship: string, initiatedBy: 'user' | 'ai-voice' | 'emergency' = 'ai-voice'): Promise<boolean> {
    const member = this.familyMembers.find(m =>
      m.relationship?.toLowerCase() === relationship.toLowerCase()
    )

    if (!member) {
      console.error(`Family member with relationship "${relationship}" not found`)
      return false
    }

    if (!member.phoneNumber) {
      console.error(`${member.name} does not have a phone number`)
      return false
    }

    return this.initiateCall(member.name, member.phoneNumber, initiatedBy)
  }

  /**
   * Initiate a phone call
   */
  private async initiateCall(name: string, phoneNumber: string, initiatedBy: 'user' | 'ai-voice' | 'emergency'): Promise<boolean> {
    try {
      // Get current location
      const locationTracker = getLocationTracker()
      const location = locationTracker.getLocation()
      const userLocation = location ? locationTracker.getCurrentAddress() : 'Unknown location'

      // Create call log
      const callLog: CallLog = {
        id: Date.now().toString(),
        recipientName: name,
        recipientPhone: phoneNumber,
        timestamp: Date.now(),
        initiatedBy,
        userLocation,
        status: 'initiated'
      }

      this.callHistory.push(callLog)
      this.saveCallHistory()

      // Initiate the call using tel: protocol
      window.location.href = `tel:${phoneNumber}`

      return true
    } catch (error) {
      console.error('Call initiation failed:', error)
      return false
    }
  }

  /**
   * Call with location context (shares current location with recipient)
   */
  async callWithLocation(nameOrRelationship: string, initiatedBy: 'user' | 'ai-voice' | 'emergency' = 'ai-voice'): Promise<{
    success: boolean
    locationShared: boolean
    address?: string
  }> {
    // Try by name first
    let member = this.familyMembers.find(m =>
      m.name.toLowerCase().includes(nameOrRelationship.toLowerCase())
    )

    // If not found, try by relationship
    if (!member) {
      member = this.familyMembers.find(m =>
        m.relationship?.toLowerCase() === nameOrRelationship.toLowerCase()
      )
    }

    if (!member || !member.phoneNumber) {
      return { success: false, locationShared: false }
    }

    // Get current location
    const locationTracker = getLocationTracker()
    let currentLocation = locationTracker.getLocation()

    // If location not available, try to get it
    if (!currentLocation) {
      try {
        await locationTracker.startTracking()
        currentLocation = locationTracker.getLocation()
      } catch (error) {
        console.error('Failed to get location:', error)
      }
    }

    const address = currentLocation ? locationTracker.getCurrentAddress() : undefined

    // Initiate call
    const success = await this.initiateCall(member.name, member.phoneNumber, initiatedBy)

    return {
      success,
      locationShared: !!currentLocation,
      address
    }
  }

  /**
   * Emergency call - calls all family members
   */
  async emergencyCallAll(): Promise<{
    totalCalls: number
    successful: number
    location?: string
  }> {
    const locationTracker = getLocationTracker()
    const location = locationTracker.getLocation()
    const address = location ? locationTracker.getCurrentAddress() : undefined

    let successful = 0
    const membersWithPhones = this.familyMembers.filter(m => m.phoneNumber)

    for (const member of membersWithPhones) {
      const result = await this.initiateCall(member.name, member.phoneNumber!, 'emergency')
      if (result) successful++

      // Small delay between calls
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return {
      totalCalls: membersWithPhones.length,
      successful,
      location: address
    }
  }

  /**
   * Get call history
   */
  getCallHistory(limit?: number): CallLog[] {
    const history = [...this.callHistory].reverse()
    return limit ? history.slice(0, limit) : history
  }

  /**
   * Get recent calls to a specific person
   */
  getCallsTo(name: string): CallLog[] {
    return this.callHistory
      .filter(log => log.recipientName.toLowerCase().includes(name.toLowerCase()))
      .reverse()
  }

  /**
   * Save call history to localStorage
   */
  private saveCallHistory(): void {
    try {
      localStorage.setItem(
        'flowsphere-call-history',
        JSON.stringify(this.callHistory.slice(-50)) // Keep last 50 calls
      )
    } catch (error) {
      console.error('Failed to save call history:', error)
    }
  }

  /**
   * Load call history from localStorage
   */
  private loadCallHistory(): void {
    try {
      const saved = localStorage.getItem('flowsphere-call-history')
      if (saved) {
        this.callHistory = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load call history:', error)
    }
  }

  /**
   * Get family member by name
   */
  getFamilyMemberByName(name: string): FamilyMember | undefined {
    return this.familyMembers.find(m =>
      m.name.toLowerCase().includes(name.toLowerCase())
    )
  }

  /**
   * Get family member by relationship
   */
  getFamilyMemberByRelationship(relationship: string): FamilyMember | undefined {
    return this.familyMembers.find(m =>
      m.relationship?.toLowerCase() === relationship.toLowerCase()
    )
  }
}

// Global instance
let globalPhoneService: PhoneCallingService | null = null

/**
 * Get or create global phone calling service
 */
export function getPhoneCallingService(): PhoneCallingService {
  if (!globalPhoneService) {
    globalPhoneService = new PhoneCallingService()
  }
  return globalPhoneService
}
