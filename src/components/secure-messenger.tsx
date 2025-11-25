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
  Camera
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

interface Contact {
  id: string
  name: string
  avatar?: string
  publicKey: string
  lastSeen?: string
  status: 'online' | 'offline' | 'away'
  unreadCount?: number
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
      simulateMessageDelivery()
    }, 2000)
    return () => clearInterval(interval)
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const generatePublicKey = () => {
    return 'FSM-' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15).toUpperCase()
  }

  const generateInviteCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const invite: InviteCode = { code, expiresAt }
    setCurrentInvite(invite)
    setShowQRDialog(true)
    toast.success('Invite code generated')
  }

  const handleScanCode = (code?: string) => {
    const codeToUse = code || scannedCode
    
    if (!codeToUse.trim()) {
      toast.error('Please enter an invite code')
      return
    }

    const newContact: Contact = {
      id: Date.now().toString(),
      name: `Contact ${(contacts || []).length + 1}`,
      publicKey: codeToUse,
      status: 'online',
      unreadCount: 0
    }

    setContacts((current) => [...(current || []), newContact])
    setScannedCode('')
    setShowAddContactDialog(false)
    setShowQRScanner(false)
    toast.success(`Connected with ${newContact.name}`)
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
    
    setTimeout(() => {
      updateMessageStatus(newMessage.id, 'delivered')
    }, 1000)

    setTimeout(() => {
      simulateReply(selectedContact)
    }, 3000 + Math.random() * 2000)
  }

  const simulateReply = (contact: Contact) => {
    const replies = [
      "Got it, thanks!",
      "Sure, I'll take care of it.",
      "Sounds good 👍",
      "Let me check and get back to you.",
      "Perfect timing!",
      "I'm on it.",
      "Thanks for letting me know."
    ]

    const replyMessage: Message = {
      id: Date.now().toString() + '-reply',
      contactId: contact.id,
      text: replies[Math.floor(Math.random() * replies.length)],
      timestamp: new Date().toISOString(),
      status: 'delivered',
      isOwn: false
    }

    setMessages((current) => [...(current || []), replyMessage])
    
    if (selectedContact?.id !== contact.id) {
      setContacts((current) =>
        (current || []).map((c) =>
          c.id === contact.id ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
        )
      )
    }
  }

  const simulateMessageDelivery = () => {
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

  const filteredContacts = (contacts || []).filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const contactMessages = selectedContact
    ? (messages || []).filter((msg) => msg.contactId === selectedContact.id)
    : []

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
                    <Button size="sm" variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0">
                      <VideoCamera className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0">
                      <DotsThreeVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4 sm:p-6">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {contactMessages.map((message, idx) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                            'flex gap-2 items-end',
                            message.isOwn ? 'justify-end' : 'justify-start'
                          )}
                        >
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
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                )}
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
              <p className="text-xs text-muted-foreground text-center">
                Code expires in 24 hours
              </p>
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
      </DialogContent>

      <QRScanner 
        isOpen={showQRScanner} 
        onClose={() => setShowQRScanner(false)} 
        onScan={handleScanCode}
      />
    </Dialog>
  )
}
