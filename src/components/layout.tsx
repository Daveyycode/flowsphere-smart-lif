import { ReactNode, useState } from 'react'
import { motion } from 'framer-motion'
import { House, Cpu, Users, Gear, Sparkle, Bell, Lightning, Camera } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
  currentTab: 'dashboard' | 'devices' | 'family' | 'notifications' | 'cameras' | 'automations' | 'settings'
  onTabChange: (tab: 'dashboard' | 'devices' | 'family' | 'notifications' | 'cameras' | 'automations' | 'settings') => void
}

export function Layout({ children, currentTab, onTabChange }: LayoutProps) {
  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: House },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'devices' as const, label: 'Devices', icon: Cpu },
    { id: 'cameras' as const, label: 'Cameras', icon: Camera },
    { id: 'automations' as const, label: 'Automations', icon: Lightning },
    { id: 'family' as const, label: 'Family', icon: Users },
    { id: 'settings' as const, label: 'Settings', icon: Gear },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Sparkle className="w-7 h-7 text-accent" weight="fill" />
              <div className="absolute inset-0 bg-accent/30 blur-lg" />
            </div>
            <span className="font-heading font-bold text-xl">FlowSphere</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = currentTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'relative px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-5 h-5" weight={isActive ? 'fill' : 'regular'} />
                    <span>{tab.label}</span>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-secondary rounded-lg -z-10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl">
        <div className="grid grid-cols-4 h-16">
          {tabs.filter(tab => ['dashboard', 'notifications', 'devices', 'family'].includes(tab.id)).map((tab) => {
            const Icon = tab.icon
            const isActive = currentTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex flex-col items-center justify-center space-y-1 transition-colors',
                  isActive ? 'text-accent' : 'text-muted-foreground'
                )}
              >
                <Icon className="w-6 h-6" weight={isActive ? 'fill' : 'regular'} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
      
      <div className="md:hidden h-16" />
    </div>
  )
}
