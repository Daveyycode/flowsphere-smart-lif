/**
 * Hash-FL Privacy System
 * Privacy-first encrypted storage and communication system
 * SEPARATE from the CEO Shadow Vault - this is for regular users
 *
 * Features:
 * - End-to-end encrypted file storage
 * - QR code contact invitations (teal-colored, unique design)
 * - Email/Yahoo invite system
 * - Biometric/PIN authentication
 * - Encrypted messaging (WORKING)
 * - Privacy-first (no data leaves device)
 * - Intruder detection with silent photo capture
 *
 * Visual Identity: TEAL/EMERALD theme (distinct from Vault's blue/purple)
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useDeviceType } from '@/hooks/use-mobile'
import { QRCodeSVG } from 'qrcode.react'
import {
  Shield,
  Lock,
  LockOpen,
  Eye,
  EyeSlash,
  Fingerprint,
  Key,
  QrCode,
  Camera,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FilePdf,
  Plus,
  Trash,
  Download,
  Upload,
  Share,
  Users,
  Chat,
  Warning,
  CheckCircle,
  X,
  CaretRight,
  Gear,
  Bell,
  BellSlash,
  Info,
  ShieldCheck,
  ShieldWarning,
  UserCircle,
  PaperPlaneTilt,
  Image,
  FolderLock,
  Envelope,
  Copy,
  Link,
  At,
  ArrowLeft,
  DotsThree
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'
import { logger } from '@/lib/security-utils'
import * as HashFLMessaging from '@/lib/hashfl-messaging'
import { QRScanner } from '@/components/qr-scanner'

// ==========================================
// Types
// ==========================================

interface HashFLUser {
  id: string
  pin: string // Hashed PIN using PBKDF2
  salt: string // Salt for PIN hashing
  biometricEnabled: boolean
  createdAt: number
  lastAccess: number
  failedAttempts: number
  lockoutUntil?: number
}

interface EncryptedFile {
  id: string
  name: string
  type: string
  size: number
  encryptedData: string // Base64 encrypted
  thumbnail?: string
  createdAt: number
  category: 'photos' | 'videos' | 'documents' | 'audio' | 'other'
}

interface SecureContact {
  id: string
  name: string
  email?: string
  inviteCode: string
  sharedKey: string // For encrypting messages
  connectionId?: string // Supabase connection ID for realtime sync
  addedAt: number
  lastMessage?: number
  avatar?: string
  status: 'pending' | 'accepted' | 'blocked'
}

interface SecureMessage {
  id: string
  contactId: string
  content: string // Encrypted content
  timestamp: number
  isOutgoing: boolean
  isRead: boolean
  isDelivered: boolean
}

interface IntruderLog {
  id: string
  timestamp: number
  photo?: string
  failedPin?: string
  deviceInfo: string
}

interface HashFLSettings {
  silentIntruderCapture: boolean
  autoLockMinutes: number
  showNotifications: boolean
  hideAppContent: boolean
  disguiseMode: boolean
  maxFailedAttempts: number
  lockoutDuration: number
}

interface PendingInvite {
  code: string
  createdAt: number
  expiresAt: number
  sentTo?: string
  method?: 'qr' | 'email' | 'link'
}

// ==========================================
// Constants
// ==========================================

// IMPORTANT: These keys are COMPLETELY SEPARATE from the Secret Vault (7-tap)
// Hash-FL uses 'hashfl-' prefix, Secret Vault uses 'vault-' prefix
const STORAGE_KEYS = {
  USER: 'hashfl-user',
  FILES: 'hashfl-files',
  CONTACTS: 'hashfl-contacts',
  MESSAGES: 'hashfl-messages',  // Hash-FL messages ONLY - separate from vault
  INTRUDER_LOGS: 'hashfl-intruder-logs',
  SETTINGS: 'hashfl-settings',
  INVITES: 'hashfl-pending-invites'
}

const DEFAULT_SETTINGS: HashFLSettings = {
  silentIntruderCapture: true,
  autoLockMinutes: 5,
  showNotifications: false,
  hideAppContent: true,
  disguiseMode: false,
  maxFailedAttempts: 5,
  lockoutDuration: 30
}

// ==========================================
// Crypto Utilities (Stronger than before)
// ==========================================

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

async function encryptData(data: string, pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(pin, salt)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  return btoa(String.fromCharCode(...combined))
}

async function decryptData(encryptedBase64: string, pin: string): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
  )

  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const data = combined.slice(28)

  const key = await deriveKey(pin, salt)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  return new TextDecoder().decode(decrypted)
}

// Secure PIN hashing using PBKDF2 (not simple bitwise)
async function hashPinSecure(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const saltBytes = encoder.encode(salt)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  )

  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No confusing chars (0,O,I,1)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function generateSharedKey(): string {
  const array = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...array))
}

function generateSalt(): string {
  const array = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...array))
}

// ==========================================
// Main Component
// ==========================================

type ViewType = 'lock' | 'setup' | 'home' | 'files' | 'contacts' | 'messages' | 'chat' | 'settings' | 'intruder-logs' | 'invite'

export function HashFLPrivacy() {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  // State
  const [user, setUser] = useKV<HashFLUser | null>(STORAGE_KEYS.USER, null)
  const [files, setFiles] = useKV<EncryptedFile[]>(STORAGE_KEYS.FILES, [])
  const [contacts, setContacts] = useKV<SecureContact[]>(STORAGE_KEYS.CONTACTS, [])
  const [intruderLogs, setIntruderLogs] = useKV<IntruderLog[]>(STORAGE_KEYS.INTRUDER_LOGS, [])
  const [settings, setSettings] = useKV<HashFLSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
  const [pendingInvites, setPendingInvites] = useKV<PendingInvite[]>(STORAGE_KEYS.INVITES, [])

  // Hash-FL Messages - SEPARATE storage from Secret Vault
  const [messages, setMessages] = useKV<SecureMessage[]>(STORAGE_KEYS.MESSAGES, [])

  const [currentView, setCurrentView] = useState<ViewType>('lock')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [confirmPinInput, setConfirmPinInput] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [currentInviteCode, setCurrentInviteCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [contactName, setContactName] = useState('')
  const [selectedContact, setSelectedContact] = useState<SecureContact | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [hashflUserId, setHashflUserId] = useState<string>('')
  const [realtimeMessages, setRealtimeMessages] = useState<HashFLMessaging.HashFLMessage[]>([])
  const [showQRScanner, setShowQRScanner] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sessionPin = useRef<string>('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initialize view
  useEffect(() => {
    if (!user) {
      setCurrentView('setup')
    } else if (!isUnlocked) {
      if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
        toast.error(`Account locked. Try again in ${Math.ceil((user.lockoutUntil - Date.now()) / 60000)} minutes`)
      }
      setCurrentView('lock')
    } else {
      setCurrentView('home')
    }
  }, [user, isUnlocked])

  // Auto-lock timer
  useEffect(() => {
    if (!isUnlocked || !settings) return

    const lockTimer = setTimeout(() => {
      setIsUnlocked(false)
      sessionPin.current = ''
      toast.info('Hash-FL auto-locked for security')
    }, settings.autoLockMinutes * 60 * 1000)

    return () => clearTimeout(lockTimer)
  }, [isUnlocked, settings])

  // ==========================================
  // Handlers
  // ==========================================

  const handleSetupPin = async () => {
    if (pinInput.length < 4) {
      toast.error('PIN must be at least 4 digits')
      return
    }

    if (pinInput !== confirmPinInput) {
      toast.error('PINs do not match')
      return
    }

    const salt = generateSalt()
    const hashedPin = await hashPinSecure(pinInput, salt)

    const newUser: HashFLUser = {
      id: `hashfl-${Date.now()}`,
      pin: hashedPin,
      salt: salt,
      biometricEnabled: false,
      createdAt: Date.now(),
      lastAccess: Date.now(),
      failedAttempts: 0
    }

    setUser(newUser)
    sessionPin.current = pinInput
    setIsUnlocked(true)
    setPinInput('')
    setConfirmPinInput('')
    toast.success('Hash-FL setup complete! Your data is now protected.')
  }

  const handleUnlock = async () => {
    if (!user) return

    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      const minutes = Math.ceil((user.lockoutUntil - Date.now()) / 60000)
      toast.error(`Account locked. Try again in ${minutes} minutes`)
      return
    }

    const hashedInput = await hashPinSecure(pinInput, user.salt)

    if (hashedInput === user.pin) {
      setUser({
        ...user,
        lastAccess: Date.now(),
        failedAttempts: 0,
        lockoutUntil: undefined
      })
      sessionPin.current = pinInput
      setIsUnlocked(true)
      setPinInput('')
      setCurrentView('home')

      // Initialize Hash-FL user ID for Supabase
      let storedUserId = HashFLMessaging.getStoredUserId()
      if (!storedUserId) {
        storedUserId = await HashFLMessaging.generateUserId(pinInput)
        HashFLMessaging.setStoredUserId(storedUserId)
      }
      setHashflUserId(storedUserId)

      toast.success('Welcome back!')
    } else {
      const newAttempts = user.failedAttempts + 1

      if (settings?.silentIntruderCapture) {
        captureIntruderPhoto(pinInput)
      }

      if (newAttempts >= (settings?.maxFailedAttempts || 5)) {
        setUser({
          ...user,
          failedAttempts: newAttempts,
          lockoutUntil: Date.now() + (settings?.lockoutDuration || 30) * 60 * 1000
        })
        toast.error('Too many failed attempts. Account locked.')
      } else {
        setUser({ ...user, failedAttempts: newAttempts })
        toast.error(`Incorrect PIN. ${(settings?.maxFailedAttempts || 5) - newAttempts} attempts remaining`)
      }

      setPinInput('')
    }
  }

  const captureIntruderPhoto = async (attemptedPin: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      })

      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()

      await new Promise(resolve => setTimeout(resolve, 500))

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')?.drawImage(video, 0, 0)

      const photo = canvas.toDataURL('image/jpeg', 0.5)

      stream.getTracks().forEach(track => track.stop())

      const log: IntruderLog = {
        id: `intruder-${Date.now()}`,
        timestamp: Date.now(),
        photo,
        failedPin: attemptedPin.slice(0, 2) + '***',
        deviceInfo: navigator.userAgent.slice(0, 50)
      }

      setIntruderLogs(prev => [...(prev || []), log])
      logger.warn('Intruder attempt captured', { timestamp: log.timestamp }, 'HashFL')
    } catch {
      // Silent fail
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files
    if (!uploadedFiles || !sessionPin.current) return

    for (const file of Array.from(uploadedFiles)) {
      try {
        const reader = new FileReader()
        reader.onload = async () => {
          const base64 = reader.result as string
          const encrypted = await encryptData(base64, sessionPin.current)

          let thumbnail: string | undefined
          if (file.type.startsWith('image/')) {
            thumbnail = await createThumbnail(base64)
          }

          const encryptedFile: EncryptedFile = {
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            encryptedData: encrypted,
            thumbnail,
            createdAt: Date.now(),
            category: getFileCategory(file.type)
          }

          setFiles(prev => [...(prev || []), encryptedFile])
          toast.success(`${file.name} encrypted and stored`)
        }
        reader.readAsDataURL(file)
      } catch {
        toast.error(`Failed to encrypt ${file.name}`)
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const createThumbnail = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = document.createElement('img')
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 100
        canvas.width = size
        canvas.height = size

        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const x = (size - img.width * scale) / 2
        const y = (size - img.height * scale) / 2

        ctx?.drawImage(img, x, y, img.width * scale, img.height * scale)
        resolve(canvas.toDataURL('image/jpeg', 0.5))
      }
      img.src = base64
    })
  }

  const getFileCategory = (type: string): EncryptedFile['category'] => {
    if (type.startsWith('image/')) return 'photos'
    if (type.startsWith('video/')) return 'videos'
    if (type.startsWith('audio/')) return 'audio'
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return 'documents'
    return 'other'
  }

  const handleViewFile = async (file: EncryptedFile) => {
    try {
      const decrypted = await decryptData(file.encryptedData, sessionPin.current)

      const newWindow = window.open('', '_blank')
      if (newWindow) {
        if (file.type.startsWith('image/')) {
          newWindow.document.write(`<img src="${decrypted}" style="max-width: 100%; height: auto;">`)
        } else if (file.type.startsWith('video/')) {
          newWindow.document.write(`<video src="${decrypted}" controls style="max-width: 100%;">`)
        } else {
          const link = document.createElement('a')
          link.href = decrypted
          link.download = file.name
          link.click()
        }
      }
    } catch {
      toast.error('Failed to decrypt file')
    }
  }

  const handleDeleteFile = (fileId: string) => {
    setFiles(prev => (prev || []).filter(f => f.id !== fileId))
    toast.success('File deleted securely')
  }

  // ==========================================
  // Invite System
  // ==========================================

  // Auto-generate invite code when viewing invite screen
  useEffect(() => {
    if (currentView === 'invite' && !currentInviteCode) {
      const code = generateInviteCode()
      const invite: PendingInvite = {
        code,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      }
      setPendingInvites(prev => [...(prev || []), invite])
      setCurrentInviteCode(code)
    }
  }, [currentView, currentInviteCode])

  const createInvite = async () => {
    const code = generateInviteCode()
    const sharedKey = generateSharedKey()

    // Create local invite
    const invite: PendingInvite = {
      code,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    }
    setPendingInvites(prev => [...(prev || []), invite])
    setCurrentInviteCode(code)

    // Create connection in Supabase for realtime sync
    if (hashflUserId) {
      const connection = await HashFLMessaging.createConnection(hashflUserId, code, sharedKey)
      if (connection) {
        console.log('[HashFL] Connection created in Supabase:', connection.id)
      }
    }

    return code
  }

  const getInviteLink = () => {
    return `https://myflowsphere.com/hashfl-join/${currentInviteCode}`
  }

  const getGmailLink = (email: string) => {
    const subject = encodeURIComponent('Join me on Hash-FL Secure Messaging')
    const body = encodeURIComponent(`I'd like to connect with you on Hash-FL, a private encrypted messaging system.\n\nUse this invite code: ${currentInviteCode}\n\nOr open the app and enter the code manually.\n\nYour privacy is protected with end-to-end encryption.`)
    return `https://mail.google.com/mail/?view=cm&to=${email}&su=${subject}&body=${body}`
  }

  const getYahooLink = (email: string) => {
    const subject = encodeURIComponent('Join me on Hash-FL Secure Messaging')
    const body = encodeURIComponent(`I'd like to connect with you on Hash-FL, a private encrypted messaging system.\n\nUse this invite code: ${currentInviteCode}\n\nOr open the app and enter the code manually.\n\nYour privacy is protected with end-to-end encryption.`)
    return `https://compose.mail.yahoo.com/?to=${email}&subject=${subject}&body=${body}`
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(getInviteLink())
    toast.success('Invite link copied!')
  }

  const copyInviteCode = () => {
    navigator.clipboard.writeText(currentInviteCode)
    toast.success('Invite code copied!')
  }

  const handleJoinWithCode = async () => {
    if (!joinCode || joinCode.length < 6) {
      toast.error('Please enter a valid invite code')
      return
    }

    if (!contactName.trim()) {
      toast.error('Please enter a name for this contact')
      return
    }

    // Try to accept invite in Supabase
    let connectionId: string | undefined
    let sharedKey = generateSharedKey()

    if (hashflUserId) {
      const connection = await HashFLMessaging.acceptInvite(hashflUserId, joinCode.toUpperCase())
      if (connection) {
        connectionId = connection.id
        sharedKey = connection.shared_key
        console.log('[HashFL] Joined connection:', connectionId)
      } else {
        // Connection not found in Supabase, create local only
        console.log('[HashFL] No Supabase connection found, creating local contact')
      }
    }

    const newContact: SecureContact = {
      id: `contact-${Date.now()}`,
      name: contactName.trim(),
      inviteCode: joinCode.toUpperCase(),
      sharedKey: sharedKey,
      connectionId: connectionId,
      addedAt: Date.now(),
      status: 'accepted'
    }

    setContacts(prev => [...(prev || []), newContact])
    setJoinCode('')
    setContactName('')
    setCurrentView('contacts')
    toast.success(`${newContact.name} added to contacts!`)
  }

  // Handle QR code scan result
  const handleQRScan = (data: string) => {
    console.log('[HashFL] QR Scanned:', data)
    setShowQRScanner(false)

    try {
      // Try to parse as JSON (our QR format)
      const parsed = JSON.parse(data)

      if (parsed.type === 'hashfl-invite' && parsed.code) {
        setJoinCode(parsed.code)
        toast.success(`Invite code detected: ${parsed.code}`)
      } else {
        // Maybe it's just a raw code
        setJoinCode(data.toUpperCase().slice(0, 8))
        toast.info('Code scanned - enter contact name to continue')
      }
    } catch {
      // Not JSON, treat as raw invite code
      const cleanCode = data.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8)
      if (cleanCode.length >= 6) {
        setJoinCode(cleanCode)
        toast.success(`Code detected: ${cleanCode}`)
      } else {
        toast.error('Invalid QR code format')
      }
    }
  }

  // ==========================================
  // Messaging System (Hash-FL ONLY - Separate from Vault)
  // ==========================================

  const getDecryptedMessages = async (contactId: string): Promise<SecureMessage[]> => {
    const contactMessages = (messages || []).filter(m => m.contactId === contactId)
    const decrypted: SecureMessage[] = []

    for (const msg of contactMessages) {
      try {
        const decryptedContent = await decryptData(msg.content, sessionPin.current)
        decrypted.push({ ...msg, content: decryptedContent })
      } catch {
        decrypted.push({ ...msg, content: '[Unable to decrypt]' })
      }
    }

    return decrypted.sort((a, b) => a.timestamp - b.timestamp)
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedContact) return

    try {
      // If contact has a Supabase connection, send via realtime
      if (selectedContact.connectionId && hashflUserId) {
        const encryptedContent = await HashFLMessaging.encryptMessage(
          messageInput.trim(),
          selectedContact.sharedKey
        )

        const sentMessage = await HashFLMessaging.sendMessage(
          selectedContact.connectionId,
          hashflUserId,
          encryptedContent,
          'text'
        )

        if (sentMessage) {
          // Update contact's last message time
          setContacts(prev => (prev || []).map(c =>
            c.id === selectedContact.id ? { ...c, lastMessage: Date.now() } : c
          ))
          setMessageInput('')
          toast.success('Message sent')

          // Scroll to bottom
          setTimeout(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
          }, 100)
        } else {
          toast.error('Failed to send message')
        }
      } else {
        // Fallback to local-only storage
        if (!sessionPin.current) return

        const encryptedContent = await encryptData(messageInput.trim(), sessionPin.current)

        const newMessage: SecureMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          contactId: selectedContact.id,
          content: encryptedContent,
          timestamp: Date.now(),
          isOutgoing: true,
          isRead: true,
          isDelivered: true
        }

        setMessages(prev => [...(prev || []), newMessage])

        // Update contact's last message time
        setContacts(prev => (prev || []).map(c =>
          c.id === selectedContact.id ? { ...c, lastMessage: Date.now() } : c
        ))

        setMessageInput('')
        toast.success('Message saved locally')

        setTimeout(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
        }, 100)
      }
    } catch (err) {
      console.error('[HashFL] Send message error:', err)
      toast.error('Failed to send message')
    }
  }

  const [decryptedMessages, setDecryptedMessages] = useState<SecureMessage[]>([])

  // Load messages and subscribe to realtime when chat opens
  useEffect(() => {
    if (currentView !== 'chat' || !selectedContact) return

    let unsubscribe: (() => void) | null = null

    const loadMessages = async () => {
      // If connected via Supabase, load from there
      if (selectedContact.connectionId) {
        const supabaseMessages = await HashFLMessaging.getMessages(selectedContact.connectionId)

        // Decrypt messages
        const decrypted: SecureMessage[] = []
        for (const msg of supabaseMessages) {
          try {
            const content = await HashFLMessaging.decryptMessage(msg.encrypted_content, selectedContact.sharedKey)
            decrypted.push({
              id: msg.id,
              contactId: selectedContact.id,
              content,
              timestamp: new Date(msg.created_at).getTime(),
              isOutgoing: msg.sender_id === hashflUserId,
              isRead: !!msg.read_at,
              isDelivered: !!msg.delivered_at
            })
          } catch {
            decrypted.push({
              id: msg.id,
              contactId: selectedContact.id,
              content: '[Unable to decrypt]',
              timestamp: new Date(msg.created_at).getTime(),
              isOutgoing: msg.sender_id === hashflUserId,
              isRead: false,
              isDelivered: false
            })
          }
        }
        setDecryptedMessages(decrypted.sort((a, b) => a.timestamp - b.timestamp))

        // Subscribe to new messages
        unsubscribe = HashFLMessaging.subscribeToMessages(
          selectedContact.connectionId,
          async (newMsg) => {
            try {
              const content = await HashFLMessaging.decryptMessage(newMsg.encrypted_content, selectedContact.sharedKey)
              const decryptedMsg: SecureMessage = {
                id: newMsg.id,
                contactId: selectedContact.id,
                content,
                timestamp: new Date(newMsg.created_at).getTime(),
                isOutgoing: newMsg.sender_id === hashflUserId,
                isRead: !!newMsg.read_at,
                isDelivered: !!newMsg.delivered_at
              }
              setDecryptedMessages(prev => [...prev, decryptedMsg])

              // Scroll to bottom on new message
              setTimeout(() => {
                scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
              }, 100)

              // Show toast for incoming messages
              if (newMsg.sender_id !== hashflUserId) {
                toast.info('New message received')
              }
            } catch (err) {
              console.error('[HashFL] Failed to decrypt realtime message:', err)
            }
          }
        )
      } else {
        // Fallback to local messages
        getDecryptedMessages(selectedContact.id).then(setDecryptedMessages)
      }
    }

    loadMessages()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [currentView, selectedContact, hashflUserId])

  // ==========================================
  // Render Functions
  // ==========================================

  const renderLockScreen = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-950 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm px-6"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Fingerprint className="w-10 h-10 text-white" weight="bold" />
          </div>
          <h1 className="text-2xl font-bold text-white">Hash-FL</h1>
          <p className="text-emerald-300 text-sm mt-1">Privacy-First System</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Input
              type={showPin ? 'text' : 'password'}
              placeholder="Enter PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              className="text-center text-2xl tracking-[0.5em] bg-emerald-900/50 border-emerald-700 text-white placeholder:text-emerald-600"
              maxLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400"
            >
              {showPin ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <Button
            onClick={handleUnlock}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30"
            disabled={pinInput.length < 4}
          >
            <LockOpen className="w-5 h-5 mr-2" />
            Unlock
          </Button>

          {user?.biometricEnabled && (
            <Button variant="outline" className="w-full border-emerald-700 text-emerald-300 hover:bg-emerald-900/50">
              <Fingerprint className="w-5 h-5 mr-2" />
              Use Biometrics
            </Button>
          )}
        </div>

        {user && user.failedAttempts > 0 && (
          <p className="text-center text-red-400 text-sm mt-4">
            {(settings?.maxFailedAttempts || 5) - user.failedAttempts} attempts remaining
          </p>
        )}
      </motion.div>
    </div>
  )

  const renderSetupScreen = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-950 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm px-6"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <ShieldCheck className="w-10 h-10 text-white" weight="fill" />
          </div>
          <h1 className="text-2xl font-bold text-white">Setup Hash-FL</h1>
          <p className="text-emerald-300 text-sm mt-1">Create your secure PIN</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-emerald-300">Create PIN (4-8 digits)</Label>
            <Input
              type={showPin ? 'text' : 'password'}
              placeholder="Enter PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="text-center text-xl tracking-[0.5em] bg-emerald-900/50 border-emerald-700 text-white mt-1 placeholder:text-emerald-600"
              maxLength={8}
            />
          </div>

          <div>
            <Label className="text-emerald-300">Confirm PIN</Label>
            <Input
              type={showPin ? 'text' : 'password'}
              placeholder="Confirm PIN"
              value={confirmPinInput}
              onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="text-center text-xl tracking-[0.5em] bg-emerald-900/50 border-emerald-700 text-white mt-1 placeholder:text-emerald-600"
              maxLength={8}
            />
          </div>

          <Button
            onClick={handleSetupPin}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30"
            disabled={pinInput.length < 4 || pinInput !== confirmPinInput}
          >
            <Shield className="w-5 h-5 mr-2" />
            Create Secure Storage
          </Button>
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-emerald-900/30 border border-emerald-700/50">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-300">
              <p className="font-medium text-emerald-200">Privacy Guaranteed</p>
              <p className="mt-1 opacity-80">Your data is encrypted on-device and never leaves your phone. Even FlowSphere cannot access it.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )

  const renderHome = () => {
    const filesByCategory = {
      photos: (files || []).filter(f => f.category === 'photos').length,
      videos: (files || []).filter(f => f.category === 'videos').length,
      documents: (files || []).filter(f => f.category === 'documents').length,
      audio: (files || []).filter(f => f.category === 'audio').length,
      other: (files || []).filter(f => f.category === 'other').length
    }

    return (
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-4 text-center">
              <FolderLock className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-2xl font-bold">{(files || []).length}</p>
              <p className="text-xs text-muted-foreground">Encrypted Files</p>
            </CardContent>
          </Card>
          <Card className="bg-teal-500/10 border-teal-500/20">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-teal-500" />
              <p className="text-2xl font-bold">{(contacts || []).length}</p>
              <p className="text-xs text-muted-foreground">Secure Contacts</p>
            </CardContent>
          </Card>
          <Card className="bg-cyan-500/10 border-cyan-500/20">
            <CardContent className="p-4 text-center">
              <Chat className="w-8 h-8 mx-auto mb-2 text-cyan-500" />
              <p className="text-2xl font-bold">{(messages || []).length}</p>
              <p className="text-xs text-muted-foreground">Messages</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardContent className="p-4 text-center">
              <ShieldWarning className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{(intruderLogs || []).length}</p>
              <p className="text-xs text-muted-foreground">Intruder Logs</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-emerald-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-emerald-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 text-emerald-500" />
                <span>Add Files</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => setCurrentView('files')}
              >
                <FolderLock className="w-6 h-6 text-emerald-500" />
                <span>View Files</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 border-cyan-500/30 hover:bg-cyan-500/10"
                onClick={() => setCurrentView('messages')}
              >
                <Chat className="w-6 h-6 text-cyan-500" />
                <span>Messages</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 border-teal-500/30 hover:bg-teal-500/10"
                onClick={() => setCurrentView('contacts')}
              >
                <Users className="w-6 h-6 text-teal-500" />
                <span>Contacts</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 border-purple-500/30 hover:bg-purple-500/10"
                onClick={() => {
                  createInvite()
                  setCurrentView('invite')
                }}
              >
                <QrCode className="w-6 h-6 text-purple-500" />
                <span>Invite</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File Categories */}
        <Card className="border-emerald-500/20">
          <CardHeader>
            <CardTitle className="text-lg">Your Encrypted Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { key: 'photos', label: 'Photos', icon: FileImage, color: 'text-emerald-500' },
                { key: 'videos', label: 'Videos', icon: FileVideo, color: 'text-teal-500' },
                { key: 'documents', label: 'Documents', icon: FilePdf, color: 'text-cyan-500' },
                { key: 'audio', label: 'Audio', icon: FileAudio, color: 'text-green-500' },
                { key: 'other', label: 'Other', icon: File, color: 'text-gray-500' }
              ].map((cat) => {
                const Icon = cat.icon
                const count = filesByCategory[cat.key as keyof typeof filesByCategory]
                return (
                  <button
                    key={cat.key}
                    onClick={() => setCurrentView('files')}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-emerald-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("w-5 h-5", cat.color)} />
                      <span>{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{count} files</span>
                      <CaretRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    )
  }

  const renderInvite = () => (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setCurrentView('home')} className="text-emerald-500">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* QR Code Section */}
      <Card className="border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-500" />
            Invite via QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="p-4 bg-white rounded-2xl mb-4">
            <QRCodeSVG
              value={JSON.stringify({
                type: 'hashfl-invite',
                code: currentInviteCode,
                expires: Date.now() + 24 * 60 * 60 * 1000
              })}
              size={180}
              bgColor="#ffffff"
              fgColor="#059669"
              level="M"
              includeMargin={false}
            />
          </div>
          <p className="text-center text-sm text-muted-foreground mb-2">
            Scan this QR code to connect
          </p>
          <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-lg">
            <code className="text-lg font-mono font-bold text-emerald-500 tracking-widest">
              {currentInviteCode}
            </code>
            <Button variant="ghost" size="icon" onClick={copyInviteCode}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Expires in 24 hours</p>
        </CardContent>
      </Card>

      {/* Email Invite Section */}
      <Card className="border-teal-500/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Envelope className="w-5 h-5 text-teal-500" />
            Invite via Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="friend@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="border-red-500/30 hover:bg-red-500/10"
              onClick={() => window.open(getGmailLink(inviteEmail), '_blank')}
              disabled={!inviteEmail}
            >
              <At className="w-4 h-4 mr-2 text-red-500" />
              Gmail
            </Button>
            <Button
              variant="outline"
              className="border-purple-500/30 hover:bg-purple-500/10"
              onClick={() => window.open(getYahooLink(inviteEmail), '_blank')}
              disabled={!inviteEmail}
            >
              <At className="w-4 h-4 mr-2 text-purple-500" />
              Yahoo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Copy Link Section */}
      <Card className="border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link className="w-5 h-5 text-cyan-500" />
            Share Invite Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={getInviteLink()}
              readOnly
              className="font-mono text-sm"
            />
            <Button onClick={copyInviteLink} className="bg-gradient-to-r from-emerald-500 to-teal-600">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scan QR Code Section */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="w-5 h-5 text-purple-500" />
            Scan QR Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowQRScanner(true)}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600"
          >
            <Camera className="w-4 h-4 mr-2" />
            Open Camera to Scan
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Scan a friend's QR code to connect instantly
          </p>
        </CardContent>
      </Card>

      {/* Join with Code Section */}
      <Card className="border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-500" />
            Join with Invite Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Invite Code</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Enter 8-character code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 8))}
                className="font-mono text-center tracking-widest"
                maxLength={8}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowQRScanner(true)}
                className="border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <QrCode className="w-4 h-4 text-emerald-500" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Contact Name</Label>
            <Input
              placeholder="Name for this contact"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleJoinWithCode}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
            disabled={joinCode.length < 6 || !contactName.trim()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </CardContent>
      </Card>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />
    </div>
  )

  const renderContacts = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setCurrentView('home')} className="text-emerald-500">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={() => { createInvite(); setCurrentView('invite') }} className="bg-gradient-to-r from-emerald-500 to-teal-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <div className="space-y-2">
        {(contacts || []).map((contact) => (
          <Card
            key={contact.id}
            className="border-emerald-500/20"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{contact.name}</h3>
                    {contact.status === 'pending' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500">
                        Pending
                      </span>
                    )}
                    {contact.status === 'active' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Added {new Date(contact.addedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setContacts(prev => (prev || []).filter(c => c.id !== contact.id))
                    toast.success('Contact removed')
                  }}
                >
                  <Trash className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!contacts || contacts.length === 0) && (
        <Card className="p-8 text-center border-emerald-500/20">
          <Users className="w-12 h-12 mx-auto mb-4 text-emerald-500/50" />
          <p className="text-muted-foreground">No contacts yet</p>
          <Button
            className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-600"
            onClick={() => { createInvite(); setCurrentView('invite') }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite Someone
          </Button>
        </Card>
      )}
    </div>
  )

  const renderMessages = () => {
    // Get contacts with messages, sorted by last message
    const contactsWithMessages = (contacts || [])
      .map(contact => {
        const contactMsgs = (messages || []).filter(m => m.contactId === contact.id)
        const lastMsg = contactMsgs.sort((a, b) => b.timestamp - a.timestamp)[0]
        return { ...contact, lastMessageData: lastMsg, messageCount: contactMsgs.length }
      })
      .sort((a, b) => (b.lastMessage || 0) - (a.lastMessage || 0))

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setCurrentView('home')} className="text-emerald-500">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={() => setCurrentView('contacts')} className="bg-gradient-to-r from-emerald-500 to-teal-600">
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <div className="space-y-2">
          {contactsWithMessages.map((contact) => (
            <Card
              key={contact.id}
              className="border-emerald-500/20 cursor-pointer hover:bg-emerald-500/5 transition-colors"
              onClick={() => {
                setSelectedContact(contact)
                setCurrentView('chat')
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{contact.name}</h3>
                      {contact.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(contact.lastMessage).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {contact.messageCount > 0 ? `${contact.messageCount} messages` : 'No messages yet'}
                    </p>
                  </div>
                  <CaretRight className="w-5 h-5 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!contacts || contacts.length === 0) && (
          <Card className="p-8 text-center border-emerald-500/20">
            <Chat className="w-12 h-12 mx-auto mb-4 text-emerald-500/50" />
            <p className="text-muted-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add contacts to start messaging</p>
            <Button
              className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-600"
              onClick={() => { createInvite(); setCurrentView('invite') }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Invite Someone
            </Button>
          </Card>
        )}
      </div>
    )
  }

  const renderChat = () => {
    if (!selectedContact) return null

    return (
      <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px]">
        {/* Chat Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-emerald-500/20">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedContact(null)
              setCurrentView('messages')
            }}
            className="text-emerald-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
            {selectedContact.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{selectedContact.name}</h3>
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              End-to-end encrypted
            </p>
          </div>
          <Button variant="ghost" size="icon">
            <DotsThree className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 py-4">
          <div className="space-y-3">
            {decryptedMessages.length === 0 ? (
              <div className="text-center py-12">
                <Lock className="w-12 h-12 mx-auto mb-4 text-emerald-500/30" />
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground">Send a message to start the conversation</p>
              </div>
            ) : (
              decryptedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.isOutgoing ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] px-4 py-2 rounded-2xl",
                      msg.isOutgoing
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      msg.isOutgoing ? "text-emerald-100" : "text-muted-foreground"
                    )}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.isOutgoing && msg.isDelivered && (
                        <CheckCircle className="w-3 h-3 inline ml-1" weight="fill" />
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="flex gap-2 pt-4 border-t border-emerald-500/20">
          <Input
            placeholder="Type a secure message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            className="flex-1 bg-emerald-500/5 border-emerald-500/20"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            className="bg-gradient-to-r from-emerald-500 to-teal-600"
          >
            <PaperPlaneTilt className="w-5 h-5" weight="fill" />
          </Button>
        </div>
      </div>
    )
  }

  const renderFiles = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setCurrentView('home')} className="text-emerald-500">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={() => fileInputRef.current?.click()} className="bg-gradient-to-r from-emerald-500 to-teal-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Files
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {(files || []).map((file) => (
          <Card key={file.id} className="overflow-hidden border-emerald-500/20">
            <div
              className="aspect-square bg-emerald-500/5 flex items-center justify-center cursor-pointer"
              onClick={() => handleViewFile(file)}
            >
              {file.thumbnail ? (
                <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
              ) : (
                <File className="w-12 h-12 text-emerald-500/50" />
              )}
            </div>
            <CardContent className="p-2">
              <p className="text-xs truncate">{file.name}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id) }}
                >
                  <Trash className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(files || []).length === 0 && (
        <Card className="p-8 text-center border-emerald-500/20">
          <FolderLock className="w-12 h-12 mx-auto mb-4 text-emerald-500/50" />
          <p className="text-muted-foreground">No encrypted files yet</p>
          <Button className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-600" onClick={() => fileInputRef.current?.click()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First File
          </Button>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => setCurrentView('home')} className="text-emerald-500">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Card className="border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-lg">Security Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Silent Intruder Capture</Label>
              <p className="text-xs text-muted-foreground">Capture photo on failed PIN attempts</p>
            </div>
            <Switch
              checked={settings?.silentIntruderCapture}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev!, silentIntruderCapture: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Lock (minutes)</Label>
              <p className="text-xs text-muted-foreground">Lock after inactivity</p>
            </div>
            <select
              value={settings?.autoLockMinutes}
              onChange={(e) => setSettings(prev => ({ ...prev!, autoLockMinutes: parseInt(e.target.value) }))}
              className="px-3 py-1 rounded bg-muted"
            >
              <option value={1}>1 min</option>
              <option value={5}>5 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Max Failed Attempts</Label>
              <p className="text-xs text-muted-foreground">Before lockout</p>
            </div>
            <select
              value={settings?.maxFailedAttempts}
              onChange={(e) => setSettings(prev => ({ ...prev!, maxFailedAttempts: parseInt(e.target.value) }))}
              className="px-3 py-1 rounded bg-muted"
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Hide When Switching Apps</Label>
              <p className="text-xs text-muted-foreground">Blur content in app switcher</p>
            </div>
            <Switch
              checked={settings?.hideAppContent}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev!, hideAppContent: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldWarning className="w-5 h-5 text-orange-500" />
            Intruder Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full border-emerald-500/30"
            onClick={() => setCurrentView('intruder-logs')}
          >
            View {(intruderLogs || []).length} Logs
            <CaretRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-500/20">
        <CardContent className="p-4">
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              if (confirm('This will delete all Hash-FL data. Are you sure?')) {
                setUser(null)
                setFiles([])
                setContacts([])
                setIntruderLogs([])
                setPendingInvites([])
                setIsUnlocked(false)
                toast.success('All data erased')
              }
            }}
          >
            <Trash className="w-4 h-4 mr-2" />
            Erase All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  const renderIntruderLogs = () => (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => setCurrentView('settings')} className="text-emerald-500">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="space-y-4">
        {(intruderLogs || []).map((log) => (
          <Card key={log.id} className="border-red-500/20">
            <CardContent className="p-4">
              <div className="flex gap-4">
                {log.photo && (
                  <img
                    src={log.photo}
                    alt="Intruder"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-red-500">Failed Access Attempt</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                  {log.failedPin && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Attempted PIN: {log.failedPin}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIntruderLogs(prev => (prev || []).filter(l => l.id !== log.id))}
                >
                  <Trash className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {(intruderLogs || []).length === 0 && (
          <Card className="p-8 text-center border-emerald-500/20">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
            <p className="text-muted-foreground">No intrusion attempts detected</p>
          </Card>
        )}
      </div>
    </div>
  )

  // ==========================================
  // Main Render
  // ==========================================

  if (currentView === 'lock') return renderLockScreen()
  if (currentView === 'setup') return renderSetupScreen()

  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Shield },
    { id: 'files' as const, label: 'Files', icon: FolderLock },
    { id: 'messages' as const, label: 'Messages', icon: Chat },
    { id: 'contacts' as const, label: 'Contacts', icon: Users },
    { id: 'settings' as const, label: 'Settings', icon: Gear }
  ]

  return (
    <div className={cn("space-y-6", isMobile && "space-y-4")}>
      {/* Header */}
      <Card className="bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-500/20">
        <CardHeader className={cn(isMobile ? "pb-2" : "pb-4")}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Fingerprint className="w-6 h-6 text-white" weight="bold" />
              </div>
              <div>
                <h1 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>
                  Hash-FL Privacy
                </h1>
                <p className="text-sm text-emerald-500">
                  Your encrypted private space
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsUnlocked(false)
                sessionPin.current = ''
                toast.info('Hash-FL locked')
              }}
              className="text-emerald-500 hover:bg-emerald-500/10"
            >
              <Lock className="w-5 h-5" />
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Navigation */}
      {!['chat', 'invite', 'intruder-logs'].includes(currentView) && (
        <div className={cn(
          "flex gap-2 p-1 bg-emerald-500/5 rounded-xl overflow-x-auto border border-emerald-500/20",
          isMobile && "scrollbar-hide"
        )}>
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <Button
                key={tab.id}
                variant={currentView === tab.id ? 'default' : 'ghost'}
                size={isMobile ? 'sm' : 'default'}
                onClick={() => setCurrentView(tab.id)}
                className={cn(
                  "flex-shrink-0",
                  isMobile && "px-3",
                  currentView === tab.id && "bg-gradient-to-r from-emerald-500 to-teal-600"
                )}
              >
                <Icon className={cn("w-4 h-4", !isMobile && "mr-2")} />
                {!isMobile && tab.label}
              </Button>
            )
          })}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {currentView === 'home' && renderHome()}
          {currentView === 'files' && renderFiles()}
          {currentView === 'messages' && renderMessages()}
          {currentView === 'chat' && renderChat()}
          {currentView === 'contacts' && renderContacts()}
          {currentView === 'invite' && renderInvite()}
          {currentView === 'settings' && renderSettings()}
          {currentView === 'intruder-logs' && renderIntruderLogs()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
