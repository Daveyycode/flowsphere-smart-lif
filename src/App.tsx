import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { AnimatePresence } from 'framer-motion'
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
import { motion } from 'framer-motion'
import { useTheme } from '@/hooks/use-theme'
import {
  initialDevices,
  initialFamilyMembers,
  initialNotifications,
  initialAutomations
} from '@/lib/initial-data'
import { getEffectiveTier, getRemainingTrialDays } from '@/lib/subscription-utils'

function App() {
  useTheme()
  
  const [isAuthenticated, setIsAuthenticated] = useKV<boolean>('flowsphere-authenticated', false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null)
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'devices' | 'family' | 'notifications' | 'resources' | 'prayer' | 'settings' | 'subscription' | 'subscription-monitoring' | 'terms' | 'privacy' | 'meeting-notes' | 'permissions' | 'traffic' | 'ai-voice'>('dashboard')
  
  const [devices, setDevices] = useKV<Device[]>('flowsphere-devices', initialDevices)
  const [familyMembers] = useKV<FamilyMember[]>('flowsphere-family', initialFamilyMembers)
  const [notificationsList, setNotificationsList] = useKV<Notification[]>('flowsphere-notifications-list', initialNotifications)
  const [automations, setAutomations] = useKV<Automation[]>('flowsphere-automations', initialAutomations)
  
  const [userName] = useKV<string>('flowsphere-user-name', 'Sarah Johnson')
  const [userEmail] = useKV<string>('flowsphere-user-email', 'sarah@example.com')
  const [subscription, setSubscription] = useKV<'basic' | 'pro' | 'gold' | 'family'>('flowsphere-subscription', 'pro')
  const [trialStartDate, setTrialStartDate] = useKV<string | null>('flowsphere-trial-start', null)
  const [dndEnabled, setDndEnabled] = useKV<boolean>('flowsphere-dnd-enabled', false)
  const [emergencyOverride, setEmergencyOverride] = useKV<number>('flowsphere-emergency-override', 3)
  const [showMorningBrief, setShowMorningBrief] = useKV<boolean>('flowsphere-show-morning-brief', true)
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

  useEffect(() => {
    if (isAuthenticated && !trialStartDate) {
      setTrialStartDate(new Date().toISOString())
    }
  }, [isAuthenticated, trialStartDate, setTrialStartDate])

  const stats = {
    activeDevices: devices?.filter(d => d.isOn).length || 0,
    totalDevices: devices?.length || 0,
    familyMembers: familyMembers?.length || 0,
    automations: automations?.length || 0
  }

  const recentActivity = [
    { id: '1', type: 'device', message: 'Living Room Light turned on', time: '2 minutes ago' },
    { id: '2', type: 'family', message: 'Alex arrived at school', time: '15 minutes ago' },
    { id: '3', type: 'automation', message: 'Morning routine completed', time: '1 hour ago' },
    { id: '4', type: 'device', message: 'Front door locked', time: '2 hours ago' }
  ]

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

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentTab('dashboard')
    setShowMorningBrief(true)
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
              <DevicesAutomationsView 
                devices={devices || []} 
                automations={automations || []}
                onDeviceUpdate={handleDeviceUpdate}
                onAddDevice={handleAddDevice}
                onToggleAutomation={handleToggleAutomation}
                onDeleteAutomation={handleDeleteAutomation}
                onAddAutomation={handleAddAutomation}
              />
            )}
            {currentTab === 'family' && (
              <FamilyView members={familyMembers || []} />
            )}
            {currentTab === 'meeting-notes' && <MeetingNotes />}
            {currentTab === 'permissions' && <PermissionsSettings />}
            {currentTab === 'traffic' && <TrafficUpdate />}
            {currentTab === 'ai-voice' && <AIVoiceSettings />}
            {currentTab === 'settings' && (
              <SettingsView
                userName={userName || 'User'}
                userEmail={userEmail || 'user@example.com'}
                subscription={subscription || 'basic'}
                notifications={notificationSettings || { email: true, push: true, sms: false }}
                onNotificationChange={handleNotificationChange}
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
        devices={devices || []}
        automations={automations || []}
        familyMembers={familyMembers || []}
        notifications={notificationsList || []}
        dndEnabled={dndEnabled || false}
        emergencyOverride={emergencyOverride || 3}
        subscription={subscription || 'basic'}
      />
      <Toaster position="top-center" />
    </>
  )
}

export default App
