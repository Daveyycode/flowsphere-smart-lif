import { useState, useEffect, useMemo } from 'react'
import { useKV } from '@/hooks/use-kv'
import { motion } from 'framer-motion'
import {
  CreditCard,
  Plus,
  Trash,
  Warning,
  TrendUp,
  Calendar,
  CurrencyDollar,
  Bell,
  CheckCircle,
  Info,
  Heart,
  Diamond,
  GraduationCap,
  DeviceMobile,
  Database,
  EnvelopeSimple,
  CheckCircle as CheckIcon,
  Envelope,
  Robot,
  Sparkle,
  CaretDown,
  CaretRight,
  Lightning,
  ArrowClockwise
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmailAccountStore, Email } from '@/lib/email/email-service'
import { emailDatabase } from '@/lib/email/email-database'
import { groqChatWithHistory, isGroqConfigured, GroqMessage } from '@/lib/groq-ai'
import { EmailAIClassifier } from '@/lib/email/email-ai-classifier'
import { extractSubscriptionsFromEmails, ExtractedSubscription, analyzeSubscriptions } from '@/lib/email/subscription-extractor'

// Initialize the AI classifier
const emailClassifier = new EmailAIClassifier()

// Interface for grouped emails by sender
interface EmailGroup {
  senderEmail: string
  senderName: string
  emails: Email[]
  latestEmail: Email
  count: number
  isExpanded: boolean
}

export interface Subscription {
  id: string
  name: string
  category: 'streaming' | 'software' | 'fitness' | 'utilities' | 'other'
  amount: number
  currency: string
  billingCycle: 'monthly' | 'yearly' | 'weekly'
  nextBillingDate: string
  lastAmount?: number
  isActive: boolean
  addedBy: 'user' | 'ai'
  aiDetectedDate?: string
  notes?: string
}

export interface AIAlert {
  id: string
  subscriptionId: string
  subscriptionName: string
  type: 'price-increase' | 'duplicate-service' | 'unused' | 'due-soon'
  message: string
  suggestion: string
  potentialSavings?: number
  timestamp: string
  isRead: boolean
}

interface SubscriptionMonitoringProps {
  className?: string
  currentFlowSpherePlan?: 'basic' | 'pro' | 'gold' | 'family'
  isOnTrial?: boolean
  trialDaysRemaining?: number
}

// No mock alerts - AI will generate real alerts based on user's actual subscriptions
const mockAIAlerts: AIAlert[] = []

export function SubscriptionMonitoring({ className, currentFlowSpherePlan = 'basic', isOnTrial = false, trialDaysRemaining = 0 }: SubscriptionMonitoringProps) {
  const [activeAddOns] = useKV<{
    aiTutor: number
    smartDevicePack: number
    extendedMemory: boolean
  }>('flowsphere-active-addons', {
    aiTutor: 0,
    smartDevicePack: 0,
    extendedMemory: false
  })

  // Start with empty subscriptions - users will add their own or AI will detect them
  const [subscriptions, setSubscriptions] = useKV<Subscription[]>('flowsphere-subscriptions', [])

  const [aiAlerts, setAiAlerts] = useKV<AIAlert[]>('flowsphere-subscription-alerts', mockAIAlerts)

  // Real email accounts from EmailAccountStore
  const [realEmailAccounts, setRealEmailAccounts] = useState(EmailAccountStore.getActiveAccounts())

  // Subscription emails from database - only TRUE subscriptions
  const [subscriptionEmails, setSubscriptionEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('')
  const [showAiResult, setShowAiResult] = useState(false)
  const [isVerifyingEmails, setIsVerifyingEmails] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // AI-extracted subscriptions from emails
  const [aiExtractedSubs, setAiExtractedSubs] = useKV<ExtractedSubscription[]>('flowsphere-ai-extracted-subs', [])
  const [isExtractingSubs, setIsExtractingSubs] = useState(false)
  const [extractionInsights, setExtractionInsights] = useState<string[]>([])

  // Email accounts for automatic subscription detection (legacy - kept for compatibility)
  const [connectedEmails, setConnectedEmails] = useKV<{provider: string, email: string, connected: boolean}[]>('flowsphere-connected-emails', [])
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [newEmail, setNewEmail] = useState({ provider: 'gmail', email: '' })
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Group emails by sender (within a week) - memoized for performance
  const groupedEmails = useMemo(() => {
    const groups: Map<string, EmailGroup> = new Map()
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    subscriptionEmails.forEach(email => {
      const senderKey = email.from.email.toLowerCase()
      const emailDate = new Date(email.timestamp)

      if (!groups.has(senderKey)) {
        groups.set(senderKey, {
          senderEmail: email.from.email,
          senderName: email.from.name || email.from.email.split('@')[0],
          emails: [email],
          latestEmail: email,
          count: 1,
          isExpanded: expandedGroups.has(senderKey)
        })
      } else {
        const group = groups.get(senderKey)!
        // Only group emails within a week
        const latestDate = new Date(group.latestEmail.timestamp)
        if (emailDate > oneWeekAgo || Math.abs(emailDate.getTime() - latestDate.getTime()) < 7 * 24 * 60 * 60 * 1000) {
          group.emails.push(email)
          group.count++
          if (emailDate > new Date(group.latestEmail.timestamp)) {
            group.latestEmail = email
          }
        } else {
          // Different week, create new key with date
          const weekKey = `${senderKey}-${emailDate.toISOString().split('T')[0]}`
          if (!groups.has(weekKey)) {
            groups.set(weekKey, {
              senderEmail: email.from.email,
              senderName: email.from.name || email.from.email.split('@')[0],
              emails: [email],
              latestEmail: email,
              count: 1,
              isExpanded: expandedGroups.has(weekKey)
            })
          }
        }
      }
    })

    // Sort by latest email date
    return Array.from(groups.values()).sort((a, b) =>
      new Date(b.latestEmail.timestamp).getTime() - new Date(a.latestEmail.timestamp).getTime()
    )
  }, [subscriptionEmails, expandedGroups])

  // Toggle email group expansion
  const toggleGroupExpansion = (senderKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(senderKey)) {
        newSet.delete(senderKey)
      } else {
        newSet.add(senderKey)
      }
      return newSet
    })
  }

  const [newSub, setNewSub] = useState({
    name: '',
    category: 'other' as Subscription['category'],
    amount: '',
    billingCycle: 'monthly' as Subscription['billingCycle'],
    nextBillingDate: ''
  })

  // Load and verify subscription emails on mount
  useEffect(() => {
    const loadAndVerifySubscriptionEmails = async () => {
      try {
        setIsVerifyingEmails(true)
        // Get emails already categorized as subscription
        const subscriptionEmails = await emailDatabase.getEmailsByCategory('subscription')

        // Also check 'regular' category for emails that might be subscriptions (fallback/uncategorized)
        const regularEmails = await emailDatabase.getEmailsByCategory('regular')

        // Combine and dedupe
        const combined = [...subscriptionEmails]
        const existingIds = new Set(combined.map(e => e.id))
        regularEmails.forEach(email => {
          if (!existingIds.has(email.id)) {
            combined.push(email)
          }
        })

        // Filter to only TRUE subscription emails using AI classifier
        const verifiedEmails: Email[] = []

        for (const email of combined) {
          const result = emailClassifier.isRealSubscriptionEmail(email)
          if (result.isSubscription && result.confidence >= 0.7) {
            verifiedEmails.push(email)
          }
        }

        // Sort by date and set
        setSubscriptionEmails(verifiedEmails.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ))
      } catch (error) {
        console.error('Failed to load subscription emails:', error)
      } finally {
        setIsVerifyingEmails(false)
      }
    }
    loadAndVerifySubscriptionEmails()

    // Refresh email accounts
    setRealEmailAccounts(EmailAccountStore.getActiveAccounts())
  }, [])

  // Re-scan and verify all emails with AI (manual trigger)
  const handleRescanEmails = async () => {
    setIsVerifyingEmails(true)
    toast.info('Scanning emails for subscriptions...')

    try {
      // Get ALL emails from database
      const allEmails = await emailDatabase.getAllEmails()

      // Use AI to verify each email
      const verifiedEmails: Email[] = []
      const batchSize = 10

      for (let i = 0; i < Math.min(allEmails.length, 100); i += batchSize) {
        const batch = allEmails.slice(i, i + batchSize)

        await Promise.all(batch.map(async (email) => {
          // Try AI verification first
          const result = await emailClassifier.verifySubscriptionWithAI(email)
          if (result.isSubscription && result.confidence >= 0.6) {
            verifiedEmails.push(email)
          }
        }))
      }

      setSubscriptionEmails(verifiedEmails.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ))

      toast.success(`Found ${verifiedEmails.length} subscription emails`)
    } catch (error) {
      console.error('Email scan error:', error)
      toast.error('Failed to scan emails')
    } finally {
      setIsVerifyingEmails(false)
    }
  }

  const totalMonthlySpend = subscriptions?.reduce((sum, sub) => {
    if (!sub.isActive) return sum
    if (sub.billingCycle === 'monthly') return sum + sub.amount
    if (sub.billingCycle === 'yearly') return sum + (sub.amount / 12)
    if (sub.billingCycle === 'weekly') return sum + (sub.amount * 4)
    return sum
  }, 0) || 0

  const totalYearlySpend = totalMonthlySpend * 12

  const potentialSavings = aiAlerts?.filter(a => !a.isRead)
    .reduce((sum, alert) => sum + (alert.potentialSavings || 0), 0) || 0

  const upcomingBills = subscriptions?.filter(sub => sub.isActive)
    .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())
    .slice(0, 5) || []

  const handleAddSubscription = () => {
    if (!newSub.name || !newSub.amount || !newSub.nextBillingDate) {
      toast.error('Please fill in all required fields')
      return
    }

    const subscription: Subscription = {
      id: `sub-${Date.now()}`,
      name: newSub.name,
      category: newSub.category,
      amount: parseFloat(newSub.amount),
      currency: 'USD',
      billingCycle: newSub.billingCycle,
      nextBillingDate: newSub.nextBillingDate,
      isActive: true,
      addedBy: 'user'
    }

    setSubscriptions((current) => [...(current || []), subscription])
    toast.success(`Added ${newSub.name} subscription`)
    
    setNewSub({
      name: '',
      category: 'other',
      amount: '',
      billingCycle: 'monthly',
      nextBillingDate: ''
    })
    setIsAddDialogOpen(false)
  }

  const handleDeleteSubscription = (id: string) => {
    const sub = subscriptions?.find(s => s.id === id)
    setSubscriptions((current) => current?.filter(s => s.id !== id) || [])
    toast.success(`Removed ${sub?.name}`)
  }

  const handleToggleActive = (id: string) => {
    setSubscriptions((current) => 
      current?.map(sub => 
        sub.id === id ? { ...sub, isActive: !sub.isActive } : sub
      ) || []
    )
  }

  const handleMarkAlertRead = (id: string) => {
    setAiAlerts((current) =>
      current?.map(alert =>
        alert.id === id ? { ...alert, isRead: true } : alert
      ) || []
    )
  }

  const handleConnectEmail = () => {
    if (!newEmail.email || !newEmail.email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    const emailAccount = {
      provider: newEmail.provider,
      email: newEmail.email,
      connected: true
    }

    setConnectedEmails((current) => [...(current || []), emailAccount])
    toast.success(`Connected ${newEmail.provider} account: ${newEmail.email}`)
    setNewEmail({ provider: 'gmail', email: '' })
    setIsEmailDialogOpen(false)
  }

  const handleDisconnectEmail = (email: string) => {
    setConnectedEmails((current) => (current || []).filter(e => e.email !== email))
    toast.success('Email account disconnected')
  }

  // AI-powered subscription extraction from emails
  const handleExtractSubscriptions = async () => {
    if (subscriptionEmails.length === 0) {
      toast.error('No subscription emails to analyze')
      return
    }

    setIsExtractingSubs(true)
    toast.info('Extracting subscription details from emails...')

    try {
      // Extract subscriptions using Groq AI
      const extracted = await extractSubscriptionsFromEmails(subscriptionEmails)

      if (extracted.length > 0) {
        // Merge with existing AI-extracted subs (avoid duplicates by sender)
        const existingSenders = new Set((aiExtractedSubs || []).map(s => s.senderEmail.toLowerCase()))
        const newSubs = extracted.filter(s => !existingSenders.has(s.senderEmail.toLowerCase()))

        if (newSubs.length > 0) {
          setAiExtractedSubs((current) => [...(current || []), ...newSubs])
          toast.success(`Extracted ${newSubs.length} new subscription(s) from emails!`)
        } else {
          toast.info('No new subscriptions found (all already tracked)')
        }

        // Generate analysis insights
        const analysis = await analyzeSubscriptions([...(aiExtractedSubs || []), ...newSubs])
        setExtractionInsights(analysis.insights)
      } else {
        toast.info('No billable subscriptions detected in emails')
      }
    } catch (error) {
      console.error('Subscription extraction error:', error)
      toast.error('Failed to extract subscriptions')
    } finally {
      setIsExtractingSubs(false)
    }
  }

  // Merge manual subscriptions with AI-extracted for display
  const allActiveSubscriptions = useMemo(() => {
    const manualSubs = (subscriptions || []).map(sub => ({
      ...sub,
      source: 'manual' as const
    }))

    const aiSubs = (aiExtractedSubs || []).map(sub => ({
      id: sub.id,
      name: sub.name,
      category: sub.category === 'ai-services' ? 'software' as const :
               sub.category === 'cloud' ? 'software' as const :
               sub.category === 'productivity' ? 'software' as const :
               sub.category as Subscription['category'],
      amount: sub.amount,
      currency: sub.currency,
      billingCycle: sub.billingCycle as Subscription['billingCycle'],
      nextBillingDate: sub.nextBillingDate,
      isActive: sub.status === 'active',
      addedBy: 'ai' as const,
      aiDetectedDate: sub.extractedAt,
      notes: `Detected from ${sub.emailCount} email(s)`,
      source: 'ai' as const,
      originalCategory: sub.category,
      confidence: sub.confidence
    }))

    return [...manualSubs, ...aiSubs]
  }, [subscriptions, aiExtractedSubs])

  // Calculate totals including AI-extracted subscriptions
  const totalMonthlySpendCombined = useMemo(() => {
    return allActiveSubscriptions.reduce((sum, sub) => {
      if (!sub.isActive) return sum
      if (sub.billingCycle === 'monthly') return sum + sub.amount
      if (sub.billingCycle === 'yearly') return sum + (sub.amount / 12)
      if (sub.billingCycle === 'weekly') return sum + (sub.amount * 4)
      return sum
    }, 0)
  }, [allActiveSubscriptions])

  // Upcoming bills from both manual and AI-extracted
  const upcomingBillsCombined = useMemo(() => {
    const today = new Date()
    return allActiveSubscriptions
      .filter(sub => sub.isActive && sub.nextBillingDate)
      .map(sub => ({
        ...sub,
        daysUntil: Math.ceil((new Date(sub.nextBillingDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }))
      .filter(bill => bill.daysUntil >= 0 && bill.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 10)
  }, [allActiveSubscriptions])

  // Remove AI-extracted subscription
  const handleRemoveAiSubscription = (id: string) => {
    setAiExtractedSubs((current) => (current || []).filter(s => s.id !== id))
    toast.success('Subscription removed')
  }

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true)
    setShowAiResult(false)

    try {
      // Gather all data for AI analysis
      const subsData = subscriptions?.map(s => ({
        name: s.name,
        category: s.category,
        amount: s.amount,
        cycle: s.billingCycle,
        nextBilling: s.nextBillingDate
      })) || []

      const emailData = subscriptionEmails.slice(0, 20).map(e => ({
        from: e.from.email,
        subject: e.subject,
        date: e.timestamp,
        snippet: (e.snippet || e.body || '').substring(0, 200)
      }))

      // Use Groq AI for analysis
      if (isGroqConfigured()) {
        const systemPrompt = `You are FlowSphere's Subscription Analyst AI. Analyze user's subscriptions and subscription-related emails to provide insights.

Your tasks:
1. Identify potential subscription services from emails
2. Detect price changes or billing issues
3. Find duplicate or overlapping services
4. Suggest money-saving opportunities
5. Alert about upcoming renewals

Be friendly, specific, and helpful. Format your response with clear sections and bullet points.`

        const userPrompt = `Analyze my subscriptions and subscription emails:

**Current Tracked Subscriptions (${subsData.length}):**
${subsData.length > 0 ? JSON.stringify(subsData, null, 2) : 'None tracked yet'}

**Recent Subscription Emails (${emailData.length}):**
${emailData.length > 0 ? JSON.stringify(emailData, null, 2) : 'No subscription emails found'}

Please provide:
1. Summary of my subscription situation
2. Any subscriptions detected from emails that I should track
3. Potential savings opportunities
4. Upcoming bills to watch
5. Recommendations for optimization`

        const messages: GroqMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]

        const response = await groqChatWithHistory(messages, {
          model: 'llama-3.3-70b-versatile',
          temperature: 0.6,
          max_tokens: 2048
        })

        setAiAnalysisResult(response)
        setShowAiResult(true)
        toast.success('AI analysis complete!')

        // Also generate alerts from the analysis
        const insights: AIAlert[] = []

        // Auto-detect subscriptions from emails
        subscriptionEmails.slice(0, 10).forEach(email => {
          const knownServices = ['netflix', 'spotify', 'amazon', 'apple', 'google', 'microsoft', 'adobe', 'dropbox', 'zoom', 'slack', 'github', 'notion']
          const emailText = `${email.from.email} ${email.subject}`.toLowerCase()

          knownServices.forEach(service => {
            if (emailText.includes(service) && !subscriptions?.some(s => s.name.toLowerCase().includes(service))) {
              insights.push({
                id: `alert-${Date.now()}-${Math.random()}`,
                subscriptionId: '',
                subscriptionName: service.charAt(0).toUpperCase() + service.slice(1),
                type: 'unused',
                message: `Detected ${service.charAt(0).toUpperCase() + service.slice(1)} in your emails`,
                suggestion: 'Consider adding this to your tracked subscriptions',
                timestamp: new Date().toISOString(),
                isRead: false
              })
            }
          })
        })

        if (insights.length > 0) {
          setAiAlerts((current) => [...insights.slice(0, 5), ...(current || [])])
        }
      } else {
        // Fallback local analysis
        let result = '## Subscription Analysis\n\n'

        if (subsData.length > 0) {
          result += `### Tracked Subscriptions (${subsData.length})\n`
          subsData.forEach(s => {
            result += `- **${s.name}**: $${s.amount}/${s.cycle}\n`
          })
          result += '\n'
        }

        if (emailData.length > 0) {
          result += `### Subscription Emails Found (${emailData.length})\n`
          emailData.slice(0, 5).forEach(e => {
            result += `- From: ${e.from}\n  Subject: ${e.subject}\n`
          })
          result += '\n'
        }

        result += '### Recommendations\n'
        result += '- Configure Groq API key for detailed AI insights\n'
        result += '- Track all subscriptions for better monitoring\n'
        result += '- Review subscription emails regularly\n'

        setAiAnalysisResult(result)
        setShowAiResult(true)
        toast.success('Analysis complete (basic mode)')
      }
    } catch (error) {
      console.error('AI analysis error:', error)
      toast.error('Failed to analyze subscriptions')

      // Show fallback message
      setAiAnalysisResult('Unable to complete AI analysis. Please try again later.')
      setShowAiResult(true)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getCategoryIcon = (category: Subscription['category']) => {
    switch (category) {
      case 'streaming': return '🎬'
      case 'software': return '💻'
      case 'fitness': return '💪'
      case 'utilities': return '⚡'
      default: return '📦'
    }
  }

  const getAlertIcon = (type: AIAlert['type']) => {
    switch (type) {
      case 'price-increase': return TrendUp
      case 'duplicate-service': return Warning
      case 'unused': return Info
      case 'due-soon': return Calendar
      default: return Info
    }
  }

  const getAlertColor = (type: AIAlert['type']) => {
    switch (type) {
      case 'price-increase': return 'text-destructive'
      case 'duplicate-service': return 'text-primary'
      case 'unused': return 'text-accent'
      case 'due-soon': return 'text-mint'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays <= 7) return `In ${diffDays} days`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">Subscription Monitoring</h2>
          <p className="text-muted-foreground">
            AI-powered subscription tracking and optimization
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAIAnalysis} disabled={isAnalyzing} variant="outline" className="gap-2">
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Warning className="w-4 h-4" weight="duotone" />
                AI Analysis
              </>
            )}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" weight="bold" />
                Add Subscription
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Subscription</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="sub-name">Subscription Name *</Label>
                  <Input
                    id="sub-name"
                    value={newSub.name}
                    onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
                    placeholder="Netflix, Spotify, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub-category">Category</Label>
                  <Select value={newSub.category} onValueChange={(value: Subscription['category']) => setNewSub({ ...newSub, category: value })}>
                    <SelectTrigger id="sub-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="streaming">Streaming</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="fitness">Fitness</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub-amount">Amount (USD) *</Label>
                  <Input
                    id="sub-amount"
                    type="number"
                    step="0.01"
                    value={newSub.amount}
                    onChange={(e) => setNewSub({ ...newSub, amount: e.target.value })}
                    placeholder="9.99"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub-cycle">Billing Cycle</Label>
                  <Select value={newSub.billingCycle} onValueChange={(value: Subscription['billingCycle']) => setNewSub({ ...newSub, billingCycle: value })}>
                    <SelectTrigger id="sub-cycle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub-date">Next Billing Date *</Label>
                  <Input
                    id="sub-date"
                    type="date"
                    value={newSub.nextBillingDate}
                    onChange={(e) => setNewSub({ ...newSub, nextBillingDate: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddSubscription} className="w-full">
                  Add Subscription
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-accent/50 bg-gradient-to-br from-accent/5 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EnvelopeSimple className="w-5 h-5 text-accent" weight="fill" />
              Connected Email Accounts
            </div>
            <Badge variant="secondary" className="text-xs">
              {realEmailAccounts.length} connected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {realEmailAccounts.length > 0 ? (
            <div className="space-y-2">
              {realEmailAccounts.map((account, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-accent/5 rounded-lg border border-accent/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <EnvelopeSimple className="w-5 h-5 text-accent" weight="fill" />
                    </div>
                    <div>
                      <p className="font-semibold capitalize">{account.provider}</p>
                      <p className="text-sm text-muted-foreground">{account.email}</p>
                    </div>
                  </div>
                  <Badge className="bg-mint text-mint-foreground">
                    <CheckIcon className="w-3 h-3 mr-1" weight="fill" />
                    Connected
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <EnvelopeSimple className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold mb-1">No email accounts connected</p>
              <p className="text-sm">Go to Notifications tab to connect your email accounts</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Emails Section - Grouped by Sender with Count Badges */}
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-accent/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Envelope className="w-5 h-5 text-purple-500" weight="fill" />
              Subscription Emails
              {isVerifyingEmails && (
                <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRescanEmails}
                disabled={isVerifyingEmails}
                className="text-xs h-7"
              >
                <Robot className="w-3 h-3 mr-1" />
                AI Scan
              </Button>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-500 text-xs">
                {groupedEmails.length} senders • {subscriptionEmails.length} emails
              </Badge>
            </div>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Only showing true subscription emails (billing, renewals, memberships)
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          {groupedEmails.length > 0 ? (
            <ScrollArea className="h-[250px]">
              <div className="space-y-1">
                {groupedEmails.map((group, index) => (
                  <motion.div
                    key={group.senderEmail + index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    {/* Grouped Email Header */}
                    <div
                      className="flex items-center gap-2 p-2 bg-background rounded-lg border hover:border-purple-500/50 cursor-pointer transition-all"
                      onClick={() => group.count > 1 ? toggleGroupExpansion(group.senderEmail.toLowerCase()) : setSelectedEmail(group.latestEmail)}
                    >
                      {/* Expand/Collapse Icon */}
                      {group.count > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleGroupExpansion(group.senderEmail.toLowerCase())
                          }}
                        >
                          {expandedGroups.has(group.senderEmail.toLowerCase()) ? (
                            <CaretDown className="w-3 h-3" />
                          ) : (
                            <CaretRight className="w-3 h-3" />
                          )}
                        </Button>
                      )}

                      {/* Sender Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs truncate">{group.senderName}</span>
                          {group.count > 1 && (
                            <Badge className="h-4 px-1.5 text-[10px] bg-purple-500 text-white">
                              {group.count}
                            </Badge>
                          )}
                          {group.emails.some(e => !e.read) && (
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {group.latestEmail.subject}
                        </p>
                      </div>

                      {/* Date */}
                      <div className="text-[10px] text-muted-foreground flex-shrink-0">
                        {new Date(group.latestEmail.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    {/* Expanded Emails */}
                    {expandedGroups.has(group.senderEmail.toLowerCase()) && group.count > 1 && (
                      <div className="ml-6 mt-1 space-y-1 border-l-2 border-purple-500/30 pl-2">
                        {group.emails.slice(0, 5).map((email) => (
                          <div
                            key={email.id}
                            className="flex items-center gap-2 p-1.5 rounded bg-muted/50 hover:bg-muted cursor-pointer transition-colors text-xs"
                            onClick={() => setSelectedEmail(email)}
                          >
                            <div className="flex-1 truncate">{email.subject}</div>
                            <div className="text-[10px] text-muted-foreground flex-shrink-0">
                              {new Date(email.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        ))}
                        {group.emails.length > 5 && (
                          <p className="text-[10px] text-muted-foreground pl-2">
                            +{group.emails.length - 5} more emails
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Envelope className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No subscription emails found</p>
              <p className="text-xs">Connect your email to see billing & renewal notifications</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Result Dialog */}
      <Dialog open={showAiResult} onOpenChange={setShowAiResult}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Robot className="w-5 h-5 text-primary" weight="fill" />
              AI Subscription Analysis
              <Badge variant="secondary" className="ml-auto">
                <Sparkle className="w-3 h-3 mr-1" weight="fill" />
                Powered by Groq
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {aiAnalysisResult}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Email Preview Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Envelope className="w-5 h-5" />
              Email Details
            </DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">From</p>
                <p className="font-medium">{selectedEmail.from.name || selectedEmail.from.email}</p>
                <p className="text-sm text-muted-foreground">{selectedEmail.from.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subject</p>
                <p className="font-medium">{selectedEmail.subject}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p>{new Date(selectedEmail.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Content</p>
                <div className="p-3 bg-muted rounded-lg text-sm max-h-[200px] overflow-auto">
                  {selectedEmail.body || selectedEmail.snippet || 'No content available'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="border-primary/50 bg-gradient-to-br from-blue-mid/5 via-accent/5 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Diamond className="w-5 h-5 text-primary" weight="fill" />
            Your FlowSphere Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold capitalize">{currentFlowSpherePlan}</h3>
                {currentFlowSpherePlan === 'basic' && <Badge variant="secondary" className="bg-muted text-muted-foreground">🩶 Basic</Badge>}
                {currentFlowSpherePlan === 'pro' && <Badge className="bg-blue-mid text-white">🩵 Pro</Badge>}
                {currentFlowSpherePlan === 'gold' && <Badge className="bg-gradient-to-r from-[#FFD700] to-[#FFB700] text-foreground">💛 Gold</Badge>}
                {currentFlowSpherePlan === 'family' && <Badge className="bg-[#7B61FF] text-white">💎 Family</Badge>}
              </div>
              {isOnTrial && (
                <p className="text-sm text-accent font-medium">
                  🎉 Trial active - {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} remaining
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {currentFlowSpherePlan === 'basic' && 'Access to essential tools'}
                {currentFlowSpherePlan === 'pro' && 'Unlimited AI usage and priority support'}
                {currentFlowSpherePlan === 'gold' && 'Full access with advanced analytics'}
                {currentFlowSpherePlan === 'family' && 'Up to 5 user accounts with team features'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">This feature included in:</p>
              <Badge className="bg-primary text-primary-foreground">Pro & Above</Badge>
            </div>
          </div>
          
          {((activeAddOns?.aiTutor || 0) > 0 || (activeAddOns?.smartDevicePack || 0) > 0 || activeAddOns?.extendedMemory) && (
            <div className="pt-4 mt-4 border-t border-border/50">
              <p className="text-sm font-semibold mb-3">Active Add-Ons:</p>
              <div className="space-y-2">
                {(activeAddOns?.aiTutor || 0) > 0 && (
                  <div className="flex items-center justify-between text-sm bg-accent/5 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-accent" />
                      <span>AI Tutor Module × {activeAddOns?.aiTutor}</span>
                    </div>
                    <span className="font-semibold">${((activeAddOns?.aiTutor || 0) * 14.99).toFixed(2)}/mo</span>
                  </div>
                )}
                {(activeAddOns?.smartDevicePack || 0) > 0 && (
                  <div className="flex items-center justify-between text-sm bg-accent/5 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <DeviceMobile className="w-4 h-4 text-accent" />
                      <span>Smart Device Pack × {activeAddOns?.smartDevicePack}</span>
                    </div>
                    <span className="font-semibold">${((activeAddOns?.smartDevicePack || 0) * 4.99).toFixed(2)}/mo</span>
                  </div>
                )}
                {activeAddOns?.extendedMemory && (
                  <div className="flex items-center justify-between text-sm bg-accent/5 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-accent" />
                      <span>Extended Memory & Analytics</span>
                    </div>
                    <span className="font-semibold">$3.99/mo</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CurrencyDollar className="w-6 h-6 text-primary" weight="duotone" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Spend</p>
                <p className="text-2xl font-bold">${totalMonthlySpendCombined.toFixed(2)}</p>
                {totalMonthlySpendCombined > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {allActiveSubscriptions.filter(s => s.isActive).length} active subscription{allActiveSubscriptions.filter(s => s.isActive).length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendUp className="w-6 h-6 text-accent" weight="duotone" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Yearly Total</p>
                <p className="text-2xl font-bold">${(totalMonthlySpendCombined * 12).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-mint/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-mint" weight="fill" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Potential Savings</p>
                <p className="text-2xl font-bold text-mint">${potentialSavings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Extraction Insights */}
      {extractionInsights.length > 0 && (
        <Card className="border-accent/50 bg-gradient-to-br from-accent/5 to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkle className="w-4 h-4 text-accent" weight="fill" />
              AI Budget Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {extractionInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Lightning className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" weight="fill" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {aiAlerts && aiAlerts.filter(a => !a.isRead).length > 0 && (
        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" weight="fill" />
              AI Insights & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {aiAlerts.filter(a => !a.isRead).map((alert, index) => {
                  const Icon = getAlertIcon(alert.type)
                  const colorClass = getAlertColor(alert.type)
                  
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="bg-card">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <div className={`w-10 h-10 rounded-full bg-background flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                              <Icon className="w-5 h-5" weight="duotone" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold">{alert.subscriptionName}</h4>
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    {alert.type.replace('-', ' ')}
                                  </Badge>
                                </div>
                                {alert.potentialSavings && (
                                  <Badge className="bg-mint text-mint-foreground">
                                    Save ${alert.potentialSavings.toFixed(2)}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-foreground">{alert.message}</p>
                              <p className="text-sm text-muted-foreground italic">{alert.suggestion}</p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAlertRead(alert.id)}
                                className="gap-2 mt-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Mark as Read
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" weight="duotone" />
                Active Subscriptions
                {allActiveSubscriptions.filter(s => s.isActive).length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {allActiveSubscriptions.filter(s => s.isActive).length}
                  </Badge>
                )}
              </div>
              <Button
                onClick={handleExtractSubscriptions}
                disabled={isExtractingSubs || subscriptionEmails.length === 0}
                size="sm"
                variant="outline"
                className="gap-2 text-xs"
              >
                {isExtractingSubs ? (
                  <>
                    <ArrowClockwise className="w-3 h-3 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Lightning className="w-3 h-3" weight="fill" />
                    Extract from Emails
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {allActiveSubscriptions.filter(s => s.isActive).map((sub, index) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`bg-secondary/30 ${sub.source === 'ai' ? 'border-accent/30' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-3 flex-1">
                            <div className="text-3xl">{getCategoryIcon(sub.category)}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-semibold">{sub.name}</h4>
                                {sub.addedBy === 'ai' && (
                                  <Badge className="text-xs bg-accent/20 text-accent border-accent/30">
                                    <Robot className="w-3 h-3 mr-1" />
                                    AI Detected
                                  </Badge>
                                )}
                                {sub.source === 'ai' && 'confidence' in sub && (
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round((sub.confidence as number) * 100)}% confidence
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground capitalize">
                                {'originalCategory' in sub ? sub.originalCategory : sub.category}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <p className="text-lg font-bold text-primary">
                                  ${sub.amount.toFixed(2)}
                                </p>
                                <span className="text-xs text-muted-foreground">/ {sub.billingCycle}</span>
                              </div>
                              {sub.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{sub.notes}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                Next bill: {formatDate(sub.nextBillingDate)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => sub.source === 'ai' ? handleRemoveAiSubscription(sub.id) : handleDeleteSubscription(sub.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash className="w-4 h-4" weight="duotone" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                {allActiveSubscriptions.filter(s => s.isActive).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active subscriptions</p>
                    <p className="text-sm mb-4">Add manually or extract from emails</p>
                    {subscriptionEmails.length > 0 && (
                      <Button
                        onClick={handleExtractSubscriptions}
                        disabled={isExtractingSubs}
                        size="sm"
                        className="gap-2"
                      >
                        <Lightning className="w-4 h-4" weight="fill" />
                        Extract from {subscriptionEmails.length} Emails
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" weight="duotone" />
                Upcoming Bills
                {upcomingBillsCombined.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {upcomingBillsCombined.length} due this month
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingBillsCombined.map((bill, index) => {
                const isUrgent = bill.daysUntil <= 3
                const isDueToday = bill.daysUntil === 0

                return (
                  <motion.div
                    key={bill.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={
                      isDueToday ? 'border-destructive bg-destructive/10' :
                      isUrgent ? 'border-destructive/50 bg-destructive/5' :
                      'bg-muted/30'
                    }>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{getCategoryIcon(bill.category)}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{bill.name}</h4>
                                {bill.source === 'ai' && (
                                  <Robot className="w-3 h-3 text-accent" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {isDueToday ? 'Due Today!' :
                                 bill.daysUntil === 1 ? 'Due Tomorrow' :
                                 `Due in ${bill.daysUntil} days`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">${bill.amount.toFixed(2)}</p>
                            {isDueToday && (
                              <Badge variant="destructive" className="text-xs mt-1">
                                <Warning className="w-3 h-3 mr-1" />
                                Today!
                              </Badge>
                            )}
                            {isUrgent && !isDueToday && (
                              <Badge variant="destructive" className="text-xs mt-1">
                                Due Soon!
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
              {upcomingBillsCombined.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming bills</p>
                  <p className="text-sm">Extract subscriptions from emails to see upcoming bills</p>
                </div>
              )}
              {upcomingBillsCombined.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total due this month:</span>
                    <span className="font-bold text-lg">
                      ${upcomingBillsCombined.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SubscriptionMonitoring
