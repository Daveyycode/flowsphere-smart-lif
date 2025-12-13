/**
 * Email Categorization Setup Wizard
 * Asks users how they want their emails categorized before any auto-categorization
 * Follows Gmail and Microsoft 365 patterns with AI-powered suggestions
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Envelope,
  Briefcase,
  User,
  Bell,
  Tag,
  Sparkle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Lightning,
  ShieldCheck,
  Megaphone,
  Receipt,
  ChatCircle,
  Warning,
  Newspaper,
  Robot,
  Gear,
  Plus,
  X,
  Info,
} from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

// Storage key for categorization preferences
export const EMAIL_CATEGORIZATION_KEY = 'flowsphere-email-categorization-setup'
export const EMAIL_CATEGORIZATION_COMPLETE_KEY = 'flowsphere-email-categorization-complete'

export interface EmailCategorizationPreset {
  id: string
  name: string
  description: string
  icon: React.ElementType
  categories: CategoryConfig[]
  style: 'gmail' | 'outlook' | 'custom'
}

export interface CategoryConfig {
  id: string
  name: string
  displayName: string
  icon: React.ElementType
  color: string
  enabled: boolean
  keywords: string[]
  domains: string[]
  senderPatterns: string[]
  description: string
  examples: string[]
}

export interface UserCategorizationSettings {
  preset: string
  categories: CategoryConfig[]
  workDomains: string[]
  workKeywords: string[]
  personalDomains: string[]
  prioritySenders: string[]
  aiAssisted: boolean
  setupComplete: boolean
  lastUpdated: string
}

// Gmail-style categories
const gmailCategories: CategoryConfig[] = [
  {
    id: 'primary',
    name: 'primary',
    displayName: 'Primary',
    icon: Envelope,
    color: 'blue',
    enabled: true,
    keywords: [],
    domains: [],
    senderPatterns: [],
    description: 'Important personal conversations and messages that matter to you',
    examples: ['Messages from people you know', 'Important account notifications', 'Direct messages'],
  },
  {
    id: 'social',
    name: 'social',
    displayName: 'Social',
    icon: ChatCircle,
    color: 'pink',
    enabled: true,
    keywords: ['friend request', 'tagged you', 'commented', 'liked', 'followed', 'connection'],
    domains: ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'tiktok.com'],
    senderPatterns: ['notification', 'noreply@facebook', 'noreply@twitter', 'noreply@linkedin'],
    description: 'Messages from social networks and media-sharing sites',
    examples: ['Facebook notifications', 'LinkedIn connection requests', 'Twitter mentions'],
  },
  {
    id: 'promotions',
    name: 'promotions',
    displayName: 'Promotions',
    icon: Megaphone,
    color: 'green',
    enabled: true,
    keywords: ['sale', 'discount', '% off', 'deal', 'offer', 'coupon', 'voucher', 'promo', 'free shipping', 'limited time'],
    domains: ['lazada.com', 'shopee.com', 'amazon.com', 'zalora.com', 'shein.com'],
    senderPatterns: ['marketing', 'promo', 'deals', 'offers', 'newsletter'],
    description: 'Deals, offers, and marketing emails',
    examples: ['Store sales announcements', 'Coupons and discounts', 'Product recommendations'],
  },
  {
    id: 'updates',
    name: 'updates',
    displayName: 'Updates',
    icon: Receipt,
    color: 'yellow',
    enabled: true,
    keywords: ['receipt', 'order confirmation', 'shipped', 'delivered', 'statement', 'bill', 'invoice'],
    domains: [],
    senderPatterns: ['noreply', 'no-reply', 'support', 'billing'],
    description: 'Bills, receipts, statements, and confirmations',
    examples: ['Order confirmations', 'Shipping updates', 'Bill reminders'],
  },
  {
    id: 'forums',
    name: 'forums',
    displayName: 'Forums',
    icon: Newspaper,
    color: 'orange',
    enabled: false,
    keywords: ['digest', 'newsletter', 'weekly', 'monthly', 'forum', 'mailing list'],
    domains: ['reddit.com', 'quora.com', 'medium.com', 'substack.com'],
    senderPatterns: ['digest', 'newsletter'],
    description: 'Messages from online groups and mailing lists',
    examples: ['Reddit notifications', 'Forum replies', 'Mailing list digests'],
  },
]

// Microsoft 365/Outlook-style categories
const outlookCategories: CategoryConfig[] = [
  {
    id: 'focused',
    name: 'focused',
    displayName: 'Focused',
    icon: Lightning,
    color: 'blue',
    enabled: true,
    keywords: [],
    domains: [],
    senderPatterns: [],
    description: 'Important emails from people you communicate with often',
    examples: ['Emails from frequent contacts', 'Messages requiring response', 'Calendar invites'],
  },
  {
    id: 'other',
    name: 'other',
    displayName: 'Other',
    icon: Envelope,
    color: 'gray',
    enabled: true,
    keywords: [],
    domains: [],
    senderPatterns: ['newsletter', 'noreply', 'marketing'],
    description: 'Bulk mail, newsletters, and automated notifications',
    examples: ['Marketing emails', 'Newsletters', 'Automated updates'],
  },
  {
    id: 'urgent',
    name: 'urgent',
    displayName: 'Urgent',
    icon: Warning,
    color: 'red',
    enabled: true,
    keywords: ['urgent', 'asap', 'critical', 'emergency', 'important', 'deadline', 'action required'],
    domains: [],
    senderPatterns: [],
    description: 'Time-sensitive emails requiring immediate attention',
    examples: ['Deadline reminders', 'Critical alerts', 'Urgent requests'],
  },
  {
    id: 'work',
    name: 'work',
    displayName: 'Work',
    icon: Briefcase,
    color: 'purple',
    enabled: true,
    keywords: ['meeting', 'project', 'deadline', 'report', 'client', 'team', 'standup', 'review'],
    domains: [],
    senderPatterns: [],
    description: 'Professional and business-related emails',
    examples: ['Team discussions', 'Project updates', 'Client communications'],
  },
  {
    id: 'personal',
    name: 'personal',
    displayName: 'Personal',
    icon: User,
    color: 'green',
    enabled: true,
    keywords: ['family', 'birthday', 'dinner', 'weekend', 'vacation'],
    domains: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'],
    senderPatterns: [],
    description: 'Personal messages from friends and family',
    examples: ['Family updates', 'Social invitations', 'Personal conversations'],
  },
]

// FlowSphere custom categories (current system mapped)
const flowsphereCategories: CategoryConfig[] = [
  {
    id: 'emergency',
    name: 'emergency',
    displayName: 'Emergency',
    icon: Warning,
    color: 'red',
    enabled: true,
    keywords: ['security breach', 'alarm triggered', 'motion detected', 'intruder', 'emergency', '911', 'hospital'],
    domains: [],
    senderPatterns: ['security', 'alert'],
    description: 'Critical security and safety alerts requiring immediate action',
    examples: ['Security camera alerts', 'Break-in notifications', 'System critical errors'],
  },
  {
    id: 'important',
    name: 'important',
    displayName: 'Important',
    icon: Bell,
    color: 'orange',
    enabled: true,
    keywords: ['sign in', 'login link', 'verify', 'password reset', '2fa', 'verification', 'secure link'],
    domains: [],
    senderPatterns: ['security', 'account'],
    description: 'Account security and verification emails',
    examples: ['Login links', 'Password resets', '2FA codes'],
  },
  {
    id: 'work',
    name: 'work',
    displayName: 'Work',
    icon: Briefcase,
    color: 'blue',
    enabled: true,
    keywords: [],
    domains: [],
    senderPatterns: [],
    description: 'Work emails - YOU define what counts as work',
    examples: ['Emails from your work domain', 'Project discussions', 'Team updates'],
  },
  {
    id: 'personal',
    name: 'personal',
    displayName: 'Personal',
    icon: User,
    color: 'green',
    enabled: true,
    keywords: [],
    domains: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'],
    senderPatterns: [],
    description: 'Personal emails from real people',
    examples: ['Friends and family', 'Personal conversations'],
  },
  {
    id: 'subscription',
    name: 'subscription',
    displayName: 'Subscriptions',
    icon: Receipt,
    color: 'purple',
    enabled: true,
    keywords: ['subscription', 'renewal', 'billing', 'payment', 'invoice', 'receipt'],
    domains: ['netflix.com', 'spotify.com', 'adobe.com', 'microsoft.com'],
    senderPatterns: ['billing', 'subscription', 'payment'],
    description: 'Subscription billing and renewal notifications',
    examples: ['Netflix billing', 'Subscription renewals', 'Payment receipts'],
  },
  {
    id: 'regular',
    name: 'regular',
    displayName: 'Other',
    icon: Envelope,
    color: 'gray',
    enabled: true,
    keywords: [],
    domains: [],
    senderPatterns: [],
    description: 'Everything else that doesn\'t fit other categories',
    examples: ['Promotions', 'Newsletters', 'Marketing emails'],
  },
]

// Presets
const presets: EmailCategorizationPreset[] = [
  {
    id: 'gmail',
    name: 'Gmail Style',
    description: 'Organize like Gmail: Primary, Social, Promotions, Updates, Forums',
    icon: Envelope,
    categories: gmailCategories,
    style: 'gmail',
  },
  {
    id: 'outlook',
    name: 'Microsoft 365 Style',
    description: 'Focused Inbox: Focused vs Other, plus Work/Personal/Urgent',
    icon: Briefcase,
    categories: outlookCategories,
    style: 'outlook',
  },
  {
    id: 'flowsphere',
    name: 'FlowSphere Smart',
    description: 'AI-powered: Emergency, Important, Work, Personal, Subscriptions',
    icon: Sparkle,
    categories: flowsphereCategories,
    style: 'custom',
  },
]

interface EmailCategorizationSetupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (settings: UserCategorizationSettings) => void
  initialSettings?: UserCategorizationSettings | null
}

export function EmailCategorizationSetup({
  open,
  onOpenChange,
  onComplete,
  initialSettings,
}: EmailCategorizationSetupProps) {
  const [step, setStep] = useState(1)
  const [selectedPreset, setSelectedPreset] = useState<string>('flowsphere')
  const [categories, setCategories] = useState<CategoryConfig[]>(flowsphereCategories)
  const [workDomains, setWorkDomains] = useState<string[]>([])
  const [workKeywords, setWorkKeywords] = useState<string[]>([])
  const [personalDomains, setPersonalDomains] = useState<string[]>(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'])
  const [prioritySenders, setPrioritySenders] = useState<string[]>([])
  const [aiAssisted, setAiAssisted] = useState(true)

  // Input states
  const [newWorkDomain, setNewWorkDomain] = useState('')
  const [newWorkKeyword, setNewWorkKeyword] = useState('')
  const [newPersonalDomain, setNewPersonalDomain] = useState('')
  const [newPrioritySender, setNewPrioritySender] = useState('')

  // Load initial settings if editing
  useEffect(() => {
    if (initialSettings) {
      setSelectedPreset(initialSettings.preset)
      setCategories(initialSettings.categories)
      setWorkDomains(initialSettings.workDomains)
      setWorkKeywords(initialSettings.workKeywords)
      setPersonalDomains(initialSettings.personalDomains)
      setPrioritySenders(initialSettings.prioritySenders)
      setAiAssisted(initialSettings.aiAssisted)
    }
  }, [initialSettings])

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId)
    const preset = presets.find(p => p.id === presetId)
    if (preset) {
      setCategories([...preset.categories])
    }
  }

  const toggleCategory = (categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat
      )
    )
  }

  const addWorkDomain = () => {
    const domain = newWorkDomain.trim().toLowerCase()
    if (domain && !workDomains.includes(domain)) {
      setWorkDomains([...workDomains, domain])
      setNewWorkDomain('')
    }
  }

  const addWorkKeyword = () => {
    const keyword = newWorkKeyword.trim().toLowerCase()
    if (keyword && !workKeywords.includes(keyword)) {
      setWorkKeywords([...workKeywords, keyword])
      setNewWorkKeyword('')
    }
  }

  const addPersonalDomain = () => {
    const domain = newPersonalDomain.trim().toLowerCase()
    if (domain && !personalDomains.includes(domain)) {
      setPersonalDomains([...personalDomains, domain])
      setNewPersonalDomain('')
    }
  }

  const addPrioritySender = () => {
    const sender = newPrioritySender.trim().toLowerCase()
    if (sender && !prioritySenders.includes(sender)) {
      setPrioritySenders([...prioritySenders, sender])
      setNewPrioritySender('')
    }
  }

  const handleComplete = () => {
    const settings: UserCategorizationSettings = {
      preset: selectedPreset,
      categories,
      workDomains,
      workKeywords,
      personalDomains,
      prioritySenders,
      aiAssisted,
      setupComplete: true,
      lastUpdated: new Date().toISOString(),
    }

    // Save to localStorage
    localStorage.setItem(EMAIL_CATEGORIZATION_KEY, JSON.stringify(settings))
    localStorage.setItem(EMAIL_CATEGORIZATION_COMPLETE_KEY, 'true')

    // Also update the work categorization settings for the AI classifier
    const workCategorizationSettings = {
      workKeywords,
      workDomains,
      personalDomains,
    }
    localStorage.setItem('flowsphere-work-categorization', JSON.stringify(workCategorizationSettings))

    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('flowsphere-email-rules-updated'))

    onComplete(settings)
    toast.success('Email categorization preferences saved!')
    onOpenChange(false)
  }

  const totalSteps = 4

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Gear className="w-6 h-6 text-white" weight="fill" />
            </div>
            <div>
              <DialogTitle className="text-xl">Email Categorization Setup</DialogTitle>
              <DialogDescription>
                Choose how FlowSphere organizes your emails
              </DialogDescription>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i + 1 <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Step {step} of {totalSteps}:{' '}
            {step === 1 && 'Choose a preset'}
            {step === 2 && 'Configure categories'}
            {step === 3 && 'Define your work & personal'}
            {step === 4 && 'Review & finish'}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Choose Preset */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">How would you like to organize your emails?</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose a preset based on popular email services, or customize your own
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {presets.map(preset => (
                      <Card
                        key={preset.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedPreset === preset.id
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => handlePresetSelect(preset.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              preset.id === 'gmail' ? 'bg-red-500/10' :
                              preset.id === 'outlook' ? 'bg-blue-500/10' : 'bg-primary/10'
                            }`}>
                              <preset.icon className={`w-6 h-6 ${
                                preset.id === 'gmail' ? 'text-red-500' :
                                preset.id === 'outlook' ? 'text-blue-500' : 'text-primary'
                              }`} weight="duotone" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{preset.name}</h4>
                                {selectedPreset === preset.id && (
                                  <Badge variant="default" className="text-xs">Selected</Badge>
                                )}
                                {preset.id === 'flowsphere' && (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <Robot className="w-3 h-3" />
                                    AI-Powered
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {preset.description}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {preset.categories.filter(c => c.enabled).slice(0, 5).map(cat => (
                                  <Badge key={cat.id} variant="outline" className="text-xs">
                                    {cat.displayName}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {selectedPreset === preset.id && (
                              <CheckCircle className="w-6 h-6 text-primary" weight="fill" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Configure Categories */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Customize your categories</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable categories to match your workflow
                    </p>
                  </div>

                  <div className="space-y-3">
                    {categories.map(category => (
                      <Card key={category.id} className={`transition-all ${!category.enabled ? 'opacity-60' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${category.color}-500/10`}>
                              <category.icon className={`w-5 h-5 text-${category.color}-500`} weight="duotone" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{category.displayName}</h4>
                                <Switch
                                  checked={category.enabled}
                                  onCheckedChange={() => toggleCategory(category.id)}
                                />
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {category.description}
                              </p>
                              {category.examples.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {category.examples.map((ex, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {ex}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Define Work & Personal */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Define what's Work vs Personal</h3>
                    <p className="text-sm text-muted-foreground">
                      Tell FlowSphere how to identify your work and personal emails
                    </p>
                  </div>

                  <Tabs defaultValue="work" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="work" className="gap-2">
                        <Briefcase className="w-4 h-4" />
                        Work
                      </TabsTrigger>
                      <TabsTrigger value="personal" className="gap-2">
                        <User className="w-4 h-4" />
                        Personal
                      </TabsTrigger>
                      <TabsTrigger value="priority" className="gap-2">
                        <Lightning className="w-4 h-4" />
                        Priority
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="work" className="space-y-4 mt-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-blue-500" />
                            Work Email Domains
                          </CardTitle>
                          <CardDescription>
                            Emails from these domains will be categorized as Work
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g., mycompany.com"
                              value={newWorkDomain}
                              onChange={e => setNewWorkDomain(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addWorkDomain()}
                            />
                            <Button onClick={addWorkDomain} size="icon">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-muted/30 rounded-lg">
                            {workDomains.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No work domains added yet</p>
                            ) : (
                              workDomains.map(domain => (
                                <Badge key={domain} variant="secondary" className="gap-1">
                                  {domain}
                                  <button onClick={() => setWorkDomains(prev => prev.filter(d => d !== domain))}>
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Tag className="w-4 h-4 text-blue-500" />
                            Work Keywords
                          </CardTitle>
                          <CardDescription>
                            Emails containing these words will be categorized as Work
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g., project, meeting, deadline"
                              value={newWorkKeyword}
                              onChange={e => setNewWorkKeyword(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addWorkKeyword()}
                            />
                            <Button onClick={addWorkKeyword} size="icon">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-muted/30 rounded-lg">
                            {workKeywords.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No work keywords added yet</p>
                            ) : (
                              workKeywords.map(keyword => (
                                <Badge key={keyword} variant="secondary" className="gap-1">
                                  {keyword}
                                  <button onClick={() => setWorkKeywords(prev => prev.filter(k => k !== keyword))}>
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))
                            )}
                          </div>
                          <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
                            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              <strong>Tip:</strong> Only add keywords specific to YOUR work. Generic words like "meeting" might catch personal events too.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="personal" className="space-y-4 mt-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <User className="w-4 h-4 text-green-500" />
                            Personal Email Domains
                          </CardTitle>
                          <CardDescription>
                            Emails from individuals using these domains will be Personal
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g., gmail.com, yahoo.com"
                              value={newPersonalDomain}
                              onChange={e => setNewPersonalDomain(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addPersonalDomain()}
                            />
                            <Button onClick={addPersonalDomain} size="icon">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-muted/30 rounded-lg">
                            {personalDomains.map(domain => (
                              <Badge key={domain} variant="secondary" className="gap-1">
                                {domain}
                                <button onClick={() => setPersonalDomains(prev => prev.filter(d => d !== domain))}>
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg">
                            <Info className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              <strong>Note:</strong> Only emails from real people (not automated/noreply) at these domains will be categorized as Personal.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="priority" className="space-y-4 mt-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Lightning className="w-4 h-4 text-yellow-500" />
                            Priority Senders
                          </CardTitle>
                          <CardDescription>
                            Emails from these senders will always be highlighted
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g., boss@company.com, spouse@gmail.com"
                              value={newPrioritySender}
                              onChange={e => setNewPrioritySender(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addPrioritySender()}
                            />
                            <Button onClick={addPrioritySender} size="icon">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-muted/30 rounded-lg">
                            {prioritySenders.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No priority senders added yet</p>
                            ) : (
                              prioritySenders.map(sender => (
                                <Badge key={sender} variant="secondary" className="gap-1">
                                  {sender}
                                  <button onClick={() => setPrioritySenders(prev => prev.filter(s => s !== sender))}>
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Robot className="w-5 h-5 text-primary" weight="fill" />
                              </div>
                              <div>
                                <h4 className="font-semibold">AI-Assisted Categorization</h4>
                                <p className="text-sm text-muted-foreground">
                                  Use Groq AI to intelligently categorize ambiguous emails
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={aiAssisted}
                              onCheckedChange={setAiAssisted}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" weight="fill" />
                    </div>
                    <h3 className="text-lg font-semibold">Review your settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Here's how FlowSphere will organize your emails
                    </p>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Selected Preset</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="default" className="text-sm">
                        {presets.find(p => p.id === selectedPreset)?.name}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Enabled Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {categories.filter(c => c.enabled).map(cat => (
                          <Badge key={cat.id} variant="secondary" className="gap-1">
                            <cat.icon className="w-3 h-3" />
                            {cat.displayName}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-blue-500" />
                          Work
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <p className="text-muted-foreground">
                          {workDomains.length} domain{workDomains.length !== 1 ? 's' : ''},{' '}
                          {workKeywords.length} keyword{workKeywords.length !== 1 ? 's' : ''}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <User className="w-4 h-4 text-green-500" />
                          Personal
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <p className="text-muted-foreground">
                          {personalDomains.length} domain{personalDomains.length !== 1 ? 's' : ''}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Robot className="w-6 h-6 text-primary" weight="fill" />
                        <div>
                          <p className="font-medium">
                            AI Categorization: {aiAssisted ? 'Enabled' : 'Disabled'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {aiAssisted
                              ? 'FlowSphere will use AI to intelligently categorize your emails'
                              : 'Emails will be categorized using your rules only'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer with navigation */}
        <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button onClick={() => setStep(step + 1)} className="gap-2">
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} className="gap-2 bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4" />
              Save & Apply
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper function to check if setup is complete
export function isCategorizationSetupComplete(): boolean {
  return localStorage.getItem(EMAIL_CATEGORIZATION_COMPLETE_KEY) === 'true'
}

// Helper function to get saved settings
export function getSavedCategorizationSettings(): UserCategorizationSettings | null {
  try {
    const saved = localStorage.getItem(EMAIL_CATEGORIZATION_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

// Helper function to clear setup (for testing or reset)
export function clearCategorizationSetup(): void {
  localStorage.removeItem(EMAIL_CATEGORIZATION_KEY)
  localStorage.removeItem(EMAIL_CATEGORIZATION_COMPLETE_KEY)
}
