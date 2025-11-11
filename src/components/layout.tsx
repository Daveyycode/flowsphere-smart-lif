import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { House, Cpu, Users, Gear, Sparkle, Bell, Lightning, Camera, BookOpen, Phone, Newspaper } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
  currentTab: 'dashboard' | 'devices' | 'family' | 'notifications' | 'settings' | 'subscription' | 'terms' | 'privacy' | 'prayer' | 'resources' | 'meeting-notes' | 'permissions' | 'traffic' | 'ai-voice'
  onTabChange: (tab: 'dashboard' | 'devices' | 'family' | 'notifications' | 'settings' | 'subscription' | 'terms' | 'privacy' | 'prayer' | 'resources' | 'meeting-notes' | 'permissions' | 'traffic' | 'ai-voice') => void
}

export function Layout({ children, currentTab, onTabChange }: LayoutProps) {
  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: House },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'devices' as const, label: 'Devices & Automations', icon: Cpu },
    { id: 'family' as const, label: 'Family', icon: Users },
    { id: 'prayer' as const, label: 'Prayer', icon: BookOpen },
    { id: 'resources' as const, label: 'Resources', icon: Newspaper },
    { id: 'settings' as const, label: 'Settings', icon: Gear }
  ]

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-light via-blue-mid to-blue-deep" />
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Sparkle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-mid" weight="fill" />
              <div className="absolute inset-0 bg-blue-mid/30 blur-lg" />
            </div>
            <span className="font-heading font-bold text-lg sm:text-xl md:text-2xl bg-gradient-to-r from-blue-mid to-accent bg-clip-text text-transparent">FlowSphere</span>
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
                    'relative px-3 lg:px-4 py-2 rounded-lg text-sm lg:text-base font-medium transition-colors',
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4 lg:w-5 lg:h-5" weight={isActive ? 'fill' : 'regular'} />
                    <span>{tab.label}</span>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-light/20 via-blue-mid/10 to-transparent rounded-lg -z-10 border border-blue-mid/30"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl safe-area-inset-bottom">
        <div className="grid grid-cols-5 h-16 sm:h-18">
          {tabs.filter(tab => ['dashboard', 'notifications', 'devices', 'family', 'resources'].includes(tab.id)).map((tab) => {
            const Icon = tab.icon
            const isActive = currentTab === tab.id
            const label = tab.id === 'devices' ? 'Devices' : tab.label
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex flex-col items-center justify-center space-y-0.5 sm:space-y-1 transition-colors active:scale-95',
                  isActive ? 'text-blue-mid' : 'text-muted-foreground'
                )}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" weight={isActive ? 'fill' : 'regular'} />
                <span className="text-[10px] sm:text-xs font-medium leading-tight">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
      
      <div className="md:hidden h-16 sm:h-18" />
    </div>
  )
}
