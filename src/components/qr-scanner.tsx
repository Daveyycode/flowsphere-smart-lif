import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, QrCode, Lightning, LightningSlash, CameraRotate } from '@phosphor-icons/react'
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
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanning, setScanning] = useState(false)
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const scanIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, facingMode])

  useEffect(() => {
    if (isOpen && hasPermission && stream) {
      startScanning()
    }

    return () => {
      stopScanning()
    }
  }, [isOpen, hasPermission, stream])

  const getVideoDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput')
      setDevices(videoDevices)
    } catch (error) {
      console.error('Error getting video devices:', error)
    }
  }

  const startCamera = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }

      await getVideoDevices()

      const track = mediaStream.getVideoTracks()[0]
      const capabilities = track.getCapabilities?.() as any
      if (capabilities?.torch) {
        setFlashEnabled(false)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      setHasPermission(false)
      toast.error('Camera access denied. Please enable camera permissions.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    stopScanning()
  }

  const toggleFlash = async () => {
    if (!stream) return

    const track = stream.getVideoTracks()[0]
    const capabilities = track.getCapabilities?.() as any

    if (capabilities?.torch) {
      try {
        await track.applyConstraints({
          // @ts-ignore
          advanced: [{ torch: !flashEnabled }]
        })
        setFlashEnabled(!flashEnabled)
      } catch (error) {
        toast.error('Flash not available on this device')
      }
    } else {
      toast.error('Flash not available on this device')
    }
  }

  const switchCamera = () => {
    stopCamera()
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  const startScanning = () => {
    if (scanIntervalRef.current) return

    setScanning(true)
    scanIntervalRef.current = window.setInterval(() => {
      captureAndScan()
    }, 250)
  }

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setScanning(false)
  }

  const captureAndScan = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    if (video.readyState !== video.HAVE_ENOUGH_DATA) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = detectQRCode(imageData)

    if (code) {
      stopScanning()
      navigator.vibrate?.(200)
      onScan(code)
      toast.success('QR code scanned successfully')
      onClose()
    }
  }

  const detectQRCode = (imageData: ImageData): string | null => {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    })

    if (code && code.data) {
      return code.data
    }

    return null
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black"
        >
          <div className="relative w-full h-full flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center gap-3">
                <QrCode className="w-6 h-6 text-white" weight="duotone" />
                <h2 className="text-white font-semibold text-lg">Scan QR Code</h2>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClose}
                className="text-white hover:bg-white/20 h-10 w-10 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 relative overflow-hidden">
              {hasPermission === false ? (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <Card className="p-8 max-w-md text-center">
                    <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
                    <h3 className="text-lg font-semibold mb-2">Camera Access Required</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Please enable camera permissions in your browser settings to scan QR codes.
                    </p>
                    <Button onClick={startCamera} className="w-full">
                      Try Again
                    </Button>
                  </Card>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <svg
                        width="280"
                        height="280"
                        viewBox="0 0 280 280"
                        fill="none"
                        className="drop-shadow-2xl"
                      >
                        <rect
                          x="1"
                          y="1"
                          width="278"
                          height="278"
                          rx="24"
                          stroke="white"
                          strokeWidth="3"
                          strokeDasharray="8 8"
                          className={cn(
                            'transition-all duration-300',
                            scanning && 'animate-pulse'
                          )}
                        />
                        
                        <path
                          d="M 30 1 L 1 1 L 1 30"
                          stroke="white"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M 250 1 L 279 1 L 279 30"
                          stroke="white"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M 1 250 L 1 279 L 30 279"
                          stroke="white"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M 279 250 L 279 279 L 250 279"
                          stroke="white"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      {scanning && (
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center"
                          initial={{ y: -140 }}
                          animate={{ y: 140 }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        >
                          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center p-6 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-center text-sm">
                      Position the QR code within the frame
                    </p>
                  </div>
                </>
              )}
            </div>

            {hasPermission && (
              <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center gap-4 px-6">
                {devices.length > 1 && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={switchCamera}
                    className="h-14 w-14 rounded-full bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 text-white p-0"
                  >
                    <CameraRotate className="w-6 h-6" />
                  </Button>
                )}
                
                <Button
                  size="lg"
                  variant="outline"
                  onClick={toggleFlash}
                  className={cn(
                    'h-14 w-14 rounded-full bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 text-white p-0',
                    flashEnabled && 'bg-primary/50'
                  )}
                >
                  {flashEnabled ? (
                    <Lightning className="w-6 h-6" weight="fill" />
                  ) : (
                    <LightningSlash className="w-6 h-6" />
                  )}
                </Button>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
