/**
 * Groq Voice Services
 * Speech-to-Text (STT) and Text-to-Speech (TTS) using Groq API
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_STT_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions'
const GROQ_TTS_ENDPOINT = 'https://api.groq.com/openai/v1/audio/speech'

/**
 * Available Groq TTS voices
 */
export const GROQ_VOICES = [
  'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
] as const

export type GroqVoice = typeof GROQ_VOICES[number]

/**
 * Speech-to-Text: Transcribe audio using Groq's Whisper API
 * @param audioBlob The audio blob to transcribe
 * @param language Optional language code (e.g., 'en', 'es')
 * @returns Transcribed text
 */
export async function groqSpeechToText(
  audioBlob: Blob,
  language?: string
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured')
  }

  try {
    // Determine filename based on mime type
    const filename = audioBlob.type.includes('m4a') || audioBlob.type.includes('mp4')
      ? 'audio.m4a'
      : 'audio.webm'

    const formData = new FormData()
    formData.append('file', audioBlob, filename)
    formData.append('model', 'whisper-large-v3-turbo')

    if (language) {
      formData.append('language', language)
    }

    // Set response format to get just the text
    formData.append('response_format', 'text')

    const response = await fetch(GROQ_STT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Groq STT error:', error)
      throw new Error(`Groq STT failed: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()
    return text.trim()
  } catch (error) {
    console.error('Error in groqSpeechToText:', error)
    throw error
  }
}

/**
 * Text-to-Speech: Convert text to speech using Groq's TTS API
 * @param text The text to convert to speech
 * @param voice The voice to use (default: 'nova')
 * @returns Audio blob
 */
export async function groqTextToSpeech(
  text: string,
  voice: GroqVoice = 'nova'
): Promise<Blob> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured')
  }

  try {
    const response = await fetch(GROQ_TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'playai-dialog',
        input: text,
        voice: voice,
        response_format: 'mp3',
        speed: 1.0
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Groq TTS error:', error)
      throw new Error(`Groq TTS failed: ${response.status} ${response.statusText}`)
    }

    const audioBlob = await response.blob()
    return audioBlob
  } catch (error) {
    console.error('Error in groqTextToSpeech:', error)
    throw error
  }
}

/**
 * Play audio from text using Groq TTS
 * @param text The text to speak
 * @param voice The voice to use
 */
export async function speakWithGroq(
  text: string,
  voice: GroqVoice = 'nova'
): Promise<void> {
  try {
    const audioBlob = await groqTextToSpeech(text, voice)
    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        resolve()
      }
      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl)
        reject(error)
      }
      audio.play().catch(reject)
    })
  } catch (error) {
    console.error('Error in speakWithGroq:', error)
    throw error
  }
}

/**
 * Check if device supports audio recording
 */
export function supportsAudioRecording(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

/**
 * Check if running on iOS
 */
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

/**
 * AudioRecorder class for recording audio on mobile/desktop
 * Uses native iOS plugin on iOS devices, MediaRecorder on others
 */
export class GroqAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private useNativeRecorder: boolean = false
  private nativeRecorder: any = null
  private nativeRecorderPromise: Promise<any> | null = null

  constructor() {
    // iOS voice DISABLED - desktop/web only for now
    this.useNativeRecorder = false // Disabled: isIOS()

    if (this.useNativeRecorder) {
      // Load native recorder immediately
      this.nativeRecorderPromise = import('./native-voice-recorder').then(module => {
        if (!module.default) {
          console.warn('[GroqAudioRecorder] Native plugin not available, using MediaRecorder')
          this.useNativeRecorder = false
          return null
        }
        this.nativeRecorder = module.default
        console.log('[GroqAudioRecorder] Native voice recorder loaded successfully')
        return module.default
      }).catch(err => {
        console.warn('[GroqAudioRecorder] Failed to load native recorder, falling back to MediaRecorder:', err)
        this.useNativeRecorder = false
        return null
      })
    }
  }

  async startRecording(): Promise<void> {
    if (this.useNativeRecorder) {
      try {
        // Wait for native recorder to load if not yet loaded
        if (!this.nativeRecorder && this.nativeRecorderPromise) {
          console.log('Waiting for native recorder to load...')
          await this.nativeRecorderPromise
        }

        if (!this.nativeRecorder) {
          throw new Error('Native recorder not available')
        }

        // Check permission first
        console.log('Checking microphone permission...')
        const { hasPermission } = await this.nativeRecorder.hasPermission()
        if (!hasPermission) {
          console.log('Requesting microphone permission...')
          const { granted } = await this.nativeRecorder.requestPermission()
          if (!granted) {
            throw new Error('Microphone permission denied')
          }
        }

        console.log('Starting native recording...')
        await this.nativeRecorder.startRecording()
        console.log('Native recording started successfully!')
      } catch (error) {
        console.error('Error starting native recording:', error)
        throw error
      }
    } else {
      // Fall back to MediaRecorder
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        // Try different MIME types for compatibility
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4'
        ]

        let mimeType = mimeTypes[0]
        for (const type of mimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type
            break
          }
        }

        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType })
        this.audioChunks = []

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data)
          }
        }

        this.mediaRecorder.start()
      } catch (error) {
        console.error('Error starting recording:', error)
        throw error
      }
    }
  }

  async stopRecording(): Promise<Blob> {
    if (this.useNativeRecorder) {
      try {
        // Wait for native recorder to load if not yet loaded
        if (!this.nativeRecorder && this.nativeRecorderPromise) {
          console.log('Waiting for native recorder to load before stopping...')
          await this.nativeRecorderPromise
        }

        if (!this.nativeRecorder) {
          throw new Error('Native recorder not available')
        }

        console.log('Stopping native recording...')
        const result = await this.nativeRecorder.stopRecording()
        console.log('Native recording stopped, duration:', result.duration)

        // Convert base64 to Blob
        const { base64ToBlob } = await import('./native-voice-recorder')
        const audioBlob = base64ToBlob(result.audioData, result.mimeType)

        console.log('Audio blob created, size:', audioBlob.size, 'type:', audioBlob.type)
        return audioBlob
      } catch (error) {
        console.error('Error stopping native recording:', error)
        throw error
      }
    } else {
      // Fall back to MediaRecorder
      return new Promise((resolve, reject) => {
        if (!this.mediaRecorder) {
          reject(new Error('MediaRecorder not initialized'))
          return
        }

        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })

          // Clean up
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop())
          }

          resolve(audioBlob)
        }

        this.mediaRecorder.stop()
      })
    }
  }

  isRecording(): boolean {
    if (this.useNativeRecorder && this.nativeRecorder) {
      // For native recorder, we'll assume it's recording if start was called
      // We could add a state variable to track this more accurately
      return true // This is a simplified check
    }
    return this.mediaRecorder?.state === 'recording'
  }
}
