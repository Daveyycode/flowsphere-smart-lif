import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  SmileySad, Smiley, SmileyMeh, SmileyXEyes, Heart, 
  Drop, Moon, Bed, Fire, Plus, TrendUp, Calendar, ChartLine 
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'

interface MoodEntry {
  id: string
  date: string
  mood: 1 | 2 | 3 | 4 | 5
  stress: number
  energy: number
  notes: string
}

interface HealthEntry {
  id: string
  date: string
  sleep: number
  hydration: number
  exercise: number
  meditation: number
}

const MOOD_OPTIONS = [
  { value: 1, icon: SmileySad, label: 'Terrible', color: 'text-red-500' },
  { value: 2, icon: SmileyMeh, label: 'Bad', color: 'text-orange-500' },
  { value: 3, icon: Smiley, label: 'Okay', color: 'text-yellow-500' },
  { value: 4, icon: Smiley, label: 'Good', color: 'text-lime-500' },
  { value: 5, icon: SmileyXEyes, label: 'Great', color: 'text-green-500' },
]

export function MoodHealthTracker() {
  const [moodEntries, setMoodEntries] = useKV<MoodEntry[]>('flowsphere-mood-entries', [])
  const [healthEntries, setHealthEntries] = useKV<HealthEntry[]>('flowsphere-health-entries', [])
  
  const [showMoodDialog, setShowMoodDialog] = useState(false)
  const [showHealthDialog, setShowHealthDialog] = useState(false)
  
  const [selectedMood, setSelectedMood] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [stressLevel, setStressLevel] = useState(5)
  const [energyLevel, setEnergyLevel] = useState(5)
  const [moodNotes, setMoodNotes] = useState('')
  
  const [sleepHours, setSleepHours] = useState(7)
  const [hydrationGlasses, setHydrationGlasses] = useState(4)
  const [exerciseMinutes, setExerciseMinutes] = useState(30)
  const [meditationMinutes, setMeditationMinutes] = useState(10)

  const today = new Date().toISOString().split('T')[0]
  const todayMoodEntry = (moodEntries || []).find(e => e.date === today)
  const todayHealthEntry = (healthEntries || []).find(e => e.date === today)

  const saveMoodEntry = () => {
    const entry: MoodEntry = {
      id: Date.now().toString(),
      date: today,
      mood: selectedMood,
      stress: stressLevel,
      energy: energyLevel,
      notes: moodNotes,
    }

    setMoodEntries((current) => {
      const filtered = (current || []).filter(e => e.date !== today)
      return [entry, ...filtered]
    })

    toast.success('Mood entry saved!')
    setShowMoodDialog(false)
    setMoodNotes('')
  }

  const saveHealthEntry = () => {
    const entry: HealthEntry = {
      id: Date.now().toString(),
      date: today,
      sleep: sleepHours,
      hydration: hydrationGlasses,
      exercise: exerciseMinutes,
      meditation: meditationMinutes,
    }

    setHealthEntries((current) => {
      const filtered = (current || []).filter(e => e.date !== today)
      return [entry, ...filtered]
    })

    toast.success('Health entry saved!')
    setShowHealthDialog(false)
  }

  const getRecentEntries = (entries: any[], days = 7) => {
    return entries.slice(0, days)
  }

  const calculateAverage = (entries: any[], key: string) => {
    if (!entries.length) return '0'
    const sum = entries.reduce((acc, entry) => acc + (entry[key] || 0), 0)
    return (sum / entries.length).toFixed(1)
  }

  const getMoodTrend = () => {
    const recent = getRecentEntries(moodEntries || [], 7)
    if (recent.length < 2) return 'stable'
    
    const firstHalf = recent.slice(0, Math.ceil(recent.length / 2))
    const secondHalf = recent.slice(Math.ceil(recent.length / 2))
    
    const firstAvg = calculateAverage(firstHalf, 'mood')
    const secondAvg = calculateAverage(secondHalf, 'mood')
    
    if (parseFloat(secondAvg) > parseFloat(firstAvg) + 0.3) return 'improving'
    if (parseFloat(secondAvg) < parseFloat(firstAvg) - 0.3) return 'declining'
    return 'stable'
  }

  const recentMoodEntries = getRecentEntries(moodEntries || [], 7)
  const recentHealthEntries = getRecentEntries(healthEntries || [], 7)
  const avgMood = calculateAverage(recentMoodEntries, 'mood')
  const avgStress = calculateAverage(recentMoodEntries, 'stress')
  const avgSleep = calculateAverage(recentHealthEntries, 'sleep')
  const avgHydration = calculateAverage(recentHealthEntries, 'hydration')
  const moodTrend = getMoodTrend()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-heading">
            Mood & Health Tracker
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Track your mental and physical wellness over time
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Smiley className="w-5 h-5 text-primary" />
              <p className="text-xs text-muted-foreground">Avg Mood (7d)</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{avgMood}/5</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendUp className={`w-3 h-3 ${
                moodTrend === 'improving' ? 'text-green-500' : 
                moodTrend === 'declining' ? 'text-red-500 rotate-180' : 
                'text-muted-foreground'
              }`} />
              <span className="text-xs text-muted-foreground capitalize">{moodTrend}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Fire className="w-5 h-5 text-orange-500" />
              <p className="text-xs text-muted-foreground">Avg Stress (7d)</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{avgStress}/10</p>
            <p className="text-xs text-muted-foreground mt-1">
              {parseFloat(avgStress) < 4 ? 'Low' : parseFloat(avgStress) < 7 ? 'Moderate' : 'High'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-5 h-5 text-indigo-500" />
              <p className="text-xs text-muted-foreground">Avg Sleep (7d)</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{avgSleep}h</p>
            <p className="text-xs text-muted-foreground mt-1">
              {parseFloat(avgSleep) >= 7 ? 'Good' : parseFloat(avgSleep) >= 6 ? 'Fair' : 'Low'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Drop className="w-5 h-5 text-blue-500" />
              <p className="text-xs text-muted-foreground">Avg Hydration (7d)</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{avgHydration}</p>
            <p className="text-xs text-muted-foreground mt-1">glasses/day</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={todayMoodEntry ? 'border-primary/50' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Today's Mood</CardTitle>
              {todayMoodEntry && (
                <Badge variant="secondary" className="gap-1">
                  <Heart weight="fill" className="w-3 h-3" />
                  Logged
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {todayMoodEntry ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {MOOD_OPTIONS.map(option => {
                    if (option.value === todayMoodEntry.mood) {
                      const Icon = option.icon
                      return (
                        <div key={option.value} className="flex items-center gap-2">
                          <Icon className={`w-8 h-8 ${option.color}`} weight="fill" />
                          <span className="font-semibold">{option.label}</span>
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Stress</p>
                    <p className="font-semibold">{todayMoodEntry.stress}/10</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Energy</p>
                    <p className="font-semibold">{todayMoodEntry.energy}/10</p>
                  </div>
                </div>
                {todayMoodEntry.notes && (
                  <p className="text-sm text-muted-foreground italic">"{todayMoodEntry.notes}"</p>
                )}
                <Button
                  onClick={() => setShowMoodDialog(true)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Update Entry
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Smiley className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  How are you feeling today?
                </p>
                <Button
                  onClick={() => setShowMoodDialog(true)}
                  className="gap-2"
                >
                  <Plus />
                  Log Mood
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={todayHealthEntry ? 'border-primary/50' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Today's Health</CardTitle>
              {todayHealthEntry && (
                <Badge variant="secondary" className="gap-1">
                  <Heart weight="fill" className="w-3 h-3" />
                  Logged
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {todayHealthEntry ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <div>
                      <p className="text-muted-foreground">Sleep</p>
                      <p className="font-semibold">{todayHealthEntry.sleep}h</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Drop className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-muted-foreground">Hydration</p>
                      <p className="font-semibold">{todayHealthEntry.hydration} glasses</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Fire className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="text-muted-foreground">Exercise</p>
                      <p className="font-semibold">{todayHealthEntry.exercise} min</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-muted-foreground">Meditation</p>
                      <p className="font-semibold">{todayHealthEntry.meditation} min</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setShowHealthDialog(true)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Update Entry
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Heart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Track your health metrics
                </p>
                <Button
                  onClick={() => setShowHealthDialog(true)}
                  className="gap-2"
                >
                  <Plus />
                  Log Health
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showMoodDialog} onOpenChange={setShowMoodDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Your Mood</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label className="mb-3 block">How are you feeling?</Label>
              <div className="flex justify-between gap-2">
                {MOOD_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedMood(option.value as 1 | 2 | 3 | 4 | 5)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        selectedMood === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:border-muted'
                      }`}
                    >
                      <Icon
                        className={`w-8 h-8 ${option.color}`}
                        weight={selectedMood === option.value ? 'fill' : 'regular'}
                      />
                      <span className="text-xs">{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="stress">Stress Level: {stressLevel}/10</Label>
              <Slider
                id="stress"
                value={[stressLevel]}
                onValueChange={(v) => setStressLevel(v[0])}
                min={0}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="energy">Energy Level: {energyLevel}/10</Label>
              <Slider
                id="energy"
                value={[energyLevel]}
                onValueChange={(v) => setEnergyLevel(v[0])}
                min={0}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="What's on your mind?"
                value={moodNotes}
                onChange={(e) => setMoodNotes(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>

            <Button onClick={saveMoodEntry} className="w-full">
              Save Mood Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHealthDialog} onOpenChange={setShowHealthDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Your Health</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label htmlFor="sleep">Sleep: {sleepHours} hours</Label>
              <Slider
                id="sleep"
                value={[sleepHours]}
                onValueChange={(v) => setSleepHours(v[0])}
                min={0}
                max={12}
                step={0.5}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="hydration">Hydration: {hydrationGlasses} glasses</Label>
              <Slider
                id="hydration"
                value={[hydrationGlasses]}
                onValueChange={(v) => setHydrationGlasses(v[0])}
                min={0}
                max={15}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="exercise">Exercise: {exerciseMinutes} minutes</Label>
              <Slider
                id="exercise"
                value={[exerciseMinutes]}
                onValueChange={(v) => setExerciseMinutes(v[0])}
                min={0}
                max={180}
                step={5}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="meditation">Meditation: {meditationMinutes} minutes</Label>
              <Slider
                id="meditation"
                value={[meditationMinutes]}
                onValueChange={(v) => setMeditationMinutes(v[0])}
                min={0}
                max={60}
                step={5}
                className="mt-2"
              />
            </div>

            <Button onClick={saveHealthEntry} className="w-full">
              Save Health Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
