/**
 * Remote Timer Room View
 * Entry point for creating or joining remote timer rooms
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useDeviceType } from '@/hooks/use-mobile'
import { getRemoteTimerManager } from '@/lib/remote-timer-sync'
import { RemoteTimerController } from './remote-timer-controller'
import { RemoteTimerPresenter } from './remote-timer-presenter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Timer,
  Plus,
  SignIn,
  Broadcast,
  SlidersHorizontal,
  MonitorPlay,
  Lightning,
  Users,
  Copy,
  Check,
  ArrowLeft,
  Info,
  QrCode,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

type ViewMode = 'landing' | 'controller' | 'presenter'

interface RemoteTimerRoomProps {
  initialRoomCode?: string
  initialMode?: 'controller' | 'presenter'
  onBack?: () => void
}

export function RemoteTimerRoom({ initialRoomCode, initialMode, onBack }: RemoteTimerRoomProps) {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  const [viewMode, setViewMode] = useState<ViewMode>(
    initialRoomCode && initialMode ? initialMode : 'landing'
  )
  const [roomCode, setRoomCode] = useState(initialRoomCode || '')
  const [joinCode, setJoinCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [recentRooms, setRecentRooms] = useState<string[]>([])

  // Load recent rooms from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('flowsphere_recent_timer_rooms')
    if (saved) {
      try {
        setRecentRooms(JSON.parse(saved))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Save room to recent
  const saveToRecent = (code: string) => {
    const updated = [code, ...recentRooms.filter(r => r !== code)].slice(0, 5)
    setRecentRooms(updated)
    localStorage.setItem('flowsphere_recent_timer_rooms', JSON.stringify(updated))
  }

  // Create new room
  const handleCreateRoom = async () => {
    setIsCreating(true)
    try {
      const manager = getRemoteTimerManager()
      const result = await manager.createRoom('Timer Room', 'Controller')

      if (result) {
        setRoomCode(result.room.code)
        saveToRecent(result.room.code)
        setViewMode('controller')
        toast.success(`Room ${result.room.code} created!`)
      } else {
        toast.error('Failed to create room. Please try again.')
      }
    } catch (error) {
      toast.error('Failed to create room. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  // Join existing room
  const handleJoinRoom = (code: string, asController: boolean) => {
    const cleanCode = code.trim().toUpperCase()
    if (cleanCode.length !== 6) {
      toast.error('Please enter a valid 6-character room code')
      return
    }

    setRoomCode(cleanCode)
    saveToRecent(cleanCode)
    setViewMode(asController ? 'controller' : 'presenter')
  }

  // Copy room link
  const copyRoomLink = async (code: string, isPresenter: boolean) => {
    const url = isPresenter
      ? `${window.location.origin}/timer/${code}`
      : `${window.location.origin}/timer/${code}/control`
    await navigator.clipboard.writeText(url)
    setCopiedCode(true)
    toast.success('Link copied!')
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // Exit room
  const handleExit = () => {
    const manager = getRemoteTimerManager()
    manager.leaveRoom()
    setViewMode('landing')
    setRoomCode('')
    setJoinCode('')
  }

  // Handle URL-based room joining
  useEffect(() => {
    if (initialRoomCode && initialMode) {
      setRoomCode(initialRoomCode)
      setViewMode(initialMode)
    }
  }, [initialRoomCode, initialMode])

  // Render based on view mode
  if (viewMode === 'controller' && roomCode) {
    return <RemoteTimerController roomCode={roomCode} onExit={handleExit} />
  }

  if (viewMode === 'presenter' && roomCode) {
    return <RemoteTimerPresenter roomCode={roomCode} onExit={handleExit} />
  }

  // Landing page
  return (
    <div className={cn('space-y-6', isMobile ? 'px-2' : 'max-w-2xl mx-auto')}>
      {/* Header */}
      <Card className="bg-gradient-to-br from-orange-500/10 via-red-500/10 to-purple-500/10 border-orange-500/20">
        <CardHeader className={cn(isMobile ? 'pb-2' : 'pb-4')}>
          <CardTitle className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Broadcast className="w-7 h-7 text-white" weight="fill" />
            </div>
            <div>
              <h1 className={cn('font-bold', isMobile ? 'text-xl' : 'text-2xl')}>Remote Timer</h1>
              <p className="text-sm text-muted-foreground">
                Sync timers across devices for presentations and events
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* How it works */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-500">How it works</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>
                  1. Create a room as the <strong>Controller</strong>
                </li>
                <li>2. Share the presenter link with the speaker/screen</li>
                <li>3. Control the timer and send messages remotely</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Room */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="w-5 h-5" />
            Create New Room
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Start a new timer room and become the controller. You'll get a shareable link for
            presenters to join.
          </p>
          <Button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            size="lg"
          >
            {isCreating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Lightning className="w-5 h-5" weight="fill" />
                Create Timer Room
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Join Room */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <SignIn className="w-5 h-5" />
            Join Existing Room
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Room Code</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Enter 6-character code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono text-lg tracking-widest uppercase text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => handleJoinRoom(joinCode, true)}
              disabled={joinCode.length !== 6}
              className="gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Join as Controller
            </Button>
            <Button
              onClick={() => handleJoinRoom(joinCode, false)}
              disabled={joinCode.length !== 6}
              className="gap-2"
            >
              <MonitorPlay className="w-4 h-4" />
              Join as Presenter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Rooms */}
      {recentRooms.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Timer className="w-5 h-5" />
              Recent Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentRooms.map(code => (
                <div
                  key={code}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span className="font-mono font-bold text-lg">{code}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => copyRoomLink(code, true)}>
                      {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleJoinRoom(code, true)}>
                      <SlidersHorizontal className="w-4 h-4 mr-1" />
                      Control
                    </Button>
                    <Button size="sm" onClick={() => handleJoinRoom(code, false)}>
                      <MonitorPlay className="w-4 h-4 mr-1" />
                      Present
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <Broadcast className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <h3 className="font-semibold">Real-time Sync</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Instant updates across all connected devices
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <h3 className="font-semibold">Multiple Viewers</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Unlimited presenters can view the same timer
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <Lightning className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <h3 className="font-semibold">Live Messages</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Send alerts and cues to presenters instantly
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Back button */}
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="w-full text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Smart Timer
        </Button>
      )}
    </div>
  )
}
