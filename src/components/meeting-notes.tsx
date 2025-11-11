import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Microphone, Stop, Trash, Copy, Download, Check, X, CaretDown } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface MeetingNote {
  id: string
  title: string
  date: string
  transcript: string
  detectedLanguage: string
  duration: string
  summary?: string
}

const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'tl', name: 'Filipino/Tagalog' },
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
  
  const recognitionRef = useRef<any>(null)
  const interimTranscriptRef = useRef('')

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.maxAlternatives = 1
      
      if (targetLanguage !== 'auto') {
        recognitionRef.current.lang = targetLanguage
      }

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
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
        console.error('Speech recognition error:', event.error)
        if (event.error === 'no-speech') {
          return
        }
        toast.error(`Recording error: ${event.error}`)
        stopRecording()
      }

      recognitionRef.current.onend = () => {
        if (isRecording) {
          recognitionRef.current?.start()
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [targetLanguage])

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not supported in your browser')
      return
    }

    setCurrentTranscript('')
    setRecordingStartTime(Date.now())
    setIsRecording(true)
    recognitionRef.current.start()
    toast.success('Recording started')
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsRecording(false)
    
    if (currentTranscript.trim()) {
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
        transcript: currentTranscript.trim(),
        detectedLanguage: targetLanguage === 'auto' ? 'English' : SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name || 'English',
        duration: durationStr
      }

      setSavedNotes(prev => [newNote, ...(prev || [])])
      toast.success('Meeting note saved')
      setCurrentTranscript('')
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

      const summary = await window.spark.llm(promptText, 'gpt-4o-mini')
      
      setSavedNotes(prev => 
        (prev || []).map(n => 
          n.id === noteId ? { ...n, summary } : n
        )
      )
      toast.success('Summary generated')
    } catch (error) {
      console.error('Summary generation error:', error)
      toast.error('Failed to generate summary')
    } finally {
      setGeneratingSummary(null)
    }
  }

  const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Meeting Notes</h1>
        <p className="text-muted-foreground">
          Record meetings with real-time voice-to-text translation in 200+ languages
        </p>
      </div>

      {!hasWebSpeech && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">
              Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari for the best experience.
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
              <Badge variant={isRecording ? 'destructive' : 'secondary'} className="animate-pulse">
                {isRecording ? 'Recording...' : 'Ready'}
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
                  disabled={!hasWebSpeech}
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
                >
                  <Stop className="w-5 h-5 mr-2" weight="fill" />
                  Stop & Save
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

                    <div>
                      {note.summary ? (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            AI Summary
                            <Badge variant="secondary" className="text-xs">Generated</Badge>
                          </h4>
                          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                            <div 
                              className="text-sm prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: note.summary.replace(/\n/g, '<br/>') }}
                            />
                          </div>
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
    </div>
  )
}
