import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  X,
  QrCode,
  Lightning,
  LightningSlash,
  CameraRotate,
  Warning,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import jsQR from 'jsqr'

interface QRScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (data: string) => void
}

export function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopEverything()
    }
  }, [])

  // Handle open/close
  useEffect(() => {
    if (isOpen) {
      setError(null)
      startCamera()
    } else {
      stopEverything()
    }
  }, [isOpen])

  // Handle camera switch
  useEffect(() => {
    if (isOpen && hasPermission) {
      stopEverything()
      startCamera()
    }
  }, [facingMode])

  const stopEverything = useCallback(() => {
    // Stop scanning
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setScanning(false)

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }

    // Clear video
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = async () => {
    if (!mountedRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      // Check for camera support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device')
      }

      // Get camera permission
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false,
      }

      console.log('[QRScanner] Requesting camera with constraints:', constraints)

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      if (!mountedRef.current) {
        mediaStream.getTracks().forEach(track => track.stop())
        return
      }

      streamRef.current = mediaStream
      setHasPermission(true)

      // Check for multiple cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(d => d.kind === 'videoinput')
        setHasMultipleCameras(videoDevices.length > 1)
        console.log('[QRScanner] Found', videoDevices.length, 'camera(s)')
      } catch (e) {
        console.log('[QRScanner] Could not enumerate devices')
      }

      // Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!

          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            resolve()
          }

          const onError = (e: Event) => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            reject(new Error('Video failed to load'))
          }

          video.addEventListener('loadedmetadata', onLoadedMetadata)
          video.addEventListener('error', onError)

          // Timeout after 5 seconds
          setTimeout(() => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            resolve() // Continue anyway
          }, 5000)
        })

        // Play video
        try {
          await videoRef.current.play()
          console.log('[QRScanner] Video playing')
        } catch (playError) {
          console.error('[QRScanner] Play error:', playError)
          // Try muted play (required on some browsers)
          videoRef.current.muted = true
          await videoRef.current.play()
        }

        // Start scanning after video is playing
        startScanning()
      }

      // Try to apply auto-focus
      const track = mediaStream.getVideoTracks()[0]
      if (track) {
        try {
          const capabilities = track.getCapabilities?.() as any
          if (capabilities?.focusMode?.includes('continuous')) {
            await track.applyConstraints({
              // @ts-ignore
              advanced: [{ focusMode: 'continuous' }],
            })
            console.log('[QRScanner] Auto-focus enabled')
          }
        } catch (e) {
          console.log('[QRScanner] Auto-focus not supported')
        }
      }
    } catch (err: any) {
      console.error('[QRScanner] Camera error:', err)

      if (!mountedRef.current) return

      setHasPermission(false)

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found on this device.')
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is in use by another app. Please close other apps using the camera.')
      } else {
        setError(err.message || 'Could not access camera')
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  const startScanning = () => {
    if (scanIntervalRef.current) return

    console.log('[QRScanner] Starting scan loop')
    setScanning(true)

    // Scan every 150ms for good balance of performance and detection
    scanIntervalRef.current = window.setInterval(() => {
      if (mountedRef.current) {
        captureAndScan()
      }
    }, 150)
  }

  const captureAndScan = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) return
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return
    if (video.videoWidth === 0 || video.videoHeight === 0) return

    // Set canvas size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Try to detect QR code
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })

      if (code && code.data && code.data.trim()) {
        console.log('[QRScanner] QR Code detected:', code.data.substring(0, 50) + '...')

        // Stop scanning immediately
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current)
          scanIntervalRef.current = null
        }
        setScanning(false)

        // Vibrate on success
        try {
          navigator.vibrate?.(200)
        } catch (e) {}

        // Call callback
        onScan(code.data.trim())
      }
    } catch (err) {
      // Silently ignore scan errors
    }
  }

  const toggleFlash = async () => {
    if (!streamRef.current) return

    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return

    try {
      const capabilities = track.getCapabilities?.() as any
      if (capabilities?.torch) {
        await track.applyConstraints({
          // @ts-ignore
          advanced: [{ torch: !flashEnabled }],
        })
        setFlashEnabled(!flashEnabled)
      } else {
        toast.error('Flash not available')
      }
    } catch (err) {
      toast.error('Could not toggle flash')
    }
  }

  const switchCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'))
  }

  const handleClose = () => {
    stopEverything()
    onClose()
  }

  const handleRetry = () => {
    setError(null)
    setHasPermission(null)
    startCamera()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black"
          style={{ touchAction: 'none' }}
        >
          <div className="relative w-full h-full flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent safe-area-top">
              <div className="flex items-center gap-3">
                <QrCode className="w-6 h-6 text-white" weight="duotone" />
                <h2 className="text-white font-semibold text-lg">Scan QR Code</h2>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleClose}
                className="text-white hover:bg-white/20 h-10 w-10"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative">
              {/* Loading State */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white">Starting camera...</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center p-6 bg-black z-10">
                  <Card className="p-6 max-w-sm text-center bg-zinc-900 border-zinc-800">
                    <Warning className="w-16 h-16 mx-auto mb-4 text-yellow-500" weight="duotone" />
                    <h3 className="text-lg font-semibold mb-2 text-white">Camera Error</h3>
                    <p className="text-sm text-zinc-400 mb-4">{error}</p>
                    <div className="flex gap-2">
                      <Button onClick={handleRetry} className="flex-1">
                        Try Again
                      </Button>
                      <Button onClick={handleClose} variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* Permission Denied */}
              {hasPermission === false && !error && (
                <div className="absolute inset-0 flex items-center justify-center p-6 bg-black z-10">
                  <Card className="p-6 max-w-sm text-center bg-zinc-900 border-zinc-800">
                    <Camera className="w-16 h-16 mx-auto mb-4 text-zinc-500" weight="duotone" />
                    <h3 className="text-lg font-semibold mb-2 text-white">
                      Camera Access Required
                    </h3>
                    <p className="text-sm text-zinc-400 mb-4">
                      Please enable camera permissions in your browser settings to scan QR codes.
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={handleRetry} className="flex-1">
                        Try Again
                      </Button>
                      <Button onClick={handleClose} variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Scan Overlay */}
              {hasPermission && !isLoading && !error && (
                <>
                  {/* Darkened corners */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-black/50" />
                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-transparent"
                      style={{
                        width: 'min(280px, 70vw)',
                        height: 'min(280px, 70vw)',
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                      }}
                    />
                  </div>

                  {/* Scan Frame */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="relative"
                      style={{
                        width: 'min(280px, 70vw)',
                        height: 'min(280px, 70vw)',
                      }}
                    >
                      {/* Corner markers */}
                      <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-lg" />

                      {/* Scanning line */}
                      {scanning && (
                        <motion.div
                          className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                          initial={{ top: '10%' }}
                          animate={{ top: '90%' }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            repeatType: 'reverse',
                            ease: 'easeInOut',
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="absolute bottom-32 left-0 right-0 text-center px-6">
                    <p className="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
                      Position QR code within the frame
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Controls */}
            {hasPermission && !isLoading && !error && (
              <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-black/90 to-transparent safe-area-bottom">
                <div className="flex items-center justify-center gap-6">
                  {hasMultipleCameras && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={switchCamera}
                      className="h-14 w-14 rounded-full bg-white/10 backdrop-blur-sm border-white/30 hover:bg-white/20 text-white p-0"
                    >
                      <CameraRotate className="w-6 h-6" />
                    </Button>
                  )}

                  <Button
                    size="lg"
                    variant="outline"
                    onClick={toggleFlash}
                    className={cn(
                      'h-14 w-14 rounded-full bg-white/10 backdrop-blur-sm border-white/30 hover:bg-white/20 text-white p-0',
                      flashEnabled && 'bg-yellow-500/50 border-yellow-500'
                    )}
                  >
                    {flashEnabled ? (
                      <Lightning className="w-6 h-6" weight="fill" />
                    ) : (
                      <LightningSlash className="w-6 h-6" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
