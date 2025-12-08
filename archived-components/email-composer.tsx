/**
 * Email Composer
 * Allows users to compose and send emails through FlowSphere AI Assistant
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Envelope, X, PaperPlaneRight, At, TextAa } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface EmailComposerProps {
  isOpen: boolean
  onClose: () => void
  initialTo?: string
  initialSubject?: string
  initialBody?: string
}

export function EmailComposer({
  isOpen,
  onClose,
  initialTo = '',
  initialSubject = '',
  initialBody = ''
}: EmailComposerProps) {
  const [to, setTo] = useState(initialTo)
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [isSending, setIsSending] = useState(false)

  const handleSend = () => {
    if (!to || !subject || !body) {
      toast.error('Please fill in all fields')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsSending(true)

    try {
      // Use mailto link to open default email client
      const mailtoLink = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

      // Open email client
      window.location.href = mailtoLink

      toast.success('Opening email client...', {
        description: 'Your default email app will handle sending'
      })

      // Reset form after a delay
      setTimeout(() => {
        setTo('')
        setSubject('')
        setBody('')
        setIsSending(false)
        onClose()
      }, 1000)

    } catch (error) {
      console.error('Email send error:', error)
      toast.error('Failed to open email client')
      setIsSending(false)
    }
  }

  const handleCancel = () => {
    if (to || subject || body) {
      const confirmed = window.confirm('Discard draft?')
      if (!confirmed) return
    }
    setTo('')
    setSubject('')
    setBody('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full"
          >
            <Card className="shadow-2xl border-primary/30">
              <CardHeader className="bg-gradient-to-r from-accent via-primary to-coral p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Envelope className="w-6 h-6 text-white" weight="fill" />
                    </div>
                    <CardTitle className="text-white text-lg">Compose Email</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancel}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-to" className="flex items-center gap-2">
                    <At className="w-4 h-4" />
                    To
                  </Label>
                  <Input
                    id="email-to"
                    type="email"
                    placeholder="recipient@example.com"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    disabled={isSending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-subject" className="flex items-center gap-2">
                    <TextAa className="w-4 h-4" />
                    Subject
                  </Label>
                  <Input
                    id="email-subject"
                    type="text"
                    placeholder="Email subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={isSending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-body">Message</Label>
                  <Textarea
                    id="email-body"
                    placeholder="Write your message..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={isSending}
                    rows={10}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-muted-foreground">
                    Opens your default email client
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSending}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSend}
                      disabled={isSending || !to || !subject || !body}
                      className="bg-gradient-to-r from-blue-mid to-blue-deep"
                    >
                      <PaperPlaneRight className="w-4 h-4 mr-2" weight="fill" />
                      {isSending ? 'Opening...' : 'Send Email'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook to parse email commands from natural language
export function parseEmailCommand(input: string): {
  isEmailCommand: boolean
  to?: string
  subject?: string
  body?: string
} {
  const lowerInput = input.toLowerCase()

  // Check for email keywords
  if (!lowerInput.includes('email') && !lowerInput.includes('send') && !lowerInput.includes('message')) {
    return { isEmailCommand: false }
  }

  // Try to extract email address
  const emailMatch = input.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i)
  const to = emailMatch ? emailMatch[1] : undefined

  // Try to extract subject (after "subject:" or "about")
  const subjectMatch = input.match(/(?:subject:|about|regarding)\s+([^.\n]+)/i)
  const subject = subjectMatch ? subjectMatch[1].trim() : undefined

  // Try to extract body (after "saying" or "with message")
  const bodyMatch = input.match(/(?:saying|with message|tell them|message)\s+([^.\n]+)/i)
  const body = bodyMatch ? bodyMatch[1].trim() : undefined

  return {
    isEmailCommand: true,
    to,
    subject,
    body
  }
}
