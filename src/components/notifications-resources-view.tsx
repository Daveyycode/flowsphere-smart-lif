import { useState, useEffect } from 'react'
import { sanitizeHTML } from '@/lib/security-utils'
import { useKV } from '@/hooks/use-kv'
import { motion } from 'framer-motion'
import {
  Bell,
  Moon,
  Phone,
  Envelope,
  Package,
  User as UserIcon,
  CheckCircle,
  Trash,
  SpeakerHigh,
  Stop,
  GameController,
  Newspaper,
  Clock,
  TrendUp,
  Warning,
  CreditCard,
  Camera,
  MagnifyingGlass,
  Funnel,
  ShieldCheck,
  DotsThreeVertical,
  Plus,
  X as XIcon,
  Gear,
  Robot,
  Sparkle,
} from '@phosphor-icons/react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { speakText, stopSpeaking } from '@/lib/audio-summary'
import { speakWithGroq } from '@/lib/groq-voice'
import { SubscriptionMonitoring } from '@/components/subscription-monitoring'
import { CCTVGuardAI } from '@/components/cctv-guard-ai'
import { useIsMobile } from '@/hooks/use-mobile'
import { fetchDailyNews, NewsItem } from '@/lib/news-api'
import {
  semanticEmailSearch,
  getEmailStats,
  reclassifyAllEmails,
} from '@/lib/email/semantic-search'
import { globalEmailMonitor } from '@/lib/email/email-monitor'
import { Email, EmailAccountStore } from '@/lib/email/email-service'
import { emailDatabase } from '@/lib/email/email-database'
import { UnifiedEmailSearch } from '@/components/unified-email-search'

declare const spark: {
  llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => string
  llm: (prompt: string, model?: string, jsonMode?: boolean) => Promise<string>
}

export interface Notification {
  id: string
  category: 'urgent' | 'work' | 'personal' | 'subscription' | 'bills'
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
  onEmergencyOverrideChange,
}: NotificationsResourcesViewProps) {
  const isMobile = useIsMobile()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'notifications' | 'monitoring' | 'subscriptions' | 'cctv'
  >('notifications')
  const [news, setNews] = useKV<NewsItem[]>('flowsphere-daily-news', [])
  const [isLoadingNews, setIsLoadingNews] = useState(false)

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchFilters, setShowSearchFilters] = useState(false)
  const [searchTimeRange, setSearchTimeRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [searchAccount, setSearchAccount] = useState<string>('all')
  const [searchSender, setSearchSender] = useState<string>('')
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [hasSearchConsent, setHasSearchConsent] = useKV<boolean>(
    'flowsphere-email-search-consent',
    false
  )
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Email[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [emailStats, setEmailStats] = useState({
    total: 0,
    urgent: 0,
    work: 0,
    personal: 0,
    subscription: 0,
    misc: 0,
  })

  // Connected Accounts Management
  const [showAccountsDialog, setShowAccountsDialog] = useState(false)
  const [connectedAccounts, setConnectedAccounts] = useState(EmailAccountStore.getAccounts())
  const [newAccountEmail, setNewAccountEmail] = useState('')
  const [newAccountType, setNewAccountType] = useState<'email' | 'social'>('email')
  const [newAccountProvider, setNewAccountProvider] = useState('gmail')

  // DND Settings
  const [showDndSettings, setShowDndSettings] = useState(false)
  const [dndBehavior, setDndBehavior] = useKV<'silence-all' | 'allow-favorites' | 'allow-repeated'>(
    'flowsphere-dnd-behavior',
    'allow-repeated'
  )
  const [emergencyContacts, setEmergencyContacts] = useKV<string[]>(
    'flowsphere-emergency-contacts',
    []
  )
  const [newContact, setNewContact] = useState('')

  // Work Categorization Settings
  const [showWorkSettings, setShowWorkSettings] = useState(false)
  const [workSettings, setWorkSettings] = useState<{
    workKeywords: string[]
    workDomains: string[]
    personalDomains: string[]
  }>({
    workKeywords: [],
    workDomains: [],
    personalDomains: [],
  })
  const [newWorkKeyword, setNewWorkKeyword] = useState('')
  const [newWorkDomain, setNewWorkDomain] = useState('')
  const [newPersonalDomain, setNewPersonalDomain] = useState('')

  const [gameSessions, setGameSessions] = useKV<GameSession[]>('flowsphere-game-sessions', [])

  const [dailyLimit] = useState(120)

  // Unified Email Search Popup with integrated AI Assistant
  const [showUnifiedSearch, setShowUnifiedSearch] = useState(false)
  const [unifiedSearchCategory, setUnifiedSearchCategory] = useState<
    'all' | 'urgent' | 'work' | 'personal' | 'subs' | 'bills'
  >('all')
  const [unifiedSearchMode, setUnifiedSearchMode] = useState<'search' | 'ai'>('ai')

  // Actual emails from database for display
  const [databaseEmails, setDatabaseEmails] = useState<Email[]>([])

  // Selected email for preview dialog
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [showEmailPreview, setShowEmailPreview] = useState(false)

  // Latest AI response for "Hear Summary" button
  const [latestAIResponse, setLatestAIResponse] = useState<string | null>(null)

  // Handle handoff from Email AI Assistant to General AI Assistant
  const handleHandoffToGeneralAI = (query: string) => {
    // Dispatch event to open the general AI assistant with the query
    const event = new CustomEvent('flowsphere-open-ai-assistant', {
      detail: { query },
    })
    window.dispatchEvent(event)
    toast.success('Switching to General AI Assistant...')
  }

  // Handle category tab click to open search popup
  const handleCategoryClick = (category: string) => {
    // Map category names
    const categoryMap: Record<string, 'all' | 'urgent' | 'work' | 'personal' | 'subs' | 'bills'> = {
      all: 'all',
      urgent: 'urgent',
      work: 'work',
      personal: 'personal',
      subscription: 'subs',
      bills: 'bills',
    }
    setUnifiedSearchCategory(categoryMap[category] || 'all')
    setShowUnifiedSearch(true)
  }

  // Load work categorization settings
  useEffect(() => {
    try {
      const stored = localStorage.getItem('flowsphere-work-categorization')
      if (stored) {
        setWorkSettings(JSON.parse(stored))
      } else {
        // Set default settings
        const defaults = {
          workKeywords: [
            'project',
            'meeting',
            'deadline',
            'team',
            'office',
            'task',
            'report',
            'client',
          ],
          workDomains: [],
          personalDomains: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'],
        }
        setWorkSettings(defaults)
        localStorage.setItem('flowsphere-work-categorization', JSON.stringify(defaults))
      }
    } catch (error) {
      console.error('Failed to load work settings:', error)
    }
  }, [])

  // Load email stats and perform initial sync
  useEffect(() => {
    const loadEmailData = async () => {
      try {
        // Load accounts
        const accounts = EmailAccountStore.getAccounts()
        setConnectedAccounts(accounts)

        // Load stats
        let stats = await getEmailStats()
        setEmailStats(stats)

        // Perform initial sync if no emails and has accounts
        if (stats.total === 0 && accounts.length > 0) {
          console.log('No emails in database, performing initial sync...')
          await globalEmailMonitor.performInitialSync()
          // Reload stats after sync
          stats = await getEmailStats()
          setEmailStats(stats)
        }

        // If we have emails but most are uncategorized, reclassify them
        if (stats.total > 0 && stats.misc > stats.total * 0.8) {
          console.log('Most emails uncategorized, reclassifying with rules...')
          await reclassifyAllEmails()
          const newStats = await getEmailStats()
          setEmailStats(newStats)
          toast.success(`Reclassified ${stats.total} emails`)
        }

        // Load actual emails from database for display
        const emails = await emailDatabase.getAllEmails()
        // Sort by timestamp (newest first)
        emails.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setDatabaseEmails(emails)
        console.log(`Loaded ${emails.length} emails from database`)
      } catch (error) {
        console.error('Failed to load email data:', error)
      }
    }

    loadEmailData()

    // Listen for rule changes to trigger reclassification
    const handleRulesChange = async () => {
      console.log('Email rules changed, reclassifying...')
      await reclassifyAllEmails()
      const stats = await getEmailStats()
      setEmailStats(stats)
      // Reload emails
      const emails = await emailDatabase.getAllEmails()
      emails.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setDatabaseEmails(emails)
      toast.success('Emails reclassified with new rules')
    }
    window.addEventListener('flowsphere-email-rules-updated', handleRulesChange)

    // Refresh stats, accounts, and emails every 30 seconds
    const interval = setInterval(async () => {
      const accounts = EmailAccountStore.getAccounts()
      setConnectedAccounts(accounts)
      const stats = await getEmailStats()
      setEmailStats(stats)
      // Reload emails
      const emails = await emailDatabase.getAllEmails()
      emails.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setDatabaseEmails(emails)
    }, 30000)

    return () => {
      clearInterval(interval)
      window.removeEventListener('flowsphere-email-rules-updated', handleRulesChange)
    }
  }, [])

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
      case 'urgent':
        return Bell
      case 'work':
        return Envelope
      case 'personal':
        return UserIcon
      case 'subscription':
        return Package
      default:
        return Bell
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'urgent':
        return 'destructive'
      case 'work':
        return 'accent'
      case 'personal':
        return 'coral'
      case 'subscription':
        return 'mint'
      default:
        return 'muted'
    }
  }

  // Map database categories to UI categories
  const mapCategoryToUI = (dbCategory?: string) => {
    switch (dbCategory) {
      case 'emergency':
      case 'important':
        return 'urgent'
      case 'work':
        return 'work'
      case 'personal':
        return 'personal'
      case 'subscription':
        return 'subscription'
      default:
        return 'bills'
    }
  }

  // Filter emails by selected category
  const filteredEmails =
    selectedCategory === 'all'
      ? databaseEmails
      : databaseEmails.filter(email => {
          const uiCategory = mapCategoryToUI(email.category)
          // Map 'subscription' tab to 'subscription' category
          if (selectedCategory === 'subscription') return uiCategory === 'subscription'
          return uiCategory === selectedCategory
        })

  const categoryCounts = {
    all: databaseEmails.length,
    urgent: databaseEmails.filter(e => mapCategoryToUI(e.category) === 'urgent').length,
    work: databaseEmails.filter(e => mapCategoryToUI(e.category) === 'work').length,
    personal: databaseEmails.filter(e => mapCategoryToUI(e.category) === 'personal').length,
    subscription: databaseEmails.filter(e => mapCategoryToUI(e.category) === 'subscription').length,
    misc: databaseEmails.filter(e => mapCategoryToUI(e.category) === 'bills').length,
  }

  // Also keep filtered notifications for backward compatibility
  const filteredNotifications =
    selectedCategory === 'all'
      ? notifications
      : notifications.filter(n => n.category === selectedCategory)

  // Get unique senders from database emails
  const uniqueSenders = Array.from(new Set(databaseEmails.map(e => e.from.email)))

  const handleSearch = async () => {
    // Allow search by query OR sender
    if (!searchQuery.trim() && !searchSender.trim()) {
      toast.error('Please enter a search term or sender email')
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
    toast.info('Please go to Settings > Connected Email Accounts to add accounts')
    setShowAccountsDialog(false)
  }

  const handleRemoveAccount = (id: string) => {
    EmailAccountStore.removeAccount(id)
    setConnectedAccounts(EmailAccountStore.getAccounts())
    toast.success('Account removed')
  }

  const handleToggleAccount = (id: string) => {
    const account = EmailAccountStore.getAccount(id)
    if (account) {
      const updated = { ...account, isActive: !account.isActive }
      EmailAccountStore.saveAccount(updated)
      setConnectedAccounts(EmailAccountStore.getAccounts())
      toast.success(updated.isActive ? 'Account enabled' : 'Account paused')
    }
  }

  const performSearch = async () => {
    setIsSearching(true)
    setShowConsentDialog(false)

    try {
      // Use semantic search with email database
      // If no query but has sender, use empty query to get all emails then filter
      const result = await semanticEmailSearch({
        query: searchQuery.trim() || '',
        limit: 1000, // Increase limit when filtering by sender only
      })

      const searchLabel = searchQuery.trim() ? `"${searchQuery}"` : 'sender filter'
      console.log(`🔍 Found ${result.totalCount} emails matching ${searchLabel}`)

      // Apply additional filters
      let filtered = result.emails

      // Filter by account
      if (searchAccount !== 'all') {
        const selectedAccount = connectedAccounts.find(acc => acc.id === searchAccount)
        if (selectedAccount) {
          filtered = filtered.filter(email => email.provider === selectedAccount.provider)
        }
      }

      // Filter by sender
      if (searchSender.trim()) {
        const senderLower = searchSender.toLowerCase().trim()
        filtered = filtered.filter(
          email =>
            email.from.name.toLowerCase().includes(senderLower) ||
            email.from.email.toLowerCase().includes(senderLower)
        )
      }

      // Filter by time range
      const now = Date.now()
      if (searchTimeRange === 'today') {
        const todayStart = new Date().setHours(0, 0, 0, 0)
        filtered = filtered.filter(email => new Date(email.timestamp).getTime() >= todayStart)
      } else if (searchTimeRange === 'week') {
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000
        filtered = filtered.filter(email => new Date(email.timestamp).getTime() >= weekAgo)
      } else if (searchTimeRange === 'month') {
        const monthAgo = now - 30 * 24 * 60 * 60 * 1000
        filtered = filtered.filter(email => new Date(email.timestamp).getTime() >= monthAgo)
      }

      setSearchResults(filtered)
      setShowSearchResults(true)

      const resultMessage = searchQuery.trim()
        ? `Found ${filtered.length} email${filtered.length !== 1 ? 's' : ''}`
        : `Found ${filtered.length} email${filtered.length !== 1 ? 's' : ''} from sender`
      toast.success(resultMessage)
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
      .filter(
        session =>
          session.childName === childName && new Date(session.date).toDateString() === today
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

  const saveWorkSettings = (newSettings: typeof workSettings) => {
    setWorkSettings(newSettings)
    localStorage.setItem('flowsphere-work-categorization', JSON.stringify(newSettings))
    toast.success('Work categorization settings saved')
  }

  const handleAddWorkKeyword = () => {
    const keyword = newWorkKeyword.trim().toLowerCase()
    if (keyword && !workSettings.workKeywords.includes(keyword)) {
      const updated = { ...workSettings, workKeywords: [...workSettings.workKeywords, keyword] }
      saveWorkSettings(updated)
      setNewWorkKeyword('')
    } else if (workSettings.workKeywords.includes(keyword)) {
      toast.error('Keyword already exists')
      setNewWorkKeyword('')
    }
  }

  const handleRemoveWorkKeyword = (keywordToRemove: string) => {
    // Remove only the first occurrence to handle any existing duplicates gracefully
    const index = workSettings.workKeywords.indexOf(keywordToRemove)
    if (index > -1) {
      const newKeywords = [...workSettings.workKeywords]
      newKeywords.splice(index, 1)
      const updated = { ...workSettings, workKeywords: newKeywords }
      saveWorkSettings(updated)
    }
  }

  const handleAddWorkDomain = () => {
    const domain = newWorkDomain.trim().toLowerCase()
    if (domain && !workSettings.workDomains.includes(domain)) {
      const updated = { ...workSettings, workDomains: [...workSettings.workDomains, domain] }
      saveWorkSettings(updated)
      setNewWorkDomain('')
    } else if (workSettings.workDomains.includes(domain)) {
      toast.error('Domain already exists')
      setNewWorkDomain('')
    }
  }

  const handleRemoveWorkDomain = (domainToRemove: string) => {
    const index = workSettings.workDomains.indexOf(domainToRemove)
    if (index > -1) {
      const newDomains = [...workSettings.workDomains]
      newDomains.splice(index, 1)
      const updated = { ...workSettings, workDomains: newDomains }
      saveWorkSettings(updated)
    }
  }

  const handleAddPersonalDomain = () => {
    const domain = newPersonalDomain.trim().toLowerCase()
    if (domain && !workSettings.personalDomains.includes(domain)) {
      const updated = {
        ...workSettings,
        personalDomains: [...workSettings.personalDomains, domain],
      }
      saveWorkSettings(updated)
      setNewPersonalDomain('')
    } else if (workSettings.personalDomains.includes(domain)) {
      toast.error('Domain already exists')
      setNewPersonalDomain('')
    }
  }

  const handleRemovePersonalDomain = (domainToRemove: string) => {
    const index = workSettings.personalDomains.indexOf(domainToRemove)
    if (index > -1) {
      const newDomains = [...workSettings.personalDomains]
      newDomains.splice(index, 1)
      const updated = { ...workSettings, personalDomains: newDomains }
      saveWorkSettings(updated)
    }
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
      // If AI Assistant popup is open and has a response, read that instead
      if (showUnifiedSearch && latestAIResponse) {
        toast.info('Reading AI assistant response...')
        setIsSpeaking(true)
        try {
          await speakWithGroq(latestAIResponse, 'nova')
          setIsSpeaking(false)
          toast.success('AI summary completed')
        } catch (error) {
          console.error('Groq TTS error:', error)
          // Fallback to browser TTS
          await speakText(latestAIResponse)
          setIsSpeaking(false)
          toast.success('AI summary completed')
        }
        setIsSummarizing(false)
        return
      }

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
        time: n.time,
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

      <Tabs
        value={activeTab}
        onValueChange={v =>
          setActiveTab(v as 'notifications' | 'monitoring' | 'subscriptions' | 'cctv')
        }
        className="space-y-6"
      >
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            {!isMobile && 'Notifications'}
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2">
            <CreditCard className="w-4 h-4" />
            {!isMobile && 'Subscriptions'}
          </TabsTrigger>
          <TabsTrigger value="cctv" className="gap-2">
            <Camera className="w-4 h-4" />
            {!isMobile && 'CCTV Guard'}
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-2">
            <GameController className="w-4 h-4" />
            {!isMobile && 'Activity'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          {/* AI Email Assistant + Search Quick Access */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Robot className="w-7 h-7 text-white" weight="fill" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        AI Email Assistant
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          <Sparkle className="w-2.5 h-2.5 mr-0.5" weight="fill" />
                          Powered by Groq
                        </Badge>
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Ask questions, search across all accounts, compose emails with AI help
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        setUnifiedSearchMode('ai')
                        setShowUnifiedSearch(true)
                      }}
                      className="gap-2"
                    >
                      <Robot className="w-4 h-4" weight="fill" />
                      Ask AI
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUnifiedSearchMode('search')
                        setShowUnifiedSearch(true)
                      }}
                      className="gap-2"
                    >
                      <MagnifyingGlass className="w-4 h-4" />
                      Search
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => setShowWorkSettings(true)}>
                      <Gear className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setShowAccountsDialog(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-primary">{categoryCounts.all}</p>
                    <p className="text-xs text-muted-foreground">Total Emails</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-red-500/10">
                    <p className="text-2xl font-bold text-red-500">{categoryCounts.urgent}</p>
                    <p className="text-xs text-muted-foreground">Urgent</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-blue-500/10">
                    <p className="text-2xl font-bold text-blue-500">{categoryCounts.work}</p>
                    <p className="text-xs text-muted-foreground">Work</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-green-500/10">
                    <p className="text-2xl font-bold text-green-500">
                      {databaseEmails.filter(e => !e.read).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Unread</p>
                  </div>
                </div>
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
                        searchResults.map(email => (
                          <Card key={email.id} className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge
                                    variant={getCategoryColor(email.category || 'bills') as any}
                                  >
                                    {email.category || 'bills'}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(email.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <h4 className="font-semibold mb-1">{email.subject}</h4>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {email.snippet || email.body?.substring(0, 150) + '...'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  From: {email.from.name} ({email.from.email})
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Badge
                                  variant={email.read ? 'secondary' : 'default'}
                                  className="text-xs"
                                >
                                  {email.read ? 'Read' : 'Unread'}
                                </Badge>
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
            <Card
              className={`${dndEnabled ? 'bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div
                    className={`w-12 h-12 rounded-full ${dndEnabled ? 'bg-primary/20' : 'bg-muted'} flex items-center justify-center flex-shrink-0`}
                  >
                    <Moon
                      className={`w-6 h-6 ${dndEnabled ? 'text-primary' : 'text-muted-foreground'}`}
                      weight="fill"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div>
                          <h3 className="text-lg font-semibold">Smart Sleep Guardian</h3>
                          <p className="text-sm text-muted-foreground">
                            {dndEnabled
                              ? 'Your notifications are silenced'
                              : 'Enable to silence notifications while you sleep'}
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
                      <Switch checked={dndEnabled} onCheckedChange={handleDndToggle} />
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
                              onValueChange={value => onEmergencyOverrideChange(value[0])}
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
            <div className="flex items-center gap-2">
              <TabsList className="flex-1 justify-start overflow-x-auto">
                <TabsTrigger value="all" className="gap-1">
                  All ({categoryCounts.all})
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 hover:bg-primary/20"
                    onClick={e => {
                      e.stopPropagation()
                      handleCategoryClick('all')
                    }}
                  >
                    <MagnifyingGlass className="w-3 h-3" />
                  </Button>
                </TabsTrigger>
                <TabsTrigger value="urgent" className="gap-1 text-red-500">
                  Urgent ({categoryCounts.urgent})
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 hover:bg-red-500/20"
                    onClick={e => {
                      e.stopPropagation()
                      handleCategoryClick('urgent')
                    }}
                  >
                    <MagnifyingGlass className="w-3 h-3" />
                  </Button>
                </TabsTrigger>
                <TabsTrigger value="work" className="gap-1 text-blue-500">
                  Work ({categoryCounts.work})
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 hover:bg-blue-500/20"
                    onClick={e => {
                      e.stopPropagation()
                      handleCategoryClick('work')
                    }}
                  >
                    <MagnifyingGlass className="w-3 h-3" />
                  </Button>
                </TabsTrigger>
                <TabsTrigger value="personal" className="gap-1 text-green-500">
                  Personal ({categoryCounts.personal})
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 hover:bg-green-500/20"
                    onClick={e => {
                      e.stopPropagation()
                      handleCategoryClick('personal')
                    }}
                  >
                    <MagnifyingGlass className="w-3 h-3" />
                  </Button>
                </TabsTrigger>
                <TabsTrigger value="subscription" className="gap-1 text-purple-500">
                  Subs ({categoryCounts.subscription})
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 hover:bg-purple-500/20"
                    onClick={e => {
                      e.stopPropagation()
                      handleCategoryClick('subscription')
                    }}
                  >
                    <MagnifyingGlass className="w-3 h-3" />
                  </Button>
                </TabsTrigger>
                <TabsTrigger value="bills" className="gap-1 text-gray-500">
                  Bills ({categoryCounts.misc})
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 hover:bg-gray-500/20"
                    onClick={e => {
                      e.stopPropagation()
                      handleCategoryClick('bills')
                    }}
                  >
                    <MagnifyingGlass className="w-3 h-3" />
                  </Button>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={selectedCategory} className="space-y-3">
              {filteredEmails.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-muted-foreground" weight="duotone" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                    <p className="text-muted-foreground text-sm">
                      {databaseEmails.length === 0
                        ? 'No emails synced yet. Connect your email account to get started.'
                        : `No ${selectedCategory === 'all' ? '' : selectedCategory} emails at this time`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {filteredEmails.slice(0, 50).map((email, index) => {
                      const uiCategory = mapCategoryToUI(email.category)
                      const Icon = getCategoryIcon(uiCategory)
                      const color = getCategoryColor(uiCategory)
                      const emailDate = new Date(email.timestamp)
                      const now = new Date()
                      const diffMs = now.getTime() - emailDate.getTime()
                      const diffMins = Math.floor(diffMs / (1000 * 60))
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

                      let timeDisplay = ''
                      if (diffMins < 60) {
                        timeDisplay = `${diffMins} min ago`
                      } else if (diffHours < 24) {
                        timeDisplay = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
                      } else if (diffDays < 7) {
                        timeDisplay = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
                      } else {
                        timeDisplay = emailDate.toLocaleDateString()
                      }

                      return (
                        <motion.div
                          key={email.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
                        >
                          <Card
                            className={`${email.read ? 'bg-muted/30' : 'bg-card border-l-4 border-l-primary'} hover:shadow-md transition-all cursor-pointer`}
                            onClick={() => {
                              setSelectedEmail(email)
                              setShowEmailPreview(true)
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <div
                                  className={`w-10 h-10 rounded-full bg-${color}/10 flex items-center justify-center flex-shrink-0`}
                                >
                                  <Icon className={`w-5 h-5 text-${color}`} weight="duotone" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-1">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <h4
                                          className={`text-sm font-semibold truncate ${email.read ? 'text-muted-foreground' : ''}`}
                                        >
                                          {email.from.name || email.from.email}
                                        </h4>
                                        <Badge
                                          variant="secondary"
                                          className={`text-xs ${
                                            uiCategory === 'urgent'
                                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                              : uiCategory === 'work'
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                : uiCategory === 'personal'
                                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                  : uiCategory === 'subscription'
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                    : ''
                                          }`}
                                        >
                                          {uiCategory}
                                        </Badge>
                                        {!email.read && (
                                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        )}
                                      </div>
                                      <p
                                        className={`text-sm font-medium truncate ${email.read ? 'text-muted-foreground' : 'text-foreground'}`}
                                      >
                                        {email.subject}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate mt-1">
                                        {email.snippet || email.body?.substring(0, 100)}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {timeDisplay}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={e => {
                                      e.stopPropagation()
                                      toast.info(`Email: ${email.subject}`)
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4" weight="duotone" />
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
                  children.map(child => {
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
                            .filter(
                              s =>
                                s.childName === child &&
                                new Date(s.date).toDateString() === new Date().toDateString()
                            )
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
                    <Newspaper
                      className="w-12 h-12 text-muted-foreground mx-auto mb-3"
                      weight="duotone"
                    />
                    <p className="text-muted-foreground">
                      No news available. Get a free API key from gnews.io to enable real-time news.
                    </p>
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
                              <span className="text-xs text-muted-foreground">{newsItem.time}</span>
                            </div>
                            <h3 className="font-semibold text-sm sm:text-base mb-1">
                              {newsItem.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">{newsItem.source}</p>
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
                <li>
                  Use AI to find related terms and synonyms (e.g., "DOLE" → "Department of Labor")
                </li>
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
            <Button
              onClick={() => {
                setHasSearchConsent(true)
                performSearch()
              }}
            >
              <ShieldCheck className="w-4 h-4 mr-2" />I Agree, Start Search
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
                {dndBehavior === 'allow-favorites' &&
                  'Only calls from emergency contacts will ring'}
                {dndBehavior === 'allow-repeated' &&
                  'Repeated calls from the same number will ring'}
              </p>
            </div>

            {/* Emergency Override Calls */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Emergency Override: {emergencyOverride} repeated calls
              </Label>
              <Slider
                value={[emergencyOverride]}
                onValueChange={value => onEmergencyOverrideChange(value[0])}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <p className="text-xs text-muted-foreground">
                If someone calls {emergencyOverride} times within 10 minutes, the call will ring
                through
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
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-md bg-muted"
                  >
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
                  onChange={e => setNewContact(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddContact()}
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
              Add email and social media accounts for email search, morning dashboard alerts, and
              notifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Add New Account */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold">Add New Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select
                    value={newAccountType}
                    onValueChange={(v: 'email' | 'social') => setNewAccountType(v)}
                  >
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
                    placeholder={
                      newAccountType === 'email' ? 'your.email@example.com' : '@username'
                    }
                    value={newAccountEmail}
                    onChange={e => setNewAccountEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddAccount()}
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
              <h3 className="font-semibold">
                Connected Accounts ({(connectedAccounts || []).length})
              </h3>
              {(connectedAccounts || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No accounts connected yet. Add your first account above.
                </p>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {(connectedAccounts || []).map(account => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Envelope
                              className={`w-5 h-5 ${account.isActive ? 'text-blue-500' : 'text-muted-foreground'}`}
                            />
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

      {/* Work Categorization Settings Dialog */}
      <Dialog open={showWorkSettings} onOpenChange={setShowWorkSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Categorization Settings</DialogTitle>
            <DialogDescription>
              Configure how FlowSphere categorizes your emails into Work and Personal categories
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Work Keywords */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Work Keywords</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Emails containing these words will be categorized as "Work"
                </p>
              </div>

              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg min-h-[80px]">
                {workSettings.workKeywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No work keywords added yet</p>
                ) : (
                  workSettings.workKeywords.map((keyword, index) => (
                    <Badge key={`${keyword}-${index}`} variant="secondary" className="gap-1">
                      {keyword}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0"
                        onClick={() => handleRemoveWorkKeyword(keyword)}
                      >
                        <XIcon className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="e.g., project, meeting, deadline..."
                  value={newWorkKeyword}
                  onChange={e => setNewWorkKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddWorkKeyword()}
                />
                <Button onClick={handleAddWorkKeyword} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Work Domains */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Work Email Domains</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Emails from these domains will be categorized as "Work"
                </p>
              </div>

              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg min-h-[80px]">
                {workSettings.workDomains.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No work domains added yet</p>
                ) : (
                  workSettings.workDomains.map((domain, index) => (
                    <Badge key={`${domain}-${index}`} variant="secondary" className="gap-1">
                      {domain}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0"
                        onClick={() => handleRemoveWorkDomain(domain)}
                      >
                        <XIcon className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="e.g., company.com, work.com..."
                  value={newWorkDomain}
                  onChange={e => setNewWorkDomain(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddWorkDomain()}
                />
                <Button onClick={handleAddWorkDomain} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Personal Domains */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Personal Email Domains</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Emails from individuals using these domains will be categorized as "Personal"
                </p>
              </div>

              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg min-h-[80px]">
                {workSettings.personalDomains.map((domain, index) => (
                  <Badge key={`${domain}-${index}`} variant="secondary" className="gap-1">
                    {domain}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() => handleRemovePersonalDomain(domain)}
                    >
                      <XIcon className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="e.g., gmail.com, yahoo.com..."
                  value={newPersonalDomain}
                  onChange={e => setNewPersonalDomain(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPersonalDomain()}
                />
                <Button onClick={handleAddPersonalDomain} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-accent/10 rounded-lg">
              <p className="font-semibold mb-1">How categorization works:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong>Urgent:</strong> Emails with emergency keywords (urgent, alert, critical)
                </li>
                <li>
                  <strong>Work:</strong> Emails matching your work keywords or from work domains
                </li>
                <li>
                  <strong>Personal:</strong> Emails from individuals using personal domains
                </li>
                <li>
                  <strong>Subscription:</strong> Billing, renewals, and service notifications
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowWorkSettings(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unified Email Search Popup with AI Assistant */}
      <UnifiedEmailSearch
        open={showUnifiedSearch}
        onOpenChange={setShowUnifiedSearch}
        initialCategory={unifiedSearchCategory}
        initialMode={unifiedSearchMode}
        onLatestAIResponse={setLatestAIResponse}
        onHandoffToGeneral={handleHandoffToGeneralAI}
      />

      {/* Email Preview Dialog */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          {selectedEmail && (
            <>
              <DialogHeader className="border-b pb-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      mapCategoryToUI(selectedEmail.category) === 'urgent'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : mapCategoryToUI(selectedEmail.category) === 'work'
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : mapCategoryToUI(selectedEmail.category) === 'personal'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : mapCategoryToUI(selectedEmail.category) === 'subscription'
                              ? 'bg-purple-100 dark:bg-purple-900/30'
                              : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    <Envelope
                      className={`w-6 h-6 ${
                        mapCategoryToUI(selectedEmail.category) === 'urgent'
                          ? 'text-red-600'
                          : mapCategoryToUI(selectedEmail.category) === 'work'
                            ? 'text-blue-600'
                            : mapCategoryToUI(selectedEmail.category) === 'personal'
                              ? 'text-green-600'
                              : mapCategoryToUI(selectedEmail.category) === 'subscription'
                                ? 'text-purple-600'
                                : 'text-gray-600'
                      }`}
                      weight="duotone"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg font-semibold mb-1">
                      {selectedEmail.subject || '(No Subject)'}
                    </DialogTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {selectedEmail.from.name || selectedEmail.from.email}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        &lt;{selectedEmail.from.email}&gt;
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(selectedEmail.timestamp).toLocaleString()}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          mapCategoryToUI(selectedEmail.category) === 'urgent'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : mapCategoryToUI(selectedEmail.category) === 'work'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : mapCategoryToUI(selectedEmail.category) === 'personal'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : mapCategoryToUI(selectedEmail.category) === 'subscription'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                  : ''
                        }`}
                      >
                        {mapCategoryToUI(selectedEmail.category)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 mt-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {selectedEmail.body ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: sanitizeHTML(selectedEmail.body) }}
                      className="whitespace-pre-wrap"
                    />
                  ) : selectedEmail.snippet ? (
                    <p className="text-muted-foreground">{selectedEmail.snippet}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No content available</p>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 w-full justify-between">
                  <div className="text-xs text-muted-foreground">
                    {selectedEmail.read ? 'Read' : 'Unread'} • {selectedEmail.provider}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowEmailPreview(false)}>
                      Close
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        // Open in Gmail/email client
                        if (selectedEmail.provider === 'gmail') {
                          window.open(
                            `https://mail.google.com/mail/u/0/#inbox/${selectedEmail.id}`,
                            '_blank'
                          )
                        }
                        setShowEmailPreview(false)
                      }}
                    >
                      Open in {selectedEmail.provider === 'gmail' ? 'Gmail' : 'Email'}
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
