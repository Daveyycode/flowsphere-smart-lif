import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { motion } from 'framer-motion'
import { Bell, Moon, Phone, Envelope, Package, User as UserIcon, CheckCircle, Trash, SpeakerHigh, Stop, GameController, Newspaper, Clock, TrendUp, Warning } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { speakText, stopSpeaking } from '@/lib/audio-summary'

declare const spark: {
  llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => string
  llm: (prompt: string, model?: string, jsonMode?: boolean) => Promise<string>
}

export interface Notification {
  id: string
  category: 'urgent' | 'work' | 'personal' | 'subscription' | 'misc'
  title: string
  message: string
  time: string
  isRead: boolean
  source: string
}

interface GameSession {
  id: string
  childName: string
  game: string
  duration: number
  date: string
}

interface NewsItem {
  id: string
  title: string
  source: string
  category: string
  time: string
  url?: string
}

const mockNews: NewsItem[] = [
  {
    id: '1',
    title: 'Tech stocks rally as AI innovation accelerates',
    source: 'Financial Times',
    category: 'Business',
    time: '2 hours ago'
  },
  {
    id: '2',
    title: 'New study reveals benefits of family time',
    source: 'Health News',
    category: 'Health',
    time: '4 hours ago'
  },
  {
    id: '3',
    title: 'Smart home devices see 40% adoption increase',
    source: 'Tech Daily',
    category: 'Technology',
    time: '5 hours ago'
  },
  {
    id: '4',
    title: 'Weather alert: Clear skies expected this weekend',
    source: 'Weather Channel',
    category: 'Weather',
    time: '6 hours ago'
  }
]

interface NotificationsResourcesViewProps {
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  dndEnabled: boolean
  onDndToggle: (enabled: boolean) => void
  emergencyOverride: number
  onEmergencyOverrideChange: (value: number) => void
}

export function NotificationsResourcesView({
  notifications,
  onMarkRead,
  onDelete,
  dndEnabled,
  onDndToggle,
  emergencyOverride,
  onEmergencyOverrideChange
}: NotificationsResourcesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [activeTab, setActiveTab] = useState<'notifications' | 'monitoring'>('notifications')

  const [gameSessions, setGameSessions] = useKV<GameSession[]>('flowsphere-game-sessions', [
    {
      id: '1',
      childName: 'Alex',
      game: 'Minecraft',
      duration: 45,
      date: new Date().toISOString()
    },
    {
      id: '2',
      childName: 'Emma',
      game: 'Roblox',
      duration: 30,
      date: new Date().toISOString()
    }
  ])

  const [dailyLimit] = useState(120)

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'urgent': return Bell
      case 'work': return Envelope
      case 'personal': return UserIcon
      case 'subscription': return Package
      default: return Bell
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'urgent': return 'destructive'
      case 'work': return 'accent'
      case 'personal': return 'coral'
      case 'subscription': return 'mint'
      default: return 'muted'
    }
  }

  const categoryCounts = {
    all: notifications.length,
    urgent: notifications.filter(n => n.category === 'urgent').length,
    work: notifications.filter(n => n.category === 'work').length,
    personal: notifications.filter(n => n.category === 'personal').length,
    subscription: notifications.filter(n => n.category === 'subscription').length,
    misc: notifications.filter(n => n.category === 'misc').length
  }

  const filteredNotifications = selectedCategory === 'all' 
    ? notifications 
    : notifications.filter(n => n.category === selectedCategory)

  const getTodaysSessions = (childName: string) => {
    const today = new Date().toDateString()
    return (gameSessions || [])
      .filter(session => 
        session.childName === childName && 
        new Date(session.date).toDateString() === today
      )
      .reduce((total, session) => total + session.duration, 0)
  }

  const children = Array.from(new Set((gameSessions || []).map(s => s.childName)))

  const handleDndToggle = (enabled: boolean) => {
    onDndToggle(enabled)
    toast.success(enabled ? 'Do Not Disturb enabled' : 'Do Not Disturb disabled')
  }

  const handleAudioSummary = async () => {
    if (isSpeaking) {
      stopSpeaking()
      setIsSpeaking(false)
      setIsSummarizing(false)
      toast.info('Audio summary stopped')
      return
    }

    setIsSummarizing(true)
    
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead)
      
      if (unreadNotifications.length === 0) {
        await speakText('You have no unread notifications. You are all caught up!')
        toast.success('No unread notifications')
        setIsSummarizing(false)
        return
      }

      const notificationData = unreadNotifications.map(n => ({
        category: n.category,
        title: n.title,
        message: n.message,
        time: n.time
      }))

      const prompt = spark.llmPrompt`You are a friendly AI assistant providing a morning briefing of notifications. 

Here are the unread notifications: ${JSON.stringify(notificationData)}

Create a natural, conversational audio summary (2-3 sentences) that:
1. States the total number of notifications
2. Highlights any urgent items first
3. Groups similar notifications together
4. Uses friendly, casual language suitable for spoken audio

Keep it brief and informative. Return only the summary text, no additional formatting.`

      const summary = await spark.llm(prompt, 'gpt-4o-mini', false)
      
      setIsSpeaking(true)
      await speakText(summary)
      setIsSpeaking(false)
      
      toast.success('Audio summary completed')
    } catch (error) {
      console.error('Error generating audio summary:', error)
      toast.error('Failed to generate audio summary')
    } finally {
      setIsSummarizing(false)
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Notifications & Resources</h1>
          <p className="text-muted-foreground">
            Manage alerts, monitor activities, and stay informed
          </p>
        </div>
        {activeTab === 'notifications' && (
          <Button
            onClick={handleAudioSummary}
            disabled={isSummarizing}
            variant={isSpeaking ? 'destructive' : 'default'}
            className="gap-2"
          >
            {isSpeaking ? (
              <>
                <Stop className="w-5 h-5" weight="fill" />
                Stop Audio
              </>
            ) : isSummarizing ? (
              <>
                <SpeakerHigh className="w-5 h-5 animate-pulse" weight="duotone" />
                Generating...
              </>
            ) : (
              <>
                <SpeakerHigh className="w-5 h-5" weight="duotone" />
                Hear Summary
              </>
            )}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'notifications' | 'monitoring')} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-2">
            <GameController className="w-4 h-4" />
            Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className={`${dndEnabled ? 'bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-full ${dndEnabled ? 'bg-primary/20' : 'bg-muted'} flex items-center justify-center flex-shrink-0`}>
                    <Moon className={`w-6 h-6 ${dndEnabled ? 'text-primary' : 'text-muted-foreground'}`} weight="fill" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">Smart Sleep Guardian</h3>
                        <p className="text-sm text-muted-foreground">
                          {dndEnabled ? 'Your notifications are silenced' : 'Enable to silence notifications while you sleep'}
                        </p>
                      </div>
                      <Switch
                        checked={dndEnabled}
                        onCheckedChange={handleDndToggle}
                      />
                    </div>
                    
                    {dndEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 mt-4"
                      >
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="w-4 h-4 text-primary" weight="duotone" />
                          <span className="text-muted-foreground">
                            Emergency override: {emergencyOverride} calls within 10 minutes
                          </span>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Emergency Override Threshold</Label>
                          <div className="flex items-center space-x-3">
                            <Slider
                              value={[emergencyOverride]}
                              onValueChange={(value) => onEmergencyOverrideChange(value[0])}
                              min={1}
                              max={5}
                              step={1}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium w-8">{emergencyOverride}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">
                All ({categoryCounts.all})
              </TabsTrigger>
              <TabsTrigger value="urgent">
                Urgent ({categoryCounts.urgent})
              </TabsTrigger>
              <TabsTrigger value="work">
                Work ({categoryCounts.work})
              </TabsTrigger>
              <TabsTrigger value="personal">
                Personal ({categoryCounts.personal})
              </TabsTrigger>
              <TabsTrigger value="subscription">
                Subscription ({categoryCounts.subscription})
              </TabsTrigger>
              <TabsTrigger value="misc">
                Misc ({categoryCounts.misc})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedCategory} className="space-y-3">
              {filteredNotifications.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-muted-foreground" weight="duotone" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                    <p className="text-muted-foreground text-sm">
                      No {selectedCategory === 'all' ? '' : selectedCategory} notifications at this time
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {filteredNotifications.map((notification, index) => {
                      const Icon = getCategoryIcon(notification.category)
                      const color = getCategoryColor(notification.category)
                      
                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          <Card className={`${notification.isRead ? 'bg-muted/30' : 'bg-card'} hover:shadow-md transition-all`}>
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <div className={`w-10 h-10 rounded-full bg-${color}/10 flex items-center justify-center flex-shrink-0`}>
                                  <Icon className={`w-5 h-5 text-${color}`} weight="duotone" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-1">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <h4 className={`text-sm font-semibold ${notification.isRead ? 'text-muted-foreground' : ''}`}>
                                          {notification.title}
                                        </h4>
                                        <Badge variant="secondary" className="text-xs">
                                          {notification.source}
                                        </Badge>
                                      </div>
                                      <p className={`text-sm ${notification.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                                        {notification.message}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  {!notification.isRead && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => onMarkRead(notification.id)}
                                    >
                                      <CheckCircle className="w-4 h-4" weight="duotone" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => onDelete(notification.id)}
                                  >
                                    <Trash className="w-4 h-4" weight="duotone" />
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
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <GameController className="w-6 h-6 text-accent" weight="fill" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold font-heading">Game Time Monitoring</h2>
                  <p className="text-sm text-muted-foreground">Daily screen time tracker</p>
                </div>
              </div>

              <div className="space-y-6">
                {children.length > 0 ? (
                  children.map((child) => {
                    const todayMinutes = getTodaysSessions(child)
                    const percentage = (todayMinutes / dailyLimit) * 100
                    const isOverLimit = todayMinutes > dailyLimit

                    return (
                      <motion.div
                        key={child}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{child}</p>
                            <p className="text-sm text-muted-foreground">
                              {todayMinutes} / {dailyLimit} minutes today
                            </p>
                          </div>
                          {isOverLimit && (
                            <Badge variant="destructive" className="gap-1">
                              <Warning className="w-3 h-3" weight="fill" />
                              Over Limit
                            </Badge>
                          )}
                        </div>
                        
                        <Progress 
                          value={Math.min(percentage, 100)} 
                          className={`h-2 ${isOverLimit ? '[&>*]:bg-destructive' : ''}`}
                        />

                        <div className="flex flex-wrap gap-2">
                          {(gameSessions || [])
                            .filter(s => s.childName === child && 
                              new Date(s.date).toDateString() === new Date().toDateString())
                            .map(session => (
                              <Badge key={session.id} variant="secondary" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {session.game}: {session.duration}m
                              </Badge>
                            ))}
                        </div>
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <GameController className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No game sessions tracked today</p>
                    <p className="text-sm">Sessions will appear here automatically</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Daily Limit</span>
                  <span className="font-semibold">{dailyLimit} minutes</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Newspaper className="w-6 h-6 text-primary" weight="fill" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold font-heading">Daily News</h2>
                  <p className="text-sm text-muted-foreground">Today's top stories</p>
                </div>
              </div>

              <div className="space-y-4">
                {mockNews.map((news, index) => (
                  <motion.div
                    key={news.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer bg-secondary/30">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {news.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {news.time}
                            </span>
                          </div>
                          <h3 className="font-semibold text-sm sm:text-base mb-1">
                            {news.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {news.source}
                          </p>
                        </div>
                        <TrendUp className="w-5 h-5 text-primary flex-shrink-0" />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Button variant="outline" className="w-full mt-4">
                Load More News
              </Button>
            </Card>
          </div>

          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
            <h3 className="text-lg font-semibold mb-4 font-heading">Quick Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-primary">{children.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Active Profiles</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-accent">
                  {(gameSessions || []).reduce((sum, s) => sum + s.duration, 0)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Minutes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-coral">{mockNews.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">News Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-mint">{dailyLimit}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Daily Limit</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
