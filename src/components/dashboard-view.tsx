import { motion } from 'framer-motion'
import { Lightbulb, Thermometer, Lock, Eye, Lightning, TrendUp, Users as UsersIcon, House } from '@phosphor-icons/react'
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
}

export function DashboardView({ stats, recentActivity }: DashboardViewProps) {
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
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <House className="w-4 h-4 sm:w-5 sm:h-5" weight="duotone" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { label: 'All Lights Off', icon: Lightbulb, color: 'mint' },
                { label: 'Lock Doors', icon: Lock, color: 'primary' },
                { label: 'Set Temperature', icon: Thermometer, color: 'coral' },
                { label: 'Check Cameras', icon: Eye, color: 'accent' }
              ].map((action) => {
                const ActionIcon = action.icon
                return (
                  <button
                    key={action.label}
                    className={`p-3 sm:p-4 rounded-xl bg-${action.color}/10 hover:bg-${action.color}/20 border border-${action.color}/20 transition-all duration-200 hover:scale-105 active:scale-95`}
                  >
                    <ActionIcon className={`w-5 h-5 sm:w-6 sm:h-6 text-${action.color} mb-1 sm:mb-2`} weight="duotone" />
                    <p className="text-xs sm:text-sm font-medium leading-tight">{action.label}</p>
                  </button>
                )
              })}
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
        <Card className="bg-gradient-to-br from-accent/10 via-primary/10 to-coral/10 border-accent/20">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Lightning className="w-5 h-5 sm:w-6 sm:h-6 text-accent" weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">AI Insight</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                  Your living room lights have been on for 3+ hours during daytime. 
                  Consider creating an automation to turn them off when natural light is sufficient.
                </p>
                <button className="text-xs sm:text-sm font-medium text-accent hover:underline">
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
