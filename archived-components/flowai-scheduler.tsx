import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Clock, Plus, Check, X, Sparkle, Lightning, 
  Bell, Target, TrendUp, Lightbulb, CheckCircle
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'

interface Event {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  date: string
  category: 'work' | 'personal' | 'family' | 'health'
  isCompleted: boolean
  aiGenerated?: boolean
}

interface Suggestion {
  id: string
  title: string
  description: string
  category: 'productivity' | 'wellness' | 'family' | 'financial' | 'lifestyle'
  createdAt: string
  isAccepted: boolean
  isDismissed: boolean
}

const CATEGORY_COLORS = {
  work: 'bg-blue-500',
  personal: 'bg-purple-500',
  family: 'bg-pink-500',
  health: 'bg-green-500',
}

export function FlowAIScheduler() {
  const [events, setEvents] = useKV<Event[]>('flowsphere-ai-events', [])
  const [suggestions, setSuggestions] = useKV<Suggestion[]>('flowsphere-ai-suggestions', [])
  
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0])
  const [eventStartTime, setEventStartTime] = useState('09:00')
  const [eventEndTime, setEventEndTime] = useState('10:00')
  const [eventCategory, setEventCategory] = useState<Event['category']>('personal')

  const today = new Date().toISOString().split('T')[0]
  const dayOfWeek = new Date().getDay()
  const isFriday = dayOfWeek === 5

  const todayEvents = (events || []).filter(e => e.date === today).sort((a, b) => 
    a.startTime.localeCompare(b.startTime)
  )

  const upcomingEvents = (events || []).filter(e => e.date >= today && !e.isCompleted)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.startTime.localeCompare(b.startTime)
    })
    .slice(0, 5)

  const activeSuggestions = (suggestions || []).filter(s => !s.isAccepted && !s.isDismissed)

  const addEvent = () => {
    if (!eventTitle) {
      toast.error('Please enter an event title')
      return
    }

    const event: Event = {
      id: Date.now().toString(),
      title: eventTitle,
      description: eventDescription,
      startTime: eventStartTime,
      endTime: eventEndTime,
      date: eventDate,
      category: eventCategory,
      isCompleted: false,
    }

    setEvents((current) => [...(current || []), event])
    toast.success('Event added!')
    setShowEventDialog(false)
    resetEventForm()
  }

  const resetEventForm = () => {
    setEventTitle('')
    setEventDescription('')
    setEventStartTime('09:00')
    setEventEndTime('10:00')
    setEventDate(new Date().toISOString().split('T')[0])
  }

  const toggleEventComplete = (id: string) => {
    setEvents((current) =>
      (current || []).map(event =>
        event.id === id ? { ...event, isCompleted: !event.isCompleted } : event
      )
    )
  }

  const deleteEvent = (id: string) => {
    setEvents((current) => (current || []).filter(e => e.id !== id))
    toast.success('Event deleted')
  }

  const generateWeeklySuggestions = async () => {
    setIsGeneratingSuggestions(true)
    
    try {
      const recentEventsCount = (events || []).filter(e => 
        new Date(e.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length

      const prompt = `You are FlowAI, an intelligent life assistant. Generate 4 helpful suggestions for the user to improve their life. Consider:
- Work-life balance
- Health and wellness
- Family time
- Digital wellness
- Financial planning
- Personal growth

Recent activity: ${recentEventsCount} events scheduled this week.

Generate 4 diverse, actionable suggestions. Return as JSON: 
{
  "suggestions": [
    {"title": "...", "description": "...", "category": "productivity|wellness|family|financial|lifestyle"}
  ]
}`

      const result = await window.spark.llm(prompt, 'gpt-4o-mini', true)
      const data = JSON.parse(result)

      const newSuggestions: Suggestion[] = data.suggestions.map((s: any, index: number) => ({
        id: `${Date.now()}-${index}`,
        title: s.title,
        description: s.description,
        category: s.category,
        createdAt: new Date().toISOString(),
        isAccepted: false,
        isDismissed: false,
      }))

      setSuggestions((current) => [...newSuggestions, ...(current || [])])
      toast.success('New suggestions generated!')
    } catch (error) {
      console.error('Error generating suggestions:', error)
      toast.error('Failed to generate suggestions')
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }

  const acceptSuggestion = (id: string) => {
    setSuggestions((current) =>
      (current || []).map(s =>
        s.id === id ? { ...s, isAccepted: true } : s
      )
    )
    toast.success('Great choice! 🎉')
  }

  const dismissSuggestion = (id: string) => {
    setSuggestions((current) =>
      (current || []).map(s =>
        s.id === id ? { ...s, isDismissed: true } : s
      )
    )
  }

  const getCategoryColor = (category: Suggestion['category']) => {
    const colors = {
      productivity: 'bg-blue-500',
      wellness: 'bg-green-500',
      family: 'bg-pink-500',
      financial: 'bg-yellow-500',
      lifestyle: 'bg-purple-500',
    }
    return colors[category]
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-heading">
            FlowAI Scheduler
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Your personal AI that auto-manages your week
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowEventDialog(true)} className="gap-2">
            <Plus />
            Add Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Today's Schedule
                </CardTitle>
                <Badge variant="secondary">{todayEvents.length} events</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {todayEvents.length > 0 ? (
                <div className="space-y-2">
                  {todayEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-lg border-l-4 ${
                        event.isCompleted ? 'bg-muted/50 opacity-60' : 'bg-card'
                      }`}
                      style={{ borderLeftColor: `var(--${event.category})` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 mt-0.5"
                            onClick={() => toggleEventComplete(event.id)}
                          >
                            {event.isCompleted ? (
                              <CheckCircle weight="fill" className="w-5 h-5 text-green-500" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                            )}
                          </Button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-semibold ${
                                event.isCompleted ? 'line-through text-muted-foreground' : ''
                              }`}>
                                {event.title}
                              </h4>
                              {event.aiGenerated && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <Sparkle className="w-3 h-3" />
                                  AI
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {event.startTime} - {event.endTime}
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEvent(event.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No events scheduled for today</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[event.category]}`} />
                        <div>
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.date).toLocaleDateString()} at {event.startTime}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {event.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb weight="fill" className="w-5 h-5 text-yellow-500" />
                  {isFriday ? 'Friday Suggestions' : 'AI Suggestions'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateWeeklySuggestions}
                  disabled={isGeneratingSuggestions}
                  className="gap-1"
                >
                  <Lightning className="w-4 h-4" />
                  {isGeneratingSuggestions ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeSuggestions.length > 0 ? (
                <div className="space-y-3">
                  <AnimatePresence>
                    {activeSuggestions.slice(0, 4).map((suggestion) => (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-4 rounded-lg bg-card border"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${getCategoryColor(suggestion.category)}`} />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{suggestion.title}</h4>
                            <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => acceptSuggestion(suggestion.id)}
                            className="flex-1 gap-1 h-8"
                          >
                            <Check className="w-3 h-3" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => dismissSuggestion(suggestion.id)}
                            className="h-8 px-3"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    {isFriday 
                      ? "It's Friday! Generate your weekend suggestions" 
                      : 'Generate AI-powered suggestions to improve your life'}
                  </p>
                  <Button
                    onClick={generateWeeklySuggestions}
                    disabled={isGeneratingSuggestions}
                    className="gap-2"
                  >
                    <Sparkle className="w-4 h-4" />
                    {isGeneratingSuggestions ? 'Generating...' : 'Generate Suggestions'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendUp className="w-5 h-5" />
                Weekly Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Events Completed</span>
                    <span className="font-semibold">
                      {(events || []).filter(e => e.isCompleted).length}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Suggestions Accepted</span>
                    <span className="font-semibold">
                      {(suggestions || []).filter(s => s.isAccepted).length}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Active Events</span>
                    <span className="font-semibold">
                      {upcomingEvents.length}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-title">Event Title</Label>
              <Input
                id="event-title"
                placeholder="e.g., Team Meeting"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="event-desc">Description (Optional)</Label>
              <Textarea
                id="event-desc"
                placeholder="Add details..."
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Category</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(Object.keys(CATEGORY_COLORS) as Event['category'][]).map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    variant={eventCategory === cat ? 'default' : 'outline'}
                    onClick={() => setEventCategory(cat)}
                    className="capitalize"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            <Button onClick={addEvent} className="w-full">
              Add Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
