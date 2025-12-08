/**
 * Unified Email Search - Multi-account email search with AI Assistant
 * Searches across ALL connected email accounts with AI-powered insights
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlass,
  Envelope,
  EnvelopeOpen,
  Clock,
  User,
  Tag,
  Spinner,
  X,
  Robot,
  PaperPlaneTilt,
  Lightning,
  Briefcase,
  Warning,
  Calendar,
  CheckCircle,
  ArrowRight,
  Sparkle,
  PencilSimple,
  Copy,
  ArrowBendUpLeft,
  PaperPlane,
  Paperclip,
  File,
  Trash,
  Eye,
  Archive,
  CaretDown,
  SpeakerHigh,
  Stop,
  Microphone
} from '@phosphor-icons/react'
import { EmailAccountStore, Email } from '@/lib/email/email-service'
import { GmailProvider } from '@/lib/email/gmail-provider'
import { EmailClassificationRulesStore } from '@/lib/email/email-classification-rules'
import { askEmailAssistant, getEmailOverview, QUICK_ACTIONS, AssistantResponse, DraftEmail, ConversationMessage } from '@/lib/email/ai-email-assistant'
import { emailDatabase } from '@/lib/email/email-database'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { speakWithGroq, stopSpeaking, GroqAudioRecorder, groqSpeechToText } from '@/lib/groq-voice'

interface EmailAttachment {
  filename: string
  mimeType: string
  data: string // Base64
  size: number
}

type CategoryFilter = 'all' | 'urgent' | 'work' | 'personal' | 'subs' | 'bills'
type ViewMode = 'search' | 'ai'

interface SearchResult extends Email {
  accountEmail: string
  accountProvider: string
  displayCategory: CategoryFilter
}

interface AIMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  emails?: Email[]
  suggestions?: string[]
  draftEmail?: DraftEmail
  timestamp: Date
  handoffToGeneral?: boolean
  handoffQuery?: string
}

// DraftEmail is imported from ai-email-assistant

interface UnifiedEmailSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCategory?: CategoryFilter
  initialMode?: ViewMode
  onLatestAIResponse?: (response: string | null) => void
  onHandoffToGeneral?: (query: string) => void // Callback when user wants to handoff to general AI
}

export function UnifiedEmailSearch({
  open,
  onOpenChange,
  initialCategory = 'all',
  initialMode = 'search',
  onLatestAIResponse,
  onHandoffToGeneral
}: UnifiedEmailSearchProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode)
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>(initialCategory)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchedAccounts, setSearchedAccounts] = useState<string[]>([])
  const [selectedEmail, setSelectedEmail] = useState<SearchResult | null>(null)

  // AI Assistant state
  const [aiQuery, setAiQuery] = useState('')
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([])
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiOverview, setAiOverview] = useState<string>('')
  const [showComposer, setShowComposer] = useState(false)
  const [draftEmail, setDraftEmail] = useState<DraftEmail>({ to: '', subject: '', body: '' })
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])

  // Attachment state
  const [attachments, setAttachments] = useState<EmailAttachment[]>([])
  const [isSending, setIsSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // TTS state for AI message playback
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Voice input state
  const [isRecording, setIsRecording] = useState(false)
  const [audioRecorder] = useState(() => new GroqAudioRecorder())

  const aiScrollRef = useRef<HTMLDivElement>(null)
  const aiInputRef = useRef<HTMLInputElement>(null)

  // Load AI overview on mount
  useEffect(() => {
    getEmailOverview().then(setAiOverview)
  }, [])

  // Auto-scroll AI messages
  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight
    }
  }, [aiMessages])

  // Report latest AI response to parent for "Hear Summary" button
  useEffect(() => {
    if (onLatestAIResponse) {
      const lastAssistantMessage = [...aiMessages].reverse().find(m => m.type === 'assistant')
      onLatestAIResponse(lastAssistantMessage?.content || null)
    }
  }, [aiMessages, onLatestAIResponse])

  // Update category when initialCategory changes
  useEffect(() => {
    setCategory(initialCategory)
  }, [initialCategory])

  // Clear search when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setResults([])
      setSelectedEmail(null)
      setViewMode(initialMode)
    }
  }, [open, initialMode])

  const searchAllAccounts = useCallback(async () => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    setResults([])
    setSearchedAccounts([])

    const accounts = EmailAccountStore.getActiveAccounts()
    const allResults: SearchResult[] = []
    const searched: string[] = []

    for (const account of accounts) {
      try {
        searched.push(account.email)
        setSearchedAccounts([...searched])

        let emails: Email[] = []

        // Search based on provider
        if (account.provider === 'gmail') {
          const gmail = new GmailProvider()
          const result = await gmail.searchEmails(account, {
            query: searchQuery,
            maxResults: 20
          })
          emails = result.emails
        }

        // Classify each email and add to results
        for (const email of emails) {
          const classification = EmailClassificationRulesStore.classifyByRules({
            subject: email.subject,
            body: email.body || email.snippet || '',
            from: email.from
          })

          allResults.push({
            ...email,
            accountEmail: account.email,
            accountProvider: account.provider,
            displayCategory: classification.category
          })
        }
      } catch (error) {
        console.error(`Failed to search ${account.email}:`, error)
      }
    }

    // Filter by category if not 'all'
    const filtered = category === 'all'
      ? allResults
      : allResults.filter(r => r.displayCategory === category)

    // Sort by date (newest first)
    filtered.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    setResults(filtered)
    setIsSearching(false)
  }, [searchQuery, category])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchAllAccounts()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, searchAllAccounts])

  // AI Assistant handlers
  const handleAiSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!aiQuery.trim() || isAiLoading) return

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: aiQuery,
      timestamp: new Date()
    }

    setAiMessages(prev => [...prev, userMessage])
    setAiQuery('')
    setIsAiLoading(true)

    try {
      const response = await askEmailAssistant({ query: userMessage.content })

      // Use the draft email from the AI response if available
      // The AI now returns drafts for compose/reply requests automatically
      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.summary,
        emails: response.emails,
        suggestions: response.suggestions,
        draftEmail: response.draftEmail,
        timestamp: new Date(),
        handoffToGeneral: response.handoffToGeneral,
        handoffQuery: response.handoffQuery
      }

      setAiMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('AI Assistant error:', error)
      toast.error('Failed to get AI response')

      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date()
      }
      setAiMessages(prev => [...prev, errorMessage])
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleQuickAction = (actionQuery: string) => {
    setAiQuery(actionQuery)
    setTimeout(() => handleAiSubmit(), 100)
  }

  const handleAiSuggestion = (suggestion: string) => {
    if (suggestion === 'Compose a new email') {
      setShowComposer(true)
      setDraftEmail({ to: '', subject: '', body: '' })
    } else if (suggestion === 'Help me draft a reply') {
      setAiQuery('Help me draft a reply to the most recent urgent email')
      aiInputRef.current?.focus()
    } else {
      setAiQuery(suggestion)
      aiInputRef.current?.focus()
    }
  }

  const handleUseDraft = (draft: DraftEmail) => {
    setDraftEmail(draft)
    setShowComposer(true)
  }

  const handleCopyDraft = (draft: DraftEmail) => {
    const text = `To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`
    navigator.clipboard.writeText(text)
    toast.success('Draft copied to clipboard')
  }

  // Handle speaking an AI message
  const handleSpeak = async (messageId: string, content: string) => {
    // If already speaking this message, stop it
    if (speakingMessageId === messageId && isSpeaking) {
      // Stop both HTML5 audio and browser speech synthesis
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      stopSpeaking() // Stop browser speech synthesis
      setSpeakingMessageId(null)
      setIsSpeaking(false)
      toast.success('Audio stopped')
      return
    }

    // Stop any current audio before starting new one
    if (audioRef.current) {
      audioRef.current.pause()
    }
    stopSpeaking() // Stop any browser speech

    try {
      setSpeakingMessageId(messageId)
      setIsSpeaking(true)
      toast.info('Reading summary...')

      await speakWithGroq(content, 'Celeste-PlayAI')

      setSpeakingMessageId(null)
      setIsSpeaking(false)
    } catch (error) {
      console.error('TTS error:', error)
      toast.error('Failed to play audio')
      setSpeakingMessageId(null)
      setIsSpeaking(false)
    }
  }

  // Handle voice input - record and transcribe
  const handleVoiceInput = async () => {
    if (isRecording) {
      // Stop recording and transcribe
      try {
        toast.info('Processing voice...')
        const audioBlob = await audioRecorder.stopRecording()
        setIsRecording(false)

        // Transcribe using Groq Whisper
        const transcription = await groqSpeechToText(audioBlob)
        if (transcription.trim()) {
          setAiQuery(prev => prev + (prev ? ' ' : '') + transcription)
          toast.success('Voice transcribed!')
          aiInputRef.current?.focus()
        } else {
          toast.error('Could not understand audio')
        }
      } catch (error) {
        console.error('Voice input error:', error)
        toast.error('Failed to process voice')
        setIsRecording(false)
      }
    } else {
      // Start recording
      try {
        await audioRecorder.startRecording()
        setIsRecording(true)
        toast.info('Recording... Click again to stop', { duration: 10000 })
      } catch (error) {
        console.error('Microphone error:', error)
        toast.error('Could not access microphone')
      }
    }
  }

  const getQuickActionIcon = (icon: string) => {
    switch (icon) {
      case 'warning': return Warning
      case 'briefcase': return Briefcase
      case 'envelope': return Envelope
      case 'calendar': return Calendar
      case 'check': return CheckCircle
      case 'user': return User
      default: return Lightning
    }
  }

  const getCategoryColor = (cat: CategoryFilter) => {
    switch (cat) {
      case 'urgent': return 'bg-red-500/20 text-red-500 border-red-500/30'
      case 'work': return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
      case 'personal': return 'bg-green-500/20 text-green-500 border-green-500/30'
      case 'subs': return 'bg-purple-500/20 text-purple-500 border-purple-500/30'
      case 'bills': return 'bg-gray-500/20 text-gray-500 border-gray-500/30'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getCategoryLabel = (cat: CategoryFilter) => {
    switch (cat) {
      case 'urgent': return 'Urgent'
      case 'work': return 'Work'
      case 'personal': return 'Personal'
      case 'subs': return 'Subscriptions'
      case 'bills': return 'Bills'
      default: return 'All'
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              {viewMode === 'search' ? (
                <MagnifyingGlass className="w-4 h-4" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Robot className="w-3 h-3 text-white" weight="fill" />
                </div>
              )}
              {viewMode === 'search' ? 'Email Search' : 'AI Assistant'}
            </DialogTitle>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
              <Sparkle className="w-2.5 h-2.5 mr-0.5" weight="fill" />
              Groq
            </Badge>
          </div>

          {/* Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="mt-2">
            <TabsList className="grid grid-cols-2 w-56 h-8">
              <TabsTrigger value="search" className="text-xs gap-1 h-7">
                <MagnifyingGlass className="w-3 h-3" />
                Search
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs gap-1 h-7">
                <Robot className="w-3 h-3" />
                AI Assistant
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category Tabs - Only show in search mode */}
          {viewMode === 'search' && (
            <Tabs value={category} onValueChange={(v) => setCategory(v as CategoryFilter)} className="mt-2">
              <TabsList className="grid grid-cols-6 w-full h-7">
                <TabsTrigger value="all" className="text-[10px] h-6">All</TabsTrigger>
                <TabsTrigger value="urgent" className="text-[10px] h-6 text-red-500">Urgent</TabsTrigger>
                <TabsTrigger value="work" className="text-[10px] h-6 text-blue-500">Work</TabsTrigger>
                <TabsTrigger value="personal" className="text-[10px] h-6 text-green-500">Personal</TabsTrigger>
                <TabsTrigger value="subs" className="text-[10px] h-6 text-purple-500">Subs</TabsTrigger>
                <TabsTrigger value="bills" className="text-[10px] h-6 text-gray-500">Bills</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </DialogHeader>

        {/* Search Mode Content */}
        {viewMode === 'search' && (
          <>
            {/* Search Input */}
            <div className="p-4 border-b flex-shrink-0">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search across all email accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-12 text-lg"
                  autoFocus
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Search Status */}
              {isSearching && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="w-4 h-4 animate-spin" />
                  Searching {searchedAccounts.length} account(s)...
                  <span className="text-xs">
                    ({searchedAccounts.join(', ')})
                  </span>
                </div>
              )}
            </div>

            {/* Results */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Email List */}
              <ScrollArea className="flex-1 border-r">
                <div className="divide-y">
                  {results.length === 0 && !isSearching && searchQuery.length >= 2 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <Envelope className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No emails found for "{searchQuery}"</p>
                      {category !== 'all' && (
                        <p className="text-sm mt-1">
                          Try searching in "All" categories
                        </p>
                      )}
                    </div>
                  )}

                  {results.length === 0 && !isSearching && searchQuery.length < 2 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <MagnifyingGlass className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Type at least 2 characters to search</p>
                      <p className="text-sm mt-1">
                        Searches across all {EmailAccountStore.getActiveAccounts().length} connected account(s)
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setViewMode('ai')}
                      >
                        <Robot className="w-4 h-4 mr-2" />
                        Or ask AI for help
                      </Button>
                    </div>
                  )}

                  {results.map((email) => (
                    <div
                      key={`${email.accountEmail}-${email.id}`}
                      className={cn(
                        "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedEmail?.id === email.id && "bg-muted"
                      )}
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {email.read ? (
                            <EnvelopeOpen className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <Envelope className="w-5 h-5 text-primary" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "font-medium truncate",
                              !email.read && "font-semibold"
                            )}>
                              {email.from.name || email.from.email}
                            </span>
                            <Badge variant="outline" className={cn("text-xs", getCategoryColor(email.displayCategory))}>
                              {getCategoryLabel(email.displayCategory)}
                            </Badge>
                          </div>

                          <p className={cn(
                            "text-sm truncate",
                            !email.read ? "font-medium" : "text-muted-foreground"
                          )}>
                            {email.subject}
                          </p>

                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {email.snippet}
                          </p>

                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(email.timestamp)}</span>
                            <span className="text-muted-foreground/50">|</span>
                            <span className="truncate">{email.accountEmail}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Email Preview */}
              {selectedEmail && (
                <div className="w-1/2 flex flex-col overflow-hidden">
                  <div className="p-4 border-b flex-shrink-0">
                    <h3 className="font-semibold text-lg">{selectedEmail.subject}</h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{selectedEmail.from.name || selectedEmail.from.email}</span>
                      <span>&lt;{selectedEmail.from.email}&gt;</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Tag className="w-3 h-3" />
                      <span>{selectedEmail.accountEmail}</span>
                      <Badge variant="outline" className={cn("text-xs", getCategoryColor(selectedEmail.displayCategory))}>
                        {getCategoryLabel(selectedEmail.displayCategory)}
                      </Badge>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {selectedEmail.body || selectedEmail.snippet || 'No content available'}
                    </div>
                  </ScrollArea>

                  {/* Quick Actions */}
                  <div className="p-3 border-t flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => {
                      setDraftEmail({
                        to: selectedEmail.from.email,
                        subject: `Re: ${selectedEmail.subject}`,
                        body: '',
                        replyTo: selectedEmail
                      })
                      setShowComposer(true)
                    }}>
                      <ArrowBendUpLeft className="w-4 h-4 mr-1" />
                      Reply
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setViewMode('ai')
                      setAiQuery(`Summarize and help me reply to this email from ${selectedEmail.from.name || selectedEmail.from.email} about "${selectedEmail.subject}"`)
                    }}>
                      <Robot className="w-4 h-4 mr-1" />
                      AI Help
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* AI Assistant Mode Content */}
        {viewMode === 'ai' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* AI Overview */}
            {aiOverview && aiMessages.length === 0 && (
              <div className="p-4 border-b flex-shrink-0">
                <p className="text-sm text-muted-foreground">{aiOverview}</p>
              </div>
            )}

            {/* Quick Actions - Show when no messages */}
            {aiMessages.length === 0 && (
              <div className="p-4 border-b flex-shrink-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Quick Actions
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = getQuickActionIcon(action.icon)
                    return (
                      <Button
                        key={action.label}
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 h-auto py-2 px-3 text-left"
                        onClick={() => handleQuickAction(action.query)}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" weight="duotone" />
                        <span className="text-xs truncate">{action.label}</span>
                      </Button>
                    )
                  })}
                </div>

                {/* Email Composition Quick Actions */}
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4 mb-3">
                  Compose & Edit
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 h-auto py-2 px-3"
                    onClick={() => {
                      setShowComposer(true)
                      setDraftEmail({ to: '', subject: '', body: '' })
                    }}
                  >
                    <PencilSimple className="w-4 h-4" weight="duotone" />
                    <span className="text-xs">New Email</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 h-auto py-2 px-3"
                    onClick={() => handleQuickAction("Help me draft a professional email reply to my most recent work email")}
                  >
                    <ArrowBendUpLeft className="w-4 h-4" weight="duotone" />
                    <span className="text-xs">Draft Reply</span>
                  </Button>
                </div>
              </div>
            )}

            {/* AI Messages */}
            <div
              className="flex-1 p-4 overflow-y-auto min-h-0"
              ref={aiScrollRef}
            >
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {aiMessages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "flex gap-3",
                        message.type === 'user' && "flex-row-reverse"
                      )}
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        message.type === 'assistant'
                          ? "bg-gradient-to-br from-primary to-accent"
                          : "bg-muted"
                      )}>
                        {message.type === 'assistant' ? (
                          <Robot className="w-5 h-5 text-white" weight="fill" />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" weight="fill" />
                        )}
                      </div>

                      {/* Content */}
                      <div className={cn(
                        "flex-1 space-y-2 max-w-[80%]",
                        message.type === 'user' && "flex flex-col items-end"
                      )}>
                        <div className={cn(
                          "rounded-lg p-3",
                          message.type === 'assistant'
                            ? "bg-muted"
                            : "bg-primary text-primary-foreground"
                        )}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {/* Hear Summary button for assistant messages */}
                          {message.type === 'assistant' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mt-3 h-8 px-3 text-xs gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                              onClick={() => handleSpeak(message.id, message.content)}
                              disabled={isSpeaking && speakingMessageId !== message.id}
                            >
                              {speakingMessageId === message.id && isSpeaking ? (
                                <>
                                  <Stop className="w-4 h-4" weight="fill" />
                                  Stop Audio
                                </>
                              ) : (
                                <>
                                  <SpeakerHigh className="w-4 h-4" weight="duotone" />
                                  Hear Summary
                                </>
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Draft Email Suggestion */}
                        {message.draftEmail && (
                          <div className="w-full p-3 rounded-lg bg-accent/20 border border-accent/30">
                            <div className="flex items-center gap-2 mb-2">
                              <PencilSimple className="w-4 h-4 text-accent" />
                              <span className="text-xs font-medium">Draft Suggestion</span>
                            </div>
                            <div className="space-y-1 text-xs">
                              <p><strong>To:</strong> {message.draftEmail.to || '(recipient)'}</p>
                              <p><strong>Subject:</strong> {message.draftEmail.subject || '(subject)'}</p>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 text-xs"
                                onClick={() => handleUseDraft(message.draftEmail!)}
                              >
                                <PencilSimple className="w-3 h-3 mr-1" />
                                Edit & Send
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => handleCopyDraft(message.draftEmail!)}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Email Results */}
                        {message.emails && message.emails.length > 0 && (
                          <div className="space-y-2 w-full">
                            <p className="text-xs text-muted-foreground font-medium">
                              Related Emails ({message.emails.length})
                            </p>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {message.emails.slice(0, 5).map((email) => (
                                <div
                                  key={email.id}
                                  className="p-2 rounded-lg bg-background border hover:bg-muted/50 cursor-pointer transition-colors"
                                  onClick={() => {
                                    setViewMode('search')
                                    setSearchQuery(email.subject.split(' ').slice(0, 3).join(' '))
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className={cn("text-[10px] px-1.5 py-0", getCategoryColor(email.category as CategoryFilter || 'bills'))}>
                                      {email.category || 'bills'}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatDate(email.timestamp)}
                                    </span>
                                    {!email.read && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary ml-auto" />
                                    )}
                                  </div>
                                  <p className="text-xs font-medium truncate">{email.subject}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {email.from.name || email.from.email}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggestions */}
                        {message.suggestions && message.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1 w-full">
                            {message.suggestions.map((suggestion, i) => (
                              <Button
                                key={i}
                                variant="ghost"
                                size="sm"
                                className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => handleAiSuggestion(suggestion)}
                              >
                                <ArrowRight className="w-3 h-3 mr-1" />
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Handoff to General AI Button */}
                        {message.handoffToGeneral && onHandoffToGeneral && (
                          <div className="w-full mt-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                              onClick={() => {
                                onHandoffToGeneral(message.handoffQuery || '')
                                onOpenChange(false) // Close email assistant
                              }}
                            >
                              <Robot className="w-4 h-4" weight="fill" />
                              Ask General AI Assistant
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Loading indicator */}
                  {isAiLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Robot className="w-5 h-5 text-white" weight="fill" />
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                        <Spinner className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Analyzing your emails...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* AI Input */}
            <form onSubmit={handleAiSubmit} className="p-4 border-t flex gap-2 flex-shrink-0">
              <Input
                ref={aiInputRef}
                placeholder="Ask about your emails... (e.g., 'What's urgent today?' or 'Help me reply to...')"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                disabled={isAiLoading}
                className="flex-1"
              />
              {/* Voice input button */}
              <Button
                type="button"
                size="icon"
                variant={isRecording ? "destructive" : "outline"}
                onClick={handleVoiceInput}
                disabled={isAiLoading}
                title={isRecording ? "Stop recording" : "Voice input"}
              >
                <Microphone className={cn("w-5 h-5", isRecording && "animate-pulse")} weight={isRecording ? "fill" : "regular"} />
              </Button>
              <Button type="submit" size="icon" disabled={isAiLoading || !aiQuery.trim()}>
                {isAiLoading ? (
                  <Spinner className="w-5 h-5 animate-spin" />
                ) : (
                  <PaperPlaneTilt className="w-5 h-5" weight="fill" />
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Email Composer Modal with Attachments */}
        {showComposer && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background border rounded-lg shadow-lg w-full max-w-2xl max-h-[90%] flex flex-col">
              <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <PencilSimple className="w-4 h-4" />
                  {draftEmail.replyTo ? 'Reply to Email' : 'Compose New Email'}
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                  setShowComposer(false)
                  setAttachments([])
                }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-3 space-y-3 overflow-auto flex-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium">To</label>
                  <Input
                    placeholder="recipient@email.com"
                    value={draftEmail.to}
                    onChange={(e) => setDraftEmail({ ...draftEmail, to: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Subject</label>
                  <Input
                    placeholder="Email subject"
                    value={draftEmail.subject}
                    onChange={(e) => setDraftEmail({ ...draftEmail, subject: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Message</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => {
                        setAiQuery(`Help me write a professional email to ${draftEmail.to || 'someone'} about "${draftEmail.subject || 'this topic'}"`)
                        setShowComposer(false)
                        handleAiSubmit()
                      }}
                    >
                      <Robot className="w-3 h-3 mr-1" />
                      Get AI Help
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Write your message here..."
                    value={draftEmail.body}
                    onChange={(e) => setDraftEmail({ ...draftEmail, body: e.target.value })}
                    className="min-h-[150px] max-h-[250px] resize-y text-sm"
                  />
                </div>

                {/* Attachments Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      Attachments ({attachments.length})
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files
                        if (!files) return

                        const newAttachments: EmailAttachment[] = []
                        for (const file of Array.from(files)) {
                          // Convert to base64
                          const reader = new FileReader()
                          const base64 = await new Promise<string>((resolve) => {
                            reader.onload = () => {
                              const result = reader.result as string
                              // Remove data URL prefix to get raw base64
                              const base64Data = result.split(',')[1]
                              resolve(base64Data)
                            }
                            reader.readAsDataURL(file)
                          })

                          newAttachments.push({
                            filename: file.name,
                            mimeType: file.type || 'application/octet-stream',
                            data: base64,
                            size: file.size
                          })
                        }

                        setAttachments(prev => [...prev, ...newAttachments])
                        toast.success(`Added ${newAttachments.length} attachment(s)`)
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="w-3 h-3 mr-1" />
                      Add Files
                    </Button>
                  </div>

                  {attachments.length > 0 && (
                    <div className="border rounded-lg p-2 space-y-1 bg-muted/30">
                      {attachments.map((att, index) => (
                        <div key={index} className="flex items-center justify-between text-xs p-1 hover:bg-muted rounded">
                          <div className="flex items-center gap-2 truncate">
                            <File className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{att.filename}</span>
                            <span className="text-muted-foreground">
                              ({(att.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                          >
                            <Trash className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {draftEmail.replyTo && (
                  <div className="p-2 rounded-lg bg-muted text-xs">
                    <p className="font-medium text-muted-foreground mb-1">Replying to:</p>
                    <p className="font-medium">{draftEmail.replyTo.subject}</p>
                    <p className="text-muted-foreground">
                      From: {draftEmail.replyTo.from.name || draftEmail.replyTo.from.email}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-3 border-t flex gap-2 justify-between flex-shrink-0">
                <div className="text-xs text-muted-foreground">
                  {attachments.length > 0 && (
                    <span>{attachments.length} file(s) attached</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setShowComposer(false)
                    setAttachments([])
                  }}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!draftEmail.to || !draftEmail.subject || isSending}
                    onClick={async () => {
                      const accounts = EmailAccountStore.getActiveAccounts()
                      const gmailAccount = accounts.find(a => a.provider === 'gmail')

                      if (gmailAccount) {
                        // Send via Gmail API
                        setIsSending(true)
                        try {
                          const gmail = new GmailProvider()

                          if (draftEmail.replyTo) {
                            // Reply to existing email
                            await gmail.replyToEmail(
                              gmailAccount,
                              draftEmail.replyTo,
                              draftEmail.body,
                              attachments.length > 0 ? attachments : undefined
                            )
                          } else {
                            // Send new email
                            await gmail.sendEmail(gmailAccount, {
                              to: [draftEmail.to],
                              subject: draftEmail.subject,
                              body: draftEmail.body,
                              html: draftEmail.body.replace(/\n/g, '<br>'),
                              attachments: attachments.length > 0 ? attachments : undefined
                            })
                          }

                          toast.success('Email sent successfully via Gmail!')
                          setShowComposer(false)
                          setAttachments([])
                          setDraftEmail({ to: '', subject: '', body: '' })
                        } catch (error) {
                          console.error('Failed to send email:', error)
                          toast.error('Failed to send email. Please try again.')
                        } finally {
                          setIsSending(false)
                        }
                      } else {
                        // Fallback to mailto (no attachments supported)
                        if (attachments.length > 0) {
                          toast.error('Connect Gmail to send attachments')
                          return
                        }
                        toast.success('Opening email client...')
                        const mailto = `mailto:${draftEmail.to}?subject=${encodeURIComponent(draftEmail.subject)}&body=${encodeURIComponent(draftEmail.body)}`
                        window.open(mailto, '_blank')
                        setShowComposer(false)
                      }
                    }}
                  >
                    {isSending ? (
                      <>
                        <Spinner className="w-4 h-4 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <PaperPlane className="w-4 h-4 mr-1" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer - Compact */}
        <div className="px-3 py-2 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
          <span>
            {viewMode === 'search' && results.length > 0 && `${results.length} result(s)`}
            {viewMode === 'ai' && aiMessages.length > 0 && `${aiMessages.length} message(s)`}
            {viewMode === 'ai' && aiMessages.length === 0 && 'Ready'}
          </span>
          <div className="flex items-center gap-3">
            <span>{EmailAccountStore.getActiveAccounts().length} account(s)</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UnifiedEmailSearch
