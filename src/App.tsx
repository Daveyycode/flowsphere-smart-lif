import { useState, useEffect } from 'react'
import { useKV } from '@/hooks/use-kv'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { initializeSleepTracking, getTodaySleepData } from '@/lib/sleep-tracking'
import { initializeSecurity } from '@/lib/security-utils'
import { NotificationSyncStore } from '@/lib/shared-data-store'
// Removed: DemoModeIndicator - Production only
import { LandingPage } from '@/components/landing-page'
import { AuthModal } from '@/components/auth-modal'
import { Layout } from '@/components/layout'
import { DashboardView } from '@/components/dashboard-view'
import { DevicesAutomationsView, Device, Automation } from '@/components/devices-automations-view'
import { FamilyView, FamilyMember } from '@/components/family-view'
import { SettingsView } from '@/components/settings-view'
import { NotificationsResourcesView, Notification } from '@/components/notifications-resources-view'
import { MorningBrief } from '@/components/morning-brief'
import { AIAssistant } from '@/components/ai-assistant'
import { SubscriptionManagement } from '@/components/subscription-management'
import { SubscriptionMonitoring } from '@/components/subscription-monitoring'
import { SubscriptionGate } from '@/components/subscription-gate'
import { TermsOfService } from '@/components/terms-of-service'
import { PrivacyPolicy } from '@/components/privacy-policy'
import { MeetingNotes } from '@/components/meeting-notes'
import { PermissionsSettings } from '@/components/permissions-settings'
import { TrafficUpdate } from '@/components/traffic-update'
import { AIVoiceSettings } from '@/components/ai-voice-settings'
import { Vault } from '@/components/vault'
import { WeatherView } from '@/components/weather-view'
import { SmartTimerView } from '@/components/smart-timer-view'
import { FocusReportView } from '@/components/focus-report-view'
import { TutorAIView } from '@/components/tutor-ai-view'
import { StudyMonitorView } from '@/components/study-monitor-view'
import { SchedulerAIView } from '@/components/scheduler-ai-view'
import { SmartDevicesView } from '@/components/smart-devices-view'
import { AIProviderSettings } from '@/components/ai-provider-settings'
import { RemoteTimerRoom } from '@/components/remote-timer-room'
import { RemoteTimerPresenter } from '@/components/remote-timer-presenter'
import { KidsLearningCenter } from '@/components/kids-learning-center'
import { HashFLPrivacy } from '@/components/hash-fl-privacy'
import { Toaster } from '@/components/ui/sonner'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Lock } from '@phosphor-icons/react'
import { useTheme } from '@/hooks/use-theme'
import { useDeviceInfo } from '@/hooks/use-mobile'
import { InstallPrompt } from '@/components/install-prompt'
import {
  initialDevices,
  initialFamilyMembers,
  initialNotifications,
  initialAutomations
} from '@/lib/initial-data'
import { getEffectiveTier, getRemainingTrialDays } from '@/lib/subscription-utils'
import { EmailMonitorService } from '@/components/email-monitor-service'

function App() {
  const { mode, colorTheme, toggleMode, setColorTheme } = useTheme()
  const deviceInfo = useDeviceInfo()

  // URL-based timer routing state
  const [timerRoute, setTimerRoute] = useState<{
    roomCode: string
    mode: 'presenter' | 'controller'
  } | null>(null)

  // Check URL for timer routes on mount
  useEffect(() => {
    const checkTimerRoute = () => {
      const path = window.location.pathname
      const timerMatch = path.match(/^\/timer\/([A-Z0-9]{6})(\/control)?$/i)

      if (timerMatch) {
        const roomCode = timerMatch[1].toUpperCase()
        const isController = !!timerMatch[2]
        setTimerRoute({ roomCode, mode: isController ? 'controller' : 'presenter' })
      } else {
        setTimerRoute(null)
      }
    }

    checkTimerRoute()
    window.addEventListener('popstate', checkTimerRoute)
    return () => window.removeEventListener('popstate', checkTimerRoute)
  }, [])

  const [isAuthenticated, setIsAuthenticated] = useKV<boolean>('flowsphere-authenticated', false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null)
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'devices' | 'family' | 'notifications' | 'resources' | 'prayer' | 'settings' | 'subscription' | 'subscription-monitoring' | 'terms' | 'privacy' | 'meeting-notes' | 'permissions' | 'traffic' | 'ai-voice' | 'vault' | 'weather' | 'smart-timer' | 'tutor-ai' | 'focus-report' | 'study-monitor' | 'scheduler' | 'smart-devices' | 'ai-settings' | 'remote-timer' | 'kids-learning' | 'hash-fl'>('dashboard')
  
  const [devices, setDevices] = useKV<Device[]>('flowsphere-devices', initialDevices)
  const [familyMembers, setFamilyMembers] = useKV<FamilyMember[]>('flowsphere-family', initialFamilyMembers)
  const [notificationsList, setNotificationsList] = useKV<Notification[]>('flowsphere-notifications-list', initialNotifications)
  const [automations, setAutomations] = useKV<Automation[]>('flowsphere-automations', initialAutomations)
  
  const [userName, setUserName] = useKV<string>('flowsphere-user-name', '')
  const [userEmail, setUserEmail] = useKV<string>('flowsphere-user-email', '')
  const [subscription, setSubscription] = useKV<'basic' | 'pro' | 'gold' | 'family'>('flowsphere-subscription', 'pro')
  const [trialStartDate, setTrialStartDate] = useKV<string | null>('flowsphere-trial-start', null)
  const [dndEnabled, setDndEnabled] = useKV<boolean>('flowsphere-dnd-enabled', false)
  const [emergencyOverride, setEmergencyOverride] = useKV<number>('flowsphere-emergency-override', 3)
  const [showMorningBrief, setShowMorningBrief] = useKV<boolean>('flowsphere-show-morning-brief', true)
  const [lastBriefDate, setLastBriefDate] = useKV<string>('flowsphere-last-brief-date', '')
  const [notificationSettings, setNotificationSettings] = useKV<{
    email: boolean
    push: boolean
    sms: boolean
  }>('flowsphere-notification-settings', {
    email: true,
    push: true,
    sms: false
  })

  const effectiveTier = getEffectiveTier(subscription || 'basic', trialStartDate || null)
  const remainingTrialDays = getRemainingTrialDays(trialStartDate || null)

  // Check for existing Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // PRODUCTION: Always require email verification
      if (session && session.user?.email_confirmed_at) {
        setIsAuthenticated(true)
      }
    }).catch((error) => {
      // Handle session fetch error gracefully
      console.error('Failed to get session:', error)
    })

    // Listen for auth state changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // PRODUCTION: Always require email verification
      if (session && session.user?.email_confirmed_at) {
        setIsAuthenticated(true)
      } else if (event === 'SIGNED_OUT') {
        // Only reset auth state on explicit sign out, not on session checks
        setIsAuthenticated(false)
      }
      // Don't reset isAuthenticated on other events - preserve manual auth state
    })

    return () => authSubscription.unsubscribe()
  }, [setIsAuthenticated])

  const [hasSeenPermissionsPrompt, setHasSeenPermissionsPrompt] = useKV<boolean>('flowsphere-permissions-prompted', false)

  useEffect(() => {
    if (isAuthenticated && !trialStartDate) {
      setTrialStartDate(new Date().toISOString())
    }
  }, [isAuthenticated, trialStartDate, setTrialStartDate])

  // Auto-prompt permissions on first login (only if no email accounts)
  useEffect(() => {
    if (isAuthenticated && !hasSeenPermissionsPrompt) {
      // Check if email accounts already connected
      const emailAccounts = localStorage.getItem('flowsphere-email-accounts')
      let hasEmailAccounts = false
      try {
        hasEmailAccounts = emailAccounts ? JSON.parse(emailAccounts).length > 0 : false
      } catch {
        // Invalid JSON in localStorage, ignore
        hasEmailAccounts = false
      }

      if (!hasEmailAccounts) {
        // Show permissions page after a brief delay
        setTimeout(() => {
          setCurrentTab('permissions')
          setHasSeenPermissionsPrompt(true)
        }, 2000)
      } else {
        // Skip prompt if already has email accounts
        setHasSeenPermissionsPrompt(true)
      }
    }
  }, [isAuthenticated, hasSeenPermissionsPrompt, setHasSeenPermissionsPrompt])

  // Initialize sleep tracking
  useEffect(() => {
    if (isAuthenticated) {
      initializeSleepTracking()
    }
  }, [isAuthenticated])

  // Initialize security utilities on app start
  useEffect(() => {
    initializeSecurity()
  }, [])

  useEffect(() => {
    const today = new Date().toDateString()
    if (isAuthenticated && lastBriefDate !== today) {
      setShowMorningBrief(true)
      setLastBriefDate(today)
    }
  }, [isAuthenticated, lastBriefDate, setShowMorningBrief, setLastBriefDate])

  // SYNC FIX: Subscribe to email notifications from shared store
  useEffect(() => {
    if (!isAuthenticated) return

    const unsubscribe = NotificationSyncStore.subscribe((notification) => {
      // Add email notification to the notifications list
      const newNotification: Notification = {
        id: notification.id,
        type: notification.category === 'emergency' ? 'urgent' :
              notification.category === 'important' ? 'important' : 'email',
        title: notification.title,
        message: notification.message,
        time: new Date(notification.timestamp).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        }),
        isRead: false
      }

      setNotificationsList((current) => {
        // Avoid duplicates
        const exists = (current || []).some(n => n.id === notification.id)
        if (exists) return current
        return [newNotification, ...(current || [])].slice(0, 50) // Keep last 50
      })

      // Also add to recent activity
      addActivity('email', `New ${notification.category} email from ${notification.from}`)
    })

    return unsubscribe
  }, [isAuthenticated, setNotificationsList])

  const stats = {
    activeDevices: devices?.filter(d => d.isOn).length || 0,
    totalDevices: devices?.length || 0,
    familyMembers: familyMembers?.length || 0,
    automations: automations?.length || 0
  }

  // Recent activity tracked from actual device, family, and automation events
  const [recentActivity, setRecentActivity] = useKV<Array<{id: string, type: string, message: string, time: string}>>('flowsphere-recent-activity', [])

  // Helper function to add activity
  const addActivity = (type: string, message: string) => {
    const newActivity = {
      id: Date.now().toString(),
      type,
      message,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    setRecentActivity((current) => [newActivity, ...(current || [])].slice(0, 10)) // Keep last 10 activities
  }

  const handleDeviceUpdate = (id: string, updates: Partial<Device>) => {
    setDevices((currentDevices) => {
      const device = (currentDevices || []).find(d => d.id === id)
      if (device && updates.isOn !== undefined) {
        addActivity('device', `${device.name} turned ${updates.isOn ? 'on' : 'off'}`)
      } else if (device && updates.brightness !== undefined) {
        addActivity('device', `${device.name} brightness set to ${updates.brightness}%`)
      } else if (device && updates.temperature !== undefined) {
        addActivity('device', `${device.name} temperature set to ${updates.temperature}°`)
      } else if (device && updates.locked !== undefined) {
        addActivity('device', `${device.name} ${updates.locked ? 'locked' : 'unlocked'}`)
      }
      return (currentDevices || []).map(device =>
        device.id === id ? { ...device, ...updates } : device
      )
    })
  }

  const handleAddDevice = (newDevice: Omit<Device, 'id'>) => {
    addActivity('device', `New device added: ${newDevice.name}`)
    setDevices((currentDevices) => [
      ...(currentDevices || []),
      { ...newDevice, id: Date.now().toString() }
    ])
  }

  const handleDeleteDevice = (id: string) => {
    const device = (devices || []).find(d => d.id === id)
    if (device) {
      addActivity('device', `Device removed: ${device.name}`)
    }
    setDevices((currentDevices) =>
      (currentDevices || []).filter(device => device.id !== id)
    )
  }

  const handleUpdateFamilyMember = (id: string, updates: Partial<FamilyMember>) => {
    const member = (familyMembers || []).find(m => m.id === id)
    if (member && updates.location) {
      addActivity('family', `${member.name} location updated: ${updates.location}`)
    } else if (member && updates.status) {
      addActivity('family', `${member.name} status: ${updates.status}`)
    }
    setFamilyMembers((currentMembers) =>
      (currentMembers || []).map(member =>
        member.id === id ? { ...member, ...updates } : member
      )
    )
  }

  const handleNotificationChange = (type: 'email' | 'push' | 'sms', value: boolean) => {
    setNotificationSettings((current) => ({
      ...(current || { email: true, push: true, sms: false }),
      [type]: value
    }))
  }

  const handleMarkNotificationRead = (id: string) => {
    setNotificationsList((current) =>
      (current || []).map(notif =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    )
  }

  const handleDeleteNotification = (id: string) => {
    setNotificationsList((current) =>
      (current || []).filter(notif => notif.id !== id)
    )
  }

  const handleToggleAutomation = (id: string, isActive: boolean) => {
    const automation = (automations || []).find(a => a.id === id)
    if (automation) {
      addActivity('automation', `${automation.name} ${isActive ? 'activated' : 'deactivated'}`)
    }
    setAutomations((current) =>
      (current || []).map(automation =>
        automation.id === id ? { ...automation, isActive } : automation
      )
    )
  }

  const handleDeleteAutomation = (id: string) => {
    const automation = (automations || []).find(a => a.id === id)
    if (automation) {
      addActivity('automation', `Automation removed: ${automation.name}`)
    }
    setAutomations((current) =>
      (current || []).filter(automation => automation.id !== id)
    )
  }

  const handleAddAutomation = (newAutomation: Omit<Automation, 'id'>) => {
    addActivity('automation', `New automation created: ${newAutomation.name}`)
    setAutomations((current) => [
      ...(current || []),
      { ...newAutomation, id: Date.now().toString() }
    ])
  }

  const handleSubscriptionChange = (plan: 'basic' | 'pro' | 'gold' | 'family') => {
    setSubscription(plan)
  }

  const handleLogout = async () => {
    // Sign out from Supabase
    await supabase.auth.signOut()

    setIsAuthenticated(false)
    setCurrentTab('dashboard')
    setShowMorningBrief(true)
    // Clear CEO authentication flag on logout
    localStorage.removeItem('flowsphere_ceo_authenticated')
    localStorage.removeItem('flowsphere_ceo_email')
  }

  const handleNavigateFromSettings = (destination: 'subscription' | 'subscription-monitoring' | 'terms' | 'privacy' | 'permissions' | 'ai-voice' | 'vault') => {
    setCurrentTab(destination)
  }

  const handleTabChange = (tab: typeof currentTab) => {
    setCurrentTab(tab)
  }

  const handleAuthSuccess = (user: { email: string; name: string }) => {
    setIsAuthenticated(true)
    setAuthMode(null)
  }

  // Handle timer routes - these don't require authentication
  if (timerRoute) {
    const handleTimerExit = () => {
      setTimerRoute(null)
      window.history.pushState({}, '', '/')
    }

    // Presenter view - full screen timer display
    if (timerRoute.mode === 'presenter') {
      return (
        <>
          <RemoteTimerPresenter
            roomCode={timerRoute.roomCode}
            onExit={handleTimerExit}
          />
          <Toaster position="top-center" />
        </>
      )
    }

    // Controller view - redirect to app with remote timer tab
    // For controllers, we'll show the main app with remote timer room
    return (
      <>
        <RemoteTimerRoom
          initialRoomCode={timerRoute.roomCode}
          initialMode="controller"
          onBack={handleTimerExit}
        />
        <Toaster position="top-center" />
      </>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <LandingPage
          onSignIn={() => setAuthMode('signin')}
          onSignUp={() => setAuthMode('signup')}
        />
        {authMode && (
          <AuthModal
            mode={authMode}
            onClose={() => setAuthMode(null)}
            onSuccess={handleAuthSuccess}
          />
        )}
        <Toaster position="top-center" />
      </>
    )
  }

  return (
    <>
      {/* Global Email Monitoring Service */}
      <EmailMonitorService />

      <Layout currentTab={currentTab} onTabChange={handleTabChange}>
        {currentTab === 'dashboard' && showMorningBrief && (
          <MorningBrief
            isVisible={showMorningBrief}
            onDismiss={() => setShowMorningBrief(false)}
            onTabChange={handleTabChange}
          />
        )}
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                recentActivity={recentActivity || []}
                onTabChange={handleTabChange}
                deviceInfo={deviceInfo}
              />
            )}
            {currentTab === 'notifications' && (
              <NotificationsResourcesView
                notifications={notificationsList || []}
                onMarkRead={handleMarkNotificationRead}
                onDelete={handleDeleteNotification}
                dndEnabled={dndEnabled || false}
                onDndToggle={setDndEnabled}
                emergencyOverride={emergencyOverride || 3}
                onEmergencyOverrideChange={setEmergencyOverride}
              />
            )}
            {currentTab === 'devices' && (
              <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Lock className="w-8 h-8 text-yellow-500" weight="fill" />
                    </div>
                    <h2 className="text-2xl font-bold">Available Soon</h2>
                    <p className="text-muted-foreground">
                      Device management features are currently under development.
                      We're working hard to bring you smart device integration and automation controls.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
            {currentTab === 'family' && (
              <FamilyView
                members={familyMembers || []}
                onUpdateMember={handleUpdateFamilyMember}
              />
            )}
            {currentTab === 'meeting-notes' && <MeetingNotes />}
            {currentTab === 'permissions' && <PermissionsSettings />}
            {currentTab === 'traffic' && <TrafficUpdate deviceInfo={deviceInfo} />}
            {currentTab === 'weather' && <WeatherView deviceInfo={deviceInfo} />}
            {currentTab === 'ai-voice' && <AIVoiceSettings />}
            {currentTab === 'smart-timer' && <SmartTimerView userId={userEmail || 'default-user'} onTabChange={handleTabChange} />}
            {currentTab === 'remote-timer' && <RemoteTimerRoom onBack={() => handleTabChange('smart-timer')} />}
            {currentTab === 'focus-report' && <FocusReportView />}
            {currentTab === 'tutor-ai' && <TutorAIView />}
            {currentTab === 'study-monitor' && <StudyMonitorView />}
            {currentTab === 'kids-learning' && <KidsLearningCenter />}
            {currentTab === 'hash-fl' && <HashFLPrivacy />}
            {currentTab === 'scheduler' && <SchedulerAIView />}
            {currentTab === 'smart-devices' && <SmartDevicesView />}
            {currentTab === 'ai-settings' && <AIProviderSettings />}
            {currentTab === 'settings' && (
              <SettingsView
                userName={userName || 'User'}
                userEmail={userEmail || 'user@example.com'}
                subscription={subscription || 'basic'}
                notifications={notificationSettings || { email: true, push: true, sms: false }}
                onNotificationChange={handleNotificationChange}
                onUserNameChange={setUserName}
                onUserEmailChange={setUserEmail}
                onNavigate={handleNavigateFromSettings}
                onLogout={handleLogout}
              />
            )}
            {currentTab === 'vault' && (
              <Vault onNavigate={(view) => setCurrentTab(view as typeof currentTab)} />
            )}
            {currentTab === 'subscription' && (
              <SubscriptionManagement 
                currentPlan={subscription || 'basic'} 
                onPlanChange={handleSubscriptionChange}
              />
            )}
            {currentTab === 'subscription-monitoring' && (
              <SubscriptionGate
                requiredTier="pro"
                currentTier={effectiveTier}
                featureName="Subscription Monitoring"
                onUpgrade={() => setCurrentTab('subscription')}
              >
                <SubscriptionMonitoring 
                  currentFlowSpherePlan={subscription || 'basic'}
                  isOnTrial={effectiveTier === 'trial'}
                  trialDaysRemaining={remainingTrialDays}
                />
              </SubscriptionGate>
            )}
            {currentTab === 'terms' && <TermsOfService />}
            {currentTab === 'privacy' && <PrivacyPolicy />}
          </motion.div>
        </AnimatePresence>
      </Layout>
      
      <AIAssistant 
        onTabChange={handleTabChange}
        onDeviceUpdate={handleDeviceUpdate}
        onDndToggle={setDndEnabled}
        onAddDevice={handleAddDevice}
        onToggleAutomation={handleToggleAutomation}
        onAddAutomation={handleAddAutomation}
        onDeleteAutomation={handleDeleteAutomation}
        onMarkNotificationRead={handleMarkNotificationRead}
        onDeleteNotification={handleDeleteNotification}
        onEmergencyOverrideChange={setEmergencyOverride}
        onSubscriptionChange={handleSubscriptionChange}
        onThemeChange={setColorTheme}
        onThemeModeToggle={toggleMode}
        devices={devices || []}
        automations={automations || []}
        familyMembers={familyMembers || []}
        notifications={notificationsList || []}
        dndEnabled={dndEnabled || false}
        emergencyOverride={emergencyOverride || 3}
        subscription={subscription || 'basic'}
        currentTheme={colorTheme}
        currentThemeMode={mode}
      />
      <InstallPrompt />
      <Toaster position="top-center" />
    </>
  )
}

export default App
