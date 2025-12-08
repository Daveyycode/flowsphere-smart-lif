import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CurrencyDollar,
  Lightning,
  Clock,
  TrendUp,
  ShoppingCart,
  Phone,
  Envelope,
  ChatCircleDots,
  Check,
  ArrowRight
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'
import {
  addCredits,
  getCreditUsageBreakdown,
  getRecommendedPackage,
  getCreditStatusMessage,
  formatCredits,
  getFeatureName,
  CREDIT_PACKAGES,
  type CreditBalance,
  type CreditTransaction
} from '@/lib/ai-credit-system'

export function AICreditManager() {
  const [creditBalance, setCreditBalance] = useKV<CreditBalance>('flowsphere-ai-credits', {
    total: 10.00,
    used: 0,
    remaining: 10.00,
    currency: 'USD',
    lastUpdated: new Date().toISOString()
  })

  const [transactions, setTransactions] = useKV<CreditTransaction[]>('flowsphere-credit-transactions', [])
  const [showPurchase, setShowPurchase] = useState(false)

  const handlePurchase = (packageId: string) => {
    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId)
    if (!pkg) return

    toast.loading('Processing purchase...')

    // Simulate payment processing
    setTimeout(() => {
      const { newBalance, transaction } = addCredits(
        creditBalance!,
        pkg.credits,
        pkg.name
      )

      setCreditBalance(newBalance)
      setTransactions([transaction, ...(transactions || [])])
      setShowPurchase(false)

      toast.success(`Successfully added ${formatCredits(pkg.credits)} in credits!`)
    }, 1500)
  }

  const statusMessage = getCreditStatusMessage(creditBalance!)
  const usageBreakdown = getCreditUsageBreakdown(transactions || [])
  const recommendedPkg = getRecommendedPackage(transactions || [])
  const usagePercentage = ((creditBalance?.used || 0) / (creditBalance?.total || 1)) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <Lightning className="w-8 h-8 text-accent" weight="fill" />
          AI Credits Management
        </h2>
        <p className="text-muted-foreground">
          Manage your AI feature credits and usage
        </p>
      </div>

      {/* Balance Card */}
      <Card className="border-2 border-accent/30">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CurrencyDollar className="w-6 h-6 text-accent" weight="duotone" />
              <span className="text-sm text-muted-foreground">Available Balance</span>
            </div>
            <div className="text-5xl font-bold mb-2">
              {formatCredits(creditBalance?.remaining || 0)}
            </div>
            <Badge
              variant="outline"
              className={`${
                statusMessage.severity === 'error'
                  ? 'border-red-500 text-red-700'
                  : statusMessage.severity === 'warning'
                  ? 'border-yellow-500 text-yellow-700'
                  : 'border-green-500 text-green-700'
              }`}
            >
              {statusMessage.message}
            </Badge>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Total: {formatCredits(creditBalance?.total || 0)}</span>
                <span>Used: {formatCredits(creditBalance?.used || 0)}</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
            </div>

            <Button
              onClick={() => setShowPurchase(true)}
              className="w-full mt-6 bg-accent hover:bg-accent/90"
              size="lg"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Add Credits
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Costs */}
      <Card>
        <CardHeader>
          <CardTitle>AI Feature Costs</CardTitle>
          <CardDescription>
            Cost per AI action using your API keys
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-accent" weight="duotone" />
              <span>AI Phone Call</span>
            </div>
            <Badge variant="secondary">$2.00</Badge>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Envelope className="w-5 h-5 text-accent" weight="duotone" />
              <span>AI Email</span>
            </div>
            <Badge variant="secondary">$0.50</Badge>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <ChatCircleDots className="w-5 h-5 text-accent" weight="duotone" />
              <span>AI SMS/Text</span>
            </div>
            <Badge variant="secondary">$0.75</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Usage Breakdown */}
      {Object.keys(usageBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Breakdown</CardTitle>
            <CardDescription>
              Your AI feature usage this month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(usageBreakdown).map(([feature, data]) => (
              <div key={feature} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{getFeatureName(feature as any)}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.count} {data.count === 1 ? 'use' : 'uses'}
                  </p>
                </div>
                <Badge variant="secondary">{formatCredits(data.total)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      {(transactions && transactions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Your latest credit activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {(transactions || []).slice(0, 20).map(transaction => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            transaction.type === 'purchase'
                              ? 'border-green-500 text-green-700'
                              : 'border-blue-500 text-blue-700'
                          }`}
                        >
                          {transaction.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(transaction.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className={`font-bold ${
                      transaction.type === 'purchase' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {transaction.type === 'purchase' ? '+' : '-'}
                      {formatCredits(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Purchase Modal */}
      <AnimatePresence>
        {showPurchase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPurchase(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Purchase AI Credits</CardTitle>
                  <CardDescription>
                    Choose a package to add credits to your account
                  </CardDescription>
                  {recommendedPkg && (
                    <Badge variant="secondary" className="w-fit mt-2">
                      <TrendUp className="w-3 h-3 mr-1" />
                      Recommended: {recommendedPkg.name} based on your usage
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {CREDIT_PACKAGES.map(pkg => (
                      <motion.div
                        key={pkg.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all ${
                            pkg.id === recommendedPkg?.id
                              ? 'border-2 border-accent shadow-lg'
                              : 'hover:border-accent'
                          } ${pkg.popular ? 'relative' : ''}`}
                          onClick={() => handlePurchase(pkg.id)}
                        >
                          {pkg.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <Badge className="bg-accent">Most Popular</Badge>
                            </div>
                          )}
                          <CardContent className="p-6 text-center">
                            <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                            <div className="text-4xl font-bold mb-2">
                              {formatCredits(pkg.credits)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                              in credits
                            </p>
                            {pkg.savings && (
                              <Badge variant="secondary" className="mb-4">
                                {pkg.savings}
                              </Badge>
                            )}
                            <Separator className="my-4" />
                            <div className="text-2xl font-bold mb-4">
                              ${pkg.price.toFixed(2)}
                            </div>
                            <Button className="w-full bg-accent hover:bg-accent/90">
                              <Check className="w-4 h-4 mr-2" weight="bold" />
                              Purchase
                            </Button>

                            <div className="mt-4 text-xs text-muted-foreground">
                              <p className="flex items-center justify-center gap-1">
                                Approx. {Math.floor(pkg.credits / 0.5)} emails
                              </p>
                              <p className="flex items-center justify-center gap-1">
                                or {Math.floor(pkg.credits / 2)} phone calls
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground text-center">
                      💡 Credits never expire • Uses your own API keys • No CEO credits used
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
