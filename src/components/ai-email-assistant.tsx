/**
 * AI Email Assistant - Chat-like interface for natural language email queries
 * Powered by Groq AI
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Robot,
  PaperPlaneTilt,
  Spinner,
  Lightning,
  Envelope,
  Calendar,
  Briefcase,
  Warning,
  User,
  CheckCircle,
  ArrowRight,
  Sparkle,
  SpeakerHigh,
  Stop
} from '@phosphor-icons/react'
import { askEmailAssistant, getEmailOverview, QUICK_ACTIONS, AssistantResponse } from '@/lib/email/ai-email-assistant'
import { Email } from '@/lib/email/email-service'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { speakWithGroq } from '@/lib/groq-voice'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  emails?: Email[]
  suggestions?: string[]
  timestamp: Date
}

interface AIEmailAssistantProps {
  onEmailSelect?: (email: Email) => void
}

export function AIEmailAssistant({ onEmailSelect }: AIEmailAssistantProps) {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [overview, setOverview] = useState<string>('')
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle speaking a message
  const handleSpeak = async (messageId: string, content: string) => {
    // If already speaking this message, stop it
    if (speakingMessageId === messageId && isSpeaking) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setSpeakingMessageId(null)
      setIsSpeaking(false)
      return
    }

    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause()
    }

    try {
      setSpeakingMessageId(messageId)
      setIsSpeaking(true)
      toast.info('Preparing audio...')

      await speakWithGroq(content, 'nova')

      setSpeakingMessageId(null)
      setIsSpeaking(false)
    } catch (error) {
      console.error('TTS error:', error)
      toast.error('Failed to play audio')
      setSpeakingMessageId(null)
      setIsSpeaking(false)
    }
  }

  // Load overview on mount
  useEffect(() => {
    getEmailOverview().then(setOverview)
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setQuery('')
    setIsLoading(true)

    try {
      const response = await askEmailAssistant({ query: userMessage.content })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.summary,
        emails: response.emails,
        suggestions: response.suggestions,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('AI Assistant error:', error)
      toast.error('Failed to get AI response')

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (actionQuery: string) => {
    setQuery(actionQuery)
    setTimeout(() => {
      handleSubmit()
    }, 100)
  }

  const handleSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    inputRef.current?.focus()
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

  const formatEmailDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (days === 1) return 'Yesterday'
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'emergency': return 'text-red-500 bg-red-500/10'
      case 'work': return 'text-blue-500 bg-blue-500/10'
      case 'personal': return 'text-green-500 bg-green-500/10'
      case 'subscription': return 'text-purple-500 bg-purple-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
    }
  }

  return (
    <Card className="h-full flex flex-col bg-gradient-to-b from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Robot className="w-5 h-5 text-white" weight="fill" />
          </div>
          AI Email Assistant
          <Badge variant="secondary" className="ml-auto text-xs">
            <Sparkle className="w-3 h-3 mr-1" weight="fill" />
            Powered by Groq
          </Badge>
        </CardTitle>

        {/* Overview */}
        {overview && messages.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">{overview}</p>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Quick Actions - Show when no messages */}
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Quick Actions
            </p>
            <div className="grid grid-cols-2 gap-2">
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
                    <span className="text-xs">{action.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 -mx-4 px-4" ref={scrollRef}>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
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
                    "flex-1 space-y-2",
                    message.type === 'user' && "flex flex-col items-end"
                  )}>
                    <div className={cn(
                      "rounded-lg p-3 max-w-[85%]",
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

                    {/* Email Results */}
                    {message.emails && message.emails.length > 0 && (
                      <div className="space-y-2 w-full max-w-[85%]">
                        <p className="text-xs text-muted-foreground font-medium">
                          Related Emails ({message.emails.length})
                        </p>
                        <div className="space-y-1">
                          {message.emails.slice(0, 5).map((email) => (
                            <div
                              key={email.id}
                              className="p-2 rounded-lg bg-background border hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => onEmailSelect?.(email)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={cn("text-[10px] px-1.5 py-0", getCategoryColor(email.category))}>
                                  {email.category || 'bills'}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatEmailDate(email.timestamp)}
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
                      <div className="flex flex-wrap gap-1 w-full max-w-[85%]">
                        {message.suggestions.map((suggestion, i) => (
                          <Button
                            key={i}
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => handleSuggestion(suggestion)}
                          >
                            <ArrowRight className="w-3 h-3 mr-1" />
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
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
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask about your emails... (e.g., 'What's urgent today?')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !query.trim()}>
            {isLoading ? (
              <Spinner className="w-5 h-5 animate-spin" />
            ) : (
              <PaperPlaneTilt className="w-5 h-5" weight="fill" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default AIEmailAssistant
