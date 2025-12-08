/**
 * User Complaints Submission Form
 * Submit complaints that are automatically handled by AI
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChatCircleDots,
  PaperPlaneTilt,
  Robot,
  CheckCircle,
  Warning,
  X,
  Sparkle,
  EnvelopeSimple
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { processComplaint, type Complaint } from '@/lib/ai-complaint-handler'
import { cn } from '@/lib/utils'

interface UserComplaintsProps {
  userId: string
  userName: string
  userEmail: string
}

export function UserComplaints({ userId, userName, userEmail }: UserComplaintsProps) {
  const [complaints, setComplaints] = useKV<Complaint[]>('flowsphere-user-complaints', [])

  const [showForm, setShowForm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [currentComplaint, setCurrentComplaint] = useState<Complaint | null>(null)

  const [formData, setFormData] = useState({
    category: 'technical' as Complaint['category'],
    priority: 'medium' as Complaint['priority'],
    subject: '',
    description: ''
  })

  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsProcessing(true)

    try {
      // Create new complaint
      const newComplaint: Complaint = {
        id: Date.now().toString(),
        userId,
        userName,
        userEmail,
        category: formData.category,
        priority: formData.priority,
        subject: formData.subject,
        description: formData.description,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Process through AI
      const processedComplaint = await processComplaint(newComplaint)

      // Save to storage
      setComplaints([processedComplaint, ...(complaints || [])])
      setCurrentComplaint(processedComplaint)

      // Show result
      setShowForm(false)
      setShowResult(true)

      // Reset form
      setFormData({
        category: 'technical',
        priority: 'medium',
        subject: '',
        description: ''
      })

      if (processedComplaint.status === 'ai-resolved') {
        toast.success('AI has resolved your complaint!')
      } else {
        toast.success('Complaint escalated to CEO')
      }
    } catch (error) {
      console.error('Error processing complaint:', error)
      toast.error('Failed to submit complaint. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const getPriorityBadge = (priority: Complaint['priority']) => {
    const variants = {
      low: 'bg-green-500/10 text-green-500 border-green-500/20',
      medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      urgent: 'bg-red-500/10 text-red-500 border-red-500/20'
    }
    return (
      <Badge variant="outline" className={cn('text-xs', variants[priority])}>
        {priority.toUpperCase()}
      </Badge>
    )
  }

  const getStatusBadge = (status: Complaint['status']) => {
    const config = {
      'pending': { color: 'bg-gray-500', text: 'Pending', icon: null },
      'ai-analyzing': { color: 'bg-blue-500', text: 'AI Analyzing', icon: <Robot className="w-3 h-3" weight="fill" /> },
      'ai-resolved': { color: 'bg-green-500', text: 'AI Resolved', icon: <CheckCircle className="w-3 h-3" weight="fill" /> },
      'escalated': { color: 'bg-orange-500', text: 'Escalated to CEO', icon: <EnvelopeSimple className="w-3 h-3" weight="fill" /> },
      'closed': { color: 'bg-gray-500', text: 'Closed', icon: <CheckCircle className="w-3 h-3" weight="fill" /> }
    }
    const { color, text, icon } = config[status]

    return (
      <Badge className={cn('text-white gap-1.5', color)}>
        {icon}
        {text}
      </Badge>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold flex items-center gap-1.5">
            <ChatCircleDots className="w-4 h-4 text-accent" weight="duotone" />
            Complaints
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI resolves automatically
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-accent to-primary h-7 text-xs px-3"
          size="sm"
        >
          <PaperPlaneTilt className="w-3 h-3 mr-1.5" weight="fill" />
          Submit
        </Button>
      </div>

      {/* AI Info Banner */}
      <Card className="border-accent/30 bg-gradient-to-r from-accent/5 to-primary/5">
        <CardContent className="p-2">
          <div className="flex items-start gap-2">
            <Robot className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" weight="duotone" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              AI resolves complaints. Unresolved issues escalate to CEO via email.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submission Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border border-accent/30">
              <CardHeader className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-1.5 text-sm">
                      <Sparkle className="w-3.5 h-3.5 text-accent" weight="fill" />
                      New Complaint
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-[10px]">
                      Describe issue
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowForm(false)}
                    className="h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="category" className="text-[10px]">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value as Complaint['category'] })}
                    >
                      <SelectTrigger id="category" className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical" className="text-xs">Technical</SelectItem>
                        <SelectItem value="billing" className="text-xs">Billing</SelectItem>
                        <SelectItem value="feature" className="text-xs">Feature</SelectItem>
                        <SelectItem value="service" className="text-xs">Service</SelectItem>
                        <SelectItem value="other" className="text-xs">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="priority" className="text-[10px]">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value as Complaint['priority'] })}
                    >
                      <SelectTrigger id="priority" className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low" className="text-xs">Low</SelectItem>
                        <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                        <SelectItem value="high" className="text-xs">High</SelectItem>
                        <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="subject" className="text-[10px]">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Issue"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description" className="text-[10px]">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Details..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <Separator className="my-2" />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    size="sm"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-accent to-primary h-7 text-xs"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Robot className="w-3 h-3 mr-1.5 animate-pulse" weight="fill" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <PaperPlaneTilt className="w-3 h-3 mr-1.5" weight="fill" />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && currentComplaint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl"
            >
              <Card className="border-2 border-accent/30 shadow-2xl">
                <CardHeader className={cn(
                  'bg-gradient-to-r',
                  currentComplaint.status === 'ai-resolved'
                    ? 'from-green-500/10 to-green-600/10'
                    : 'from-orange-500/10 to-red-500/10'
                )}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        {currentComplaint.status === 'ai-resolved' ? (
                          <CheckCircle className="w-6 h-6 text-green-500" weight="fill" />
                        ) : (
                          <Warning className="w-6 h-6 text-orange-500" weight="fill" />
                        )}
                        {currentComplaint.status === 'ai-resolved' ? 'AI Resolved!' : 'Escalated to CEO'}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Complaint ID: {currentComplaint.id}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowResult(false)}
                      className="h-8 w-8 flex-shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ScrollArea className="max-h-[60vh]">
                    <div className="space-y-4">
                      {currentComplaint.aiResolution && (
                        <>
                          <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                              <Robot className="w-4 h-4 text-accent" weight="fill" />
                              AI Analysis
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {currentComplaint.aiResolution.analysis}
                            </p>
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                Confidence: {Math.round(currentComplaint.aiResolution.confidence * 100)}%
                              </Badge>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h3 className="font-semibold mb-2">Solution</h3>
                            <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
                              {currentComplaint.aiResolution.solution}
                            </div>
                          </div>
                        </>
                      )}

                      {currentComplaint.escalation && (
                        <>
                          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                              <EnvelopeSimple className="w-4 h-4" weight="fill" />
                              Escalation Notice
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              {currentComplaint.escalation.reason}
                            </p>
                            {currentComplaint.escalation.emailSent && (
                              <Badge className="bg-green-500 text-white gap-1.5">
                                <CheckCircle className="w-3 h-3" weight="fill" />
                                Email sent to CEO
                              </Badge>
                            )}
                          </div>

                          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                            <p className="text-sm">
                              <strong>Next Steps:</strong> The CEO will personally review your complaint and respond via email within 24 hours.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="mt-6 flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowResult(false)}
                    >
                      Close
                    </Button>
                    {currentComplaint.status === 'ai-resolved' && (
                      <Button
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        onClick={() => {
                          toast.success('Marked as helpful!')
                          setShowResult(false)
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" weight="fill" />
                        This Helped
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complaints History */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm">History</CardTitle>
          <CardDescription className="text-[10px]">
            Track status
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3">
          {(!complaints || complaints.length === 0) ? (
            <div className="text-center py-6 text-muted-foreground">
              <ChatCircleDots className="w-8 h-8 mx-auto mb-2 opacity-50" weight="duotone" />
              <p className="text-[10px]">No complaints</p>
            </div>
          ) : (
            <div className="space-y-2">
              {complaints.map((complaint) => (
                <motion.div
                  key={complaint.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2 rounded-lg border border-border hover:border-accent/30 transition-all cursor-pointer"
                  onClick={() => {
                    setCurrentComplaint(complaint)
                    setShowResult(true)
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[10px] truncate">{complaint.subject}</h4>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {new Date(complaint.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {getPriorityBadge(complaint.priority)}
                      {getStatusBadge(complaint.status)}
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground line-clamp-1">
                    {complaint.description}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
