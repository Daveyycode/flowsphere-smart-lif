/**
 * FlowSphere Security Utilities
 *
 * Comprehensive security layer for production-ready app
 * - XSS Prevention with DOMPurify
 * - Input Sanitization
 * - Production Logger
 * - Environment Detection
 * - Rate Limiting Helpers
 */

import DOMPurify from 'dompurify'

// ============================================
// ENVIRONMENT DETECTION
// ============================================

export const isDevelopment = import.meta.env.DEV
export const isProduction = import.meta.env.PROD
export const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0'

/**
 * Check if running in demo/development mode
 * PRODUCTION: Always returns false - no demo mode allowed
 */
export function isDemoMode(): boolean {
  return false // PRODUCTION: Demo mode disabled
}

/**
 * Set demo mode - DISABLED IN PRODUCTION
 */
export function setDemoMode(_enabled: boolean): void {
  // PRODUCTION: Demo mode disabled - no-op
  console.warn('[SECURITY] Demo mode is disabled in production')
}

// ============================================
// XSS PREVENTION - DOMPurify Wrapper
// ============================================

/**
 * Sanitize HTML content to prevent XSS attacks
 * Use this BEFORE any dangerouslySetInnerHTML
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'style'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  })
}

/**
 * Sanitize and convert newlines to <br/> tags
 */
export function sanitizeWithBreaks(text: string): string {
  const sanitized = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
  return sanitized.replace(/\n/g, '<br/>')
}

/**
 * Strip all HTML tags - plain text only
 */
export function stripHTML(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] })
}

/**
 * Sanitize URL to prevent javascript: protocol attacks
 */
export function sanitizeURL(url: string): string {
  try {
    const parsed = new URL(url)
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
      return url
    }
    return '#'
  } catch {
    // If it's a relative URL, allow it
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return url
    }
    return '#'
  }
}

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize user input for forms
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._+-]/g, '')
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+\-() ]/g, '')
}

/**
 * Sanitize username (alphanumeric and underscore only)
 */
export function sanitizeUsername(username: string): string {
  return username.trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 50)
}

/**
 * Validate and sanitize OTP code
 */
export function sanitizeOTP(code: string): string {
  return code.replace(/\D/g, '').slice(0, 6)
}

// ============================================
// PRODUCTION LOGGER
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: string
  component?: string
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

// Only log warn and above in production
const MIN_LOG_LEVEL: LogLevel = isProduction ? 'warn' : 'debug'

/**
 * Production-safe logger
 * - In development: logs everything to console
 * - In production: only logs warnings and errors
 */
export const logger = {
  debug(message: string, data?: unknown, component?: string) {
    logMessage('debug', message, data, component)
  },

  info(message: string, data?: unknown, component?: string) {
    logMessage('info', message, data, component)
  },

  warn(message: string, data?: unknown, component?: string) {
    logMessage('warn', message, data, component)
  },

  error(message: string, data?: unknown, component?: string) {
    logMessage('error', message, data, component)
    // In production, could send to error tracking service
    if (isProduction) {
      // TODO: Send to Sentry/LogRocket/etc
      // sendToErrorTracking({ level: 'error', message, data, component })
    }
  }
}

function logMessage(level: LogLevel, message: string, data?: unknown, component?: string) {
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LOG_LEVEL]) {
    return
  }

  const entry: LogEntry = {
    level,
    message,
    data,
    timestamp: new Date().toISOString(),
    component
  }

  const prefix = component ? `[${component}]` : '[FlowSphere]'

  switch (level) {
    case 'debug':
      console.debug(`${prefix} ${message}`, data || '')
      break
    case 'info':
      console.info(`${prefix} ${message}`, data || '')
      break
    case 'warn':
      console.warn(`${prefix} ${message}`, data || '')
      break
    case 'error':
      console.error(`${prefix} ${message}`, data || '')
      break
  }

  // Store last 100 errors in localStorage for debugging
  if (level === 'error') {
    try {
      const errors = JSON.parse(localStorage.getItem('flowsphere_error_log') || '[]')
      errors.unshift(entry)
      localStorage.setItem('flowsphere_error_log', JSON.stringify(errors.slice(0, 100)))
    } catch {
      // Ignore localStorage errors
    }
  }
}

/**
 * Get stored error logs (for debugging)
 */
export function getErrorLogs(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem('flowsphere_error_log') || '[]')
  } catch {
    return []
  }
}

/**
 * Clear error logs
 */
export function clearErrorLogs(): void {
  localStorage.removeItem('flowsphere_error_log')
}

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const rateLimitCache = new Map<string, { count: number; resetAt: number }>()

/**
 * Client-side rate limiting helper
 */
export function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const cached = rateLimitCache.get(key)

  if (!cached || now > cached.resetAt) {
    rateLimitCache.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs }
  }

  if (cached.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: cached.resetAt - now }
  }

  cached.count++
  return { allowed: true, remaining: config.maxRequests - cached.count, resetIn: cached.resetAt - now }
}

// ============================================
// API KEY SECURITY
// ============================================

/**
 * Check if sensitive API keys are exposed in frontend
 * Returns warnings for any issues found
 */
export function checkAPIKeySecurity(): string[] {
  const warnings: string[] = []

  // Check for exposed secrets
  const sensitiveEnvVars = [
    'VITE_GOOGLE_CLIENT_SECRET',
    'VITE_OUTLOOK_CLIENT_SECRET',
    'VITE_APPLE_CLIENT_SECRET'
  ]

  sensitiveEnvVars.forEach(varName => {
    const value = import.meta.env[varName]
    if (value && value !== '' && !value.includes('your_') && !value.includes('add_when_ready')) {
      warnings.push(`WARNING: ${varName} is exposed in frontend. Move to server-side.`)
    }
  })

  // Log warnings in development
  if (isDevelopment && warnings.length > 0) {
    console.warn('=== API KEY SECURITY WARNINGS ===')
    warnings.forEach(w => console.warn(w))
  }

  return warnings
}

// ============================================
// SECURE STORAGE HELPERS
// ============================================

/**
 * Store data with encryption marker
 * Note: For truly sensitive data, use proper encryption
 */
export function secureStore(key: string, value: unknown): void {
  try {
    const data = JSON.stringify({
      value,
      timestamp: Date.now(),
      version: appVersion
    })
    localStorage.setItem(`flowsphere_secure_${key}`, btoa(data))
  } catch (error) {
    logger.error('Failed to store secure data', error, 'SecureStorage')
  }
}

/**
 * Retrieve securely stored data
 */
export function secureRetrieve<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(`flowsphere_secure_${key}`)
    if (!stored) return null
    const data = JSON.parse(atob(stored))
    return data.value as T
  } catch (error) {
    logger.error('Failed to retrieve secure data', error, 'SecureStorage')
    return null
  }
}

/**
 * Remove securely stored data
 */
export function secureRemove(key: string): void {
  localStorage.removeItem(`flowsphere_secure_${key}`)
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize security utilities
 * Call this once on app startup
 */
export function initializeSecurity(): void {
  // Check for API key issues
  const warnings = checkAPIKeySecurity()

  // Log app start
  logger.info(`FlowSphere v${appVersion} starting`, {
    mode: isDevelopment ? 'development' : 'production',
    demoMode: isDemoMode(),
    securityWarnings: warnings.length
  }, 'Security')
}

export default {
  // Environment
  isDevelopment,
  isProduction,
  isDemoMode,
  setDemoMode,

  // XSS Prevention
  sanitizeHTML,
  sanitizeWithBreaks,
  stripHTML,
  sanitizeURL,

  // Input Sanitization
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUsername,
  sanitizeOTP,

  // Logger
  logger,
  getErrorLogs,
  clearErrorLogs,

  // Rate Limiting
  checkRateLimit,

  // Security
  checkAPIKeySecurity,
  secureStore,
  secureRetrieve,
  secureRemove,

  // Init
  initializeSecurity
}
