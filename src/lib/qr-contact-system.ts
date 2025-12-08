/**
 * QR Code Contact Registration System
 * Scan QR codes to add contacts permanently
 */

import { logger } from '@/lib/security-utils'

export interface Contact {
  id: string
  userId: string // Unique user ID from QR code
  name: string
  phone?: string
  email?: string
  avatar?: string
  publicKey: string // For encryption
  addedDate: string
  lastSeen?: string
  status: 'active' | 'deactivated' | 'blocked'
  favorite: boolean
  nickname?: string
  customTheme?: ContactTheme
  notes?: string
  groups: string[]
}

export interface ContactTheme {
  primaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  bubbleStyle: 'rounded' | 'square' | 'modern'
}

export interface QRCodeData {
  version: string
  userId: string
  name: string
  phone?: string
  email?: string
  avatar?: string
  publicKey: string
  timestamp: string
  signature: string // To verify authenticity
}

export interface ContactRequest {
  id: string
  from: Contact
  timestamp: string
  status: 'pending' | 'accepted' | 'declined'
  message?: string
}

/**
 * Generate QR code data for current user
 */
export function generateMyQRCode(userData: {
  userId: string
  name: string
  phone?: string
  email?: string
  avatar?: string
  publicKey: string
}): QRCodeData {
  const qrData: QRCodeData = {
    version: '1.0',
    userId: userData.userId,
    name: userData.name,
    phone: userData.phone,
    email: userData.email,
    avatar: userData.avatar,
    publicKey: userData.publicKey,
    timestamp: new Date().toISOString(),
    signature: generateSignature(userData)
  }

  return qrData
}

/**
 * Generate signature for QR code verification
 */
function generateSignature(data: any): string {
  // In production, use proper cryptographic signing
  const dataString = JSON.stringify(data)
  return btoa(dataString).substring(0, 32)
}

/**
 * Verify QR code signature
 */
function verifySignature(qrData: QRCodeData): boolean {
  // In production, verify cryptographic signature
  const expectedSignature = generateSignature({
    userId: qrData.userId,
    name: qrData.name,
    phone: qrData.phone,
    email: qrData.email,
    avatar: qrData.avatar,
    publicKey: qrData.publicKey
  })

  return qrData.signature === expectedSignature
}

/**
 * Parse scanned QR code data
 */
export function parseQRCode(qrCodeString: string): QRCodeData | null {
  try {
    const qrData: QRCodeData = JSON.parse(qrCodeString)

    // Verify required fields
    if (!qrData.userId || !qrData.name || !qrData.publicKey) {
      throw new Error('Invalid QR code: missing required fields')
    }

    // Verify signature
    if (!verifySignature(qrData)) {
      throw new Error('Invalid QR code: signature verification failed')
    }

    // Check timestamp (reject if older than 24 hours for security)
    const qrAge = Date.now() - new Date(qrData.timestamp).getTime()
    if (qrAge > 24 * 60 * 60 * 1000) {
      throw new Error('QR code expired')
    }

    return qrData
  } catch (error) {
    console.error('Error parsing QR code:', error)
    return null
  }
}

/**
 * Contact Manager
 */
export class ContactManager {
  private storageKey = 'flowsphere-contacts'
  private requestsKey = 'flowsphere-contact-requests'

  /**
   * Add contact from QR code
   */
  async addContactFromQR(qrData: QRCodeData): Promise<Contact> {
    // Check if contact already exists
    const existing = this.getContactByUserId(qrData.userId)
    if (existing) {
      if (existing.status === 'deactivated') {
        // Reactivate deactivated contact
        return this.updateContact(existing.id, { status: 'active', lastSeen: new Date().toISOString() })
      }
      throw new Error('Contact already exists')
    }

    // Create new contact
    const contact: Contact = {
      id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: qrData.userId,
      name: qrData.name,
      phone: qrData.phone,
      email: qrData.email,
      avatar: qrData.avatar,
      publicKey: qrData.publicKey,
      addedDate: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      status: 'active',
      favorite: false,
      groups: []
    }

    // Save contact
    const contacts = this.getAllContacts()
    contacts.push(contact)
    this.saveContacts(contacts)

    return contact
  }

  /**
   * Get all contacts
   */
  getAllContacts(): Contact[] {
    try {
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      logger.error('Failed to get contacts from storage', error, 'QRContactSystem')
      return []
    }
  }

  /**
   * Get active contacts only
   */
  getActiveContacts(): Contact[] {
    return this.getAllContacts().filter(c => c.status === 'active')
  }

  /**
   * Get contact by ID
   */
  getContact(contactId: string): Contact | null {
    return this.getAllContacts().find(c => c.id === contactId) || null
  }

  /**
   * Get contact by user ID
   */
  getContactByUserId(userId: string): Contact | null {
    return this.getAllContacts().find(c => c.userId === userId) || null
  }

  /**
   * Update contact
   */
  updateContact(contactId: string, updates: Partial<Contact>): Contact {
    const contacts = this.getAllContacts()
    const index = contacts.findIndex(c => c.id === contactId)

    if (index === -1) {
      throw new Error('Contact not found')
    }

    contacts[index] = { ...contacts[index], ...updates }
    this.saveContacts(contacts)

    return contacts[index]
  }

  /**
   * Delete contact
   */
  deleteContact(contactId: string): void {
    const contacts = this.getAllContacts().filter(c => c.id !== contactId)
    this.saveContacts(contacts)
  }

  /**
   * Deactivate contact (soft delete)
   */
  deactivateContact(contactId: string): Contact {
    return this.updateContact(contactId, { status: 'deactivated' })
  }

  /**
   * Block contact
   */
  blockContact(contactId: string): Contact {
    return this.updateContact(contactId, { status: 'blocked' })
  }

  /**
   * Unblock contact
   */
  unblockContact(contactId: string): Contact {
    return this.updateContact(contactId, { status: 'active' })
  }

  /**
   * Toggle favorite
   */
  toggleFavorite(contactId: string): Contact {
    const contact = this.getContact(contactId)
    if (!contact) throw new Error('Contact not found')

    return this.updateContact(contactId, { favorite: !contact.favorite })
  }

  /**
   * Set nickname
   */
  setNickname(contactId: string, nickname: string): Contact {
    return this.updateContact(contactId, { nickname })
  }

  /**
   * Set custom theme for contact
   */
  setCustomTheme(contactId: string, theme: ContactTheme): Contact {
    return this.updateContact(contactId, { customTheme: theme })
  }

  /**
   * Add note to contact
   */
  addNote(contactId: string, note: string): Contact {
    return this.updateContact(contactId, { notes: note })
  }

  /**
   * Add contact to group
   */
  addToGroup(contactId: string, groupName: string): Contact {
    const contact = this.getContact(contactId)
    if (!contact) throw new Error('Contact not found')

    if (!contact.groups.includes(groupName)) {
      contact.groups.push(groupName)
    }

    return this.updateContact(contactId, { groups: contact.groups })
  }

  /**
   * Remove contact from group
   */
  removeFromGroup(contactId: string, groupName: string): Contact {
    const contact = this.getContact(contactId)
    if (!contact) throw new Error('Contact not found')

    contact.groups = contact.groups.filter(g => g !== groupName)

    return this.updateContact(contactId, { groups: contact.groups })
  }

  /**
   * Get contacts by group
   */
  getContactsByGroup(groupName: string): Contact[] {
    return this.getActiveContacts().filter(c => c.groups.includes(groupName))
  }

  /**
   * Get favorite contacts
   */
  getFavoriteContacts(): Contact[] {
    return this.getActiveContacts().filter(c => c.favorite)
  }

  /**
   * Search contacts
   */
  searchContacts(query: string): Contact[] {
    const lowerQuery = query.toLowerCase()
    return this.getActiveContacts().filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.nickname?.toLowerCase().includes(lowerQuery) ||
      c.phone?.includes(query) ||
      c.email?.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Update last seen
   */
  updateLastSeen(contactId: string): void {
    this.updateContact(contactId, { lastSeen: new Date().toISOString() })
  }

  /**
   * Save contacts to storage
   */
  private saveContacts(contacts: Contact[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(contacts))
  }

  /**
   * Export contacts (backup)
   */
  exportContacts(): string {
    const contacts = this.getAllContacts()
    return JSON.stringify(contacts, null, 2)
  }

  /**
   * Import contacts (restore)
   */
  importContacts(data: string): { success: number; failed: number } {
    try {
      const importedContacts: Contact[] = JSON.parse(data)
      const currentContacts = this.getAllContacts()
      let success = 0
      let failed = 0

      importedContacts.forEach(contact => {
        // Check if contact already exists
        const exists = currentContacts.some(c => c.userId === contact.userId)
        if (!exists) {
          currentContacts.push(contact)
          success++
        } else {
          failed++
        }
      })

      this.saveContacts(currentContacts)

      return { success, failed }
    } catch (error) {
      console.error('Error importing contacts:', error)
      return { success: 0, failed: 0 }
    }
  }

  /**
   * Get contact statistics
   */
  getStatistics(): {
    total: number
    active: number
    deactivated: number
    blocked: number
    favorites: number
    groups: string[]
  } {
    const contacts = this.getAllContacts()

    const groups = new Set<string>()
    contacts.forEach(c => c.groups.forEach(g => groups.add(g)))

    return {
      total: contacts.length,
      active: contacts.filter(c => c.status === 'active').length,
      deactivated: contacts.filter(c => c.status === 'deactivated').length,
      blocked: contacts.filter(c => c.status === 'blocked').length,
      favorites: contacts.filter(c => c.favorite).length,
      groups: Array.from(groups)
    }
  }

  // Contact Requests

  /**
   * Send contact request
   */
  sendContactRequest(toContact: Contact, message?: string): ContactRequest {
    const request: ContactRequest = {
      id: `request-${Date.now()}`,
      from: toContact,
      timestamp: new Date().toISOString(),
      status: 'pending',
      message
    }

    const requests = this.getContactRequests()
    requests.push(request)
    this.saveContactRequests(requests)

    return request
  }

  /**
   * Get all contact requests
   */
  getContactRequests(): ContactRequest[] {
    try {
      const data = localStorage.getItem(this.requestsKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      logger.error('Failed to get contact requests from storage', error, 'QRContactSystem')
      return []
    }
  }

  /**
   * Get pending contact requests
   */
  getPendingRequests(): ContactRequest[] {
    return this.getContactRequests().filter(r => r.status === 'pending')
  }

  /**
   * Accept contact request
   */
  acceptContactRequest(requestId: string): void {
    const requests = this.getContactRequests()
    const request = requests.find(r => r.id === requestId)

    if (request) {
      request.status = 'accepted'
      this.saveContactRequests(requests)
    }
  }

  /**
   * Decline contact request
   */
  declineContactRequest(requestId: string): void {
    const requests = this.getContactRequests()
    const request = requests.find(r => r.id === requestId)

    if (request) {
      request.status = 'declined'
      this.saveContactRequests(requests)
    }
  }

  /**
   * Delete contact request
   */
  deleteContactRequest(requestId: string): void {
    const requests = this.getContactRequests().filter(r => r.id !== requestId)
    this.saveContactRequests(requests)
  }

  /**
   * Save contact requests
   */
  private saveContactRequests(requests: ContactRequest[]): void {
    localStorage.setItem(this.requestsKey, JSON.stringify(requests))
  }
}

/**
 * QR Code Scanner (uses device camera)
 */
export class QRCodeScanner {
  private stream: MediaStream | null = null
  private video: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private scanning: boolean = false
  private onScanCallback?: (data: string) => void

  /**
   * Start scanning
   */
  async startScanning(
    videoElement: HTMLVideoElement,
    onScan: (data: string) => void
  ): Promise<void> {
    try {
      this.video = videoElement
      this.onScanCallback = onScan

      // Get camera stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      this.video.srcObject = this.stream
      await this.video.play()

      // Create canvas for frame capture
      this.canvas = document.createElement('canvas')
      this.canvas.width = this.video.videoWidth
      this.canvas.height = this.video.videoHeight

      // Start scanning loop
      this.scanning = true
      this.scanFrame()
    } catch (error) {
      console.error('Error starting QR scanner:', error)
      throw new Error('Camera access denied')
    }
  }

  /**
   * Scan frame for QR code
   */
  private scanFrame(): void {
    if (!this.scanning || !this.video || !this.canvas) return

    const ctx = this.canvas.getContext('2d')
    if (!ctx) return

    // Draw video frame to canvas
    ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height)

    // Get image data
    const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)

    // Try to decode QR code (using jsQR or similar library in production)
    const code = this.decodeQRCode(imageData)

    if (code && this.onScanCallback) {
      this.onScanCallback(code)
      this.stopScanning() // Stop after successful scan
      return
    }

    // Continue scanning
    requestAnimationFrame(() => this.scanFrame())
  }

  /**
   * Decode QR code from image data
   * In production, use jsQR library
   */
  private decodeQRCode(imageData: ImageData): string | null {
    // This is a simplified version
    // In production, use: jsQR(imageData.data, imageData.width, imageData.height)
    return null
  }

  /**
   * Stop scanning
   */
  stopScanning(): void {
    this.scanning = false

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    if (this.video) {
      this.video.srcObject = null
    }
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(): Promise<void> {
    if (!this.video) return

    const currentFacingMode = this.stream?.getVideoTracks()[0].getSettings().facingMode || 'environment'
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment'

    this.stopScanning()

    if (this.onScanCallback) {
      await this.startScanning(this.video, this.onScanCallback)
    }
  }
}
