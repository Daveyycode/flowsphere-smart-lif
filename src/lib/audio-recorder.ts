/**
 * Mobile-friendly audio recording using Web Audio API
 * Works on iOS and Android where Web Speech API doesn't
 *
 * Supports multiple transcription backends:
 * - OpenAI Whisper (primary)
 * - Groq Whisper (fallback)
 */

import { logger } from '@/lib/security-utils'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

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
          sampleRate: 16000, // Lower sample rate for mobile
        },
      })

      // Create MediaRecorder with mobile-compatible codec
      const mimeType = this.getSupportedMimeType()
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      })

      this.audioChunks = []

      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(1000) // Collect data every second
      logger.info('Recording started with', mimeType, 'AudioRecorder')
    } catch (error) {
      logger.error('Failed to start recording:', error, 'AudioRecorder')
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
      'audio/wav',
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

export interface TranscriptionResult {
  text: string
  detectedLanguage: string
}

// Language code to name mapping for Whisper
const WHISPER_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  es: 'Spanish',
  hi: 'Hindi',
  ar: 'Arabic',
  bn: 'Bengali',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  de: 'German',
  fr: 'French',
  it: 'Italian',
  ko: 'Korean',
  tr: 'Turkish',
  vi: 'Vietnamese',
  ta: 'Tamil',
  ur: 'Urdu',
  te: 'Telugu',
  mr: 'Marathi',
  nl: 'Dutch',
  pl: 'Polish',
  uk: 'Ukrainian',
  ro: 'Romanian',
  el: 'Greek',
  cs: 'Czech',
  sv: 'Swedish',
  hu: 'Hungarian',
  da: 'Danish',
  fi: 'Finnish',
  no: 'Norwegian',
  th: 'Thai',
  id: 'Indonesian',
  ms: 'Malay',
  tl: 'Filipino/Tagalog',
  he: 'Hebrew',
  fa: 'Persian/Farsi',
  pa: 'Punjabi',
  sw: 'Swahili',
  af: 'Afrikaans',
  ca: 'Catalan',
  cy: 'Welsh',
  ga: 'Irish',
  eu: 'Basque',
  gl: 'Galician',
  hr: 'Croatian',
  sk: 'Slovak',
  sl: 'Slovenian',
  sr: 'Serbian',
  bg: 'Bulgarian',
  lt: 'Lithuanian',
  lv: 'Latvian',
  et: 'Estonian',
  mt: 'Maltese',
  sq: 'Albanian',
  mk: 'Macedonian',
  bs: 'Bosnian',
  is: 'Icelandic',
  ne: 'Nepali',
  si: 'Sinhala',
  kn: 'Kannada',
  ml: 'Malayalam',
  gu: 'Gujarati',
  as: 'Assamese',
  lo: 'Lao',
  my: 'Burmese',
  km: 'Khmer',
  mn: 'Mongolian',
  hy: 'Armenian',
  ka: 'Georgian',
  az: 'Azerbaijani',
  kk: 'Kazakh',
  uz: 'Uzbek',
  yo: 'Yoruba',
  ha: 'Hausa',
  am: 'Amharic',
  so: 'Somali',
  yi: 'Yiddish',
  la: 'Latin',
  eo: 'Esperanto',
  jw: 'Javanese',
  su: 'Sundanese',
  mi: 'Maori',
  haw: 'Hawaiian',
  ceb: 'Cebuano',
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeWithOpenAI(
  audioBlob: Blob,
  targetLanguage?: string
): Promise<TranscriptionResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type })
  const formData = new FormData()
  formData.append('file', audioFile)
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'verbose_json')

  if (targetLanguage && targetLanguage !== 'auto') {
    formData.append('language', targetLanguage)
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `OpenAI Whisper error: ${response.status}`)
  }

  const data = await response.json()
  const detectedCode = data.language || 'en'
  const detectedLanguage = WHISPER_LANGUAGE_NAMES[detectedCode] || detectedCode

  return {
    text: data.text,
    detectedLanguage,
  }
}

/**
 * Transcribe audio using Groq Whisper API (fallback)
 * Groq uses whisper-large-v3-turbo model for fast, accurate transcription
 */
async function transcribeWithGroq(
  audioBlob: Blob,
  targetLanguage?: string
): Promise<TranscriptionResult> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured')
  }

  const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type })
  const formData = new FormData()
  formData.append('file', audioFile)
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('response_format', 'verbose_json')

  if (targetLanguage && targetLanguage !== 'auto') {
    formData.append('language', targetLanguage)
  }

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Groq Whisper error: ${response.status}`)
  }

  const data = await response.json()
  const detectedCode = data.language || 'en'
  const detectedLanguage = WHISPER_LANGUAGE_NAMES[detectedCode] || detectedCode

  return {
    text: data.text,
    detectedLanguage,
  }
}

/**
 * Transcribe audio with automatic fallback
 * Primary: OpenAI Whisper
 * Fallback: Groq Whisper
 *
 * This ensures transcription works even if one service is unavailable
 */
export async function transcribeAudio(
  audioBlob: Blob,
  targetLanguage?: string
): Promise<TranscriptionResult> {
  // Try OpenAI Whisper first (if configured)
  if (OPENAI_API_KEY) {
    try {
      logger.info('Attempting transcription with OpenAI Whisper', {}, 'AudioRecorder')
      return await transcribeWithOpenAI(audioBlob, targetLanguage)
    } catch (error) {
      logger.error('OpenAI Whisper failed, trying Groq fallback:', error, 'AudioRecorder')
      // Fall through to Groq
    }
  }

  // Try Groq Whisper as fallback
  if (GROQ_API_KEY) {
    try {
      logger.info('Attempting transcription with Groq Whisper', {}, 'AudioRecorder')
      return await transcribeWithGroq(audioBlob, targetLanguage)
    } catch (error) {
      logger.error('Groq Whisper failed:', error, 'AudioRecorder')
      throw error
    }
  }

  // No API keys configured
  throw new Error(
    'No transcription service configured. Please add VITE_OPENAI_API_KEY or VITE_GROQ_API_KEY to your .env file'
  )
}

/**
 * Check if device supports audio recording
 */
export function supportsAudioRecording(): boolean {
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  )
}

/**
 * Check if device supports Web Speech API (desktop browsers)
 */
export function supportsSpeechRecognition(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}

/**
 * Check if any transcription service is configured (OpenAI or Groq)
 */
export function isTranscriptionAvailable(): boolean {
  return !!(OPENAI_API_KEY || GROQ_API_KEY)
}

/**
 * Get the name of the configured transcription service
 */
export function getTranscriptionService(): string {
  if (OPENAI_API_KEY) return 'OpenAI Whisper'
  if (GROQ_API_KEY) return 'Groq Whisper'
  return 'None'
}
