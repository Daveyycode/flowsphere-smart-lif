import { useState } from 'react'
import { useKV } from '@/hooks/use-kv'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { GameController, Newspaper, Clock, TrendUp, Warning } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface GameSession {
  id: string
  childName: string
  game: string
  duration: number
  date: string
}

interface NewsItem {
  id: string
  title: string
  source: string
  category: string
  time: string
  url?: string
}

// News data - will be populated from real news API or user's news sources
const mockNews: NewsItem[] = []

export function ResourcesView() {
  // Game sessions - starts empty, will be populated by real user data
  const [gameSessions, setGameSessions] = useKV<GameSession[]>('flowsphere-game-sessions', [])

  const [dailyLimit] = useState(120)

  const getTodaysSessions = (childName: string) => {
    const today = new Date().toDateString()
    return (gameSessions || [])
      .filter(
        session =>
          session.childName === childName && new Date(session.date).toDateString() === today
      )
      .reduce((total, session) => total + session.duration, 0)
  }

  const children = Array.from(new Set((gameSessions || []).map(s => s.childName)))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 font-heading">
          Resources & Monitoring
        </h1>
        <p className="text-muted-foreground">Track activities and stay updated with daily news</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <GameController className="w-6 h-6 text-accent" weight="fill" />
            </div>
            <div>
              <h2 className="text-xl font-semibold font-heading">Game Time Monitoring</h2>
              <p className="text-sm text-muted-foreground">Daily screen time tracker</p>
            </div>
          </div>

          <div className="space-y-6">
            {children.length > 0 ? (
              children.map(child => {
                const todayMinutes = getTodaysSessions(child)
                const percentage = (todayMinutes / dailyLimit) * 100
                const isOverLimit = todayMinutes > dailyLimit

                return (
                  <motion.div
                    key={child}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{child}</p>
                        <p className="text-sm text-muted-foreground">
                          {todayMinutes} / {dailyLimit} minutes today
                        </p>
                      </div>
                      {isOverLimit && (
                        <Badge variant="destructive" className="gap-1">
                          <Warning className="w-3 h-3" weight="fill" />
                          Over Limit
                        </Badge>
                      )}
                    </div>

                    <Progress
                      value={Math.min(percentage, 100)}
                      className={`h-2 ${isOverLimit ? '[&>*]:bg-destructive' : ''}`}
                    />

                    <div className="flex flex-wrap gap-2">
                      {(gameSessions || [])
                        .filter(
                          s =>
                            s.childName === child &&
                            new Date(s.date).toDateString() === new Date().toDateString()
                        )
                        .map(session => (
                          <Badge key={session.id} variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {session.game}: {session.duration}m
                          </Badge>
                        ))}
                    </div>
                  </motion.div>
                )
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <GameController className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No game sessions tracked today</p>
                <p className="text-sm">Sessions will appear here automatically</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Daily Limit</span>
              <span className="font-semibold">{dailyLimit} minutes</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Newspaper className="w-6 h-6 text-primary" weight="fill" />
            </div>
            <div>
              <h2 className="text-xl font-semibold font-heading">Daily News</h2>
              <p className="text-sm text-muted-foreground">Today's top stories</p>
            </div>
          </div>

          <div className="space-y-4">
            {mockNews.map((news, index) => (
              <motion.div
                key={news.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer bg-secondary/30">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {news.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{news.time}</span>
                      </div>
                      <h3 className="font-semibold text-sm sm:text-base mb-1">{news.title}</h3>
                      <p className="text-xs text-muted-foreground">{news.source}</p>
                    </div>
                    <TrendUp className="w-5 h-5 text-primary flex-shrink-0" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <Button variant="outline" className="w-full mt-4">
            Load More News
          </Button>
        </Card>
      </div>

      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <h3 className="text-lg font-semibold mb-4 font-heading">Quick Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-primary">{children.length}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Active Profiles</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-accent">
              {(gameSessions || []).reduce((sum, s) => sum + s.duration, 0)}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">Total Minutes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-coral">{mockNews.length}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">News Today</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-mint">{dailyLimit}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Daily Limit</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
