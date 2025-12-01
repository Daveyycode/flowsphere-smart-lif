import { registerPlugin, Capacitor } from '@capacitor/core'

export interface VoiceRecorderPlugin {
  startRecording(): Promise<{ status: string; message: string }>
  stopRecording(): Promise<{
    status: string
    audioData: string // base64 encoded audio
    mimeType: string
    duration: number
  }>
  isRecording(): Promise<{ isRecording: boolean }>
  hasPermission(): Promise<{ hasPermission: boolean }>
  requestPermission(): Promise<{ granted: boolean }>
}

let VoiceRecorder: VoiceRecorderPlugin | null = null

try {
  VoiceRecorder = registerPlugin<VoiceRecorderPlugin>('VoiceRecorder')
  console.log('[VoiceRecorder] Plugin registered successfully')
  console.log('[VoiceRecorder] Platform:', Capacitor.getPlatform())
  console.log('[VoiceRecorder] isNativePlatform:', Capacitor.isNativePlatform())
} catch (error) {
  console.error('[VoiceRecorder] Failed to register plugin:', error)
}

export default VoiceRecorder

// Helper function to convert base64 to Blob
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }

  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}
