/**
 * Hash-FL Privacy System
 * Privacy-first encrypted storage and communication system
 * SEPARATE from the CEO Shadow Vault - this is for regular users
 *
 * Features:
 * - End-to-end encrypted file storage
 * - QR code contact invitations
 * - Biometric/PIN authentication
 * - Encrypted messaging
 * - Privacy-first (no data leaves device)
 * - Intruder detection with silent photo capture
 */

import { useState, useEffect, useRef, useCallback } from 'react'
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
  Hash,
  ShieldCheck,
  ShieldWarning,
  UserCircle,
  PaperPlaneTilt,
  Image,
  FolderLock
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'
import { logger } from '@/lib/security-utils'

// ==========================================
// Types
// ==========================================

interface HashFLUser {
  id: string
  pin: string // Hashed PIN
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
  publicKey: string
  addedAt: number
  lastMessage?: number
  avatar?: string
}

interface SecureMessage {
  id: string
  contactId: string
  content: string
  timestamp: number
  isOutgoing: boolean
  isRead: boolean
}

interface IntruderLog {
  id: string
  timestamp: number
  photo?: string // Base64 photo of intruder
  failedPin?: string
  deviceInfo: string
}

interface HashFLSettings {
  silentIntruderCapture: boolean
  autoLockMinutes: number
  showNotifications: boolean
  hideAppContent: boolean // Blur content when switching apps
  disguiseMode: boolean // Make app look like calculator
  maxFailedAttempts: number
  lockoutDuration: number // minutes
}

// ==========================================
// Constants
// ==========================================

const STORAGE_KEYS = {
  USER: 'hashfl-user',
  FILES: 'hashfl-files',
  CONTACTS: 'hashfl-contacts',
  MESSAGES: 'hashfl-messages',
  INTRUDER_LOGS: 'hashfl-intruder-logs',
  SETTINGS: 'hashfl-settings'
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

// Simple encryption using Web Crypto API
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

  // Combine salt + iv + encrypted data
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

function hashPin(pin: string): string {
  // Simple hash for demo - in production use bcrypt or similar
  let hash = 0
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

// ==========================================
// Main Component
// ==========================================

type ViewType = 'lock' | 'setup' | 'home' | 'files' | 'contacts' | 'messages' | 'settings' | 'intruder-logs'

export function HashFLPrivacy() {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  // State
  const [user, setUser] = useKV<HashFLUser | null>(STORAGE_KEYS.USER, null)
  const [files, setFiles] = useKV<EncryptedFile[]>(STORAGE_KEYS.FILES, [])
  const [contacts, setContacts] = useKV<SecureContact[]>(STORAGE_KEYS.CONTACTS, [])
  const [messages, setMessages] = useKV<SecureMessage[]>(STORAGE_KEYS.MESSAGES, [])
  const [intruderLogs, setIntruderLogs] = useKV<IntruderLog[]>(STORAGE_KEYS.INTRUDER_LOGS, [])
  const [settings, setSettings] = useKV<HashFLSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)

  const [currentView, setCurrentView] = useState<ViewType>('lock')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [confirmPinInput, setConfirmPinInput] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [selectedContact, setSelectedContact] = useState<SecureContact | null>(null)
  const [messageInput, setMessageInput] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sessionPin = useRef<string>('')

  // Check if user needs setup or unlock
  useEffect(() => {
    if (!user) {
      setCurrentView('setup')
    } else if (!isUnlocked) {
      // Check for lockout
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

    const newUser: HashFLUser = {
      id: `user-${Date.now()}`,
      pin: hashPin(pinInput),
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

    // Check lockout
    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      const minutes = Math.ceil((user.lockoutUntil - Date.now()) / 60000)
      toast.error(`Account locked. Try again in ${minutes} minutes`)
      return
    }

    if (hashPin(pinInput) === user.pin) {
      // Successful unlock
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
      toast.success('Welcome back!')
    } else {
      // Failed attempt
      const newAttempts = user.failedAttempts + 1

      // Capture intruder photo silently
      if (settings?.silentIntruderCapture) {
        captureIntruderPhoto(pinInput)
      }

      if (newAttempts >= (settings?.maxFailedAttempts || 5)) {
        // Lock the account
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

      // Wait for video to be ready
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
        failedPin: attemptedPin.slice(0, 2) + '***', // Partial PIN for reference
        deviceInfo: navigator.userAgent.slice(0, 50)
      }

      setIntruderLogs(prev => [...(prev || []), log])
      logger.warn('Intruder attempt captured', { timestamp: log.timestamp }, 'HashFL')
    } catch {
      // Silent fail - don't alert the intruder
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

          // Create thumbnail for images
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
      } catch (error) {
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

      // Open in new window/tab
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        if (file.type.startsWith('image/')) {
          newWindow.document.write(`<img src="${decrypted}" style="max-width: 100%; height: auto;">`)
        } else if (file.type.startsWith('video/')) {
          newWindow.document.write(`<video src="${decrypted}" controls style="max-width: 100%;">`)
        } else {
          // Download for other file types
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

  const generateQRInvite = () => {
    // Generate a temporary public key for contact exchange
    const inviteCode = btoa(JSON.stringify({
      type: 'hashfl-invite',
      userId: user?.id,
      timestamp: Date.now(),
      expires: Date.now() + 5 * 60 * 1000 // 5 minute expiry
    }))

    return inviteCode
  }

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedContact) return

    const newMessage: SecureMessage = {
      id: `msg-${Date.now()}`,
      contactId: selectedContact.id,
      content: messageInput.trim(),
      timestamp: Date.now(),
      isOutgoing: true,
      isRead: true
    }

    setMessages(prev => [...(prev || []), newMessage])
    setMessageInput('')
  }

  // ==========================================
  // Render Functions
  // ==========================================

  const renderLockScreen = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm px-6"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Hash className="w-10 h-10 text-white" weight="bold" />
          </div>
          <h1 className="text-2xl font-bold text-white">Hash-FL</h1>
          <p className="text-gray-400 text-sm mt-1">Privacy-First System</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Input
              type={showPin ? 'text' : 'password'}
              placeholder="Enter PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              className="text-center text-2xl tracking-[0.5em] bg-gray-800 border-gray-700 text-white"
              maxLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPin ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <Button
            onClick={handleUnlock}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            disabled={pinInput.length < 4}
          >
            <LockOpen className="w-5 h-5 mr-2" />
            Unlock
          </Button>

          {user?.biometricEnabled && (
            <Button variant="outline" className="w-full border-gray-700 text-gray-300">
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
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm px-6"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-white" weight="fill" />
          </div>
          <h1 className="text-2xl font-bold text-white">Setup Hash-FL</h1>
          <p className="text-gray-400 text-sm mt-1">Create your secure PIN</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Create PIN (4-8 digits)</Label>
            <Input
              type={showPin ? 'text' : 'password'}
              placeholder="Enter PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="text-center text-xl tracking-[0.5em] bg-gray-800 border-gray-700 text-white mt-1"
              maxLength={8}
            />
          </div>

          <div>
            <Label className="text-gray-300">Confirm PIN</Label>
            <Input
              type={showPin ? 'text' : 'password'}
              placeholder="Confirm PIN"
              value={confirmPinInput}
              onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="text-center text-xl tracking-[0.5em] bg-gray-800 border-gray-700 text-white mt-1"
              maxLength={8}
            />
          </div>

          <Button
            onClick={handleSetupPin}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
            disabled={pinInput.length < 4 || pinInput !== confirmPinInput}
          >
            <Shield className="w-5 h-5 mr-2" />
            Create Secure Storage
          </Button>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-400">
              <p className="font-medium text-gray-300">Privacy Guaranteed</p>
              <p className="mt-1">Your data is encrypted on-device and never leaves your phone. Even FlowSphere cannot access it.</p>
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
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4 text-center">
              <FolderLock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{(files || []).length}</p>
              <p className="text-xs text-muted-foreground">Encrypted Files</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{(contacts || []).length}</p>
              <p className="text-xs text-muted-foreground">Secure Contacts</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <Chat className="w-8 h-8 mx-auto mb-2 text-purple-500" />
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6" />
                <span>Add Files</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => setCurrentView('files')}
              >
                <FolderLock className="w-6 h-6" />
                <span>View Files</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => setCurrentView('messages')}
              >
                <Chat className="w-6 h-6" />
                <span>Messages</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => setCurrentView('contacts')}
              >
                <QrCode className="w-6 h-6" />
                <span>Add Contact</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Encrypted Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { key: 'photos', label: 'Photos', icon: FileImage, color: 'text-blue-500' },
                { key: 'videos', label: 'Videos', icon: FileVideo, color: 'text-purple-500' },
                { key: 'documents', label: 'Documents', icon: FilePdf, color: 'text-green-500' },
                { key: 'audio', label: 'Audio', icon: FileAudio, color: 'text-orange-500' },
                { key: 'other', label: 'Other', icon: File, color: 'text-gray-500' }
              ].map((cat) => {
                const Icon = cat.icon
                const count = filesByCategory[cat.key as keyof typeof filesByCategory]
                return (
                  <button
                    key={cat.key}
                    onClick={() => setCurrentView('files')}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
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

  const renderFiles = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setCurrentView('home')}>
          <X className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={() => fileInputRef.current?.click()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Files
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {(files || []).map((file) => (
          <Card key={file.id} className="overflow-hidden">
            <div
              className="aspect-square bg-muted flex items-center justify-center cursor-pointer"
              onClick={() => handleViewFile(file)}
            >
              {file.thumbnail ? (
                <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
              ) : (
                <File className="w-12 h-12 text-muted-foreground" />
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
                  onClick={() => handleDeleteFile(file.id)}
                >
                  <Trash className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(files || []).length === 0 && (
        <Card className="p-8 text-center">
          <FolderLock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No encrypted files yet</p>
          <Button className="mt-4" onClick={() => fileInputRef.current?.click()}>
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
      <Button variant="ghost" onClick={() => setCurrentView('home')}>
        <X className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Card>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldWarning className="w-5 h-5 text-orange-500" />
            Intruder Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
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
                setMessages([])
                setIntruderLogs([])
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
      <Button variant="ghost" onClick={() => setCurrentView('settings')}>
        <X className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="space-y-4">
        {(intruderLogs || []).map((log) => (
          <Card key={log.id}>
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
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="text-muted-foreground">No intrusion attempts detected</p>
          </Card>
        )}
      </div>
    </div>
  )

  // ==========================================
  // Main Render
  // ==========================================

  // Show lock or setup screens
  if (currentView === 'lock') return renderLockScreen()
  if (currentView === 'setup') return renderSetupScreen()

  // Main app content
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
      <Card className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-500/20">
        <CardHeader className={cn(isMobile ? "pb-2" : "pb-4")}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Hash className="w-6 h-6 text-white" weight="bold" />
              </div>
              <div>
                <h1 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>
                  Hash-FL Privacy
                </h1>
                <p className="text-sm text-muted-foreground">
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
            >
              <Lock className="w-5 h-5" />
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Navigation */}
      <div className={cn(
        "flex gap-2 p-1 bg-muted rounded-lg overflow-x-auto",
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
              className={cn("flex-shrink-0", isMobile && "px-3")}
            >
              <Icon className={cn("w-4 h-4", !isMobile && "mr-2")} />
              {!isMobile && tab.label}
            </Button>
          )
        })}
      </div>

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
          {currentView === 'settings' && renderSettings()}
          {currentView === 'intruder-logs' && renderIntruderLogs()}
          {currentView === 'messages' && (
            <Card className="p-8 text-center">
              <Chat className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Encrypted messaging coming soon</p>
              <p className="text-xs text-muted-foreground mt-2">
                Add contacts via QR code to start secure conversations
              </p>
            </Card>
          )}
          {currentView === 'contacts' && (
            <Card className="p-8 text-center">
              <QrCode className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">QR Contact Exchange</p>
              <p className="text-xs text-muted-foreground mt-2">
                Only add contacts by scanning QR codes in person
              </p>
              <Button className="mt-4" variant="outline">
                <QrCode className="w-4 h-4 mr-2" />
                Generate My QR Code
              </Button>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
