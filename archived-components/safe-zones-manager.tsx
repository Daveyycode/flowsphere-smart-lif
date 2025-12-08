/**
 * Safe Zones Manager
 * Allows configuration of safe zones (home, school, work) for family GPS monitoring
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Plus,
  MapPin,
  House,
  GraduationCap,
  Briefcase,
  Target,
  Trash,
  PencilSimple
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { SafeZone } from '@/components/family-view'

interface SafeZonesManagerProps {
  isOpen: boolean
  onClose: () => void
  safeZones: SafeZone[]
  onSaveZones: (zones: SafeZone[]) => void
}

export function SafeZonesManager({
  isOpen,
  onClose,
  safeZones,
  onSaveZones
}: SafeZonesManagerProps) {
  const [zones, setZones] = useState<SafeZone[]>(safeZones)
  const [editingZone, setEditingZone] = useState<SafeZone | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formType, setFormType] = useState<'home' | 'school' | 'work' | 'custom'>('home')
  const [formRadius, setFormRadius] = useState('500')
  const [formLat, setFormLat] = useState('')
  const [formLng, setFormLng] = useState('')

  const getZoneIcon = (type: string) => {
    switch (type) {
      case 'home':
        return House
      case 'school':
        return GraduationCap
      case 'work':
        return Briefcase
      default:
        return MapPin
    }
  }

  const getZoneColor = (type: string) => {
    switch (type) {
      case 'home':
        return 'mint'
      case 'school':
        return 'coral'
      case 'work':
        return 'accent'
      default:
        return 'primary'
    }
  }

  const handleAddZone = () => {
    setIsAdding(true)
    setEditingZone(null)
    setFormName('')
    setFormAddress('')
    setFormType('home')
    setFormRadius('500')
    setFormLat('')
    setFormLng('')
  }

  const handleEditZone = (zone: SafeZone) => {
    setEditingZone(zone)
    setIsAdding(false)
    setFormName(zone.name)
    setFormAddress(zone.address || '')
    setFormType(zone.type)
    setFormRadius(zone.radius.toString())
    setFormLat(zone.coordinates.lat.toString())
    setFormLng(zone.coordinates.lng.toString())
  }

  const handleDeleteZone = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId)
    if (window.confirm(`Delete safe zone "${zone?.name}"?`)) {
      const newZones = zones.filter(z => z.id !== zoneId)
      setZones(newZones)
      toast.success('Safe zone deleted')
    }
  }

  const handleSaveZone = () => {
    if (!formName || !formAddress || !formLat || !formLng) {
      toast.error('Please fill in all fields')
      return
    }

    const lat = parseFloat(formLat)
    const lng = parseFloat(formLng)
    const radius = parseInt(formRadius)

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      toast.error('Invalid coordinates or radius')
      return
    }

    if (editingZone) {
      // Update existing zone
      const newZones = zones.map(z =>
        z.id === editingZone.id
          ? {
              ...editingZone,
              name: formName,
              address: formAddress,
              type: formType,
              radius,
              coordinates: { lat, lng }
            }
          : z
      )
      setZones(newZones)
      toast.success('Safe zone updated')
    } else {
      // Add new zone
      const newZone: SafeZone = {
        id: Date.now().toString(),
        name: formName,
        address: formAddress,
        type: formType,
        radius,
        coordinates: { lat, lng }
      }
      setZones([...zones, newZone])
      toast.success('Safe zone added')
    }

    setIsAdding(false)
    setEditingZone(null)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingZone(null)
  }

  const handleSaveAll = () => {
    onSaveZones(zones)
    toast.success('Safe zones saved successfully')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <Card className="shadow-2xl border-primary/30">
              <CardHeader className="bg-gradient-to-r from-accent via-primary to-coral p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <MapPin className="w-6 h-6 md:w-7 md:h-7 text-white" weight="fill" />
                    </div>
                    <CardTitle className="text-white text-lg md:text-xl">Safe Zones</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 md:p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure safe zones for family members. GPS alerts will only trigger when members leave these zones.
                </p>

                {/* Existing Safe Zones */}
                <div className="space-y-3">
                  {zones.map((zone) => {
                    const Icon = getZoneIcon(zone.type)
                    const color = getZoneColor(zone.type)

                    return (
                      <Card key={zone.id} className="border-border/50">
                        <CardContent className="p-3 md:p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`w-10 h-10 rounded-lg bg-${color}/20 flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`w-5 h-5 text-${color}`} weight="fill" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-sm md:text-base truncate">{zone.name}</h4>
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {zone.type}
                                  </Badge>
                                </div>
                                <p className="text-xs md:text-sm text-muted-foreground truncate">{zone.address}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Target className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    Radius: {zone.radius}m
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditZone(zone)}
                              >
                                <PencilSimple className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteZone(zone.id)}
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {zones.length === 0 && !isAdding && !editingZone && (
                    <Card className="border-dashed border-2">
                      <CardContent className="p-8 text-center">
                        <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground" weight="duotone" />
                        <h4 className="font-semibold mb-1">No safe zones configured</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Add your first safe zone to start monitoring
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Add/Edit Form */}
                {(isAdding || editingZone) && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4 space-y-3">
                      <h4 className="font-semibold">
                        {editingZone ? 'Edit Safe Zone' : 'Add New Safe Zone'}
                      </h4>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                          <Label htmlFor="zone-name">Zone Name</Label>
                          <Input
                            id="zone-name"
                            placeholder="Home, School, Work..."
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <Label htmlFor="zone-type">Type</Label>
                          <select
                            id="zone-type"
                            value={formType}
                            onChange={(e) => setFormType(e.target.value as any)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="home">Home</option>
                            <option value="school">School</option>
                            <option value="work">Work</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="zone-address">Address</Label>
                        <Input
                          id="zone-address"
                          placeholder="123 Main St, City, State"
                          value={formAddress}
                          onChange={(e) => setFormAddress(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="zone-lat">Latitude</Label>
                          <Input
                            id="zone-lat"
                            type="number"
                            step="0.000001"
                            placeholder="37.7749"
                            value={formLat}
                            onChange={(e) => setFormLat(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="zone-lng">Longitude</Label>
                          <Input
                            id="zone-lng"
                            type="number"
                            step="0.000001"
                            placeholder="-122.4194"
                            value={formLng}
                            onChange={(e) => setFormLng(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="zone-radius">Radius (m)</Label>
                          <Input
                            id="zone-radius"
                            type="number"
                            placeholder="500"
                            value={formRadius}
                            onChange={(e) => setFormRadius(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" onClick={handleCancel} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleSaveZone} className="flex-1 bg-primary">
                          {editingZone ? 'Update' : 'Add'} Zone
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!isAdding && !editingZone && (
                  <Button
                    variant="outline"
                    className="w-full border-dashed border-2"
                    onClick={handleAddZone}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Safe Zone
                  </Button>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAll} className="flex-1 bg-gradient-to-r from-blue-mid to-blue-deep">
                    Save All Zones
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
