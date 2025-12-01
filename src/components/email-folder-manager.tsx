import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder,
  FolderOpen,
  Check,
  X,
  ArrowRight,
  MagnifyingGlass,
  Sparkle,
  Plus,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import {
  EmailFolder,
  EmailCategorization,
  DEFAULT_FOLDERS,
  autoCategorizEmails,
  applyCategorizationsToFolders,
  moveEmailToFolder,
  getFolderStats
} from '@/lib/email-folder-manager'
import { EmailMessage } from '@/lib/email-scanner'

interface EmailFolderManagerProps {
  emails: EmailMessage[]
  onRefresh?: () => void
}

export function EmailFolderManager({ emails, onRefresh }: EmailFolderManagerProps) {
  const [folders, setFolders] = useKV<EmailFolder[]>('flowsphere-email-folders', DEFAULT_FOLDERS)
  const [categorizations, setCategorizations] = useKV<EmailCategorization[]>(
    'flowsphere-email-categorizations',
    []
  )
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [pendingVerifications, setPendingVerifications] = useState<EmailCategorization[]>([])

  // Auto-categorize emails on mount or when emails change
  useEffect(() => {
    if (emails.length > 0 && categorizations.length === 0) {
      handleAutoCategorize()
    }
  }, [emails])

  const handleAutoCategorize = async () => {
    setIsProcessing(true)
    toast.loading('Analyzing emails and organizing into folders...')

    // Simulate processing delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1500))

    const newCategorizations = autoCategorizEmails(emails, folders)
    setCategorizations(newCategorizations)

    // Show items needing verification (confidence < 70)
    const needsVerification = newCategorizations.filter(cat => cat.confidence < 70)
    setPendingVerifications(needsVerification)

    if (needsVerification.length > 0) {
      setShowVerification(true)
      toast.success(
        `Categorized ${newCategorizations.length} emails. ${needsVerification.length} need your review.`
      )
    } else {
      toast.success(`Successfully categorized all ${newCategorizations.length} emails!`)
      applyFolderChanges(newCategorizations)
    }

    setIsProcessing(false)
  }

  const applyFolderChanges = (cats: EmailCategorization[]) => {
    const updatedFolders = applyCategorizationsToFolders(cats, folders)
    setFolders(updatedFolders)
  }

  const handleVerifyCategorizat = (emailId: string, approved: boolean, newFolder?: string) => {
    const updatedCategorizations = categorizations.map(cat => {
      if (cat.emailId === emailId) {
        return {
          ...cat,
          verified: approved,
          suggestedFolder: newFolder || cat.suggestedFolder
        }
      }
      return cat
    })

    setCategorizations(updatedCategorizations)

    // Remove from pending
    setPendingVerifications(prev => prev.filter(p => p.emailId !== emailId))

    // Apply changes
    applyFolderChanges(updatedCategorizations)

    toast.success(approved ? 'Email categorization confirmed' : 'Email moved to different folder')
  }

  const handleVerifyAll = () => {
    const updatedCategorizations = categorizations.map(cat => ({
      ...cat,
      verified: true
    }))

    setCategorizations(updatedCategorizations)
    setPendingVerifications([])
    setShowVerification(false)
    applyFolderChanges(updatedCategorizations)

    toast.success('All categorizations confirmed!')
  }

  const handleMoveEmail = (emailId: string, fromPath: string, toPath: string) => {
    const updatedFolders = moveEmailToFolder(emailId, fromPath, toPath, folders)
    setFolders(updatedFolders)

    const updatedCategorizations = categorizations.map(cat =>
      cat.emailId === emailId ? { ...cat, suggestedFolder: toPath, verified: true } : cat
    )
    setCategorizations(updatedCategorizations)

    toast.success('Email moved successfully')
  }

  const getEmailsForFolder = (folderPath: string): EmailMessage[] => {
    const folder = folders.find(f => f.path === folderPath)
    if (!folder) return []

    return emails.filter(email => folder.emailIds.includes(email.id))
  }

  const stats = getFolderStats(folders)
  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Folders</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered organization of your emails
          </p>
        </div>
        <div className="flex gap-2">
          {pendingVerifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVerification(true)}
            >
              <Sparkle className="w-4 h-4 mr-2" />
              Review {pendingVerifications.length}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoCategorize}
            disabled={isProcessing}
          >
            <ArrowsClockwise className="w-4 h-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Re-categorize'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.totalFolders}</p>
              <p className="text-sm text-muted-foreground">Total Folders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.totalCategorized}</p>
              <p className="text-sm text-muted-foreground">Categorized</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{emails.length - stats.totalCategorized}</p>
              <p className="text-sm text-muted-foreground">Uncategorized</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{pendingVerifications.length}</p>
              <p className="text-sm text-muted-foreground">Need Review</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search folders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFolders.map(folder => (
          <motion.div
            key={folder.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={`cursor-pointer transition-all ${
                selectedFolder === folder.path
                  ? 'border-2 border-accent shadow-lg'
                  : 'border hover:shadow-md'
              }`}
              onClick={() => setSelectedFolder(folder.path)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${folder.color}20` }}
                    >
                      {selectedFolder === folder.path ? (
                        <FolderOpen
                          className="w-6 h-6"
                          style={{ color: folder.color }}
                          weight="fill"
                        />
                      ) : (
                        <Folder
                          className="w-6 h-6"
                          style={{ color: folder.color }}
                          weight="duotone"
                        />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{folder.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{folder.path}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg font-bold">
                    {folder.count}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{folder.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Folder Contents */}
      <AnimatePresence>
        {selectedFolder && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {folders.find(f => f.path === selectedFolder)?.name} Emails
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFolder(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <CardDescription>
                  {getEmailsForFolder(selectedFolder).length} emails in this folder
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {getEmailsForFolder(selectedFolder).map(email => (
                      <div
                        key={email.id}
                        className="p-3 border rounded-lg hover:bg-accent/10 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{email.subject}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              From: {email.from}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(email.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={email.read ? 'secondary' : 'default'}>
                            {email.read ? 'Read' : 'Unread'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {getEmailsForFolder(selectedFolder).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No emails in this folder yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification Modal */}
      <AnimatePresence>
        {showVerification && pendingVerifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowVerification(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Review Categorizations</CardTitle>
                      <CardDescription>
                        {pendingVerifications.length} emails need your confirmation
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleVerifyAll}>
                        <Check className="w-4 h-4 mr-2" />
                        Approve All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowVerification(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {pendingVerifications.slice(0, 10).map(categorization => {
                        const email = emails.find(e => e.id === categorization.emailId)
                        if (!email) return null

                        const suggestedFolder = folders.find(
                          f => f.path === categorization.suggestedFolder
                        )

                        return (
                          <div
                            key={categorization.emailId}
                            className="p-4 border rounded-lg space-y-3"
                          >
                            <div>
                              <p className="font-medium">{email.subject}</p>
                              <p className="text-sm text-muted-foreground">
                                From: {email.from}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Current: {email.category}</Badge>
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                              <Badge
                                style={{
                                  backgroundColor: `${suggestedFolder?.color}20`,
                                  color: suggestedFolder?.color
                                }}
                              >
                                Suggested: {suggestedFolder?.name}
                              </Badge>
                              <Badge variant="secondary">
                                {categorization.confidence}% confidence
                              </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground">
                              {categorization.reasons[0]}
                            </p>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleVerifyCategorizat(categorization.emailId, true)
                                }
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleVerifyCategorizat(
                                    categorization.emailId,
                                    false,
                                    '/personal'
                                  )
                                }
                              >
                                <X className="w-4 h-4 mr-2" />
                                Move to Personal
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
