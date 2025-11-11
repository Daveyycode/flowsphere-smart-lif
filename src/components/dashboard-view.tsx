import { motion } from 'framer-motion'
import { Lightbulb, Thermometer, Lock, Eye, Lightning, TrendUp, Users as UsersIcon, House, Camera, CalendarBlank, Cloud, MapTrifold, Notebook } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface DashboardViewProps {
  stats: {
    activeDevices: number
    totalDevices: number
    familyMembers: number
    automations: number
  }
  recentActivity: Array<{
    id: string
    type: string
    message: string
    time: string
  }>
  onTabChange?: (tab: 'dashboard' | 'devices' | 'family' | 'notifications' | 'cameras' | 'automations' | 'settings' | 'subscription' | 'terms' | 'privacy' | 'prayer' | 'emergency' | 'resources' | 'meeting-notes' | 'permissions') => void
}

export function DashboardView({ stats, recentActivity, onTabChange }: DashboardViewProps) {
  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const statCards = [
    {
      title: 'Active Devices',
      value: stats.activeDevices,
      total: stats.totalDevices,
      icon: Lightbulb,
      color: 'mint',
      trend: '+12%'
    },
    {
      title: 'Family Members',
      value: stats.familyMembers,
      icon: UsersIcon,
      color: 'coral',
      trend: 'All safe'
    },
    {
      title: 'Automations',
      value: stats.automations,
      icon: Lightning,
      color: 'accent',
      trend: '3 active'
    },
    {
      title: 'Energy Usage',
      value: 87,
      unit: '%',
      icon: TrendUp,
      color: 'primary',
      trend: '-5% vs yesterday'
    }
  ]

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">{greeting()}</h1>
        <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
          Here's what's happening in your sphere today
        </p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${stat.color}`} weight="duotone" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                      {stat.trend}
                    </Badge>
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </h3>
                  <div className="flex items-baseline space-x-1 sm:space-x-2">
                    <p className="text-2xl sm:text-3xl font-bold">
                      {stat.value}
                    </p>
                    {stat.total && (
                      <span className="text-muted-foreground text-xs sm:text-sm">/ {stat.total}</span>
                    )}
                    {stat.unit && (
                      <span className="text-muted-foreground text-xs sm:text-sm">{stat.unit}</span>
                    )}
                  </div>
                  {stat.total && (
                    <Progress 
                      value={(stat.value / stat.total) * 100} 
                      className="mt-2 sm:mt-3 h-1.5"
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-blue-mid/20 bg-gradient-to-br from-blue-light/10 via-blue-mid/5 to-transparent">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <House className="w-4 h-4 sm:w-5 sm:h-5" weight="duotone" />
                <span>Quick Access</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                onClick={() => onTabChange?.('cameras')}
                className="p-3 sm:p-4 rounded-xl bg-blue-mid/10 hover:bg-blue-mid/20 border border-blue-mid/30 transition-all duration-200 hover:scale-105 active:scale-95 group"
              >
                <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-blue-mid mb-1 sm:mb-2 group-hover:scale-110 transition-transform" weight="duotone" />
                <p className="text-xs sm:text-sm font-medium leading-tight">Security Cameras</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">View live feeds</p>
              </button>
              
              <button
                onClick={() => onTabChange?.('meeting-notes')}
                className="p-3 sm:p-4 rounded-xl bg-accent/10 hover:bg-accent/20 border border-accent/30 transition-all duration-200 hover:scale-105 active:scale-95 group"
              >
                <Notebook className="w-5 h-5 sm:w-6 sm:h-6 text-accent mb-1 sm:mb-2 group-hover:scale-110 transition-transform" weight="duotone" />
                <p className="text-xs sm:text-sm font-medium leading-tight">Meeting Notes</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Voice transcription</p>
              </button>

              <button
                className="p-3 sm:p-4 rounded-xl bg-coral/10 hover:bg-coral/20 border border-coral/30 transition-all duration-200 hover:scale-105 active:scale-95 group"
              >
                <CalendarBlank className="w-5 h-5 sm:w-6 sm:h-6 text-coral mb-1 sm:mb-2 group-hover:scale-110 transition-transform" weight="duotone" />
                <p className="text-xs sm:text-sm font-medium leading-tight">Today's Schedule</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">3 events</p>
              </button>

              <button
                className="p-3 sm:p-4 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-all duration-200 hover:scale-105 active:scale-95 group"
              >
                <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-1 sm:mb-2 group-hover:scale-110 transition-transform" weight="duotone" />
                <p className="text-xs sm:text-sm font-medium leading-tight">Weather</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">72°F, Sunny</p>
              </button>

              <button
                onClick={() => onTabChange?.('family')}
                className="p-3 sm:p-4 rounded-xl bg-mint/10 hover:bg-mint/20 border border-mint/30 transition-all duration-200 hover:scale-105 active:scale-95 group"
              >
                <MapTrifold className="w-5 h-5 sm:w-6 sm:h-6 text-mint mb-1 sm:mb-2 group-hover:scale-110 transition-transform" weight="duotone" />
                <p className="text-xs sm:text-sm font-medium leading-tight">Commute</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">25 min to work</p>
              </button>

              <button
                onClick={() => onTabChange?.('devices')}
                className="p-3 sm:p-4 rounded-xl bg-blue-deep/10 hover:bg-blue-deep/20 border border-blue-deep/30 transition-all duration-200 hover:scale-105 active:scale-95 group"
              >
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-deep mb-1 sm:mb-2 group-hover:scale-110 transition-transform" weight="duotone" />
                <p className="text-xs sm:text-sm font-medium leading-tight">Lock All Doors</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Quick security</p>
              </button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                    className="flex items-start space-x-2 sm:space-x-3 pb-3 border-b border-border/50 last:border-0 last:pb-0"
                  >
                    <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{activity.message}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{activity.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Card className="border-blue-mid/30 bg-gradient-to-br from-blue-light/10 via-accent/5 to-coral/10 relative overflow-hidden">
          <div className="absolute inset-0 blue-ombre opacity-5" />
          <CardContent className="p-4 sm:p-5 md:p-6 relative">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-light to-blue-deep flex items-center justify-center flex-shrink-0">
                <Lightning className="w-5 h-5 sm:w-6 sm:h-6 text-white" weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">AI Insight</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                  Your living room lights have been on for 3+ hours during daytime. 
                  Consider creating an automation to turn them off when natural light is sufficient.
                </p>
                <button className="text-xs sm:text-sm font-medium text-blue-mid hover:underline">
                  Create automation →
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
