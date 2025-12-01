import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Microphone, Stop, Trash, Copy, Download, Check, X, CaretDown, Envelope, ShareNetwork, PencilSimple, Translate } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { AudioRecorder, transcribeAudio, supportsSpeechRecognition, supportsAudioRecording } from '@/lib/audio-recorder'
import { groqChat, isGroqConfigured } from '@/lib/groq-ai'

interface MeetingNote {
  id: string
  title: string
  date: string
  transcript: string
  detectedLanguage: string
  duration: string
  summary?: string
  scripts?: {
    formal: string
    casual: string
    report: string
    meeting: string
  }
}

const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  // Major World Languages
  { code: 'en', name: 'English' }, { code: 'zh', name: 'Chinese (Mandarin)' }, { code: 'es', name: 'Spanish' },
  { code: 'hi', name: 'Hindi' }, { code: 'ar', name: 'Arabic' }, { code: 'bn', name: 'Bengali' },
  { code: 'pt', name: 'Portuguese' }, { code: 'ru', name: 'Russian' }, { code: 'ja', name: 'Japanese' },
  { code: 'pa', name: 'Punjabi' }, { code: 'de', name: 'German' }, { code: 'jv', name: 'Javanese' },
  // European Languages
  { code: 'fr', name: 'French' }, { code: 'it', name: 'Italian' }, { code: 'tr', name: 'Turkish' },
  { code: 'ko', name: 'Korean' }, { code: 'vi', name: 'Vietnamese' }, { code: 'ta', name: 'Tamil' },
  { code: 'ur', name: 'Urdu' }, { code: 'te', name: 'Telugu' }, { code: 'mr', name: 'Marathi' },
  { code: 'fa', name: 'Persian/Farsi' }, { code: 'nl', name: 'Dutch' }, { code: 'pl', name: 'Polish' },
  { code: 'uk', name: 'Ukrainian' }, { code: 'ro', name: 'Romanian' }, { code: 'el', name: 'Greek' },
  { code: 'cs', name: 'Czech' }, { code: 'sv', name: 'Swedish' }, { code: 'hu', name: 'Hungarian' },
  { code: 'da', name: 'Danish' }, { code: 'fi', name: 'Finnish' }, { code: 'no', name: 'Norwegian' },
  { code: 'sk', name: 'Slovak' }, { code: 'bg', name: 'Bulgarian' }, { code: 'hr', name: 'Croatian' },
  { code: 'sr', name: 'Serbian' }, { code: 'lt', name: 'Lithuanian' }, { code: 'lv', name: 'Latvian' },
  { code: 'et', name: 'Estonian' }, { code: 'sl', name: 'Slovenian' }, { code: 'is', name: 'Icelandic' },
  // Asian & Southeast Asian
  { code: 'th', name: 'Thai' }, { code: 'id', name: 'Indonesian' }, { code: 'ms', name: 'Malay' },
  { code: 'tl', name: 'Filipino/Tagalog' }, { code: 'km', name: 'Khmer/Cambodian' },
  { code: 'lo', name: 'Lao' }, { code: 'my', name: 'Burmese' }, { code: 'ne', name: 'Nepali' },
  { code: 'si', name: 'Sinhala' }, { code: 'kn', name: 'Kannada' }, { code: 'ml', name: 'Malayalam' },
  { code: 'gu', name: 'Gujarati' }, { code: 'or', name: 'Odia' }, { code: 'as', name: 'Assamese' },
  // Middle Eastern & African
  { code: 'he', name: 'Hebrew' }, { code: 'am', name: 'Amharic' }, { code: 'ti', name: 'Tigrinya' },
  { code: 'so', name: 'Somali' }, { code: 'sw', name: 'Swahili' }, { code: 'yo', name: 'Yoruba' },
  { code: 'ig', name: 'Igbo' }, { code: 'ha', name: 'Hausa' }, { code: 'zu', name: 'Zulu' },
  { code: 'xh', name: 'Xhosa' }, { code: 'af', name: 'Afrikaans' },
  // Central & South Asian
  { code: 'ps', name: 'Pashto' }, { code: 'sd', name: 'Sindhi' }, { code: 'ug', name: 'Uyghur' },
  { code: 'uz', name: 'Uzbek' }, { code: 'kk', name: 'Kazakh' }, { code: 'ky', name: 'Kyrgyz' },
  { code: 'tg', name: 'Tajik' }, { code: 'tk', name: 'Turkmen' }, { code: 'az', name: 'Azerbaijani' },
  { code: 'hy', name: 'Armenian' }, { code: 'ka', name: 'Georgian' },
  // East Asian
  { code: 'yue', name: 'Cantonese' }, { code: 'mn', name: 'Mongolian' }, { code: 'bo', name: 'Tibetan' },
  // Americas
  { code: 'qu', name: 'Quechua' }, { code: 'gn', name: 'Guarani' }, { code: 'ay', name: 'Aymara' },
  // European Regional
  { code: 'ca', name: 'Catalan' }, { code: 'gl', name: 'Galician' }, { code: 'eu', name: 'Basque' },
  { code: 'cy', name: 'Welsh' }, { code: 'ga', name: 'Irish' }, { code: 'gd', name: 'Scottish Gaelic' },
  { code: 'mt', name: 'Maltese' }, { code: 'sq', name: 'Albanian' }, { code: 'mk', name: 'Macedonian' },
  { code: 'bs', name: 'Bosnian' }, { code: 'be', name: 'Belarusian' },
  // Pacific & Others
  { code: 'mi', name: 'Maori' }, { code: 'sm', name: 'Samoan' }, { code: 'to', name: 'Tongan' },
  { code: 'haw', name: 'Hawaiian' }, { code: 'fj', name: 'Fijian' },
  // Additional Languages
  { code: 'la', name: 'Latin' }, { code: 'eo', name: 'Esperanto' }, { code: 'jw', name: 'Javanese (Alt)' },
  { code: 'su', name: 'Sundanese' }, { code: 'ceb', name: 'Cebuano' }, { code: 'hmn', name: 'Hmong' },
  { code: 'ku', name: 'Kurdish' }, { code: 'lb', name: 'Luxembourgish' }, { code: 'yi', name: 'Yiddish' },
]

export function MeetingNotes() {
  const [savedNotes, setSavedNotes] = useKV<MeetingNote[]>('flowsphere-meeting-notes', [])
  const [isRecording, setIsRecording] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [targetLanguage, setTargetLanguage] = useKV<string>('flowsphere-meeting-language', 'auto')
  const [detectedLanguage, setDetectedLanguage] = useState('en')
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [generatingSummary, setGeneratingSummary] = useState<string | null>(null)
  const [generatingScripts, setGeneratingScripts] = useState<string | null>(null)
  const [selectedScript, setSelectedScript] = useState<{noteId: string, type: 'formal' | 'casual' | 'report' | 'meeting'} | null>(null)
  const [selectedView, setSelectedView] = useState<{noteId: string, view: 'summary' | 'formats'} | null>(null)
  const [translationLanguage, setTranslationLanguage] = useState<{noteId: string, language: string}>({noteId: '', language: 'original'})
  const [translatedSummaries, setTranslatedSummaries] = useState<{[key: string]: {[lang: string]: string}}>({})
  const [translatingLanguage, setTranslatingLanguage] = useState<string | null>(null)
  const [translatedScripts, setTranslatedScripts] = useState<{[key: string]: {[scriptType: string]: {[lang: string]: string}}}>({})
  const [editingContent, setEditingContent] = useState<{noteId: string, type: 'summary' | 'script', scriptType?: string} | null>(null)
  const [editInstructions, setEditInstructions] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailData, setEmailData] = useState<{script: string, type: string, note: MeetingNote | null}>({script: '', type: '', note: null})
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  const recognitionRef = useRef<any>(null)
  const interimTranscriptRef = useRef('')
  const lastResultIndexRef = useRef(0)
  const audioRecorderRef = useRef<AudioRecorder | null>(null)
  const [useMobileRecording, setUseMobileRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  useEffect(() => {
    // Check if device supports Web Speech API or needs mobile fallback
    const hasSpeechRecognition = supportsSpeechRecognition()
    const hasAudioRecording = supportsAudioRecording()

    if (!hasSpeechRecognition && hasAudioRecording) {
      // Mobile device - use Web Audio API + Whisper
      setUseMobileRecording(true)
      audioRecorderRef.current = new AudioRecorder()
      console.log('Using mobile recording (Web Audio + Whisper)')
      return
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.maxAlternatives = 3  // Better accuracy with multiple alternatives

      if (targetLanguage !== 'auto') {
        recognitionRef.current.lang = targetLanguage
      } else {
        recognitionRef.current.lang = 'en-US'  // Default to English if auto
      }

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        // Only process results we haven't seen before
        const startIndex = Math.max(event.resultIndex, lastResultIndexRef.current)

        for (let i = startIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
            lastResultIndexRef.current = i + 1  // Update to next unprocessed index
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          setCurrentTranscript(prev => prev + finalTranscript)
        }
        interimTranscriptRef.current = interimTranscript
      }

      recognitionRef.current.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error)

        // Don't stop recording for recoverable errors
        if (event.error === 'no-speech') {
          // No speech detected, but continue recording
          console.log('No speech yet, continuing...')
          return
        }

        if (event.error === 'aborted') {
          // User stopped or browser aborted, normal behavior
          return
        }

        if (event.error === 'audio-capture') {
          toast.error('⚠️ Microphone not detected. Please:\n• Connect a microphone\n• Enable microphone in Settings\n• Reload the page')
          stopRecording()
        } else if (event.error === 'not-allowed') {
          toast.error('⚠️ Microphone access blocked. Please:\n• Tap Safari settings (AA icon)\n• Enable Microphone permissions\n• Reload the page')
          stopRecording()
        } else if (event.error === 'network') {
          // Network error, show warning but continue
          toast.warning('⚠️ Network issue detected. Speech recognition may be affected.')
          console.log('Network error, continuing...')
        } else {
          console.error('Speech recognition error:', event.error)
          // Try to continue for other errors
        }
      }

      recognitionRef.current.onend = () => {
        if (isRecording) {
          // Automatically restart to keep recording continuous (500ms delay to prevent echo loops)
          setTimeout(() => {
            if (isRecording && recognitionRef.current) {
              try {
                recognitionRef.current.start()
              } catch (e) {
                console.log('Could not restart recognition:', e)
              }
            }
          }, 500)
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [targetLanguage])

  const startRecording = async () => {
    setCurrentTranscript('')
    setRecordingStartTime(Date.now())
    setIsRecording(true)

    // Use mobile recording if Web Speech API not available
    if (useMobileRecording && audioRecorderRef.current) {
      try {
        await audioRecorderRef.current.startRecording()
        toast.success('🎤 Recording started - speak now!')
      } catch (error) {
        console.error('Mobile recording error:', error)
        setIsRecording(false)
        toast.error('⚠️ Microphone access denied. Please enable microphone permissions in your browser settings.')
      }
      return
    }

    // Use Web Speech API for desktop
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not supported in your browser')
      return
    }

    // Check microphone permission first with echo cancellation and noise suppression
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      // Stop the stream immediately - we just needed to check permission
      stream.getTracks().forEach(track => track.stop())

      interimTranscriptRef.current = ''
      lastResultIndexRef.current = 0  // Reset result index for new recording

      try {
        recognitionRef.current.start()
        toast.success('🎤 Recording started - speak now!')
      } catch (error) {
        console.error('Failed to start recognition:', error)
        setIsRecording(false)
        toast.error('Failed to start recording. Please try again.')
      }
    } catch (error) {
      console.error('Microphone permission error:', error)
      setIsRecording(false)
      toast.error('⚠️ Microphone access denied. Please enable microphone permissions in your browser settings.')
      return
    }
  }

  const stopRecording = async () => {
    setIsRecording(false)

    // Handle mobile recording (Web Audio + Whisper)
    if (useMobileRecording && audioRecorderRef.current?.isRecording()) {
      try {
        setIsTranscribing(true)
        toast.info('⏳ Processing audio... This may take a moment.')

        const audioBlob = await audioRecorderRef.current.stopRecording()
        const transcript = await transcribeAudio(audioBlob)

        if (transcript.trim()) {
          const duration = recordingStartTime
            ? Math.floor((Date.now() - recordingStartTime) / 1000)
            : 0

          const minutes = Math.floor(duration / 60)
          const seconds = duration % 60
          const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

          const newNote: MeetingNote = {
            id: Date.now().toString(),
            title: `Meeting ${new Date().toLocaleDateString()}`,
            date: new Date().toLocaleString(),
            transcript: transcript,
            detectedLanguage: 'English',
            duration: durationStr
          }

          setSavedNotes(prev => [newNote, ...(prev || [])])
          toast.success('✅ Meeting note saved!')
          setCurrentTranscript('')
          setRecordingStartTime(null)
        } else {
          toast.error('No speech detected in recording')
          setCurrentTranscript('')
          setRecordingStartTime(null)
        }
      } catch (error: any) {
        console.error('Transcription error:', error)
        if (error.message?.includes('API key')) {
          toast.error('⚠️ OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to enable mobile recording.')
        } else {
          toast.error('Failed to transcribe audio. Please try again.')
        }
        setCurrentTranscript('')
        setRecordingStartTime(null)
      } finally {
        setIsTranscribing(false)
      }
      return
    }

    // Handle desktop recording (Web Speech API)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    // Include interim transcript if available
    const finalTranscript = currentTranscript.trim() || interimTranscriptRef.current.trim()

    if (finalTranscript) {
      const duration = recordingStartTime
        ? Math.floor((Date.now() - recordingStartTime) / 1000)
        : 0

      const minutes = Math.floor(duration / 60)
      const seconds = duration % 60
      const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

      const newNote: MeetingNote = {
        id: Date.now().toString(),
        title: `Meeting ${new Date().toLocaleDateString()}`,
        date: new Date().toLocaleString(),
        transcript: finalTranscript,
        detectedLanguage: targetLanguage === 'auto' ? 'English' : SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name || 'English',
        duration: durationStr
      }

      setSavedNotes(prev => [newNote, ...(prev || [])])
      toast.success('✅ Meeting note saved!')
      setCurrentTranscript('')
      interimTranscriptRef.current = ''
      setRecordingStartTime(null)
    } else {
      // Check how long the recording was
      const duration = recordingStartTime ? Math.floor((Date.now() - recordingStartTime) / 1000) : 0

      if (duration < 2) {
        // Very short recording - likely user error
        toast.info('💡 Speak for at least 2 seconds before stopping')
      } else {
        // Longer recording with no speech - might be a real issue
        toast.error('⚠️ No speech detected. Please check:\n• Microphone permissions are enabled\n• You spoke clearly near the microphone\n• Browser supports speech recognition')
      }
      setCurrentTranscript('')
      interimTranscriptRef.current = ''
      setRecordingStartTime(null)
    }
  }

  const deleteNote = (id: string) => {
    setSavedNotes(prev => (prev || []).filter(note => note.id !== id))
    toast.success('Note deleted')
  }

  const copyTranscript = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const downloadNote = (note: MeetingNote) => {
    const content = `Meeting Note: ${note.title}\nDate: ${note.date}\nDuration: ${note.duration}\nLanguage: ${note.detectedLanguage}\n\n--- TRANSCRIPT ---\n${note.transcript}\n\n${note.summary ? `--- SUMMARY ---\n${note.summary}` : ''}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meeting-note-${note.date.replace(/[/:, ]/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Note downloaded')
  }

  const toggleNoteExpansion = (id: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const generateSummary = async (noteId: string) => {
    const note = (savedNotes || []).find(n => n.id === noteId)
    if (!note) return

    // Check if Groq AI is configured
    if (!isGroqConfigured()) {
      toast.error('AI service not configured. Please add your Groq API key in settings.')
      return
    }

    setGeneratingSummary(noteId)
    try {
      const promptText = `You are a meeting summarization assistant. Read this meeting transcript and provide a clear, concise summary in bullet points covering:
- Key discussion points
- Decisions made
- Action items
- Important deadlines or dates mentioned

Transcript:
${note.transcript}

Provide only the summary in markdown format with bullet points. Keep it concise but comprehensive.`

      let summary: string

      try {
        summary = await groqChat(promptText, { max_tokens: 1024 })
      } catch (apiError: any) {
        // Fallback for any API error
        console.log('AI API error, using fallback summary:', apiError)
        // Fallback: Generate a basic summary from the transcript
        const words = note.transcript.trim().split(/\s+/)
        const wordCount = words.length
        const estimatedMinutes = Math.ceil(wordCount / 150) // Average speaking rate

        summary = `**AI Summary Generation Note**: Unable to generate AI summary at this time.\n\n**Meeting Overview:**\n- Duration: ~${estimatedMinutes} minute${estimatedMinutes > 1 ? 's' : ''} (${wordCount} words)\n- Language: ${note.detectedLanguage}\n- Date: ${note.date}\n\n**Quick Summary:**\n${note.transcript.slice(0, 200)}${note.transcript.length > 200 ? '...' : ''}\n\n**To enable full AI summaries:** Ensure your Groq API key is configured in settings.`

        toast.info('Generated basic summary (AI service unavailable)')
      }

      if (!summary) {
        throw new Error('No summary returned from AI')
      }

      setSavedNotes(prev =>
        (prev || []).map(n =>
          n.id === noteId ? { ...n, summary } : n
        )
      )
      toast.success('Summary generated')
    } catch (error) {
      console.error('Summary generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to generate summary: ${errorMessage}`)
    } finally {
      setGeneratingSummary(null)
    }
  }

  const translateScript = async (noteId: string, scriptType: 'formal' | 'casual' | 'report' | 'meeting', targetLang: string) => {
    const note = (savedNotes || []).find(n => n.id === noteId)
    if (!note || !note.scripts) return

    if (translatedScripts[noteId]?.[scriptType]?.[targetLang]) {
      return
    }

    if (!isGroqConfigured()) {
      toast.error('AI service not configured')
      return
    }

    setTranslatingLanguage(`${noteId}-${scriptType}-${targetLang}`)
    try {
      const languageName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
      const scriptContent = note.scripts[scriptType]

      const promptText = `Translate this ${scriptType} transcript to ${languageName}. Keep formatting intact.

Original:
${scriptContent}

Provide ONLY the translated version.`

      let translatedText: string

      try {
        translatedText = await groqChat(promptText, { max_tokens: 2048 })
      } catch (apiError: any) {
        console.log('Translation error:', apiError)
        translatedText = `**Translation unavailable**\n\n**Original (${note.detectedLanguage}):**\n${scriptContent}`
        toast.info('Translation service unavailable')
      }

      setTranslatedScripts(prev => ({
        ...prev,
        [noteId]: {
          ...(prev[noteId] || {}),
          [scriptType]: {
            ...(prev[noteId]?.[scriptType] || {}),
            [targetLang]: translatedText
          }
        }
      }))

      toast.success(`Translated to ${languageName}!`)
    } catch (error) {
      console.error('Translation error:', error)
      toast.error('Translation failed')
    } finally {
      setTranslatingLanguage(null)
    }
  }

  const editContent = async (noteId: string, type: 'summary' | 'script', instructions: string, scriptType?: 'formal' | 'casual' | 'report' | 'meeting') => {
    const note = (savedNotes || []).find(n => n.id === noteId)
    if (!note) return

    if (!isGroqConfigured()) {
      toast.error('AI service is not available')
      return
    }

    setIsEditing(true)
    try {
      let originalContent = ''
      if (type === 'summary') {
        originalContent = note.summary || ''
      } else if (type === 'script' && scriptType && note.scripts) {
        originalContent = note.scripts[scriptType]
      }

      const promptText = `Edit this ${type} based on these instructions: "${instructions}"

Original ${type}:
${originalContent}

Provide the edited version. Keep the same format/structure.`

      let editedContent: string

      try {
        editedContent = await groqChat(promptText, { max_tokens: 2048 })
      } catch (apiError: any) {
        if (apiError?.message?.includes('401') || apiError?.message?.includes('Unauthorized')) {
          toast.error('AI editing requires authentication')
          return
        } else {
          throw apiError
        }
      }

      // Update the content
      if (type === 'summary') {
        setSavedNotes(prev =>
          (prev || []).map(n =>
            n.id === noteId ? { ...n, summary: editedContent } : n
          )
        )
      } else if (type === 'script' && scriptType && note.scripts) {
        setSavedNotes(prev =>
          (prev || []).map(n =>
            n.id === noteId ? {
              ...n,
              scripts: {
                ...n.scripts!,
                [scriptType]: editedContent
              }
            } : n
          )
        )
      }

      toast.success('Content edited!')
      setEditingContent(null)
      setEditInstructions('')
    } catch (error) {
      console.error('Edit error:', error)
      toast.error('Edit failed')
    } finally {
      setIsEditing(false)
    }
  }

  const translateSummary = async (noteId: string, targetLang: string) => {
    const note = (savedNotes || []).find(n => n.id === noteId)
    if (!note || !note.summary) return

    // Check if already translated
    if (translatedSummaries[noteId]?.[targetLang]) {
      return
    }

    // Check if API is available
    if (!isGroqConfigured()) {
      toast.error('AI service is not available. Please refresh the page.')
      return
    }

    setTranslatingLanguage(`${noteId}-${targetLang}`)
    try {
      const languageName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || targetLang

      const promptText = `Translate the following meeting summary to ${languageName}. Keep the formatting (bullet points, sections) intact. Only translate the text content.

Original Summary:
${note.summary}

Provide ONLY the translated version with the same formatting.`

      let translatedText: string

      try {
        translatedText = await groqChat(promptText, { max_tokens: 2048 })
      } catch (apiError: any) {
        console.log('Translation API error:', apiError)
        translatedText = `**Translation Note**: AI translation is currently unavailable.\n\n**Original Summary (${note.detectedLanguage}):**\n${note.summary}`
        toast.info('Translation unavailable, showing original')
      }

      if (!translatedText) {
        throw new Error('No translation returned from AI')
      }

      // Store the translation
      setTranslatedSummaries(prev => ({
        ...prev,
        [noteId]: {
          ...(prev[noteId] || {}),
          [targetLang]: translatedText
        }
      }))

      toast.success(`Translated to ${languageName}!`)
    } catch (error) {
      console.error('Translation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to translate: ${errorMessage}`)
    } finally {
      setTranslatingLanguage(null)
    }
  }

  const generateScripts = async (noteId: string) => {
    const note = (savedNotes || []).find(n => n.id === noteId)
    if (!note) return

    // Check if API is available
    if (!isGroqConfigured()) {
      toast.error('AI service is not available. Please refresh the page.')
      return
    }

    setGeneratingScripts(noteId)
    try {
      let formal: string, casual: string, report: string, meeting: string

      try {
        // Try to generate all 4 script types in parallel
        const promptBase = `Based on this meeting transcript, create a human-like, natural AI-powered transcript.

Transcript:
${note.transcript}

Summary (if available):
${note.summary || 'N/A'}

Generate a `

        ;[formal, casual, report, meeting] = await Promise.all([
          groqChat(promptBase + `FORMAL style transcript with professional language, proper structure, complete sentences, and business-appropriate tone. Make it sound like official documentation with clear sections and formal greetings/closings.`, { max_tokens: 2048 }),
          groqChat(promptBase + `CASUAL style transcript with friendly, conversational tone like you're talking to a colleague over coffee. Use relaxed language, contractions, and keep it approachable while staying organized.`, { max_tokens: 2048 }),
          groqChat(promptBase + `REPORT style transcript formatted as a detailed meeting report with executive summary, key discussion points, decisions made, action items with owners, next steps, and conclusions. Use bullet points and clear sections.`, { max_tokens: 2048 }),
          groqChat(promptBase + `MEETING MINUTES style transcript with standard meeting format including attendees section, agenda items discussed, key decisions, action items, and next meeting date. Format like official meeting minutes.`, { max_tokens: 2048 })
        ])
      } catch (apiError: any) {
        // Fallback for any API error (401, 404, etc.)
        console.log('AI API not available, using fallback transcripts')
        // Fallback: Generate basic formatted versions
        const transcript = note.transcript
        const summaryText = note.summary || 'No summary available.'

        formal = `FORMAL TRANSCRIPT\n\nDate: ${note.date}\nDuration: ${note.duration}\nLanguage: ${note.detectedLanguage}\n\n${summaryText}\n\nFull Transcript:\n${transcript}\n\n---\nNote: Full AI-powered formatting temporarily unavailable.`

        casual = `Hey! Here's what happened in the meeting:\n\nDate: ${note.date}\nTime: ${note.duration}\n\n${summaryText}\n\nHere's what was said:\n${transcript}\n\n---\nNote: Full AI-powered formatting temporarily unavailable.`

        report = `MEETING REPORT\n\nDate: ${note.date}\nDuration: ${note.duration}\nLanguage: ${note.detectedLanguage}\n\nEXECUTIVE SUMMARY:\n${summaryText}\n\nDETAILED TRANSCRIPT:\n${transcript}\n\n---\nNote: Full AI-powered formatting temporarily unavailable.`

        meeting = `MEETING MINUTES\n\nDate: ${note.date}\nDuration: ${note.duration}\nLanguage: ${note.detectedLanguage}\n\nSUMMARY:\n${summaryText}\n\nDISCUSSION:\n${transcript}\n\n---\nNote: Full AI-powered formatting temporarily unavailable.`

        toast.info('Generated basic formats (AI formatting temporarily unavailable)')
      }

      if (!formal || !casual || !report || !meeting) {
        throw new Error('One or more transcripts failed to generate')
      }

      setSavedNotes(prev =>
        (prev || []).map(n =>
          n.id === noteId ? { ...n, scripts: { formal, casual, report, meeting } } : n
        )
      )
      toast.success('✨ 4 transcripts generated!')
    } catch (error) {
      console.error('Script generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to generate transcripts: ${errorMessage}`)
    } finally {
      setGeneratingScripts(null)
    }
  }

  const openEmailDialog = (script: string, type: string, note: MeetingNote) => {
    const formatName = type.charAt(0).toUpperCase() + type.slice(1)
    const defaultSubject = `Meeting Script - ${formatName} Format - ${note.title}`
    const defaultBody = `Hi,

Please find the ${formatName} format meeting script below:

===========================================
MEETING: ${note.title}
DATE: ${note.date}
DURATION: ${note.duration}
FORMAT: ${formatName}
===========================================

${script}

---
Generated by FlowSphere Meeting Notes`

    setEmailData({ script, type, note })
    setEmailSubject(defaultSubject)
    setEmailBody(defaultBody)
    setShowEmailDialog(true)
  }

  const sendEmail = () => {
    if (!emailTo.trim()) {
      toast.error('Please enter recipient email address')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailTo)) {
      toast.error('Please enter a valid email address')
      return
    }

    setSendingEmail(true)

    // Use mailto protocol to open default email client
    const mailtoLink = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`

    window.location.href = mailtoLink

    setTimeout(() => {
      setSendingEmail(false)
      setShowEmailDialog(false)
      toast.success('📧 Email client opened with pre-filled content!')

      // Reset form
      setEmailTo('')
      setEmailSubject('')
      setEmailBody('')
    }, 1000)
  }

  const downloadScript = (script: string, type: string, note: MeetingNote) => {
    const formatName = type.charAt(0).toUpperCase() + type.slice(1)
    const content = `${formatName} Style Transcript
Meeting: ${note.title}
Date: ${note.date}
Duration: ${note.duration}

===========================================

${script}

---
Generated by FlowSphere Meeting Notes`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meeting-${type}-${note.date.replace(/[/:, ]/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`📥 ${formatName} transcript downloaded!`)
  }

  const shareToContacts = (script: string, type: string, note: MeetingNote) => {
    const formatName = type.charAt(0).toUpperCase() + type.slice(1)
    const text = `${formatName} Style Transcript - ${note.title}

${script}

---
Generated by FlowSphere Meeting Notes`

    if (navigator.share) {
      navigator.share({
        title: `Meeting Transcript - ${formatName}`,
        text: text
      })
        .then(() => toast.success('📤 Shared successfully!'))
        .catch((error) => {
          if (error.name !== 'AbortError') {
            console.error('Share error:', error)
            // Fallback to copying to clipboard
            navigator.clipboard.writeText(text)
            toast.success('📋 Copied to clipboard! You can now share it.')
          }
        })
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(text)
      toast.success('📋 Copied to clipboard! You can now share via messages.')
    }
  }

  const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  const hasAudioRecording = supportsAudioRecording()
  const canRecord = hasWebSpeech || (useMobileRecording && hasAudioRecording)

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Meeting Notes</h1>
        <p className="text-muted-foreground">
          {useMobileRecording
            ? 'Record meetings with AI transcription (OpenAI Whisper)'
            : 'Record meetings with real-time voice-to-text translation in 200+ languages'}
        </p>
      </div>

      {!canRecord && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">
              Recording is not supported in your browser. Please use a modern browser with microphone support.
            </p>
          </CardContent>
        </Card>
      )}

      {useMobileRecording && (
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="p-4">
            <p className="text-sm text-accent-foreground">
              📱 <strong>Mobile Recording Mode:</strong> Using Web Audio API with OpenAI Whisper transcription. Recording will be processed after you stop (not real-time). Requires OpenAI API key.
            </p>
          </CardContent>
        </Card>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-accent/30 bg-gradient-to-br from-accent/5 via-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>New Recording</span>
              <Badge variant={isRecording ? 'destructive' : isTranscribing ? 'default' : 'secondary'} className={isRecording || isTranscribing ? 'animate-pulse' : ''}>
                {isTranscribing ? 'Transcribing...' : isRecording ? 'Recording...' : 'Ready'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language-select">Target Language</Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage} disabled={isRecording}>
                <SelectTrigger id="language-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Auto-detect will recognize your language and also capture English words
              </p>
            </div>

            {currentTranscript && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-muted rounded-lg"
              >
                <p className="text-sm whitespace-pre-wrap">{currentTranscript}</p>
              </motion.div>
            )}

            <div className="flex gap-3">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  className="flex-1 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90"
                  size="lg"
                  disabled={!canRecord || isTranscribing}
                >
                  <Microphone className="w-5 h-5 mr-2" weight="fill" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                  disabled={isTranscribing}
                >
                  <Stop className="w-5 h-5 mr-2" weight="fill" />
                  {useMobileRecording ? 'Stop & Transcribe' : 'Stop & Save'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Saved Notes ({(savedNotes || []).length})</h2>
        
        {(savedNotes || []).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Microphone className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
              <h3 className="text-xl font-semibold mb-2">No meeting notes yet</h3>
              <p className="text-muted-foreground">
                Start your first recording to capture meeting discussions
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {(savedNotes || []).map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="border-border/50 hover:border-accent/50 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-2">{note.title}</CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {note.date}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {note.duration}
                          </Badge>
                          <Badge variant="secondary" className="text-xs bg-accent/20 text-accent">
                            {note.detectedLanguage}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyTranscript(note.transcript, note.id)}
                        >
                          {copiedId === note.id ? (
                            <Check className="w-5 h-5 text-mint" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadNote(note)}
                        >
                          <Download className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash className="w-5 h-5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Collapsible open={expandedNotes.has(note.id)} onOpenChange={() => toggleNoteExpansion(note.id)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="font-medium">Transcript</span>
                          <CaretDown className={`w-4 h-4 transition-transform ${expandedNotes.has(note.id) ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-3 p-4 bg-muted rounded-lg">
                          <ScrollArea className="max-h-60">
                            <p className="text-sm whitespace-pre-wrap">{note.transcript}</p>
                          </ScrollArea>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Separator />

                    <div className="space-y-3">
                      {note.summary && note.scripts ? (
                        <div className="space-y-3">
                          {/* Two main buttons */}
                          <div className="flex gap-2">
                            <Button
                              variant={selectedView?.noteId === note.id && selectedView?.view === 'summary' ? 'default' : 'outline'}
                              onClick={() => setSelectedView({ noteId: note.id, view: 'summary' })}
                              className="flex-1"
                            >
                              ✅ Approved Summary
                            </Button>
                            <Button
                              variant={selectedView?.noteId === note.id && selectedView?.view === 'formats' ? 'default' : 'outline'}
                              onClick={() => {
                                setSelectedView({ noteId: note.id, view: 'formats' })
                                // Auto-select first format when opening 4 Formats
                                if (!selectedScript || selectedScript.noteId !== note.id) {
                                  setSelectedScript({ noteId: note.id, type: 'formal' })
                                }
                              }}
                              className="flex-1"
                            >
                              📝 4 Formats
                            </Button>
                          </div>

                          {/* Show Approved Summary */}
                          {selectedView?.noteId === note.id && selectedView?.view === 'summary' && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="border border-border rounded-lg p-4 bg-background/50 space-y-3 overflow-hidden"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between border-b border-border pb-2 min-w-0">
                                  <h4 className="font-semibold text-sm flex items-center gap-2 flex-shrink-0">
                                    AI-Generated Summary
                                    <Badge variant="secondary" className="text-xs">Generated</Badge>
                                  </h4>
                                  <div className="flex gap-2 flex-shrink-0 ml-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const currentSummary = translationLanguage.noteId === note.id && translationLanguage.language !== 'original' && translatedSummaries[note.id]?.[translationLanguage.language]
                                          ? translatedSummaries[note.id][translationLanguage.language]
                                          : note.summary!
                                        navigator.clipboard.writeText(currentSummary)
                                        toast.success('Summary copied!')
                                      }}
                                      title="Copy to clipboard"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const currentSummary = translationLanguage.noteId === note.id && translationLanguage.language !== 'original' && translatedSummaries[note.id]?.[translationLanguage.language]
                                          ? translatedSummaries[note.id][translationLanguage.language]
                                          : note.summary!
                                        const content = `AI Summary - ${note.title}\n\n${currentSummary}`
                                        const blob = new Blob([content], { type: 'text/plain' })
                                        const url = URL.createObjectURL(blob)
                                        const a = document.createElement('a')
                                        a.href = url
                                        a.download = `summary-${note.date.replace(/[/:, ]/g, '-')}.txt`
                                        a.click()
                                        URL.revokeObjectURL(url)
                                        toast.success('Summary downloaded!')
                                      }}
                                      title="Download as text file"
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const currentSummary = translationLanguage.noteId === note.id && translationLanguage.language !== 'original' && translatedSummaries[note.id]?.[translationLanguage.language]
                                          ? translatedSummaries[note.id][translationLanguage.language]
                                          : note.summary!
                                        const text = `AI Summary - ${note.title}\n\n${currentSummary}`
                                        if (navigator.share) {
                                          navigator.share({ title: `Summary - ${note.title}`, text })
                                            .catch(() => navigator.clipboard.writeText(text))
                                        } else {
                                          navigator.clipboard.writeText(text)
                                          toast.success('Copied to clipboard!')
                                        }
                                      }}
                                      title="Share to contacts"
                                    >
                                      <ShareNetwork className="w-4 h-4" weight="fill" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        const currentSummary = translationLanguage.noteId === note.id && translationLanguage.language !== 'original' && translatedSummaries[note.id]?.[translationLanguage.language]
                                          ? translatedSummaries[note.id][translationLanguage.language]
                                          : note.summary!
                                        openEmailDialog(currentSummary, 'summary', note)
                                      }}
                                      className="bg-gradient-to-r from-accent to-primary"
                                    >
                                      <Envelope className="w-4 h-4 mr-1" weight="fill" />
                                      Email
                                    </Button>
                                  </div>
                                </div>

                                {/* Language Selector */}
                                <div className="flex items-center gap-2 pt-2">
                                  <Label className="text-xs font-medium whitespace-nowrap">Translate to:</Label>
                                  <Select
                                    value={translationLanguage.noteId === note.id ? translationLanguage.language : 'original'}
                                    onValueChange={async (value) => {
                                      setTranslationLanguage({ noteId: note.id, language: value })
                                      if (value !== 'original') {
                                        await translateSummary(note.id, value)
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8 w-[200px] text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="original">Original Language</SelectItem>
                                      {SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                                        <SelectItem key={lang.code} value={lang.code}>
                                          {lang.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {translatingLanguage === `${note.id}-${translationLanguage.language}` && (
                                    <motion.div
                                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    />
                                  )}
                                </div>
                              </div>
                              <ScrollArea className="h-80 w-full">
                                <div className="pr-4 max-w-full overflow-hidden">
                                  <div
                                    className="text-sm prose prose-sm max-w-none break-words overflow-wrap-anywhere"
                                    dangerouslySetInnerHTML={{
                                      __html: (translationLanguage.noteId === note.id && translationLanguage.language !== 'original' && translatedSummaries[note.id]?.[translationLanguage.language]
                                        ? translatedSummaries[note.id][translationLanguage.language]
                                        : note.summary
                                      ).replace(/\n/g, '<br/>')
                                    }}
                                  />
                                </div>
                              </ScrollArea>
                            </motion.div>
                          )}

                          {/* Show 4 Formats */}
                          {selectedView?.noteId === note.id && selectedView?.view === 'formats' && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 bg-accent/5 border border-accent/20 rounded-lg space-y-4 overflow-hidden"
                            >
                              {/* Horizontal button row */}
                              <div className="flex gap-2 overflow-x-auto pb-2">
                                <Button
                                  variant={selectedScript?.noteId === note.id && selectedScript?.type === 'formal' ? 'default' : 'outline'}
                                  onClick={() => setSelectedScript({ noteId: note.id, type: 'formal' })}
                                  className="whitespace-nowrap"
                                >
                                  📋 Formal
                                </Button>
                                <Button
                                  variant={selectedScript?.noteId === note.id && selectedScript?.type === 'casual' ? 'default' : 'outline'}
                                  onClick={() => setSelectedScript({ noteId: note.id, type: 'casual' })}
                                  className="whitespace-nowrap"
                                >
                                  💬 Casual
                                </Button>
                                <Button
                                  variant={selectedScript?.noteId === note.id && selectedScript?.type === 'report' ? 'default' : 'outline'}
                                  onClick={() => setSelectedScript({ noteId: note.id, type: 'report' })}
                                  className="whitespace-nowrap"
                                >
                                  📊 Report
                                </Button>
                                <Button
                                  variant={selectedScript?.noteId === note.id && selectedScript?.type === 'meeting' ? 'default' : 'outline'}
                                  onClick={() => setSelectedScript({ noteId: note.id, type: 'meeting' })}
                                  className="whitespace-nowrap"
                                >
                                  📝 Meeting
                                </Button>
                              </div>

                              {/* Selected format content */}
                              {selectedScript?.noteId === note.id && note.scripts && (
                                <div className="border border-border rounded-lg p-4 bg-background/50 space-y-3 overflow-hidden w-full">
                                  <div className="flex items-center justify-between border-b border-border pb-2 min-w-0">
                                    <h5 className="font-semibold text-sm capitalize flex-shrink-0">
                                      {selectedScript.type} Format
                                    </h5>
                                    <div className="flex gap-2 flex-shrink-0 ml-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingContent({ noteId: note.id, type: 'script', scriptType: selectedScript.type })}
                                      >
                                        <PencilSimple className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const currentScript = translatedScripts[note.id]?.[selectedScript.type]?.[translationLanguage.language]
                                            || note.scripts![selectedScript.type]
                                          navigator.clipboard.writeText(currentScript)
                                          toast.success('Script copied!')
                                        }}
                                        title="Copy to clipboard"
                                      >
                                        <Copy className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const currentScript = translatedScripts[note.id]?.[selectedScript.type]?.[translationLanguage.language]
                                            || note.scripts![selectedScript.type]
                                          downloadScript(currentScript, selectedScript.type, note)
                                        }}
                                        title="Download as text file"
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const currentScript = translatedScripts[note.id]?.[selectedScript.type]?.[translationLanguage.language]
                                            || note.scripts![selectedScript.type]
                                          shareToContacts(currentScript, selectedScript.type, note)
                                        }}
                                        title="Share to contacts"
                                      >
                                        <ShareNetwork className="w-4 h-4" weight="fill" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          const currentScript = translatedScripts[note.id]?.[selectedScript.type]?.[translationLanguage.language]
                                            || note.scripts![selectedScript.type]
                                          openEmailDialog(currentScript, selectedScript.type, note)
                                        }}
                                        className="bg-gradient-to-r from-accent to-primary"
                                      >
                                        <Envelope className="w-4 h-4 mr-1" weight="fill" />
                                        Email
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Translation */}
                                  <div className="flex items-center gap-2">
                                    <Translate className="w-4 h-4 flex-shrink-0" />
                                    <Select
                                      value={translationLanguage.noteId === note.id ? translationLanguage.language : 'original'}
                                      onValueChange={async (value) => {
                                        setTranslationLanguage({ noteId: note.id, language: value })
                                        if (value !== 'original') {
                                          await translateScript(note.id, selectedScript.type, value)
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-xs flex-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="original">Original</SelectItem>
                                        {SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                                          <SelectItem key={lang.code} value={lang.code}>
                                            {lang.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {translatingLanguage === `${note.id}-${selectedScript.type}-${translationLanguage.language}` && (
                                      <motion.div
                                        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full flex-shrink-0"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                      />
                                    )}
                                  </div>

                                  {/* Edit Instructions */}
                                  {editingContent?.noteId === note.id && editingContent?.type === 'script' && editingContent?.scriptType === selectedScript.type && (
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="Tell AI what to change..."
                                        value={editInstructions}
                                        onChange={(e) => setEditInstructions(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && editInstructions.trim()) {
                                            editContent(note.id, 'script', editInstructions, selectedScript.type)
                                          }
                                        }}
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => editContent(note.id, 'script', editInstructions, selectedScript.type)}
                                        disabled={!editInstructions.trim() || isEditing}
                                      >
                                        {isEditing ? '...' : 'Edit'}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingContent(null)
                                          setEditInstructions('')
                                        }}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}

                                  <ScrollArea className="h-80 w-full">
                                    <div className="pr-4 max-w-full overflow-hidden">
                                      <div
                                        className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere"
                                        dangerouslySetInnerHTML={{
                                          __html: (translationLanguage.noteId === note.id && translationLanguage.language !== 'original' && translatedScripts[note.id]?.[selectedScript.type]?.[translationLanguage.language]
                                            ? translatedScripts[note.id][selectedScript.type][translationLanguage.language]
                                            : note.scripts[selectedScript.type]
                                          ).replace(/\n/g, '<br/>')
                                        }}
                                      />
                                    </div>
                                  </ScrollArea>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      ) : note.summary ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              AI Summary
                              <Badge variant="secondary" className="text-xs">Generated</Badge>
                            </h4>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingContent({ noteId: note.id, type: 'summary' })}
                              >
                                <PencilSimple className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Translation & Edit */}
                          <div className="flex items-center gap-2">
                            <Translate className="w-4 h-4 flex-shrink-0" />
                            <Select
                              value={translationLanguage.noteId === note.id ? translationLanguage.language : 'original'}
                              onValueChange={async (value) => {
                                setTranslationLanguage({ noteId: note.id, language: value })
                                if (value !== 'original') {
                                  await translateSummary(note.id, value)
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="original">Original</SelectItem>
                                {SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                                  <SelectItem key={lang.code} value={lang.code}>
                                    {lang.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {translatingLanguage === `${note.id}-${translationLanguage.language}` && (
                              <motion.div
                                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full flex-shrink-0"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              />
                            )}
                          </div>

                          {/* Edit Instructions */}
                          {editingContent?.noteId === note.id && editingContent?.type === 'summary' && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Tell AI what to change..."
                                value={editInstructions}
                                onChange={(e) => setEditInstructions(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && editInstructions.trim()) {
                                    editContent(note.id, 'summary', editInstructions)
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => editContent(note.id, 'summary', editInstructions)}
                                disabled={!editInstructions.trim() || isEditing}
                              >
                                {isEditing ? '...' : 'Edit'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingContent(null)
                                  setEditInstructions('')
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}

                          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                            <div
                              className="text-sm prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: (translationLanguage.noteId === note.id && translationLanguage.language !== 'original' && translatedSummaries[note.id]?.[translationLanguage.language]
                                  ? translatedSummaries[note.id][translationLanguage.language]
                                  : note.summary
                                ).replace(/\n/g, '<br/>')
                              }}
                            />
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => generateScripts(note.id)}
                            disabled={generatingScripts === note.id}
                            className="w-full"
                          >
                            {generatingScripts === note.id ? (
                              <>
                                <motion.div
                                  className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                />
                                Generating 4 Meeting Scripts...
                              </>
                            ) : (
                              '📝 Generate Meeting Scripts (4 Formats)'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => generateSummary(note.id)}
                          disabled={generatingSummary === note.id}
                          className="w-full"
                        >
                          {generatingSummary === note.id ? (
                            <>
                              <motion.div
                                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              />
                              Generating Summary...
                            </>
                          ) : (
                            'Generate AI Summary'
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Envelope className="w-5 h-5" weight="fill" />
              Email Meeting Script
            </DialogTitle>
            <DialogDescription>
              Send the {emailData.type} format script to your recipient
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="space-y-4 py-4 pr-4">
              <div className="space-y-2">
                <Label htmlFor="email-to">To (Email Address) *</Label>
                <Input
                  id="email-to"
                  type="email"
                  placeholder="recipient@example.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-body">Message</Label>
                <Textarea
                  id="email-body"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={12}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
              disabled={sendingEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={sendEmail}
              disabled={sendingEmail || !emailTo.trim()}
              className="bg-gradient-to-r from-accent to-primary"
            >
              {sendingEmail ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Sending...
                </>
              ) : (
                <>
                  <Envelope className="w-4 h-4 mr-2" weight="fill" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
