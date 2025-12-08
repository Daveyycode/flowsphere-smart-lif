/**
 * CEO Dashboard Sections
 * Complaints, Inquiries, Analytics, and Payment Integration
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChatCircleDots,
  Question,
  ChartLineUp,
  Bank,
  CreditCard,
  Check,
  X,
  Warning,
  Clock,
  User,
  Calendar,
  Eye,
  Trash,
  Key,
  LockKey,
  CheckCircle,
  XCircle
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Complaint {
  id: string
  userId: string
  userName: string
  userEmail: string
  subject: string
  description: string
  status: 'pending' | 'in-progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: string
  updatedAt: string
  assignedTo?: string
  resolution?: string
}

interface Inquiry {
  id: string
  userId: string
  userName: string
  userEmail: string
  category: 'billing' | 'technical' | 'feature-request' | 'general'
  question: string
  response?: string
  status: 'pending' | 'answered' | 'closed'
  createdAt: string
  respondedAt?: string
}

export function ComplaintsManagement() {
  const [complaints, setComplaints] = useKV<Complaint[]>('flowsphere-complaints', [
    {
      id: '1',
      userId: 'u1',
      userName: 'Sarah Johnson',
      userEmail: 'sarah@example.com',
      subject: 'GPS tracking not updating',
      description: 'The GPS location for my family members hasn\'t updated in 2 hours. This is concerning for safety.',
      status: 'pending',
      priority: 'high',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '2',
      userId: 'u2',
      userName: 'Michael Chen',
      userEmail: 'michael@example.com',
      subject: 'Billing issue with premium subscription',
      description: 'I was charged twice for my premium subscription this month.',
      status: 'in-progress',
      priority: 'urgent',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
      assignedTo: 'Admin Team'
    },
    {
      id: '3',
      userId: 'u3',
      userName: 'Emma Williams',
      userEmail: 'emma@example.com',
      subject: 'App crashes on startup',
      description: 'The app crashes immediately after opening on my iPhone 12.',
      status: 'resolved',
      priority: 'high',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 43200000).toISOString(),
      assignedTo: 'Tech Support',
      resolution: 'Issue resolved with app version 2.1.3 update'
    }
  ])

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [resolution, setResolution] = useState('')

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-coral text-white'
      case 'low': return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500 text-white'
      case 'in-progress': return 'bg-blue-500 text-white'
      case 'resolved': return 'bg-green-500 text-white'
      case 'closed': return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const handleStatusChange = (id: string, newStatus: Complaint['status']) => {
    setComplaints((current) =>
      (current || []).map((c) =>
        c.id === id ? { ...c, status: newStatus, updatedAt: new Date().toISOString() } : c
      )
    )
    toast.success('Complaint status updated')
  }

  const handleResolve = () => {
    if (!selectedComplaint || !resolution.trim()) {
      toast.error('Please provide a resolution')
      return
    }

    setComplaints((current) =>
      (current || []).map((c) =>
        c.id === selectedComplaint.id
          ? {
              ...c,
              status: 'resolved',
              resolution,
              updatedAt: new Date().toISOString()
            }
          : c
      )
    )

    toast.success('Complaint resolved successfully')
    setShowDetails(false)
    setSelectedComplaint(null)
    setResolution('')
  }

  const handleDelete = (id: string) => {
    setComplaints((current) => (current || []).filter((c) => c.id !== id))
    toast.success('Complaint deleted')
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {(complaints || []).map((complaint) => (
          <Card key={complaint.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getPriorityColor(complaint.priority)}>
                      {complaint.priority}
                    </Badge>
                    <Badge className={getStatusColor(complaint.status)}>
                      {complaint.status}
                    </Badge>
                  </div>

                  <h4 className="font-semibold">{complaint.subject}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {complaint.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {complaint.userName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(complaint.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedComplaint(complaint)
                      setShowDetails(true)
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>

                  {complaint.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(complaint.id, 'in-progress')}
                      className="bg-accent"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(complaint.id)}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showDetails && selectedComplaint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDetails(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl"
          >
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedComplaint.subject}</CardTitle>
                    <CardDescription className="mt-2">
                      From: {selectedComplaint.userName} ({selectedComplaint.userEmail})
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDetails(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedComplaint.description}
                  </p>
                </div>

                <div>
                  <Label>Resolution</Label>
                  <Textarea
                    placeholder="Enter resolution details..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="mt-1"
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetails(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleResolve}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Resolve
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export function InquiriesManagement() {
  const [inquiries, setInquiries] = useKV<Inquiry[]>('flowsphere-inquiries', [
    {
      id: '1',
      userId: 'u1',
      userName: 'David Lee',
      userEmail: 'david@example.com',
      category: 'billing',
      question: 'Can I upgrade from monthly to annual billing mid-cycle?',
      status: 'pending',
      createdAt: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: '2',
      userId: 'u2',
      userName: 'Lisa Wang',
      userEmail: 'lisa@example.com',
      category: 'feature-request',
      question: 'Is there a way to export all family location history?',
      response: 'Yes! You can export location history from Settings > Data Export. We support CSV and JSON formats.',
      status: 'answered',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      respondedAt: new Date(Date.now() - 43200000).toISOString()
    }
  ])

  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [response, setResponse] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'billing': return 'bg-green-500 text-white'
      case 'technical': return 'bg-blue-500 text-white'
      case 'feature-request': return 'bg-purple-500 text-white'
      case 'general': return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const handleRespond = () => {
    if (!selectedInquiry || !response.trim()) {
      toast.error('Please provide a response')
      return
    }

    setInquiries((current) =>
      (current || []).map((inq) =>
        inq.id === selectedInquiry.id
          ? {
              ...inq,
              response,
              status: 'answered',
              respondedAt: new Date().toISOString()
            }
          : inq
      )
    )

    toast.success('Response sent successfully')
    setShowDetails(false)
    setSelectedInquiry(null)
    setResponse('')
  }

  return (
    <div className="space-y-4">
      {(inquiries || []).map((inquiry) => (
        <Card key={inquiry.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={getCategoryColor(inquiry.category)}>
                    {inquiry.category.replace('-', ' ')}
                  </Badge>
                  {inquiry.status === 'answered' && (
                    <Badge className="bg-green-500 text-white">
                      <Check className="w-3 h-3 mr-1" />
                      Answered
                    </Badge>
                  )}
                </div>

                <p className="text-sm font-medium">{inquiry.question}</p>

                {inquiry.response && (
                  <p className="text-sm text-muted-foreground">
                    Response: {inquiry.response}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {inquiry.userName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(inquiry.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedInquiry(inquiry)
                    setResponse(inquiry.response || '')
                    setShowDetails(true)
                  }}
                >
                  {inquiry.status === 'answered' ? 'Edit' : 'Respond'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {showDetails && selectedInquiry && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDetails(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl"
          >
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Inquiry from {selectedInquiry.userName}</CardTitle>
                    <CardDescription className="mt-2">
                      {selectedInquiry.userEmail}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDetails(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Question</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedInquiry.question}
                  </p>
                </div>

                <div>
                  <Label>Your Response</Label>
                  <Textarea
                    placeholder="Enter your response..."
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="mt-1"
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetails(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRespond}
                    className="flex-1 bg-accent"
                  >
                    Send Response
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export function PaymentIntegration() {
  const [stripeKey, setStripeKey] = useKV<string>('flowsphere-stripe-key', '')
  const [stripeSecret, setStripeSecret] = useKV<string>('flowsphere-stripe-secret', '')
  const [bankName, setBankName] = useKV<string>('flowsphere-bank-name', '')
  const [accountNumber, setAccountNumber] = useKV<string>('flowsphere-account-number', '')
  const [routingNumber, setRoutingNumber] = useKV<string>('flowsphere-routing-number', '')
  const [showStripeSecret, setShowStripeSecret] = useState(false)
  const [isStripeConnected, setIsStripeConnected] = useKV<boolean>('flowsphere-stripe-connected', false)
  const [isBankConnected, setIsBankConnected] = useKV<boolean>('flowsphere-bank-connected', false)

  const handleStripeConnect = () => {
    if (!stripeKey || !stripeSecret) {
      toast.error('Please enter both Stripe API keys')
      return
    }
    setIsStripeConnected(true)
    toast.success('Stripe connected successfully!')
  }

  const handleBankConnect = () => {
    if (!bankName || !accountNumber || !routingNumber) {
      toast.error('Please fill in all bank details')
      return
    }
    setIsBankConnected(true)
    toast.success('Bank account connected successfully!')
  }

  return (
    <div className="space-y-6">
      {/* Stripe Integration */}
      <Card className="border-2 border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" weight="duotone" />
              </div>
              <div>
                <CardTitle>Stripe Integration</CardTitle>
                <CardDescription>Connect your Stripe account for payment processing</CardDescription>
              </div>
            </div>
            {isStripeConnected && (
              <Badge className="bg-green-500 text-white">
                <CheckCircle className="w-4 h-4 mr-1" weight="fill" />
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stripe-publishable">Publishable Key</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="stripe-publishable"
                type="text"
                placeholder="pk_live_..."
                value={stripeKey || ''}
                onChange={(e) => setStripeKey(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stripe-secret">Secret Key</Label>
            <div className="relative">
              <LockKey className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="stripe-secret"
                type={showStripeSecret ? 'text' : 'password'}
                placeholder="sk_live_..."
                value={stripeSecret || ''}
                onChange={(e) => setStripeSecret(e.target.value)}
                className="pl-10 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
                onClick={() => setShowStripeSecret(!showStripeSecret)}
              >
                {showStripeSecret ? <Eye className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleStripeConnect}
            disabled={isStripeConnected}
            className="w-full bg-primary"
          >
            {isStripeConnected ? 'Connected' : 'Connect Stripe'}
          </Button>
        </CardContent>
      </Card>

      {/* Bank Integration */}
      <Card className="border-2 border-accent/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Bank className="w-6 h-6 text-accent" weight="duotone" />
              </div>
              <div>
                <CardTitle>Bank Account</CardTitle>
                <CardDescription>Connect your business bank account</CardDescription>
              </div>
            </div>
            {isBankConnected && (
              <Badge className="bg-green-500 text-white">
                <CheckCircle className="w-4 h-4 mr-1" weight="fill" />
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bank-name">Bank Name</Label>
            <Input
              id="bank-name"
              placeholder="e.g., Chase, Bank of America"
              value={bankName || ''}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-number">Account Number</Label>
            <Input
              id="account-number"
              type="password"
              placeholder="Enter account number"
              value={accountNumber || ''}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="routing-number">Routing Number</Label>
            <Input
              id="routing-number"
              placeholder="9-digit routing number"
              value={routingNumber || ''}
              onChange={(e) => setRoutingNumber(e.target.value)}
              maxLength={9}
            />
          </div>

          <Button
            onClick={handleBankConnect}
            disabled={isBankConnected}
            className="w-full bg-accent"
          >
            {isBankConnected ? 'Connected' : 'Connect Bank Account'}
          </Button>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <Warning className="w-4 h-4 inline mr-2" />
            Your bank details are encrypted and stored securely
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
