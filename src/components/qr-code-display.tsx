import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { encryptQRCode } from '@/lib/qr-encryption'

interface QRCodeDisplayProps {
  data: string
  size?: number
  className?: string
  encrypt?: boolean
}

export function QRCodeDisplay({ data, size = 256, className, encrypt = true }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && data) {
      // Encrypt the data if enabled (default: true)
      const qrData = encrypt ? encryptQRCode(data) : data

      QRCode.toCanvas(canvasRef.current, qrData, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      }).catch((error) => {
        console.error('Error generating QR code:', error)
      })
    }
  }, [data, size, encrypt])

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
    />
  )
}
