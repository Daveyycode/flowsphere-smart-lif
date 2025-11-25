import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash, Eye, EyeSlash, Copy, Key, ShieldCheck, Lock, ChatCircle, Folder, NotePencil, Gear, PaperPlaneTilt, MagnifyingGlass, Download, Upload, FilePdf, FileDoc, FileImage, FileZip, Paperclip, DotsThreeVertical, Check, CheckCircle, Star } from '@phosphor-icons/react'
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
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
}

interface VaultFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  isEncrypted: boolean
  content?: string
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
  isOpen: boolean
  onClose: () => void
}

export function Vault({ isOpen, onClose }: VaultProps) {
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
  const [editingNote, setEditingNote] = useState<VaultNote | null>(null)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  
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
    
    const newMessage: VaultMessage = {
      id: Date.now().toString(),
      text: messageInput,
      timestamp: new Date().toISOString(),
      isEncrypted: settings?.defaultEncryption || true
    }
    
    setMessages((current) => [...(current || []), newMessage])
    setMessageInput('')
    toast.success('Message saved securely')
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
    if (!uploadedFiles) return

    Array.from(uploadedFiles).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const newFile: VaultFile = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          isEncrypted: settings?.defaultEncryption || true,
          content: e.target?.result as string
        }
        
        setFiles((current) => [...(current || []), newFile])
      }
      reader.readAsDataURL(file)
    })
    
    toast.success('File(s) uploaded securely')
  }

  const handleDeleteFile = (id: string) => {
    setFiles((current) => (current || []).filter((file) => file.id !== id))
    toast.success('File deleted')
  }

  const handleDownloadFile = (file: VaultFile) => {
    if (!file.content) return
    
    const link = document.createElement('a')
    link.href = file.content
    link.download = file.name
    link.click()
    toast.success('File downloaded')
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <ShieldCheck className="w-6 h-6 text-primary" weight="duotone" />
            Secure Vault
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1">
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

          <ScrollArea className="h-[calc(90vh-180px)]">
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
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <ScrollArea className="h-[400px] rounded-lg border bg-muted/20 p-4">
                  <div className="space-y-3">
                    {filteredMessages.length === 0 ? (
                      <div className="text-center py-12">
                        <ChatCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
                        <p className="text-xs sm:text-sm text-muted-foreground">No messages yet</p>
                      </div>
                    ) : (
                      filteredMessages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="group"
                        >
                          <Card className="hover:border-primary/50 transition-colors">
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-xs sm:text-sm flex-1 break-words">{msg.text}</p>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleToggleFavoriteMessage(msg.id)}
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Star
                                      className={cn("w-3 h-3 sm:w-4 sm:h-4", msg.isFavorite && "fill-yellow-400 text-yellow-400")}
                                    />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                  >
                                    <Trash className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {msg.isEncrypted && (
                                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                                    <Lock className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                                    Encrypted
                                  </Badge>
                                )}
                                <span>{new Date(msg.timestamp).toLocaleString()}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Input
                    placeholder="Type a secure message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} size="sm" className="gap-2">
                    <PaperPlaneTilt className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
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

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <Label className="text-xs sm:text-sm font-medium">Biometric Unlock</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Use fingerprint or face recognition
                          </p>
                        </div>
                        <Switch
                          checked={settings?.biometricUnlock || false}
                          onCheckedChange={(checked) => handleSettingChange('biometricUnlock', checked)}
                        />
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
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

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
      </DialogContent>
    </Dialog>
  )
}
