/**
 * FlowSphere Hidden Vault UI Component
 *
 * Production-ready UI for hidden encrypted file storage.
 * Files are disguised as system certificates and stored on device.
 *
 * @author FlowSphere Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderLock,
  Plus,
  Trash,
  Eye,
  Download,
  Upload,
  ShieldCheck,
  Lock,
  Warning,
  CheckCircle,
  X,
  CaretRight,
  File,
  Image,
  FileDoc,
  FilePdf,
  FileZip,
  Certificate,
  DeviceMobile,
  CloudArrowUp,
  CreditCard,
  Crown,
  Lightning,
  Info,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import {
  initializeHiddenVault,
  hideFiles,
  revealFiles,
  deleteHiddenFile,
  getHiddenFiles,
  getStorageUsed,
  canUpload,
  getRecommendedDisguise,
  formatBytes,
  STORAGE_LIMITS,
  SUBSCRIPTION_PRICES,
  type HiddenFile,
  type DisguiseType,
  type VaultTier,
  type EncryptionProgress
} from '@/lib/hidden-vault-storage'

import {
  getVaultSubscription,
  canUpload as canUploadSubscription,
  canViewFiles,
  canDeleteFiles,
  checkStorageLimit,
  getGraceDaysRemaining,
  getStatusNotification,
  SUBSCRIPTION_TIERS,
  RECEIPT_LABELS,
  type VaultSubscription,
  type ReceiptMode
} from '@/lib/vault-subscription'

// ============================================
// TYPES
// ============================================

interface HiddenVaultUIProps {
  userId: string
  userPin: string  // From vault authentication
  onClose?: () => void
}

// ============================================
// COMPONENT
// ============================================

export function HiddenVaultUI({ userId, userPin, onClose }: HiddenVaultUIProps) {
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState<VaultSubscription | null>(null)
  const [hiddenFiles, setHiddenFiles] = useState<HiddenFile[]>([])
  const [storageUsed, setStorageUsed] = useState(0)

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Add file state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [realName, setRealName] = useState('')
  const [disguiseType, setDisguiseType] = useState<DisguiseType>('apple')
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [encryptionProgress, setEncryptionProgress] = useState<EncryptionProgress | null>(null)

  // View file state
  const [viewingFile, setViewingFile] = useState<HiddenFile | null>(null)
  const [revealedFiles, setRevealedFiles] = useState<{ name: string; data: Blob; mimeType: string }[]>([])
  const [isDecrypting, setIsDecrypting] = useState(false)

  // Delete state
  const [fileToDelete, setFileToDelete] = useState<HiddenFile | null>(null)

  // Subscribe state
  const [selectedTier, setSelectedTier] = useState<VaultTier>('pro')
  const [receiptMode, setReceiptMode] = useState<ReceiptMode>('bundled')
  const [receiptLabel, setReceiptLabel] = useState<string>(RECEIPT_LABELS[0].label)

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true)
        await initializeHiddenVault()
        const sub = await getVaultSubscription(userId)
        setSubscription(sub)
        const files = await getHiddenFiles()
        setHiddenFiles(files)
        const used = await getStorageUsed()
        setStorageUsed(used)
        const recommended = await getRecommendedDisguise()
        setDisguiseType(recommended)
      } catch (error) {
        console.error('Failed to initialize hidden vault:', error)
        toast.error('Failed to load hidden vault')
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [userId])

  // ============================================
  // HANDLERS
  // ============================================

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(files)
  }, [])

  const handleHideFiles = async () => {
    if (!selectedFiles.length || !realName.trim()) {
      toast.error('Please select files and enter a name')
      return
    }

    if (!subscription || subscription.status !== 'active') {
      toast.error('Active subscription required to upload files')
      setShowSubscribeDialog(true)
      return
    }

    // Check storage limit
    const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0)
    const limitCheck = checkStorageLimit(subscription, totalSize)
    if (!limitCheck.allowed) {
      toast.error(limitCheck.reason)
      return
    }

    try {
      setIsEncrypting(true)

      const hiddenFile = await hideFiles(
        selectedFiles,
        realName.trim(),
        disguiseType,
        userPin,
        (progress) => setEncryptionProgress(progress)
      )

      setHiddenFiles(prev => [...prev, hiddenFile])
      setStorageUsed(prev => prev + hiddenFile.totalSize)

      toast.success('Files encrypted and hidden successfully!')
      setShowAddDialog(false)
      setSelectedFiles([])
      setRealName('')
      setEncryptionProgress(null)
    } catch (error) {
      console.error('Failed to hide files:', error)
      toast.error('Failed to encrypt files')
    } finally {
      setIsEncrypting(false)
    }
  }

  const handleViewFile = async (file: HiddenFile) => {
    setViewingFile(file)
    setShowViewDialog(true)
    setIsDecrypting(true)

    try {
      const result = await revealFiles(file.id, userPin)
      setRevealedFiles(result.files)
    } catch (error) {
      console.error('Failed to reveal files:', error)
      toast.error('Failed to decrypt files. Wrong PIN?')
      setShowViewDialog(false)
    } finally {
      setIsDecrypting(false)
    }
  }

  const handleDownloadFile = (file: { name: string; data: Blob; mimeType: string }) => {
    const url = URL.createObjectURL(file.data)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Downloaded: ${file.name}`)
  }

  const handleDeleteFile = async () => {
    if (!fileToDelete) return

    try {
      await deleteHiddenFile(fileToDelete.id)
      setHiddenFiles(prev => prev.filter(f => f.id !== fileToDelete.id))
      setStorageUsed(prev => prev - fileToDelete.totalSize)
      toast.success('File deleted successfully')
      setShowDeleteDialog(false)
      setFileToDelete(null)
    } catch (error) {
      console.error('Failed to delete file:', error)
      toast.error('Failed to delete file')
    }
  }

  const handleSubscribe = async () => {
    // TODO: Integrate with Stripe payment
    toast.info('Subscription feature - integrate with Stripe')
    console.log('Subscribe:', { tier: selectedTier, receiptMode, receiptLabel })
  }

  // ============================================
  // RENDER HELPERS
  // ============================================

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />
    if (mimeType.includes('pdf')) return <FilePdf className="w-5 h-5" />
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileDoc className="w-5 h-5" />
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <FileZip className="w-5 h-5" />
    return <File className="w-5 h-5" />
  }

  const statusNotification = subscription ? getStatusNotification(subscription) : null

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowsClockwise className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FolderLock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Hidden Vault Storage</h2>
            <p className="text-sm text-muted-foreground">
              Files encrypted and disguised as system certificates
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Status Notification */}
      {statusNotification && (
        <Alert variant={statusNotification.type === 'error' ? 'destructive' : 'default'}>
          <Warning className="h-4 w-4" />
          <AlertTitle>{statusNotification.title}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{statusNotification.message}</span>
            {statusNotification.action && (
              <Button size="sm" onClick={() => setShowSubscribeDialog(true)}>
                {statusNotification.action}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* No Subscription */}
      {!subscription && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Active Subscription</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Subscribe to start hiding files on your device with military-grade encryption.
            </p>
            <Button onClick={() => setShowSubscribeDialog(true)}>
              <Crown className="w-4 h-4 mr-2" />
              View Plans
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Storage Usage */}
      {subscription && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Storage Used</span>
              <span className="text-sm text-muted-foreground">
                {formatBytes(storageUsed)} / {subscription.storageLimitGb} GB
              </span>
            </div>
            <Progress
              value={(storageUsed / (subscription.storageLimitGb * 1024 * 1024 * 1024)) * 100}
              className="h-2"
            />
            <div className="flex items-center justify-between mt-2">
              <Badge variant="secondary" className="capitalize">
                {subscription.tier} Plan
              </Badge>
              <Button variant="link" size="sm" onClick={() => setShowSubscribeDialog(true)}>
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files List */}
      {subscription && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Hidden Files</CardTitle>
              <CardDescription>
                {hiddenFiles.length} file{hiddenFiles.length !== 1 ? 's' : ''} hidden
              </CardDescription>
            </div>
            {subscription.status === 'active' && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Files
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {hiddenFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  No hidden files yet. Add files to encrypt and disguise them.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {hiddenFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Certificate className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{file.realName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{file.disguisedName}</span>
                            <span>•</span>
                            <span>{formatBytes(file.totalSize)}</span>
                            <span>•</span>
                            <span>{file.originalFiles.length} file{file.originalFiles.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewFile(file)}
                          disabled={!canViewFiles(subscription)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setFileToDelete(file)
                            setShowDeleteDialog(true)
                          }}
                          disabled={!canDeleteFiles(subscription)}
                        >
                          <Trash className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">How it works</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Files are encrypted with AES-256-GCM + your PIN</li>
                <li>• Disguised as {disguiseType === 'apple' ? 'Apple certificates' : 'Android credentials'}</li>
                <li>• Stored in Documents/.flowsphere/ (hidden folder)</li>
                <li>• Only visible through FlowSphere Vault with PIN</li>
                <li>• Device-bound encryption (won't work on other devices)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Files Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hide New Files</DialogTitle>
            <DialogDescription>
              Encrypt and disguise files as system certificates
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Name */}
            <div className="space-y-2">
              <Label>What do you want to call this?</Label>
              <Input
                placeholder="e.g., My private photos"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                disabled={isEncrypting}
              />
              <p className="text-xs text-muted-foreground">
                Only you will see this name in FlowSphere
              </p>
            </div>

            {/* Disguise Type */}
            <div className="space-y-2">
              <Label>Disguise type (what others see)</Label>
              <RadioGroup
                value={disguiseType}
                onValueChange={(v) => setDisguiseType(v as DisguiseType)}
                disabled={isEncrypting}
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="apple" id="apple" />
                  <Label htmlFor="apple" className="flex-1 cursor-pointer">
                    <div className="font-medium">Apple Certificate</div>
                    <div className="text-xs text-muted-foreground">
                      com.apple.security.xxxx.cert
                    </div>
                  </Label>
                  <Badge variant="secondary">iOS</Badge>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="android" id="android" />
                  <Label htmlFor="android" className="flex-1 cursor-pointer">
                    <div className="font-medium">Android Credential</div>
                    <div className="text-xs text-muted-foreground">
                      com.android.keychain.xxxx.credential
                    </div>
                  </Label>
                  <Badge variant="secondary">Android</Badge>
                </div>
              </RadioGroup>
            </div>

            {/* File Selection */}
            <div className="space-y-2">
              <Label>Select files to encrypt</Label>
              <div className="flex items-center justify-center w-full">
                <label
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors",
                    isEncrypting && "opacity-50 pointer-events-none"
                  )}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {selectedFiles.length > 0
                        ? `${selectedFiles.length} file(s) selected`
                        : 'Click to select files'}
                    </p>
                    {selectedFiles.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Total: {formatBytes(selectedFiles.reduce((sum, f) => sum + f.size, 0))}
                      </p>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    onChange={handleFileSelect}
                    disabled={isEncrypting}
                  />
                </label>
              </div>
            </div>

            {/* Encryption Progress */}
            {isEncrypting && encryptionProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{encryptionProgress.phase}...</span>
                  <span>{encryptionProgress.percentage}%</span>
                </div>
                <Progress value={encryptionProgress.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Do not close the app
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={isEncrypting}>
              Cancel
            </Button>
            <Button onClick={handleHideFiles} disabled={isEncrypting || !selectedFiles.length || !realName.trim()}>
              {isEncrypting ? (
                <>
                  <ArrowsClockwise className="w-4 h-4 mr-2 animate-spin" />
                  Encrypting...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Encrypt & Hide
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Files Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewingFile?.realName}</DialogTitle>
            <DialogDescription>
              Decrypted files - tap to download
            </DialogDescription>
          </DialogHeader>

          {isDecrypting ? (
            <div className="flex flex-col items-center justify-center py-8">
              <ArrowsClockwise className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Decrypting files...</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {revealedFiles.map((file, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                    onClick={() => handleDownloadFile(file)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(file.data.size)}
                        </p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowViewDialog(false)
              setRevealedFiles([])
              setViewingFile(null)
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Hidden File?</DialogTitle>
            <DialogDescription>
              This will permanently delete "{fileToDelete?.realName}" and all its contents.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFile}>
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscribe Dialog */}
      <Dialog open={showSubscribeDialog} onOpenChange={setShowSubscribeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Hidden Vault Storage Plans</DialogTitle>
            <DialogDescription>
              Encrypt and hide files on your device
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tier Selection */}
            <RadioGroup
              value={selectedTier}
              onValueChange={(v) => setSelectedTier(v as VaultTier)}
            >
              {Object.values(SUBSCRIPTION_TIERS).map((tier) => (
                <div
                  key={tier.id}
                  className={cn(
                    "flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors",
                    selectedTier === tier.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  <RadioGroupItem value={tier.id} id={tier.id} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tier.name}</span>
                      {tier.id === 'gold' && (
                        <Badge variant="default" className="text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          Best Value
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tier.storageLimitGb} GB • ${tier.priceMonthly}/month
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">${tier.priceMonthly}</div>
                    <div className="text-xs text-muted-foreground">/month</div>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <Separator />

            {/* Receipt Privacy */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Bank Statement Privacy
              </Label>
              <RadioGroup
                value={receiptMode}
                onValueChange={(v) => setReceiptMode(v as ReceiptMode)}
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="bundled" id="bundled" />
                  <Label htmlFor="bundled" className="flex-1 cursor-pointer">
                    <div className="font-medium">Bundle with FlowSphere</div>
                    <div className="text-xs text-muted-foreground">
                      Shows as single "FLOWSPHERE APP" charge
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="separate" id="separate" />
                  <Label htmlFor="separate" className="flex-1 cursor-pointer">
                    <div className="font-medium">Separate with custom name</div>
                    <div className="text-xs text-muted-foreground">
                      Choose what appears on statement
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {receiptMode === 'separate' && (
                <div className="pl-6 space-y-2">
                  <Label>Statement label</Label>
                  <RadioGroup
                    value={receiptLabel}
                    onValueChange={setReceiptLabel}
                    className="grid grid-cols-2 gap-2"
                  >
                    {RECEIPT_LABELS.map((label) => (
                      <div
                        key={label.id}
                        className={cn(
                          "flex items-center space-x-2 p-2 border rounded cursor-pointer text-sm",
                          receiptLabel === label.label && "border-primary bg-primary/5"
                        )}
                        onClick={() => setReceiptLabel(label.label)}
                      >
                        <RadioGroupItem value={label.label} id={label.id} />
                        <Label htmlFor={label.id} className="cursor-pointer text-xs">
                          {label.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubscribeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubscribe}>
              <Lightning className="w-4 h-4 mr-2" />
              Subscribe - ${SUBSCRIPTION_TIERS[selectedTier].priceMonthly}/mo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default HiddenVaultUI
