import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { motion } from 'framer-motion'
import { 
  Camera, 
  Eye, 
  Warning, 
  CheckCircle, 
  Lightning,
  Record,
  Play,
  Stop,
  Bell
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

declare const spark: {
  llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => string
  llm: (prompt: string, model?: string, jsonMode?: boolean) => Promise<string>
}

export interface CCTVCamera {
  id: string
  name: string
  location: string
  status: 'online' | 'offline' | 'maintenance'
  isRecording: boolean
  lastMotion?: string
  aiEnabled: boolean
}

export interface SecurityEvent {
  id: string
  cameraId: string
  cameraName: string
  type: 'motion' | 'person' | 'vehicle' | 'animal' | 'package' | 'suspicious'
  description: string
  timestamp: string
  severity: 'low' | 'medium' | 'high'
  isRead: boolean
  aiAnalysis?: string
}

interface CCTVGuardAIProps {
  className?: string
}

export function CCTVGuardAI({ className }: CCTVGuardAIProps) {
  const [cameras, setCameras] = useKV<CCTVCamera[]>('flowsphere-cctv-cameras', [
    {
      id: 'cam-1',
      name: 'Front Door',
      location: 'Entrance',
      status: 'online',
      isRecording: false,
      lastMotion: '5 minutes ago',
      aiEnabled: true
    },
    {
      id: 'cam-2',
      name: 'Backyard',
      location: 'Garden',
      status: 'online',
      isRecording: false,
      lastMotion: '1 hour ago',
      aiEnabled: true
    },
    {
      id: 'cam-3',
      name: 'Garage',
      location: 'Parking',
      status: 'online',
      isRecording: true,
      lastMotion: '30 minutes ago',
      aiEnabled: true
    },
    {
      id: 'cam-4',
      name: 'Driveway',
      location: 'Front',
      status: 'online',
      isRecording: false,
      lastMotion: '2 hours ago',
      aiEnabled: false
    }
  ])

  const [securityEvents, setSecurityEvents] = useKV<SecurityEvent[]>('flowsphere-security-events', [
    {
      id: 'event-1',
      cameraId: 'cam-1',
      cameraName: 'Front Door',
      type: 'person',
      description: 'Person detected at front entrance',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      severity: 'medium',
      isRead: false,
      aiAnalysis: 'AI detected a delivery person approaching the door with a package. No security threat detected.'
    },
    {
      id: 'event-2',
      cameraId: 'cam-3',
      cameraName: 'Garage',
      type: 'vehicle',
      description: 'Vehicle detected in driveway',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      severity: 'low',
      isRead: false,
      aiAnalysis: 'Familiar vehicle recognized. Matches registered family vehicle.'
    },
    {
      id: 'event-3',
      cameraId: 'cam-2',
      cameraName: 'Backyard',
      type: 'animal',
      description: 'Small animal detected',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      severity: 'low',
      isRead: true,
      aiAnalysis: 'Small pet or wildlife detected. No security concern.'
    }
  ])

  const [guardEnabled, setGuardEnabled] = useKV<boolean>('flowsphere-guard-enabled', true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const activeCameras = cameras?.filter(c => c.status === 'online') || []
  const recordingCameras = cameras?.filter(c => c.isRecording) || []
  const aiEnabledCameras = cameras?.filter(c => c.aiEnabled) || []
  const unreadEvents = securityEvents?.filter(e => !e.isRead) || []

  const handleToggleRecording = (cameraId: string) => {
    setCameras((current) =>
      current?.map(cam =>
        cam.id === cameraId ? { ...cam, isRecording: !cam.isRecording } : cam
      ) || []
    )
    const camera = cameras?.find(c => c.id === cameraId)
    toast.success(`${camera?.name} recording ${camera?.isRecording ? 'stopped' : 'started'}`)
  }

  const handleToggleAI = (cameraId: string) => {
    setCameras((current) =>
      current?.map(cam =>
        cam.id === cameraId ? { ...cam, aiEnabled: !cam.aiEnabled } : cam
      ) || []
    )
    const camera = cameras?.find(c => c.id === cameraId)
    toast.success(`AI monitoring ${camera?.aiEnabled ? 'disabled' : 'enabled'} for ${camera?.name}`)
  }

  const handleMarkEventRead = (eventId: string) => {
    setSecurityEvents((current) =>
      current?.map(event =>
        event.id === eventId ? { ...event, isRead: true } : event
      ) || []
    )
  }

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true)
    
    try {
      const recentEvents = securityEvents?.slice(0, 5).map(e => ({
        camera: e.cameraName,
        type: e.type,
        description: e.description,
        timestamp: e.timestamp
      }))

      const prompt = spark.llmPrompt`You are an AI security guard analyzing CCTV footage events. 

Recent events: ${JSON.stringify(recentEvents)}

Provide a brief security summary (2-3 sentences) highlighting:
1. Any potential security concerns
2. Normal activity patterns
3. Recommended actions if any

Be professional, concise, and reassuring if everything looks normal.`

      const analysis = await spark.llm(prompt, 'gpt-4o-mini', false)
      
      toast.success('AI Analysis Complete', {
        description: analysis,
        duration: 8000
      })
    } catch (error) {
      console.error('AI analysis error:', error)
      toast.error('Failed to analyze security events')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getEventIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'motion': return Lightning
      case 'person': return Eye
      case 'vehicle': return Camera
      case 'package': return CheckCircle
      case 'suspicious': return Warning
      default: return Bell
    }
  }

  const getEventColor = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'high': return 'text-destructive'
      case 'medium': return 'text-primary'
      case 'low': return 'text-accent'
    }
  }

  const getSeverityBadge = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'high': return <Badge variant="destructive">High</Badge>
      case 'medium': return <Badge className="bg-primary text-primary-foreground">Medium</Badge>
      case 'low': return <Badge variant="secondary">Low</Badge>
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">CCTV Guard AI</h2>
          <p className="text-muted-foreground">
            AI-powered security monitoring and threat detection
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="guard-toggle">AI Guard</Label>
            <Switch
              id="guard-toggle"
              checked={guardEnabled}
              onCheckedChange={(checked) => {
                setGuardEnabled(checked)
                toast.success(`AI Guard ${checked ? 'enabled' : 'disabled'}`)
              }}
            />
          </div>
          <Button
            onClick={handleAIAnalysis}
            disabled={isAnalyzing}
            className="gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" weight="duotone" />
                AI Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Camera className="w-6 h-6 text-accent" weight="duotone" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Cameras</p>
                <p className="text-2xl font-bold">{activeCameras.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Record className="w-6 h-6 text-destructive" weight="fill" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recording</p>
                <p className="text-2xl font-bold">{recordingCameras.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Eye className="w-6 h-6 text-primary" weight="duotone" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI Enabled</p>
                <p className="text-2xl font-bold">{aiEnabledCameras.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-mint/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-mint" weight="fill" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New Alerts</p>
                <p className="text-2xl font-bold">{unreadEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" weight="duotone" />
              Camera Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {cameras?.map((camera, index) => (
                  <motion.div
                    key={camera.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`${camera.isRecording ? 'border-destructive/50 bg-destructive/5' : 'bg-muted/30'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{camera.name}</h4>
                              <Badge variant={camera.status === 'online' ? 'default' : 'secondary'} className="text-xs">
                                {camera.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{camera.location}</p>
                            {camera.lastMotion && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Last motion: {camera.lastMotion}
                              </p>
                            )}
                          </div>
                          {camera.isRecording && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              <Record className="w-5 h-5 text-destructive" weight="fill" />
                            </motion.div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={camera.isRecording ? 'destructive' : 'default'}
                            onClick={() => handleToggleRecording(camera.id)}
                            className="flex-1 gap-2"
                            disabled={camera.status !== 'online'}
                          >
                            {camera.isRecording ? (
                              <>
                                <Stop className="w-4 h-4" weight="fill" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" weight="fill" />
                                Record
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant={camera.aiEnabled ? 'default' : 'outline'}
                            onClick={() => handleToggleAI(camera.id)}
                            className="flex-1 gap-2"
                            disabled={camera.status !== 'online'}
                          >
                            <Eye className="w-4 h-4" weight="duotone" />
                            AI {camera.aiEnabled ? 'On' : 'Off'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" weight="fill" />
              Security Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {securityEvents && securityEvents.length > 0 ? (
                  securityEvents.map((event, index) => {
                    const Icon = getEventIcon(event.type)
                    const colorClass = getEventColor(event.severity)
                    
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={`${event.isRead ? 'bg-muted/30' : 'bg-card border-primary/30'}`}>
                          <CardContent className="p-4">
                            <div className="flex gap-3">
                              <div className={`w-10 h-10 rounded-full bg-background flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                <Icon className="w-5 h-5" weight="duotone" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold text-sm">{event.cameraName}</h4>
                                      {getSeverityBadge(event.severity)}
                                    </div>
                                    <p className="text-sm">{event.description}</p>
                                    {event.aiAnalysis && (
                                      <p className="text-xs text-muted-foreground mt-2 italic">
                                        {event.aiAnalysis}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(event.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                {!event.isRead && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMarkEventRead(event.id)}
                                    className="gap-2"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Mark Read
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No security events</p>
                    <p className="text-sm">All clear!</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

