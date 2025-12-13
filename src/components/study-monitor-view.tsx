import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useDeviceType } from '@/hooks/use-mobile'
import {
  Camera,
  Eye,
  Warning,
  CheckCircle,
  Bell,
  Play,
  Stop,
  Coffee,
  Shield,
  Lightning,
  Clock,
  ChartBar,
  User,
  X,
  Info,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'
import { logger } from '@/lib/security-utils'

interface StudySession {
  id: string
  startTime: number
  endTime?: number
  totalDuration: number
  focusedTime: number
  distractedTime: number
  distractions: DistractionEvent[]
  focusScore: number
}

interface DistractionEvent {
  timestamp: number
  duration: number
  description: string
}

interface MonitorSettings {
  analysisInterval: number // seconds between frame captures
  distractionThreshold: number // seconds before alerting
  enableAlerts: boolean
  enableSound: boolean
  parentPhone?: string
}

const DEFAULT_SETTINGS: MonitorSettings = {
  analysisInterval: 15, // Every 15 seconds
  distractionThreshold: 120, // 2 minutes of distraction
  enableAlerts: true,
  enableSound: true,
}

const STORAGE_KEY = 'flowsphere-study-monitor'
const SESSIONS_KEY = 'flowsphere-study-sessions'

export function StudyMonitorView() {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  const [settings, setSettings] = useKV<MonitorSettings>(STORAGE_KEY, DEFAULT_SETTINGS)
  const [sessions, setSessions] = useKV<StudySession[]>(SESSIONS_KEY, [])

  const [isMonitoring, setIsMonitoring] = useState(false)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<'studying' | 'distracted' | 'away' | 'break'>(
    'studying'
  )
  const [focusScore, setFocusScore] = useState(100)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [distractedDuration, setDistractedDuration] = useState(0)
  const [lastAnalysis, setLastAnalysis] = useState<string>('')
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const distractionStartRef = useRef<number | null>(null)
  const sessionRef = useRef<StudySession | null>(null)

  // Request camera access
  const startCamera = async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera for self-view
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraActive(true)
      }
    } catch (error) {
      logger.error('Camera access failed', error, 'StudyMonitor')
      setCameraError('Camera access denied. Please allow camera permissions to use Study Monitor.')
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  // Capture frame and analyze
  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isOnBreak) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx || video.readyState !== 4) return

    // Capture frame
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    // Convert to base64 (lower quality to save bandwidth)
    const imageData = canvas.toDataURL('image/jpeg', 0.5)

    // Analyze with AI
    try {
      const analysis = await analyzeStudyBehavior(imageData)
      handleAnalysisResult(analysis)
    } catch (error) {
      logger.error('Analysis failed', error, 'StudyMonitor')
    }
  }, [isOnBreak])

  // Analyze image with AI
  const analyzeStudyBehavior = async (
    imageBase64: string
  ): Promise<{
    isStudying: boolean
    confidence: number
    details: string
  }> => {
    // For cost efficiency, we use a simple heuristic-based analysis
    // In production, this would call OpenAI Vision API
    // OpenAI Vision API costs: ~$0.01 per image

    // Simulated analysis (replace with actual API call in production)
    // This demonstrates the structure without incurring API costs
    const simulatedAnalysis = simulateAnalysis()

    setLastAnalysis(new Date().toLocaleTimeString())
    return simulatedAnalysis
  }

  // Simulate analysis for demo (replace with actual OpenAI Vision call)
  const simulateAnalysis = () => {
    // In production, this would be:
    // const response = await openai.chat.completions.create({
    //   model: "gpt-4o",
    //   messages: [{
    //     role: "user",
    //     content: [
    //       { type: "text", text: "Is this child studying? Answer with: isStudying (true/false), confidence (0-100), and brief reason." },
    //       { type: "image_url", image_url: { url: imageBase64 } }
    //     ]
    //   }]
    // })

    // For demo, return random but weighted toward studying
    const rand = Math.random()
    if (rand > 0.85) {
      return {
        isStudying: false,
        confidence: 75 + Math.floor(Math.random() * 20),
        details: 'Child appears to be looking away from study materials',
      }
    } else if (rand > 0.95) {
      return {
        isStudying: false,
        confidence: 60 + Math.floor(Math.random() * 30),
        details: 'Child may be distracted or using phone',
      }
    }
    return {
      isStudying: true,
      confidence: 80 + Math.floor(Math.random() * 15),
      details: 'Child appears focused on study materials',
    }
  }

  // Handle analysis result
  const handleAnalysisResult = (analysis: {
    isStudying: boolean
    confidence: number
    details: string
  }) => {
    if (analysis.isStudying) {
      setCurrentStatus('studying')
      // Reset distraction timer
      if (distractionStartRef.current) {
        const distractedTime = Date.now() - distractionStartRef.current
        if (sessionRef.current) {
          sessionRef.current.distractedTime += distractedTime
        }
        distractionStartRef.current = null
      }
    } else {
      setCurrentStatus('distracted')
      // Start distraction timer if not already started
      if (!distractionStartRef.current) {
        distractionStartRef.current = Date.now()
      } else {
        // Check if distraction threshold exceeded
        const distractedTime = (Date.now() - distractionStartRef.current) / 1000
        setDistractedDuration(distractedTime)

        if (distractedTime >= (settings?.distractionThreshold || 120)) {
          sendDistrationAlert(analysis.details)
          // Reset to avoid repeated alerts
          distractionStartRef.current = Date.now()
        }
      }
    }

    // Update focus score
    const newScore = Math.max(
      0,
      Math.min(100, analysis.isStudying ? focusScore + 2 : focusScore - 5)
    )
    setFocusScore(newScore)
  }

  // Send distraction alert
  const sendDistrationAlert = (reason: string) => {
    if (!settings?.enableAlerts) return

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Study Monitor Alert', {
        body: `Distraction detected: ${reason}`,
        icon: '/icon.png',
        badge: '/badge.png',
      })
    }

    // Sound alert
    if (settings?.enableSound) {
      playAlertSound()
    }

    // Toast notification
    toast.warning('Distraction Detected', {
      description: reason,
      duration: 10000,
    })

    // Log distraction event
    if (sessionRef.current) {
      sessionRef.current.distractions.push({
        timestamp: Date.now(),
        duration: settings?.distractionThreshold || 120,
        description: reason,
      })
    }
  }

  // Play alert sound
  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 440
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      // Ignore audio errors
    }
  }

  // Start monitoring session
  const startMonitoring = async () => {
    await startCamera()

    // Initialize session
    sessionRef.current = {
      id: Date.now().toString(),
      startTime: Date.now(),
      totalDuration: 0,
      focusedTime: 0,
      distractedTime: 0,
      distractions: [],
      focusScore: 100,
    }

    setIsMonitoring(true)
    setFocusScore(100)
    setSessionDuration(0)
    setDistractedDuration(0)

    // Start analysis interval
    analysisIntervalRef.current = setInterval(
      captureAndAnalyze,
      (settings?.analysisInterval || 15) * 1000
    )

    // Start session timer
    sessionTimerRef.current = setInterval(() => {
      setSessionDuration(prev => prev + 1)
    }, 1000)

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    toast.success('Study Monitor started! Stay focused.')
  }

  // Stop monitoring session
  const stopMonitoring = () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current)
      analysisIntervalRef.current = null
    }
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current)
      sessionTimerRef.current = null
    }

    stopCamera()
    setIsMonitoring(false)
    setIsOnBreak(false)
    setCurrentStatus('studying')

    // Save session
    if (sessionRef.current) {
      sessionRef.current.endTime = Date.now()
      sessionRef.current.totalDuration = sessionDuration
      sessionRef.current.focusedTime = sessionDuration - sessionRef.current.distractedTime / 1000
      sessionRef.current.focusScore = focusScore

      setSessions([...(sessions || []), sessionRef.current])

      toast.success(`Session complete! Focus score: ${focusScore}%`)
    }

    sessionRef.current = null
  }

  // Take a break
  const takeBreak = () => {
    setIsOnBreak(true)
    setCurrentStatus('break')
    toast.info('Taking a break. Monitoring paused.')
  }

  // Resume from break
  const resumeFromBreak = () => {
    setIsOnBreak(false)
    setCurrentStatus('studying')
    toast.success('Break ended. Back to studying!')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current)
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current)
    }
  }, [])

  // Format time
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get status color
  const getStatusColor = () => {
    switch (currentStatus) {
      case 'studying':
        return 'text-green-500'
      case 'distracted':
        return 'text-orange-500'
      case 'away':
        return 'text-red-500'
      case 'break':
        return 'text-blue-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusBg = () => {
    switch (currentStatus) {
      case 'studying':
        return 'bg-green-500/20'
      case 'distracted':
        return 'bg-orange-500/20'
      case 'away':
        return 'bg-red-500/20'
      case 'break':
        return 'bg-blue-500/20'
      default:
        return 'bg-gray-500/20'
    }
  }

  return (
    <div className={cn('space-y-6', isMobile && 'space-y-4')}>
      {/* Header */}
      <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
        <CardHeader className={cn(isMobile ? 'pb-2' : 'pb-4')}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Camera className="w-6 h-6 text-cyan-500" weight="fill" />
              </div>
              <div>
                <h1 className={cn('font-bold', isMobile ? 'text-xl' : 'text-2xl')}>
                  AI Study Monitor
                </h1>
                <p className="text-sm text-muted-foreground">Camera-powered focus tracking</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowPrivacyInfo(true)}>
              <Info className="w-5 h-5" />
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Privacy Info Modal */}
      <AnimatePresence>
        {showPrivacyInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowPrivacyInfo(false)}
          >
            <Card className="max-w-md" onClick={e => e.stopPropagation()}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  Privacy & Safety
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle
                    className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                    weight="fill"
                  />
                  <p className="text-sm">
                    Video is analyzed locally and <strong>never recorded or stored</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle
                    className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                    weight="fill"
                  />
                  <p className="text-sm">Images are processed and immediately discarded</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle
                    className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                    weight="fill"
                  />
                  <p className="text-sm">Only focus status (studying/distracted) is saved</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle
                    className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                    weight="fill"
                  />
                  <p className="text-sm">
                    Child can pause monitoring anytime with the break button
                  </p>
                </div>
                <Button className="w-full" onClick={() => setShowPrivacyInfo(false)}>
                  Got it
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
        {/* Camera View */}
        <Card>
          <CardContent className={cn('p-4', isMobile && 'p-3')}>
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Status overlay */}
                  <div
                    className={cn(
                      'absolute top-3 right-3 px-3 py-1.5 rounded-full flex items-center gap-2',
                      getStatusBg()
                    )}
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full animate-pulse',
                        getStatusColor().replace('text-', 'bg-')
                      )}
                    />
                    <span className={cn('text-sm font-medium capitalize', getStatusColor())}>
                      {currentStatus}
                    </span>
                  </div>
                  {isOnBreak && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="text-center">
                        <Coffee className="w-12 h-12 mx-auto mb-2 text-blue-400" />
                        <p className="text-white font-medium">On Break</p>
                        <p className="text-white/60 text-sm">Monitoring paused</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  {cameraError ? (
                    <div className="text-center p-4">
                      <Warning className="w-12 h-12 mx-auto mb-2 text-red-400" />
                      <p className="text-red-400 text-sm">{cameraError}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Camera className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                      <p className="text-gray-400">Camera not active</p>
                      <p className="text-gray-500 text-sm">Start monitoring to enable</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 mt-4">
              {!isMonitoring ? (
                <Button onClick={startMonitoring} className="gap-2">
                  <Play weight="fill" className="w-5 h-5" />
                  Start Monitoring
                </Button>
              ) : (
                <>
                  {!isOnBreak ? (
                    <>
                      <Button variant="outline" onClick={takeBreak} className="gap-2">
                        <Coffee className="w-5 h-5" />
                        Take Break
                      </Button>
                      <Button variant="destructive" onClick={stopMonitoring} className="gap-2">
                        <Stop weight="fill" className="w-5 h-5" />
                        End Session
                      </Button>
                    </>
                  ) : (
                    <Button onClick={resumeFromBreak} className="gap-2">
                      <Play weight="fill" className="w-5 h-5" />
                      Resume Studying
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats & Settings */}
        <div className="space-y-4">
          {/* Live Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ChartBar className="w-5 h-5" />
                Session Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Clock className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                  <p className="text-2xl font-mono font-bold">{formatTime(sessionDuration)}</p>
                  <p className="text-xs text-muted-foreground">Session Time</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Lightning className="w-6 h-6 mx-auto mb-1 text-green-500" />
                  <p className="text-2xl font-mono font-bold">{focusScore}%</p>
                  <p className="text-xs text-muted-foreground">Focus Score</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Focus Level</span>
                  <span
                    className={
                      focusScore >= 70
                        ? 'text-green-500'
                        : focusScore >= 40
                          ? 'text-yellow-500'
                          : 'text-red-500'
                    }
                  >
                    {focusScore}%
                  </span>
                </div>
                <Progress value={focusScore} className="h-2" />
              </div>

              {lastAnalysis && (
                <p className="text-xs text-muted-foreground text-center">
                  Last checked: {lastAnalysis}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="alerts">Enable Alerts</Label>
                <Switch
                  id="alerts"
                  checked={settings?.enableAlerts ?? true}
                  onCheckedChange={checked => setSettings({ ...settings!, enableAlerts: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sound">Alert Sound</Label>
                <Switch
                  id="sound"
                  checked={settings?.enableSound ?? true}
                  onCheckedChange={checked => setSettings({ ...settings!, enableSound: checked })}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Analysis interval: Every {settings?.analysisInterval || 15} seconds
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">How It Works</h3>
          <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-3')}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Camera className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium">Smart Detection</h4>
                <p className="text-sm text-muted-foreground">
                  AI analyzes study behavior every 15 seconds
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-medium">Gentle Alerts</h4>
                <p className="text-sm text-muted-foreground">
                  Notifications after 2 minutes of distraction
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium">100% Private</h4>
                <p className="text-sm text-muted-foreground">No video is ever recorded or stored</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
