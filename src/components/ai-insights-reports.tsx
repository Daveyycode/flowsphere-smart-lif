/**
 * AI Insights and Reports
 * AI-powered analytics, suggestions, and improvement recommendations
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkle, TrendUp, TrendDown, Warning, CheckCircle, ChartLine, Users, DeviceMobile, BrainCircuit, LightbulbFilament, ArrowUp, ArrowDown, Eye, Plus, X, ListChecks, Clock } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AIInsight {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  category: 'performance' | 'security' | 'user-experience' | 'revenue' | 'engagement'
  priority: number
  estimatedImpact?: string
}

interface AIReport {
  id: string
  title: string
  type: 'daily' | 'weekly' | 'monthly'
  generatedAt: string
  summary: string
  metrics: {
    label: string
    value: string
    trend: 'up' | 'down' | 'stable'
    percentage: number
  }[]
  recommendations: string[]
}

interface AISuggestion {
  id: string
  category: 'User Experience' | 'Performance' | 'Security' | 'Revenue'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  estimatedTime?: string
  priority: number
}

export function AIInsightsReports() {
  const [activeTab, setActiveTab] = useState<'insights' | 'reports' | 'suggestions'>('insights')
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([])
  const [roadmapItems, setRoadmapItems] = useKV<AISuggestion[]>('flowsphere-ai-roadmap', [])
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedForDetails, setSelectedForDetails] = useState<AISuggestion | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Mock AI insights
  const insights: AIInsight[] = [
    {
      id: '1',
      title: 'Peak Usage Hours Detected',
      description: 'User activity spikes between 8-10 PM. Consider scheduling maintenance outside these hours.',
      impact: 'high',
      category: 'user-experience',
      priority: 1,
      estimatedImpact: '+15% user satisfaction'
    },
    {
      id: '2',
      title: 'Security Update Available',
      description: 'New security patch available for authentication system. Update recommended within 48 hours.',
      impact: 'high',
      category: 'security',
      priority: 1,
      estimatedImpact: 'Critical vulnerability fix'
    },
    {
      id: '3',
      title: 'Premium Conversion Opportunity',
      description: '45% of free users engage with premium features. Targeted campaign could boost conversions.',
      impact: 'high',
      category: 'revenue',
      priority: 2,
      estimatedImpact: '+$2,400 monthly revenue'
    },
    {
      id: '4',
      title: 'Performance Optimization',
      description: 'Dashboard load time increased by 200ms. Optimize image loading and API calls.',
      impact: 'medium',
      category: 'performance',
      priority: 3,
      estimatedImpact: '+8% user retention'
    },
    {
      id: '5',
      title: 'Feature Adoption Rate',
      description: 'Family tracking feature used by only 30% of family plan users. Consider user education.',
      impact: 'medium',
      category: 'engagement',
      priority: 4,
      estimatedImpact: '+20% feature usage'
    }
  ]

  // Mock AI reports
  const reports: AIReport[] = [
    {
      id: '1',
      title: 'Daily Performance Report',
      type: 'daily',
      generatedAt: new Date().toISOString(),
      summary: 'Today showed strong user engagement with a 12% increase in active sessions. Premium subscriptions grew by 3 new users.',
      metrics: [
        { label: 'Active Users', value: '1,284', trend: 'up', percentage: 12 },
        { label: 'New Signups', value: '47', trend: 'up', percentage: 8 },
        { label: 'Premium Conversions', value: '3', trend: 'up', percentage: 15 },
        { label: 'Avg Session Time', value: '12.4 min', trend: 'up', percentage: 5 }
      ],
      recommendations: [
        'Continue momentum with current marketing strategy',
        'Focus on onboarding improvements to convert trial users',
        'Monitor server capacity as user base grows'
      ]
    },
    {
      id: '2',
      title: 'Weekly Analytics Summary',
      type: 'weekly',
      generatedAt: new Date(Date.now() - 86400000).toISOString(),
      summary: 'This week demonstrated steady growth across all key metrics. User retention improved by 7% compared to last week.',
      metrics: [
        { label: 'Total Revenue', value: '$8,947', trend: 'up', percentage: 14 },
        { label: 'User Retention', value: '87%', trend: 'up', percentage: 7 },
        { label: 'Support Tickets', value: '23', trend: 'down', percentage: 18 },
        { label: 'Feature Usage', value: '94%', trend: 'up', percentage: 3 }
      ],
      recommendations: [
        'Allocate resources to high-performing features',
        'Address common support issues proactively',
        'Expand marketing to similar demographics'
      ]
    }
  ]

  // Mock AI suggestions - comprehensive list
  const allSuggestions: AISuggestion[] = [
    // User Experience
    {
      id: 'ux-1',
      category: 'User Experience',
      title: 'Add dark mode toggle to dashboard',
      description: 'Implement a comprehensive dark mode for better accessibility and reduced eye strain during nighttime usage. This will improve user satisfaction and reduce bounce rates during evening hours.',
      impact: 'high',
      estimatedTime: '2-3 days',
      priority: 1
    },
    {
      id: 'ux-2',
      category: 'User Experience',
      title: 'Implement keyboard shortcuts for power users',
      description: 'Add customizable keyboard shortcuts for common actions to improve productivity for advanced users. Focus on navigation, search, and quick actions.',
      impact: 'medium',
      estimatedTime: '3-4 days',
      priority: 3
    },
    {
      id: 'ux-3',
      category: 'User Experience',
      title: 'Create interactive onboarding tutorial',
      description: 'Design a step-by-step guided tour for new users to understand core features. Include tooltips, highlights, and progress tracking to improve feature adoption.',
      impact: 'high',
      estimatedTime: '1 week',
      priority: 2
    },
    {
      id: 'ux-4',
      category: 'User Experience',
      title: 'Add offline mode for critical features',
      description: 'Enable offline functionality for essential features using service workers and local storage. Users can view cached data and sync when connection is restored.',
      impact: 'medium',
      estimatedTime: '1-2 weeks',
      priority: 4
    },
    // Performance
    {
      id: 'perf-1',
      category: 'Performance',
      title: 'Implement lazy loading for images and components',
      description: 'Optimize initial page load by implementing lazy loading for below-the-fold images and code-splitting for heavy components. Expected to reduce initial load time by 40%.',
      impact: 'high',
      estimatedTime: '3-5 days',
      priority: 1
    },
    {
      id: 'perf-2',
      category: 'Performance',
      title: 'Cache frequently accessed API responses',
      description: 'Implement intelligent caching strategy with Redis or in-memory cache for frequently accessed data. This will reduce server load and improve response times.',
      impact: 'high',
      estimatedTime: '4-6 days',
      priority: 2
    },
    {
      id: 'perf-3',
      category: 'Performance',
      title: 'Optimize database queries for family view',
      description: 'Refactor N+1 queries and add proper indexes to family-related database queries. Expected to reduce query time by 60% and improve dashboard load speed.',
      impact: 'medium',
      estimatedTime: '2-3 days',
      priority: 3
    },
    {
      id: 'perf-4',
      category: 'Performance',
      title: 'Enable CDN for static assets',
      description: 'Configure CDN distribution for images, CSS, and JavaScript files to reduce latency for global users. Implement asset optimization and compression.',
      impact: 'medium',
      estimatedTime: '2 days',
      priority: 4
    },
    // Security
    {
      id: 'sec-1',
      category: 'Security',
      title: 'Implement two-factor authentication for all users',
      description: 'Roll out mandatory 2FA using TOTP or SMS verification for enhanced account security. Provide recovery codes and backup authentication methods.',
      impact: 'high',
      estimatedTime: '1-2 weeks',
      priority: 1
    },
    {
      id: 'sec-2',
      category: 'Security',
      title: 'Add session timeout for inactive users',
      description: 'Implement automatic logout after 30 minutes of inactivity with warning notifications. This reduces security risks from unattended sessions.',
      impact: 'medium',
      estimatedTime: '1-2 days',
      priority: 2
    },
    {
      id: 'sec-3',
      category: 'Security',
      title: 'Enable comprehensive audit logs for admin actions',
      description: 'Track and log all administrative actions with timestamps, IP addresses, and user details. Implement log analysis and alerting for suspicious activities.',
      impact: 'high',
      estimatedTime: '5-7 days',
      priority: 3
    },
    {
      id: 'sec-4',
      category: 'Security',
      title: 'Schedule regular security penetration testing',
      description: 'Establish quarterly security audits and penetration testing with certified professionals. Create remediation workflow for identified vulnerabilities.',
      impact: 'high',
      estimatedTime: 'Ongoing',
      priority: 4
    },
    // Revenue
    {
      id: 'rev-1',
      category: 'Revenue',
      title: 'Create annual subscription option with discount',
      description: 'Offer yearly subscription with 20% discount to encourage long-term commitment and improve customer lifetime value. Implement upgrade incentives.',
      impact: 'high',
      estimatedTime: '3-4 days',
      priority: 1
    },
    {
      id: 'rev-2',
      category: 'Revenue',
      title: 'Offer 14-day family plan trial',
      description: 'Provide risk-free trial period for family plans to increase conversion rates. Include automatic reminders and smooth upgrade flow.',
      impact: 'high',
      estimatedTime: '2-3 days',
      priority: 2
    },
    {
      id: 'rev-3',
      category: 'Revenue',
      title: 'Implement referral rewards program',
      description: 'Create incentive system where users earn credits or premium features for successful referrals. Integrate social sharing and tracking.',
      impact: 'medium',
      estimatedTime: '1 week',
      priority: 3
    },
    {
      id: 'rev-4',
      category: 'Revenue',
      title: 'Add premium-only features based on feedback',
      description: 'Develop exclusive features for premium users based on survey data and usage analytics. Focus on high-demand capabilities to justify premium pricing.',
      impact: 'high',
      estimatedTime: '2-3 weeks',
      priority: 4
    }
  ]

  // Filter suggestions based on category
  const filteredSuggestions = categoryFilter === 'all'
    ? allSuggestions
    : allSuggestions.filter(s => s.category === categoryFilter)

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-destructive'
      case 'medium': return 'text-coral'
      case 'low': return 'text-muted-foreground'
      default: return 'text-muted-foreground'
    }
  }

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high': return <Badge className="bg-destructive text-white">High Priority</Badge>
      case 'medium': return <Badge className="bg-coral text-white">Medium</Badge>
      case 'low': return <Badge variant="secondary">Low</Badge>
      default: return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance': return <ChartLine className="w-5 h-5" weight="duotone" />
      case 'security': return <Warning className="w-5 h-5" weight="duotone" />
      case 'user-experience': return <Users className="w-5 h-5" weight="duotone" />
      case 'revenue': return <TrendUp className="w-5 h-5" weight="duotone" />
      case 'engagement': return <DeviceMobile className="w-5 h-5" weight="duotone" />
      default: return <BrainCircuit className="w-5 h-5" weight="duotone" />
    }
  }

  const generateReport = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      toast.success('AI report generated successfully!')
    }, 2000)
  }

  // Handle suggestion selection
  const toggleSuggestion = (id: string) => {
    setSelectedSuggestions(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    )
  }

  // Handle viewing details
  const handleViewDetails = () => {
    if (selectedSuggestions.length === 0) {
      toast.error('Please select at least one suggestion')
      return
    }
    const suggestion = allSuggestions.find(s => s.id === selectedSuggestions[0])
    if (suggestion) {
      setSelectedForDetails(suggestion)
      setShowDetailsModal(true)
    }
  }

  // Handle adding to roadmap
  const handleAddToRoadmap = () => {
    if (selectedSuggestions.length === 0) {
      toast.error('Please select at least one suggestion')
      return
    }

    const newRoadmapItems = allSuggestions.filter(s =>
      selectedSuggestions.includes(s.id) &&
      !roadmapItems?.some(r => r.id === s.id)
    )

    if (newRoadmapItems.length === 0) {
      toast.info('Selected suggestions are already in roadmap')
      return
    }

    setRoadmapItems([...(roadmapItems || []), ...newRoadmapItems])
    toast.success(`Added ${newRoadmapItems.length} suggestion(s) to roadmap!`)
    setSelectedSuggestions([])
  }

  // Get category icon for suggestions
  const getSuggestionCategoryIcon = (category: string) => {
    switch (category) {
      case 'User Experience': return <Users className="w-4 h-4" weight="duotone" />
      case 'Performance': return <ChartLine className="w-4 h-4" weight="duotone" />
      case 'Security': return <Warning className="w-4 h-4" weight="duotone" />
      case 'Revenue': return <TrendUp className="w-4 h-4" weight="duotone" />
      default: return <LightbulbFilament className="w-4 h-4" weight="duotone" />
    }
  }

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'User Experience': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'Performance': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'Security': return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'Revenue': return 'bg-green-500/10 text-green-500 border-green-500/20'
      default: return 'bg-accent/10 text-accent border-accent/20'
    }
  }

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkle className="w-6 h-6 text-white" weight="fill" />
            </div>
            <div>
              <CardTitle className="text-2xl">AI Insights & Reports</CardTitle>
              <CardDescription>Powered by advanced analytics and machine learning</CardDescription>
            </div>
          </div>
          <Button
            onClick={generateReport}
            disabled={isGenerating}
            className="bg-gradient-to-r from-primary to-accent"
          >
            {isGenerating ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                Generating...
              </>
            ) : (
              <>
                <Sparkle className="w-4 h-4 mr-2" weight="fill" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights">
              <BrainCircuit className="w-4 h-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="reports">
              <ChartLine className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              <LightbulbFilament className="w-4 h-4 mr-2" />
              Suggestions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-4 mt-6">
            <div className="grid gap-4">
              {insights.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg bg-accent/10 ${getImpactColor(insight.impact)}`}>
                          {getCategoryIcon(insight.category)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold">{insight.title}</h4>
                            {getImpactBadge(insight.impact)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                          {insight.estimatedImpact && (
                            <Badge variant="outline" className="text-xs">
                              <TrendUp className="w-3 h-3 mr-1" />
                              {insight.estimatedImpact}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 mt-6">
            {reports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <CardDescription className="mt-1">
                          Generated {new Date(report.generatedAt).toLocaleDateString()} at {new Date(report.generatedAt).toLocaleTimeString()}
                        </CardDescription>
                      </div>
                      <Badge className="bg-primary text-white capitalize">{report.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{report.summary}</p>

                    <Separator />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {report.metrics.map((metric, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{metric.label}</span>
                            {metric.trend === 'up' ? (
                              <ArrowUp className="w-4 h-4 text-green-500" weight="bold" />
                            ) : metric.trend === 'down' ? (
                              <ArrowDown className="w-4 h-4 text-destructive" weight="bold" />
                            ) : null}
                          </div>
                          <p className="text-2xl font-bold">{metric.value}</p>
                          <div className="flex items-center gap-1">
                            <Badge variant={metric.trend === 'up' ? 'default' : 'destructive'} className="text-xs">
                              {metric.trend === 'up' ? '+' : '-'}{metric.percentage}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <LightbulbFilament className="w-4 h-4 text-accent" weight="fill" />
                        AI Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {report.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" weight="fill" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="suggestions" className="mt-6">
            <Card className="relative">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <LightbulbFilament className="w-5 h-5 text-accent" weight="fill" />
                      AI-Powered Improvement Suggestions
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Select suggestions to view details or add to your roadmap
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs w-fit">
                    {filteredSuggestions.length} Suggestions
                  </Badge>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    size="sm"
                    variant={categoryFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setCategoryFilter('all')}
                    className="text-xs"
                  >
                    All Categories
                  </Button>
                  {['User Experience', 'Performance', 'Security', 'Revenue'].map((cat) => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={categoryFilter === cat ? 'default' : 'outline'}
                      onClick={() => setCategoryFilter(cat)}
                      className="text-xs"
                    >
                      {getSuggestionCategoryIcon(cat)}
                      <span className="ml-1.5">{cat}</span>
                    </Button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-2">
                    {filteredSuggestions.map((suggestion, idx) => (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          'group relative rounded-lg border-2 p-4 transition-all duration-200 cursor-pointer hover:shadow-md',
                          selectedSuggestions.includes(suggestion.id)
                            ? 'border-accent bg-accent/5 shadow-sm'
                            : 'border-border hover:border-accent/50',
                          roadmapItems?.some(r => r.id === suggestion.id) && 'opacity-60'
                        )}
                        onClick={() => toggleSuggestion(suggestion.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className="mt-0.5">
                            <Checkbox
                              checked={selectedSuggestions.includes(suggestion.id)}
                              onCheckedChange={() => toggleSuggestion(suggestion.id)}
                              className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h4 className="font-semibold text-sm sm:text-base leading-tight">
                                {suggestion.title}
                              </h4>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {roadmapItems?.some(r => r.id === suggestion.id) && (
                                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                                    <ListChecks className="w-3 h-3 mr-1" />
                                    In Roadmap
                                  </Badge>
                                )}
                                {getImpactBadge(suggestion.impact)}
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">
                              {suggestion.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={cn('text-xs', getCategoryColor(suggestion.category))}>
                                {getSuggestionCategoryIcon(suggestion.category)}
                                <span className="ml-1">{suggestion.category}</span>
                              </Badge>
                              {suggestion.estimatedTime && (
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {suggestion.estimatedTime}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                Priority: {suggestion.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Action Buttons - Bottom Right Corner */}
                <AnimatePresence>
                  {selectedSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.9 }}
                      className="absolute bottom-6 right-6 flex items-center gap-2 bg-background/95 backdrop-blur-sm border-2 border-accent rounded-lg p-2 shadow-lg"
                    >
                      <Badge className="bg-accent text-white">
                        {selectedSuggestions.length} Selected
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewDetails()
                        }}
                        className="text-xs"
                      >
                        <Eye className="w-3 h-3 mr-1.5" />
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToRoadmap()
                        }}
                        className="text-xs bg-gradient-to-r from-accent to-primary"
                      >
                        <Plus className="w-3 h-3 mr-1.5" />
                        Add to Roadmap
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Details Modal */}
            <AnimatePresence>
              {showDetailsModal && selectedForDetails && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => setShowDetailsModal(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                  >
                    <Card className="border-2 border-accent/30 shadow-2xl">
                      <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <LightbulbFilament className="w-6 h-6 text-accent" weight="fill" />
                              <CardTitle className="text-xl">{selectedForDetails.title}</CardTitle>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={cn('text-xs', getCategoryColor(selectedForDetails.category))}>
                                {getSuggestionCategoryIcon(selectedForDetails.category)}
                                <span className="ml-1">{selectedForDetails.category}</span>
                              </Badge>
                              {getImpactBadge(selectedForDetails.impact)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDetailsModal(false)}
                            className="h-8 w-8 flex-shrink-0"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6 space-y-6">
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4 text-accent" />
                            Description
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {selectedForDetails.description}
                          </p>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2 text-sm">Impact Level</h4>
                            {getImpactBadge(selectedForDetails.impact)}
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2 text-sm">Estimated Time</h4>
                            <Badge variant="secondary">
                              <Clock className="w-3 h-3 mr-1" />
                              {selectedForDetails.estimatedTime}
                            </Badge>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2 text-sm">Priority</h4>
                            <Badge variant="outline">Level {selectedForDetails.priority}</Badge>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2 text-sm">Category</h4>
                            <Badge variant="outline" className={cn('text-xs', getCategoryColor(selectedForDetails.category))}>
                              {selectedForDetails.category}
                            </Badge>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowDetailsModal(false)}
                            className="flex-1"
                          >
                            Close
                          </Button>
                          <Button
                            onClick={() => {
                              handleAddToRoadmap()
                              setShowDetailsModal(false)
                            }}
                            className="flex-1 bg-gradient-to-r from-accent to-primary"
                            disabled={roadmapItems?.some(r => r.id === selectedForDetails.id)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {roadmapItems?.some(r => r.id === selectedForDetails.id)
                              ? 'Already in Roadmap'
                              : 'Add to Roadmap'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
