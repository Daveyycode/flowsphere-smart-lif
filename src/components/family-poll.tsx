import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash, Check, ChartBar, X } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

interface PollOption {
  id: string
  text: string
  votes: string[]
}

interface Poll {
  id: string
  question: string
  options: PollOption[]
  createdBy: string
  createdAt: string
  isActive: boolean
}

interface FamilyPollProps {
  currentUserId?: string
  currentUserName?: string
}

export function FamilyPoll({ currentUserId = 'user-1', currentUserName = 'You' }: FamilyPollProps) {
  const [polls, setPolls] = useKV<Poll[]>('flowsphere-family-polls', [])
  const [isCreating, setIsCreating] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [newOptions, setNewOptions] = useState(['', ''])

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

  return (
    <div className="space-y-6">
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
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium flex items-center gap-2">
                              {option.text}
                              {isVoted && <Check className="w-4 h-4 text-accent" weight="bold" />}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {percentage}%
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-2">
                            {option.votes.length} {option.votes.length === 1 ? 'vote' : 'votes'}
                          </p>
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
    </div>
  )
}
