/**
 * Steganographic QR Code Component
 *
 * Custom QR code that appears faint/hidden to outside observers
 * but is easily scannable within FlowSphere app
 */

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import QRCodeStyling from 'qr-code-styling'
import { cn } from '@/lib/utils'

interface SteganographicQRProps {
  value: string
  size?: number
  className?: string
  hideMode?: 'faint' | 'ultra-faint' | 'invisible'
}

export function SteganographicQR({
  value,
  size = 200,
  className,
  hideMode = 'faint'
}: SteganographicQRProps) {
  const ref = useRef<HTMLDivElement>(null)
  const qrCode = useRef<QRCodeStyling | null>(null)

  // Opacity levels for different hide modes
  // NOTE: These need to be high enough for cameras to scan!
  const opacityLevels = {
    'faint': 0.40,           // Subtle but clearly scannable (40%)
    'ultra-faint': 0.25,     // Harder to notice, still scannable (25%)
    'invisible': 0.15        // Very subtle, requires good camera (15%)
  }

  const opacity = opacityLevels[hideMode]

  useEffect(() => {
    if (!ref.current) return

    // Create custom steganographic QR code
    qrCode.current = new QRCodeStyling({
      width: size,
      height: size,
      data: value,
      margin: 0,
      qrOptions: {
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: 'H' // High error correction for better scanning
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.4,
        margin: 0
      },
      dotsOptions: {
        type: 'dots', // Softer appearance
        color: `rgba(100, 100, 100, ${opacity})`, // Very faint gray
        gradient: {
          type: 'linear',
          rotation: 45,
          colorStops: [
            { offset: 0, color: `rgba(80, 80, 80, ${opacity * 0.8})` },
            { offset: 1, color: `rgba(120, 120, 120, ${opacity * 1.2})` }
          ]
        }
      },
      backgroundOptions: {
        color: 'transparent'
      },
      cornersSquareOptions: {
        type: 'dot',
        color: `rgba(90, 90, 90, ${opacity * 1.5})` // Slightly more visible corners
      },
      cornersDotOptions: {
        type: 'dot',
        color: `rgba(70, 70, 70, ${opacity * 1.3})`
      }
    })

    // Clear previous QR code
    ref.current.innerHTML = ''
    qrCode.current.append(ref.current)

    return () => {
      if (qrCode.current) {
        qrCode.current = null
      }
    }
  }, [value, size, opacity])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative rounded-lg overflow-hidden',
        'bg-gradient-to-br from-muted/5 to-muted/10',
        'backdrop-blur-[2px]',
        className
      )}
    >
      {/* Subtle pattern overlay to further hide the QR code */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23999999' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      {/* QR Code Container */}
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center'
        )}
        style={{
          // Removed blur and contrast reduction for better scannability
          opacity: 0.95 // Keep QR crisp for cameras
        }}
      />

      {/* Scan indicator (only visible when actively scanning in-app) */}
      <div className="absolute inset-0 pointer-events-none opacity-0 scan-active:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-2 border-2 border-primary rounded-lg animate-pulse" />
      </div>
    </motion.div>
  )
}

/**
 * Enhanced QR Scanner Component (detects steganographic QR codes)
 */
interface SteganoQRScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
  className?: string
}

export function SteganoQRScanner({ onScan, onError, className }: SteganoQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanningRef = useRef(false)

  useEffect(() => {
    let stream: MediaStream | null = null

    const startScanner = async () => {
      try {
        // Request camera access
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
          scanningRef.current = true
          scanQRCode()
        }
      } catch (error) {
        console.error('Camera access denied:', error)
        onError?.('Camera access denied. Please grant camera permissions.')
      }
    }

    const scanQRCode = () => {
      if (!scanningRef.current || !videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        requestAnimationFrame(scanQRCode)
        return
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // ENHANCED: Apply image processing to detect faint QR codes
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      enhanceImageForScanning(imageData)
      ctx.putImageData(imageData, 0, 0)

      // Try to decode QR code using jsQR
      try {
        // NOTE: In production, use jsQR library for actual QR detection
        // For now, this is a placeholder structure
        // const code = jsQR(imageData.data, imageData.width, imageData.height, {
        //   inversionAttempts: 'dontInvert',
        // })
        // if (code) {
        //   onScan(code.data)
        //   scanningRef.current = false
        //   return
        // }
      } catch (error) {
        console.error('QR scan error:', error)
      }

      // Continue scanning
      requestAnimationFrame(scanQRCode)
    }

    // Enhanced image processing to detect faint QR codes
    const enhanceImageForScanning = (imageData: ImageData) => {
      const data = imageData.data

      // Increase contrast and brightness to reveal faint codes
      const contrastFactor = 2.5
      const brightnessFactor = 50

      for (let i = 0; i < data.length; i += 4) {
        // Get RGB values
        let r = data[i]
        let g = data[i + 1]
        let b = data[i + 2]

        // Apply contrast
        r = ((r - 128) * contrastFactor) + 128
        g = ((g - 128) * contrastFactor) + 128
        b = ((b - 128) * contrastFactor) + 128

        // Apply brightness
        r += brightnessFactor
        g += brightnessFactor
        b += brightnessFactor

        // Clamp values
        data[i] = Math.max(0, Math.min(255, r))
        data[i + 1] = Math.max(0, Math.min(255, g))
        data[i + 2] = Math.max(0, Math.min(255, b))
      }
    }

    startScanner()

    return () => {
      scanningRef.current = false
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [onScan, onError])

  return (
    <div className={cn('relative w-full aspect-square rounded-lg overflow-hidden bg-black', className)}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Scanning overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Corner markers */}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-lg" />

        {/* Scanning line */}
        <motion.div
          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
          initial={{ top: '10%' }}
          animate={{ top: '90%' }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'linear'
          }}
        />
      </div>

      {/* Instructions */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white text-sm font-medium px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full mx-auto inline-block">
          Align QR code within frame
        </p>
      </div>
    </div>
  )
}
