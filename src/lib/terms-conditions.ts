/**
 * Terms & Conditions System
 * Manages user agreements, privacy policy, and consent tracking
 * Prompts before all configurations as requested
 */

export interface TermsDocument {
  id: string
  type: 'terms' | 'privacy' | 'consent' | 'eula'
  title: string
  version: string
  content: string
  effectiveDate: string
  lastUpdated: string
  required: boolean
}

export interface UserConsent {
  documentId: string
  documentType: TermsDocument['type']
  documentVersion: string
  accepted: boolean
  acceptedAt?: string
  ipAddress?: string
  userAgent?: string
  signature?: string
}

export interface ConsentRequirement {
  feature: string
  requiredDocuments: string[] // Document IDs
  description: string
  canProceedWithoutConsent: boolean
}

/**
 * Terms & Conditions Manager
 */
export class TermsConditionsManager {
  private consentsKey = 'flowsphere-user-consents'
  private documentsKey = 'flowsphere-terms-documents'

  constructor() {
    this.initializeDefaultDocuments()
  }

  /**
   * Initialize default terms documents
   */
  private initializeDefaultDocuments(): void {
    const existing = this.getAllDocuments()
    if (existing.length > 0) return

    const defaultDocuments: TermsDocument[] = [
      {
        id: 'terms-v1',
        type: 'terms',
        title: 'Terms of Service',
        version: '1.0',
        content: this.getTermsOfServiceContent(),
        effectiveDate: '2025-01-01',
        lastUpdated: new Date().toISOString(),
        required: true
      },
      {
        id: 'privacy-v1',
        type: 'privacy',
        title: 'Privacy Policy',
        version: '1.0',
        content: this.getPrivacyPolicyContent(),
        effectiveDate: '2025-01-01',
        lastUpdated: new Date().toISOString(),
        required: true
      },
      {
        id: 'data-consent-v1',
        type: 'consent',
        title: 'Data Processing Consent',
        version: '1.0',
        content: this.getDataConsentContent(),
        effectiveDate: '2025-01-01',
        lastUpdated: new Date().toISOString(),
        required: true
      },
      {
        id: 'photo-consent-v1',
        type: 'consent',
        title: 'Photo Capture Consent',
        version: '1.0',
        content: this.getPhotoConsentContent(),
        effectiveDate: '2025-01-01',
        lastUpdated: new Date().toISOString(),
        required: true
      },
      {
        id: 'location-consent-v1',
        type: 'consent',
        title: 'Location Tracking Consent',
        version: '1.0',
        content: this.getLocationConsentContent(),
        effectiveDate: '2025-01-01',
        lastUpdated: new Date().toISOString(),
        required: true
      }
    ]

    localStorage.setItem(this.documentsKey, JSON.stringify(defaultDocuments))
  }

  /**
   * Get all terms documents
   */
  getAllDocuments(): TermsDocument[] {
    try {
      const stored = localStorage.getItem(this.documentsKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): TermsDocument | null {
    const documents = this.getAllDocuments()
    return documents.find(d => d.id === documentId) || null
  }

  /**
   * Get documents by type
   */
  getDocumentsByType(type: TermsDocument['type']): TermsDocument[] {
    return this.getAllDocuments().filter(d => d.type === type)
  }

  /**
   * Check if user has accepted a document
   */
  hasAccepted(documentId: string): boolean {
    const consents = this.getUserConsents()
    const consent = consents.find(c => c.documentId === documentId)
    return consent?.accepted || false
  }

  /**
   * Check if user has accepted all required documents
   */
  hasAcceptedAllRequired(): boolean {
    const documents = this.getAllDocuments()
    const required = documents.filter(d => d.required)

    return required.every(doc => this.hasAccepted(doc.id))
  }

  /**
   * Accept a document
   */
  async acceptDocument(
    documentId: string,
    signature?: string
  ): Promise<{ success: boolean; error?: string }> {
    const document = this.getDocument(documentId)
    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    const consent: UserConsent = {
      documentId,
      documentType: document.type,
      documentVersion: document.version,
      accepted: true,
      acceptedAt: new Date().toISOString(),
      ipAddress: await this.getIPAddress(),
      userAgent: navigator.userAgent,
      signature
    }

    const consents = this.getUserConsents()

    // Remove any existing consent for this document
    const filtered = consents.filter(c => c.documentId !== documentId)
    filtered.push(consent)

    try {
      localStorage.setItem(this.consentsKey, JSON.stringify(filtered))
      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to save consent' }
    }
  }

  /**
   * Revoke consent for a document
   */
  revokeConsent(documentId: string): void {
    const consents = this.getUserConsents()
    const consent = consents.find(c => c.documentId === documentId)

    if (consent) {
      consent.accepted = false
      localStorage.setItem(this.consentsKey, JSON.stringify(consents))
    }
  }

  /**
   * Get all user consents
   */
  getUserConsents(): UserConsent[] {
    try {
      const stored = localStorage.getItem(this.consentsKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Get consent for specific document
   */
  getConsent(documentId: string): UserConsent | null {
    const consents = this.getUserConsents()
    return consents.find(c => c.documentId === documentId) || null
  }

  /**
   * Check if consent is required for a feature
   */
  isConsentRequired(feature: string): boolean {
    const requirement = this.getFeatureRequirement(feature)
    if (!requirement) return false

    return requirement.requiredDocuments.some(docId => !this.hasAccepted(docId))
  }

  /**
   * Get missing consents for a feature
   */
  getMissingConsents(feature: string): TermsDocument[] {
    const requirement = this.getFeatureRequirement(feature)
    if (!requirement) return []

    const missing: TermsDocument[] = []

    for (const docId of requirement.requiredDocuments) {
      if (!this.hasAccepted(docId)) {
        const doc = this.getDocument(docId)
        if (doc) missing.push(doc)
      }
    }

    return missing
  }

  /**
   * Request consent for a feature
   * Returns true if all consents are already granted
   */
  async requestConsentForFeature(feature: string): Promise<{
    canProceed: boolean
    missingDocuments: TermsDocument[]
  }> {
    const missing = this.getMissingConsents(feature)

    if (missing.length === 0) {
      return { canProceed: true, missingDocuments: [] }
    }

    return { canProceed: false, missingDocuments: missing }
  }

  /**
   * Get feature consent requirements
   */
  private getFeatureRequirement(feature: string): ConsentRequirement | null {
    const requirements: Record<string, ConsentRequirement> = {
      'face-capture': {
        feature: 'face-capture',
        requiredDocuments: ['terms-v1', 'privacy-v1', 'photo-consent-v1'],
        description: 'Face capture for security requires consent for photo processing',
        canProceedWithoutConsent: false
      },
      'location-tracking': {
        feature: 'location-tracking',
        requiredDocuments: ['terms-v1', 'privacy-v1', 'location-consent-v1'],
        description: 'Location tracking requires consent for GPS data processing',
        canProceedWithoutConsent: false
      },
      'family-safety': {
        feature: 'family-safety',
        requiredDocuments: ['terms-v1', 'privacy-v1', 'location-consent-v1'],
        description: 'Family safety features require location tracking consent',
        canProceedWithoutConsent: false
      },
      'device-config': {
        feature: 'device-config',
        requiredDocuments: ['terms-v1', 'privacy-v1', 'data-consent-v1'],
        description: 'Device configuration requires data processing consent',
        canProceedWithoutConsent: false
      },
      'social-auth': {
        feature: 'social-auth',
        requiredDocuments: ['terms-v1', 'privacy-v1'],
        description: 'Social authentication requires basic consent',
        canProceedWithoutConsent: false
      },
      'email-monitoring': {
        feature: 'email-monitoring',
        requiredDocuments: ['terms-v1', 'privacy-v1', 'data-consent-v1'],
        description: 'Email monitoring requires data processing consent',
        canProceedWithoutConsent: false
      }
    }

    return requirements[feature] || null
  }

  /**
   * Export consent records (for GDPR compliance)
   */
  exportConsentRecords(): string {
    const consents = this.getUserConsents()
    return JSON.stringify(consents, null, 2)
  }

  /**
   * Delete all consent records (for GDPR right to erasure)
   */
  deleteAllConsents(): void {
    localStorage.removeItem(this.consentsKey)
  }

  // Document content templates

  private getTermsOfServiceContent(): string {
    return `# Terms of Service - FlowSphere

**Effective Date:** January 1, 2025

## 1. Acceptance of Terms
By accessing and using FlowSphere, you accept and agree to be bound by these Terms of Service.

## 2. Description of Service
FlowSphere is a comprehensive life management platform that provides:
- Family safety monitoring with GPS tracking
- Smart home automation and device control
- Personal productivity tools and timers
- Security features including login monitoring
- Weather and commute information
- And other integrated services

## 3. User Responsibilities
You agree to:
- Provide accurate information during registration
- Maintain the security of your account credentials
- Use the service in compliance with all applicable laws
- Not attempt to hack, disrupt, or misuse the service
- Respect the privacy of other users

## 4. Privacy and Data Collection
Please refer to our Privacy Policy for details on how we collect, use, and protect your data.

## 5. Security Features
You acknowledge that FlowSphere includes security features such as:
- Login attempt monitoring with photo capture
- Location tracking for family safety
- Device activity monitoring

These features are designed to protect your account and family members.

## 6. Modifications to Service
We reserve the right to modify or discontinue the service at any time with or without notice.

## 7. Limitation of Liability
FlowSphere is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.

## 8. Contact
For questions about these terms, contact: support@flowsphere.app`
  }

  private getPrivacyPolicyContent(): string {
    return `# Privacy Policy - FlowSphere

**Effective Date:** January 1, 2025

## 1. Information We Collect

### Account Information
- Email address, name, and contact details
- Authentication credentials (encrypted)
- Profile information

### Location Data
- GPS coordinates for family safety features
- Address information (home, work, school)
- Safe zone configurations

### Device Information
- Device type, operating system, browser
- IP address and network information
- Screen resolution and platform details

### Photos
- Security photos captured during login attempts
- Profile photos (if provided)

### Usage Data
- Feature usage and preferences
- Timer and productivity data
- Sleep tracking patterns

## 2. How We Use Your Information
- To provide and improve our services
- To ensure security of your account
- To enable family safety features
- To personalize your experience
- To communicate important updates

## 3. Data Sharing
We do not sell your personal information. We may share data:
- With your explicit consent
- With family members you've added
- When required by law
- With service providers under strict agreements

## 4. Data Security
We implement industry-standard security measures:
- End-to-end encryption for sensitive data
- Secure storage practices
- Regular security audits
- Access controls and monitoring

## 5. Your Rights
You have the right to:
- Access your personal data
- Request data correction or deletion
- Export your data
- Revoke consents
- Opt-out of certain features

## 6. Data Retention
- Login photos: 90 days
- Location history: 90 days
- Account data: Until account deletion
- Consent records: As legally required

## 7. Contact
For privacy inquiries: privacy@flowsphere.app`
  }

  private getDataConsentContent(): string {
    return `# Data Processing Consent

By accepting this consent, you authorize FlowSphere to:

## 1. Process Your Personal Data
- Store and process your account information
- Analyze usage patterns to improve services
- Generate insights from your activity data

## 2. Store Data Locally and Remotely
- Use browser local storage for quick access
- Sync data across your devices
- Back up data to secure servers

## 3. Use Data for Features
- Sleep tracking and routine analysis
- Weather and commute recommendations
- Smart automation and suggestions
- Email subscription monitoring

## 4. Your Control
You can:
- View all collected data at any time
- Export your data in standard formats
- Delete specific data or your entire account
- Opt-out of specific data collection features

You may revoke this consent at any time in Settings, though some features may become unavailable.`
  }

  private getPhotoConsentContent(): string {
    return `# Photo Capture Consent

## Security Photo Capture
FlowSphere includes advanced security features that capture photos during:
- Failed login attempts
- First-time logins from new devices
- Suspicious activity detection

## How It Works
- **Silent Operation:** Photos are captured silently with no sounds, vibrations, or alerts
- **Front Camera:** Uses the device's front-facing camera
- **Automatic:** Triggered automatically by security events
- **Stored Securely:** Photos are encrypted and stored securely
- **Limited Retention:** Photos are automatically deleted after 90 days

## Purpose
These photos help:
- Identify unauthorized access attempts
- Protect your account from intruders
- Provide evidence in case of security incidents
- Alert you to suspicious activity

## Your Rights
- View all captured photos in Security Dashboard
- Delete specific photos at any time
- Disable this feature (reduces security)
- Access CEO dashboard for full security overview

By accepting, you consent to this photo capture for security purposes.`
  }

  private getLocationConsentContent(): string {
    return `# Location Tracking Consent

## GPS Location Features
FlowSphere uses location data for:
- Family safety monitoring
- Safe zone alerts (home, school, work)
- Real-time location sharing with family
- Weather and commute information
- Emergency voice memo delivery

## Data Collection
We collect:
- GPS coordinates at regular intervals
- Address information for safe zones
- Location history (last 90 days)
- Battery level during location updates

## Privacy Protection
- Location shared only with family members you add
- Safe zone alerts reduce notification frequency
- You control who sees your location
- Location history is automatically deleted after 90 days

## Emergency Features
Location data enables:
- Emergency voice memos that bypass Do Not Disturb
- Real-time location updates to family
- Safe zone exit/entry notifications

You can disable location tracking at any time, though family safety features will be unavailable.`
  }

  // Helper methods

  private async getIPAddress(): Promise<string | undefined> {
    try {
      // In production, get from backend
      return undefined
    } catch {
      return undefined
    }
  }
}

/**
 * Initialize terms & conditions system
 */
export function initializeTermsConditions(): TermsConditionsManager {
  return new TermsConditionsManager()
}

/**
 * Consent prompt result
 */
export interface ConsentPromptResult {
  accepted: boolean
  documentsAccepted: string[]
  signature?: string
}

/**
 * Show consent prompt (to be implemented in UI)
 */
export async function promptForConsent(
  documents: TermsDocument[]
): Promise<ConsentPromptResult> {
  // This would show a UI modal with the documents
  // For now, return a placeholder
  return {
    accepted: false,
    documentsAccepted: []
  }
}
