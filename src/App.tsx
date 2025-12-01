import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { initializeSleepTracking, getTodaySleepData } from '@/lib/sleep-tracking'
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

function App() {
  const { mode, colorTheme, toggleMode, setColorTheme } = useTheme()
  const deviceInfo = useDeviceInfo()
  
  const [isAuthenticated, setIsAuthenticated] = useKV<boolean>('flowsphere-authenticated', false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null)
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'devices' | 'family' | 'notifications' | 'resources' | 'prayer' | 'settings' | 'subscription' | 'subscription-monitoring' | 'terms' | 'privacy' | 'meeting-notes' | 'permissions' | 'traffic' | 'ai-voice'>('dashboard')
  
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
      // Only authenticate if session exists AND email is verified
      if (session && session.user.email_confirmed_at) {
        setIsAuthenticated(true)
      }
    })

    // Listen for auth state changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only authenticate if session exists AND email is verified
      if (session && session.user.email_confirmed_at) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
    })

    return () => authSubscription.unsubscribe()
  }, [setIsAuthenticated])

  const [hasSeenPermissionsPrompt, setHasSeenPermissionsPrompt] = useKV<boolean>('flowsphere-permissions-prompted', false)

  useEffect(() => {
    if (isAuthenticated && !trialStartDate) {
      setTrialStartDate(new Date().toISOString())
    }
  }, [isAuthenticated, trialStartDate, setTrialStartDate])

  // Auto-prompt permissions on first login
  useEffect(() => {
    if (isAuthenticated && !hasSeenPermissionsPrompt) {
      // Show permissions page after a brief delay
      setTimeout(() => {
        setCurrentTab('permissions')
        setHasSeenPermissionsPrompt(true)
      }, 2000)
    }
  }, [isAuthenticated, hasSeenPermissionsPrompt, setHasSeenPermissionsPrompt])

  // Initialize sleep tracking
  useEffect(() => {
    if (isAuthenticated) {
      initializeSleepTracking()
    }
  }, [isAuthenticated])

  useEffect(() => {
    const today = new Date().toDateString()
    if (isAuthenticated && lastBriefDate !== today) {
      setShowMorningBrief(true)
      setLastBriefDate(today)
    }
  }, [isAuthenticated, lastBriefDate, setShowMorningBrief, setLastBriefDate])

  const stats = {
    activeDevices: devices?.filter(d => d.isOn).length || 0,
    totalDevices: devices?.length || 0,
    familyMembers: familyMembers?.length || 0,
    automations: automations?.length || 0
  }

  // Recent activity will be populated from actual device, family, and automation events
  const recentActivity: Array<{id: string, type: string, message: string, time: string}> = []

  const handleDeviceUpdate = (id: string, updates: Partial<Device>) => {
    setDevices((currentDevices) => 
      (currentDevices || []).map(device => 
        device.id === id ? { ...device, ...updates } : device
      )
    )
  }

  const handleAddDevice = (newDevice: Omit<Device, 'id'>) => {
    setDevices((currentDevices) => [
      ...(currentDevices || []),
      { ...newDevice, id: Date.now().toString() }
    ])
  }

  const handleDeleteDevice = (id: string) => {
    setDevices((currentDevices) =>
      (currentDevices || []).filter(device => device.id !== id)
    )
  }

  const handleUpdateFamilyMember = (id: string, updates: Partial<FamilyMember>) => {
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
    setAutomations((current) =>
      (current || []).map(automation =>
        automation.id === id ? { ...automation, isActive } : automation
      )
    )
  }

  const handleDeleteAutomation = (id: string) => {
    setAutomations((current) =>
      (current || []).filter(automation => automation.id !== id)
    )
  }

  const handleAddAutomation = (newAutomation: Omit<Automation, 'id'>) => {
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

  const handleNavigateFromSettings = (destination: 'subscription' | 'subscription-monitoring' | 'terms' | 'privacy' | 'permissions' | 'ai-voice') => {
    setCurrentTab(destination)
  }

  const handleTabChange = (tab: typeof currentTab) => {
    setCurrentTab(tab)
  }

  const handleAuthSuccess = (user: { email: string; name: string }) => {
    setIsAuthenticated(true)
    setAuthMode(null)
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
                recentActivity={recentActivity}
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
            {currentTab === 'ai-voice' && <AIVoiceSettings />}
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
