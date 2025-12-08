/**
 * Groq Voice Services
 * Speech-to-Text (STT) and Text-to-Speech (TTS) using Groq API
 */

import { logger } from '@/lib/security-utils'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_STT_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions'
const GROQ_TTS_ENDPOINT = 'https://api.groq.com/openai/v1/audio/speech'

/**
 * Available Groq TTS voices (PlayAI voices)
 * See: https://console.groq.com/docs/text-to-speech
 */
export const GROQ_VOICES = [
  'Arista-PlayAI',
  'Atlas-PlayAI',
  'Basil-PlayAI',
  'Briggs-PlayAI',
  'Calum-PlayAI',
  'Celeste-PlayAI',
  'Cheyenne-PlayAI',
  'Chip-PlayAI',
  'Cillian-PlayAI',
  'Deedee-PlayAI',
  'Fritz-PlayAI',
  'Gail-PlayAI',
  'Indigo-PlayAI',
  'Mamaw-PlayAI',
  'Mason-PlayAI',
  'Mikail-PlayAI',
  'Mitch-PlayAI',
  'Quinn-PlayAI',
  'Thunder-PlayAI'
] as const

export type GroqVoice = typeof GROQ_VOICES[number]

// Voice aliases for compatibility (map old names to new PlayAI voices)
const VOICE_MAP: Record<string, GroqVoice> = {
  'nova': 'Celeste-PlayAI',
  'alloy': 'Fritz-PlayAI',
  'echo': 'Atlas-PlayAI',
  'fable': 'Quinn-PlayAI',
  'onyx': 'Thunder-PlayAI',
  'shimmer': 'Arista-PlayAI'
}

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
      logger.error('Groq STT error:', error)
      throw new Error(`Groq STT failed: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()
    return text.trim()
  } catch (error) {
    logger.error('Error in groqSpeechToText:', error)
    throw error
  }
}

/**
 * Text-to-Speech: Convert text to speech using Groq's TTS API
 * @param text The text to convert to speech
 * @param voice The voice to use (default: 'Celeste-PlayAI')
 * @returns Audio blob
 */
export async function groqTextToSpeech(
  text: string,
  voice: GroqVoice | string = 'Celeste-PlayAI'
): Promise<Blob> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured')
  }

  // Map old voice names to new PlayAI voices for compatibility
  const mappedVoice = VOICE_MAP[voice as string] || voice as GroqVoice

  try {
    const response = await fetch(GROQ_TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'playai-tts',
        input: text,
        voice: mappedVoice,
        response_format: 'mp3',
        speed: 1.0
      })
    })

    if (!response.ok) {
      const error = await response.text()
      logger.error('Groq TTS error:', error)
      throw new Error(`Groq TTS failed: ${response.status} ${response.statusText}`)
    }

    const audioBlob = await response.blob()
    return audioBlob
  } catch (error) {
    logger.error('Error in groqTextToSpeech:', error)
    throw error
  }
}

/**
 * Play audio from text using Groq TTS with browser fallback
 * @param text The text to speak
 * @param voice The voice to use (default: 'Celeste-PlayAI', also accepts old names like 'nova')
 */
export async function speakWithGroq(
  text: string,
  voice: GroqVoice | string = 'Celeste-PlayAI'
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
    logger.error('Groq TTS failed, falling back to browser speech:', error)
    // Fallback to browser's built-in speech synthesis (free, no API needed)
    return speakWithBrowser(text)
  }
}

/**
 * Browser-based TTS fallback using Web Speech API (free, no API needed)
 */
export function speakWithBrowser(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Browser does not support speech synthesis'))
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    // Try to find a nice voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v =>
      v.name.includes('Samantha') ||
      v.name.includes('Google') ||
      v.name.includes('Female') ||
      v.lang.startsWith('en')
    ) || voices[0]

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onend = () => resolve()
    utterance.onerror = (event) => reject(new Error(event.error))

    window.speechSynthesis.speak(utterance)
  })
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
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
 * Supports Voice Activity Detection (VAD) for automatic silence detection
 */
export class GroqAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private useNativeRecorder: boolean = false
  private nativeRecorder: any = null
  private nativeRecorderPromise: Promise<any> | null = null

  // Voice Activity Detection (VAD)
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private vadInterval: NodeJS.Timeout | null = null
  private silenceStart: number | null = null
  private hasSpoken: boolean = false
  private onSilenceDetected: (() => void) | null = null
  private silenceThreshold: number = 15 // Audio level below this is considered silence
  private silenceDuration: number = 3000 // 3 seconds of silence before auto-stop

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
        logger.info('[GroqAudioRecorder] Native voice recorder loaded successfully')
        return module.default
      }).catch(err => {
        console.warn('[GroqAudioRecorder] Failed to load native recorder, falling back to MediaRecorder:', err)
        this.useNativeRecorder = false
        return null
      })
    }
  }

  /**
   * Set callback for when silence is detected (user stopped speaking)
   */
  setOnSilenceDetected(callback: () => void): void {
    this.onSilenceDetected = callback
  }

  /**
   * Configure silence detection parameters
   */
  configureSilenceDetection(threshold: number = 15, durationMs: number = 3000): void {
    this.silenceThreshold = threshold
    this.silenceDuration = durationMs
  }

  /**
   * Start Voice Activity Detection to monitor audio levels
   */
  private startVAD(): void {
    if (!this.stream || !this.audioContext || !this.analyser) return

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.hasSpoken = false
    this.silenceStart = null

    // Check audio levels every 100ms
    this.vadInterval = setInterval(() => {
      if (!this.analyser) return

      this.analyser.getByteFrequencyData(dataArray)

      // Calculate average volume
      const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length

      if (average > this.silenceThreshold) {
        // User is speaking
        this.hasSpoken = true
        this.silenceStart = null
      } else if (this.hasSpoken) {
        // Silence detected after user spoke
        if (this.silenceStart === null) {
          this.silenceStart = Date.now()
        } else if (Date.now() - this.silenceStart >= this.silenceDuration) {
          // Silence duration exceeded - user finished speaking
          logger.info('[VAD] Silence detected for 3 seconds - user finished speaking')
          this.stopVAD()
          if (this.onSilenceDetected) {
            this.onSilenceDetected()
          }
        }
      }
    }, 100)
  }

  /**
   * Stop Voice Activity Detection
   */
  private stopVAD(): void {
    if (this.vadInterval) {
      clearInterval(this.vadInterval)
      this.vadInterval = null
    }
  }

  async startRecording(enableVAD: boolean = false): Promise<void> {
    if (this.useNativeRecorder) {
      try {
        // Wait for native recorder to load if not yet loaded
        if (!this.nativeRecorder && this.nativeRecorderPromise) {
          logger.info('Waiting for native recorder to load...')
          await this.nativeRecorderPromise
        }

        if (!this.nativeRecorder) {
          throw new Error('Native recorder not available')
        }

        // Check permission first
        logger.info('Checking microphone permission...')
        const { hasPermission } = await this.nativeRecorder.hasPermission()
        if (!hasPermission) {
          logger.info('Requesting microphone permission...')
          const { granted } = await this.nativeRecorder.requestPermission()
          if (!granted) {
            throw new Error('Microphone permission denied')
          }
        }

        logger.info('Starting native recording...')
        await this.nativeRecorder.startRecording()
        logger.info('Native recording started successfully!')
      } catch (error) {
        logger.error('Error starting native recording:', error)
        throw error
      }
    } else {
      // Fall back to MediaRecorder
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        // Set up AudioContext and Analyser for VAD if enabled
        if (enableVAD) {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          this.analyser = this.audioContext.createAnalyser()
          this.analyser.fftSize = 256
          this.analyser.smoothingTimeConstant = 0.8

          const source = this.audioContext.createMediaStreamSource(this.stream)
          source.connect(this.analyser)

          // Start VAD monitoring
          this.startVAD()
          logger.info('[VAD] Voice Activity Detection enabled - will auto-stop after 3s silence')
        }

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
        logger.error('Error starting recording:', error)
        throw error
      }
    }
  }

  async stopRecording(): Promise<Blob> {
    if (this.useNativeRecorder) {
      try {
        // Wait for native recorder to load if not yet loaded
        if (!this.nativeRecorder && this.nativeRecorderPromise) {
          logger.info('Waiting for native recorder to load before stopping...')
          await this.nativeRecorderPromise
        }

        if (!this.nativeRecorder) {
          throw new Error('Native recorder not available')
        }

        logger.info('Stopping native recording...')
        const result = await this.nativeRecorder.stopRecording()
        logger.info('Native recording stopped, duration:', result.duration)

        // Convert base64 to Blob
        const { base64ToBlob } = await import('./native-voice-recorder')
        const audioBlob = base64ToBlob(result.audioData, result.mimeType)

        logger.info('Audio blob created', { size: audioBlob.size, type: audioBlob.type })
        return audioBlob
      } catch (error) {
        logger.error('Error stopping native recording:', error)
        throw error
      }
    } else {
      // Fall back to MediaRecorder
      return new Promise((resolve, reject) => {
        if (!this.mediaRecorder) {
          reject(new Error('MediaRecorder not initialized'))
          return
        }

        // Stop VAD monitoring
        this.stopVAD()

        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })

          // Clean up stream
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop())
          }

          // Clean up audio context
          if (this.audioContext) {
            this.audioContext.close().catch(() => {})
            this.audioContext = null
            this.analyser = null
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

  /**
   * Check if user has started speaking
   */
  hasUserSpoken(): boolean {
    return this.hasSpoken
  }
}
