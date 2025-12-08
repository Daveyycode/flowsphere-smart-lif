import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Camera, 
  Play, 
  Pause, 
  Record,
  ArrowsOut,
  Eye,
  EyeSlash,
  VideoCamera,
  House,
  Garage,
  Door,
  Park
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface CCTVCamera {
  id: string
  name: string
  location: 'front-door' | 'backyard' | 'garage' | 'living-room' | 'driveway'
  status: 'online' | 'offline' | 'recording'
  isRecording: boolean
  lastMotion?: string
  thumbnail?: string
}

interface CCTVViewProps {
  cameras: CCTVCamera[]
  onToggleRecording: (id: string, isRecording: boolean) => void
}

export function CCTVView({ cameras, onToggleRecording }: CCTVViewProps) {
  const [selectedCamera, setSelectedCamera] = useState<CCTVCamera | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'front-door': return Door
      case 'backyard': return Park
      case 'garage': return Garage
      case 'living-room': return House
      case 'driveway': return VideoCamera
      default: return Camera
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'mint'
      case 'recording': return 'destructive'
      case 'offline': return 'muted'
      default: return 'muted'
    }
  }

  const getStatusBadge = (camera: CCTVCamera) => {
    if (camera.isRecording) {
      return (
        <Badge variant="destructive" className="animate-pulse">
          <Record className="w-3 h-3 mr-1" weight="fill" />
          Recording
        </Badge>
      )
    }
    if (camera.status === 'offline') {
      return <Badge variant="secondary">Offline</Badge>
    }
    return <Badge variant="default" className="bg-mint text-mint-foreground">Online</Badge>
  }

  const handleCameraClick = (camera: CCTVCamera) => {
    setSelectedCamera(camera)
  }

  const handleCloseDialog = () => {
    setSelectedCamera(null)
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Demo Mode Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Camera className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Demo Mode</p>
          <p className="text-xs text-muted-foreground">CCTV integration requires camera setup. Showing simulated data.</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Security Cameras</h1>
          <p className="text-muted-foreground">
            Monitor your home with live camera feeds
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <ArrowsOut className="w-5 h-5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <Eye className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-accent/10 via-primary/10 to-coral/10 border-accent/20">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Camera className="w-6 h-6 text-accent" weight="fill" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">All Systems Operational</h3>
                <p className="text-sm text-muted-foreground">
                  {cameras.filter(c => c.status === 'online' || c.status === 'recording').length} of {cameras.length} cameras are active. 
                  {cameras.filter(c => c.isRecording).length > 0 && ` ${cameras.filter(c => c.isRecording).length} currently recording.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {cameras.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Camera className="w-10 h-10 text-muted-foreground" weight="duotone" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No cameras configured</h3>
          <p className="text-muted-foreground mb-6">
            Add security cameras to monitor your property
          </p>
          <Button className="bg-accent hover:bg-accent/90">
            Add Camera
          </Button>
        </motion.div>
      ) : (
        <div className={`grid grid-cols-1 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-4`}>
          {cameras.map((camera, index) => {
            const Icon = getLocationIcon(camera.location)
            const color = getStatusColor(camera.status)

            return (
              <motion.div
                key={camera.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card 
                  className={`border-border/50 hover:border-accent/50 transition-all duration-300 cursor-pointer group ${
                    camera.isRecording ? 'ring-2 ring-destructive/50' : ''
                  }`}
                  onClick={() => handleCameraClick(camera)}
                >
                  <CardContent className="p-0">
                    <div className="aspect-video bg-muted relative overflow-hidden rounded-t-xl">
                      {camera.thumbnail ? (
                        <img 
                          src={camera.thumbnail} 
                          alt={camera.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <Camera className="w-16 h-16 text-muted-foreground/30" weight="duotone" />
                        </div>
                      )}
                      
                      <div className="absolute top-3 right-3">
                        {getStatusBadge(camera)}
                      </div>

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                          variant="secondary" 
                          size="lg"
                          className="bg-white/90 hover:bg-white"
                        >
                          <Play className="w-6 h-6 mr-2" weight="fill" />
                          View Live
                        </Button>
                      </div>

                      {camera.isRecording && (
                        <motion.div
                          className="absolute top-3 left-3 w-3 h-3 bg-destructive rounded-full"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-lg bg-${color}/10 flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 text-${color}`} weight="duotone" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{camera.name}</h3>
                            <p className="text-xs text-muted-foreground capitalize">
                              {camera.location.replace('-', ' ')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {camera.lastMotion && (
                        <p className="text-xs text-muted-foreground mb-3">
                          Last motion: {camera.lastMotion}
                        </p>
                      )}

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleRecording(camera.id, !camera.isRecording)
                          }}
                          disabled={camera.status === 'offline'}
                        >
                          {camera.isRecording ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" weight="fill" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Record className="w-4 h-4 mr-2" weight="fill" />
                              Record
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCameraClick(camera)
                          }}
                        >
                          <ArrowsOut className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Dialog open={!!selectedCamera} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl">
          {selectedCamera && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <span>{selectedCamera.name}</span>
                  {getStatusBadge(selectedCamera)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="aspect-video bg-muted relative overflow-hidden rounded-xl">
                  {selectedCamera.thumbnail ? (
                    <img 
                      src={selectedCamera.thumbnail} 
                      alt={selectedCamera.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <div className="text-center">
                        <Camera className="w-24 h-24 text-muted-foreground/30 mx-auto mb-4" weight="duotone" />
                        <p className="text-muted-foreground">Live feed would appear here</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedCamera.isRecording && (
                    <div className="absolute top-4 left-4">
                      <Badge variant="destructive" className="animate-pulse">
                        <Record className="w-3 h-3 mr-1" weight="fill" />
                        Recording
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium capitalize">{selectedCamera.location.replace('-', ' ')}</p>
                  </div>
                  {selectedCamera.lastMotion && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Last Motion</p>
                      <p className="font-medium">{selectedCamera.lastMotion}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => onToggleRecording(selectedCamera.id, !selectedCamera.isRecording)}
                    disabled={selectedCamera.status === 'offline'}
                  >
                    {selectedCamera.isRecording ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" weight="fill" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Record className="w-4 h-4 mr-2" weight="fill" />
                        Start Recording
                      </>
                    )}
                  </Button>
                  <Button variant="outline">
                    View Recordings
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
