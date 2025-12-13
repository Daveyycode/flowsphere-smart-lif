import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChartLine,
  Users,
  CurrencyDollar,
  Bank,
  TrendUp,
  TrendDown,
  Lightbulb,
  Warning,
  ShieldCheck,
  Bell,
  Calendar,
  ArrowRight,
  Robot,
  ListChecks,
  FileText,
  Sparkle,
  Eye,
  EyeSlash,
  Key,
  Check,
  CreditCard,
  Link as LinkIcon,
  Copy,
  ArrowsClockwise,
  Plus,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ceoAI } from '@/lib/claude-ai'
import { paymongo, PayMongoPaymentLink } from '@/lib/paymongo'

interface CEODashboardProps {
  onClose: () => void
}

interface BankAccount {
  name: string
  balance: number
  type: string
  last4: string
}

interface Suggestion {
  id: number
  type: string
  title: string
  description: string
  impact: string
  priority: string
  metric?: string
  action?: string
}

interface RecentActivity {
  event: string
  details: string
  time: string
  type: string
}

interface SubscriptionTier {
  tier: string
  users: number
  revenue: number
  color: string
}

export function CEODashboard({ onClose }: CEODashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>(
    'month'
  )

  // CEO Executive AI state
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [aiMode, setAiMode] = useState<'workflow' | 'issues' | 'report'>('workflow')

  // API Keys state
  const [apiKeys, setApiKeys] = useState({
    openai: localStorage.getItem('flowsphere-ceo-openai-key') || '',
    anthropic: localStorage.getItem('flowsphere-ceo-anthropic-key') || '',
    stripe: localStorage.getItem('flowsphere-ceo-stripe-key') || '',
    paymongoSecret: localStorage.getItem('flowsphere-ceo-paymongo-secret') || '',
    paymongoPublic: localStorage.getItem('flowsphere-ceo-paymongo-public') || '',
    plaid: localStorage.getItem('flowsphere-ceo-plaid-key') || '',
    bankOfAmerica: localStorage.getItem('flowsphere-ceo-boa-key') || '',
    chase: localStorage.getItem('flowsphere-ceo-chase-key') || '',
    wellsFargo: localStorage.getItem('flowsphere-ceo-wells-key') || '',
    // Philippine Banks for payment receiving
    bdo: localStorage.getItem('flowsphere-ceo-bdo-key') || '',
    bpi: localStorage.getItem('flowsphere-ceo-bpi-key') || '',
    metrobank: localStorage.getItem('flowsphere-ceo-metrobank-key') || '',
    unionbank: localStorage.getItem('flowsphere-ceo-unionbank-key') || '',
    gotyme: localStorage.getItem('flowsphere-ceo-gotyme-key') || '',
    gcash: localStorage.getItem('flowsphere-ceo-gcash-key') || '',
    maya: localStorage.getItem('flowsphere-ceo-maya-key') || '',
    otherBanks: localStorage.getItem('flowsphere-ceo-otherbanks-key') || '',
  })
  const [showKeys, setShowKeys] = useState({
    openai: false,
    anthropic: false,
    stripe: false,
    paymongoSecret: false,
    paymongoPublic: false,
    plaid: false,
    bankOfAmerica: false,
    chase: false,
    wellsFargo: false,
    // Philippine Banks
    bdo: false,
    bpi: false,
    metrobank: false,
    unionbank: false,
    gotyme: false,
    gcash: false,
    maya: false,
    otherBanks: false,
  })
  const [isSavingKeys, setIsSavingKeys] = useState(false)

  // PayMongo Payments state
  const [paymentLinks, setPaymentLinks] = useState<PayMongoPaymentLink[]>([])
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)
  const [showCreatePayment, setShowCreatePayment] = useState(false)
  const [newPaymentAmount, setNewPaymentAmount] = useState('')
  const [newPaymentDescription, setNewPaymentDescription] = useState('')
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)

  // Real data - connect your analytics and banking APIs
  const metrics = {
    totalUsers: 0,
    activeUsers: 0,
    revenue: 0,
    growth: 0,
    churnRate: 0,
  }

  const bankAccounts: BankAccount[] = []

  const suggestions: Suggestion[] = []

  const recentActivity: RecentActivity[] = []

  const handleExecutiveAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a request')
      return
    }

    // Check if Claude AI is configured
    if (!ceoAI.isConfigured()) {
      toast.error('Please add your Anthropic API key in the API Keys section below')
      setAiResponse(
        `# Claude AI Not Configured\n\nTo use the CEO Executive AI, please add your **Anthropic API key** in the "API Keys & Integrations" section below.\n\n## How to get an API key:\n1. Visit [console.anthropic.com](https://console.anthropic.com)\n2. Create an account or sign in\n3. Go to API Keys section\n4. Generate a new key (starts with "sk-ant-...")\n5. Paste it in the Anthropic API Key field below\n\nOnce configured, you'll have access to:\n- **Workflow Generation** - Create detailed action plans\n- **Issue Analysis** - Debug and troubleshoot problems\n- **Report Generation** - Generate executive reports\n- **Security Guard** - Analyze risks and vulnerabilities`
      )
      return
    }

    setIsAiProcessing(true)
    setAiResponse('')

    try {
      let response = ''

      if (aiMode === 'workflow') {
        response = await ceoAI.generateWorkflow(aiPrompt, {
          totalUsers: metrics.totalUsers,
          revenue: metrics.revenue,
          growthRate: metrics.growth,
        })
      } else if (aiMode === 'issues') {
        response = await ceoAI.analyzeIssues(aiPrompt, {
          activeUsers: metrics.activeUsers,
          churnRate: metrics.churnRate,
          growthRate: metrics.growth,
        })
      } else if (aiMode === 'report') {
        response = await ceoAI.generateReport(aiPrompt, {
          totalUsers: metrics.totalUsers,
          activeUsers: metrics.activeUsers,
          revenue: metrics.revenue,
          growthRate: metrics.growth,
          churnRate: metrics.churnRate,
          suggestions: suggestions.map(s => ({ title: s.title, description: s.description })),
        })
      }

      setAiResponse(response)
      toast.success('Analysis complete!')
    } catch (error: unknown) {
      console.error('Executive AI error:', error)

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (errorMessage === 'NO_API_KEY') {
        toast.error('Please add your Anthropic API key')
        setAiResponse(
          `# API Key Required\n\nPlease add your Anthropic API key in the "API Keys & Integrations" section below to use Claude AI.`
        )
      } else if (errorMessage === 'INVALID_API_KEY') {
        toast.error('Invalid API key')
        setAiResponse(
          `# Invalid API Key\n\nThe Anthropic API key appears to be invalid. Please check your key and try again.\n\nMake sure your key starts with "sk-ant-..."`
        )
      } else if (errorMessage === 'RATE_LIMITED') {
        toast.error('Rate limited - please try again later')
        setAiResponse(`# Rate Limited\n\nToo many requests. Please wait a moment and try again.`)
      } else {
        toast.error('AI analysis failed')
        setAiResponse(
          `# Analysis Error\n\n**Mode:** ${aiMode.toUpperCase()}\n\n**Request:** ${aiPrompt}\n\n## Error\n\n${errorMessage}\n\nPlease check your API key configuration and try again.`
        )
      }
    } finally {
      setIsAiProcessing(false)
    }
  }

  const handleSaveApiKeys = () => {
    setIsSavingKeys(true)
    try {
      Object.entries(apiKeys).forEach(([key, value]) => {
        let storageKey = `flowsphere-ceo-${key}-key`
        if (key === 'bankOfAmerica') storageKey = 'flowsphere-ceo-boa-key'
        else if (key === 'wellsFargo') storageKey = 'flowsphere-ceo-wells-key'
        else if (key === 'paymongoSecret') storageKey = 'flowsphere-ceo-paymongo-secret'
        else if (key === 'paymongoPublic') storageKey = 'flowsphere-ceo-paymongo-public'

        if (value) {
          localStorage.setItem(storageKey, value)
        } else {
          localStorage.removeItem(storageKey)
        }
      })
      toast.success('API keys saved securely!')
    } catch (error) {
      console.error('Error saving API keys:', error)
      toast.error('Failed to save API keys')
    } finally {
      setTimeout(() => setIsSavingKeys(false), 500)
    }
  }

  // PayMongo Payment Functions
  const loadPaymentLinks = async () => {
    if (!paymongo.isConfigured()) {
      toast.error('Please configure PayMongo API keys first')
      return
    }

    setIsLoadingPayments(true)
    try {
      const links = await paymongo.listPaymentLinks()
      setPaymentLinks(links.filter(l => !l.attributes.archived).slice(0, 10))
    } catch (error) {
      console.error('Failed to load payment links:', error)
      toast.error('Failed to load payment links')
    } finally {
      setIsLoadingPayments(false)
    }
  }

  const createPaymentLink = async () => {
    if (!newPaymentAmount || !newPaymentDescription) {
      toast.error('Please enter amount and description')
      return
    }

    const amount = parseFloat(newPaymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setIsCreatingPayment(true)
    try {
      const link = await paymongo.createPaymentLink({
        amount: paymongo.parseAmount(amount),
        description: newPaymentDescription,
        remarks: 'FlowSphere Payment',
      })

      setPaymentLinks(prev => [link, ...prev])
      setNewPaymentAmount('')
      setNewPaymentDescription('')
      setShowCreatePayment(false)
      toast.success('Payment link created!')

      // Copy to clipboard
      navigator.clipboard.writeText(link.attributes.checkout_url)
      toast.success('Link copied to clipboard!')
    } catch (error: unknown) {
      console.error('Failed to create payment link:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create payment link'
      toast.error(errorMessage)
    } finally {
      setIsCreatingPayment(false)
    }
  }

  const copyPaymentLink = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('Payment link copied!')
  }

  const refreshPaymentStatus = async (linkId: string) => {
    try {
      const updatedLink = await paymongo.getPaymentLink(linkId)
      setPaymentLinks(prev => prev.map(l => (l.id === linkId ? updatedLink : l)))
      toast.success('Payment status refreshed')
    } catch (error) {
      toast.error('Failed to refresh status')
    }
  }

  const toggleKeyVisibility = (keyName: keyof typeof showKeys) => {
    setShowKeys(prev => ({ ...prev, [keyName]: !prev[keyName] }))
  }

  const updateApiKey = (keyName: keyof typeof apiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [keyName]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <ScrollArea className="h-full">
        <div className="container max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-8 h-8 text-primary" weight="fill" />
                <h1 className="text-3xl sm:text-4xl font-bold">CEO Dashboard</h1>
              </div>
              <p className="text-muted-foreground">Executive overview and business intelligence</p>
            </div>
            <Button variant="outline" onClick={onClose}>
              Exit CEO Mode
            </Button>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 mb-6">
            {(['week', 'month', 'quarter', 'year'] as const).map(period => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
                className="capitalize"
              >
                {period}
              </Button>
            ))}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 text-primary" weight="duotone" />
                    <Badge variant="secondary" className="bg-mint/20 text-mint">
                      +{metrics.growth}%
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold">{metrics.totalUsers.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.activeUsers.toLocaleString()} active
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <CurrencyDollar className="w-8 h-8 text-accent" weight="duotone" />
                    <TrendUp className="w-5 h-5 text-mint" weight="bold" />
                  </div>
                  <p className="text-3xl font-bold">${(metrics.revenue / 1000).toFixed(1)}K</p>
                  <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                  <p className="text-xs text-mint mt-1">
                    +{metrics.growth}% vs last {selectedPeriod}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <ChartLine className="w-8 h-8 text-coral" weight="duotone" />
                    <TrendDown className="w-5 h-5 text-coral" weight="bold" />
                  </div>
                  <p className="text-3xl font-bold">{metrics.churnRate}%</p>
                  <p className="text-sm text-muted-foreground">Churn Rate</p>
                  <p className="text-xs text-coral mt-1">+0.3% vs last {selectedPeriod}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Bank className="w-8 h-8 text-blue-mid" weight="duotone" />
                    <Badge variant="secondary" className="bg-mint/20 text-mint">
                      Healthy
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold">
                    ${(bankAccounts.reduce((sum, acc) => sum + acc.balance, 0) / 1000).toFixed(0)}K
                  </p>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across {bankAccounts.length} accounts
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Bank Accounts */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bank className="w-5 h-5" weight="duotone" />
                    Bank Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {bankAccounts.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <div className="w-16 h-16 mx-auto rounded-full bg-blue-mid/20 flex items-center justify-center">
                        <Bank className="w-8 h-8 text-blue-mid" weight="duotone" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">No Bank Accounts Connected</h3>
                        <p className="text-sm text-muted-foreground">
                          Connect your bank accounts to view balances and transactions
                        </p>
                      </div>
                      <Button className="mt-4">
                        <span className="text-lg mr-2">+</span>
                        Connect Your Bank
                      </Button>
                    </div>
                  ) : (
                    <>
                      {bankAccounts.map((account, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{account.name}</p>
                              <p className="text-xs text-muted-foreground">•••• {account.last4}</p>
                            </div>
                            <p
                              className={cn(
                                'font-semibold',
                                account.balance >= 0 ? 'text-mint' : 'text-destructive'
                              )}
                            >
                              {account.balance >= 0 ? '+' : ''}
                              {account.balance.toLocaleString('en-US', {
                                style: 'currency',
                                currency: 'USD',
                              })}
                            </p>
                          </div>
                          {index < bankAccounts.length - 1 && <Separator className="mt-3" />}
                        </div>
                      ))}
                      <Button variant="outline" className="w-full mt-4" size="sm">
                        View All Accounts
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" weight="duotone" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                        <Bell className="w-8 h-8 text-primary" weight="duotone" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">No Recent Activity</h3>
                        <p className="text-sm text-muted-foreground">
                          Activity will appear here once you connect your services
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {recentActivity.map((activity, index) => (
                        <div key={index}>
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                                activity.type === 'success' && 'bg-mint',
                                activity.type === 'warning' && 'bg-coral',
                                activity.type === 'error' && 'bg-destructive',
                                activity.type === 'info' && 'bg-blue-mid'
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{activity.event}</p>
                              <p className="text-xs text-muted-foreground">{activity.details}</p>
                              <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                            </div>
                          </div>
                          {index < recentActivity.length - 1 && <Separator className="mt-3" />}
                        </div>
                      ))}
                      <Button variant="outline" className="w-full mt-4" size="sm">
                        View All Activity
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* AI Suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" weight="duotone" />
                  AI-Powered Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {suggestions.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                      <Lightbulb className="w-8 h-8 text-primary" weight="duotone" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">No AI Suggestions Yet</h3>
                      <p className="text-sm text-muted-foreground">
                        AI-powered insights will appear here as data becomes available
                      </p>
                    </div>
                  </div>
                ) : (
                  suggestions.map(suggestion => (
                    <div
                      key={suggestion.id}
                      className={cn(
                        'p-4 rounded-lg border-2',
                        suggestion.priority === 'urgent' &&
                          'border-destructive/30 bg-destructive/5',
                        suggestion.priority === 'high' && 'border-coral/30 bg-coral/5',
                        suggestion.priority === 'medium' && 'border-primary/30 bg-primary/5'
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {suggestion.type === 'opportunity' ? (
                            <TrendUp className="w-5 h-5 text-mint" weight="bold" />
                          ) : (
                            <Warning className="w-5 h-5 text-coral" weight="fill" />
                          )}
                          <h4 className="font-semibold">{suggestion.title}</h4>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            {suggestion.impact} Impact
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs',
                              suggestion.priority === 'urgent' &&
                                'bg-destructive/20 text-destructive',
                              suggestion.priority === 'high' && 'bg-coral/20 text-coral',
                              suggestion.priority === 'medium' && 'bg-primary/20 text-primary'
                            )}
                          >
                            {suggestion.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
                      <Button variant="outline" size="sm">
                        Review Details
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* PayMongo Payment Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" weight="duotone" />
                    Payment Links
                    <Badge variant="secondary" className="ml-2">
                      PayMongo
                    </Badge>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadPaymentLinks}
                      disabled={isLoadingPayments}
                    >
                      <ArrowsClockwise
                        className={cn('w-4 h-4 mr-1', isLoadingPayments && 'animate-spin')}
                      />
                      Refresh
                    </Button>
                    <Button size="sm" onClick={() => setShowCreatePayment(!showCreatePayment)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Create Link
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create Payment Form */}
                {showCreatePayment && (
                  <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                    <h4 className="font-medium text-sm">Create Payment Link</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Amount (PHP)</label>
                        <Input
                          type="number"
                          placeholder="100.00"
                          value={newPaymentAmount}
                          onChange={e => setNewPaymentAmount(e.target.value)}
                          min="1"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Description</label>
                        <Input
                          placeholder="Payment for..."
                          value={newPaymentDescription}
                          onChange={e => setNewPaymentDescription(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={createPaymentLink}
                        disabled={isCreatingPayment}
                        className="flex-1"
                      >
                        {isCreatingPayment ? 'Creating...' : 'Create & Copy Link'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreatePayment(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Payment Links List */}
                {!paymongo.isConfigured() ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                      <CreditCard className="w-8 h-8 text-primary" weight="duotone" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">PayMongo Not Configured</h3>
                      <p className="text-sm text-muted-foreground">
                        Add your PayMongo API keys below to create payment links
                      </p>
                    </div>
                  </div>
                ) : paymentLinks.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                      <LinkIcon className="w-8 h-8 text-primary" weight="duotone" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">No Payment Links</h3>
                      <p className="text-sm text-muted-foreground">
                        Create a payment link or click Refresh to load existing ones
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentLinks.map(link => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {link.attributes.description}
                            </p>
                            <Badge
                              variant="secondary"
                              className={paymongo.getStatusColor(link.attributes.status)}
                            >
                              {link.attributes.status}
                            </Badge>
                          </div>
                          <p className="text-lg font-bold text-primary">
                            {paymongo.formatAmount(link.attributes.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Ref: {link.attributes.reference_number}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyPaymentLink(link.attributes.checkout_url)}
                            title="Copy link"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => refreshPaymentStatus(link.id)}
                            title="Refresh status"
                          >
                            <ArrowsClockwise className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(link.attributes.checkout_url, '_blank')}
                            title="Open payment page"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Accepts GCash, Maya, Credit/Debit Cards, and Bank Transfers
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* CEO Executive AI */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Robot className="w-5 h-5 text-accent" weight="duotone" />
                  CEO Executive AI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mode Selector */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={aiMode === 'workflow' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAiMode('workflow')}
                    className="flex items-center gap-2"
                  >
                    <ListChecks className="w-4 h-4" />
                    Workflow
                  </Button>
                  <Button
                    variant={aiMode === 'issues' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAiMode('issues')}
                    className="flex items-center gap-2"
                  >
                    <Warning className="w-4 h-4" />
                    Issues & Solutions
                  </Button>
                  <Button
                    variant={aiMode === 'report' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAiMode('report')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Report
                  </Button>
                </div>

                {/* AI Prompt Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {aiMode === 'workflow' && 'Describe the workflow you need'}
                    {aiMode === 'issues' && 'Describe the issue or concern'}
                    {aiMode === 'report' && 'What report do you need?'}
                  </label>
                  <Textarea
                    placeholder={
                      aiMode === 'workflow'
                        ? 'Example: Create a workflow for onboarding new enterprise customers...'
                        : aiMode === 'issues'
                          ? 'Example: We are experiencing high churn in the EU market...'
                          : 'Example: Generate a quarterly business review report...'
                    }
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    rows={4}
                    disabled={isAiProcessing}
                  />
                </div>

                {/* Analyze Button */}
                <Button
                  onClick={handleExecutiveAI}
                  disabled={isAiProcessing || !aiPrompt.trim()}
                  className="w-full"
                >
                  {isAiProcessing ? (
                    <>
                      <Sparkle className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkle className="w-4 h-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>

                {/* AI Response Display */}
                {aiResponse && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkle className="w-4 h-4 text-accent" weight="fill" />
                      <p className="font-semibold text-sm">AI Analysis</p>
                    </div>
                    <ScrollArea className="max-h-[400px]">
                      <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
                        {aiResponse.split('\n').map((line, i) => (
                          <p
                            key={i}
                            className={cn(
                              line.startsWith('#') && 'font-bold text-lg mt-4 mb-2',
                              line.startsWith('##') && 'font-semibold text-base mt-3 mb-1',
                              line.startsWith('**') && 'font-medium',
                              !line.trim() && 'h-2'
                            )}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* API Keys Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" weight="duotone" />
                    API Keys & Integrations
                  </CardTitle>
                  <Badge variant="secondary" className="bg-mint/20 text-mint">
                    <ShieldCheck className="w-3 h-3 mr-1" weight="fill" />
                    Secure
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* AI Services */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Robot className="w-4 h-4" weight="duotone" />
                    AI Services
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">OpenAI API Key</label>
                      <div className="flex gap-2">
                        <Input
                          type={showKeys.openai ? 'text' : 'password'}
                          placeholder="sk-..."
                          value={apiKeys.openai}
                          onChange={e => updateApiKey('openai', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility('openai')}
                        >
                          {showKeys.openai ? (
                            <EyeSlash className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Anthropic API Key</label>
                      <div className="flex gap-2">
                        <Input
                          type={showKeys.anthropic ? 'text' : 'password'}
                          placeholder="sk-ant-..."
                          value={apiKeys.anthropic}
                          onChange={e => updateApiKey('anthropic', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility('anthropic')}
                        >
                          {showKeys.anthropic ? (
                            <EyeSlash className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Payment Processing */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <CurrencyDollar className="w-4 h-4" weight="duotone" />
                    Payment Processing
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Stripe Secret Key</label>
                      <div className="flex gap-2">
                        <Input
                          type={showKeys.stripe ? 'text' : 'password'}
                          placeholder="sk_live_..."
                          value={apiKeys.stripe}
                          onChange={e => updateApiKey('stripe', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility('stripe')}
                        >
                          {showKeys.stripe ? (
                            <EyeSlash className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* PayMongo for Philippine Payments */}
                    <div className="pt-3 border-t">
                      <p className="text-xs text-primary font-medium mb-3 flex items-center gap-2">
                        <span>🇵🇭</span> PayMongo (GCash, Maya, Cards)
                      </p>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">PayMongo Secret Key</label>
                        <div className="flex gap-2">
                          <Input
                            type={showKeys.paymongoSecret ? 'text' : 'password'}
                            placeholder="sk_live_..."
                            value={apiKeys.paymongoSecret}
                            onChange={e => updateApiKey('paymongoSecret', e.target.value)}
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => toggleKeyVisibility('paymongoSecret')}
                          >
                            {showKeys.paymongoSecret ? (
                              <EyeSlash className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 mt-2">
                        <label className="text-xs text-muted-foreground">PayMongo Public Key</label>
                        <div className="flex gap-2">
                          <Input
                            type={showKeys.paymongoPublic ? 'text' : 'password'}
                            placeholder="pk_live_..."
                            value={apiKeys.paymongoPublic}
                            onChange={e => updateApiKey('paymongoPublic', e.target.value)}
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => toggleKeyVisibility('paymongoPublic')}
                          >
                            {showKeys.paymongoPublic ? (
                              <EyeSlash className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Banking Integrations */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Bank className="w-4 h-4" weight="duotone" />
                    Banking Integrations
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Plaid API Key</label>
                      <div className="flex gap-2">
                        <Input
                          type={showKeys.plaid ? 'text' : 'password'}
                          placeholder="access-..."
                          value={apiKeys.plaid}
                          onChange={e => updateApiKey('plaid', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility('plaid')}
                        >
                          {showKeys.plaid ? (
                            <EyeSlash className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">
                        Bank of America API Key
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type={showKeys.bankOfAmerica ? 'text' : 'password'}
                          placeholder="boa-..."
                          value={apiKeys.bankOfAmerica}
                          onChange={e => updateApiKey('bankOfAmerica', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility('bankOfAmerica')}
                        >
                          {showKeys.bankOfAmerica ? (
                            <EyeSlash className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Chase API Key</label>
                      <div className="flex gap-2">
                        <Input
                          type={showKeys.chase ? 'text' : 'password'}
                          placeholder="chase-..."
                          value={apiKeys.chase}
                          onChange={e => updateApiKey('chase', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility('chase')}
                        >
                          {showKeys.chase ? (
                            <EyeSlash className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Wells Fargo API Key</label>
                      <div className="flex gap-2">
                        <Input
                          type={showKeys.wellsFargo ? 'text' : 'password'}
                          placeholder="wf-..."
                          value={apiKeys.wellsFargo}
                          onChange={e => updateApiKey('wellsFargo', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility('wellsFargo')}
                        >
                          {showKeys.wellsFargo ? (
                            <EyeSlash className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Philippine Banks Section */}
                    <div className="col-span-2 mt-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                        <span>🇵🇭</span> Philippine Payment Receivers
                      </h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Configure your Philippine bank accounts to receive payments from users
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">
                            BDO Unibank Account
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type={showKeys.bdo ? 'text' : 'password'}
                              placeholder="Account number..."
                              value={apiKeys.bdo}
                              onChange={e => updateApiKey('bdo', e.target.value)}
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleKeyVisibility('bdo')}
                            >
                              {showKeys.bdo ? (
                                <EyeSlash className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">BPI Account</label>
                          <div className="flex gap-2">
                            <Input
                              type={showKeys.bpi ? 'text' : 'password'}
                              placeholder="Account number..."
                              value={apiKeys.bpi}
                              onChange={e => updateApiKey('bpi', e.target.value)}
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleKeyVisibility('bpi')}
                            >
                              {showKeys.bpi ? (
                                <EyeSlash className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Metrobank Account</label>
                          <div className="flex gap-2">
                            <Input
                              type={showKeys.metrobank ? 'text' : 'password'}
                              placeholder="Account number..."
                              value={apiKeys.metrobank}
                              onChange={e => updateApiKey('metrobank', e.target.value)}
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleKeyVisibility('metrobank')}
                            >
                              {showKeys.metrobank ? (
                                <EyeSlash className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">UnionBank Account</label>
                          <div className="flex gap-2">
                            <Input
                              type={showKeys.unionbank ? 'text' : 'password'}
                              placeholder="Account number..."
                              value={apiKeys.unionbank}
                              onChange={e => updateApiKey('unionbank', e.target.value)}
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleKeyVisibility('unionbank')}
                            >
                              {showKeys.unionbank ? (
                                <EyeSlash className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">GCash Number</label>
                          <div className="flex gap-2">
                            <Input
                              type={showKeys.gcash ? 'text' : 'password'}
                              placeholder="+63..."
                              value={apiKeys.gcash}
                              onChange={e => updateApiKey('gcash', e.target.value)}
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleKeyVisibility('gcash')}
                            >
                              {showKeys.gcash ? (
                                <EyeSlash className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Maya Number</label>
                          <div className="flex gap-2">
                            <Input
                              type={showKeys.maya ? 'text' : 'password'}
                              placeholder="+63..."
                              value={apiKeys.maya}
                              onChange={e => updateApiKey('maya', e.target.value)}
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleKeyVisibility('maya')}
                            >
                              {showKeys.maya ? (
                                <EyeSlash className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">
                            GoTyme Bank Account
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type={showKeys.gotyme ? 'text' : 'password'}
                              placeholder="Account number..."
                              value={apiKeys.gotyme}
                              onChange={e => updateApiKey('gotyme', e.target.value)}
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleKeyVisibility('gotyme')}
                            >
                              {showKeys.gotyme ? (
                                <EyeSlash className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2 col-span-2">
                          <label className="text-xs text-muted-foreground">
                            Other Banks (Name: Account)
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type={showKeys.otherBanks ? 'text' : 'password'}
                              placeholder="Bank Name: Account Number..."
                              value={apiKeys.otherBanks}
                              onChange={e => updateApiKey('otherBanks', e.target.value)}
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleKeyVisibility('otherBanks')}
                            >
                              {showKeys.otherBanks ? (
                                <EyeSlash className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <Button onClick={handleSaveApiKeys} disabled={isSavingKeys} className="w-full">
                  {isSavingKeys ? (
                    <>
                      <Check className="w-4 h-4 mr-2 animate-pulse" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" weight="fill" />
                      Save API Keys
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  API keys are encrypted and stored securely in your browser's local storage. They
                  are never transmitted to our servers.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  )
}
