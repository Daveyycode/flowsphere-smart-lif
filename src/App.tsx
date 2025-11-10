import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Layout } from '@/components/layout'
import { DashboardView } from '@/components/dashboard-view'
import { DevicesView, Device } from '@/components/devices-view'
import { FamilyView, FamilyMember } from '@/components/family-view'
import { SettingsView } from '@/components/settings-view'
import { AIAssistant } from '@/components/ai-assistant'
import { Toaster } from '@/components/ui/sonner'
import { motion, AnimatePresence } from 'framer-motion'

function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'devices' | 'family' | 'settings'>('dashboard')
  
  const [devices, setDevices] = useKV<Device[]>('flowsphere-devices', [])
  const [familyMembers] = useKV<FamilyMember[]>('flowsphere-family', [])
  const [userName] = useKV<string>('flowsphere-user-name', 'Sarah Johnson')
  const [userEmail] = useKV<string>('flowsphere-user-email', 'sarah@example.com')
  const [subscription] = useKV<'free' | 'premium' | 'family'>('flowsphere-subscription', 'premium')
  const [notifications, setNotifications] = useKV<{
    email: boolean
    push: boolean
    sms: boolean
  }>('flowsphere-notifications', {
    email: true,
    push: true,
    sms: false
  })

  const stats = {
    activeDevices: devices?.filter(d => d.isOn).length || 0,
    totalDevices: devices?.length || 0,
    familyMembers: familyMembers?.length || 0,
    automations: 3
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
    setNotifications((current) => ({
      ...(current || { email: true, push: true, sms: false }),
      [type]: value
    }))
  }

  return (
    <>
      <Layout currentTab={currentTab} onTabChange={setCurrentTab}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentTab === 'dashboard' && (
              <DashboardView stats={stats} recentActivity={recentActivity} />
            )}
            {currentTab === 'devices' && (
              <DevicesView 
                devices={devices || []} 
                onDeviceUpdate={handleDeviceUpdate}
                onAddDevice={handleAddDevice}
              />
            )}
            {currentTab === 'family' && (
              <FamilyView members={familyMembers || []} />
            )}
            {currentTab === 'settings' && (
              <SettingsView
                userName={userName || 'User'}
                userEmail={userEmail || 'user@example.com'}
                subscription={subscription || 'free'}
                notifications={notifications || { email: true, push: true, sms: false }}
                onNotificationChange={handleNotificationChange}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </Layout>
      
      <AIAssistant />
      <Toaster position="top-center" />
    </>
  )
}

export default App

