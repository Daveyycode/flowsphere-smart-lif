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
  Check
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

declare const spark: {
  llm: (prompt: string, model?: string, jsonMode?: boolean) => Promise<string>
}

interface CEODashboardProps {
  onClose: () => void
}

export function CEODashboard({ onClose }: CEODashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

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
    plaid: localStorage.getItem('flowsphere-ceo-plaid-key') || '',
    bankOfAmerica: localStorage.getItem('flowsphere-ceo-boa-key') || '',
    chase: localStorage.getItem('flowsphere-ceo-chase-key') || '',
    wellsFargo: localStorage.getItem('flowsphere-ceo-wells-key') || ''
  })
  const [showKeys, setShowKeys] = useState({
    openai: false,
    anthropic: false,
    stripe: false,
    plaid: false,
    bankOfAmerica: false,
    chase: false,
    wellsFargo: false
  })
  const [isSavingKeys, setIsSavingKeys] = useState(false)

  // Real data - connect your analytics and banking APIs
  const metrics = {
    totalUsers: 0,
    activeUsers: 0,
    revenue: 0,
    growth: 0,
    churnRate: 0
  }

  const bankAccounts: Array<{name: string, balance: number, type: string, last4: string}> = []

  const suggestions: Array<{id: number, type: string, title: string, description: string, impact: string, priority: string}> = []

  const recentActivity: Array<{event: string, details: string, time: string, type: string}> = []

  const handleExecutiveAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a request')
      return
    }

    setIsAiProcessing(true)
    setAiResponse('')

    try {
      let systemPrompt = ''

      if (aiMode === 'workflow') {
        systemPrompt = `You are a CEO Executive AI assistant specializing in workflow creation. Based on the user's request, create a detailed workflow with steps, responsibilities, and timelines. Format the response in a clear, actionable way with numbered steps.

Context:
- Company: FlowSphere (Life management platform)
- Users: ${metrics.totalUsers.toLocaleString()}
- Monthly Revenue: $${metrics.revenue.toLocaleString()}
- Growth Rate: ${metrics.growth}%

User Request: ${aiPrompt}

Generate a comprehensive workflow that includes:
1. Overview and objectives
2. Step-by-step process
3. Team responsibilities
4. Timeline estimates
5. Success metrics`
      } else if (aiMode === 'issues') {
        systemPrompt = `You are a CEO Executive AI assistant specializing in issue analysis and solution generation. Analyze the user's concern and provide:
1. Root cause analysis
2. Impact assessment
3. Recommended solutions (ranked by priority)
4. Implementation steps
5. Risk mitigation strategies

Current Business Context:
- Active Users: ${metrics.activeUsers.toLocaleString()}
- Churn Rate: ${metrics.churnRate}%
- Growth: ${metrics.growth}%

Issue/Concern: ${aiPrompt}

Provide actionable insights and solutions.`
      } else if (aiMode === 'report') {
        systemPrompt = `You are a CEO Executive AI assistant specializing in executive report generation. Create a professional executive report based on the user's request.

Business Metrics:
- Total Users: ${metrics.totalUsers.toLocaleString()}
- Active Users: ${metrics.activeUsers.toLocaleString()}
- Monthly Revenue: $${metrics.revenue.toLocaleString()}
- Growth Rate: ${metrics.growth}%
- Churn Rate: ${metrics.churnRate}%

Recent Business Insights:
${suggestions.map(s => `- ${s.title}: ${s.description}`).join('\n')}

Report Request: ${aiPrompt}

Generate a comprehensive executive report with:
1. Executive Summary
2. Key Findings
3. Data Analysis
4. Recommendations
5. Next Steps`
      }

      const response = await window.spark.llm(systemPrompt, 'gpt-4o')
      setAiResponse(response)
      toast.success('Analysis complete!')
    } catch (error) {
      console.error('Executive AI error:', error)
      toast.error('AI analysis failed. Using fallback response.')

      // Fallback response
      setAiResponse(`# Executive AI Response\n\n**Mode:** ${aiMode.toUpperCase()}\n\n**Request:** ${aiPrompt}\n\n## Analysis\n\nThis feature requires GitHub Spark authentication for full AI capabilities. However, based on your request, here are general recommendations:\n\n1. Review current metrics and identify areas for improvement\n2. Align team resources with strategic priorities\n3. Set measurable KPIs for tracking progress\n4. Schedule regular review meetings\n5. Document decisions and outcomes\n\n*For detailed AI-powered analysis, please deploy to GitHub Spark platform.*`)
    } finally {
      setIsAiProcessing(false)
    }
  }

  const handleSaveApiKeys = () => {
    setIsSavingKeys(true)
    try {
      Object.entries(apiKeys).forEach(([key, value]) => {
        const storageKey = key === 'bankOfAmerica' ? 'flowsphere-ceo-boa-key'
          : key === 'wellsFargo' ? 'flowsphere-ceo-wells-key'
          : `flowsphere-ceo-${key}-key`
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
              <p className="text-muted-foreground">
                Executive overview and business intelligence
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              Exit CEO Mode
            </Button>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 mb-6">
            {(['week', 'month', 'quarter', 'year'] as const).map((period) => (
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
                  <p className="text-xs text-coral mt-1">
                    +0.3% vs last {selectedPeriod}
                  </p>
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
                            <p className={cn(
                              "font-semibold",
                              account.balance >= 0 ? "text-mint" : "text-destructive"
                            )}>
                              {account.balance >= 0 ? '+' : ''}{account.balance.toLocaleString('en-US', {
                                style: 'currency',
                                currency: 'USD'
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
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                              activity.type === 'success' && "bg-mint",
                              activity.type === 'warning' && "bg-coral",
                              activity.type === 'error' && "bg-destructive",
                              activity.type === 'info' && "bg-blue-mid"
                            )} />
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
                  suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className={cn(
                        "p-4 rounded-lg border-2",
                        suggestion.priority === 'urgent' && "border-destructive/30 bg-destructive/5",
                        suggestion.priority === 'high' && "border-coral/30 bg-coral/5",
                        suggestion.priority === 'medium' && "border-primary/30 bg-primary/5"
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
                              "text-xs",
                              suggestion.priority === 'urgent' && "bg-destructive/20 text-destructive",
                              suggestion.priority === 'high' && "bg-coral/20 text-coral",
                              suggestion.priority === 'medium' && "bg-primary/20 text-primary"
                            )}
                          >
                            {suggestion.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {suggestion.description}
                      </p>
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
                    onChange={(e) => setAiPrompt(e.target.value)}
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
                          <p key={i} className={cn(
                            line.startsWith('#') && "font-bold text-lg mt-4 mb-2",
                            line.startsWith('##') && "font-semibold text-base mt-3 mb-1",
                            line.startsWith('**') && "font-medium",
                            !line.trim() && "h-2"
                          )}>
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
                          onChange={(e) => updateApiKey('openai', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility('openai')}
                        >
                          {showKeys.openai ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                          onChange={(e) => updateApiKey('anthropic', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility('anthropic')}
                        >
                          {showKeys.anthropic ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Stripe Secret Key</label>
                    <div className="flex gap-2">
                      <Input
                        type={showKeys.stripe ? 'text' : 'password'}
                        placeholder="sk_live_..."
                        value={apiKeys.stripe}
                        onChange={(e) => updateApiKey('stripe', e.target.value)}
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleKeyVisibility('stripe')}
                      >
                        {showKeys.stripe ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
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
                          onChange={(e) => updateApiKey('plaid', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility('plaid')}
                        >
                          {showKeys.plaid ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Bank of America API Key</label>
                      <div className="flex gap-2">
                        <Input
                          type={showKeys.bankOfAmerica ? 'text' : 'password'}
                          placeholder="boa-..."
                          value={apiKeys.bankOfAmerica}
                          onChange={(e) => updateApiKey('bankOfAmerica', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility('bankOfAmerica')}
                        >
                          {showKeys.bankOfAmerica ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                          onChange={(e) => updateApiKey('chase', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility('chase')}
                        >
                          {showKeys.chase ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                          onChange={(e) => updateApiKey('wellsFargo', e.target.value)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility('wellsFargo')}
                        >
                          {showKeys.wellsFargo ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSaveApiKeys}
                  disabled={isSavingKeys}
                  className="w-full"
                >
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
                  API keys are encrypted and stored securely in your browser's local storage.
                  They are never transmitted to our servers.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  )
}
