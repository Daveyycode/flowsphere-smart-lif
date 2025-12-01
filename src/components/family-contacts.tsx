/**
 * Family Contacts Management
 * Allows users to add and manage family contact numbers for easy access
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Trash, Phone, Envelope, Star, StarOff, PencilSimple, DeviceMobile } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import { cn } from '@/lib/utils'

interface FamilyContact {
  id: string
  name: string
  relationship: string
  phone: string
  email?: string
  isEmergency: boolean
  createdAt: string
  lastContacted?: string
  photoUrl?: string
}

const RELATIONSHIPS = [
  { value: 'parent', label: 'Parent', icon: '👨‍👩' },
  { value: 'spouse', label: 'Spouse', icon: '💑' },
  { value: 'child', label: 'Child', icon: '👶' },
  { value: 'sibling', label: 'Sibling', icon: '👫' },
  { value: 'grandparent', label: 'Grandparent', icon: '👴' },
  { value: 'grandchild', label: 'Grandchild', icon: '👦' },
  { value: 'other', label: 'Other Family', icon: '👥' }
]

export function FamilyContacts() {
  const [contacts, setContacts] = useKV<FamilyContact[]>('flowsphere-family-contacts', [])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<FamilyContact | null>(null)

  const [newContact, setNewContact] = useState({
    name: '',
    relationship: 'parent',
    phone: '',
    email: '',
    isEmergency: false
  })

  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone) {
      toast.error('Please provide a name and phone number')
      return
    }

    // Validate phone number format (basic)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/
    if (!phoneRegex.test(newContact.phone)) {
      toast.error('Please enter a valid phone number')
      return
    }

    if (editingContact) {
      // Update existing contact
      setContacts((current) =>
        current?.map(c =>
          c.id === editingContact.id
            ? {
                ...c,
                name: newContact.name,
                relationship: newContact.relationship,
                phone: newContact.phone,
                email: newContact.email || undefined,
                isEmergency: newContact.isEmergency
              }
            : c
        ) || []
      )
      toast.success(`Updated ${newContact.name}`)
      setEditingContact(null)
    } else {
      // Add new contact
      const contact: FamilyContact = {
        id: `contact-${Date.now()}`,
        name: newContact.name,
        relationship: newContact.relationship,
        phone: newContact.phone,
        email: newContact.email || undefined,
        isEmergency: newContact.isEmergency,
        createdAt: new Date().toISOString()
      }

      setContacts((current) => [...(current || []), contact])
      toast.success(`Added ${newContact.name} to your family contacts`)
    }

    setNewContact({ name: '', relationship: 'parent', phone: '', email: '', isEmergency: false })
    setIsAddDialogOpen(false)
  }

  const handleDeleteContact = (id: string) => {
    const contact = contacts?.find(c => c.id === id)
    setContacts((current) => current?.filter(c => c.id !== id) || [])
    toast.success(`Removed ${contact?.name}`)
  }

  const handleToggleEmergency = (id: string) => {
    setContacts((current) =>
      current?.map(c =>
        c.id === id ? { ...c, isEmergency: !c.isEmergency } : c
      ) || []
    )
  }

  const handleCall = (contact: FamilyContact) => {
    // Update last contacted time
    setContacts((current) =>
      current?.map(c =>
        c.id === contact.id ? { ...c, lastContacted: new Date().toISOString() } : c
      ) || []
    )

    // Open phone dialer
    window.location.href = `tel:${contact.phone}`
    toast.success(`Calling ${contact.name}...`)
  }

  const handleEmail = (contact: FamilyContact) => {
    if (!contact.email) {
      toast.error('No email address for this contact')
      return
    }

    // Open email client
    window.location.href = `mailto:${contact.email}`
    toast.success(`Opening email to ${contact.name}...`)
  }

  const handleEditContact = (contact: FamilyContact) => {
    setEditingContact(contact)
    setNewContact({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email || '',
      isEmergency: contact.isEmergency
    })
    setIsAddDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false)
    setEditingContact(null)
    setNewContact({ name: '', relationship: 'parent', phone: '', email: '', isEmergency: false })
  }

  const getRelationshipInfo = (relationship: string) => {
    return RELATIONSHIPS.find(r => r.value === relationship) || RELATIONSHIPS[RELATIONSHIPS.length - 1]
  }

  // Sort contacts: emergency first, then alphabetically
  const sortedContacts = [...(contacts || [])].sort((a, b) => {
    if (a.isEmergency && !b.isEmergency) return -1
    if (!a.isEmergency && b.isEmergency) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" weight="duotone" />
            Family Contacts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Quick access to your family members' contact information
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Family Contact'}</DialogTitle>
              <DialogDescription>
                Add family members for quick calling and messaging
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  placeholder="e.g., Mom, John Smith"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Relationship *</Label>
                <Select value={newContact.relationship} onValueChange={(value) => setNewContact({ ...newContact, relationship: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((rel) => (
                      <SelectItem key={rel.value} value={rel.value}>
                        <span className="flex items-center gap-2">
                          <span>{rel.icon}</span>
                          {rel.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Enter phone number with country code for international calls
                </p>
              </div>

              <div className="space-y-2">
                <Label>Email (Optional)</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <input
                  type="checkbox"
                  id="emergency"
                  checked={newContact.isEmergency}
                  onChange={(e) => setNewContact({ ...newContact, isEmergency: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="emergency" className="cursor-pointer">
                  Mark as Emergency Contact
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleAddContact}>
                  {editingContact ? 'Update Contact' : 'Add Contact'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!contacts || contacts.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
            <p className="text-muted-foreground">No family contacts added yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add your family members for quick and easy communication
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedContacts.map((contact, index) => {
            const relationship = getRelationshipInfo(contact.relationship)

            return (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className={cn(
                  "border-2 transition-all",
                  contact.isEmergency ? "border-destructive/30 bg-destructive/5" : "border-border"
                )}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                          {relationship.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {contact.name}
                            {contact.isEmergency && (
                              <Badge variant="destructive" className="text-xs">
                                Emergency
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            {relationship.label}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditContact(contact)}
                        >
                          <PencilSimple className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Phone Number</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={contact.phone}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleCall(contact)}
                          className="flex items-center gap-1"
                        >
                          <Phone className="w-4 h-4" weight="fill" />
                          Call
                        </Button>
                      </div>
                    </div>

                    {contact.email && (
                      <div className="space-y-2">
                        <Label className="text-xs">Email</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={contact.email}
                            readOnly
                            className="text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEmail(contact)}
                            className="flex items-center gap-1"
                          >
                            <Envelope className="w-4 h-4" />
                            Email
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-muted-foreground">
                        Added {new Date(contact.createdAt).toLocaleDateString()}
                        {contact.lastContacted && ` • Last contacted ${new Date(contact.lastContacted).toLocaleDateString()}`}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleEmergency(contact.id)}
                        className="flex items-center gap-1"
                      >
                        {contact.isEmergency ? (
                          <>
                            <StarOff className="w-4 h-4" />
                            Remove Emergency
                          </>
                        ) : (
                          <>
                            <Star className="w-4 h-4" />
                            Set Emergency
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <DeviceMobile className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" weight="duotone" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Quick Communication</p>
              <p className="text-xs text-muted-foreground">
                Tap "Call" to instantly dial family members on your device. Emergency contacts are prioritized at the top.
                All contact information is stored locally and never shared.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
