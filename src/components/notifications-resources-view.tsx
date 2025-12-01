import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { motion } from 'framer-motion'
import { Bell, Moon, Phone, Envelope, Package, User as UserIcon, CheckCircle, Trash, SpeakerHigh, Stop, GameController, Newspaper, Clock, TrendUp, Warning, CreditCard, Camera, MagnifyingGlass, Funnel, ShieldCheck, DotsThreeVertical, Plus, X as XIcon } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { speakText, stopSpeaking } from '@/lib/audio-summary'
import { SubscriptionMonitoring } from '@/components/subscription-monitoring'
import { CCTVGuardAI } from '@/components/cctv-guard-ai'
import { useIsMobile } from '@/hooks/use-mobile'
import { fetchDailyNews, NewsItem } from '@/lib/news-api'

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
  const isMobile = useIsMobile()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [activeTab, setActiveTab] = useState<'notifications' | 'monitoring' | 'subscriptions' | 'cctv'>('notifications')
  const [news, setNews] = useKV<NewsItem[]>('flowsphere-daily-news', [])
  const [isLoadingNews, setIsLoadingNews] = useState(false)

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchFilters, setShowSearchFilters] = useState(false)
  const [searchTimeRange, setSearchTimeRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [searchAccount, setSearchAccount] = useState<string>('all')
  const [searchSender, setSearchSender] = useState<string>('all')
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [hasSearchConsent, setHasSearchConsent] = useKV<boolean>('flowsphere-email-search-consent', false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Notification[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Connected Accounts Management
  const [showAccountsDialog, setShowAccountsDialog] = useState(false)
  const [connectedAccounts, setConnectedAccounts] = useKV<Array<{
    id: string
    type: 'email' | 'social'
    provider: string
    email: string
    isActive: boolean
  }>>('flowsphere-connected-accounts', [])
  const [newAccountEmail, setNewAccountEmail] = useState('')
  const [newAccountType, setNewAccountType] = useState<'email' | 'social'>('email')
  const [newAccountProvider, setNewAccountProvider] = useState('gmail')

  // DND Settings
  const [showDndSettings, setShowDndSettings] = useState(false)
  const [dndBehavior, setDndBehavior] = useKV<'silence-all' | 'allow-favorites' | 'allow-repeated'>('flowsphere-dnd-behavior', 'allow-repeated')
  const [emergencyContacts, setEmergencyContacts] = useKV<string[]>('flowsphere-emergency-contacts', [])
  const [newContact, setNewContact] = useState('')

  const [gameSessions, setGameSessions] = useKV<GameSession[]>('flowsphere-game-sessions', [])

  const [dailyLimit] = useState(120)

  // Fetch real-time news on component mount
  useEffect(() => {
    const loadNews = async () => {
      setIsLoadingNews(true)
      try {
        const fetchedNews = await fetchDailyNews('general', 10)
        if (fetchedNews.length > 0) {
          setNews(fetchedNews)
        }
      } catch (error) {
        console.error('Failed to load news:', error)
      } finally {
        setIsLoadingNews(false)
      }
    }

    // Load news if we don't have any cached
    if (!news || news.length === 0) {
      loadNews()
    }
  }, []) // Only run once on mount

  const handleLoadMoreNews = async () => {
    setIsLoadingNews(true)
    try {
      const fetchedNews = await fetchDailyNews('general', 10)
      if (fetchedNews.length > 0) {
        setNews(fetchedNews)
        toast.success('News refreshed!')
      }
    } catch (error) {
      console.error('Failed to load news:', error)
      toast.error('Failed to refresh news')
    } finally {
      setIsLoadingNews(false)
    }
  }

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

  // Get unique senders from notifications
  const uniqueSenders = Array.from(new Set(notifications.map(n => n.source)))

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term')
      return
    }

    // Check for consent first
    if (!hasSearchConsent) {
      setShowConsentDialog(true)
      return
    }

    performSearch()
  }

  const handleAddAccount = () => {
    if (!newAccountEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    const newAccount = {
      id: Date.now().toString(),
      type: newAccountType,
      provider: newAccountProvider,
      email: newAccountEmail,
      isActive: true
    }

    setConnectedAccounts([...(connectedAccounts || []), newAccount])
    setNewAccountEmail('')
    toast.success(`${newAccountProvider} account added successfully!`)
  }

  const handleRemoveAccount = (id: string) => {
    setConnectedAccounts((connectedAccounts || []).filter(acc => acc.id !== id))
    toast.success('Account removed')
  }

  const handleToggleAccount = (id: string) => {
    setConnectedAccounts((connectedAccounts || []).map(acc =>
      acc.id === id ? { ...acc, isActive: !acc.isActive } : acc
    ))
  }

  const performSearch = async () => {
    setIsSearching(true)
    setShowConsentDialog(false)

    try {
      // Filter by time range
      let timeFiltered = [...notifications]
      const now = new Date()

      if (searchTimeRange === 'today') {
        timeFiltered = timeFiltered.filter(n => {
          const notifTime = new Date(n.time)
          return notifTime.toDateString() === now.toDateString()
        })
      } else if (searchTimeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        timeFiltered = timeFiltered.filter(n => new Date(n.time) >= weekAgo)
      } else if (searchTimeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        timeFiltered = timeFiltered.filter(n => new Date(n.time) >= monthAgo)
      }

      // Filter by sender
      if (searchSender !== 'all') {
        timeFiltered = timeFiltered.filter(n => n.source === searchSender)
      }

      // AI-powered semantic search
      const searchTerm = searchQuery.toLowerCase().trim()

      // Try to use AI for semantic search (finding related terms)
      let aiExpandedTerms: string[] = [searchTerm]

      try {
        const prompt = `Given the search term "${searchQuery}", list related terms, synonyms, and common abbreviations that might appear in emails. For example, "DOLE" could relate to "Department of Labor and Employment", "labor department", etc. Return ONLY a comma-separated list of terms, no explanations.`

        const response = await window.spark.llm(prompt, 'gpt-4o-mini')
        const terms = response.split(',').map(t => t.trim().toLowerCase())
        aiExpandedTerms = [searchTerm, ...terms]
      } catch (error) {
        console.log('AI expansion not available, using direct search')
      }

      // Search through notifications
      const results = timeFiltered.filter(n => {
        const searchableText = `${n.title} ${n.message} ${n.source}`.toLowerCase()
        return aiExpandedTerms.some(term => searchableText.includes(term))
      })

      setSearchResults(results)
      setShowSearchResults(true)
      toast.success(`Found ${results.length} result${results.length !== 1 ? 's' : ''}`)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Search failed')
    } finally {
      setIsSearching(false)
    }
  }

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
  }

  const handleAddContact = () => {
    if (newContact.trim()) {
      setEmergencyContacts([...(emergencyContacts || []), newContact.trim()])
      setNewContact('')
      toast.success('Emergency contact added')
    }
  }

  const handleRemoveContact = (contact: string) => {
    setEmergencyContacts((emergencyContacts || []).filter(c => c !== contact))
    toast.success('Emergency contact removed')
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

      // Generate simple summary without LLM to avoid auth errors
      const urgentCount = unreadNotifications.filter(n => n.category === 'urgent').length
      const workCount = unreadNotifications.filter(n => n.category === 'work').length
      const personalCount = unreadNotifications.filter(n => n.category === 'personal').length

      let summary = `You have ${unreadNotifications.length} unread notification${unreadNotifications.length > 1 ? 's' : ''}. `

      if (urgentCount > 0) {
        summary += `${urgentCount} ${urgentCount === 1 ? 'is' : 'are'} urgent. `
      }
      if (workCount > 0) {
        summary += `You have ${workCount} work message${workCount > 1 ? 's' : ''}. `
      }
      if (personalCount > 0) {
        summary += `And ${personalCount} personal notification${personalCount > 1 ? 's' : ''}. `
      }

      // Add first urgent notification details if any
      if (urgentCount > 0) {
        const firstUrgent = unreadNotifications.find(n => n.category === 'urgent')
        if (firstUrgent) {
          summary += `Your most urgent item: ${firstUrgent.title}.`
        }
      }
      
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'notifications' | 'monitoring' | 'subscriptions' | 'cctv')} className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            {!isMobile && "Notifications"}
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2">
            <CreditCard className="w-4 h-4" />
            {!isMobile && "Subscriptions"}
          </TabsTrigger>
          <TabsTrigger value="cctv" className="gap-2">
            <Camera className="w-4 h-4" />
            {!isMobile && "CCTV Guard"}
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-2">
            <GameController className="w-4 h-4" />
            {!isMobile && "Activity"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          {/* AI-Powered Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <MagnifyingGlass className="w-5 h-5" weight="duotone" />
                    AI-Powered Email Search
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAccountsDialog(true)}
                    className="h-8 gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add Account
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Input */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder='Search emails (e.g., "DOLE", "department of labor")...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={() => setShowSearchFilters(!showSearchFilters)}
                    variant="outline"
                    size="icon"
                  >
                    <Funnel className="w-5 h-5" />
                  </Button>
                  <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {/* Search Filters */}
                {showSearchFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2"
                  >
                    <div className="space-y-2">
                      <Label className="text-sm">Time Range</Label>
                      <Select value={searchTimeRange} onValueChange={(v: any) => setSearchTimeRange(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">This Week</SelectItem>
                          <SelectItem value="month">This Month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">All Accounts</Label>
                      <Select value={searchAccount} onValueChange={setSearchAccount}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Accounts</SelectItem>
                          {(connectedAccounts || []).map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.label} ({account.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Sender</Label>
                      <Select value={searchSender} onValueChange={setSearchSender}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Senders</SelectItem>
                          {uniqueSenders.map(sender => (
                            <SelectItem key={sender} value={sender}>{sender}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                )}

                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  AI searches your emails semantically - finding related terms and synonyms
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Search Results */}
          {showSearchResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Search Results ({searchResults.length})</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowSearchResults(false)}>
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {searchResults.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No results found</p>
                      ) : (
                        searchResults.map((notif) => (
                          <Card key={notif.id} className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={getCategoryColor(notif.category) as any}>
                                    {notif.category}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{notif.time}</span>
                                </div>
                                <h4 className="font-semibold mb-1">{notif.title}</h4>
                                <p className="text-sm text-muted-foreground mb-2">{notif.message}</p>
                                <p className="text-xs text-muted-foreground">From: {notif.source}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => onMarkRead(notif.id)}>
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => onDelete(notif.id)}>
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}

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
                      <div className="flex items-center space-x-2">
                        <div>
                          <h3 className="text-lg font-semibold">Smart Sleep Guardian</h3>
                          <p className="text-sm text-muted-foreground">
                            {dndEnabled ? 'Your notifications are silenced' : 'Enable to silence notifications while you sleep'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowDndSettings(true)}
                        >
                          <DotsThreeVertical className="w-5 h-5" weight="bold" />
                        </Button>
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

        <TabsContent value="subscriptions" className="space-y-6">
          <SubscriptionMonitoring />
        </TabsContent>

        <TabsContent value="cctv" className="space-y-6">
          <CCTVGuardAI />
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
                {isLoadingNews && (news || []).length === 0 ? (
                  <Card className="p-8 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-muted-foreground">Loading news...</p>
                  </Card>
                ) : (news || []).length === 0 ? (
                  <Card className="p-8 text-center">
                    <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-3" weight="duotone" />
                    <p className="text-muted-foreground">No news available. Get a free API key from gnews.io to enable real-time news.</p>
                  </Card>
                ) : (
                  (news || []).map((newsItem, index) => (
                    <motion.div
                      key={newsItem.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card
                        className="p-4 hover:shadow-md transition-shadow cursor-pointer bg-secondary/30"
                        onClick={() => {
                          if (newsItem.url) {
                            window.open(newsItem.url, '_blank')
                          }
                        }}
                      >
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="text-xs">
                                {newsItem.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {newsItem.time}
                              </span>
                            </div>
                            <h3 className="font-semibold text-sm sm:text-base mb-1">
                              {newsItem.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {newsItem.source}
                            </p>
                          </div>
                          <TrendUp className="w-5 h-5 text-primary flex-shrink-0" />
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={handleLoadMoreNews}
                disabled={isLoadingNews}
              >
                {isLoadingNews ? 'Refreshing...' : 'Refresh News'}
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
                <p className="text-2xl sm:text-3xl font-bold text-coral">{(news || []).length}</p>
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

      {/* Consent Dialog for AI Email Scanning */}
      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              AI Email Scanning Permission
            </DialogTitle>
            <DialogDescription>
              FlowSphere needs your permission to scan email content for search functionality.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">What we'll do:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Search through your email notifications for the keywords you enter</li>
                <li>Use AI to find related terms and synonyms (e.g., "DOLE" → "Department of Labor")</li>
                <li>Apply filters like time range and sender</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Privacy & Security:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>All processing happens locally in your browser</li>
                <li>No email data is stored or sent to external servers</li>
                <li>You can revoke this permission anytime in settings</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConsentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setHasSearchConsent(true)
              performSearch()
            }}>
              <ShieldCheck className="w-4 h-4 mr-2" />
              I Agree, Start Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DND Settings Dialog */}
      <Dialog open={showDndSettings} onOpenChange={setShowDndSettings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Smart Sleep Guardian Settings</DialogTitle>
            <DialogDescription>
              Configure how Do Not Disturb mode handles incoming calls and notifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* DND Behavior */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">DND Behavior</Label>
              <Select value={dndBehavior} onValueChange={(value: any) => setDndBehavior(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="silence-all">Silence All Calls</SelectItem>
                  <SelectItem value="allow-favorites">Allow Favorite Contacts Only</SelectItem>
                  <SelectItem value="allow-repeated">Allow Repeated Calls (Default)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {dndBehavior === 'silence-all' && 'All calls will be silenced, no exceptions'}
                {dndBehavior === 'allow-favorites' && 'Only calls from emergency contacts will ring'}
                {dndBehavior === 'allow-repeated' && 'Repeated calls from the same number will ring'}
              </p>
            </div>

            {/* Emergency Override Calls */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Emergency Override: {emergencyOverride} repeated calls
              </Label>
              <Slider
                value={[emergencyOverride]}
                onValueChange={(value) => onEmergencyOverrideChange(value[0])}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <p className="text-xs text-muted-foreground">
                If someone calls {emergencyOverride} times within 10 minutes, the call will ring through
              </p>
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Emergency Contacts</Label>
              <p className="text-xs text-muted-foreground mb-2">
                These contacts can always reach you, even when DND is enabled
              </p>

              {/* Contact List */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(emergencyContacts || []).map((contact, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted">
                    <span className="text-sm">{contact}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveContact(contact)}
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {(!emergencyContacts || emergencyContacts.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No emergency contacts added yet
                  </p>
                )}
              </div>

              {/* Add Contact */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Name or phone number"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddContact()}
                />
                <Button onClick={handleAddContact} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowDndSettings(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connected Accounts Management Dialog */}
      <Dialog open={showAccountsDialog} onOpenChange={setShowAccountsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Connected Accounts</DialogTitle>
            <DialogDescription>
              Add email and social media accounts for email search, morning dashboard alerts, and notifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Add New Account */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold">Add New Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select value={newAccountType} onValueChange={(v: 'email' | 'social') => setNewAccountType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={newAccountProvider} onValueChange={setNewAccountProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {newAccountType === 'email' ? (
                        <>
                          <SelectItem value="gmail">Gmail</SelectItem>
                          <SelectItem value="outlook">Outlook</SelectItem>
                          <SelectItem value="yahoo">Yahoo Mail</SelectItem>
                          <SelectItem value="icloud">iCloud Mail</SelectItem>
                          <SelectItem value="other">Other Email</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="twitter">Twitter/X</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email/Username</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={newAccountType === 'email' ? 'your.email@example.com' : '@username'}
                    value={newAccountEmail}
                    onChange={(e) => setNewAccountEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                  />
                  <Button onClick={handleAddAccount}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Connected Accounts List */}
            <div className="space-y-3">
              <h3 className="font-semibold">Connected Accounts ({(connectedAccounts || []).length})</h3>
              {(connectedAccounts || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No accounts connected yet. Add your first account above.
                </p>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {(connectedAccounts || []).map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${account.type === 'email' ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
                            {account.type === 'email' ? (
                              <Envelope className={`w-5 h-5 ${account.isActive ? 'text-blue-500' : 'text-muted-foreground'}`} />
                            ) : (
                              <UserIcon className={`w-5 h-5 ${account.isActive ? 'text-purple-500' : 'text-muted-foreground'}`} />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium capitalize">{account.provider}</p>
                            <p className="text-sm text-muted-foreground">{account.email}</p>
                          </div>
                          <Badge variant={account.isActive ? 'default' : 'secondary'}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <Switch
                            checked={account.isActive}
                            onCheckedChange={() => handleToggleAccount(account.id)}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveAccount(account.id)}
                          >
                            <Trash className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-accent/10 rounded-lg">
              <p className="font-semibold mb-1">These accounts will be used for:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>AI-powered email search across all connected accounts</li>
                <li>Morning dashboard "Important Emails" notifications</li>
                <li>Family safety alerts and emergency notifications</li>
                <li>Subscription monitoring and bill reminders</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowAccountsDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
