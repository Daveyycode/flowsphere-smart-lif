import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CurrencyDollar, TrendUp, TrendDown, Plus, Trash, Warning,
  ShoppingCart, House, Car, ForkKnife, Lightning, CreditCard, Sparkle
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

interface Transaction {
  id: string
  amount: number
  category: string
  description: string
  date: string
  type: 'income' | 'expense'
}

interface Bill {
  id: string
  name: string
  amount: number
  dueDate: number
  category: string
  isPaid: boolean
  isRecurring: boolean
}

interface Budget {
  category: string
  limit: number
  spent: number
}

const EXPENSE_CATEGORIES = [
  { name: 'Food', icon: ForkKnife, color: 'text-orange-500' },
  { name: 'Housing', icon: House, color: 'text-blue-500' },
  { name: 'Transportation', icon: Car, color: 'text-purple-500' },
  { name: 'Utilities', icon: Lightning, color: 'text-yellow-500' },
  { name: 'Shopping', icon: ShoppingCart, color: 'text-pink-500' },
  { name: 'Subscriptions', icon: CreditCard, color: 'text-indigo-500' },
  { name: 'Other', icon: CurrencyDollar, color: 'text-gray-500' },
]

export function BudgetTracker() {
  const [transactions, setTransactions] = useKV<Transaction[]>('flowsphere-transactions', [])
  const [bills, setBills] = useKV<Bill[]>('flowsphere-bills', [])
  const [budgets, setBudgets] = useKV<Budget[]>('flowsphere-budgets', [])
  
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [showBillDialog, setShowBillDialog] = useState(false)
  
  const [txAmount, setTxAmount] = useState('')
  const [txCategory, setTxCategory] = useState('Food')
  const [txDescription, setTxDescription] = useState('')
  const [txType, setTxType] = useState<'income' | 'expense'>('expense')
  
  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [billDueDate, setBillDueDate] = useState('1')
  const [billCategory, setBillCategory] = useState('Utilities')
  const [billRecurring, setBillRecurring] = useState(true)

  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  
  const monthlyTransactions = (transactions || []).filter(tx => {
    const txDate = new Date(tx.date)
    return txDate.getMonth() === thisMonth && txDate.getFullYear() === thisYear
  })

  const totalIncome = monthlyTransactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const totalExpenses = monthlyTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const balance = totalIncome - totalExpenses

  const upcomingBills = (bills || []).filter(bill => !bill.isPaid)
  const totalBillsDue = upcomingBills.reduce((sum, bill) => sum + bill.amount, 0)

  const addTransaction = () => {
    const amount = parseFloat(txAmount)
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
      amount,
      category: txType === 'income' ? 'Income' : txCategory,
      description: txDescription || (txType === 'income' ? 'Income' : txCategory),
      date: new Date().toISOString(),
      type: txType,
    }

    setTransactions((current) => [transaction, ...(current || [])])
    
    if (txType === 'expense') {
      updateBudgetSpending(txCategory, amount)
    }

    toast.success(`${txType === 'income' ? 'Income' : 'Expense'} added!`)
    setShowTransactionDialog(false)
    setTxAmount('')
    setTxDescription('')
  }

  const addBill = () => {
    const amount = parseFloat(billAmount)
    if (!amount || amount <= 0 || !billName) {
      toast.error('Please fill all fields correctly')
      return
    }

    const bill: Bill = {
      id: Date.now().toString(),
      name: billName,
      amount,
      dueDate: parseInt(billDueDate),
      category: billCategory,
      isPaid: false,
      isRecurring: billRecurring,
    }

    setBills((current) => [bill, ...(current || [])])
    toast.success('Bill added!')
    setShowBillDialog(false)
    setBillName('')
    setBillAmount('')
  }

  const toggleBillPaid = (id: string) => {
    setBills((current) =>
      (current || []).map(bill =>
        bill.id === id ? { ...bill, isPaid: !bill.isPaid } : bill
      )
    )
    toast.success('Bill status updated')
  }

  const deleteBill = (id: string) => {
    setBills((current) => (current || []).filter(bill => bill.id !== id))
    toast.success('Bill deleted')
  }

  const updateBudgetSpending = (category: string, amount: number) => {
    setBudgets((current) => {
      const existing = (current || []).find(b => b.category === category)
      if (existing) {
        return (current || []).map(b =>
          b.category === category
            ? { ...b, spent: b.spent + amount }
            : b
        )
      }
      return current || []
    })
  }

  const getCategoryIcon = (categoryName: string) => {
    const category = EXPENSE_CATEGORIES.find(c => c.name === categoryName)
    return category ? category.icon : CurrencyDollar
  }

  const getCategoryColor = (categoryName: string) => {
    const category = EXPENSE_CATEGORIES.find(c => c.name === categoryName)
    return category ? category.color : 'text-gray-500'
  }

  const spendingByCategory = EXPENSE_CATEGORIES.map(cat => {
    const spent = monthlyTransactions
      .filter(tx => tx.type === 'expense' && tx.category === cat.name)
      .reduce((sum, tx) => sum + tx.amount, 0)
    return { ...cat, spent }
  }).filter(cat => cat.spent > 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-heading">
            Budget Tracker
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            All your expenses and subscriptions in one dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowTransactionDialog(true)} className="gap-2">
            <Plus />
            Add Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendUp className="w-5 h-5 text-green-600" />
              <p className="text-xs text-green-700 dark:text-green-300">Income (This Month)</p>
            </div>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">
              ${totalIncome.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendDown className="w-5 h-5 text-red-600" />
              <p className="text-xs text-red-700 dark:text-red-300">Expenses (This Month)</p>
            </div>
            <p className="text-2xl font-bold text-red-800 dark:text-red-200">
              ${totalExpenses.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${
          balance >= 0 
            ? 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900' 
            : 'from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CurrencyDollar className={`w-5 h-5 ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              <p className={`text-xs ${balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                Balance
              </p>
            </div>
            <p className={`text-2xl font-bold ${
              balance >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-orange-800 dark:text-orange-200'
            }`}>
              ${Math.abs(balance).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Warning className="w-5 h-5 text-purple-600" />
              <p className="text-xs text-purple-700 dark:text-purple-300">Bills Due</p>
            </div>
            <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
              ${totalBillsDue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Upcoming Bills</CardTitle>
              <Button onClick={() => setShowBillDialog(true)} size="sm" variant="outline" className="gap-1">
                <Plus className="w-4 h-4" />
                Add Bill
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingBills.length > 0 ? (
              <div className="space-y-2">
                {upcomingBills.slice(0, 5).map((bill) => {
                  const Icon = getCategoryIcon(bill.category)
                  const colorClass = getCategoryColor(bill.category)
                  return (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${colorClass}`} />
                        <div>
                          <p className="font-medium text-sm">{bill.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: Day {bill.dueDate} of month
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">${bill.amount}</p>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleBillPaid(bill.id)}
                            className="h-8 px-2"
                          >
                            Pay
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteBill(bill.id)}
                            className="h-8 px-2"
                          >
                            <Trash className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No upcoming bills</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {spendingByCategory.length > 0 ? (
              <div className="space-y-3">
                {spendingByCategory.map((cat) => {
                  const Icon = cat.icon
                  const percentage = totalExpenses > 0 ? (cat.spent / totalExpenses) * 100 : 0
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${cat.color}`} />
                          <span className="text-sm font-medium">{cat.name}</span>
                        </div>
                        <span className="text-sm font-semibold">${cat.spent.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={percentage} className="flex-1 h-2" />
                        <span className="text-xs text-muted-foreground w-12">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No expenses this month</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyTransactions.length > 0 ? (
            <div className="space-y-2">
              {monthlyTransactions.slice(0, 10).map((tx) => {
                const Icon = tx.type === 'income' ? TrendUp : getCategoryIcon(tx.category)
                const colorClass = tx.type === 'income' ? 'text-green-500' : getCategoryColor(tx.category)
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${colorClass}`} />
                      <div>
                        <p className="font-medium text-sm">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className={`font-semibold ${
                      tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CurrencyDollar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  type="button"
                  variant={txType === 'expense' ? 'default' : 'outline'}
                  onClick={() => setTxType('expense')}
                  className="w-full"
                >
                  Expense
                </Button>
                <Button
                  type="button"
                  variant={txType === 'income' ? 'default' : 'outline'}
                  onClick={() => setTxType('income')}
                  className="w-full"
                >
                  Income
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
              />
            </div>

            {txType === 'expense' && (
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={txCategory} onValueChange={setTxCategory}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.name} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="What's this for?"
                value={txDescription}
                onChange={(e) => setTxDescription(e.target.value)}
              />
            </div>

            <Button onClick={addTransaction} className="w-full">
              Add Transaction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bill-name">Bill Name</Label>
              <Input
                id="bill-name"
                placeholder="e.g., Netflix Subscription"
                value={billName}
                onChange={(e) => setBillName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="bill-amount">Amount</Label>
              <Input
                id="bill-amount"
                type="number"
                placeholder="0.00"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="bill-category">Category</Label>
              <Select value={billCategory} onValueChange={setBillCategory}>
                <SelectTrigger id="bill-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bill-due">Due Date (Day of Month)</Label>
              <Input
                id="bill-due"
                type="number"
                min="1"
                max="31"
                value={billDueDate}
                onChange={(e) => setBillDueDate(e.target.value)}
              />
            </div>

            <Button onClick={addBill} className="w-full">
              Add Bill
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
