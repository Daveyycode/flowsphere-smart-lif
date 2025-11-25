import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash, Eye, EyeSlash, Copy, Key, ShieldCheck, Lock } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

interface VaultProps {
  isOpen: boolean
  onClose: () => void
}

export function Vault({ isOpen, onClose }: VaultProps) {
  const [vaultItems, setVaultItems] = useKV<VaultItem[]>('flowsphere-vault-items', [])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    notes: '',
    category: 'login' as VaultItem['category']
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <ShieldCheck className="w-6 h-6 text-primary" weight="duotone" />
            Secure Vault
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Store passwords, notes, and sensitive information securely.
            </p>
            <Button
              onClick={() => {
                resetForm()
                setShowAddDialog(true)
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </div>

          {(vaultItems || []).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
                <h3 className="text-lg font-semibold mb-2">Your vault is empty</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start securing your sensitive information
                </p>
                <Button
                  onClick={() => {
                    resetForm()
                    setShowAddDialog(true)
                  }}
                  variant="outline"
                >
                  Add First Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {(vaultItems || []).map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(item.category)}
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditItem(item)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {item.username && (
                        <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Username</p>
                            <p className="text-sm font-mono">{item.username}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(item.username || '', 'Username')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {item.password && (
                        <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md">
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Password</p>
                            <p className="text-sm font-mono">
                              {visiblePasswords.has(item.id)
                                ? item.password
                                : '••••••••••••'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => togglePasswordVisibility(item.id)}
                            >
                              {visiblePasswords.has(item.id) ? (
                                <EyeSlash className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(item.password || '', 'Password')}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {item.notes && (
                        <div className="py-2 px-3 bg-muted/50 rounded-md">
                          <p className="text-xs text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
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
        </div>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={cn(
                        'py-2 px-3 rounded-md border-2 text-sm font-medium transition-all',
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
                <Label htmlFor="title">Title *</Label>
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
                    <Label htmlFor="username">Username / Email</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="username@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
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
                <Label htmlFor="notes">Notes</Label>
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
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddItem}>
                  {editingItem ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
