/**
 * Mobile-friendly audio recording using Web Audio API
 * Works on iOS and Android where Web Speech API doesn't
 */

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null

  async startRecording(): Promise<void> {
    try {
      // Request microphone access with mobile-friendly settings
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Lower sample rate for mobile
        }
      })

      // Create MediaRecorder with mobile-compatible codec
      const mimeType = this.getSupportedMimeType()
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000
      })

      this.audioChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(1000) // Collect data every second
      console.log('Recording started with', mimeType)
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw new Error('Microphone access denied or not available')
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm'
        const audioBlob = new Blob(this.audioChunks, { type: mimeType })

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop())
        }

        resolve(audioBlob)
      }

      this.mediaRecorder.stop()
    })
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  private getSupportedMimeType(): string {
    // Check supported MIME types in order of preference
    const types = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    // Fallback
    return 'audio/webm'
  }
}

/**
 * Convert audio blob to base64 for API transmission
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1])
      } else {
        reject(new Error('Failed to convert blob'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Transcribe audio using OpenAI Whisper API
 * This works when Web Speech API doesn't!
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env file')
  }

  // Convert blob to File object (Whisper API requires multipart/form-data)
  const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type })

  const formData = new FormData()
  formData.append('file', audioFile)
  formData.append('model', 'whisper-1')
  formData.append('language', 'en') // Auto-detect if not specified

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Transcription failed')
    }

    const data = await response.json()
    return data.text
  } catch (error) {
    console.error('Transcription error:', error)
    throw error
  }
}

/**
 * Check if device supports audio recording
 */
export function supportsAudioRecording(): boolean {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  )
}

/**
 * Check if device supports Web Speech API (desktop browsers)
 */
export function supportsSpeechRecognition(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}
