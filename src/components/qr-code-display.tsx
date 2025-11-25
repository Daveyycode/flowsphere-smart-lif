import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  data: string
  size?: number
  className?: string
}

export function QRCodeDisplay({ data, size = 256, className }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && data) {
      QRCode.toCanvas(canvasRef.current, data, {
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
  }, [data, size])

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
    />
  )
}
