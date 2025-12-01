import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Warning,
  X,
  CurrencyDollar,
  Calendar,
  CheckCircle,
  Link as LinkIcon,
  CaretDown,
  Bell
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import {
  processBillAlerts,
  getActiveBillAlerts,
  getBillAlertSummary,
  dismissBillAlert,
  formatBillAmount,
  getDaysUntilDue,
  getCategoryIcon,
  getPriorityColor,
  type BillAlert
} from '@/lib/bill-tracking-system'
import { EmailMessage } from '@/lib/email-scanner'

interface BillAlertsDashboardProps {
  emails: EmailMessage[]
  onRefresh?: () => void
}

export function BillAlertsDashboard({ emails, onRefresh }: BillAlertsDashboardProps) {
  const [billAlerts, setBillAlerts] = useKV<BillAlert[]>('flowsphere-bill-alerts', [])
  const [isExpanded, setIsExpanded] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Process emails on mount and when emails change
  useEffect(() => {
    if (emails.length > 0) {
      processEmails()
    }
  }, [emails])

  const processEmails = () => {
    setIsProcessing(true)

    const { updatedAlerts, newAlerts, verifiedPayments } = processBillAlerts(emails, billAlerts)

    // Combine current and new alerts
    const allAlerts = [...updatedAlerts, ...newAlerts]
    setBillAlerts(allAlerts)

    // Show notifications for new bills
    if (newAlerts.length > 0) {
      toast.info(`${newAlerts.length} new ${newAlerts.length === 1 ? 'bill' : 'bills'} detected`)
    }

    // Show notifications for verified payments
    verifiedPayments.forEach(verification => {
      const bill = allAlerts.find(b => b.id === verification.billId)
      if (bill) {
        toast.success(`Payment verified for ${bill.billName}!`)
      }
    })

    setIsProcessing(false)
  }

  const handleDismiss = (alert: BillAlert) => {
    const updated = billAlerts.map(a =>
      a.id === alert.id ? dismissBillAlert(a) : a
    )
    setBillAlerts(updated)
    toast.success(`${alert.billName} dismissed`)
  }

  const handlePaymentLink = (alert: BillAlert) => {
    if (alert.paymentLink) {
      window.open(alert.paymentLink, '_blank')
      toast.info('Opening payment page...')
    } else {
      toast.error('No payment link available')
    }
  }

  const activeAlerts = getActiveBillAlerts(billAlerts)
  const summary = getBillAlertSummary(billAlerts)

  if (activeAlerts.length === 0) {
    return null // Don't show if no active bills
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="border-2 border-amber-500/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardContent className="p-4">
          {/* Summary Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="p-2 rounded-full bg-amber-500/20"
              >
                <Bell className="w-6 h-6 text-amber-600 dark:text-amber-400" weight="fill" />
              </motion.div>
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  Bill Alerts
                  <Badge variant="destructive" className="text-xs">
                    {summary.total} Active
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {summary.overdue > 0 && (
                    <span className="text-red-600 font-semibold">
                      {summary.overdue} overdue •{' '}
                    </span>
                  )}
                  {summary.dueThisWeek > 0 && (
                    <span className="text-orange-600 font-semibold">
                      {summary.dueThisWeek} due this week •{' '}
                    </span>
                  )}
                  Total: {formatBillAmount(summary.totalAmount)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {summary.critical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <Warning className="w-3 h-3 mr-1" weight="fill" />
                  {summary.critical} Critical
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <CaretDown
                  className={`w-4 h-4 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Payment Progress</span>
              <span>
                {billAlerts.filter(b => b.status === 'paid').length} /{' '}
                {billAlerts.length} paid
              </span>
            </div>
            <Progress
              value={
                (billAlerts.filter(b => b.status === 'paid').length /
                  billAlerts.length) *
                100
              }
              className="h-2"
            />
          </div>

          {/* Bill List */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2"
              >
                {activeAlerts.map((alert, index) => {
                  const daysUntilDue = getDaysUntilDue(alert.dueDate)
                  const isOverdue = alert.status === 'overdue'
                  const priorityColor = getPriorityColor(alert.priority)

                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 border-2 rounded-lg bg-white/50 dark:bg-gray-900/50 hover:shadow-md transition-shadow"
                      style={{ borderLeftColor: priorityColor, borderLeftWidth: '4px' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="text-2xl mt-1">
                            {getCategoryIcon(alert.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold truncate">
                                {alert.billName}
                              </h4>
                              {isOverdue && (
                                <Badge variant="destructive" className="text-xs">
                                  OVERDUE
                                </Badge>
                              )}
                              {alert.priority === 'critical' && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-red-500 text-red-700"
                                >
                                  <Warning className="w-3 h-3 mr-1" weight="fill" />
                                  Critical
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CurrencyDollar className="w-3 h-3" />
                                <span className="font-semibold text-foreground">
                                  {formatBillAmount(alert.amount)}
                                </span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {isOverdue ? (
                                  <span className="text-red-600 font-semibold">
                                    {Math.abs(daysUntilDue)} days overdue
                                  </span>
                                ) : daysUntilDue === 0 ? (
                                  <span className="text-orange-600 font-semibold">
                                    Due today!
                                  </span>
                                ) : (
                                  <span>Due in {daysUntilDue} days</span>
                                )}
                              </span>
                              {alert.provider && (
                                <span className="text-xs">
                                  • {alert.provider}
                                </span>
                              )}
                            </div>

                            {alert.accountNumber && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Account: ••••{alert.accountNumber.slice(-4)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1">
                          {alert.paymentLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePaymentLink(alert)}
                              className="text-xs h-8"
                            >
                              <LinkIcon className="w-3 h-3 mr-1" />
                              Pay
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismiss(alert)}
                            className="text-xs h-8"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}

                {/* Info Footer */}
                <div className="pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" weight="fill" />
                      <span>
                        AI monitors your emails for payment confirmations
                      </span>
                    </div>
                    {isProcessing && (
                      <Badge variant="secondary" className="text-xs">
                        Processing...
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}
