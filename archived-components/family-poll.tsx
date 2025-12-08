import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash, Check, ChartBar, X, Sparkle, Clock, MapPin, CalendarDots } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'

interface PollOption {
  id: string
  text: string
  votes: string[]
  description?: string
  reason?: string
}

interface Poll {
  id: string
  question: string
  options: PollOption[]
  createdBy: string
  createdAt: string
  isActive: boolean
  isAIGenerated?: boolean
  category?: string
}

interface PollSettings {
  enabled: boolean
  dayOfWeek: number
  timeOfDay: string
}

interface FamilyPollProps {
  currentUserId?: string
  currentUserName?: string
}

export function FamilyPoll({ currentUserId = 'user-1', currentUserName = 'You' }: FamilyPollProps) {
  const [polls, setPolls] = useKV<Poll[]>('flowsphere-family-polls', [])
  const [pollSettings, setPollSettings] = useKV<PollSettings>('flowsphere-poll-settings', {
    enabled: true,
    dayOfWeek: 4,
    timeOfDay: '19:00'
  })
  const [isCreating, setIsCreating] = useState(false)
  const [isConfiguringSettings, setIsConfiguringSettings] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [newOptions, setNewOptions] = useState(['', ''])
  const [isGeneratingPoll, setIsGeneratingPoll] = useState(false)

  const generateAIPoll = async () => {
    setIsGeneratingPoll(true)
    
    try {
      const currentDate = new Date()
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()]
      
      const promptText = `You are FlowSphere AI, creating an exciting family weekend poll. 

Today is ${dayName}. Generate a fun, engaging poll for family bonding activities.

Research trending, popular places, activities, restaurants, or events that families are excited about. Consider:
- New restaurants or cafes that are getting buzz
- Popular movies or entertainment
- Trending outdoor activities or parks
- Fun family events happening
- Cool new places to explore

Create a poll with:
1. A catchy, exciting question title (include the category, e.g., "Weekend Movie Night Poll!" or "Saturday Restaurant Adventure!")
2. 4-5 specific options
3. For each option, provide a brief reason why it's trending or why families love it

Return the result as a valid JSON object with this structure:
{
  "category": "movies/restaurants/activities/places",
  "question": "the poll question",
  "options": [
    {
      "name": "option name",
      "description": "brief description",
      "reason": "why it's trending or popular (1 sentence)"
    }
  ]
}`

      const result = await window.spark.llm(promptText, 'gpt-4o', true)
      const pollData = JSON.parse(result)
      
      const newPoll: Poll = {
        id: Date.now().toString(),
        question: pollData.question,
        options: pollData.options.map((opt: any) => ({
          id: `option-${Date.now()}-${Math.random()}`,
          text: opt.name,
          description: opt.description,
          reason: opt.reason,
          votes: []
        })),
        createdBy: 'FlowSphere AI',
        createdAt: new Date().toLocaleDateString(),
        isActive: true,
        isAIGenerated: true,
        category: pollData.category
      }

      setPolls(prev => [newPoll, ...(prev || [])])
      
      toast.success(`Weekend ${pollData.category} poll is live! 🎉`, {
        description: 'FlowSphere AI has curated exciting options for your family'
      })
    } catch (error) {
      console.error('Failed to generate AI poll:', error)
      toast.error('Failed to generate poll. Please try again.')
    } finally {
      setIsGeneratingPoll(false)
    }
  }

  useEffect(() => {
    if (!pollSettings?.enabled) return

    const checkPollSchedule = () => {
      const now = new Date()
      const currentDay = now.getDay()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      const [targetHour, targetMinute] = (pollSettings?.timeOfDay || '19:00').split(':').map(Number)
      
      if (
        currentDay === (pollSettings?.dayOfWeek || 4) &&
        currentHour === targetHour &&
        currentMinute === targetMinute
      ) {
        const lastPollDate = localStorage.getItem('flowsphere-last-ai-poll-date')
        const today = now.toDateString()
        
        if (lastPollDate !== today) {
          generateAIPoll()
          localStorage.setItem('flowsphere-last-ai-poll-date', today)
        }
      }
    }

    const interval = setInterval(checkPollSchedule, 60000)
    return () => clearInterval(interval)
  }, [pollSettings])

  const createPoll = () => {
    if (!newQuestion.trim()) {
      toast.error('Please enter a question')
      return
    }

    const validOptions = newOptions.filter(opt => opt.trim() !== '')
    if (validOptions.length < 2) {
      toast.error('Please provide at least 2 options')
      return
    }

    const newPoll: Poll = {
      id: Date.now().toString(),
      question: newQuestion.trim(),
      options: validOptions.map(opt => ({
        id: `option-${Date.now()}-${Math.random()}`,
        text: opt.trim(),
        votes: []
      })),
      createdBy: currentUserName,
      createdAt: new Date().toLocaleDateString(),
      isActive: true
    }

    setPolls(prev => [newPoll, ...(prev || [])])
    setNewQuestion('')
    setNewOptions(['', ''])
    setIsCreating(false)
    toast.success('Poll created!')
  }

  const vote = (pollId: string, optionId: string) => {
    setPolls(prev => 
      (prev || []).map(poll => {
        if (poll.id !== pollId) return poll

        const hasVoted = poll.options.some(opt => opt.votes.includes(currentUserId))
        
        return {
          ...poll,
          options: poll.options.map(opt => {
            if (opt.id === optionId) {
              if (opt.votes.includes(currentUserId)) {
                return { ...opt, votes: opt.votes.filter(v => v !== currentUserId) }
              }
              return { ...opt, votes: [...opt.votes, currentUserId] }
            }
            return { ...opt, votes: opt.votes.filter(v => v !== currentUserId) }
          })
        }
      })
    )
    toast.success('Vote recorded')
  }

  const deletePoll = (pollId: string) => {
    setPolls(prev => (prev || []).filter(poll => poll.id !== pollId))
    toast.success('Poll deleted')
  }

  const closePoll = (pollId: string) => {
    setPolls(prev =>
      (prev || []).map(poll =>
        poll.id === pollId ? { ...poll, isActive: false } : poll
      )
    )
    toast.success('Poll closed')
  }

  const addOption = () => {
    if (newOptions.length < 6) {
      setNewOptions([...newOptions, ''])
    }
  }

  const removeOption = (index: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const updated = [...newOptions]
    updated[index] = value
    setNewOptions(updated)
  }

  const getTotalVotes = (poll: Poll) => {
    return poll.options.reduce((sum, opt) => sum + opt.votes.length, 0)
  }

  const getVotePercentage = (option: PollOption, totalVotes: number) => {
    if (totalVotes === 0) return 0
    return Math.round((option.votes.length / totalVotes) * 100)
  }

  const hasUserVoted = (poll: Poll) => {
    return poll.options.some(opt => opt.votes.includes(currentUserId))
  }

  const getDayName = (dayNum: number) => {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNum]
  }

  return (
    <div className="space-y-6">
      <Card className="border-accent/30 bg-gradient-to-br from-accent/10 via-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start space-x-4 flex-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0">
                <Sparkle className="w-6 h-6 text-white" weight="fill" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">AI-Powered Family Polls</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  FlowSphere AI generates exciting weekend polls every {getDayName(pollSettings?.dayOfWeek || 4)} at {pollSettings?.timeOfDay || '19:00'}, 
                  discovering trending places, activities, and experiences for your family.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={generateAIPoll}
                    disabled={isGeneratingPoll}
                    className="bg-accent hover:bg-accent/90"
                    size="sm"
                  >
                    <Sparkle className="w-4 h-4 mr-2" weight="fill" />
                    {isGeneratingPoll ? 'Generating...' : 'Generate Poll Now'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsConfiguringSettings(true)}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Schedule Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Family Polls</h2>
          <p className="text-sm text-muted-foreground">
            Make decisions together and strengthen family bonds
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90">
              <Plus className="w-5 h-5 mr-2" weight="bold" />
              Create Poll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Family Poll</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  placeholder="Where should we go for vacation?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Options</Label>
                {newOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                    {newOptions.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {newOptions.length < 6 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createPoll}
                  className="flex-1 bg-accent hover:bg-accent/90"
                >
                  Create Poll
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(polls || []).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ChartBar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
            <h3 className="text-xl font-semibold mb-2">No family polls yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first poll to start making family decisions together
            </p>
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-accent hover:bg-accent/90"
            >
              <Plus className="w-5 h-5 mr-2" weight="bold" />
              Create First Poll
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(polls || []).map((poll, index) => {
            const totalVotes = getTotalVotes(poll)
            const userVoted = hasUserVoted(poll)

            return (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="border-accent/20 hover:border-accent/40 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{poll.question}</CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-xs">
                            By {poll.createdBy}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {poll.createdAt}
                          </Badge>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${poll.isActive ? 'bg-mint/20 text-mint' : 'bg-muted'}`}
                          >
                            {poll.isActive ? 'Active' : 'Closed'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {poll.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => closePoll(poll.id)}
                          >
                            <Check className="w-5 h-5 text-mint" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePoll(poll.id)}
                        >
                          <Trash className="w-5 h-5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {poll.options.map(option => {
                      const percentage = getVotePercentage(option, totalVotes)
                      const isVoted = option.votes.includes(currentUserId)

                      return (
                        <motion.button
                          key={option.id}
                          onClick={() => poll.isActive && vote(poll.id, option.id)}
                          disabled={!poll.isActive}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            isVoted
                              ? 'border-accent bg-accent/10'
                              : 'border-border hover:border-accent/50 bg-card'
                          } ${!poll.isActive ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                          whileHover={poll.isActive ? { scale: 1.02 } : {}}
                          whileTap={poll.isActive ? { scale: 0.98 } : {}}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium flex items-center gap-2">
                                {option.text}
                                {isVoted && <Check className="w-4 h-4 text-accent" weight="bold" />}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {percentage}%
                              </span>
                            </div>
                            {option.description && (
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            )}
                            {option.reason && poll.isAIGenerated && (
                              <div className="flex items-start gap-2 mt-2 p-2 bg-accent/5 rounded">
                                <Sparkle className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" weight="fill" />
                                <p className="text-xs text-muted-foreground italic">{option.reason}</p>
                              </div>
                            )}
                            <Progress value={percentage} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {option.votes.length} {option.votes.length === 1 ? 'vote' : 'votes'}
                            </p>
                          </div>
                        </motion.button>
                      )
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Dialog open={isConfiguringSettings} onOpenChange={setIsConfiguringSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AI Poll Schedule Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Configure when FlowSphere AI generates family polls
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="day-select">Day of Week</Label>
              <Select
                value={String(pollSettings?.dayOfWeek || 4)}
                onValueChange={(value) => {
                  setPollSettings((current) => ({
                    ...(current || { enabled: true, timeOfDay: '19:00' }),
                    dayOfWeek: parseInt(value)
                  }))
                }}
              >
                <SelectTrigger id="day-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-input">Time of Day</Label>
              <Input
                id="time-input"
                type="time"
                value={pollSettings?.timeOfDay || '19:00'}
                onChange={(e) => {
                  setPollSettings((current) => ({
                    ...(current || { enabled: true, dayOfWeek: 4 }),
                    timeOfDay: e.target.value
                  }))
                }}
              />
            </div>

            <Button
              onClick={() => {
                toast.success('Poll schedule updated!')
                setIsConfiguringSettings(false)
              }}
              className="w-full bg-accent hover:bg-accent/90"
            >
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
