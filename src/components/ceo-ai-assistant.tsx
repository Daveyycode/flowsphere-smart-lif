/**
 * CEO Executive AI Assistant
 * Advanced AI-powered assistant for CEO dashboard with:
 * - Daily reporting and analytics
 * - User feedback analysis
 * - Market insights and trends
 * - Innovation recommendations
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChartBar,
  TrendUp,
  Lightbulb,
  Users,
  WarningCircle,
  CheckCircle,
  Sparkle,
  ArrowRight,
  Calendar,
  Globe,
  Brain,
  ChartLineUp,
  Target,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface DailyReport {
  date: string
  totalUsers: number
  activeUsers: number
  newSignups: number
  churnRate: number
  averageSessionTime: string
  mostUsedFeatures: { name: string; usage: number }[]
  userSatisfaction: number
}

interface UserFeedback {
  id: string
  type: 'complaint' | 'suggestion' | 'praise'
  message: string
  category: string
  priority: 'low' | 'medium' | 'high'
  date: string
  status: 'new' | 'reviewed' | 'addressed'
}

interface MarketInsight {
  id: string
  title: string
  description: string
  source: string
  relevance: number
  actionable: boolean
  implementationDifficulty: 'easy' | 'medium' | 'hard'
  potentialImpact: 'low' | 'medium' | 'high'
}

interface AIRecommendation {
  id: string
  title: string
  description: string
  type: 'feature' | 'improvement' | 'optimization' | 'innovation'
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimatedEffort: string
  expectedImpact: string
  reasoning: string
}

export function CEOAIAssistant() {
  const [isLoading, setIsLoading] = useState(false)
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([])
  const [marketInsights, setMarketInsights] = useState<MarketInsight[]>([])
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = () => {
    // Generate mock daily report
    const report: DailyReport = {
      date: new Date().toISOString(),
      totalUsers: 15847,
      activeUsers: 12304,
      newSignups: 284,
      churnRate: 2.3,
      averageSessionTime: '18m 34s',
      mostUsedFeatures: [
        { name: 'Device Control', usage: 89 },
        { name: 'Automations', usage: 76 },
        { name: 'Family Tracking', usage: 68 },
        { name: 'AI Assistant', usage: 85 },
        { name: 'Notifications', usage: 92 },
      ],
      userSatisfaction: 4.6,
    }
    setDailyReport(report)

    // Generate mock user feedback
    const feedback: UserFeedback[] = [
      {
        id: '1',
        type: 'complaint',
        message: 'App is slow when loading automation rules',
        category: 'Performance',
        priority: 'high',
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'new',
      },
      {
        id: '2',
        type: 'suggestion',
        message: 'Add voice commands for device grouping',
        category: 'Feature Request',
        priority: 'medium',
        date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        status: 'new',
      },
      {
        id: '3',
        type: 'praise',
        message: 'Love the new dark mode themes!',
        category: 'UI/UX',
        priority: 'low',
        date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        status: 'reviewed',
      },
      {
        id: '4',
        type: 'suggestion',
        message: 'Integration with Google Calendar for automation scheduling',
        category: 'Integration',
        priority: 'high',
        date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        status: 'new',
      },
      {
        id: '5',
        type: 'complaint',
        message: 'Family location tracking drains battery',
        category: 'Performance',
        priority: 'high',
        date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        status: 'new',
      },
    ]
    setUserFeedback(feedback)
  }

  const generateMarketInsights = async () => {
    setIsGenerating(true)
    toast.info('Fetching latest market trends...')

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      const insights: MarketInsight[] = [
        {
          id: '1',
          title: 'AI-Powered Energy Optimization Trending',
          description:
            'Smart home platforms with AI-driven energy management are seeing 340% growth. Users want automated cost-saving recommendations.',
          source: 'Market Research Q4 2024',
          relevance: 95,
          actionable: true,
          implementationDifficulty: 'medium',
          potentialImpact: 'high',
        },
        {
          id: '2',
          title: 'Matter Protocol Adoption Accelerating',
          description:
            'Cross-platform smart home protocol Matter is being adopted by 78% of new IoT devices. Integration is becoming essential.',
          source: 'IoT Industry Report',
          relevance: 88,
          actionable: true,
          implementationDifficulty: 'hard',
          potentialImpact: 'high',
        },
        {
          id: '3',
          title: 'Voice-First Interfaces Dominating',
          description:
            '62% of smart home users prefer voice commands over manual controls. Natural language processing is key differentiator.',
          source: 'Consumer Behavior Study',
          relevance: 92,
          actionable: true,
          implementationDifficulty: 'medium',
          potentialImpact: 'high',
        },
        {
          id: '4',
          title: 'Predictive Maintenance Gaining Traction',
          description:
            'IoT platforms with predictive device maintenance features reduce support tickets by 45% and increase user retention.',
          source: 'Tech Innovation Report',
          relevance: 85,
          actionable: true,
          implementationDifficulty: 'medium',
          potentialImpact: 'medium',
        },
        {
          id: '5',
          title: 'Privacy-First Features Becoming Standard',
          description:
            'Users demand granular privacy controls. 83% would switch to platforms offering better data transparency.',
          source: 'Privacy & Security Trends',
          relevance: 90,
          actionable: true,
          implementationDifficulty: 'easy',
          potentialImpact: 'high',
        },
      ]

      setMarketInsights(insights)
      toast.success('Market insights updated!')
    } catch (error) {
      toast.error('Failed to fetch market insights')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateAIRecommendations = async () => {
    setIsGenerating(true)
    toast.info('AI is analyzing data and generating recommendations...')

    try {
      await new Promise(resolve => setTimeout(resolve, 2500))

      const aiRecommendations: AIRecommendation[] = [
        {
          id: '1',
          title: 'Implement Smart Energy Analytics Dashboard',
          description:
            'Create a dedicated dashboard showing real-time energy consumption per device with AI-powered cost-saving recommendations. Capitalize on the 340% market growth in energy management.',
          type: 'feature',
          priority: 'critical',
          estimatedEffort: '3-4 weeks',
          expectedImpact: 'High user retention, new revenue stream',
          reasoning:
            'Combines market demand (#1 trending) with user feedback about wanting more value from automation. Could attract environmentally-conscious users.',
        },
        {
          id: '2',
          title: 'Optimize Automation Loading Performance',
          description:
            'Refactor automation rules engine with lazy loading and caching. Address the #1 user complaint about slow loading times.',
          type: 'optimization',
          priority: 'critical',
          estimatedEffort: '2 weeks',
          expectedImpact: 'Reduce complaints by ~50%, improve satisfaction',
          reasoning:
            'Directly addresses high-priority user complaint. Performance issues are driving churn (2.3% rate). Quick win with high impact.',
        },
        {
          id: '3',
          title: 'Advanced Voice Command System',
          description:
            'Expand voice commands to support complex queries, device grouping, and natural language automation creation. Integrate with popular voice assistants.',
          type: 'feature',
          priority: 'high',
          estimatedEffort: '4-6 weeks',
          expectedImpact: 'Market differentiation, increased engagement',
          reasoning:
            'Aligns with market trend (62% prefer voice) and user suggestion. Could become key competitive advantage.',
        },
        {
          id: '4',
          title: 'Battery Optimization for Family Tracking',
          description:
            'Implement intelligent location polling with adaptive intervals based on movement patterns. Use geofencing to reduce GPS usage.',
          type: 'improvement',
          priority: 'high',
          estimatedEffort: '1-2 weeks',
          expectedImpact: 'Reduce battery drain by 60%, increase feature adoption',
          reasoning:
            'Addresses specific high-priority complaint. Family tracking is core feature (68% usage) - optimization will drive adoption.',
        },
        {
          id: '5',
          title: 'Google Calendar Integration for Automations',
          description:
            'Allow users to create automations based on calendar events. "Leaving for work" automation, "Meeting mode" device settings, etc.',
          type: 'innovation',
          priority: 'medium',
          estimatedEffort: '2-3 weeks',
          expectedImpact: 'Unique feature, competitive advantage',
          reasoning:
            'User-suggested feature with high potential. Creates seamless workflow integration that competitors lack.',
        },
        {
          id: '6',
          title: 'Predictive Device Maintenance System',
          description:
            'AI analyzes device performance patterns to predict failures and suggest maintenance before issues occur.',
          type: 'innovation',
          priority: 'medium',
          estimatedEffort: '5-6 weeks',
          expectedImpact: 'Reduce support tickets by 45%, premium feature',
          reasoning:
            'Market trend showing strong ROI. Could be monetized as Pro/Gold feature. Positions FlowSphere as industry leader.',
        },
        {
          id: '7',
          title: 'Enhanced Privacy Dashboard',
          description:
            'Granular privacy controls with data usage transparency, export capabilities, and third-party integration management.',
          type: 'feature',
          priority: 'high',
          estimatedEffort: '2 weeks',
          expectedImpact: 'Build trust, regulatory compliance, user retention',
          reasoning:
            'Privacy is critical (83% would switch platforms). Easy implementation with high trust-building impact.',
        },
      ]

      setRecommendations(aiRecommendations)
      toast.success('AI recommendations generated!')
    } catch (error) {
      toast.error('Failed to generate recommendations')
    } finally {
      setIsGenerating(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-destructive text-destructive-foreground'
      case 'high':
        return 'bg-orange-500 text-white'
      case 'medium':
        return 'bg-blue-mid text-white'
      case 'low':
        return 'bg-muted text-muted-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-green-500'
      case 'medium':
        return 'text-blue-mid'
      case 'low':
        return 'text-muted-foreground'
      default:
        return 'text-muted-foreground'
    }
  }

  const formatRelativeTime = (date: string) => {
    const now = Date.now()
    const then = new Date(date).getTime()
    const diff = now - then
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (hours > 24) return `${Math.floor(hours / 24)}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${minutes}m ago`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <div className="relative">
              <Brain className="w-8 h-8 text-accent" weight="duotone" />
              <Sparkle className="w-4 h-4 text-accent absolute -top-1 -right-1" weight="fill" />
            </div>
            CEO Executive AI Assistant
          </h2>
          <p className="text-muted-foreground mt-1">
            AI-powered insights, market analysis, and strategic recommendations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={generateMarketInsights}
            disabled={isGenerating}
            className="bg-blue-mid hover:bg-blue-mid/90"
          >
            <Globe className="w-4 h-4 mr-2" />
            Fetch Market Insights
          </Button>
          <Button
            onClick={generateAIRecommendations}
            disabled={isGenerating}
            className="bg-accent hover:bg-accent/90"
          >
            <Sparkle className="w-4 h-4 mr-2" weight="fill" />
            Generate AI Recommendations
          </Button>
        </div>
      </div>

      {/* Daily Summary Cards */}
      {dailyReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-blue-mid/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold mt-1">
                      {dailyReport.totalUsers.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                      <TrendUp className="w-3 h-3" weight="bold" />+{dailyReport.newSignups} today
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-mid" weight="duotone" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-accent/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold mt-1">
                      {dailyReport.activeUsers.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((dailyReport.activeUsers / dailyReport.totalUsers) * 100).toFixed(1)}%
                      engagement
                    </p>
                  </div>
                  <ChartLineUp className="w-8 h-8 text-accent" weight="duotone" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-green-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Satisfaction</p>
                    <p className="text-2xl font-bold mt-1">{dailyReport.userSatisfaction}/5.0</p>
                    <p className="text-xs text-green-500 mt-1">Excellent rating</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" weight="duotone" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-orange-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Churn Rate</p>
                    <p className="text-2xl font-bold mt-1">{dailyReport.churnRate}%</p>
                    <p className="text-xs text-orange-500 mt-1">Needs attention</p>
                  </div>
                  <WarningCircle className="w-8 h-8 text-orange-500" weight="duotone" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="feedback">User Feedback</TabsTrigger>
          <TabsTrigger value="market">Market Insights</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBar className="w-5 h-5" weight="duotone" />
                Most Used Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dailyReport?.mostUsedFeatures.map(feature => (
                <div key={feature.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{feature.name}</span>
                    <span className="text-muted-foreground">{feature.usage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${feature.usage}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full bg-gradient-to-r from-blue-mid to-accent"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <div className="grid gap-4">
            {userFeedback.map(feedback => (
              <motion.div
                key={feedback.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card
                  className={cn(
                    'border-l-4',
                    feedback.type === 'complaint' && 'border-l-red-500',
                    feedback.type === 'suggestion' && 'border-l-blue-mid',
                    feedback.type === 'praise' && 'border-l-green-500'
                  )}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant={feedback.type === 'complaint' ? 'destructive' : 'secondary'}
                          >
                            {feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}
                          </Badge>
                          <Badge className={getPriorityColor(feedback.priority)}>
                            {feedback.priority.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{feedback.category}</span>
                        </div>
                        <p className="text-sm mb-2">{feedback.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(feedback.date)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Market Insights Tab */}
        <TabsContent value="market" className="space-y-4">
          {marketInsights.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" weight="duotone" />
                <p className="text-muted-foreground mb-4">No market insights loaded</p>
                <Button onClick={generateMarketInsights} disabled={isGenerating}>
                  <Globe className="w-4 h-4 mr-2" />
                  Fetch Latest Market Insights
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {marketInsights.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-accent/30 hover:border-accent/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TrendUp className="w-5 h-5 text-accent" weight="bold" />
                            {insight.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{insight.source}</p>
                        </div>
                        <Badge className="bg-accent/20 text-accent border-accent/30">
                          {insight.relevance}% Relevant
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm">{insight.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">
                          Difficulty: {insight.implementationDifficulty}
                        </Badge>
                        <Badge
                          className={cn(
                            insight.potentialImpact === 'high' &&
                              'bg-green-500/20 text-green-500 border-green-500/30',
                            insight.potentialImpact === 'medium' &&
                              'bg-blue-mid/20 text-blue-mid border-blue-mid/30',
                            insight.potentialImpact === 'low' && 'bg-muted text-muted-foreground'
                          )}
                        >
                          Impact: {insight.potentialImpact}
                        </Badge>
                        {insight.actionable && (
                          <Badge className="bg-accent text-accent-foreground">Actionable</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" weight="duotone" />
                <p className="text-muted-foreground mb-4">No AI recommendations generated yet</p>
                <Button onClick={generateAIRecommendations} disabled={isGenerating}>
                  <Sparkle className="w-4 h-4 mr-2" weight="fill" />
                  Generate AI Recommendations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recommendations.map((rec, index) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={cn(
                      'border-2 hover:shadow-lg transition-shadow',
                      rec.priority === 'critical' && 'border-destructive/50',
                      rec.priority === 'high' && 'border-orange-500/50',
                      rec.priority === 'medium' && 'border-blue-mid/50',
                      rec.priority === 'low' && 'border-muted'
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority.toUpperCase()} PRIORITY
                            </Badge>
                            <Badge variant="outline">
                              {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}
                            </Badge>
                          </div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-accent" weight="fill" />
                            {rec.title}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm">{rec.description}</p>

                      <Separator />

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Estimated Effort</p>
                          <p className="font-semibold">{rec.estimatedEffort}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Expected Impact</p>
                          <p className="font-semibold">{rec.expectedImpact}</p>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <Brain className="w-4 h-4" weight="duotone" />
                          AI REASONING
                        </p>
                        <p className="text-sm">{rec.reasoning}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button className="flex-1" variant="outline">
                          <Target className="w-4 h-4 mr-2" />
                          Add to Roadmap
                        </Button>
                        <Button className="flex-1">
                          <ArrowRight className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
