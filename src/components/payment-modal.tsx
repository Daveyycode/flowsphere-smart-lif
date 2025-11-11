import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card } from '@/components/ui/card'
import { CreditCard, Lock, Check } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useKV } from '@github/spark/hooks'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  planName: string
  planPrice: number
  billingCycle: 'monthly' | 'annual'
  onPaymentComplete: () => void
}

export function PaymentModal({
  isOpen,
  onClose,
  planName,
  planPrice,
  billingCycle,
  onPaymentComplete
}: PaymentModalProps) {
  const [step, setStep] = useState<'payment' | 'processing' | 'success'>('payment')
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [cvv, setCvv] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'apple'>('card')
  const [, setStoredPaymentMethod] = useKV<{type: 'card' | 'paypal' | 'apple', last4?: string}>('flowsphere-payment-method', {type: 'card'})
  const [, setNextBillingDate] = useKV<string>('flowsphere-next-billing', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const chunks = cleaned.match(/.{1,4}/g)
    return chunks ? chunks.join(' ') : cleaned
  }

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4)
    }
    return cleaned
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '')
    if (value.length <= 16 && /^\d*$/.test(value)) {
      setCardNumber(formatCardNumber(value))
    }
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 4) {
      setExpiryDate(formatExpiryDate(value))
    }
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setCvv(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (paymentMethod === 'card') {
      if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
        toast.error('Please enter a valid card number')
        return
      }
      if (!cardName) {
        toast.error('Please enter the cardholder name')
        return
      }
      if (!expiryDate || expiryDate.length !== 5) {
        toast.error('Please enter a valid expiry date')
        return
      }
      if (!cvv || cvv.length < 3) {
        toast.error('Please enter a valid CVV')
        return
      }
    }

    setStep('processing')

    setTimeout(() => {
      const last4 = paymentMethod === 'card' ? cardNumber.replace(/\s/g, '').slice(-4) : undefined
      setStoredPaymentMethod({ type: paymentMethod, last4 })
      
      const nextBilling = billingCycle === 'monthly' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      setNextBillingDate(nextBilling.toISOString())
      
      setStep('success')
      setTimeout(() => {
        onPaymentComplete()
        onClose()
        resetForm()
      }, 2000)
    }, 2000)
  }

  const resetForm = () => {
    setStep('payment')
    setCardNumber('')
    setCardName('')
    setExpiryDate('')
    setCvv('')
    setPaymentMethod('card')
  }

  const handleClose = () => {
    if (step !== 'processing') {
      onClose()
      setTimeout(resetForm, 300)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl">Complete Your Purchase</DialogTitle>
                <DialogDescription className="text-sm">
                  Subscribe to FlowSphere {planName} - ${planPrice}/{billingCycle === 'monthly' ? 'month' : 'year'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                <div className="space-y-4">
                  <Label className="text-sm font-semibold">Payment Method</Label>
                  <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'card' | 'paypal' | 'apple')}>
                    <Card className={`p-4 cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-primary border-2' : 'border'}`}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <RadioGroupItem value="card" id="card" />
                        <CreditCard className="w-5 h-5 text-primary" weight="duotone" />
                        <span className="text-sm font-medium">Credit / Debit Card</span>
                      </label>
                    </Card>
                    <Card className={`p-4 cursor-pointer transition-all ${paymentMethod === 'paypal' ? 'border-primary border-2' : 'border'}`}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <RadioGroupItem value="paypal" id="paypal" />
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">P</div>
                        <span className="text-sm font-medium">PayPal</span>
                      </label>
                    </Card>
                    <Card className={`p-4 cursor-pointer transition-all ${paymentMethod === 'apple' ? 'border-primary border-2' : 'border'}`}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <RadioGroupItem value="apple" id="apple" />
                        <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold"></div>
                        <span className="text-sm font-medium">Apple Pay</span>
                      </label>
                    </Card>
                  </RadioGroup>
                </div>

                {paymentMethod === 'card' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="cardNumber" className="text-sm">Card Number</Label>
                      <Input
                        id="cardNumber"
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="mt-1.5 text-base"
                        maxLength={19}
                      />
                    </div>

                    <div>
                      <Label htmlFor="cardName" className="text-sm">Cardholder Name</Label>
                      <Input
                        id="cardName"
                        type="text"
                        placeholder="John Doe"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="mt-1.5 text-base"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate" className="text-sm">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          type="text"
                          placeholder="MM/YY"
                          value={expiryDate}
                          onChange={handleExpiryChange}
                          className="mt-1.5 text-base"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv" className="text-sm">CVV</Label>
                        <Input
                          id="cvv"
                          type="text"
                          placeholder="123"
                          value={cvv}
                          onChange={handleCvvChange}
                          className="mt-1.5 text-base"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {paymentMethod === 'paypal' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-6 bg-muted/50 rounded-lg text-center"
                  >
                    <p className="text-sm text-muted-foreground">
                      You will be redirected to PayPal to complete your payment securely.
                    </p>
                  </motion.div>
                )}

                {paymentMethod === 'apple' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-6 bg-muted/50 rounded-lg text-center"
                  >
                    <p className="text-sm text-muted-foreground">
                      Apple Pay checkout will open in a secure window.
                    </p>
                  </motion.div>
                )}

                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium">{planName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Billing</span>
                    <span className="font-medium capitalize">{billingCycle}</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">${planPrice}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>Secured by 256-bit SSL encryption</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-accent hover:bg-accent/90"
                  >
                    Pay ${planPrice}
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  By completing this purchase, you agree to our Terms of Service and Privacy Policy.
                  14-day money-back guarantee.
                </p>
              </form>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-12 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <CreditCard className="w-8 h-8 text-accent" weight="duotone" />
                </motion.div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Processing Payment...</h3>
              <p className="text-sm text-muted-foreground">Please wait while we process your payment securely</p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-mint/20 flex items-center justify-center"
              >
                <Check className="w-8 h-8 text-mint" weight="bold" />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
              <p className="text-sm text-muted-foreground">Welcome to FlowSphere {planName}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
