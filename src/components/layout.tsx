import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { House, Cpu, Users, Gear, Sparkle, Bell, Moon, Sun } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import { useDeviceType } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'

interface LayoutProps {
  children: ReactNode
  currentTab: 'dashboard' | 'devices' | 'family' | 'notifications' | 'settings' | 'subscription' | 'terms' | 'privacy' | 'meeting-notes' | 'permissions' | 'traffic' | 'ai-voice'
  onTabChange: (tab: 'dashboard' | 'devices' | 'family' | 'notifications' | 'settings' | 'subscription' | 'terms' | 'privacy' | 'meeting-notes' | 'permissions' | 'traffic' | 'ai-voice') => void
}

export function Layout({ children, currentTab, onTabChange }: LayoutProps) {
  const { mode, toggleMode } = useTheme()
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'
  const isTablet = deviceType === 'tablet'
  
  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: House },
    { id: 'notifications' as const, label: 'Notifications & Resources', icon: Bell },
    { id: 'devices' as const, label: 'Devices & Automations', icon: Cpu },
    { id: 'family' as const, label: 'Family', icon: Users },
    { id: 'settings' as const, label: 'Settings', icon: Gear }
  ]

  const headerHeight = isMobile ? 'h-14' : isTablet ? 'h-16' : 'h-16'
  const bottomNavHeight = isMobile ? 'h-16' : 'h-18'
  const containerPadding = isMobile ? 'px-3' : isTablet ? 'px-4' : 'px-6'
  const contentPadding = isMobile ? 'py-4' : isTablet ? 'py-6' : 'py-8'

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-light via-blue-mid to-blue-deep" />
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className={cn("container mx-auto flex items-center justify-between", containerPadding, headerHeight)}>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Sparkle className={cn("text-blue-mid", isMobile ? "w-6 h-6" : isTablet ? "w-7 h-7" : "w-8 h-8")} weight="fill" />
              <div className="absolute inset-0 bg-blue-mid/30 blur-lg" />
            </div>
            <span className={cn("font-heading font-bold bg-gradient-to-r from-blue-mid to-accent bg-clip-text text-transparent", isMobile ? "text-lg" : isTablet ? "text-xl" : "text-2xl")}>
              FlowSphere
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMode}
              className={cn("rounded-full min-touch-target", isMobile ? "w-9 h-9" : "w-10 h-10")}
              aria-label="Toggle dark mode"
            >
              {mode === 'dark' ? (
                <Sun className="w-5 h-5 text-foreground" weight="duotone" />
              ) : (
                <Moon className="w-5 h-5 text-foreground" weight="duotone" />
              )}
            </Button>
            
            <nav className="hidden md:flex items-center space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = currentTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      'relative py-2 rounded-lg font-medium transition-colors min-touch-target',
                      isTablet ? 'px-3 text-sm' : 'px-4 text-base',
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className={cn(isTablet ? "w-4 h-4" : "w-5 h-5")} weight={isActive ? 'fill' : 'regular'} />
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
        </div>
      </header>

      <main className={cn("container mx-auto", containerPadding, contentPadding)}>
        {children}
      </main>

      {(isMobile || isTablet) && (
        <>
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl safe-area-inset-bottom">
            <div className={cn("grid grid-cols-5", bottomNavHeight)}>
              {tabs.filter(tab => ['dashboard', 'notifications', 'devices', 'family', 'settings'].includes(tab.id)).map((tab) => {
                const Icon = tab.icon
                const isActive = currentTab === tab.id
                let label = tab.label
                if (tab.id === 'devices') label = 'Devices'
                if (tab.id === 'notifications') label = 'Alerts'
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      'flex flex-col items-center justify-center transition-colors active:scale-95 min-touch-target',
                      isMobile ? 'space-y-0.5' : 'space-y-1',
                      isActive ? 'text-blue-mid' : 'text-muted-foreground'
                    )}
                  >
                    <Icon className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} weight={isActive ? 'fill' : 'regular'} />
                    {!isMobile && (
                      <span className={cn("font-medium leading-tight", "text-xs")}>
                        {label}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </nav>
          
          <div className={bottomNavHeight} />
        </>
      )}
    </div>
  )
}
