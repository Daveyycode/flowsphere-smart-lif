/**
 * CEO Complaints Dashboard
 * View and manage all user complaints, especially escalated ones
 */

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ChatCircleDots,
  Robot,
  EnvelopeSimple,
  CheckCircle,
  Warning,
  User,
  CalendarBlank,
  Tag,
  Funnel,
  MagnifyingGlass,
  ArrowUp,
  CheckSquare,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { type Complaint } from '@/lib/ai-complaint-handler'
import { cn } from '@/lib/utils'

export function CEOComplaintsDashboard() {
  const [complaints] = useKV<Complaint[]>('flowsphere-user-complaints', [])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)

  // Stats
  const stats = useMemo(() => {
    const all = complaints || []
    return {
      total: all.length,
      pending: all.filter(c => c.status === 'pending' || c.status === 'ai-analyzing').length,
      aiResolved: all.filter(c => c.status === 'ai-resolved').length,
      escalated: all.filter(c => c.status === 'escalated').length,
      closed: all.filter(c => c.status === 'closed').length,
    }
  }, [complaints])

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    let filtered = complaints || []

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        c =>
          c.subject.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.userName.toLowerCase().includes(query) ||
          c.userEmail.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(c => c.priority === priorityFilter)
    }

    // Sort by date (newest first)
    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [complaints, searchQuery, statusFilter, priorityFilter])

  const getPriorityColor = (priority: Complaint['priority']) => {
    const colors = {
      low: 'text-green-500 bg-green-500/10 border-green-500/20',
      medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
      high: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
      urgent: 'text-red-500 bg-red-500/10 border-red-500/20',
    }
    return colors[priority]
  }

  const getStatusConfig = (status: Complaint['status']) => {
    const config = {
      pending: { color: 'bg-gray-500', icon: <CalendarBlank className="w-3 h-3" /> },
      'ai-analyzing': { color: 'bg-blue-500', icon: <Robot className="w-3 h-3" weight="fill" /> },
      'ai-resolved': {
        color: 'bg-green-500',
        icon: <CheckCircle className="w-3 h-3" weight="fill" />,
      },
      escalated: { color: 'bg-orange-500', icon: <Warning className="w-3 h-3" weight="fill" /> },
      closed: { color: 'bg-gray-600', icon: <CheckSquare className="w-3 h-3" weight="fill" /> },
    }
    return config[status]
  }

  const handleMarkAsClosed = (complaint: Complaint) => {
    toast.success(`Complaint #${complaint.id} marked as closed`)
    // In production, update the complaint status in the database
  }

  return (
    <div className="space-y-3">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Card>
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground mb-0.5">Total</p>
                <p className="text-base font-bold">{stats.total}</p>
              </div>
              <ChatCircleDots className="w-4 h-4 text-accent" weight="duotone" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground mb-0.5">Pending</p>
                <p className="text-base font-bold text-blue-500">{stats.pending}</p>
              </div>
              <Robot className="w-4 h-4 text-blue-500" weight="duotone" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground mb-0.5">Resolved</p>
                <p className="text-base font-bold text-green-500">{stats.aiResolved}</p>
              </div>
              <CheckCircle className="w-4 h-4 text-green-500" weight="fill" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground mb-0.5">Escalated</p>
                <p className="text-base font-bold text-orange-500">{stats.escalated}</p>
              </div>
              <ArrowUp className="w-4 h-4 text-orange-500" weight="bold" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground mb-0.5">Closed</p>
                <p className="text-base font-bold">{stats.closed}</p>
              </div>
              <CheckSquare className="w-4 h-4 text-muted-foreground" weight="duotone" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <MagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-7 h-7 text-xs"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All
                </SelectItem>
                <SelectItem value="pending" className="text-xs">
                  Pending
                </SelectItem>
                <SelectItem value="ai-analyzing" className="text-xs">
                  Analyzing
                </SelectItem>
                <SelectItem value="ai-resolved" className="text-xs">
                  Resolved
                </SelectItem>
                <SelectItem value="escalated" className="text-xs">
                  Escalated
                </SelectItem>
                <SelectItem value="closed" className="text-xs">
                  Closed
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All
                </SelectItem>
                <SelectItem value="urgent" className="text-xs">
                  Urgent
                </SelectItem>
                <SelectItem value="high" className="text-xs">
                  High
                </SelectItem>
                <SelectItem value="medium" className="text-xs">
                  Medium
                </SelectItem>
                <SelectItem value="low" className="text-xs">
                  Low
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all') && (
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-muted-foreground">
                {filteredComplaints.length} of {complaints?.length || 0}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                  setPriorityFilter('all')
                }}
                className="h-6 text-[10px] px-2"
              >
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complaints List */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <ChatCircleDots className="w-4 h-4 text-accent" weight="duotone" />
            Complaints
          </CardTitle>
          <CardDescription className="text-[10px]">Click to view details</CardDescription>
        </CardHeader>
        <CardContent className="p-3">
          {filteredComplaints.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ChatCircleDots className="w-8 h-8 mx-auto mb-2 opacity-50" weight="duotone" />
              <p className="text-[10px]">
                {complaints?.length === 0 ? 'No complaints' : 'No matches'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredComplaints.map(complaint => {
                  const statusConfig = getStatusConfig(complaint.status)
                  return (
                    <motion.div
                      key={complaint.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'p-2 rounded-lg border cursor-pointer transition-all',
                        complaint.status === 'escalated'
                          ? 'border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50'
                          : 'border-border hover:border-accent/30'
                      )}
                      onClick={() => setSelectedComplaint(complaint)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <h4 className="font-semibold text-[10px] truncate">
                              {complaint.subject}
                            </h4>
                            {complaint.status === 'escalated' && (
                              <Badge className="bg-orange-500 text-white gap-1 text-[9px] px-1 py-0">
                                <ArrowUp className="w-2.5 h-2.5" weight="bold" />
                                Alert
                              </Badge>
                            )}
                          </div>
                          <p className="text-[9px] text-muted-foreground line-clamp-2 mb-1">
                            {complaint.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-2.5 h-2.5" />
                            <span>{complaint.userName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CalendarBlank className="w-2.5 h-2.5" />
                            <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px] px-1 py-0',
                              getPriorityColor(complaint.priority)
                            )}
                          >
                            {complaint.priority.toUpperCase()}
                          </Badge>
                          <Badge
                            className={cn(
                              'text-white gap-1 text-[9px] px-1 py-0',
                              statusConfig.color
                            )}
                          >
                            {statusConfig.icon}
                            {complaint.status.replace('-', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail View Modal */}
      {selectedComplaint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedComplaint(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-3xl"
          >
            <Card className="border border-accent/30 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10 p-3">
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <ChatCircleDots className="w-4 h-4 text-accent" weight="fill" />
                  Details
                </CardTitle>
                <CardDescription className="text-[10px]">
                  ID: {selectedComplaint.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-2">
                    {/* User Info */}
                    <div className="grid grid-cols-2 gap-2 p-2 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-0.5">User</p>
                        <p className="text-[10px] font-medium">{selectedComplaint.userName}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-0.5">Email</p>
                        <p className="text-[10px] font-medium">{selectedComplaint.userEmail}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-0.5">Category</p>
                        <p className="text-[10px] font-medium capitalize">
                          {selectedComplaint.category}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-0.5">Priority</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] px-1 py-0',
                            getPriorityColor(selectedComplaint.priority)
                          )}
                        >
                          {selectedComplaint.priority.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Subject & Description */}
                    <div>
                      <h3 className="font-semibold mb-1 text-[10px]">Subject</h3>
                      <p className="text-[10px]">{selectedComplaint.subject}</p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-1 text-[10px]">Description</h3>
                      <div className="text-[10px] whitespace-pre-wrap p-2 bg-muted/50 rounded-lg">
                        {selectedComplaint.description}
                      </div>
                    </div>

                    <Separator />

                    {/* AI Resolution */}
                    {selectedComplaint.aiResolution && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                        <h3 className="font-semibold mb-1 flex items-center gap-1.5 text-[10px]">
                          <Robot className="w-3 h-3 text-green-500" weight="fill" />
                          AI Resolution
                        </h3>
                        <p className="text-[10px] mb-1.5">
                          {selectedComplaint.aiResolution.analysis}
                        </p>
                        <div className="p-2 bg-background rounded text-[10px] whitespace-pre-wrap">
                          {selectedComplaint.aiResolution.solution}
                        </div>
                        <Badge variant="outline" className="mt-1.5 text-[9px] px-1 py-0">
                          Confidence: {Math.round(selectedComplaint.aiResolution.confidence * 100)}%
                        </Badge>
                      </div>
                    )}

                    {/* Escalation Info */}
                    {selectedComplaint.escalation && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2">
                        <h3 className="font-semibold mb-1 flex items-center gap-1.5 text-[10px]">
                          <Warning className="w-3 h-3 text-orange-500" weight="fill" />
                          Alert Info
                        </h3>
                        <p className="text-[10px] mb-1.5">{selectedComplaint.escalation.reason}</p>
                        <div className="flex items-center gap-1.5">
                          {selectedComplaint.escalation.emailSent ? (
                            <Badge className="bg-green-500 text-white gap-1 text-[9px] px-1 py-0">
                              <CheckCircle className="w-2.5 h-2.5" weight="fill" />
                              Sent
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 text-[9px] px-1 py-0">
                              <Warning className="w-2.5 h-2.5" weight="fill" />
                              Failed
                            </Badge>
                          )}
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(selectedComplaint.escalation.escalatedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={() => setSelectedComplaint(null)}
                  >
                    Close
                  </Button>
                  {selectedComplaint.status !== 'closed' && (
                    <Button
                      className="flex-1 bg-accent h-7 text-xs"
                      onClick={() => {
                        handleMarkAsClosed(selectedComplaint)
                        setSelectedComplaint(null)
                      }}
                    >
                      <CheckCircle className="w-3 h-3 mr-1.5" weight="fill" />
                      Close
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
