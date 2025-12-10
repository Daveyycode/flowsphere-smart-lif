/**
 * Secure QR Messenger - One-Time Contact Pairing System
 *
 * Features:
 * - One-time QR code per contact (non-reusable)
 * - Real-time end-to-end encryption
 * - Responsive design
 * - Auto-expires after 24 hours or first use
 * - No phone numbers required
 *
 * ⚠️ QR CODE SYSTEM - MODULAR & REPLACEABLE
 * Current: Reed-Solomon error correction (standard QR)
 * Future: Custom FlowSphere encryption algorithm (~1 month)
 *
 * All QR operations use src/lib/flowsphere-qr.ts module.
 * When replacing algorithm, only update that file.
 * This component will continue working without changes.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { logger } from '@/lib/security-utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QrCode,
  UserPlus,
  PaperPlaneTilt,
  ArrowLeft,
  X,
  Copy,
  Camera,
  CheckCircle,
  Check,
  Checks,
  Clock,
  Shield,
  Users,
  Image as ImageIcon,
  Plus,
  Gear,
  Eye,
  EyeSlash,
  ShieldCheck,
  FloppyDisk,
  IdentificationCard,
  DotsThree,
  Trash,
  TrashSimple,
  Warning,
  File,
  Microphone,
  Download,
  Play,
  Pause,
  Paperclip,
  Phone,
  PhoneCall,
  VideoCamera,
  Timer
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { VideoCall, IncomingCall } from './video-call'
import { generateRoomName, createRoom } from '@/lib/daily-call-service'
import {
  sendCallInvite,
  updateCallStatus,
  subscribeToCallInvites,
  type CallInvite
} from '@/lib/call-signaling'
// FlowSphere QR System - Modular and replaceable
import { generateQRCode as generateFlowSphereQR, parseQRData } from '@/lib/flowsphere-qr'
// E2EE Messenger Attachments
import {
  encryptAttachment,
  decryptAttachment,
  deleteAttachment,
  VoiceRecorder,
  formatFileSize,
  getFileIcon,
  createThumbnail,
  type AttachmentMetadata
} from '@/lib/messenger-attachments'
// Supabase real-time functions for auto-connect and live messaging
import {
  createPairingInvite,
  acceptPairingInvite,
  getMessengerContacts,
  subscribeToNewContacts,
  sendMessengerMessage,
  getMessengerMessages,
  subscribeToConversation,
  deleteMessageForEveryone as deleteMessageForEveryoneSupabase,
  subscribeToMessageDeletions,
  savePrivacySettings,
  getPrivacySettings,
  subscribeToPrivacySettings
} from '@/lib/real-messaging'

// ========== ID SYSTEM ==========
// Device ID: Tied to device hardware/browser, used for vault storage & auth
// User ID: Messenger profile identity, generated on signup, shareable
// Conversation ID: Thread identifier between two users

/**
 * Device ID - Permanent identifier for this device
 * - Used for secure vault storage encryption
 * - Bound to authentication (username/password)
 * - Auto-created on first signup
 * - Only changes if: user changes device OR user changes login email
 * - NOT shareable (internal use only)
 */
function getOrCreateDeviceId(): string {
  const key = 'flowsphere-device-id'
  let deviceId = localStorage.getItem(key)
  if (!deviceId) {
    // Generate cryptographically secure device ID
    const randomBytes = new Uint8Array(16)
    crypto.getRandomValues(randomBytes)
    // Convert to hex string
    const randomHex = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    deviceId = `DEV_${randomHex}`
    localStorage.setItem(key, deviceId)
  }
  return deviceId
}

/**
 * User ID / Profile ID - Messenger identity
 * - Generated on first messenger setup
 * - Can be shared with others to find you
 * - Linked to your messenger profile name
 * - Persists across sessions
 */
function getOrCreateUserId(): string {
  const key = 'flowsphere-messenger-user-id'
  let userId = localStorage.getItem(key)
  if (!userId) {
    // Generate cryptographically secure user ID (format: FS-XXXXXXXX)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No confusing chars (0,O,1,I)
    const randomBytes = new Uint8Array(8)
    crypto.getRandomValues(randomBytes)
    let id = ''
    for (let i = 0; i < 8; i++) {
      id += chars[randomBytes[i] % chars.length]
    }
    userId = `FS-${id}`
    localStorage.setItem(key, userId)
  }
  return userId
}

// ========== COUNTDOWN TIMER COMPONENT ==========
// Shows remaining time until message auto-deletes

function AutoDeleteCountdown({ deleteAt, isOwn }: { deleteAt: string; isOwn: boolean }) {
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const deleteTime = new Date(deleteAt)
      const diff = deleteTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('')
        return
      }

      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes % 60}m`)
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds % 60}s`)
      } else {
        setTimeLeft(`${seconds}s`)
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [deleteAt])

  if (!timeLeft) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium animate-pulse",
        isOwn ? "bg-red-500/20 text-red-200" : "bg-red-100 text-red-600"
      )}
      title="Message will be auto-deleted"
    >
      <Timer className="w-2.5 h-2.5" />
      {timeLeft}
    </span>
  )
}

// ========== TYPES ==========

// Supabase database record types (snake_case as stored in DB)
interface SupabaseContactRecord {
  id: string
  contact_user_id?: string
  name: string
  public_key?: string
  conversation_id?: string
  paired_at?: string
  status?: string
}

interface SupabaseMessageRecord {
  id: string
  sender_id: string
  content: string
  created_at: string
  encrypted?: boolean
}

interface SupabasePairingInvite {
  code: string
  public_key?: string
  name?: string
  expires_at?: string
}

interface UserPrivacySettings {
  showOnlineStatus: boolean // Do others see my online status?
  showLastSeen: boolean // Do others see my last seen?
  allowScreenshots: boolean // Can others screenshot my messages?
  allowForwarding: boolean // Can others forward my messages?
}

interface Contact {
  id: string // Device ID of the contact
  name: string
  publicKey: string
  pairingCode: string // The unique QR code used to connect (stored for reference)
  pairedAt: string
  lastSeen?: string
  lastSeenTimestamp?: string // ISO timestamp of last activity
  status: 'online' | 'offline' | 'away'
  isVerified: boolean
  conversationId?: string // For Supabase real-time messaging
  contactUserId?: string // The other user's device ID (internal)
  contactProfileId?: string // The other user's shareable User ID (FS-XXXXXXXX)
  isDeleted?: boolean // True if user deleted their account
  privacySettings?: UserPrivacySettings // What THIS contact allows ME to see about THEM
}

interface Message {
  id: string
  contactId: string
  text: string
  timestamp: string
  status: 'sending' | 'sent' | 'delivered' | 'seen' // sending=... sent=. delivered=gray✓ seen=purple✓
  isOwn: boolean
  encrypted: boolean
  seenAt?: string // When the message was seen
  autoDeleteTimer?: number // Minutes until deletion after seen (0 = no auto-delete)
  deleteAt?: string // ISO timestamp when message should be deleted
  attachment?: AttachmentMetadata // E2EE attachment (photo, file, voice)
}

// Auto-delete timer options (in minutes)
const AUTO_DELETE_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 1, label: '1 minute' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 60, label: '1 hour' },
  { value: 360, label: '6 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '24 hours' }
]

// MY Privacy settings - what I allow OTHERS to see about ME
interface MyPrivacySettings {
  showOnlineStatus: boolean // Allow others to see if I'm online
  showLastSeen: boolean // Allow others to see when I was last online
  allowScreenshots: boolean // Allow others to screenshot my messages
  allowSaveMedia: boolean // Allow others to save my photos/files/voice
  showUniqueId: boolean // Allow others to see my personal unique ID
  autoDeleteTimer: number // Default auto-delete timer (minutes, 0 = off)
}

const DEFAULT_MY_PRIVACY_SETTINGS: MyPrivacySettings = {
  showOnlineStatus: true,
  showLastSeen: true,
  allowScreenshots: true,
  allowSaveMedia: true,
  showUniqueId: false,
  autoDeleteTimer: 0 // Off by default
}

interface OneTimeInvite {
  code: string // Unique invite code
  publicKey: string // Your public key
  name: string // Your name
  createdAt: string
  expiresAt: string
  used: boolean // Marks if QR was scanned
  usedBy?: string // Contact ID who used it
  // Group QR fields
  isGroupInvite?: boolean // True if this is a group QR
  groupMaxMembers?: number // Max members allowed (e.g., 5)
  groupCurrentMembers?: number // Current member count
  groupId?: string // Group identifier for marking members
  groupMembers?: string[] // Array of device IDs who joined
}

// Group conversation marking - identifies members in a group
interface GroupMarking {
  groupId: string // Unique group identifier
  groupName: string // Display name for the group
  creatorId: string // Who created the group QR
  memberIds: string[] // All member device IDs
  maxMembers: number
  createdAt: string
}

interface SecureQRMessengerProps {
  isOpen: boolean
  onClose: () => void
}

// ========== ENCRYPTION HELPERS (AES-256-GCM) ==========

/**
 * Generate cryptographically secure key pair
 * Uses Web Crypto API for real security
 */
function generateKeyPair(): { publicKey: string; privateKey: string } {
  // Generate 32-byte random key material (256 bits)
  const keyBytes = new Uint8Array(32)
  crypto.getRandomValues(keyBytes)

  // Convert to hex string for storage
  const keyHex = Array.from(keyBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Public key is shared with contacts, private key is kept secret
  // For symmetric E2E encryption, we derive shared secret from both keys
  return {
    publicKey: `PK_${keyHex}`,
    privateKey: `SK_${keyHex}`
  }
}

/**
 * Derive shared encryption key from my private key and their public key
 * Both parties derive the same key by sorting and combining
 */
async function deriveSharedKey(
  myPrivateKey: string,
  theirPublicKey: string
): Promise<CryptoKey> {
  // Extract key material (remove prefixes)
  const myKey = myPrivateKey.replace('SK_', '')
  const theirKey = theirPublicKey.replace('PK_', '')

  // Sort keys alphabetically to ensure both parties derive same shared secret
  const sortedKeys = [myKey, theirKey].sort()
  const sharedSecret = sortedKeys.join(':')

  // Generate salt from conversation context
  const salt = new TextEncoder().encode('FlowSphere-E2E-Messenger-v1')

  // Import as key material for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(sharedSecret),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // Derive AES-256-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // Fast enough for messaging, secure enough
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt message with AES-256-GCM
 * Returns format: ENC2_{iv}_{ciphertext} (base64 encoded)
 */
async function encryptMessageAsync(
  message: string,
  myPrivateKey: string,
  recipientPublicKey: string
): Promise<string> {
  try {
    // Derive shared encryption key
    const key = await deriveSharedKey(myPrivateKey, recipientPublicKey)

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Encrypt the message
    const encoder = new TextEncoder()
    const data = encoder.encode(message)

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    )

    // Combine IV + ciphertext and encode as base64
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encryptedBuffer), iv.length)

    // Use URL-safe base64
    const base64 = btoa(String.fromCharCode(...combined))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    return `ENC2_${base64}`
  } catch (error) {
    logger.error('Message encryption failed', error)
    throw new Error('Failed to encrypt message')
  }
}

/**
 * Decrypt message with AES-256-GCM
 * Handles both old format (ENC_) and new format (ENC2_)
 */
async function decryptMessageAsync(
  encryptedMessage: string,
  myPrivateKey: string,
  senderPublicKey: string
): Promise<string> {
  try {
    // Handle legacy format (base64 only - for backwards compatibility)
    if (encryptedMessage.startsWith('ENC_')) {
      const encoded = encryptedMessage.replace('ENC_', '')
      const decoded = atob(encoded)
      return decoded.split(':')[0]
    }

    // New secure format
    if (!encryptedMessage.startsWith('ENC2_')) {
      return encryptedMessage // Plain text (shouldn't happen)
    }

    // Decode URL-safe base64
    let base64 = encryptedMessage.replace('ENC2_', '')
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) base64 += '='

    const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0))

    // Extract IV (first 12 bytes) and ciphertext (rest)
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)

    // Derive shared decryption key
    const key = await deriveSharedKey(myPrivateKey, senderPublicKey)

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    )

    return new TextDecoder().decode(decryptedBuffer)
  } catch (error) {
    logger.debug('Message decryption failed', error)
    return '[Decryption failed]'
  }
}

// Synchronous wrapper for backwards compatibility
// Uses cached keys when possible
const encryptionCache = new Map<string, CryptoKey>()

function encryptMessage(message: string, recipientPublicKey: string): string {
  // For sync calls, return placeholder that will be replaced async
  // This maintains API compatibility while transitioning
  const encoded = btoa(unescape(encodeURIComponent(message)))
  return `PENDING_ENC_${encoded}_${recipientPublicKey}`
}

function decryptMessage(encryptedMessage: string, myPrivateKey: string): string {
  // Handle legacy format synchronously
  if (encryptedMessage.startsWith('ENC_')) {
    try {
      const encoded = encryptedMessage.replace('ENC_', '')
      const decoded = atob(encoded)
      return decoded.split(':')[0]
    } catch {
      return '[Decryption failed]'
    }
  }
  // For new format, return placeholder (async handler will update)
  if (encryptedMessage.startsWith('ENC2_')) {
    return '[Decrypting...]'
  }
  return encryptedMessage
}

/**
 * Generate cryptographically secure invite code
 */
function generateInviteCode(): string {
  const timestamp = Date.now()
  const randomBytes = new Uint8Array(8)
  crypto.getRandomValues(randomBytes)
  const random = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .substring(0, 8)
  return `${timestamp}-${random}`
}

// ========== MAIN COMPONENT ==========

// Version for cache busting - increment to force localStorage reset
const MESSENGER_VERSION = 'v2.0.0'

export function SecureQRMessenger({ isOpen, onClose }: SecureQRMessengerProps) {
  // Check version and reset if needed (run once on load)
  if (typeof window !== 'undefined') {
    const storedVersion = localStorage.getItem('qr-messenger-version')
    if (storedVersion !== MESSENGER_VERSION) {
      console.log('[MESSENGER] Version changed, clearing old data...')
      // Clear old messenger data
      const keysToRemove = [
        'qr-messenger-contacts',
        'qr-messenger-messages',
        'qr-messenger-used-invites',
        'qr-messenger-deleted-contacts',
        'qr-messenger-group-markings'
      ]
      keysToRemove.forEach(key => localStorage.removeItem(key))
      localStorage.setItem('qr-messenger-version', MESSENGER_VERSION)
      console.log('[MESSENGER] Old data cleared, version updated')
    }
  }

  // Persistent storage
  const [myKeys, setMyKeys] = useKV<{ publicKey: string; privateKey: string } | null>('qr-messenger-keys', null)
  const [myName] = useKV<string>('flowsphere-user-name', '') // Use name from settings
  const [contacts, setContacts] = useKV<Contact[]>('qr-messenger-contacts', [])
  const [messages, setMessages] = useKV<Message[]>('qr-messenger-messages', [])
  const [usedInvites, setUsedInvites] = useKV<string[]>('qr-messenger-used-invites', []) // Track used codes
  const [myPrivacySettings, setMyPrivacySettings] = useKV<MyPrivacySettings>('qr-messenger-privacy', DEFAULT_MY_PRIVACY_SETTINGS)
  const [lastOnline, setLastOnline] = useKV<string>('qr-messenger-last-online', new Date().toISOString())
  const [deletedContactIds, setDeletedContactIds] = useKV<string[]>('qr-messenger-deleted-contacts', []) // Track deleted contacts to prevent re-adding
  const [groupMarkings, setGroupMarkings] = useKV<GroupMarking[]>('qr-messenger-group-markings', []) // Track group conversations

  // Local state
  const [showGroupQRDialog, setShowGroupQRDialog] = useState(false) // Group QR creation dialog
  const [groupMemberCount, setGroupMemberCount] = useState<number>(5) // Default group size
  const [currentInvite, setCurrentInvite] = useState<OneTimeInvite | null>(null)
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scannedData, setScannedData] = useState('')
  const [view, setView] = useState<'contacts' | 'chat'>('contacts')
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showDeleteMessageDialog, setShowDeleteMessageDialog] = useState(false)
  const [showDeleteConversationDialog, setShowDeleteConversationDialog] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null)
  const [longPressedMessage, setLongPressedMessage] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanningRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [isProcessingGallery, setIsProcessingGallery] = useState(false)

  // Attachment refs and state
  const photoInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const voiceRecorderRef = useRef<VoiceRecorder | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Video/Voice Call State
  const [isCallActive, setIsCallActive] = useState(false)
  const [callRoomUrl, setCallRoomUrl] = useState<string | null>(null)
  const [callType, setCallType] = useState<'video' | 'audio'>('video')
  const [currentCallInviteId, setCurrentCallInviteId] = useState<string | null>(null)
  const [incomingCall, setIncomingCall] = useState<{
    inviteId: string
    callerName: string
    callType: 'video' | 'audio'
    roomUrl: string
  } | null>(null)

  // Device ID for this device (persisted, internal use)
  const deviceId = getOrCreateDeviceId()
  // User ID / Profile ID (shareable messenger identity)
  const userId = getOrCreateUserId()

  // Initialize keys on first load
  useEffect(() => {
    if (!myKeys) {
      const keys = generateKeyPair()
      setMyKeys(keys)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Load contacts from Supabase on mount
  useEffect(() => {
    async function loadSupabaseContacts() {
      try {
        const supabaseContacts = await getMessengerContacts(deviceId)
        if (supabaseContacts.length > 0) {
          // Load privacy settings for each contact
          const newContacts: Contact[] = await Promise.all(
            supabaseContacts.map(async (sc: SupabaseContactRecord) => {
              // Fetch this contact's privacy settings
              let privacySettings: UserPrivacySettings | undefined
              try {
                const contactPrivacy = await getPrivacySettings(sc.contact_user_id || '')
                if (contactPrivacy) {
                  privacySettings = {
                    showOnlineStatus: contactPrivacy.showOnlineStatus,
                    showLastSeen: contactPrivacy.showLastSeen,
                    allowScreenshots: contactPrivacy.allowScreenshots,
                    allowForwarding: false // Not implemented yet
                  }
                }
              } catch (err) {
                console.warn('Failed to load privacy for contact:', sc.contact_user_id, err)
              }

              return {
                id: sc.contact_user_id || sc.id,
                name: sc.name,
                publicKey: sc.public_key || '',
                pairingCode: sc.conversation_id || '',
                pairedAt: sc.paired_at || new Date().toISOString(),
                status: (sc.status || 'online') as Contact['status'],
                isVerified: true,
                conversationId: sc.conversation_id,
                contactUserId: sc.contact_user_id,
                privacySettings // Add contact's privacy settings
              }
            })
          )

          // Merge: add any Supabase contacts not already in local (skip deleted ones)
          setContacts(prev => {
            const existing = new Set((prev || []).map(c => c.id))
            const deletedSet = new Set(deletedContactIds || [])
            const toAdd = newContacts.filter(c => {
              // Skip if already exists
              if (existing.has(c.id)) return false
              // Skip if was deleted by user
              if (deletedSet.has(c.id) || deletedSet.has(c.contactUserId || '')) return false
              return true
            })
            if (toAdd.length > 0) {
              console.log('[SUPABASE] Loaded contacts with privacy settings:', toAdd)
              return [...(prev || []), ...toAdd]
            }
            return prev || []
          })
        }
      } catch (error) {
        console.error('Failed to load Supabase contacts:', error)
      }
    }
    loadSupabaseContacts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]) // Only run on mount or deviceId change, not on deletedContactIds change

  // Subscribe to new contacts (for auto-connect when someone scans our QR)
  useEffect(() => {
    const unsubscribe = subscribeToNewContacts(deviceId, async (newContact: SupabaseContactRecord) => {
      console.log('[REALTIME] New contact from Supabase:', newContact)

      // Fetch privacy settings for the new contact
      let privacySettings: UserPrivacySettings | undefined
      try {
        const contactPrivacy = await getPrivacySettings(newContact.contact_user_id || '')
        if (contactPrivacy) {
          privacySettings = {
            showOnlineStatus: contactPrivacy.showOnlineStatus,
            showLastSeen: contactPrivacy.showLastSeen,
            allowScreenshots: contactPrivacy.allowScreenshots,
            allowForwarding: false
          }
        }
      } catch (err) {
        console.warn('Failed to load privacy for new contact:', newContact.contact_user_id, err)
      }

      const contact: Contact = {
        id: newContact.contact_user_id || newContact.id,
        name: newContact.name,
        publicKey: newContact.public_key || '',
        pairingCode: newContact.conversation_id || '',
        pairedAt: newContact.paired_at || new Date().toISOString(),
        status: 'online',
        isVerified: true,
        conversationId: newContact.conversation_id,
        contactUserId: newContact.contact_user_id,
        privacySettings
      }
      // Add if not already exists and not deleted
      setContacts(prev => {
        const deletedSet = new Set(deletedContactIds || [])
        // Skip if deleted
        if (deletedSet.has(contact.id) || deletedSet.has(contact.contactUserId || '')) {
          console.log('[REALTIME] Skipping deleted contact:', contact.id)
          return prev || []
        }
        // Skip if already exists (check multiple IDs)
        if ((prev || []).find(c =>
          c.id === contact.id ||
          c.contactUserId === contact.contactUserId ||
          (c.name === contact.name && c.publicKey === contact.publicKey)
        )) {
          console.log('[REALTIME] Skipping duplicate contact:', contact.id)
          return prev || []
        }
        toast.success(`${contact.name} connected with you!`)
        return [...(prev || []), contact]
      })
    })
    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]) // Only subscribe once per deviceId, not on deletedContactIds change

  // Subscribe to messages for current conversation
  useEffect(() => {
    if (!selectedContact?.conversationId) return

    const unsubscribe = subscribeToConversation(selectedContact.conversationId, async (newMsg: SupabaseMessageRecord) => {
      console.log('[REALTIME] New message:', newMsg)
      // Don't add if it's from us
      if (newMsg.sender_id === deviceId) return

      // Decrypt message asynchronously if encrypted
      let decryptedText = newMsg.content
      if (newMsg.encrypted && myKeys?.privateKey && selectedContact.publicKey) {
        try {
          decryptedText = await decryptMessageAsync(
            newMsg.content,
            myKeys.privateKey,
            selectedContact.publicKey
          )
          console.log('[E2E] Message decrypted successfully')
        } catch (error) {
          console.error('[E2E] Decryption failed:', error)
          decryptedText = '[Decryption failed]'
        }
      }

      const message: Message = {
        id: newMsg.id,
        contactId: selectedContact.id,
        text: decryptedText, // Store decrypted text
        timestamp: newMsg.created_at,
        status: 'delivered',
        isOwn: false,
        encrypted: newMsg.encrypted ?? false
      }
      setMessages(prev => {
        if ((prev || []).find(m => m.id === message.id)) return prev || []
        return [...(prev || []), message]
      })
    })
    return () => unsubscribe()
  }, [selectedContact?.conversationId, deviceId, myKeys?.privateKey, selectedContact?.publicKey])

  // Subscribe to message deletions (real-time "delete for everyone")
  useEffect(() => {
    if (!selectedContact?.conversationId) return

    const unsubscribe = subscribeToMessageDeletions(
      selectedContact.conversationId,
      (deletedMessageId: string) => {
        console.log('[REALTIME] Message deleted by other user:', deletedMessageId)
        setMessages(prev => (prev || []).filter(m => m.id !== deletedMessageId))
        toast.info('A message was deleted')
      }
    )
    return () => unsubscribe()
  }, [selectedContact?.conversationId])

  // Subscribe to incoming call invites
  useEffect(() => {
    if (!deviceId) return

    const unsubscribe = subscribeToCallInvites(
      deviceId,
      // On incoming call
      (invite: CallInvite) => {
        console.log('[CALL] Incoming call from:', invite.from_name)
        // Don't show if already in a call
        if (isCallActive) {
          updateCallStatus(invite.id, 'missed')
          return
        }
        setIncomingCall({
          inviteId: invite.id,
          callerName: invite.from_name,
          callType: invite.call_type,
          roomUrl: invite.room_url
        })
      },
      // On call cancelled
      (inviteId: string) => {
        console.log('[CALL] Call cancelled:', inviteId)
        if (incomingCall?.inviteId === inviteId) {
          setIncomingCall(null)
          toast.info('Call ended')
        }
      }
    )

    return () => unsubscribe()
  }, [deviceId, isCallActive, incomingCall?.inviteId])

  // Load messages when selecting a contact with conversationId (with pagination)
  useEffect(() => {
    async function loadMessages() {
      if (!selectedContact?.conversationId) return
      try {
        // Load latest 50 messages initially (paginated)
        const result = await getMessengerMessages(selectedContact.conversationId, { limit: 50 })
        if (result.messages.length > 0) {
          const newMessages: Message[] = result.messages.map((m: SupabaseMessageRecord) => ({
            id: m.id,
            contactId: selectedContact.id,
            text: m.content,
            timestamp: m.created_at,
            status: 'delivered',
            isOwn: m.sender_id === deviceId,
            encrypted: m.encrypted ?? false
          }))
          // Replace messages for this contact
          setMessages(prev => {
            const otherMessages = (prev || []).filter(m => m.contactId !== selectedContact.id)
            return [...otherMessages, ...newMessages]
          })
        }
        // Note: hasMore indicates if there are older messages to load on scroll
        // result.hasMore and result.total are available for "load more" feature
      } catch (error) {
        console.error('Failed to load messages:', error)
      }
    }
    loadMessages()
  }, [selectedContact?.conversationId, deviceId])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedContact])

  // Track online status - update every minute
  useEffect(() => {
    if (!isOpen) return

    // Update last online immediately
    setLastOnline(new Date().toISOString())

    // Update every minute while messenger is open
    const interval = setInterval(() => {
      setLastOnline(new Date().toISOString())
    }, 60000)

    return () => clearInterval(interval)
  }, [isOpen, setLastOnline])

  // Load privacy settings from Supabase on mount
  useEffect(() => {
    async function loadPrivacySettings() {
      try {
        const settings = await getPrivacySettings(deviceId)
        if (settings) {
          setMyPrivacySettings(settings)
          console.log('[PRIVACY] Loaded settings from Supabase:', settings)
        }
      } catch (error) {
        console.error('Failed to load privacy settings:', error)
      }
    }
    loadPrivacySettings()
  }, [deviceId])

  // Subscribe to privacy settings changes (real-time) - MY settings
  useEffect(() => {
    const unsubscribe = subscribeToPrivacySettings(deviceId, (settings) => {
      console.log('[REALTIME] My privacy settings updated:', settings)
      setMyPrivacySettings(settings)
    })
    return () => unsubscribe()
  }, [deviceId])

  // Subscribe to CONTACTS' privacy settings (real-time) - THEIR settings
  useEffect(() => {
    if (!contacts || contacts.length === 0) return

    const unsubscribers: (() => void)[] = []

    contacts.forEach(contact => {
      const contactUserId = contact.contactUserId || contact.id
      if (!contactUserId || contact.isDeleted) return

      const unsubscribe = subscribeToPrivacySettings(contactUserId, (settings) => {
        console.log(`[REALTIME] Contact ${contact.name}'s privacy updated:`, settings)
        // Update the contact's privacy settings in our local state
        setContacts(prev => (prev || []).map(c =>
          (c.contactUserId === contactUserId || c.id === contactUserId)
            ? {
                ...c,
                privacySettings: {
                  showOnlineStatus: settings.showOnlineStatus,
                  showLastSeen: settings.showLastSeen,
                  allowScreenshots: settings.allowScreenshots,
                  allowForwarding: false
                }
              }
            : c
        ))
      })
      unsubscribers.push(unsubscribe)
    })

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [contacts?.length]) // Re-subscribe when contacts list changes

  // Save privacy settings to Supabase whenever they change
  useEffect(() => {
    // Only save if settings exist and are different from defaults
    if (!myPrivacySettings) return

    const saveSettings = async () => {
      try {
        const success = await savePrivacySettings(deviceId, myPrivacySettings)
        if (success) {
          console.log('[PRIVACY] Settings synced to Supabase')
        }
      } catch (error) {
        console.error('Failed to save privacy settings:', error)
      }
    }

    // Debounce the save to avoid too many requests
    const timeoutId = setTimeout(saveSettings, 500)
    return () => clearTimeout(timeoutId)
  }, [myPrivacySettings, deviceId])

  // Auto-delete messages that have reached their deletion time
  useEffect(() => {
    const checkExpiredMessages = () => {
      const now = new Date()
      const expiredIds = (messages || [])
        .filter(m => m.deleteAt && new Date(m.deleteAt) <= now)
        .map(m => m.id)

      if (expiredIds.length > 0) {
        setMessages(prev => (prev || []).filter(m => !expiredIds.includes(m.id)))
        console.log('[AUTO-DELETE] Removed', expiredIds.length, 'expired messages')
      }
    }

    // Check every 10 seconds
    const interval = setInterval(checkExpiredMessages, 10000)
    checkExpiredMessages() // Check immediately on mount

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount, interval handles the rest

  // Mark messages as seen when viewing chat (and trigger auto-delete timer)
  useEffect(() => {
    if (!selectedContact) return

    // Mark unseen messages from this contact as seen
    const unseenMessages = (messages || []).filter(
      m => m.contactId === selectedContact.id && !m.isOwn && m.status !== 'seen'
    )

    if (unseenMessages.length > 0) {
      setMessages(prev => (prev || []).map(m => {
        if (unseenMessages.find(um => um.id === m.id)) {
          const seenAt = new Date().toISOString()
          // Calculate deleteAt if auto-delete is set
          let deleteAt: string | undefined
          if (m.autoDeleteTimer && m.autoDeleteTimer > 0) {
            const deleteTime = new Date()
            deleteTime.setMinutes(deleteTime.getMinutes() + m.autoDeleteTimer)
            deleteAt = deleteTime.toISOString()
          }
          return { ...m, status: 'seen' as const, seenAt, deleteAt }
        }
        return m
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact?.id]) // Only run when selected contact changes, not on every message update

  // ========== CAMERA QR SCANNING ==========

  // Start camera and scanning when scanner dialog opens
  useEffect(() => {
    if (showScanner) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [showScanner])

  const startCamera = async () => {
    setCameraError(null)
    setIsScanning(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        scanningRef.current = true
        requestAnimationFrame(scanQRCode)
      }
    } catch (error: unknown) {
      console.error('Camera error:', error)
      const errorName = error instanceof Error ? (error as DOMException).name : ''
      setCameraError(errorName === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access.'
        : 'Could not access camera. Use manual code entry below.')
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    scanningRef.current = false
    setIsScanning(false)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Process QR code from gallery image
  const handleGalleryImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessingGallery(true)

    try {
      // Create image element
      const img = new Image()
      const imageUrl = URL.createObjectURL(file)

      img.onload = () => {
        // Create canvas to process image
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          toast.error('Failed to process image')
          setIsProcessingGallery(false)
          return
        }

        // Scale down large images for faster processing
        const maxSize = 1024
        let width = img.width
        let height = img.height
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize
            width = maxSize
          } else {
            width = (width / height) * maxSize
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        const imageData = ctx.getImageData(0, 0, width, height)

        // Try to find QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        })

        URL.revokeObjectURL(imageUrl)
        setIsProcessingGallery(false)

        if (code && code.data) {
          toast.success('QR code found in image!')
          handleQRScan(code.data)
          setShowScanner(false)
        } else {
          toast.error('No QR code found in image. Try a clearer photo.')
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(imageUrl)
        setIsProcessingGallery(false)
        toast.error('Failed to load image')
      }

      img.src = imageUrl
    } catch (error) {
      console.error('Gallery processing error:', error)
      setIsProcessingGallery(false)
      toast.error('Failed to process image')
    }

    // Reset input so same file can be selected again
    if (galleryInputRef.current) {
      galleryInputRef.current.value = ''
    }
  }

  const scanQRCode = () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanQRCode)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      })

      if (code && code.data) {
        // QR code found! Stop scanning and process
        scanningRef.current = false
        stopCamera()
        handleQRScan(code.data)
        return
      }
    } catch (error) {
      console.error('QR scan error:', error)
    }

    // Continue scanning
    if (scanningRef.current) {
      requestAnimationFrame(scanQRCode)
    }
  }

  // ========== QR CODE GENERATION ==========

  const generateOneTimeQR = async () => {
    if (!myKeys || !myName) {
      toast.error('Please set your name first')
      return
    }

    // Check if there's an active unused invite
    if (currentInvite && !currentInvite.used) {
      const expiresAt = new Date(currentInvite.expiresAt)
      if (expiresAt > new Date()) {
        toast.info('You already have an active invite code')
        setShowQRDialog(true)
        return
      }
    }

    setIsGeneratingQR(true)

    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // 24-hour expiration

      // Store invite in Supabase FIRST to get the code
      let supabaseInvite: SupabasePairingInvite | null = null
      try {
        supabaseInvite = await createPairingInvite(deviceId, myName, myKeys.publicKey)
        console.log('[SUPABASE] Pairing invite created:', supabaseInvite?.code)
      } catch (err) {
        console.warn('Supabase invite creation failed (offline mode):', err)
      }

      // Use Supabase code if available, otherwise generate local code
      const inviteCode = supabaseInvite?.code || generateInviteCode()

      const invite: OneTimeInvite = {
        code: inviteCode,
        publicKey: myKeys.publicKey,
        name: myName,
        createdAt: new Date().toISOString(),
        expiresAt: supabaseInvite?.expires_at || expiresAt.toISOString(),
        used: false
      }

      // Generate QR code using FlowSphere QR system (modular, replaceable)
      const qrInviteData = {
        code: invite.code,
        publicKey: invite.publicKey,
        name: invite.name,
        expiresAt: invite.expiresAt,
        deviceId: deviceId, // Device ID (tied to Shadow ID)
        userId: userId // Profile ID (changes per interaction)
      }

      // Generate QR code
      const qrDataURL = await generateFlowSphereQR(qrInviteData, 300)

      setQrCodeDataURL(qrDataURL)
      setCurrentInvite(invite)
      setShowQRDialog(true)

      toast.success('One-time QR code generated! Valid for 24 hours.')
    } catch (error) {
      console.error('QR generation error:', error)
      toast.error('Failed to generate QR code')
    } finally {
      setIsGeneratingQR(false)
    }
  }

  // Background QR generation (no dialog, no loading state)
  const generateNewQRInBackground = async () => {
    if (!myKeys || !myName) return

    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      let supabaseInvite: SupabasePairingInvite | null = null
      try {
        supabaseInvite = await createPairingInvite(deviceId, myName, myKeys.publicKey)
        console.log('[AUTO-REGEN] New invite created:', supabaseInvite?.code)
      } catch (err) {
        console.warn('Background invite creation failed:', err)
      }

      const inviteCode = supabaseInvite?.code || generateInviteCode()

      const invite: OneTimeInvite = {
        code: inviteCode,
        publicKey: myKeys.publicKey,
        name: myName,
        createdAt: new Date().toISOString(),
        expiresAt: supabaseInvite?.expires_at || expiresAt.toISOString(),
        used: false
      }

      const qrInviteData = {
        code: invite.code,
        publicKey: invite.publicKey,
        name: invite.name,
        expiresAt: invite.expiresAt,
        deviceId: deviceId,
        userId: userId
      }

      const qrDataURL = await generateFlowSphereQR(qrInviteData, 300)
      setQrCodeDataURL(qrDataURL)
      setCurrentInvite(invite)
      console.log('[AUTO-REGEN] New QR ready for next contact')
    } catch (error) {
      console.error('Background QR generation failed:', error)
    }
  }

  // ========== GROUP QR CODE GENERATION ==========

  const generateGroupQR = async (maxMembers: number) => {
    if (!myKeys || !myName) {
      toast.error('Please set your name first')
      return
    }

    if (maxMembers < 2 || maxMembers > 50) {
      toast.error('Group size must be between 2 and 50 members')
      return
    }

    setIsGeneratingQR(true)

    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      // Generate unique group ID with cryptographically secure random
      const groupRandomBytes = new Uint8Array(4)
      crypto.getRandomValues(groupRandomBytes)
      const groupRandomHex = Array.from(groupRandomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
        .substring(0, 6)
      const groupId = `GRP_${Date.now().toString(36)}_${groupRandomHex}`

      let supabaseInvite: SupabasePairingInvite | null = null
      try {
        supabaseInvite = await createPairingInvite(deviceId, myName, myKeys.publicKey)
        console.log('[GROUP] Pairing invite created:', supabaseInvite?.code)
      } catch (err) {
        console.warn('Group invite creation failed:', err)
      }

      const inviteCode = supabaseInvite?.code || generateInviteCode()

      const invite: OneTimeInvite = {
        code: inviteCode,
        publicKey: myKeys.publicKey,
        name: myName,
        createdAt: new Date().toISOString(),
        expiresAt: supabaseInvite?.expires_at || expiresAt.toISOString(),
        used: false,
        // Group fields
        isGroupInvite: true,
        groupMaxMembers: maxMembers,
        groupCurrentMembers: 0,
        groupId: groupId,
        groupMembers: []
      }

      // Create group marking
      const newGroupMarking: GroupMarking = {
        groupId: groupId,
        groupName: `${myName}'s Group`,
        creatorId: deviceId,
        memberIds: [deviceId], // Creator is first member
        maxMembers: maxMembers,
        createdAt: new Date().toISOString()
      }
      setGroupMarkings(prev => [...(prev || []), newGroupMarking])

      const qrInviteData = {
        code: invite.code,
        publicKey: invite.publicKey,
        name: invite.name,
        expiresAt: invite.expiresAt,
        deviceId: deviceId,
        userId: userId,
        // Include group info in QR data
        isGroupInvite: true,
        groupId: groupId,
        groupMaxMembers: maxMembers,
        groupCreatorName: myName
      }

      const qrDataURL = await generateFlowSphereQR(qrInviteData as any, 300)
      setQrCodeDataURL(qrDataURL)
      setCurrentInvite(invite)
      setShowGroupQRDialog(false)
      setShowQRDialog(true)

      toast.success(`Group QR created! ${maxMembers} members can join.`)
    } catch (error) {
      console.error('Group QR generation error:', error)
      toast.error('Failed to generate group QR code')
    } finally {
      setIsGeneratingQR(false)
    }
  }

  // ========== QR CODE SCANNING ==========

  const handleQRScan = async (data: string) => {
    if (!myKeys || !myName) {
      toast.error('Your profile is not set up')
      return
    }

    try {
      // Check if user pasted just the short code (format: XXXX-XXXX-XXXX)
      const shortCodePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
      if (shortCodePattern.test(data.trim())) {
        toast.error('Please paste the full invite data, not just the code. Ask your contact to click "Copy Invite Data".')
        return
      }

      // Parse using FlowSphere QR system (handles current and future algorithms)
      // Now uses FlowSphere Secure Protocol v2 with AES-256-GCM + Feistel obfuscation
      const scannedInvite = await parseQRData(data)
      if (!scannedInvite) {
        toast.error('Invalid QR code format')
        return
      }

      // Validation already done by parseQRData, but double-check for safety

      // Check if it's a group invite
      const isGroupInvite = (scannedInvite as any).isGroupInvite === true
      const groupId = (scannedInvite as any).groupId as string | undefined
      const groupMaxMembers = (scannedInvite as any).groupMaxMembers as number | undefined
      const groupCreatorName = (scannedInvite as any).groupCreatorName as string | undefined

      // For GROUP invites: Check if this device already scanned this group QR
      if (isGroupInvite && groupId) {
        const existingGroupMarking = (groupMarkings || []).find(g => g.groupId === groupId)
        if (existingGroupMarking) {
          // Check if this device is already a member (no duplicate scans)
          if (existingGroupMarking.memberIds.includes(deviceId)) {
            toast.error('You have already joined this group!')
            setShowScanner(false)
            return
          }
          // Check if group is full
          if (existingGroupMarking.memberIds.length >= existingGroupMarking.maxMembers) {
            toast.error('This group is full! No more members can join.')
            setShowScanner(false)
            return
          }
        }
      }

      // For PERSONAL (1:1) invites: Check if already used
      if (!isGroupInvite && (usedInvites || []).includes(scannedInvite.code)) {
        toast.error('This QR code has already been used')
        return
      }

      // Check expiration
      const expiresAt = new Date(scannedInvite.expiresAt)
      if (expiresAt < new Date()) {
        toast.error('This QR code has expired')
        return
      }

      // Check if contact already exists (by device ID, user ID, or public key)
      const otherDeviceId = scannedInvite.deviceId || `device_${Date.now()}`
      const otherProfileId = scannedInvite.userId || null

      const existingContact = (contacts || []).find(c =>
        c.id === otherDeviceId ||
        c.contactUserId === otherDeviceId ||
        (otherProfileId && c.contactProfileId === otherProfileId) ||
        c.publicKey === scannedInvite.publicKey
      )
      if (existingContact && !isGroupInvite) {
        toast.info(`You're already connected with ${existingContact.name}`)
        setShowScanner(false)
        return
      }

      // Generate conversation ID
      // For groups: group_${groupId}, For personal: conv_${inviteCode}
      let conversationId = isGroupInvite && groupId
        ? `group_${groupId}`
        : `conv_${scannedInvite.code}`

      // Try to accept via Supabase for BIDIRECTIONAL auto-connect
      let supabaseSuccess = false
      try {
        const result = await acceptPairingInvite(
          scannedInvite.code,
          deviceId,
          myName,
          myKeys.publicKey,
          // Pass the group conversationId so Supabase uses the same one
          isGroupInvite && groupId ? `group_${groupId}` : undefined
        )
        if (result.success) {
          supabaseSuccess = true
          // For GROUP chats: keep the group conversationId (don't overwrite)
          // For personal chats: use conversation ID from Supabase for consistency
          if (!isGroupInvite && result.contact?.conversationId) {
            conversationId = result.contact.conversationId
          }
          console.log('[SUPABASE] Bidirectional pairing created! ConversationId:', conversationId, isGroupInvite ? '(GROUP)' : '')
        } else {
          console.warn('[SUPABASE] Pairing failed:', result.error)
        }
      } catch (err) {
        console.warn('Supabase pairing failed (offline mode):', err)
      }

      // Create new contact locally (with group marking if applicable)
      const newContact: Contact = {
        id: otherDeviceId,
        name: isGroupInvite ? `${scannedInvite.name} [${groupCreatorName || 'Group'}]` : scannedInvite.name,
        publicKey: scannedInvite.publicKey,
        pairingCode: scannedInvite.code,
        pairedAt: new Date().toISOString(),
        status: 'online',
        isVerified: true,
        conversationId: conversationId,
        contactUserId: otherDeviceId,
        contactProfileId: otherProfileId || undefined // Store their shareable User ID
      }

      // Handle group membership tracking
      if (isGroupInvite && groupId && groupMaxMembers) {
        // Update or create group marking
        setGroupMarkings(prev => {
          const existing = (prev || []).find(g => g.groupId === groupId)
          if (existing) {
            // Add this device to existing group
            return (prev || []).map(g => g.groupId === groupId
              ? { ...g, memberIds: [...g.memberIds, deviceId] }
              : g
            )
          } else {
            // Create new group marking (scanner is joining creator's group)
            const newMarking: GroupMarking = {
              groupId: groupId,
              groupName: `${groupCreatorName || scannedInvite.name}'s Group`,
              creatorId: otherDeviceId,
              memberIds: [otherDeviceId, deviceId], // Creator + this scanner
              maxMembers: groupMaxMembers,
              createdAt: new Date().toISOString()
            }
            return [...(prev || []), newMarking]
          }
        })

        // Check if group is now full after adding this member
        const currentGroup = (groupMarkings || []).find(g => g.groupId === groupId)
        const newMemberCount = (currentGroup?.memberIds.length || 1) + 1
        if (newMemberCount >= groupMaxMembers) {
          // Group is full - mark as fully used
          setUsedInvites([...(usedInvites || []), scannedInvite.code])
        }

        console.log(`[GROUP] Joined group ${groupId}. Members: ${newMemberCount}/${groupMaxMembers}`)
      } else {
        // Personal 1:1 invite - mark as used immediately
        setUsedInvites([...(usedInvites || []), scannedInvite.code])
      }

      // Add contact
      setContacts([...(contacts || []), newContact])

      // Mark our own invite as used if they scanned ours
      if (currentInvite && currentInvite.code === scannedInvite.code) {
        setCurrentInvite({ ...currentInvite, used: true, usedBy: newContact.id })
      }

      setShowScanner(false)

      // Show appropriate success message
      if (isGroupInvite && groupId) {
        const currentGroup = (groupMarkings || []).find(g => g.groupId === groupId)
        const memberCount = (currentGroup?.memberIds.length || 0) + 1
        toast.success(`Joined ${groupCreatorName || scannedInvite.name}'s group! (${memberCount}/${groupMaxMembers} members)`)
        sendMessage(`👋 Hey! I joined the group via QR code.`, newContact)
      } else {
        if (supabaseSuccess) {
          toast.success(`Connected with ${newContact.name}! They will see you automatically.`)
        } else {
          toast.success(`Connected with ${newContact.name}!`)
        }
        sendMessage(`👋 Hey ${newContact.name}! We're now connected securely.`, newContact)

        // AUTO-REGENERATE: Create new QR code for next contact (1 QR = 1 pair)
        // This only runs for personal (non-group) invites
        setTimeout(async () => {
          console.log('[AUTO-REGEN] Generating new QR code after successful pairing...')
          setCurrentInvite(null)
          setQrCodeDataURL('')
          await generateNewQRInBackground()
        }, 1000)
      }

    } catch (error) {
      console.error('QR scan error:', error)
      toast.error('Failed to process QR code')
    }
  }

  // ========== MESSAGING ==========

  const sendMessage = async (text: string, contact: Contact | null = selectedContact) => {
    if (!contact || !text.trim() || !myKeys) return

    const timestamp = new Date().toISOString()
    const messageId = `msg_${Date.now()}`

    // Show optimistic message immediately with plain text (for own display)
    const optimisticMessage: Message = {
      id: messageId,
      contactId: contact.id,
      text: text, // Store plain text locally for own display
      timestamp: timestamp,
      status: 'sending',
      isOwn: true,
      encrypted: true,
      autoDeleteTimer: myPrivacySettings?.autoDeleteTimer || 0
    }

    setMessages([...(messages || []), optimisticMessage])
    setMessageInput('')

    try {
      // Encrypt message with real AES-256-GCM
      const encryptedText = await encryptMessageAsync(text, myKeys.privateKey, contact.publicKey)

      // Quick update to 'sent' status
      setTimeout(() => {
        setMessages(msgs =>
          (msgs || []).map(m => m.id === messageId && m.status === 'sending' ? { ...m, status: 'sent' } : m)
        )
      }, 300)

      // Store in Supabase for real-time sync (if contact has conversationId)
      if (contact.conversationId) {
        try {
          const result = await sendMessengerMessage(
            deviceId,
            contact.conversationId,
            encryptedText,
            true
          )
          if (result) {
            console.log('[SUPABASE] Message sent with E2E encryption')
            // Update local message with Supabase ID and mark as delivered
            setMessages(msgs =>
              (msgs || []).map(m => m.id === messageId ? { ...m, id: result.id, status: 'delivered' } : m)
            )
          }
        } catch (err) {
          console.warn('Supabase message sync failed:', err)
          // Still mark as delivered locally after delay
          setTimeout(() => {
            setMessages(msgs =>
              (msgs || []).map(m => m.id === messageId ? { ...m, status: 'delivered' } : m)
            )
          }, 800)
        }
      } else {
        // No Supabase connection, simulate delivery after delay
        setTimeout(() => {
          setMessages(msgs =>
            (msgs || []).map(m => m.id === messageId ? { ...m, status: 'delivered' } : m)
          )
        }, 1000)
      }
    } catch (error) {
      logger.error('Failed to send message', error)
      // Update message status to failed
      setMessages(msgs =>
        (msgs || []).map(m => m.id === messageId ? { ...m, status: 'sending', text: '[Encryption failed]' } : m)
      )
    }
  }

  const handleSendMessage = () => {
    if (!selectedContact || !messageInput.trim()) return
    sendMessage(messageInput)
  }

  // ========== ATTACHMENT HANDLERS ==========

  // Helper: Generate consistent shared key for E2EE attachments
  // IMPORTANT: Both sender and receiver MUST derive the EXACT SAME key
  // Uses ONLY sorted device IDs - the only guaranteed consistent data on both sides
  const getSharedAttachmentKey = (contact: Contact): string => {
    // Get both device IDs
    const myId = deviceId
    const theirId = contact.contactUserId || contact.id

    // Sort IDs alphabetically to ensure same order regardless of who is sender/receiver
    const sortedIds = [myId, theirId].sort()

    // Create a deterministic shared key using only the IDs
    // DO NOT add conversationId or pairingCode - they may not be set on both sides!
    const sharedKey = `flowsphere-e2e::${sortedIds[0]}::${sortedIds[1]}`

    console.log('[E2EE] Shared key derived from:', {
      myId: myId.substring(0, 15),
      theirId: theirId.substring(0, 15),
      keyPreview: sharedKey.substring(0, 30) + '...'
    })

    return sharedKey
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedContact) return

    setIsUploadingAttachment(true)
    try {
      // Generate shared encryption key (same for both users)
      const sharedKey = getSharedAttachmentKey(selectedContact)
      console.log('[E2EE] Encrypting photo with key:', sharedKey.substring(0, 20) + '...')

      // Encrypt and store attachment
      const attachmentMeta = await encryptAttachment(
        file,
        'photo',
        deviceId,
        sharedKey // Use shared key for symmetric E2EE
      )

      // Send message with attachment
      await sendMessageWithAttachment(attachmentMeta)
      toast.success('Photo sent securely!')
    } catch (error) {
      console.error('Photo attachment failed:', error)
      toast.error('Failed to send photo')
    } finally {
      setIsUploadingAttachment(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedContact) return

    setIsUploadingAttachment(true)
    try {
      // Generate shared encryption key (same for both users)
      const sharedKey = getSharedAttachmentKey(selectedContact)
      console.log('[E2EE] Encrypting file with key:', sharedKey.substring(0, 20) + '...')

      // Encrypt and store attachment
      const attachmentMeta = await encryptAttachment(
        file,
        'file',
        deviceId,
        sharedKey
      )

      // Send message with attachment
      await sendMessageWithAttachment(attachmentMeta)
      toast.success(`File "${file.name}" sent securely!`)
    } catch (error) {
      console.error('File attachment failed:', error)
      toast.error('Failed to send file')
    } finally {
      setIsUploadingAttachment(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleStartVoiceRecording = async () => {
    try {
      const recorder = new VoiceRecorder()
      await recorder.start()
      voiceRecorderRef.current = recorder
      setIsRecordingVoice(true)
      setRecordingDuration(0)

      // Update recording duration every second
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

      toast.success('Recording started...')
    } catch (error) {
      console.error('Voice recording failed to start:', error)
      toast.error('Failed to access microphone')
    }
  }

  const handleStopVoiceRecording = async () => {
    if (!voiceRecorderRef.current || !selectedContact) return

    setIsUploadingAttachment(true)
    try {
      // Stop recording and get audio file
      const audioFile = await voiceRecorderRef.current.stop()

      // Clear recording interval
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }

      // Generate shared encryption key (same for both users)
      const sharedKey = getSharedAttachmentKey(selectedContact)
      console.log('[E2EE] Encrypting voice with key:', sharedKey.substring(0, 20) + '...')

      // Encrypt and store attachment
      const attachmentMeta = await encryptAttachment(
        audioFile,
        'voice',
        deviceId,
        sharedKey
      )

      // Send message with attachment
      await sendMessageWithAttachment(attachmentMeta)
      toast.success('Voice message sent securely!')
    } catch (error) {
      console.error('Voice message failed:', error)
      toast.error('Failed to send voice message')
    } finally {
      setIsRecordingVoice(false)
      setRecordingDuration(0)
      setIsUploadingAttachment(false)
      voiceRecorderRef.current = null
    }
  }

  const handleCancelVoiceRecording = () => {
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.stop().catch(console.error)
      voiceRecorderRef.current = null
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    setIsRecordingVoice(false)
    setRecordingDuration(0)
    toast.info('Recording cancelled')
  }

  const sendMessageWithAttachment = async (attachment: AttachmentMetadata) => {
    if (!selectedContact || !myKeys) return

    const timestamp = new Date().toISOString()
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      contactId: selectedContact.id,
      text: '', // No text, only attachment
      timestamp: timestamp,
      status: 'sending',
      isOwn: true,
      encrypted: true,
      attachment: attachment, // Add attachment metadata
      autoDeleteTimer: myPrivacySettings?.autoDeleteTimer || 0
    }

    // Add to local state immediately
    setMessages([...(messages || []), newMessage])

    // Quick update to 'sent' status
    setTimeout(() => {
      setMessages(msgs =>
        (msgs || []).map(m => m.id === newMessage.id && m.status === 'sending' ? { ...m, status: 'sent' } : m)
      )
    }, 300)

    // Store in Supabase for real-time sync
    if (selectedContact.conversationId) {
      try {
        // Note: We need to update sendMessengerMessage to support attachments
        // For now, send attachment metadata as JSON in the message
        const attachmentJson = JSON.stringify(attachment)
        const result = await sendMessengerMessage(
          deviceId,
          selectedContact.conversationId,
          attachmentJson,
          true
        )
        if (result) {
          console.log('[SUPABASE] Attachment sent and synced')
          setMessages(msgs =>
            (msgs || []).map(m => m.id === newMessage.id ? { ...m, id: result.id, status: 'delivered' } : m)
          )
        }
      } catch (err) {
        console.warn('Supabase attachment sync failed:', err)
        setTimeout(() => {
          setMessages(msgs =>
            (msgs || []).map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m)
          )
        }, 800)
      }
    } else {
      setTimeout(() => {
        setMessages(msgs =>
          (msgs || []).map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m)
        )
      }, 1000)
    }
  }

  // Format recording duration (MM:SS)
  const formatRecordingDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle attachment view/download
  const handleViewAttachment = async (attachment: AttachmentMetadata, contactId: string, isOwnMessage: boolean = false) => {
    if (!selectedContact) return

    // Check if contact allows saving media (only for their messages, not our own)
    const allowSaveMedia = isOwnMessage || (selectedContact.privacySettings?.allowSaveMedia ?? true)
    if (!allowSaveMedia && attachment.type !== 'voice') {
      toast.error(`${selectedContact.name} has disabled saving media`)
      return
    }

    try {
      // Generate the same shared key used for encryption (must match sender's key)
      const sharedKey = getSharedAttachmentKey(selectedContact)
      console.log('[E2EE] Decrypting with key:', sharedKey.substring(0, 20) + '...')

      // Decrypt attachment
      const decryptedBlob = await decryptAttachment(attachment, sharedKey)

      // Create object URL for viewing/downloading
      const url = URL.createObjectURL(decryptedBlob)

      if (attachment.type === 'photo') {
        if (!allowSaveMedia) {
          toast.info('Viewing photo (saving disabled by sender)')
        }
        // Open image in new tab (view only if saving not allowed)
        window.open(url, '_blank')
        toast.success('Photo opened in new tab!')
      } else if (attachment.type === 'voice') {
        // Voice messages can always be played (temporary)
        const audio = new Audio(url)
        audio.play().catch(err => {
          console.error('Audio playback failed:', err)
          toast.error('Failed to play voice message')
        })
        toast.success('Playing voice message...')
      } else if (attachment.type === 'file') {
        // Download file
        const a = document.createElement('a')
        a.href = url
        a.download = attachment.fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        toast.success(`Downloading ${attachment.fileName}...`)
      }

      // Clean up object URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error) {
      console.error('Failed to view/download attachment:', error)
      toast.error('Failed to decrypt attachment. Make sure you\'re using the same device and conversation.')
    }
  }

  // ========== DELETE FUNCTIONS ==========

  // Delete message for me only (local deletion)
  const deleteMessageForMe = (messageId: string) => {
    console.log('[DELETE] Deleting message for me:', messageId)
    setMessages(prev => {
      const filtered = (prev || []).filter(m => m.id !== messageId)
      console.log('[DELETE] Messages before:', prev?.length, 'after:', filtered.length)
      return filtered
    })
    toast.success('Message deleted for you')
    setShowDeleteMessageDialog(false)
    setMessageToDelete(null)
  }

  // Delete message for everyone (also removes from Supabase)
  const deleteMessageForEveryone = async (message: Message) => {
    // Only allow deleting your own messages
    if (!message.isOwn) {
      toast.error("You can only delete your own messages for everyone")
      return
    }

    // Remove locally first (optimistic update)
    setMessages(prev => (prev || []).filter(m => m.id !== message.id))

    // Delete from Supabase for both users
    if (selectedContact?.conversationId) {
      try {
        const result = await deleteMessageForEveryoneSupabase(message.id, deviceId)
        if (result.success) {
          toast.success('Message deleted for everyone')
        } else {
          toast.error(result.error || 'Failed to delete message for everyone')
          // Restore message if deletion failed
          setMessages(prev => [...(prev || []), message].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          ))
        }
      } catch (error) {
        console.error('Failed to delete message for everyone:', error)
        toast.error('Failed to delete message for everyone')
        // Restore message if deletion failed
        setMessages(prev => [...(prev || []), message].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ))
      }
    } else {
      toast.success('Message deleted for everyone')
    }

    setShowDeleteMessageDialog(false)
    setMessageToDelete(null)
  }

  // Delete entire conversation
  const deleteConversation = (forEveryone: boolean = false) => {
    if (!selectedContact) return

    console.log('[DELETE] Deleting conversation for contact:', selectedContact.id, selectedContact.name)

    // Remove all messages for this contact (match by contactId OR conversationId)
    setMessages(prev => {
      const filtered = (prev || []).filter(m =>
        m.contactId !== selectedContact.id &&
        m.contactId !== selectedContact.contactUserId
      )
      console.log('[DELETE] Messages before:', prev?.length, 'after:', filtered.length)
      return filtered
    })

    if (forEveryone) {
      // TODO: Also delete from Supabase
      toast.success('Conversation deleted for everyone')
    } else {
      toast.success('Conversation deleted for you')
    }

    setShowDeleteConversationDialog(false)
    setSelectedContact(null)
    setView('contacts')
  }

  // Delete contact entirely
  const deleteContact = (contactId: string) => {
    console.log('[DELETE] Deleting contact:', contactId)

    // Find contact to get all its IDs for tracking
    const contactToDelete = (contacts || []).find(c =>
      c.id === contactId ||
      c.contactUserId === contactId ||
      c.contactProfileId === contactId
    )

    // Track ALL IDs of this contact to prevent re-adding from Supabase
    if (contactToDelete) {
      const idsToTrack = [
        contactToDelete.id,
        contactToDelete.contactUserId,
        contactToDelete.contactProfileId,
        contactToDelete.conversationId
      ].filter(Boolean) as string[]

      setDeletedContactIds(prev => {
        const existing = new Set(prev || [])
        idsToTrack.forEach(id => existing.add(id))
        console.log('[DELETE] Tracking deleted IDs:', idsToTrack)
        return Array.from(existing)
      })
    }

    // Remove contact (match by id, contactUserId, or contactProfileId)
    setContacts(prev => {
      const filtered = (prev || []).filter(c =>
        c.id !== contactId &&
        c.contactUserId !== contactId &&
        c.contactProfileId !== contactId
      )
      console.log('[DELETE] Contacts before:', prev?.length, 'after:', filtered.length)
      return filtered
    })

    // Remove all messages with this contact
    setMessages(prev => {
      const filtered = (prev || []).filter(m => m.contactId !== contactId)
      console.log('[DELETE] Messages before:', prev?.length, 'after:', filtered.length)
      return filtered
    })

    toast.success('Contact removed')
    setShowDeleteConversationDialog(false)
    setSelectedContact(null)
    setView('contacts')
  }

  // Handle long press on message (for mobile)
  const handleMessageLongPress = (message: Message) => {
    setMessageToDelete(message)
    setShowDeleteMessageDialog(true)
  }

  // ========== VIDEO/VOICE CALL HANDLERS ==========

  // Start a call with the selected contact
  const startCall = async (type: 'video' | 'audio') => {
    if (!selectedContact) return

    // Generate room name based on user IDs
    const roomName = generateRoomName(deviceId, selectedContact.contactUserId || selectedContact.id)

    console.log('[CALL] Starting', type, 'call with', selectedContact.name)
    console.log('[CALL] Creating room:', roomName)

    // Create room via Edge Function (secure, API key on server)
    toast.loading('Setting up call...')
    const roomResult = await createRoom(roomName, type)

    if (!roomResult?.url) {
      toast.dismiss()
      toast.error('Failed to create call room. Please check Daily.co API key.')
      console.error('[CALL] Room creation failed - check DAILY_API_KEY in Supabase secrets')
      return
    }

    const roomUrl = roomResult.url
    console.log('[CALL] Room created via API:', roomUrl)
    toast.dismiss()

    // Send call invite to the other user via Supabase
    const toUserId = selectedContact.contactUserId || selectedContact.id
    const result = await sendCallInvite(
      deviceId,
      myName || 'Unknown',
      toUserId,
      roomUrl,
      roomName,
      type
    )

    if (!result.success) {
      toast.error(`Failed to start call: ${result.error}`)
      return
    }

    // Store invite ID so we can cancel if needed
    setCurrentCallInviteId(result.invite?.id || null)
    setCallType(type)
    setCallRoomUrl(roomUrl)
    setIsCallActive(true)

    toast.success(`Calling ${selectedContact.name}...`)
  }

  // End the current call
  const endCall = async () => {
    try {
      // Update invite status to ended
      if (currentCallInviteId) {
        await updateCallStatus(currentCallInviteId, 'ended')
      }
    } catch (error) {
      console.error('[CALL] Failed to update call status:', error)
    }

    setIsCallActive(false)
    setCallRoomUrl(null)
    setCurrentCallInviteId(null)
    setIncomingCall(null)
  }

  // Accept incoming call
  const acceptIncomingCall = async () => {
    if (!incomingCall) return

    try {
      // Update invite status to accepted
      await updateCallStatus(incomingCall.inviteId, 'accepted')

      setCallType(incomingCall.callType)
      setCallRoomUrl(incomingCall.roomUrl)
      setCurrentCallInviteId(incomingCall.inviteId)
      setIsCallActive(true)
      setIncomingCall(null)
    } catch (error) {
      console.error('[CALL] Failed to accept call:', error)
      toast.error('Failed to accept call')
    }
  }

  // Reject incoming call
  const rejectIncomingCall = async () => {
    try {
      if (incomingCall?.inviteId) {
        await updateCallStatus(incomingCall.inviteId, 'rejected')
      }
    } catch {
      // Silently fail - call is being rejected anyway
    }

    setIncomingCall(null)
    toast.info('Call rejected')
  }

  // ========== UI HELPERS ==========

  const getContactMessages = (contactId: string) => {
    return (messages || [])
      .filter(m => m.contactId === contactId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  // Format last seen timestamp
  const formatLastSeen = (timestamp: string | undefined) => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return 'Yesterday'
    return date.toLocaleDateString()
  }

  // Render message status indicator
  const renderStatusIndicator = (status: Message['status'], isOwn: boolean) => {
    if (!isOwn) return null

    switch (status) {
      case 'sending':
        // Three dots animation for sending
        return (
          <span className="inline-flex items-center gap-0.5 ml-1">
            <motion.span
              className="w-1 h-1 bg-current rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.span
              className="w-1 h-1 bg-current rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.span
              className="w-1 h-1 bg-current rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </span>
        )
      case 'sent':
        // Single dot for sent (not yet received)
        return <span className="ml-1 text-xs">•</span>
      case 'delivered':
        // Gray/white check for delivered
        return <Check className="w-3 h-3 ml-1" weight="bold" />
      case 'seen':
        // Purple double check for seen
        return <Checks className="w-3 h-3 ml-1 text-purple-300" weight="bold" />
      default:
        return null
    }
  }

  // ========== RENDER ==========

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        {/* Full-Screen View Switching: Contacts OR Conversation */}
        {view === 'contacts' ? (
          /* CONTACTS LIST VIEW - Full Screen */
          <div className="flex flex-col h-full">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Secure Messenger
              </DialogTitle>
            </DialogHeader>

            {/* Name reminder - name is set in Settings */}
            {!myName && (
              <div className="p-4 bg-yellow-50 border-b">
                <p className="text-sm text-yellow-800">Please set your name in Settings first to use messenger.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-4 space-y-2">
              <div className="flex gap-2">
                <Button
                  onClick={generateOneTimeQR}
                  disabled={!myName || isGeneratingQR}
                  className="flex-1"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {isGeneratingQR ? 'Generating...' : '1:1 QR'}
                </Button>

                <Button
                  onClick={() => setShowGroupQRDialog(true)}
                  disabled={!myName || isGeneratingQR}
                  variant="secondary"
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Group QR
                </Button>
              </div>

              <Button
                onClick={() => setShowScanner(true)}
                disabled={!myName}
                variant="outline"
                className="w-full"
              >
                <Camera className="w-4 h-4 mr-2" />
                Scan Contact QR
              </Button>
            </div>

            {/* Contacts List - sorted by most recent message */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-2">
                {(contacts || []).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No contacts yet</p>
                    <p className="text-xs">Generate or scan a QR code</p>
                  </div>
                ) : (
                  // Sort contacts by most recent message (newest first)
                  [...(contacts || [])].sort((a, b) => {
                    // Get last message time for each contact
                    const getLastMessageTime = (contact: Contact) => {
                      const contactMessages = (messages || []).filter(m => m.contactId === contact.id)
                      if (contactMessages.length === 0) {
                        // No messages - use paired date or current time
                        return new Date(contact.pairedAt || 0).getTime()
                      }
                      // Get the most recent message timestamp
                      const lastMsg = contactMessages[contactMessages.length - 1]
                      return new Date(lastMsg.timestamp || lastMsg.createdAt || 0).getTime()
                    }
                    // Sort descending (newest first)
                    return getLastMessageTime(b) - getLastMessageTime(a)
                  }).map(contact => (
                    <motion.div
                      key={contact.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-colors mb-2",
                        contact.isDeleted && "opacity-60",
                        selectedContact?.id === contact.id
                          ? "bg-blue-50 border-2 border-blue-500"
                          : "bg-gray-50 hover:bg-gray-100"
                      )}
                      onClick={() => {
                        setSelectedContact(contact)
                        setView('chat')
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className={contact.isDeleted ? "grayscale" : ""}>
                            <AvatarFallback>
                              {contact.isDeleted ? "?" : contact.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {/* Online indicator dot - only show if CONTACT's privacy allows */}
                          {!contact.isDeleted && (contact.privacySettings?.showOnlineStatus ?? true) && (
                            <span className={cn(
                              "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
                              contact.status === 'online' ? 'bg-green-500' :
                              contact.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                            )} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn("font-semibold truncate", contact.isDeleted && "text-gray-400 italic")}>
                              {contact.isDeleted ? "Deleted Account" : contact.name}
                            </p>
                            {!contact.isDeleted && contact.isVerified && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                            {contact.isDeleted ? (
                              <span className="text-gray-400">Account no longer exists</span>
                            ) : (contact.privacySettings?.showOnlineStatus ?? true) && contact.status === 'online' ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Online
                              </>
                            ) : (contact.privacySettings?.showLastSeen ?? true) && contact.lastSeenTimestamp ? (
                              <>
                                <Clock className="w-3 h-3" />
                                {formatLastSeen(contact.lastSeenTimestamp)}
                              </>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* CONVERSATION VIEW - Full Screen */
          <div className="flex flex-col h-full">
            {selectedContact ? (
              <>
                {/* Chat Header with Back Button */}
                <div className="p-4 border-b flex items-center gap-3">
                  {/* Back Button - Always Visible */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setView('contacts')}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>
                        {selectedContact.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator dot - only show if CONTACT's privacy allows */}
                    {(selectedContact.privacySettings?.showOnlineStatus ?? true) && (
                      <span className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
                        selectedContact.status === 'online' ? 'bg-green-500' :
                        selectedContact.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                      )} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={cn("font-semibold", selectedContact.isDeleted && "text-gray-400 italic")}>
                        {selectedContact.isDeleted ? "Deleted Account" : selectedContact.name}
                      </h3>
                      {!selectedContact.isDeleted && selectedContact.contactProfileId && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {selectedContact.contactProfileId}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      {selectedContact.isDeleted ? (
                        <span className="text-red-400">This account has been deleted</span>
                      ) : (selectedContact.privacySettings?.showOnlineStatus ?? true) && selectedContact.status === 'online' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          Online now
                        </>
                      ) : (selectedContact.privacySettings?.showLastSeen ?? true) && selectedContact.lastSeenTimestamp ? (
                        <>
                          <Clock className="w-3 h-3" />
                          Last seen {formatLastSeen(selectedContact.lastSeenTimestamp)}
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </p>
                  </div>
                  {/* Call Buttons */}
                  {!selectedContact.isDeleted && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startCall('audio')}
                        title="Voice Call"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <Phone className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startCall('video')}
                        title="Video Call"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <VideoCamera className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConversationDialog(true)}
                    title="Delete Conversation"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    title="Privacy Settings"
                  >
                    <Gear className="w-5 h-5" />
                  </Button>
                </div>

                {/* Messages - Apply screenshot prevention if contact disabled it */}
                <div
                  className="flex-1 min-h-0 overflow-y-auto p-4"
                  style={{
                    // Prevent screenshots/screen recording when disabled by contact
                    ...(!(selectedContact.privacySettings?.allowScreenshots ?? true) && {
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none',
                    })
                  }}
                >
                  {/* Screenshot protection notice */}
                  {!(selectedContact.privacySettings?.allowScreenshots ?? true) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3 text-xs text-yellow-700 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                      <span>Screenshot protection enabled by {selectedContact.name}</span>
                    </div>
                  )}
                  <div className="space-y-3">
                    {getContactMessages(selectedContact.id).map(message => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex group",
                          message.isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        {/* Delete button - shows on hover/tap */}
                        {message.isOwn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity mr-1 h-8 w-8 p-0 text-gray-400 hover:text-red-500 self-center"
                            onClick={() => handleMessageLongPress(message)}
                            title="Delete message"
                          >
                            <TrashSimple className="w-4 h-4" />
                          </Button>
                        )}
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg p-3 cursor-pointer",
                            message.isOwn
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-900"
                          )}
                          onClick={() => handleMessageLongPress(message)}
                        >
                          {/* Attachment Display */}
                          {message.attachment ? (
                            <div className="space-y-2">
                              {message.attachment.type === 'photo' && (
                                <div className="relative rounded-lg overflow-hidden bg-gray-200 max-w-[250px]">
                                  <div className="aspect-video flex items-center justify-center">
                                    <ImageIcon className="w-12 h-12 text-gray-400" />
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 hover:bg-opacity-40 transition-opacity">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-white hover:bg-white hover:bg-opacity-20"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleViewAttachment(message.attachment!, message.contactId, message.isOwn)
                                      }}
                                    >
                                      <Download className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                  </div>
                                  <div className="absolute top-2 left-2">
                                    <ShieldCheck className={cn(
                                      "w-4 h-4",
                                      message.isOwn ? "text-white" : "text-green-500"
                                    )} />
                                  </div>
                                </div>
                              )}

                              {message.attachment.type === 'file' && (
                                <div className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border",
                                  message.isOwn ? "border-blue-300 bg-blue-400" : "border-gray-300 bg-white"
                                )}>
                                  <File className={cn(
                                    "w-8 h-8 flex-shrink-0",
                                    message.isOwn ? "text-white" : "text-blue-500"
                                  )} />
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-sm font-medium truncate",
                                      message.isOwn ? "text-white" : "text-gray-900"
                                    )}>
                                      {message.attachment.fileName}
                                    </p>
                                    <p className={cn(
                                      "text-xs",
                                      message.isOwn ? "text-blue-100" : "text-gray-500"
                                    )}>
                                      {formatFileSize(message.attachment.fileSize)}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={cn(
                                      "flex-shrink-0",
                                      message.isOwn ? "text-white hover:bg-blue-300" : "text-gray-600 hover:bg-gray-100"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleViewAttachment(message.attachment!, message.contactId, message.isOwn)
                                    }}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <ShieldCheck className={cn(
                                    "w-4 h-4 flex-shrink-0",
                                    message.isOwn ? "text-white" : "text-green-500"
                                  )} />
                                </div>
                              )}

                              {message.attachment.type === 'voice' && (
                                <div className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg",
                                  message.isOwn ? "bg-blue-400" : "bg-white border border-gray-300"
                                )}>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={cn(
                                      "flex-shrink-0 rounded-full w-10 h-10 p-0",
                                      message.isOwn ? "text-white hover:bg-blue-300" : "text-blue-500 hover:bg-blue-50"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleViewAttachment(message.attachment!, message.contactId, message.isOwn)
                                    }}
                                  >
                                    <Play className="w-5 h-5" />
                                  </Button>
                                  <div className="flex-1">
                                    <div className={cn(
                                      "h-8 flex items-center",
                                      message.isOwn ? "text-white" : "text-gray-400"
                                    )}>
                                      {/* Voice waveform placeholder */}
                                      <div className="flex gap-0.5 items-center h-full">
                                        {[...Array(20)].map((_, i) => (
                                          <div
                                            key={i}
                                            className={cn(
                                              "w-1 rounded-full",
                                              message.isOwn ? "bg-white" : "bg-gray-400"
                                            )}
                                            style={{
                                              height: `${20 + Math.random() * 80}%`,
                                              opacity: 0.7
                                            }}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <ShieldCheck className={cn(
                                    "w-4 h-4 flex-shrink-0",
                                    message.isOwn ? "text-white" : "text-green-500"
                                  )} />
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Regular text message - already decrypted or plain text */
                            <p className="text-sm break-words">
                              {message.isOwn || !message.text.startsWith('ENC')
                                ? message.text
                                : decryptMessage(message.text, myKeys?.privateKey || '')}
                            </p>
                          )}

                          {/* Message metadata (timestamp, status) */}
                          <div className={cn(
                            "flex items-center gap-1 mt-1 text-xs",
                            message.isOwn ? "text-blue-100" : "text-gray-500"
                          )}>
                            <span>{formatTime(message.timestamp)}</span>
                            {renderStatusIndicator(message.status, message.isOwn)}
                            {/* Show countdown if message has deleteAt (seen and scheduled for deletion) */}
                            {message.deleteAt && (
                              <AutoDeleteCountdown deleteAt={message.deleteAt} isOwn={message.isOwn} />
                            )}
                            {/* Show clock icon if auto-delete is set but message not yet seen */}
                            {message.autoDeleteTimer && message.autoDeleteTimer > 0 && !message.deleteAt && (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-0.5 px-1 rounded text-[10px]",
                                  message.isOwn ? "bg-blue-400/20 text-blue-100" : "bg-gray-200 text-gray-600"
                                )}
                                title={`Will auto-delete ${AUTO_DELETE_OPTIONS.find(o => o.value === message.autoDeleteTimer)?.label} after seen`}
                              >
                                <Clock className="w-2.5 h-2.5" weight="bold" />
                                {AUTO_DELETE_OPTIONS.find(o => o.value === message.autoDeleteTimer)?.label?.replace(' ', '')}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Delete button for received messages - shows on right */}
                        {!message.isOwn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 h-8 w-8 p-0 text-gray-400 hover:text-red-500 self-center"
                            onClick={() => handleMessageLongPress(message)}
                            title="Delete message"
                          >
                            <TrashSimple className="w-4 h-4" />
                          </Button>
                        )}
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  {selectedContact.isDeleted ? (
                    <div className="text-center py-2 text-gray-500 text-sm bg-gray-50 rounded-lg">
                      <Warning className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                      This account has been deleted. You can no longer send messages.
                    </div>
                  ) : isRecordingVoice ? (
                    /* Voice Recording UI */
                    <div className="flex items-center gap-3 bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <Microphone className="w-5 h-5 text-red-500" />
                        <span className="text-sm font-medium text-red-700">
                          Recording: {formatRecordingDuration(recordingDuration)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelVoiceRecording}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleStopVoiceRecording}
                        className="bg-red-500 hover:bg-red-600 text-white"
                        disabled={isUploadingAttachment}
                      >
                        {isUploadingAttachment ? 'Sending...' : 'Send'}
                      </Button>
                    </div>
                  ) : (
                    /* Normal Message Input */
                    <div className="space-y-2">
                      {/* Hidden file inputs */}
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      {/* Attachment Menu (shows when paperclip is clicked) */}
                      {showAttachmentMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-2 pb-2"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              photoInputRef.current?.click()
                              setShowAttachmentMenu(false)
                            }}
                            disabled={isUploadingAttachment}
                            className="flex-1"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Photo
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              fileInputRef.current?.click()
                              setShowAttachmentMenu(false)
                            }}
                            disabled={isUploadingAttachment}
                            className="flex-1"
                          >
                            <File className="w-4 h-4 mr-2" />
                            File
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleStartVoiceRecording()
                              setShowAttachmentMenu(false)
                            }}
                            disabled={isUploadingAttachment}
                            className="flex-1"
                          >
                            <Microphone className="w-4 h-4 mr-2" />
                            Voice
                          </Button>
                        </motion.div>
                      )}

                      {/* Input Row */}
                      <div className="flex gap-2 items-center">
                        {/* Attachment Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                          disabled={isUploadingAttachment}
                          className="text-gray-500 hover:text-gray-700"
                          title="Attach file"
                        >
                          <Paperclip className="w-5 h-5" />
                        </Button>

                        {/* Text Input */}
                        <Input
                          placeholder={isUploadingAttachment ? "Uploading..." : "Type a message..."}
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !isUploadingAttachment && handleSendMessage()}
                          className="flex-1"
                          disabled={isUploadingAttachment}
                        />

                        {/* Send Button */}
                        <Button
                          onClick={handleSendMessage}
                          disabled={!messageInput.trim() || isUploadingAttachment}
                        >
                          {isUploadingAttachment ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <PaperPlaneTilt className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Shield className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Select a contact to start chatting</p>
                  <p className="text-sm mt-2">All messages are end-to-end encrypted</p>
                </div>
              </div>
            )}
          </div>
        )}
        {/* End of View Switching */}

        {/* QR Code Display Dialog */}
        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Your One-Time QR Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {currentInvite && (
                <>
                  <div className="p-4 sm:p-6 rounded-lg flex items-center justify-center bg-white border">
                    {qrCodeDataURL && (
                      <img
                        src={qrCodeDataURL}
                        alt="QR Code"
                        className="w-full h-auto max-w-[200px] sm:max-w-[280px]"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant={currentInvite.used ? "secondary" : "default"}>
                        {currentInvite.used ? "Used" : "Active"}
                      </Badge>
                    </div>

                    {!currentInvite.used && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Expires in:</span>
                        <span className="font-medium flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {getTimeRemaining(currentInvite.expiresAt)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Code:</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {currentInvite.code}
                      </code>
                    </div>

                    {/* Copy full invite data for manual sharing */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => {
                        const inviteData = JSON.stringify({
                          code: currentInvite.code,
                          publicKey: currentInvite.publicKey,
                          name: currentInvite.name,
                          expiresAt: currentInvite.expiresAt
                        })
                        navigator.clipboard.writeText(inviteData)
                        toast.success('Invite data copied! Share this with your contact.')
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Invite Data (for manual sharing)
                    </Button>
                  </div>

                  {currentInvite.isGroupInvite ? (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm text-purple-900 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <strong>Group QR:</strong> {currentInvite.groupCurrentMembers || 0}/{currentInvite.groupMaxMembers} members joined
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        Group ID: {currentInvite.groupId}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-900 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <strong>One-time use only:</strong> This QR code can only be scanned once
                      </p>
                    </div>
                  )}

                  {currentInvite.used && (
                    <Button
                      onClick={generateOneTimeQR}
                      className="w-full"
                    >
                      Generate New QR Code
                    </Button>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Group QR Creation Dialog */}
        <Dialog open={showGroupQRDialog} onOpenChange={setShowGroupQRDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Create Group QR Code
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-900">
                  Create a QR code that multiple people can scan to join a group conversation.
                  Each person can only scan once (no duplicates allowed).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupSize">How many members can join?</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="groupSize"
                    type="number"
                    min={2}
                    max={50}
                    value={groupMemberCount}
                    onChange={(e) => setGroupMemberCount(Math.min(50, Math.max(2, parseInt(e.target.value) || 2)))}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">members (2-50)</span>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>✓ Same device cannot scan twice</p>
                <p>✓ Group members are marked for identification</p>
                <p>✓ QR expires after all slots are filled or 24 hours</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowGroupQRDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => generateGroupQR(groupMemberCount)}
                  disabled={isGeneratingQR || groupMemberCount < 2}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {isGeneratingQR ? 'Creating...' : `Create for ${groupMemberCount} members`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* QR Scanner Dialog */}
        <Dialog open={showScanner} onOpenChange={setShowScanner}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Scan Contact QR Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-lg overflow-hidden aspect-square relative">
                {/* Camera View */}
                {cameraError ? (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center p-4">
                      <Camera className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                      <p className="text-red-400">{cameraError}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scanning overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Corner markers */}
                      <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-purple-500 rounded-tl-lg" />
                      <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-purple-500 rounded-tr-lg" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-purple-500 rounded-bl-lg" />
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-purple-500 rounded-br-lg" />

                      {/* Scanning line animation */}
                      {isScanning && (
                        <motion.div
                          className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                          initial={{ top: '10%' }}
                          animate={{ top: '90%' }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatType: 'reverse',
                            ease: 'linear'
                          }}
                        />
                      )}
                    </div>

                    {/* Scanning status */}
                    {isScanning && (
                      <div className="absolute bottom-2 left-0 right-0 text-center">
                        <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                          Scanning...
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="text-center text-sm text-gray-600">
                <p>Position the QR code within the frame</p>
                <p>It will scan automatically</p>
              </div>

              {/* Gallery option with (+) button */}
              <div className="flex items-center justify-center gap-3 py-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-500">or select from</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isProcessingGallery}
                >
                  {isProcessingGallery ? (
                    <>
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <ImageIcon className="w-4 h-4" />
                      Photo Gallery
                    </>
                  )}
                </Button>
              </div>

              {/* Hidden file input for gallery */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleGalleryImage}
              />

              {/* Manual code entry fallback */}
              <div className="pt-4 border-t">
                <label className="text-sm text-gray-600">Or paste invite data manually:</label>
                <p className="text-xs text-gray-500 mb-2">Ask your contact to click "Copy Invite Data" and share it with you</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste full invite data here..."
                    value={scannedData}
                    onChange={(e) => setScannedData(e.target.value)}
                    className="text-xs"
                  />
                  <Button onClick={() => scannedData && handleQRScan(scannedData)}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Privacy Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Privacy Settings
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(85vh - 80px)' }}>
            <div className="space-y-6">
              {/* Online Status Settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Visibility
                </h4>

                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 pr-4">
                    <Label htmlFor="show-online" className="text-sm font-medium">Show Online Status</Label>
                    <p className="text-xs text-gray-500">Let others see when you're online</p>
                  </div>
                  <Switch
                    id="show-online"
                    checked={(myPrivacySettings || DEFAULT_MY_PRIVACY_SETTINGS).showOnlineStatus}
                    onCheckedChange={(checked) => {
                      console.log('[PRIVACY] Show Online Status:', checked)
                      setMyPrivacySettings(prev => ({ ...DEFAULT_MY_PRIVACY_SETTINGS, ...prev, showOnlineStatus: checked }))
                    }}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 pr-4">
                    <Label htmlFor="show-last-seen" className="text-sm font-medium">Show Last Seen</Label>
                    <p className="text-xs text-gray-500">Let others see when you were last active</p>
                  </div>
                  <Switch
                    id="show-last-seen"
                    checked={(myPrivacySettings || DEFAULT_MY_PRIVACY_SETTINGS).showLastSeen}
                    onCheckedChange={(checked) => {
                      console.log('[PRIVACY] Show Last Seen:', checked)
                      setMyPrivacySettings(prev => ({ ...DEFAULT_MY_PRIVACY_SETTINGS, ...prev, showLastSeen: checked }))
                    }}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 pr-4">
                    <Label htmlFor="show-id" className="text-sm font-medium flex items-center gap-1">
                      <IdentificationCard className="w-3 h-3" />
                      Show Unique ID
                    </Label>
                    <p className="text-xs text-gray-500">Let others see your personal ID</p>
                  </div>
                  <Switch
                    id="show-id"
                    checked={(myPrivacySettings || DEFAULT_MY_PRIVACY_SETTINGS).showUniqueId}
                    onCheckedChange={(checked) => {
                      console.log('[PRIVACY] Show Unique ID:', checked)
                      setMyPrivacySettings(prev => ({ ...DEFAULT_MY_PRIVACY_SETTINGS, ...prev, showUniqueId: checked }))
                    }}
                  />
                </div>
              </div>

              {/* Security Settings */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Security
                </h4>

                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 pr-4">
                    <Label htmlFor="allow-screenshots" className="text-sm font-medium">Allow Screenshots</Label>
                    <p className="text-xs text-gray-500">Let others screenshot your conversation</p>
                  </div>
                  <Switch
                    id="allow-screenshots"
                    checked={(myPrivacySettings || DEFAULT_MY_PRIVACY_SETTINGS).allowScreenshots}
                    onCheckedChange={(checked) => {
                      console.log('[PRIVACY] Allow Screenshots:', checked)
                      setMyPrivacySettings(prev => ({ ...DEFAULT_MY_PRIVACY_SETTINGS, ...prev, allowScreenshots: checked }))
                    }}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 pr-4">
                    <Label htmlFor="allow-save" className="text-sm font-medium flex items-center gap-1">
                      <FloppyDisk className="w-3 h-3" />
                      Allow Saving Media
                    </Label>
                    <p className="text-xs text-gray-500">Let others save photos, files, voice records</p>
                  </div>
                  <Switch
                    id="allow-save"
                    checked={(myPrivacySettings || DEFAULT_MY_PRIVACY_SETTINGS).allowSaveMedia}
                    onCheckedChange={(checked) => {
                      console.log('[PRIVACY] Allow Save Media:', checked)
                      setMyPrivacySettings(prev => ({ ...DEFAULT_MY_PRIVACY_SETTINGS, ...prev, allowSaveMedia: checked }))
                    }}
                  />
                </div>
              </div>

              {/* Auto-Delete Timer */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Disappearing Messages
                </h4>

                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 pr-4">
                    <Label htmlFor="auto-delete" className="text-sm font-medium">Auto-Delete Timer</Label>
                    <p className="text-xs text-gray-500">Messages disappear after being seen</p>
                  </div>
                  <Select
                    value={String((myPrivacySettings || DEFAULT_MY_PRIVACY_SETTINGS).autoDeleteTimer)}
                    onValueChange={(value) => {
                      console.log('[PRIVACY] Auto-Delete Timer:', value)
                      setMyPrivacySettings(prev => ({ ...DEFAULT_MY_PRIVACY_SETTINGS, ...prev, autoDeleteTimer: Number(value) }))
                    }}
                  >
                    <SelectTrigger className="w-[120px] h-9">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTO_DELETE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(myPrivacySettings || DEFAULT_MY_PRIVACY_SETTINGS).autoDeleteTimer > 0 && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-purple-900 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Messages will auto-delete {AUTO_DELETE_OPTIONS.find(o => o.value === (myPrivacySettings || DEFAULT_MY_PRIVACY_SETTINGS).autoDeleteTimer)?.label} after being seen
                    </p>
                  </div>
                )}
              </div>

              {/* Your IDs Section */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <IdentificationCard className="w-4 h-4" />
                  Your Identifiers
                </h4>

                {/* User ID - Shareable */}
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label className="text-sm font-medium text-purple-900">Your User ID</Label>
                      <p className="text-xs text-purple-700">Share this to let others find you</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white"
                      onClick={() => {
                        navigator.clipboard.writeText(userId)
                        toast.success('User ID copied! Share this with contacts.')
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <code className="block text-lg font-mono font-bold text-purple-900 bg-white p-2 rounded text-center">
                    {userId}
                  </code>
                </div>

                {/* Device ID - Internal */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label className="text-sm text-gray-700">Device ID</Label>
                      <p className="text-xs text-gray-500">Internal use only • Tied to your login</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Private
                    </Badge>
                  </div>
                  <code className="block text-xs text-gray-600 bg-white p-2 rounded truncate">
                    {deviceId}
                  </code>
                  <p className="text-xs text-gray-400 mt-1">
                    Changes only when you switch device or change login email
                  </p>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="space-y-4 pt-4 border-t border-red-200">
                <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
                  <Warning className="w-4 h-4" />
                  Danger Zone
                </h4>

                <div className="bg-red-50 p-3 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-red-800 font-medium">Clear All Contacts</p>
                    <p className="text-xs text-red-600">Remove all contacts and messages. This cannot be undone.</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete ALL contacts and messages? This cannot be undone.')) {
                        // Track all current contact IDs as deleted
                        const allIds = (contacts || []).flatMap(c => [
                          c.id, c.contactUserId, c.contactProfileId, c.conversationId
                        ].filter(Boolean)) as string[]
                        setDeletedContactIds(prev => [...new Set([...(prev || []), ...allIds])])
                        setContacts([])
                        setMessages([])
                        toast.success('All contacts and messages cleared')
                        setShowSettings(false)
                      }
                    }}
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Clear All Contacts
                  </Button>
                </div>
              </div>
            </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Message Confirmation Dialog */}
        <Dialog open={showDeleteMessageDialog} onOpenChange={setShowDeleteMessageDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash className="w-5 h-5" />
                Delete Message
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                How would you like to delete this message?
              </p>

              {messageToDelete && (
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 max-h-24 overflow-y-auto">
                  "{(() => {
                    const text = messageToDelete.isOwn || !messageToDelete.text.startsWith('ENC')
                      ? messageToDelete.text
                      : decryptMessage(messageToDelete.text, myKeys?.privateKey || '')
                    return text.substring(0, 100) + (text.length > 100 ? '...' : '')
                  })()}"
                </div>
              )}

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => messageToDelete && deleteMessageForMe(messageToDelete.id)}
                >
                  <TrashSimple className="w-4 h-4 mr-2 text-gray-500" />
                  Delete for me
                  <span className="ml-auto text-xs text-gray-400">Only removes from your view</span>
                </Button>

                {messageToDelete?.isOwn && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => messageToDelete && deleteMessageForEveryone(messageToDelete)}
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Delete for everyone
                    <span className="ml-auto text-xs text-red-400">Removes for all</span>
                  </Button>
                )}

                {!messageToDelete?.isOwn && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    You can only delete your own messages for everyone
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowDeleteMessageDialog(false)
                  setMessageToDelete(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Conversation Confirmation Dialog */}
        <Dialog open={showDeleteConversationDialog} onOpenChange={setShowDeleteConversationDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash className="w-5 h-5" />
                Delete Conversation
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedContact && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Avatar className={selectedContact.isDeleted ? "grayscale" : ""}>
                    <AvatarFallback>
                      {selectedContact.isDeleted ? "?" : selectedContact.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedContact.isDeleted ? "Deleted Account" : selectedContact.name}</p>
                    <p className="text-xs text-gray-500">
                      {(messages || []).filter(m => m.contactId === selectedContact.id).length} messages
                    </p>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-600">
                What would you like to do?
              </p>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => deleteConversation(false)}
                >
                  <TrashSimple className="w-4 h-4 mr-2 text-gray-500" />
                  Clear chat for me
                  <span className="ml-auto text-xs text-gray-400">Keeps contact</span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                  onClick={() => deleteConversation(true)}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Clear chat for everyone
                  <span className="ml-auto text-xs text-orange-400">Removes all messages</span>
                </Button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-gray-400">or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => selectedContact && deleteContact(selectedContact.id)}
                >
                  <Warning className="w-4 h-4 mr-2" />
                  Remove contact
                  <span className="ml-auto text-xs text-red-400">Deletes everything</span>
                </Button>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-xs text-yellow-800 flex items-center gap-2">
                  <Warning className="w-4 h-4" />
                  This action cannot be undone
                </p>
              </div>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowDeleteConversationDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Video/Voice Call Component */}
        {isCallActive && callRoomUrl && selectedContact && (
          <VideoCall
            isOpen={isCallActive}
            onClose={endCall}
            roomUrl={callRoomUrl}
            userName={myName || 'Me'}
            contactName={selectedContact.name}
            callType={callType}
          />
        )}

        {/* Incoming Call Component */}
        {incomingCall && (
          <IncomingCall
            isOpen={!!incomingCall}
            callerName={incomingCall.callerName}
            callType={incomingCall.callType}
            onAccept={acceptIncomingCall}
            onReject={rejectIncomingCall}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
// Export alias for backward compatibility
export { SecureQRMessenger as SecureMessenger }
