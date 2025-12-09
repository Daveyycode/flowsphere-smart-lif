/**
 * CEO Authentication System
 * Dynamic 6-digit username generation and security monitoring
 */

import { toast } from 'sonner'
import { logger } from '@/lib/security-utils'

export interface CEOCredentials {
  username: string // 6-digit code
  password: string
  lastRotation: string
  deviceId: string // Phone device ID
}

export interface LoginAttempt {
  id: string
  timestamp: string
  username: string
  success: boolean
  method: 'qr' | 'manual'
  ipAddress: string
  deviceInfo: string
  location?: string
  failureReason?: string
}

export interface APIKey {
  id: string
  name: string
  key: string
  service: 'ai-monitoring' | 'reporting' | 'alerts' | 'analytics'
  createdAt: string
  lastUsed?: string
  enabled: boolean
}

/**
 * Generate a 6-digit username code using crypto.getRandomValues
 */
export function generateUsername(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (100000 + (array[0] % 900000)).toString()
}

/**
 * Generate a secure API key using crypto.getRandomValues
 */
export function generateAPIKey(): string {
  const prefix = 'fsk' // FlowSphere Key
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = prefix + '_'

  const randomValues = new Uint32Array(32)
  crypto.getRandomValues(randomValues)

  for (let i = 0; i < 32; i++) {
    key += chars.charAt(randomValues[i] % chars.length)
  }

  return key
}

/**
 * Create login attempt record
 */
export function createLoginAttempt(
  username: string,
  success: boolean,
  method: 'qr' | 'manual',
  failureReason?: string
): LoginAttempt {
  return {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    username,
    success,
    method,
    ipAddress: '192.168.1.1', // In production, get real IP
    deviceInfo: navigator.userAgent,
    location: 'Philippines', // In production, use geolocation API
    failureReason
  }
}

/**
 * Generate QR code data for login
 */
export function generateLoginQRData(username: string): string {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).substring(7)

  // Format: flowsphere://ceo-login?u=123456&t=timestamp&n=nonce
  return `flowsphere://ceo-login?u=${username}&t=${timestamp}&n=${nonce}`
}

/**
 * Validate QR login data
 */
export function validateQRLogin(qrData: string, expectedUsername: string): boolean {
  try {
    const url = new URL(qrData)

    if (url.protocol !== 'flowsphere:' || url.pathname !== '//ceo-login') {
      return false
    }

    const username = url.searchParams.get('u')
    const timestamp = url.searchParams.get('t')

    if (!username || !timestamp) {
      return false
    }

    // Check if username matches
    if (username !== expectedUsername) {
      return false
    }

    // Check if QR is not expired (5 minutes)
    const qrAge = Date.now() - parseInt(timestamp)
    if (qrAge > 5 * 60 * 1000) {
      return false
    }

    return true
  } catch (error) {
    logger.debug('QR code validation failed', error)
    return false
  }
}

/**
 * Report login attempt to AI monitoring
 */
export async function reportToAI(
  attempt: LoginAttempt,
  apiKey: string
): Promise<void> {
  // In production, send to actual AI service
  logger.debug('Reporting to AI', { attemptId: attempt.id, success: attempt.success })

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500))

  // AI analysis
  if (!attempt.success) {
    if (attempt.username.length !== 6) {
      toast.warning('🤖 AI Alert: Invalid username format detected')
    } else {
      toast.warning('🤖 AI Alert: Failed login attempt logged')
    }
  }
}

/**
 * Check if credentials need rotation
 */
export function needsRotation(lastRotation: string): boolean {
  // Rotate on every login/logout (as per requirements)
  return true
}

/**
 * Rotate CEO username
 */
export function rotateUsername(currentCredentials: CEOCredentials): CEOCredentials {
  return {
    ...currentCredentials,
    username: generateUsername(),
    lastRotation: new Date().toISOString()
  }
}

/**
 * Hash password using SHA-256 (async)
 * Note: For production, CEO auth uses server-side Edge Function
 */
export async function hashPasswordAsync(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash password (sync version for backwards compatibility)
 * @deprecated Use hashPasswordAsync for secure hashing
 */
export function hashPassword(password: string): string {
  // Simple hash for backwards compatibility - real auth uses Edge Function
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

/**
 * Verify password
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword
}

/**
 * Get device fingerprint
 */
export function getDeviceFingerprint(): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('FlowSphere', 2, 2)
  }

  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas: canvas.toDataURL()
  }

  return btoa(JSON.stringify(fingerprint)).substring(0, 16)
}
