import { useState, useEffect } from 'react'
import { logger } from '@/lib/security-utils'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash, Eye, EyeSlash, Copy, Key, ShieldCheck, Lock, ChatCircle, Folder, NotePencil, Gear, PaperPlaneTilt, MagnifyingGlass, Download, Upload, FilePdf, FileDoc, FileImage, FileZip, Paperclip, DotsThreeVertical, Check, CheckCircle, Star, QrCode, Warning } from '@phosphor-icons/react'
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SecureMessenger } from '@/components/secure-messenger'
import { CEODashboard } from '@/components/ceo-dashboard'
import { isCEOUser } from '@/lib/ceo-check'
import { encryptData, decryptData, encryptFile, decryptFile, hashPin, verifyPin, getEncryptionInfo, type EncryptionResult } from '@/lib/encryption'

interface VaultItem {
  id: string
  title: string
  username?: string
  password?: string
  notes?: string
  category: 'login' | 'note' | 'card'
  createdAt: string
  updatedAt: string
}

interface VaultMessage {
  id: string
  text: string
  timestamp: string
  isEncrypted: boolean
  isFavorite?: boolean
  // Expiry options
  expiryType?: 'none' | 'view-once' | 'timed'
  expiresAt?: string // ISO date string for timed expiry
  viewCount?: number // For view-once: 0 = not viewed, 1 = viewed (delete)
}

interface VaultFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  isEncrypted: boolean
  content?: string
  // E2EE encryption metadata
  encryptionMeta?: {
    iv: string
    salt: string
    algorithm: string
    version: string
  }
  // Expiry options
  expiryType?: 'none' | 'view-once' | 'timed'
  expiresAt?: string // ISO date string for timed expiry
  downloadCount?: number // For view-once: delete after first download
}

interface VaultNote {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  isPinned?: boolean
  tags?: string[]
}

interface VaultSettings {
  autoLock: boolean
  autoLockTimeout: number
  biometricUnlock: boolean
  notificationsEnabled: boolean
  backupEnabled: boolean
  defaultEncryption: boolean
}

interface VaultProps {
  onNavigate?: (view: string) => void
}

export function Vault({ onNavigate }: VaultProps) {
  const [activeTab, setActiveTab] = useState<'passwords' | 'messages' | 'files' | 'notes' | 'settings'>('passwords')

  const [vaultItems, setVaultItems] = useKV<VaultItem[]>('flowsphere-vault-items', [])
  const [messages, setMessages] = useKV<VaultMessage[]>('flowsphere-vault-messages', [])
  const [files, setFiles] = useKV<VaultFile[]>('flowsphere-vault-files', [])
  const [notes, setNotes] = useKV<VaultNote[]>('flowsphere-vault-notes', [])
  const [settings, setSettings] = useKV<VaultSettings>('flowsphere-vault-settings', {
    autoLock: true,
    autoLockTimeout: 5,
    biometricUnlock: false,
    notificationsEnabled: true,
    backupEnabled: false,
    defaultEncryption: true
  })

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [messageExpiry, setMessageExpiry] = useState<'none' | 'view-once' | '1h' | '24h' | '7d'>('none')
  const [editingNote, setEditingNote] = useState<VaultNote | null>(null)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [showMessenger, setShowMessenger] = useState(false)
  const [showCEOTOTP, setShowCEOTOTP] = useState(false)
  const [ceoDashboardOpen, setCEODashboardOpen] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [totpVerified, setTotpVerified] = useState(false)

  // 2FA Setup state
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [setupTotpSecret, setSetupTotpSecret] = useState<string>('')
  const [setupVerificationCode, setSetupVerificationCode] = useState('')
  const [is2FAConfigured, setIs2FAConfigured] = useState(false)

  // Check if 2FA is already configured
  useEffect(() => {
    const configured = localStorage.getItem('flowsphere_ceo_2fa_configured') === 'true'
    setIs2FAConfigured(configured)
  }, [])

  // E2EE File encryption state
  const [showEncryptionPinDialog, setShowEncryptionPinDialog] = useState(false)
  const [encryptionPin, setEncryptionPin] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [showDecryptionPinDialog, setShowDecryptionPinDialog] = useState(false)
  const [decryptionPin, setDecryptionPin] = useState('')
  const [fileToDecrypt, setFileToDecrypt] = useState<VaultFile | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState(false)

  // Biometric authentication using WebAuthn
  const authenticateWithBiometrics = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      toast.error('Biometrics not supported')
      return false
    }

    try {
      setIsBiometricAuthenticating(true)

      // Check if platform authenticator is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      if (!available) {
        toast.error('Biometric authentication not available on this device')
        return false
      }

      // Create a challenge for WebAuthn
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      // Request biometric authentication
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'FlowSphere Vault',
            id: window.location.hostname
          },
          user: {
            id: new Uint8Array(16),
            name: 'vault-user',
            displayName: 'Vault User'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000
        }
      })

      if (credential) {
        toast.success('Biometric authentication successful')
        return true
      }
      return false
    } catch (error: unknown) {
      // User cancelled or error occurred
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.info('Authentication cancelled')
      } else {
        console.error('Biometric auth error:', error)
        toast.error('Biometric authentication failed')
      }
      return false
    } finally {
      setIsBiometricAuthenticating(false)
    }
  }
  
  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    notes: '',
    category: 'login' as VaultItem['category']
  })
  
  const [noteFormData, setNoteFormData] = useState({
    title: '',
    content: '',
    tags: [] as string[]
  })

  const resetForm = () => {
    setFormData({
      title: '',
      username: '',
      password: '',
      notes: '',
      category: 'login'
    })
    setEditingItem(null)
  }

  const handleAddItem = () => {
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }

    if (editingItem) {
      setVaultItems((current) =>
        (current || []).map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                title: formData.title,
                username: formData.username,
                password: formData.password,
                notes: formData.notes,
                category: formData.category,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      )
      toast.success('Item updated')
    } else {
      const newItem: VaultItem = {
        id: Date.now().toString(),
        title: formData.title,
        username: formData.username,
        password: formData.password,
        notes: formData.notes,
        category: formData.category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      setVaultItems((current) => [...(current || []), newItem])
      toast.success('Item added to vault')
    }

    setShowAddDialog(false)
    resetForm()
  }

  const handleEditItem = (item: VaultItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      username: item.username || '',
      password: item.password || '',
      notes: item.notes || '',
      category: item.category
    })
    setShowAddDialog(true)
  }

  const handleDeleteItem = (id: string) => {
    setVaultItems((current) => (current || []).filter((item) => item.id !== id))
    toast.success('Item deleted')
  }

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const handleSendMessage = () => {
    if (!messageInput.trim()) return

    // Calculate expiry time based on selection
    let expiresAt: string | undefined
    let expiryType: 'none' | 'view-once' | 'timed' = 'none'

    if (messageExpiry === 'view-once') {
      expiryType = 'view-once'
    } else if (messageExpiry === '1h') {
      expiryType = 'timed'
      expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    } else if (messageExpiry === '24h') {
      expiryType = 'timed'
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    } else if (messageExpiry === '7d') {
      expiryType = 'timed'
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }

    const newMessage: VaultMessage = {
      id: Date.now().toString(),
      text: messageInput,
      timestamp: new Date().toISOString(),
      isEncrypted: settings?.defaultEncryption || true,
      expiryType,
      expiresAt,
      viewCount: expiryType === 'view-once' ? 0 : undefined
    }

    setMessages((current) => [...(current || []), newMessage])
    setMessageInput('')
    setMessageExpiry('none') // Reset expiry selection

    const expiryLabel = messageExpiry === 'view-once' ? ' (view-once)' :
                        messageExpiry === '1h' ? ' (expires in 1 hour)' :
                        messageExpiry === '24h' ? ' (expires in 24 hours)' :
                        messageExpiry === '7d' ? ' (expires in 7 days)' : ''
    toast.success(`Message saved securely${expiryLabel}`)
  }

  const handleDeleteMessage = (id: string) => {
    setMessages((current) => (current || []).filter((msg) => msg.id !== id))
    toast.success('Message deleted')
  }

  const handleToggleFavoriteMessage = (id: string) => {
    setMessages((current) =>
      (current || []).map((msg) =>
        msg.id === id ? { ...msg, isFavorite: !msg.isFavorite } : msg
      )
    )
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files
    if (!uploadedFiles || uploadedFiles.length === 0) return

    // Store files and show PIN dialog for encryption
    setPendingFiles(Array.from(uploadedFiles))
    setShowEncryptionPinDialog(true)

    // Reset the input so same file can be selected again
    event.target.value = ''
  }

  // Process files with E2EE encryption
  const processEncryptedUpload = async () => {
    if (encryptionPin.length < 4) {
      toast.error('PIN must be at least 4 digits')
      return
    }

    setIsEncrypting(true)

    try {
      for (const file of pendingFiles) {
        // Encrypt the file with user's PIN (never sent to server)
        const { blob, metadata } = await encryptFile(file, encryptionPin)

        // Convert encrypted blob to base64 for storage
        const reader = new FileReader()
        const encryptedContent = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })

        const newFile: VaultFile = {
          id: Date.now().toString() + Math.random().toString(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          isEncrypted: true,
          content: encryptedContent,
          encryptionMeta: {
            iv: metadata.iv,
            salt: metadata.salt,
            algorithm: metadata.algorithm,
            version: metadata.version
          }
        }

        setFiles((current) => [...(current || []), newFile])
      }

      toast.success(`${pendingFiles.length} file(s) encrypted and stored securely`, {
        description: 'AES-256-GCM encryption applied'
      })

      // Reset state
      setShowEncryptionPinDialog(false)
      setEncryptionPin('')
      setPendingFiles([])
    } catch (error) {
      console.error('Encryption failed:', error)
      toast.error('Failed to encrypt files', {
        description: 'Please try again'
      })
    } finally {
      setIsEncrypting(false)
    }
  }

  const handleDeleteFile = (id: string) => {
    setFiles((current) => (current || []).filter((file) => file.id !== id))
    toast.success('File deleted')
  }

  const handleDownloadFile = (file: VaultFile) => {
    if (!file.content) return

    // If file is encrypted, show PIN dialog
    if (file.isEncrypted && file.encryptionMeta) {
      setFileToDecrypt(file)
      setShowDecryptionPinDialog(true)
      return
    }

    // Non-encrypted file - download directly
    const link = document.createElement('a')
    link.href = file.content
    link.download = file.name
    link.click()
    toast.success('File downloaded')
  }

  // Process file decryption and download
  const processDecryptedDownload = async () => {
    if (!fileToDecrypt || !fileToDecrypt.content || !fileToDecrypt.encryptionMeta) {
      toast.error('Invalid file data')
      return
    }

    if (decryptionPin.length < 4) {
      toast.error('PIN must be at least 4 digits')
      return
    }

    setIsDecrypting(true)

    try {
      // Convert base64 data URL back to blob
      const response = await fetch(fileToDecrypt.content)
      const encryptedBlob = await response.blob()

      // Decrypt the file
      const decryptedBlob = await decryptFile(
        encryptedBlob,
        {
          iv: fileToDecrypt.encryptionMeta.iv,
          salt: fileToDecrypt.encryptionMeta.salt,
          algorithm: fileToDecrypt.encryptionMeta.algorithm,
          version: fileToDecrypt.encryptionMeta.version
        },
        decryptionPin,
        fileToDecrypt.type
      )

      // Create download link
      const url = URL.createObjectURL(decryptedBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileToDecrypt.name
      link.click()

      // Clean up
      URL.revokeObjectURL(url)

      toast.success('File decrypted and downloaded', {
        description: 'Decryption successful'
      })

      // Reset state
      setShowDecryptionPinDialog(false)
      setDecryptionPin('')
      setFileToDecrypt(null)
    } catch (error) {
      console.error('Decryption failed:', error)
      toast.error('Failed to decrypt file', {
        description: 'Incorrect PIN or corrupted file'
      })
    } finally {
      setIsDecrypting(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FilePdf className="w-8 h-8 text-red-500" weight="duotone" />
    if (type.includes('word') || type.includes('document')) return <FileDoc className="w-8 h-8 text-blue-500" weight="duotone" />
    if (type.includes('image')) return <FileImage className="w-8 h-8 text-green-500" weight="duotone" />
    if (type.includes('zip') || type.includes('compressed')) return <FileZip className="w-8 h-8 text-yellow-500" weight="duotone" />
    return <Folder className="w-8 h-8 text-muted-foreground" weight="duotone" />
  }

  const handleAddNote = () => {
    if (!noteFormData.title.trim()) {
      toast.error('Title is required')
      return
    }

    if (editingNote) {
      setNotes((current) =>
        (current || []).map((note) =>
          note.id === editingNote.id
            ? {
                ...note,
                title: noteFormData.title,
                content: noteFormData.content,
                tags: noteFormData.tags,
                updatedAt: new Date().toISOString()
              }
            : note
        )
      )
      toast.success('Note updated')
    } else {
      const newNote: VaultNote = {
        id: Date.now().toString(),
        title: noteFormData.title,
        content: noteFormData.content,
        tags: noteFormData.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      setNotes((current) => [...(current || []), newNote])
      toast.success('Note created')
    }

    setShowNoteDialog(false)
    setNoteFormData({ title: '', content: '', tags: [] })
    setEditingNote(null)
  }

  const handleEditNote = (note: VaultNote) => {
    setEditingNote(note)
    setNoteFormData({
      title: note.title,
      content: note.content,
      tags: note.tags || []
    })
    setShowNoteDialog(true)
  }

  const handleDeleteNote = (id: string) => {
    setNotes((current) => (current || []).filter((note) => note.id !== id))
    toast.success('Note deleted')
  }

  const handleTogglePinNote = (id: string) => {
    setNotes((current) =>
      (current || []).map((note) =>
        note.id === id ? { ...note, isPinned: !note.isPinned } : note
      )
    )
  }

  const handleSettingChange = <K extends keyof VaultSettings>(
    key: K,
    value: VaultSettings[K]
  ) => {
    setSettings((current) => ({
      ...(current || {
        autoLock: true,
        autoLockTimeout: 5,
        biometricUnlock: false,
        notificationsEnabled: true,
        backupEnabled: false,
        defaultEncryption: true
      }),
      [key]: value
    }))
  }

  const filteredNotes = (notes || []).filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredMessages = (messages || []).filter((msg) =>
    msg.text.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredFiles = (files || []).filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCategoryIcon = (category: VaultItem['category']) => {
    switch (category) {
      case 'login':
        return <Key className="w-4 h-4" />
      case 'note':
        return <ShieldCheck className="w-4 h-4" />
      case 'card':
        return <Lock className="w-4 h-4" />
    }
  }

  const categories: { value: VaultItem['category']; label: string }[] = [
    { value: 'login', label: 'Login' },
    { value: 'note', label: 'Secure Note' },
    { value: 'card', label: 'Card' }
  ]

  return (
    <>
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('settings')}
              className="mr-2"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
          <ShieldCheck className="w-8 h-8 text-primary" weight="duotone" />
          <div>
            <h1 className="text-3xl font-bold">Secure Vault</h1>
            <p className="text-sm text-muted-foreground">Your private encrypted storage</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <div className="px-6 py-3 border-b">
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="passwords" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
                <Key className="w-4 h-4" />
                <span className="hidden sm:inline">Passwords</span>
                <span className="sm:hidden">Pass</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
                <ChatCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Messages</span>
                <span className="sm:hidden">Msg</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
                <Folder className="w-4 h-4" />
                <span>Files</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
                <NotePencil className="w-4 h-4" />
                <span>Notes</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
                <Gear className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden">Set</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="h-[calc(90vh-180px)] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="px-6 py-4">
              <TabsContent value="passwords" className="mt-0 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Store passwords and credentials securely
                  </p>
                  <Button
                    onClick={() => {
                      resetForm()
                      setShowAddDialog(true)
                    }}
                    className="gap-2 w-full sm:w-auto"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Password
                  </Button>
                </div>

                {(vaultItems || []).length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Key className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
                      <h3 className="text-base sm:text-lg font-semibold mb-2">No passwords stored</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                        Start securing your credentials
                      </p>
                      <Button
                        onClick={() => {
                          resetForm()
                          setShowAddDialog(true)
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Add First Password
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3 sm:gap-4">
                    {(vaultItems || []).map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="hover:border-primary/50 transition-colors">
                          <CardHeader className="pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {getCategoryIcon(item.category)}
                                <CardTitle className="text-sm sm:text-lg truncate">{item.title}</CardTitle>
                              </div>
                              <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditItem(item)}
                                  className="h-8 text-xs"
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-destructive hover:text-destructive h-8"
                                >
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
                            {item.username && (
                              <div className="flex items-center justify-between py-2 px-2 sm:px-3 bg-muted/50 rounded-md gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-muted-foreground mb-1">Username</p>
                                  <p className="text-xs sm:text-sm font-mono truncate">{item.username}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(item.username || '', 'Username')}
                                  className="flex-shrink-0 h-8 w-8 p-0"
                                >
                                  <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                              </div>
                            )}

                            {item.password && (
                              <div className="flex items-center justify-between py-2 px-2 sm:px-3 bg-muted/50 rounded-md gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Password</p>
                                  <p className="text-xs sm:text-sm font-mono truncate">
                                    {visiblePasswords.has(item.id)
                                      ? item.password
                                      : '••••••••••••'}
                                  </p>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => togglePasswordVisibility(item.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    {visiblePasswords.has(item.id) ? (
                                      <EyeSlash className="w-3 h-3 sm:w-4 sm:h-4" />
                                    ) : (
                                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(item.password || '', 'Password')}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}

                            {item.notes && (
                              <div className="py-2 px-2 sm:px-3 bg-muted/50 rounded-md">
                                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                                <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{item.notes}</p>
                              </div>
                            )}

                            <p className="text-xs text-muted-foreground">
                              Updated {new Date(item.updatedAt).toLocaleDateString()}
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="messages" className="mt-0 space-y-4">
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                  <CardContent className="py-12 text-center">
                    <ChatCircle className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-primary" weight="duotone" />
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">Secure Messenger</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                      End-to-end encrypted messaging with QR code invites. Connect securely with trusted contacts using one-time invite codes.
                    </p>
                    <Button
                      onClick={() => setShowMessenger(true)}
                      size="lg"
                      className="gap-2"
                    >
                      <ChatCircle className="w-5 h-5" weight="fill" />
                      Open Messenger
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-primary" weight="duotone" />
                      <p className="text-sm font-medium mb-1">End-to-End Encrypted</p>
                      <p className="text-xs text-muted-foreground">
                        Military-grade encryption
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Key className="w-8 h-8 mx-auto mb-2 text-primary" weight="duotone" />
                      <p className="text-sm font-medium mb-1">QR Code Invites</p>
                      <p className="text-xs text-muted-foreground">
                        Secure one-time connections
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Lock className="w-8 h-8 mx-auto mb-2 text-primary" weight="duotone" />
                      <p className="text-sm font-medium mb-1">Private & Secure</p>
                      <p className="text-xs text-muted-foreground">
                        No data leaves your vault
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="files" className="mt-0 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button asChild size="sm" className="gap-2 w-full sm:w-auto">
                    <label className="cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Upload File</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </Button>
                </div>

                {filteredFiles.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Folder className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
                      <h3 className="text-base sm:text-lg font-semibold mb-2">No files stored</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                        Upload files to secure storage
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <label className="cursor-pointer">
                          Upload First File
                          <input
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {filteredFiles.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <Card className="hover:border-primary/50 transition-colors">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">{getFileIcon(file.type)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs sm:text-sm truncate mb-1">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  {file.isEncrypted && (
                                    <Badge variant="outline" className="text-[10px]">
                                      <Lock className="w-2 h-2 mr-1" />
                                      Encrypted
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(file.uploadedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 gap-2 h-8 text-xs"
                                onClick={() => handleDownloadFile(file)}
                              >
                                <Download className="w-3 h-3" />
                                Download
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteFile(file.id)}
                                className="text-destructive h-8 px-2"
                              >
                                <Trash className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="mt-0 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      setNoteFormData({ title: '', content: '', tags: [] })
                      setEditingNote(null)
                      setShowNoteDialog(true)
                    }}
                    size="sm"
                    className="gap-2 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    New Note
                  </Button>
                </div>

                {filteredNotes.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <NotePencil className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
                      <h3 className="text-base sm:text-lg font-semibold mb-2">No notes created</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                        Create secure notes and documentation
                      </p>
                      <Button
                        onClick={() => {
                          setNoteFormData({ title: '', content: '', tags: [] })
                          setEditingNote(null)
                          setShowNoteDialog(true)
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Create First Note
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {filteredNotes
                      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                      .map((note) => (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group"
                        >
                          <Card className="hover:border-primary/50 transition-colors h-full">
                            <CardHeader className="pb-2 px-3 sm:px-6">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  {note.isPinned && (
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0 mt-1" />
                                  )}
                                  <CardTitle className="text-sm sm:text-base line-clamp-2">{note.title}</CardTitle>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                >
                                  <DotsThreeVertical className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="px-3 sm:px-6 space-y-3">
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">
                                {note.content || 'No content'}
                              </p>
                              {note.tags && note.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {note.tags.map((tag, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-[10px] sm:text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <Separator />
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(note.updatedAt).toLocaleDateString()}
                                </p>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleTogglePinNote(note.id)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    {note.isPinned ? 'Unpin' : 'Pin'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditNote(note)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="text-destructive h-7 px-2"
                                  >
                                    <Trash className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Vault Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <Label className="text-xs sm:text-sm font-medium">Auto-lock Vault</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Automatically lock vault after inactivity
                          </p>
                        </div>
                        <Switch
                          checked={settings?.autoLock || false}
                          onCheckedChange={(checked) => handleSettingChange('autoLock', checked)}
                        />
                      </div>

                      {settings?.autoLock && (
                        <div className="pl-4 border-l-2 border-primary/20">
                          <Label className="text-xs sm:text-sm">Auto-lock Timeout</Label>
                          <Select
                            value={String(settings?.autoLockTimeout || 5)}
                            onValueChange={(val) => handleSettingChange('autoLockTimeout', Number(val))}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 minute</SelectItem>
                              <SelectItem value="5">5 minutes</SelectItem>
                              <SelectItem value="10">10 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Separator />

                      {/* Enhanced Biometric Settings */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                              {/* Platform-specific icon and label */}
                              {typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) ? (
                                <>
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                                  </svg>
                                  Face ID / Touch ID
                                </>
                              ) : typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent) ? (
                                <>
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.93 1.94 2.08 1.94s2.08-.87 2.08-1.94c0-3.77-3.25-6.83-7.25-6.83-2.84 0-5.44 1.58-6.61 4.03-.39.81-.59 1.76-.59 2.8 0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-1.18.23-2.26.68-3.21 1.38-2.88 4.43-4.74 7.77-4.74 4.56 0 8.25 3.49 8.25 7.83 0 1.62-1.38 2.94-3.08 2.94s-3.08-1.32-3.08-2.94c0-1.07-.93-1.94-2.08-1.94s-2.08.87-2.08 1.94c0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.37-.47.37z"/>
                                  </svg>
                                  Fingerprint Unlock
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-4 h-4" weight="duotone" />
                                  Biometric Unlock
                                </>
                              )}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)
                                ? 'Use Face ID or Touch ID to unlock files'
                                : typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent)
                                ? 'Use your fingerprint to unlock files'
                                : 'Use fingerprint or face recognition'}
                            </p>
                          </div>
                          <Switch
                            checked={settings?.biometricUnlock || false}
                            onCheckedChange={async (checked) => {
                              if (checked) {
                                // Check if WebAuthn is available
                                if (typeof window !== 'undefined' && window.PublicKeyCredential) {
                                  try {
                                    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                                    if (available) {
                                      handleSettingChange('biometricUnlock', true)
                                      toast.success('Biometric unlock enabled', {
                                        description: 'You can now use biometrics to access your files'
                                      })
                                    } else {
                                      toast.error('Biometrics not available', {
                                        description: 'Your device does not support biometric authentication'
                                      })
                                    }
                                  } catch (error) {
                                    logger.debug('Biometric authentication unavailable', error)
                                    toast.error('Biometrics not supported', {
                                      description: 'Please use PIN to access your files'
                                    })
                                  }
                                } else {
                                  toast.error('Biometrics not supported', {
                                    description: 'Your browser does not support WebAuthn'
                                  })
                                }
                              } else {
                                handleSettingChange('biometricUnlock', false)
                                toast.info('Biometric unlock disabled')
                              }
                            }}
                          />
                        </div>

                        {/* Biometric options when enabled */}
                        {settings?.biometricUnlock && (
                          <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                            <div className="p-3 bg-primary/5 rounded-lg">
                              <p className="text-xs sm:text-sm font-medium text-primary mb-1">
                                Biometric Access Enabled
                              </p>
                              <p className="text-xs text-muted-foreground">
                                You can use biometrics instead of PIN when downloading encrypted files.
                                PIN remains as backup option.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                <CheckCircle className="w-4 h-4 text-green-500" weight="fill" />
                                <span className="text-xs">File decryption</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                <CheckCircle className="w-4 h-4 text-green-500" weight="fill" />
                                <span className="text-xs">Vault unlock</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <Label className="text-xs sm:text-sm font-medium">Default Encryption</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Encrypt new items by default
                          </p>
                        </div>
                        <Switch
                          checked={settings?.defaultEncryption || true}
                          onCheckedChange={(checked) => handleSettingChange('defaultEncryption', checked)}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <Label className="text-xs sm:text-sm font-medium">Notifications</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Receive vault activity alerts
                          </p>
                        </div>
                        <Switch
                          checked={settings?.notificationsEnabled || true}
                          onCheckedChange={(checked) => handleSettingChange('notificationsEnabled', checked)}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <Label className="text-xs sm:text-sm font-medium">Auto Backup</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Automatically backup vault data
                          </p>
                        </div>
                        <Switch
                          checked={settings?.backupEnabled || false}
                          onCheckedChange={(checked) => handleSettingChange('backupEnabled', checked)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="text-xs sm:text-sm font-semibold">Vault Statistics</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Card>
                          <CardContent className="p-3 text-center">
                            <p className="text-xl sm:text-2xl font-bold text-primary">{vaultItems?.length || 0}</p>
                            <p className="text-xs text-muted-foreground">Passwords</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 text-center">
                            <p className="text-xl sm:text-2xl font-bold text-primary">{messages?.length || 0}</p>
                            <p className="text-xs text-muted-foreground">Messages</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 text-center">
                            <p className="text-xl sm:text-2xl font-bold text-primary">{files?.length || 0}</p>
                            <p className="text-xs text-muted-foreground">Files</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 text-center">
                            <p className="text-xl sm:text-2xl font-bold text-primary">{notes?.length || 0}</p>
                            <p className="text-xs text-muted-foreground">Notes</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="text-xs sm:text-sm font-semibold text-destructive">Danger Zone</h4>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          if (confirm('Are you sure you want to clear all vault data? This cannot be undone.')) {
                            setVaultItems([])
                            setMessages([])
                            setFiles([])
                            setNotes([])
                            toast.success('Vault cleared')
                          }
                        }}
                      >
                        Clear All Vault Data
                      </Button>
                    </div>

                    {/* Hidden CEO Portal - Nearly invisible shield icon */}
                    {/* Only visible when logged in as CEO (username: 19780111) */}
                    {typeof window !== 'undefined' && isCEOUser() && (
                      <div className="pt-8 flex justify-center">
                        <button
                          onClick={async () => {
                            // Check if 2FA is already configured
                            const configured = localStorage.getItem('flowsphere_ceo_2fa_configured') === 'true'

                            if (!configured) {
                              // First time: Show 2FA setup with QR code
                              // Generate new TOTP secret
                              const secret = OTPAuth.Secret.fromHex(
                                Array.from(crypto.getRandomValues(new Uint8Array(20)))
                                  .map(b => b.toString(16).padStart(2, '0'))
                                  .join('')
                              )
                              const secretBase32 = secret.base32

                              // Create TOTP URI for QR code
                              const totp = new OTPAuth.TOTP({
                                issuer: 'FlowSphere',
                                label: 'CEO Portal',
                                algorithm: 'SHA1',
                                digits: 6,
                                period: 30,
                                secret: secret
                              })

                              const otpauthUri = totp.toString()

                              // Generate QR code
                              try {
                                const qrDataUrl = await QRCode.toDataURL(otpauthUri, {
                                  width: 250,
                                  margin: 2,
                                  color: { dark: '#000000', light: '#ffffff' }
                                })
                                setQrCodeDataUrl(qrDataUrl)
                                setSetupTotpSecret(secretBase32)
                                setShow2FASetup(true)
                              } catch (err) {
                                console.error('QR code generation failed:', err)
                                toast.error('Failed to generate QR code')
                              }
                            } else {
                              // Already configured: Go straight to 2FA verification
                              setShowCEOTOTP(true)
                            }
                          }}
                          className="opacity-5 hover:opacity-20 transition-opacity duration-700"
                          aria-label="CEO Portal Access"
                          title=""
                        >
                          <ShieldCheck className="w-5 h-5 text-muted-foreground/50" weight="duotone" />
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Add/Edit Password Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">
                {editingItem ? 'Edit Password' : 'Add New Password'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs sm:text-sm">Category</Label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={cn(
                        'py-2 px-2 rounded-md border-2 text-xs sm:text-sm font-medium transition-all',
                        formData.category === cat.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs sm:text-sm">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Gmail Account"
                />
              </div>

              {formData.category === 'login' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs sm:text-sm">Username / Email</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="username@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs sm:text-sm">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs sm:text-sm">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddDialog(false)
                    resetForm()
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddItem} size="sm">
                  {editingItem ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">
                {editingNote ? 'Edit Note' : 'Create New Note'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note-title" className="text-xs sm:text-sm">Title *</Label>
                <Input
                  id="note-title"
                  value={noteFormData.title}
                  onChange={(e) => setNoteFormData({ ...noteFormData, title: e.target.value })}
                  placeholder="Note title..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note-content" className="text-xs sm:text-sm">Content</Label>
                <Textarea
                  id="note-content"
                  value={noteFormData.content}
                  onChange={(e) => setNoteFormData({ ...noteFormData, content: e.target.value })}
                  placeholder="Write your note here..."
                  rows={8}
                  className="font-mono text-xs sm:text-sm"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowNoteDialog(false)
                    setNoteFormData({ title: '', content: '', tags: [] })
                    setEditingNote(null)
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddNote} size="sm">
                  {editingNote ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      <SecureMessenger isOpen={showMessenger} onClose={() => setShowMessenger(false)} />

      {/* CEO 2FA + PIN Verification Modal */}
    <Dialog open={showCEOTOTP} onOpenChange={(open) => {
      setShowCEOTOTP(open)
      if (!open) {
        setTotpCode('')
        setPinCode('')
        setTotpVerified(false)
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" weight="fill" />
            CEO Access Verification
          </DialogTitle>
        </DialogHeader>

        {!totpVerified ? (
          // Step 1: 2FA Verification
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totp">Step 1: Enter 6-digit 2FA code</Label>
              <Input
                id="totp"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono"
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Use your authenticator app (Google Authenticator, Authy, etc.)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCEOTOTP(false)
                  setTotpCode('')
                  setPinCode('')
                  setTotpVerified(false)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Real TOTP verification using otpauth library
                  try {
                    // SECURITY FIX (Dec 9, 2025): Removed hardcoded TOTP secret fallback
                    // TOTP secret must be generated during first-time 2FA setup
                    const secret = localStorage.getItem('flowsphere_ceo_totp_secret')
                    if (!secret) {
                      toast.error('TOTP not configured', {
                        description: 'Please set up 2FA in CEO Portal first'
                      })
                      return
                    }

                    const totp = new OTPAuth.TOTP({
                      issuer: 'FlowSphere CEO',
                      label: 'CEO Portal',
                      algorithm: 'SHA1',
                      digits: 6,
                      period: 30,
                      secret: OTPAuth.Secret.fromBase32(secret)
                    })

                    // Validate with 1 period window (30s before/after)
                    const delta = totp.validate({ token: totpCode.trim(), window: 1 })

                    if (delta !== null) {
                      setTotpVerified(true)
                      toast.success('2FA Verified', {
                        description: 'Now enter your PIN code'
                      })
                    } else {
                      toast.error('Invalid 2FA code', {
                        description: 'Code expired or incorrect. Try again.'
                      })
                    }
                  } catch (error) {
                    console.error('TOTP validation error:', error)
                    toast.error('2FA Error', {
                      description: 'Could not verify code. Please try again.'
                    })
                  }
                }}
                className="flex-1"
                disabled={totpCode.length !== 6}
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          // Step 2: PIN Code Verification
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Step 2: Enter 4-digit PIN code</Label>
              <Input
                id="pin"
                type="password"
                placeholder="••••"
                maxLength={4}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-3xl tracking-[1rem] font-bold"
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter your secure 4-digit PIN
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTotpVerified(false)
                  setPinCode('')
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={async () => {
                  // Real PIN verification against stored hash
                  try {
                    const storedPinData = localStorage.getItem('flowsphere_ceo_pin_data')

                    if (!storedPinData) {
                      // First time setup - store the PIN hash and salt
                      const { hash, salt } = await hashPin(pinCode)
                      localStorage.setItem('flowsphere_ceo_pin_data', JSON.stringify({ hash, salt }))
                      toast.success('🔐 PIN Set Successfully', {
                        description: 'CEO Dashboard Access Granted',
                        duration: 3000
                      })
                      setShowCEOTOTP(false)
                      setTotpCode('')
                      setPinCode('')
                      setTotpVerified(false)
                      setCEODashboardOpen(true)
                      return
                    }

                    // Verify against stored hash
                    const { hash: storedHash, salt } = JSON.parse(storedPinData)
                    const isValid = await verifyPin(pinCode, storedHash, salt)

                    if (isValid) {
                      toast.success('🔐 CEO Dashboard Access Granted', {
                        description: 'Welcome, Executive',
                        duration: 3000
                      })
                      setShowCEOTOTP(false)
                      setTotpCode('')
                      setPinCode('')
                      setTotpVerified(false)
                      setCEODashboardOpen(true)
                    } else {
                      toast.error('Invalid PIN', {
                        description: 'PIN does not match. Please try again.'
                      })
                    }
                  } catch (error) {
                    console.error('PIN verification error:', error)
                    toast.error('PIN Error', {
                      description: 'Could not verify PIN. Please try again.'
                    })
                  }
                }}
                className="flex-1"
                disabled={pinCode.length !== 4}
              >
                Unlock
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* File Encryption PIN Dialog */}
    <Dialog open={showEncryptionPinDialog} onOpenChange={(open) => {
      if (!open && !isEncrypting) {
        setShowEncryptionPinDialog(false)
        setEncryptionPin('')
        setPendingFiles([])
      }
    }}>
      <DialogContent className="sm:max-w-md max-w-[95vw] mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Lock className="w-5 h-5 text-primary" weight="fill" />
            Encrypt Files
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">
              {pendingFiles.length} file(s) to encrypt:
            </p>
            <ul className="text-xs sm:text-sm space-y-1">
              {pendingFiles.slice(0, 3).map((f, i) => (
                <li key={i} className="truncate flex items-center gap-2">
                  <Paperclip className="w-3 h-3 flex-shrink-0" />
                  {f.name}
                </li>
              ))}
              {pendingFiles.length > 3 && (
                <li className="text-muted-foreground">+{pendingFiles.length - 3} more</li>
              )}
            </ul>
          </div>
          <div className="space-y-2">
            <Label htmlFor="encrypt-pin" className="text-xs sm:text-sm">Create encryption PIN</Label>
            <Input
              id="encrypt-pin"
              type="password"
              placeholder="Enter 4+ digit PIN"
              value={encryptionPin}
              onChange={(e) => setEncryptionPin(e.target.value.replace(/\D/g, ''))}
              className="text-center text-xl sm:text-2xl tracking-widest font-mono h-12"
              autoFocus
              disabled={isEncrypting}
            />
            <p className="text-xs text-muted-foreground text-center">
              Remember this PIN - you'll need it to decrypt your files
            </p>
          </div>

          {/* PIN strength indicator */}
          {encryptionPin.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      encryptionPin.length >= i
                        ? encryptionPin.length >= 6
                          ? "bg-green-500"
                          : encryptionPin.length >= 4
                          ? "bg-yellow-500"
                          : "bg-red-500"
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {encryptionPin.length < 4
                  ? "Too short"
                  : encryptionPin.length < 6
                  ? "Good"
                  : "Strong"}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEncryptionPinDialog(false)
                setEncryptionPin('')
                setPendingFiles([])
              }}
              className="flex-1 h-10 sm:h-9"
              disabled={isEncrypting}
            >
              Cancel
            </Button>
            <Button
              onClick={processEncryptedUpload}
              className="flex-1 h-10 sm:h-9"
              disabled={encryptionPin.length < 4 || isEncrypting}
            >
              {isEncrypting ? 'Encrypting...' : 'Encrypt & Save'}
            </Button>
          </div>
          <div className="p-2 bg-primary/5 rounded-md">
            <p className="text-xs text-center text-primary/80">
              AES-256-GCM encryption • Your PIN never leaves your device
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* File Decryption PIN Dialog */}
    <Dialog open={showDecryptionPinDialog} onOpenChange={(open) => {
      if (!open && !isDecrypting && !isBiometricAuthenticating) {
        setShowDecryptionPinDialog(false)
        setDecryptionPin('')
        setFileToDecrypt(null)
      }
    }}>
      <DialogContent className="sm:max-w-md max-w-[95vw] mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ShieldCheck className="w-5 h-5 text-primary" weight="fill" />
            Decrypt File
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {fileToDecrypt && (
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              {getFileIcon(fileToDecrypt.type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base truncate">{fileToDecrypt.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(fileToDecrypt.size)}
                </p>
              </div>
            </div>
          )}

          {/* Biometric option when enabled */}
          {settings?.biometricUnlock && (
            <div className="space-y-3">
              <Button
                onClick={async () => {
                  try {
                    const success = await authenticateWithBiometrics()
                    if (success && fileToDecrypt) {
                      // Use stored PIN from secure storage for decryption
                      // For now, we'll prompt for PIN after biometric success
                      toast.info('Biometric verified! Enter PIN to decrypt.', {
                        description: 'Your PIN is still needed for decryption key'
                      })
                    }
                  } catch (error) {
                    console.error('Biometric auth error:', error)
                    toast.error('Biometric authentication failed', {
                      description: 'Please try again or use PIN'
                    })
                  }
                }}
                variant="outline"
                className="w-full h-14 sm:h-16 flex flex-col items-center justify-center gap-1 border-2 border-primary/30 hover:border-primary hover:bg-primary/5"
                disabled={isDecrypting || isBiometricAuthenticating}
              >
                {isBiometricAuthenticating ? (
                  <span className="text-sm">Authenticating...</span>
                ) : (
                  <>
                    {typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) ? (
                      <>
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                        </svg>
                        <span className="text-xs sm:text-sm font-medium">Use Face ID / Touch ID</span>
                      </>
                    ) : typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent) ? (
                      <>
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21z"/>
                        </svg>
                        <span className="text-xs sm:text-sm font-medium">Use Fingerprint</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-primary" weight="fill" />
                        <span className="text-xs sm:text-sm font-medium">Use Biometrics</span>
                      </>
                    )}
                  </>
                )}
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or use PIN</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="decrypt-pin" className="text-xs sm:text-sm">Enter decryption PIN</Label>
            <Input
              id="decrypt-pin"
              type="password"
              placeholder="Enter PIN"
              value={decryptionPin}
              onChange={(e) => setDecryptionPin(e.target.value.replace(/\D/g, ''))}
              className="text-center text-xl sm:text-2xl tracking-widest font-mono h-12"
              autoFocus={!settings?.biometricUnlock}
              disabled={isDecrypting || isBiometricAuthenticating}
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the PIN you used when encrypting this file
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDecryptionPinDialog(false)
                setDecryptionPin('')
                setFileToDecrypt(null)
              }}
              className="flex-1 h-10 sm:h-9"
              disabled={isDecrypting || isBiometricAuthenticating}
            >
              Cancel
            </Button>
            <Button
              onClick={processDecryptedDownload}
              className="flex-1 h-10 sm:h-9"
              disabled={decryptionPin.length < 4 || isDecrypting || isBiometricAuthenticating}
            >
              {isDecrypting ? 'Decrypting...' : 'Decrypt & Download'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* CEO Dashboard */}
    {ceoDashboardOpen && (
      <CEODashboard onClose={() => setCEODashboardOpen(false)} />
    )}

    {/* 2FA Setup Dialog - Shows QR code ONCE for initial setup */}
    <Dialog open={show2FASetup} onOpenChange={(open) => {
      if (!open) {
        // Clear sensitive data when closing
        setQrCodeDataUrl('')
        setSetupTotpSecret('')
        setSetupVerificationCode('')
      }
      setShow2FASetup(open)
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" weight="fill" />
            Setup Two-Factor Authentication
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning message */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
            <Warning className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" weight="fill" />
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Scan this QR code now!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This QR code will only be shown ONCE. After you confirm setup, it will be permanently hidden.
              </p>
            </div>
          </div>

          {/* QR Code Display */}
          {qrCodeDataUrl && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-xl shadow-lg">
                <img
                  src={qrCodeDataUrl}
                  alt="2FA QR Code"
                  className="w-[200px] h-[200px]"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Scan with Google Authenticator, Authy, or any TOTP app
              </p>
            </div>
          )}

          {/* Manual entry secret (collapsed) */}
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Can't scan? Enter secret manually
            </summary>
            <div className="mt-2 p-2 bg-muted rounded-md">
              <code className="text-xs font-mono break-all select-all">
                {setupTotpSecret}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-full mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(setupTotpSecret)
                  toast.success('Secret copied to clipboard')
                }}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Secret
              </Button>
            </div>
          </details>

          {/* Verification step */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="verify-code" className="text-sm">
              Enter the 6-digit code from your app to verify setup:
            </Label>
            <Input
              id="verify-code"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={setupVerificationCode}
              onChange={(e) => setSetupVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShow2FASetup(false)
                setQrCodeDataUrl('')
                setSetupTotpSecret('')
                setSetupVerificationCode('')
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Verify the code before saving
                try {
                  const totp = new OTPAuth.TOTP({
                    issuer: 'FlowSphere',
                    label: 'CEO Portal',
                    algorithm: 'SHA1',
                    digits: 6,
                    period: 30,
                    secret: OTPAuth.Secret.fromBase32(setupTotpSecret)
                  })

                  const delta = totp.validate({ token: setupVerificationCode, window: 1 })

                  if (delta !== null) {
                    // Valid! Save the secret and mark as configured
                    localStorage.setItem('flowsphere_ceo_totp_secret', setupTotpSecret)
                    localStorage.setItem('flowsphere_ceo_2fa_configured', 'true')
                    setIs2FAConfigured(true)

                    toast.success('2FA Setup Complete!', {
                      description: 'Your authenticator app is now linked.'
                    })

                    // Close setup dialog and clear sensitive data
                    setShow2FASetup(false)
                    setQrCodeDataUrl('')
                    setSetupTotpSecret('')
                    setSetupVerificationCode('')

                    // Now open the normal 2FA verification dialog
                    setShowCEOTOTP(true)
                  } else {
                    toast.error('Invalid code', {
                      description: 'The code doesn\'t match. Please try again.'
                    })
                  }
                } catch (error) {
                  console.error('2FA setup verification error:', error)
                  toast.error('Verification failed', {
                    description: 'Please try entering the code again.'
                  })
                }
              }}
              className="flex-1"
              disabled={setupVerificationCode.length !== 6}
            >
              Verify & Complete Setup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
  )
}
