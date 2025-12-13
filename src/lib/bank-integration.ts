/**
 * Bank Integration System
 * Connect bank accounts and track financial data
 * Supports Plaid, Stripe, and manual connections
 */

import { logger } from '@/lib/security-utils'

/**
 * Bank Account
 */
export interface BankAccount {
  id: string
  institutionId: string
  institutionName: string
  accountType: 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'mortgage'
  accountName: string
  accountNumber: string // Last 4 digits
  routingNumber?: string
  currency: string
  balance: {
    current: number
    available: number
    limit?: number // For credit cards
  }
  status: 'active' | 'inactive' | 'closed' | 'error'
  connectionType: 'plaid' | 'stripe' | 'manual'
  accessToken?: string
  itemId?: string
  lastSync: string
  autoSync: boolean
  syncFrequency: 'realtime' | 'hourly' | 'daily'
}

/**
 * Transaction
 */
export interface Transaction {
  id: string
  accountId: string
  date: string
  description: string
  merchant?: {
    name: string
    logo?: string
    category: string
  }
  amount: number
  type: 'debit' | 'credit'
  category: string
  subcategory?: string
  pending: boolean
  tags: string[]
  notes?: string
  location?: {
    city: string
    state: string
    country: string
  }
  recurring?: {
    frequency: 'weekly' | 'monthly' | 'yearly'
    nextDate: string
  }
}

/**
 * Financial Insight
 */
export interface FinancialInsight {
  id: string
  type: 'spending' | 'income' | 'savings' | 'investment' | 'alert' | 'opportunity'
  title: string
  description: string
  impact: 'positive' | 'neutral' | 'negative'
  actionable: boolean
  actions?: string[]
  metrics?: Record<string, number>
  timestamp: string
}

/**
 * Budget
 */
export interface Budget {
  id: string
  name: string
  category: string
  amount: number
  period: 'weekly' | 'monthly' | 'yearly'
  spent: number
  remaining: number
  alerts: {
    at50Percent: boolean
    at75Percent: boolean
    at90Percent: boolean
    atLimit: boolean
  }
  startDate: string
  endDate: string
}

/**
 * Plaid Configuration
 */
interface PlaidConfig {
  clientId: string
  secret: string
  env: 'sandbox' | 'development' | 'production'
  products: string[]
  countryCodes: string[]
}

/**
 * Stripe Configuration
 */
interface StripeConfig {
  publishableKey: string
  secretKey: string
  webhookSecret: string
}

/**
 * Bank Integration Manager
 */
export class BankIntegrationManager {
  private accountsKey = 'flowsphere-bank-accounts'
  private transactionsKey = 'flowsphere-transactions'
  private budgetsKey = 'flowsphere-budgets'
  private insightsKey = 'flowsphere-financial-insights'

  // Configuration (in production, store securely on backend)
  private plaidConfig: PlaidConfig | null = null
  private stripeConfig: StripeConfig | null = null

  /**
   * Initialize Plaid integration
   */
  initializePlaid(config: PlaidConfig): void {
    this.plaidConfig = config
  }

  /**
   * Initialize Stripe integration
   */
  initializeStripe(config: StripeConfig): void {
    this.stripeConfig = config
  }

  /**
   * Connect bank account via Plaid Link
   */
  async connectBankAccountPlaid(): Promise<{
    success: boolean
    accounts?: BankAccount[]
    error?: string
  }> {
    // In production, open Plaid Link UI
    // For now, return mock success

    if (!this.plaidConfig) {
      return {
        success: false,
        error: 'Plaid not configured',
      }
    }

    try {
      // This would open Plaid Link in production
      // const linkHandler = Plaid.create({
      //   token: linkToken,
      //   onSuccess: (publicToken, metadata) => {
      //     // Exchange public token for access token
      //     this.exchangePlaidToken(publicToken)
      //   }
      // })

      // Mock account for demonstration
      const mockAccount: BankAccount = {
        id: `account-${Date.now()}`,
        institutionId: 'ins_1',
        institutionName: 'Chase Bank',
        accountType: 'checking',
        accountName: 'Chase Total Checking',
        accountNumber: '****1234',
        currency: 'USD',
        balance: {
          current: 5432.18,
          available: 5432.18,
        },
        status: 'active',
        connectionType: 'plaid',
        lastSync: new Date().toISOString(),
        autoSync: true,
        syncFrequency: 'daily',
      }

      // Save account
      const accounts = this.getAllAccounts()
      accounts.push(mockAccount)
      this.saveAccounts(accounts)

      // Fetch initial transactions
      await this.syncTransactions(mockAccount.id)

      return {
        success: true,
        accounts: [mockAccount],
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  }

  /**
   * Connect Stripe account
   */
  async connectStripeAccount(accountId: string): Promise<{
    success: boolean
    account?: BankAccount
    error?: string
  }> {
    if (!this.stripeConfig) {
      return {
        success: false,
        error: 'Stripe not configured',
      }
    }

    try {
      // In production, use Stripe Connect
      // Mock Stripe account
      const stripeAccount: BankAccount = {
        id: `account-stripe-${Date.now()}`,
        institutionId: 'stripe',
        institutionName: 'Stripe',
        accountType: 'checking',
        accountName: 'Stripe Balance',
        accountNumber: accountId,
        currency: 'USD',
        balance: {
          current: 12847.92,
          available: 10432.5,
        },
        status: 'active',
        connectionType: 'stripe',
        lastSync: new Date().toISOString(),
        autoSync: true,
        syncFrequency: 'realtime',
      }

      const accounts = this.getAllAccounts()
      accounts.push(stripeAccount)
      this.saveAccounts(accounts)

      return {
        success: true,
        account: stripeAccount,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  }

  /**
   * Add manual bank account
   */
  addManualAccount(
    institutionName: string,
    accountType: BankAccount['accountType'],
    accountName: string,
    balance: number
  ): BankAccount {
    const account: BankAccount = {
      id: `account-manual-${Date.now()}`,
      institutionId: 'manual',
      institutionName,
      accountType,
      accountName,
      accountNumber: '****0000',
      currency: 'USD',
      balance: {
        current: balance,
        available: balance,
      },
      status: 'active',
      connectionType: 'manual',
      lastSync: new Date().toISOString(),
      autoSync: false,
      syncFrequency: 'daily',
    }

    const accounts = this.getAllAccounts()
    accounts.push(account)
    this.saveAccounts(accounts)

    return account
  }

  /**
   * Get all bank accounts
   */
  getAllAccounts(): BankAccount[] {
    try {
      const data = localStorage.getItem(this.accountsKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      logger.error('Failed to get bank accounts from storage', error, 'BankIntegration')
      return []
    }
  }

  /**
   * Get account by ID
   */
  getAccount(accountId: string): BankAccount | null {
    return this.getAllAccounts().find(a => a.id === accountId) || null
  }

  /**
   * Update account
   */
  updateAccount(accountId: string, updates: Partial<BankAccount>): BankAccount {
    const accounts = this.getAllAccounts()
    const index = accounts.findIndex(a => a.id === accountId)

    if (index >= 0) {
      accounts[index] = { ...accounts[index], ...updates }
      this.saveAccounts(accounts)
      return accounts[index]
    }

    throw new Error('Account not found')
  }

  /**
   * Delete account
   */
  deleteAccount(accountId: string): void {
    const accounts = this.getAllAccounts().filter(a => a.id !== accountId)
    this.saveAccounts(accounts)

    // Also delete transactions
    const transactions = this.getAllTransactions().filter(t => t.accountId !== accountId)
    this.saveTransactions(transactions)
  }

  /**
   * Sync transactions for account
   */
  async syncTransactions(accountId: string): Promise<Transaction[]> {
    const account = this.getAccount(accountId)
    if (!account) {
      throw new Error('Account not found')
    }

    try {
      // In production, fetch from Plaid/Stripe API
      // For now, generate mock transactions
      const mockTransactions = this.generateMockTransactions(accountId, 30)

      // Merge with existing transactions
      const existing = this.getTransactionsByAccount(accountId)
      const existingIds = new Set(existing.map(t => t.id))
      const newTransactions = mockTransactions.filter(t => !existingIds.has(t.id))

      const allTransactions = this.getAllTransactions()
      allTransactions.push(...newTransactions)
      this.saveTransactions(allTransactions)

      // Update last sync
      this.updateAccount(accountId, {
        lastSync: new Date().toISOString(),
      })

      return newTransactions
    } catch (error) {
      console.error('Sync error:', error)
      throw error
    }
  }

  /**
   * Get all transactions
   */
  getAllTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(this.transactionsKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      logger.error('Failed to get transactions from storage', error, 'BankIntegration')
      return []
    }
  }

  /**
   * Get transactions by account
   */
  getTransactionsByAccount(accountId: string): Transaction[] {
    return this.getAllTransactions().filter(t => t.accountId === accountId)
  }

  /**
   * Get transactions by date range
   */
  getTransactionsByDateRange(startDate: string, endDate: string): Transaction[] {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()

    return this.getAllTransactions().filter(t => {
      const date = new Date(t.date).getTime()
      return date >= start && date <= end
    })
  }

  /**
   * Get transactions by category
   */
  getTransactionsByCategory(category: string): Transaction[] {
    return this.getAllTransactions().filter(t => t.category === category)
  }

  /**
   * Categorize transaction
   */
  categorizeTransaction(
    transactionId: string,
    category: string,
    subcategory?: string
  ): Transaction {
    const transactions = this.getAllTransactions()
    const index = transactions.findIndex(t => t.id === transactionId)

    if (index >= 0) {
      transactions[index].category = category
      if (subcategory) {
        transactions[index].subcategory = subcategory
      }
      this.saveTransactions(transactions)
      return transactions[index]
    }

    throw new Error('Transaction not found')
  }

  /**
   * Add transaction note
   */
  addTransactionNote(transactionId: string, note: string): Transaction {
    const transactions = this.getAllTransactions()
    const transaction = transactions.find(t => t.id === transactionId)

    if (transaction) {
      transaction.notes = note
      this.saveTransactions(transactions)
      return transaction
    }

    throw new Error('Transaction not found')
  }

  /**
   * Tag transaction
   */
  tagTransaction(transactionId: string, tag: string): Transaction {
    const transactions = this.getAllTransactions()
    const transaction = transactions.find(t => t.id === transactionId)

    if (transaction) {
      if (!transaction.tags.includes(tag)) {
        transaction.tags.push(tag)
      }
      this.saveTransactions(transactions)
      return transaction
    }

    throw new Error('Transaction not found')
  }

  /**
   * Get spending by category
   */
  getSpendingByCategory(startDate: string, endDate: string): Record<string, number> {
    const transactions = this.getTransactionsByDateRange(startDate, endDate)
    const spending: Record<string, number> = {}

    transactions
      .filter(t => t.type === 'debit')
      .forEach(t => {
        spending[t.category] = (spending[t.category] || 0) + Math.abs(t.amount)
      })

    return spending
  }

  /**
   * Get income by category
   */
  getIncomeByCategory(startDate: string, endDate: string): Record<string, number> {
    const transactions = this.getTransactionsByDateRange(startDate, endDate)
    const income: Record<string, number> = {}

    transactions
      .filter(t => t.type === 'credit')
      .forEach(t => {
        income[t.category] = (income[t.category] || 0) + t.amount
      })

    return income
  }

  /**
   * Create budget
   */
  createBudget(name: string, category: string, amount: number, period: Budget['period']): Budget {
    const now = new Date()
    let endDate: Date

    switch (period) {
      case 'weekly':
        endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        break
      case 'monthly':
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
        break
      case 'yearly':
        endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        break
    }

    const budget: Budget = {
      id: `budget-${Date.now()}`,
      name,
      category,
      amount,
      period,
      spent: 0,
      remaining: amount,
      alerts: {
        at50Percent: false,
        at75Percent: false,
        at90Percent: false,
        atLimit: false,
      },
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
    }

    const budgets = this.getAllBudgets()
    budgets.push(budget)
    this.saveBudgets(budgets)

    return budget
  }

  /**
   * Get all budgets
   */
  getAllBudgets(): Budget[] {
    try {
      const data = localStorage.getItem(this.budgetsKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      logger.error('Failed to get budgets from storage', error, 'BankIntegration')
      return []
    }
  }

  /**
   * Update budget progress
   */
  updateBudgetProgress(): void {
    const budgets = this.getAllBudgets()

    budgets.forEach(budget => {
      // Calculate spent amount
      const transactions = this.getTransactionsByDateRange(budget.startDate, budget.endDate)
      const spent = transactions
        .filter(t => t.category === budget.category && t.type === 'debit')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      budget.spent = spent
      budget.remaining = budget.amount - spent

      // Update alerts
      const percentage = (spent / budget.amount) * 100
      budget.alerts.at50Percent = percentage >= 50
      budget.alerts.at75Percent = percentage >= 75
      budget.alerts.at90Percent = percentage >= 90
      budget.alerts.atLimit = percentage >= 100
    })

    this.saveBudgets(budgets)
  }

  /**
   * Generate financial insights
   */
  async generateInsights(): Promise<FinancialInsight[]> {
    const insights: FinancialInsight[] = []
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

    // Spending trends
    const thisMonthSpending = this.getSpendingByCategory(thisMonth, thisMonthEnd)
    const lastMonthSpending = this.getSpendingByCategory(lastMonth, thisMonth)

    const totalThisMonth = Object.values(thisMonthSpending).reduce((a, b) => a + b, 0)
    const totalLastMonth = Object.values(lastMonthSpending).reduce((a, b) => a + b, 0)
    const change = totalThisMonth - totalLastMonth

    if (change > 0) {
      insights.push({
        id: `insight-${Date.now()}-1`,
        type: 'spending',
        title: 'Spending Increased',
        description: `Your spending increased by $${change.toFixed(2)} (${((change / totalLastMonth) * 100).toFixed(1)}%) compared to last month`,
        impact: 'negative',
        actionable: true,
        actions: ['Review recent purchases', 'Check budget allocations'],
        metrics: {
          'This Month': totalThisMonth,
          'Last Month': totalLastMonth,
          Change: change,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Recurring transactions
    const recurring = this.getAllTransactions().filter(t => t.recurring)
    const unusedSubscriptions = recurring.filter(t => {
      // Check if similar category has no other transactions
      const categoryTransactions = this.getTransactionsByCategory(t.category)
      return categoryTransactions.length === 1
    })

    if (unusedSubscriptions.length > 0) {
      const savings = unusedSubscriptions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      insights.push({
        id: `insight-${Date.now()}-2`,
        type: 'opportunity',
        title: 'Unused Subscriptions Detected',
        description: `Found ${unusedSubscriptions.length} subscriptions you might not be using. Cancel them to save $${savings.toFixed(2)}/month`,
        impact: 'positive',
        actionable: true,
        actions: unusedSubscriptions.map(t => `Cancel ${t.merchant?.name || t.description}`),
        metrics: {
          'Potential Savings': savings,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Budget alerts
    this.updateBudgetProgress()
    const budgets = this.getAllBudgets()
    const overBudget = budgets.filter(b => b.alerts.atLimit)

    if (overBudget.length > 0) {
      insights.push({
        id: `insight-${Date.now()}-3`,
        type: 'alert',
        title: 'Budget Exceeded',
        description: `${overBudget.length} budgets exceeded this month`,
        impact: 'negative',
        actionable: true,
        actions: overBudget.map(b => `Review ${b.name} budget`),
        timestamp: new Date().toISOString(),
      })
    }

    // Save insights
    const allInsights = this.getAllInsights()
    allInsights.push(...insights)
    if (allInsights.length > 100) allInsights.splice(100)
    localStorage.setItem(this.insightsKey, JSON.stringify(allInsights))

    return insights
  }

  /**
   * Get all insights
   */
  getAllInsights(): FinancialInsight[] {
    try {
      const data = localStorage.getItem(this.insightsKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      logger.error('Failed to get financial insights from storage', error, 'BankIntegration')
      return []
    }
  }

  /**
   * Get total balance across all accounts
   */
  getTotalBalance(): number {
    return this.getAllAccounts()
      .filter(a => a.status === 'active')
      .reduce((sum, a) => sum + a.balance.current, 0)
  }

  /**
   * Get net worth (assets - liabilities)
   */
  getNetWorth(): number {
    const accounts = this.getAllAccounts().filter(a => a.status === 'active')

    const assets = accounts
      .filter(a => ['checking', 'savings', 'investment'].includes(a.accountType))
      .reduce((sum, a) => sum + a.balance.current, 0)

    const liabilities = accounts
      .filter(a => ['credit', 'loan', 'mortgage'].includes(a.accountType))
      .reduce((sum, a) => sum + Math.abs(a.balance.current), 0)

    return assets - liabilities
  }

  // Helper methods

  private saveAccounts(accounts: BankAccount[]): void {
    localStorage.setItem(this.accountsKey, JSON.stringify(accounts))
  }

  private saveTransactions(transactions: Transaction[]): void {
    localStorage.setItem(this.transactionsKey, JSON.stringify(transactions))
  }

  private saveBudgets(budgets: Budget[]): void {
    localStorage.setItem(this.budgetsKey, JSON.stringify(budgets))
  }

  private generateMockTransactions(accountId: string, count: number): Transaction[] {
    const categories = [
      'Food & Dining',
      'Shopping',
      'Transportation',
      'Bills & Utilities',
      'Entertainment',
      'Healthcare',
      'Income',
      'Transfer',
    ]
    const merchants = [
      { name: 'Starbucks', category: 'Food & Dining' },
      { name: 'Amazon', category: 'Shopping' },
      { name: 'Shell Gas Station', category: 'Transportation' },
      { name: 'PG&E', category: 'Bills & Utilities' },
      { name: 'Netflix', category: 'Entertainment' },
      { name: 'CVS Pharmacy', category: 'Healthcare' },
      { name: 'Employer', category: 'Income' },
    ]

    const transactions: Transaction[] = []
    const now = Date.now()

    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(Math.random() * 30)
      const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000)
      const merchant = merchants[Math.floor(Math.random() * merchants.length)]
      const isIncome = merchant.category === 'Income'

      transactions.push({
        id: `tx-${accountId}-${date.getTime()}-${i}`,
        accountId,
        date: date.toISOString(),
        description: merchant.name,
        merchant: {
          name: merchant.name,
          category: merchant.category,
        },
        amount: isIncome ? Math.random() * 3000 + 2000 : -(Math.random() * 100 + 5),
        type: isIncome ? 'credit' : 'debit',
        category: merchant.category,
        pending: Math.random() < 0.1,
        tags: [],
      })
    }

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
}
