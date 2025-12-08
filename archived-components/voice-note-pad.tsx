import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Microphone, Stop, Trash, FolderOpen, MagnifyingGlass, Tag, Plus, X, Sparkle } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'

interface VoiceNote {
  id: string
  title: string
  transcript: string
  category: string
  tags: string[]
  createdAt: string
  duration: number
}

const CATEGORIES = ['Personal', 'Work', 'Family', 'Ideas', 'Reminders', 'Meeting', 'Other']

export function VoiceNotePad() {
  const [notes, setNotes] = useKV<VoiceNote[]>('flowsphere-voice-notes', [])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  
  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const transcriptRef = useRef<string>('')

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          transcriptRef.current += finalTranscript
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable microphone permissions.')
        }
        stopRecording()
      }

      recognitionRef.current.onend = () => {
        if (isRecording) {
          recognitionRef.current?.start()
        }
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not supported in your browser.')
      return
    }

    try {
      transcriptRef.current = ''
      setIsRecording(true)
      setRecordingTime(0)
      recognitionRef.current.start()

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      toast.success('Recording started')
    } catch (error) {
      toast.error('Failed to start recording')
      console.error('Recording error:', error)
    }
  }

  const stopRecording = async () => {
    setIsRecording(false)
    
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    if (transcriptRef.current.trim()) {
      setIsTranscribing(true)
      
      try {
        const promptText = `Analyze this voice note transcript and provide:
1. A short descriptive title (max 6 words)
2. The best category from: ${CATEGORIES.join(', ')}
3. Up to 3 relevant tags
4. The cleaned transcript

Transcript: "${transcriptRef.current}"

Return as JSON: {"title": "...", "category": "...", "tags": ["..."], "transcript": "..."}`

        const result = await window.spark.llm(promptText, 'gpt-4o-mini', true)
        const analysis = JSON.parse(result)

        const newNote: VoiceNote = {
          id: Date.now().toString(),
          title: analysis.title || 'Voice Note',
          transcript: analysis.transcript || transcriptRef.current,
          category: analysis.category || 'Other',
          tags: analysis.tags || [],
          createdAt: new Date().toISOString(),
          duration: recordingTime
        }

        setNotes((current) => [newNote, ...(current || [])])
        toast.success('Note saved and categorized!')
      } catch (error) {
        const newNote: VoiceNote = {
          id: Date.now().toString(),
          title: 'Voice Note',
          transcript: transcriptRef.current,
          category: 'Other',
          tags: [],
          createdAt: new Date().toISOString(),
          duration: recordingTime
        }

        setNotes((current) => [newNote, ...(current || [])])
        toast.success('Note saved!')
      } finally {
        setIsTranscribing(false)
        setRecordingTime(0)
      }
    } else {
      toast.error('No audio detected')
    }
  }

  const deleteNote = (id: string) => {
    setNotes((current) => (current || []).filter(note => note.id !== id))
    setSelectedNote(null)
    toast.success('Note deleted')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const filteredNotes = (notes || []).filter(note => {
    const matchesCategory = selectedCategory === 'All' || note.category === selectedCategory
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const categoryCount = (category: string) => {
    if (category === 'All') return notes?.length || 0
    return (notes || []).filter(n => n.category === category).length
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-heading">
            Voice Note Pad
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Record voice memos that are auto-transcribed and categorized
          </p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4">
            {isTranscribing ? (
              <div className="text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-accent/20 flex items-center justify-center mb-4 animate-pulse">
                  <Sparkle className="w-10 h-10 sm:w-12 sm:h-12 text-accent" />
                </div>
                <p className="text-base sm:text-lg font-semibold text-foreground">
                  Transcribing & Categorizing...
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  AI is processing your note
                </p>
              </div>
            ) : isRecording ? (
              <>
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-destructive/20 absolute inset-0"
                  />
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-destructive flex items-center justify-center relative">
                    <Microphone weight="fill" className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                    {formatTime(recordingTime)}
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Recording in progress...
                  </p>
                </div>
                <Button
                  onClick={stopRecording}
                  size="lg"
                  variant="destructive"
                  className="gap-2"
                >
                  <Stop weight="fill" />
                  Stop Recording
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Microphone className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-base sm:text-lg font-semibold text-foreground mb-2">
                    Ready to Record
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Tap the button to start recording your voice note
                  </p>
                </div>
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <Microphone weight="fill" />
                  Start Recording
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All ({categoryCount('All')})</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat} ({categoryCount(cat)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredNotes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg line-clamp-2">
                      {note.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNote(note.id)
                      }}
                      className="h-8 w-8 p-0 flex-shrink-0"
                    >
                      <Trash className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent 
                  className="space-y-3"
                  onClick={() => setSelectedNote(note)}
                >
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">
                    {note.transcript}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <FolderOpen className="w-3 h-3 mr-1" />
                      {note.category}
                    </Badge>
                    {note.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    <span>{formatTime(note.duration)}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-12">
          <Microphone className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-lg font-semibold text-muted-foreground">No notes found</p>
          <p className="text-sm text-muted-foreground">
            {searchQuery || selectedCategory !== 'All' 
              ? 'Try adjusting your filters' 
              : 'Start recording your first voice note'}
          </p>
        </div>
      )}

      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedNote?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                <FolderOpen className="w-3 h-3 mr-1" />
                {selectedNote?.category}
              </Badge>
              {selectedNote?.tags.map(tag => (
                <Badge key={tag} variant="outline">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
            <ScrollArea className="h-64">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {selectedNote?.transcript}
              </p>
            </ScrollArea>
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
              <span>{selectedNote && new Date(selectedNote.createdAt).toLocaleString()}</span>
              <span>Duration: {selectedNote && formatTime(selectedNote.duration)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
