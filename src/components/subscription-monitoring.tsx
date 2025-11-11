import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
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
  Heart
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

declare const spark: {
  llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => string
  llm: (prompt: string, model?: string, jsonMode?: boolean) => Promise<string>
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
}

const mockAIAlerts: AIAlert[] = [
  {
    id: '1',
    subscriptionId: 'sub-1',
    subscriptionName: 'Netflix Premium',
    type: 'duplicate-service',
    message: "I noticed that a subscription for Netflix keeps renewing. I think I also have the same functionality as that subscription - I can provide personalized entertainment recommendations and help coordinate family viewing schedules.",
    suggestion: "Our goal is to help you save money as much as we could, so please don't hesitate to tell us if we need to improve some features so you won't have to pay for other subscriptions. It will always be our honor knowing you want to help us improve our services to satisfy your needs. A dollar is already a whole day of a meal for some people - imagine if we could save those wasted subscriptions and donate them instead 🙂",
    potentialSavings: 19.99,
    timestamp: new Date().toISOString(),
    isRead: false
  },
  {
    id: '2',
    subscriptionId: 'sub-2',
    subscriptionName: 'Spotify Premium',
    type: 'price-increase',
    message: "I noticed a subscription that keeps getting much more each time. The last charge was $10.99, now it's $11.99.",
    suggestion: "Are you actively using this service? If not, we could help you find a more affordable alternative or cancel it to save money for causes that matter.",
    potentialSavings: 12,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    isRead: false
  },
  {
    id: '3',
    subscriptionId: 'sub-3',
    subscriptionName: 'Adobe Creative Cloud',
    type: 'unused',
    message: "I haven't detected any recent activity related to your Adobe Creative Cloud subscription.",
    suggestion: "You're paying $54.99/month. Would you like me to help you explore free alternatives like GIMP or consider pausing this subscription?",
    potentialSavings: 54.99,
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    isRead: true
  }
]

export function SubscriptionMonitoring({ className }: SubscriptionMonitoringProps) {
  const [subscriptions, setSubscriptions] = useKV<Subscription[]>('flowsphere-subscriptions', [
    {
      id: 'sub-1',
      name: 'Netflix Premium',
      category: 'streaming',
      amount: 19.99,
      currency: 'USD',
      billingCycle: 'monthly',
      nextBillingDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      lastAmount: 17.99,
      isActive: true,
      addedBy: 'ai',
      aiDetectedDate: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 'sub-2',
      name: 'Spotify Premium',
      category: 'streaming',
      amount: 11.99,
      currency: 'USD',
      billingCycle: 'monthly',
      nextBillingDate: new Date(Date.now() + 12 * 86400000).toISOString(),
      lastAmount: 10.99,
      isActive: true,
      addedBy: 'user'
    },
    {
      id: 'sub-3',
      name: 'Adobe Creative Cloud',
      category: 'software',
      amount: 54.99,
      currency: 'USD',
      billingCycle: 'monthly',
      nextBillingDate: new Date(Date.now() + 20 * 86400000).toISOString(),
      isActive: true,
      addedBy: 'ai',
      aiDetectedDate: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: 'sub-4',
      name: 'GitHub Pro',
      category: 'software',
      amount: 4.00,
      currency: 'USD',
      billingCycle: 'monthly',
      nextBillingDate: new Date(Date.now() + 25 * 86400000).toISOString(),
      isActive: true,
      addedBy: 'user'
    }
  ])

  const [aiAlerts, setAiAlerts] = useKV<AIAlert[]>('flowsphere-subscription-alerts', mockAIAlerts)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const [newSub, setNewSub] = useState({
    name: '',
    category: 'other' as Subscription['category'],
    amount: '',
    billingCycle: 'monthly' as Subscription['billingCycle'],
    nextBillingDate: ''
  })

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

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true)
    
    try {
      const subsData = subscriptions?.map(s => ({
        name: s.name,
        category: s.category,
        amount: s.amount,
        cycle: s.billingCycle,
        hasIncreased: s.lastAmount && s.amount > s.lastAmount
      }))

      const prompt = spark.llmPrompt`You are a friendly financial advisor AI. Analyze these subscriptions: ${JSON.stringify(subsData)}

Find potential issues:
1. Subscriptions that may have increased in price
2. Duplicate or overlapping services
3. High-cost subscriptions that could be optimized

Return a JSON object with a single property "insights" containing an array of insight objects with: type, subscriptionName, message, suggestion, potentialSavings (number).

Be friendly, helpful, and mention how saving money could help others (like the message about a dollar being a day's meal).`

      const result = await spark.llm(prompt, 'gpt-4o-mini', true)
      const parsed = JSON.parse(result)
      
      if (parsed.insights && parsed.insights.length > 0) {
        const newAlerts: AIAlert[] = parsed.insights.map((insight: any, index: number) => ({
          id: `alert-${Date.now()}-${index}`,
          subscriptionId: subscriptions?.find(s => s.name === insight.subscriptionName)?.id || '',
          subscriptionName: insight.subscriptionName,
          type: insight.type as AIAlert['type'],
          message: insight.message,
          suggestion: insight.suggestion,
          potentialSavings: insight.potentialSavings,
          timestamp: new Date().toISOString(),
          isRead: false
        }))

        setAiAlerts((current) => [...newAlerts, ...(current || [])])
        toast.success(`AI found ${newAlerts.length} new insights!`)
      } else {
        toast.success('Your subscriptions look optimized!')
      }
    } catch (error) {
      console.error('AI analysis error:', error)
      toast.error('Failed to analyze subscriptions')
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
                  <Select value={newSub.category} onValueChange={(value: any) => setNewSub({ ...newSub, category: value })}>
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
                  <Select value={newSub.billingCycle} onValueChange={(value: any) => setNewSub({ ...newSub, billingCycle: value })}>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CurrencyDollar className="w-6 h-6 text-primary" weight="duotone" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Spend</p>
                <p className="text-2xl font-bold">${totalMonthlySpend.toFixed(2)}</p>
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
                <p className="text-2xl font-bold">${totalYearlySpend.toFixed(2)}</p>
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
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" weight="duotone" />
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {subscriptions?.filter(s => s.isActive).map((sub, index) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-secondary/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-3 flex-1">
                            <div className="text-3xl">{getCategoryIcon(sub.category)}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{sub.name}</h4>
                                {sub.addedBy === 'ai' && (
                                  <Badge variant="secondary" className="text-xs">AI Detected</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground capitalize">{sub.category}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <p className="text-lg font-bold text-primary">
                                  ${sub.amount.toFixed(2)}
                                </p>
                                <span className="text-xs text-muted-foreground">/ {sub.billingCycle}</span>
                              </div>
                              {sub.lastAmount && sub.amount > sub.lastAmount && (
                                <Badge variant="destructive" className="mt-2 text-xs gap-1">
                                  <TrendUp className="w-3 h-3" />
                                  Increased from ${sub.lastAmount.toFixed(2)}
                                </Badge>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                Next bill: {formatDate(sub.nextBillingDate)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSubscription(sub.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash className="w-4 h-4" weight="duotone" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                {(!subscriptions || subscriptions.filter(s => s.isActive).length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active subscriptions</p>
                    <p className="text-sm">Add one to start tracking</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" weight="duotone" />
              Upcoming Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingBills.map((sub, index) => {
                const daysUntil = Math.ceil((new Date(sub.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                const isUrgent = daysUntil <= 3
                
                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={isUrgent ? 'border-destructive/50 bg-destructive/5' : 'bg-muted/30'}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{getCategoryIcon(sub.category)}</div>
                            <div>
                              <h4 className="font-semibold">{sub.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(sub.nextBillingDate)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">${sub.amount.toFixed(2)}</p>
                            {isUrgent && (
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
              {upcomingBills.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming bills</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

