import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QrCode,
  UserPlus,
  PaperPlaneTilt,
  Phone,
  VideoCamera,
  DotsThreeVertical,
  Check,
  CheckCircle,
  MagnifyingGlass,
  ArrowLeft,
  Paperclip,
  Microphone,
  Image as ImageIcon,
  X,
  Copy,
  Camera,
  Gear,
  Eye,
  EyeSlash,
  Key,
  Pencil,
  FloppyDisk,
  PushPin
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { QRScanner } from '@/components/qr-scanner'
import { QRCodeDisplay } from '@/components/qr-code-display'
import { decryptQRCode, isValidFlowSphereQR } from '@/lib/qr-encryption'

interface Contact {
  id: string
  name: string
  avatar?: string
  publicKey: string
  lastSeen?: string
  status: 'online' | 'offline' | 'away'
  unreadCount?: number
  themeColor?: string
  notificationsEnabled?: boolean
  soundEnabled?: boolean
}

interface Message {
  id: string
  contactId: string
  text: string
  timestamp: string
  status: 'sent' | 'delivered' | 'read'
  isOwn: boolean
  attachments?: MessageAttachment[]
  replyTo?: string
  isPinned?: boolean
}

interface MessageAttachment {
  id: string
  type: 'image' | 'file' | 'voice'
  url: string
  name?: string
  size?: number
}

interface InviteCode {
  code: string
  expiresAt: string
  usedBy?: string
}

interface SecureMessengerProps {
  isOpen: boolean
  onClose: () => void
}

export function SecureMessenger({ isOpen, onClose }: SecureMessengerProps) {
  const [contacts, setContacts] = useKV<Contact[]>('flowsphere-messenger-contacts', [])
  const [messages, setMessages] = useKV<Message[]>('flowsphere-messenger-messages', [])
  const [myPublicKey, setMyPublicKey] = useKV<string>('flowsphere-messenger-public-key', '')
  const [currentInvite, setCurrentInvite] = useKV<InviteCode | null>('flowsphere-messenger-invite', null)
  
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [showAddContactDialog, setShowAddContactDialog] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scannedCode, setScannedCode] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [attachments, setAttachments] = useState<MessageAttachment[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [editingNickname, setEditingNickname] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [apiKeys, setApiKeys] = useState({
    publicKey: '',
    encryptionKey: ''
  })
  const [mediaSettings, setMediaSettings] = useState({
    autoDownload: true,
    compressImages: true,
    saveToGallery: false
  })
  const [contactTheme, setContactTheme] = useState<string>('#8B5CF6')
  const [notificationPrefs, setNotificationPrefs] = useState({
    enabled: true,
    sound: true,
    preview: true
  })
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!myPublicKey) {
      const newKey = generatePublicKey()
      setMyPublicKey(newKey)
    }
  }, [myPublicKey, setMyPublicKey])

  useEffect(() => {
    scrollToBottom()
  }, [messages, selectedContact])

  useEffect(() => {
    const interval = setInterval(() => {
      updateMessageDeliveryStatus()
    }, 2000)
    return () => clearInterval(interval)
  }, [messages])

  // Real-time messaging: Listen for localStorage changes from other tabs/sessions
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'flowsphere-messenger-messages' && e.newValue) {
        try {
          const newMessages = JSON.parse(e.newValue)
          setMessages(newMessages)
          toast.info('New message received!')
        } catch (error) {
          console.error('Error parsing messages from storage:', error)
        }
      } else if (e.key === 'flowsphere-messenger-contacts' && e.newValue) {
        try {
          const newContacts = JSON.parse(e.newValue)
          setContacts(newContacts)
        } catch (error) {
          console.error('Error parsing contacts from storage:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [setMessages, setContacts])

  // Load settings when contact is selected
  useEffect(() => {
    if (selectedContact) {
      setNewNickname(selectedContact.name)
      setContactTheme(selectedContact.themeColor || '#8B5CF6')
      setNotificationPrefs({
        enabled: selectedContact.notificationsEnabled ?? true,
        sound: selectedContact.soundEnabled ?? true,
        preview: true
      })
      // Load contact-specific settings from localStorage
      const savedKeys = localStorage.getItem(`flowsphere-messenger-keys-${selectedContact.id}`)
      const savedMedia = localStorage.getItem(`flowsphere-messenger-media-${selectedContact.id}`)
      if (savedKeys) {
        setApiKeys(JSON.parse(savedKeys))
      }
      if (savedMedia) {
        setMediaSettings(JSON.parse(savedMedia))
      }
    }
  }, [selectedContact])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const generatePublicKey = () => {
    return 'FSM-' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15).toUpperCase()
  }

  const generateInviteCode = () => {
    // Check if there's already an unused invite
    if (currentInvite && !currentInvite.usedBy) {
      const expiresAt = new Date(currentInvite.expiresAt)
      if (expiresAt > new Date()) {
        setShowQRDialog(true)
        toast.info('Showing existing invite code')
        return
      }
    }

    // Generate new one-time use code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const invite: InviteCode = { code, expiresAt }
    setCurrentInvite(invite)
    setShowQRDialog(true)
    toast.success('One-time invite code generated')
  }

  const handleScanCode = (code?: string) => {
    let codeToUse = code || scannedCode

    if (!codeToUse.trim()) {
      toast.error('Please enter an invite code')
      return
    }

    // Try to decrypt if it's an encrypted QR code
    const decryptedCode = decryptQRCode(codeToUse)
    if (decryptedCode) {
      codeToUse = decryptedCode
    } else if (!isValidFlowSphereQR(codeToUse)) {
      toast.error('Invalid QR code format')
      setScannedCode('')
      setShowAddContactDialog(false)
      setShowQRScanner(false)
      return
    }

    // Check if code was already used
    const existingContact = (contacts || []).find(c => c.publicKey === codeToUse)
    if (existingContact) {
      toast.error('This invite code has already been used')
      setScannedCode('')
      setShowAddContactDialog(false)
      setShowQRScanner(false)
      return
    }

    // Check if this is my own code
    if (currentInvite?.code === codeToUse) {
      toast.error('You cannot add yourself as a contact')
      setScannedCode('')
      setShowAddContactDialog(false)
      setShowQRScanner(false)
      return
    }

    const newContact: Contact = {
      id: Date.now().toString(),
      name: `Contact ${(contacts || []).length + 1}`,
      publicKey: codeToUse,
      status: 'online',
      unreadCount: 0
    }

    // Add contact (useKV will auto-save to localStorage)
    setContacts((current) => [...(current || []), newContact])

    // Mark invite as used if it matches
    if (currentInvite?.code === codeToUse) {
      setCurrentInvite({ ...currentInvite, usedBy: newContact.id })
    }

    setScannedCode('')
    setShowAddContactDialog(false)
    setShowQRScanner(false)
    toast.success(`${newContact.name} added to contacts - Auto-saved!`)
  }

  const handleSendMessage = () => {
    if (!messageInput.trim() && attachments.length === 0) return
    if (!selectedContact) return

    const newMessage: Message = {
      id: Date.now().toString(),
      contactId: selectedContact.id,
      text: messageInput,
      timestamp: new Date().toISOString(),
      status: 'sent',
      isOwn: true,
      attachments: attachments.length > 0 ? [...attachments] : undefined
    }

    setMessages((current) => [...(current || []), newMessage])
    setMessageInput('')
    setAttachments([])

    // Simulate message delivery status updates (real app would use websockets)
    setTimeout(() => {
      updateMessageStatus(newMessage.id, 'delivered')
    }, 1000)
  }

  const updateMessageDeliveryStatus = () => {
    // Gradually update message statuses to simulate real delivery
    setMessages((current) =>
      (current || []).map((msg) => {
        if (msg.status === 'sent' && Math.random() > 0.7) {
          return { ...msg, status: 'delivered' }
        }
        if (msg.status === 'delivered' && Math.random() > 0.8 && msg.isOwn) {
          return { ...msg, status: 'read' }
        }
        return msg
      })
    )
  }

  const updateMessageStatus = (messageId: string, status: Message['status']) => {
    setMessages((current) =>
      (current || []).map((msg) =>
        msg.id === messageId ? { ...msg, status } : msg
      )
    )
  }

  const markAsRead = (contactId: string) => {
    setContacts((current) =>
      (current || []).map((c) =>
        c.id === contactId ? { ...c, unreadCount: 0 } : c
      )
    )
    
    setMessages((current) =>
      (current || []).map((msg) =>
        msg.contactId === contactId && !msg.isOwn ? { ...msg, status: 'read' } : msg
      )
    )
  }

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact)
    markAsRead(contact.id)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const attachment: MessageAttachment = {
          id: Date.now().toString() + Math.random(),
          type: file.type.startsWith('image/') ? 'image' : 'file',
          url: e.target?.result as string,
          name: file.name,
          size: file.size
        }
        setAttachments((prev) => [...prev, attachment])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false)
      const voiceAttachment: MessageAttachment = {
        id: Date.now().toString(),
        type: 'voice',
        url: 'voice-note-' + Date.now()
      }
      setAttachments((prev) => [...prev, voiceAttachment])
      toast.success('Voice note recorded')
    } else {
      setIsRecording(true)
      toast.info('Recording...')
    }
  }

  const handleSaveNickname = () => {
    if (!selectedContact || !newNickname.trim()) return

    setContacts((current) =>
      (current || []).map((c) =>
        c.id === selectedContact.id ? { ...c, name: newNickname.trim() } : c
      )
    )
    setSelectedContact({ ...selectedContact, name: newNickname.trim() })
    setEditingNickname(false)
    toast.success('Nickname updated!')
  }

  const handleSaveKeys = () => {
    if (!selectedContact) return

    localStorage.setItem(
      `flowsphere-messenger-keys-${selectedContact.id}`,
      JSON.stringify(apiKeys)
    )
    toast.success('Keys saved securely!')
  }

  const handleSaveMediaSettings = () => {
    if (!selectedContact) return

    localStorage.setItem(
      `flowsphere-messenger-media-${selectedContact.id}`,
      JSON.stringify(mediaSettings)
    )
    toast.success('Media settings saved!')
  }

  const handleSaveTheme = () => {
    if (!selectedContact) return

    setContacts((current) =>
      (current || []).map((c) =>
        c.id === selectedContact.id ? { ...c, themeColor: contactTheme } : c
      )
    )
    setSelectedContact({ ...selectedContact, themeColor: contactTheme })
    toast.success('Theme color saved!')
  }

  const handleSaveNotifications = () => {
    if (!selectedContact) return

    setContacts((current) =>
      (current || []).map((c) =>
        c.id === selectedContact.id
          ? {
              ...c,
              notificationsEnabled: notificationPrefs.enabled,
              soundEnabled: notificationPrefs.sound
            }
          : c
      )
    )
    setSelectedContact({
      ...selectedContact,
      notificationsEnabled: notificationPrefs.enabled,
      soundEnabled: notificationPrefs.sound
    })
    toast.success('Notification preferences saved!')
  }

  const handleTogglePin = (messageId: string) => {
    setMessages((current) =>
      (current || []).map((msg) =>
        msg.id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg
      )
    )
    const message = messages?.find(m => m.id === messageId)
    toast.success(message?.isPinned ? 'Message unpinned' : 'Message pinned!')
  }

  const filteredContacts = (contacts || []).filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const contactMessages = selectedContact
    ? (messages || []).filter((msg) => msg.contactId === selectedContact.id)
    : []

  const pinnedMessages = contactMessages.filter((msg) => msg.isPinned)

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3" weight="bold" />
      case 'delivered':
        return <CheckCircle className="w-3 h-3" weight="bold" />
      case 'read':
        return <CheckCircle className="w-3 h-3 text-primary" weight="fill" />
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-2xl">
              <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-primary" weight="duotone" />
              Secure Messenger
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowQRScanner(true)}
                className="gap-2"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Scan QR</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={generateInviteCode}
                className="gap-2"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">Generate QR</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddContactDialog(true)}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Contact</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-full sm:w-80 border-r flex flex-col">
            <div className="p-3 sm:p-4 border-b">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <UserPlus className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                    No contacts yet
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => setShowQRScanner(true)}
                      className="gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Scan QR Code
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddContactDialog(true)}
                    >
                      Enter Code Manually
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  {filteredContacts.map((contact) => (
                    <motion.button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left',
                        selectedContact?.id === contact.id && 'bg-primary/10'
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                          {contact.avatar && <AvatarImage src={contact.avatar} />}
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background',
                            contact.status === 'online' && 'bg-green-500',
                            contact.status === 'away' && 'bg-yellow-500',
                            contact.status === 'offline' && 'bg-gray-400'
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{contact.name}</p>
                          {contact.lastSeen && (
                            <span className="text-xs text-muted-foreground">
                              {formatTime(contact.lastSeen)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground truncate capitalize">
                            {contact.status}
                          </p>
                          {contact.unreadCount && contact.unreadCount > 0 && (
                            <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                              {contact.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col">
            {selectedContact ? (
              <>
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedContact(null)}
                      className="sm:hidden"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                      {selectedContact.avatar && <AvatarImage src={selectedContact.avatar} />}
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {getInitials(selectedContact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm sm:text-base">{selectedContact.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {selectedContact.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:gap-2">
                    {pinnedMessages.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 sm:h-9 sm:w-9 p-0 relative"
                        onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                      >
                        <PushPin className="w-4 h-4" weight={showPinnedMessages ? 'fill' : 'regular'} />
                        <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center">
                          {pinnedMessages.length}
                        </Badge>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0">
                      <VideoCamera className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                      onClick={() => setShowSettings(true)}
                    >
                      <Gear className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4 sm:p-6">
                  {showPinnedMessages && pinnedMessages.length > 0 && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <PushPin className="w-4 h-4 text-primary" weight="fill" />
                        <p className="text-sm font-semibold">Pinned Messages</p>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {pinnedMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className="text-xs p-2 bg-background rounded cursor-pointer hover:bg-muted"
                            onClick={() => {
                              const element = document.getElementById(`msg-${msg.id}`)
                              element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }}
                          >
                            <p className="truncate">{msg.text}</p>
                            <p className="text-muted-foreground">{formatTime(msg.timestamp)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    <AnimatePresence>
                      {contactMessages.map((message, idx) => (
                        <motion.div
                          key={message.id}
                          id={`msg-${message.id}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                            'flex gap-2 items-end group relative',
                            message.isOwn ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute -top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={() => handleTogglePin(message.id)}
                          >
                            <PushPin className="w-3 h-3" weight={message.isPinned ? 'fill' : 'regular'} />
                          </Button>
                          {!message.isOwn && (
                            <Avatar className="w-6 h-6 sm:w-8 sm:h-8">
                              {selectedContact.avatar && <AvatarImage src={selectedContact.avatar} />}
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {getInitials(selectedContact.name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              'max-w-[75%] sm:max-w-[60%] space-y-1',
                              message.isOwn && 'items-end'
                            )}
                          >
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="space-y-2">
                                {message.attachments.map((attachment) => (
                                  <div
                                    key={attachment.id}
                                    className={cn(
                                      'rounded-lg overflow-hidden',
                                      message.isOwn ? 'bg-primary/10' : 'bg-muted'
                                    )}
                                  >
                                    {attachment.type === 'image' && (
                                      <img
                                        src={attachment.url}
                                        alt={attachment.name}
                                        className="max-w-full h-auto rounded-lg"
                                      />
                                    )}
                                    {attachment.type === 'file' && (
                                      <div className="p-3 flex items-center gap-2">
                                        <Paperclip className="w-4 h-4 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium truncate">
                                            {attachment.name}
                                          </p>
                                          {attachment.size && (
                                            <p className="text-xs text-muted-foreground">
                                              {formatFileSize(attachment.size)}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {attachment.type === 'voice' && (
                                      <div className="p-3 flex items-center gap-2">
                                        <Microphone className="w-4 h-4" />
                                        <div className="flex-1 h-8 bg-primary/20 rounded-full" />
                                        <span className="text-xs">0:15</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {message.text && (
                              <div
                                className={cn(
                                  'px-3 sm:px-4 py-2 rounded-2xl',
                                  message.isOwn
                                    ? 'text-white'
                                    : 'bg-muted'
                                )}
                                style={
                                  message.isOwn && selectedContact?.themeColor
                                    ? { backgroundColor: selectedContact.themeColor }
                                    : message.isOwn
                                    ? { backgroundColor: '#8B5CF6' }
                                    : undefined
                                }
                              >
                                <p className="text-xs sm:text-sm break-words">{message.text}</p>
                              </div>
                            )}
                            <div
                              className={cn(
                                'flex items-center gap-1 px-2',
                                message.isOwn && 'justify-end'
                              )}
                            >
                              <span className="text-xs text-muted-foreground">
                                {formatTime(message.timestamp)}
                              </span>
                              {message.isOwn && (
                                <span className="text-muted-foreground">
                                  {getStatusIcon(message.status)}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-3 sm:p-4 border-t bg-background">
                  {attachments.length > 0 && (
                    <div className="flex gap-2 mb-2 pb-2 border-b overflow-x-auto">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="relative flex-shrink-0 w-16 h-16 rounded-lg bg-muted overflow-hidden"
                        >
                          {attachment.type === 'image' && (
                            <img
                              src={attachment.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                          {attachment.type === 'file' && (
                            <div className="w-full h-full flex items-center justify-center">
                              <Paperclip className="w-6 h-6" />
                            </div>
                          )}
                          {attachment.type === 'voice' && (
                            <div className="w-full h-full flex items-center justify-center">
                              <Microphone className="w-6 h-6" />
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full"
                            onClick={() => handleRemoveAttachment(attachment.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-shrink-0 h-9 w-9 p-0"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-shrink-0 h-9 w-9 p-0"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleRecording}
                      className={cn(
                        'flex-shrink-0 h-9 w-9 p-0',
                        isRecording && 'text-destructive'
                      )}
                    >
                      <Microphone className="w-4 h-4" weight={isRecording ? 'fill' : 'regular'} />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1 h-9"
                    />
                    <Button
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() && attachments.length === 0}
                      className="gap-2 h-9"
                    >
                      <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                      <span className="hidden sm:inline">Send</span>
                    </Button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-muted-foreground" weight="duotone" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Secure Messaging</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Select a contact to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Your Invite QR Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center p-8">
                <QRCodeDisplay 
                  data={currentInvite?.code || myPublicKey || 'FSM-PLACEHOLDER'} 
                  size={280}
                  className="w-full h-full"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Or share this code:</p>
                <div className="flex gap-2">
                  <Input
                    value={currentInvite?.code || myPublicKey}
                    readOnly
                    className="flex-1 font-mono text-xs sm:text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const code = currentInvite?.code || myPublicKey || ''
                      if (code) {
                        navigator.clipboard.writeText(code)
                        toast.success('Code copied to clipboard')
                      }
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground text-center">
                  ⚠️ One-time use code - expires in 24 hours
                </p>
                {currentInvite?.usedBy && (
                  <p className="text-xs text-destructive text-center font-medium">
                    This code has been used and is no longer valid
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddContactDialog} onOpenChange={setShowAddContactDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Scan QR code or enter invite code
                </p>
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center p-8">
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => setShowQRScanner(true)}
                  >
                    <Camera className="w-4 h-4" />
                    Open Camera
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Enter invite code..."
                  value={scannedCode}
                  onChange={(e) => setScannedCode(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddContactDialog(false)
                    setScannedCode('')
                  }}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => handleScanCode()}>
                  Add Contact
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* QR Scanner - overlays the messenger interface */}
        <QRScanner
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={handleScanCode}
        />
      </DialogContent>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gear className="w-5 h-5" />
              Conversation Settings
            </DialogTitle>
          </DialogHeader>

          {selectedContact && (
            <ScrollArea className="flex-1">
              <div className="space-y-6 pr-4">
                {/* Nickname Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Pencil className="w-4 h-4" />
                      Nickname
                    </h3>
                    {editingNickname ? (
                      <Button
                        size="sm"
                        onClick={handleSaveNickname}
                        className="gap-2 h-8"
                      >
                        <FloppyDisk className="w-4 h-4" />
                        Save
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingNickname(true)}
                        className="h-8"
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                  <Input
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    disabled={!editingNickname}
                    placeholder="Enter nickname..."
                    className={cn(!editingNickname && 'bg-muted')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Customize how this contact appears in your conversations
                  </p>
                </div>

                {/* Theme Color Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Theme Color</h3>
                    <Button
                      size="sm"
                      onClick={handleSaveTheme}
                      className="gap-2 h-8"
                    >
                      <FloppyDisk className="w-4 h-4" />
                      Save
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { color: '#8B5CF6', name: 'Purple' },
                      { color: '#3B82F6', name: 'Blue' },
                      { color: '#10B981', name: 'Green' },
                      { color: '#F59E0B', name: 'Orange' },
                      { color: '#EF4444', name: 'Red' },
                      { color: '#EC4899', name: 'Pink' },
                      { color: '#06B6D4', name: 'Cyan' },
                      { color: '#8B5A3C', name: 'Brown' }
                    ].map((theme) => (
                      <button
                        key={theme.color}
                        onClick={() => setContactTheme(theme.color)}
                        className={cn(
                          'w-12 h-12 rounded-full border-2 transition-all',
                          contactTheme === theme.color
                            ? 'border-foreground scale-110'
                            : 'border-transparent hover:scale-105'
                        )}
                        style={{ backgroundColor: theme.color }}
                        title={theme.name}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Customize the theme color for this conversation
                  </p>
                </div>

                {/* Notification Preferences */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Notifications</h3>
                    <Button
                      size="sm"
                      onClick={handleSaveNotifications}
                      className="gap-2 h-8"
                    >
                      <FloppyDisk className="w-4 h-4" />
                      Save
                    </Button>
                  </div>
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Enable notifications</p>
                          <p className="text-xs text-muted-foreground">
                            Get notified of new messages
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationPrefs.enabled}
                          onChange={(e) =>
                            setNotificationPrefs((prev) => ({
                              ...prev,
                              enabled: e.target.checked
                            }))
                          }
                          className="h-4 w-4"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Sound alerts</p>
                          <p className="text-xs text-muted-foreground">
                            Play sound for new messages
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationPrefs.sound}
                          onChange={(e) =>
                            setNotificationPrefs((prev) => ({
                              ...prev,
                              sound: e.target.checked
                            }))
                          }
                          className="h-4 w-4"
                          disabled={!notificationPrefs.enabled}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Message preview</p>
                          <p className="text-xs text-muted-foreground">
                            Show message content in notifications
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationPrefs.preview}
                          onChange={(e) =>
                            setNotificationPrefs((prev) => ({
                              ...prev,
                              preview: e.target.checked
                            }))
                          }
                          className="h-4 w-4"
                          disabled={!notificationPrefs.enabled}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* API Keys Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Security Keys
                    </h3>
                    <Button
                      size="sm"
                      onClick={handleSaveKeys}
                      className="gap-2 h-8"
                    >
                      <FloppyDisk className="w-4 h-4" />
                      Save
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Public Key</label>
                      <div className="relative">
                        <Input
                          type={showApiKeys ? 'text' : 'password'}
                          value={apiKeys.publicKey}
                          onChange={(e) => setApiKeys(prev => ({ ...prev, publicKey: e.target.value }))}
                          placeholder="Enter public key..."
                          className="pr-10 font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => setShowApiKeys(!showApiKeys)}
                        >
                          {showApiKeys ? (
                            <EyeSlash className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Encryption Key</label>
                      <div className="relative">
                        <Input
                          type={showApiKeys ? 'text' : 'password'}
                          value={apiKeys.encryptionKey}
                          onChange={(e) => setApiKeys(prev => ({ ...prev, encryptionKey: e.target.value }))}
                          placeholder="Enter encryption key..."
                          className="pr-10 font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => setShowApiKeys(!showApiKeys)}
                        >
                          {showApiKeys ? (
                            <EyeSlash className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    🔒 Keys are stored locally and encrypted
                  </p>
                </div>

                {/* Media Settings Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Media Settings
                    </h3>
                    <Button
                      size="sm"
                      onClick={handleSaveMediaSettings}
                      className="gap-2 h-8"
                    >
                      <FloppyDisk className="w-4 h-4" />
                      Save
                    </Button>
                  </div>

                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Auto-download media</p>
                          <p className="text-xs text-muted-foreground">
                            Automatically download images and files
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={mediaSettings.autoDownload}
                          onChange={(e) => setMediaSettings(prev => ({ ...prev, autoDownload: e.target.checked }))}
                          className="h-4 w-4"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Compress images</p>
                          <p className="text-xs text-muted-foreground">
                            Save bandwidth by compressing images
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={mediaSettings.compressImages}
                          onChange={(e) => setMediaSettings(prev => ({ ...prev, compressImages: e.target.checked }))}
                          className="h-4 w-4"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Save to gallery</p>
                          <p className="text-xs text-muted-foreground">
                            Automatically save received media
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={mediaSettings.saveToGallery}
                          onChange={(e) => setMediaSettings(prev => ({ ...prev, saveToGallery: e.target.checked }))}
                          className="h-4 w-4"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Contact Info Section */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Contact Information</h3>
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Contact ID</p>
                        <p className="text-sm font-mono">{selectedContact.id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Public Key</p>
                        <p className="text-sm font-mono break-all">{selectedContact.publicKey}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge variant={selectedContact.status === 'online' ? 'default' : 'secondary'}>
                          {selectedContact.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
