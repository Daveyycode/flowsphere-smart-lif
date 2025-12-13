/**
 * FlowSphere Production Logger
 *
 * Comprehensive logging system with error tracing, performance monitoring,
 * and invisible error detection for debugging.
 */

const isDev = import.meta.env.DEV

// Error log storage for debugging
interface ErrorLogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug'
  module: string
  message: string
  stack?: string
  context?: Record<string, unknown>
}

const errorLog: ErrorLogEntry[] = []
const MAX_ERROR_LOG_SIZE = 100

// Performance metrics storage
interface PerformanceMetric {
  operation: string
  startTime: number
  endTime?: number
  duration?: number
}

const performanceMetrics: Map<string, PerformanceMetric> = new Map()

// Helper to format timestamp
const getTimestamp = (): string => {
  return new Date().toISOString()
}

// Helper to extract stack trace
const getStackTrace = (): string => {
  const stack = new Error().stack
  if (!stack) return ''
  // Remove first 3 lines (Error, getStackTrace, and the logger function)
  return stack.split('\n').slice(3).join('\n')
}

// Store error in memory for later retrieval
const storeError = (entry: ErrorLogEntry): void => {
  errorLog.push(entry)
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.shift()
  }
  // Also store in sessionStorage for persistence across refreshes
  try {
    sessionStorage.setItem('flowsphere-error-log', JSON.stringify(errorLog.slice(-50)))
  } catch {
    // Storage might be full or disabled
  }
}

export const logger = {
  log: (message: string, context?: Record<string, unknown>, module = 'App'): void => {
    if (isDev) {
      console.log(`[${getTimestamp()}] [${module}]`, message, context || '')
    }
  },

  warn: (message: string, context?: Record<string, unknown>, module = 'App'): void => {
    const entry: ErrorLogEntry = {
      timestamp: getTimestamp(),
      level: 'warn',
      module,
      message,
      context,
      stack: isDev ? getStackTrace() : undefined,
    }
    storeError(entry)

    if (isDev) {
      console.warn(`[${entry.timestamp}] [WARN] [${module}]`, message, context || '')
    }
  },

  error: (message: string, error?: unknown, module = 'App'): void => {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    const entry: ErrorLogEntry = {
      timestamp: getTimestamp(),
      level: 'error',
      module,
      message,
      stack: errorObj.stack,
      context: {
        errorName: errorObj.name,
        errorMessage: errorObj.message,
        raw: error,
      },
    }
    storeError(entry)

    // Always log errors, even in production
    console.error(`[${entry.timestamp}] [ERROR] [${module}]`, message, error || '')
  },

  info: (message: string, context?: Record<string, unknown>, module = 'App'): void => {
    if (isDev) {
      console.info(`[${getTimestamp()}] [INFO] [${module}]`, message, context || '')
    }
  },

  debug: (message: string, context?: Record<string, unknown>, module = 'App'): void => {
    if (isDev) {
      console.debug(`[${getTimestamp()}] [DEBUG] [${module}]`, message, context || '')
    }
  },

  // For security-sensitive operations - never log in production
  secure: (message: string, module = 'Security'): void => {
    if (isDev) {
      console.log(`[${getTimestamp()}] [SECURE] [${module}]`, message, '[DATA REDACTED]')
    }
  },

  // Trace function execution for invisible errors
  trace: (functionName: string, module = 'App'): void => {
    if (isDev) {
      console.trace(`[${getTimestamp()}] [TRACE] [${module}] ${functionName}`)
    }
  },

  // Group logging for complex operations
  group: (label: string, module = 'App'): void => {
    if (isDev) {
      console.group(`[${getTimestamp()}] [${module}] ${label}`)
    }
  },

  groupEnd: (): void => {
    if (isDev) {
      console.groupEnd()
    }
  },

  // Performance tracking
  startTimer: (operation: string): void => {
    performanceMetrics.set(operation, {
      operation,
      startTime: performance.now(),
    })
    if (isDev) {
      console.time(`[PERF] ${operation}`)
    }
  },

  endTimer: (operation: string): number | null => {
    const metric = performanceMetrics.get(operation)
    if (!metric) return null

    metric.endTime = performance.now()
    metric.duration = metric.endTime - metric.startTime

    if (isDev) {
      console.timeEnd(`[PERF] ${operation}`)
      if (metric.duration > 1000) {
        console.warn(`[PERF] Slow operation: ${operation} took ${metric.duration.toFixed(2)}ms`)
      }
    }

    return metric.duration
  },

  // Memory leak detection helper
  trackMemory: (label: string): void => {
    if (isDev && 'memory' in performance) {
      const memory = (
        performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }
      ).memory
      console.log(`[MEMORY] ${label}:`, {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      })
    }
  },

  // Async operation wrapper with automatic error tracking
  async wrapAsync<T>(operation: string, fn: () => Promise<T>, module = 'App'): Promise<T | null> {
    this.startTimer(operation)
    try {
      const result = await fn()
      this.endTimer(operation)
      return result
    } catch (error) {
      this.endTimer(operation)
      this.error(`Async operation failed: ${operation}`, error, module)
      return null
    }
  },

  // Get stored errors for debugging
  getErrorLog: (): ErrorLogEntry[] => {
    return [...errorLog]
  },

  // Get errors from sessionStorage (survives refresh)
  getPersistedErrors: (): ErrorLogEntry[] => {
    try {
      const stored = sessionStorage.getItem('flowsphere-error-log')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },

  // Clear error log
  clearErrorLog: (): void => {
    errorLog.length = 0
    try {
      sessionStorage.removeItem('flowsphere-error-log')
    } catch {
      // Ignore
    }
  },

  // Export errors for debugging
  exportErrors: (): string => {
    return JSON.stringify(
      {
        timestamp: getTimestamp(),
        errors: errorLog,
        performance: Array.from(performanceMetrics.values()),
      },
      null,
      2
    )
  },

  // Assert helper for catching logic errors
  assert: (condition: boolean, message: string, module = 'App'): void => {
    if (!condition) {
      const entry: ErrorLogEntry = {
        timestamp: getTimestamp(),
        level: 'error',
        module,
        message: `Assertion failed: ${message}`,
        stack: getStackTrace(),
      }
      storeError(entry)

      if (isDev) {
        console.error(`[ASSERT FAILED] [${module}]`, message)
        console.trace()
      }
    }
  },

  // Deprecation warnings
  deprecated: (feature: string, alternative: string, module = 'App'): void => {
    if (isDev) {
      console.warn(
        `[DEPRECATED] [${module}] "${feature}" is deprecated. Use "${alternative}" instead.`
      )
    }
  },
}

// Global error handler for uncaught errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', event => {
    logger.error('Uncaught error', event.error, 'GlobalHandler')
  })

  window.addEventListener('unhandledrejection', event => {
    logger.error('Unhandled promise rejection', event.reason, 'GlobalHandler')
  })
}

// Expose logger to window for debugging in console
if (isDev && typeof window !== 'undefined') {
  ;(window as unknown as { __flowsphere_logger: typeof logger }).___flowsphere_logger = logger
}

export default logger
