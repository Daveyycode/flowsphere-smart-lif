/**
 * Account Security Monitoring
 * Detects suspicious logins and unauthorized access across multiple platforms
 */

export interface UserAccount {
  id: string
  type: 'gmail' | 'yahoo' | 'icloud' | 'phone' | 'microsoft' | 'social' | 'banking' | 'other'
  email?: string
  phone?: string
  accountName: string
  lastKnownLocation: {
    ip: string
    city: string
    country: string
    latitude: number
    longitude: number
  }
  lastKnownDevice: {
    type: 'desktop' | 'mobile' | 'tablet' | 'unknown'
    browser: string
    os: string
    deviceName: string
  }
  lastLogin: string
  twoFactorEnabled: boolean
}

export interface LoginActivity {
  id: string
  accountId: string
  accountType: string
  accountName: string
  timestamp: string
  location: {
    ip: string
    city: string
    country: string
    latitude: number
    longitude: number
  }
  device: {
    type: 'desktop' | 'mobile' | 'tablet' | 'unknown'
    browser: string
    os: string
    deviceName: string
  }
  success: boolean
  suspicious: boolean
  suspicionReasons: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface SecurityAlert {
  id: string
  accountId: string
  accountName: string
  accountType: string
  alertType: 'suspicious-login' | 'new-location' | 'new-device' | 'failed-attempts' | 'password-change' | 'unusual-activity'
  severity: 'info' | 'warning' | 'critical'
  timestamp: string
  title: string
  message: string
  details: {
    location?: string
    device?: string
    ip?: string
    attemptCount?: number
  }
  actionable: boolean
  actions: Array<{
    label: string
    type: 'secure-account' | 'verify-login' | 'change-password' | 'enable-2fa' | 'dismiss'
  }>
}

/**
 * Monitor account for suspicious activity
 */
export function monitorAccountSecurity(
  accounts: UserAccount[],
  recentLogins: LoginActivity[],
  onAlert: (alert: SecurityAlert) => void
): void {
  accounts.forEach(account => {
    // Get recent logins for this account
    const accountLogins = recentLogins.filter(login => login.accountId === account.id)

    accountLogins.forEach(login => {
      // Check for suspicious activity
      const suspicionReasons: string[] = []
      let riskLevel: LoginActivity['riskLevel'] = 'low'

      // Check location
      if (login.location.country !== account.lastKnownLocation.country) {
        suspicionReasons.push(`Login from ${login.location.country} (different country)`)
        riskLevel = 'high'
      } else if (login.location.city !== account.lastKnownLocation.city) {
        const distance = calculateDistance(
          login.location.latitude,
          login.location.longitude,
          account.lastKnownLocation.latitude,
          account.lastKnownLocation.longitude
        )

        if (distance > 100) { // >100km away
          suspicionReasons.push(`Login from ${login.location.city} (${Math.round(distance)}km away)`)
          riskLevel = riskLevel === 'high' ? 'high' : 'medium'
        }
      }

      // Check device
      if (login.device.type !== account.lastKnownDevice.type) {
        suspicionReasons.push(`Login from new device type: ${login.device.type}`)
        riskLevel = riskLevel === 'high' ? 'high' : 'medium'
      }

      if (login.device.os !== account.lastKnownDevice.os) {
        suspicionReasons.push(`Login from different OS: ${login.device.os}`)
        riskLevel = riskLevel === 'high' ? 'high' : 'medium'
      }

      // Check time pattern
      const timeSinceLastLogin = new Date(login.timestamp).getTime() - new Date(account.lastLogin).getTime()
      const hoursSinceLastLogin = timeSinceLastLogin / (1000 * 60 * 60)

      // Rapid logins from different locations suggest credential theft
      if (hoursSinceLastLogin < 1 && suspicionReasons.length > 0) {
        suspicionReasons.push('Multiple rapid logins from different locations')
        riskLevel = 'critical'
      }

      // Check if 2FA is disabled (higher risk)
      if (!account.twoFactorEnabled && suspicionReasons.length > 0) {
        suspicionReasons.push('Account lacks two-factor authentication')
        if (riskLevel !== 'critical') {
          riskLevel = riskLevel === 'high' ? 'high' : 'medium'
        }
      }

      // Generate alert if suspicious
      if (suspicionReasons.length > 0) {
        const alert: SecurityAlert = {
          id: `security-${login.id}`,
          accountId: account.id,
          accountName: account.accountName,
          accountType: account.type,
          alertType: 'suspicious-login',
          severity: riskLevel === 'critical' || riskLevel === 'high' ? 'critical' : 'warning',
          timestamp: login.timestamp,
          title: riskLevel === 'critical'
            ? `🚨 CRITICAL: Suspicious login to ${account.accountName}`
            : `⚠️ Suspicious login detected - ${account.accountName}`,
          message: `Login from ${login.location.city}, ${login.location.country} using ${login.device.type}. ${suspicionReasons.join('. ')}.`,
          details: {
            location: `${login.location.city}, ${login.location.country}`,
            device: `${login.device.type} - ${login.device.os}`,
            ip: login.location.ip
          },
          actionable: true,
          actions: [
            { label: 'Secure Account', type: 'secure-account' },
            { label: 'Was This You?', type: 'verify-login' },
            { label: 'Change Password', type: 'change-password' },
            { label: 'Enable 2FA', type: 'enable-2fa' },
            { label: 'Dismiss', type: 'dismiss' }
          ]
        }

        onAlert(alert)
      }
    })

    // Check for failed login attempts
    const failedLogins = accountLogins.filter(login => !login.success)
    if (failedLogins.length >= 3) {
      const alert: SecurityAlert = {
        id: `failed-${account.id}`,
        accountId: account.id,
        accountName: account.accountName,
        accountType: account.type,
        alertType: 'failed-attempts',
        severity: 'warning',
        timestamp: new Date().toISOString(),
        title: `⚠️ Multiple failed login attempts - ${account.accountName}`,
        message: `${failedLogins.length} failed login attempts detected on your ${account.type} account. This may indicate someone is trying to access your account.`,
        details: {
          attemptCount: failedLogins.length,
          location: failedLogins[failedLogins.length - 1]?.location.city
        },
        actionable: true,
        actions: [
          { label: 'Change Password', type: 'change-password' },
          { label: 'Enable 2FA', type: 'enable-2fa' },
          { label: 'Dismiss', type: 'dismiss' }
        ]
      }

      onAlert(alert)
    }
  })
}

/**
 * Check if login is from usual location
 */
export function isUsualLocation(
  newLogin: LoginActivity,
  account: UserAccount
): boolean {
  const distance = calculateDistance(
    newLogin.location.latitude,
    newLogin.location.longitude,
    account.lastKnownLocation.latitude,
    account.lastKnownLocation.longitude
  )

  // Within 50km is considered usual
  return distance < 50
}

/**
 * Check if device is recognized
 */
export function isRecognizedDevice(
  newLogin: LoginActivity,
  account: UserAccount
): boolean {
  return (
    newLogin.device.type === account.lastKnownDevice.type &&
    newLogin.device.os === account.lastKnownDevice.os
  )
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Generate security report for all accounts
 */
export function generateSecurityReport(
  accounts: UserAccount[],
  recentLogins: LoginActivity[]
): {
  overallScore: number // 0-100
  accountsAtRisk: number
  recommendations: string[]
  summary: string
  criticalIssues: string[]
} {
  const criticalIssues: string[] = []
  const recommendations: string[] = []
  let totalScore = 0

  accounts.forEach(account => {
    let accountScore = 100

    // Check 2FA
    if (!account.twoFactorEnabled) {
      accountScore -= 30
      recommendations.push(`Enable two-factor authentication for ${account.accountName}`)
    }

    // Check recent suspicious activity
    const accountLogins = recentLogins.filter(login => login.accountId === account.id)
    const suspiciousLogins = accountLogins.filter(login => login.suspicious)

    if (suspiciousLogins.length > 0) {
      accountScore -= 20 * suspiciousLogins.length
      criticalIssues.push(`${account.accountName}: ${suspiciousLogins.length} suspicious login(s) detected`)
    }

    // Check failed attempts
    const failedLogins = accountLogins.filter(login => !login.success)
    if (failedLogins.length >= 3) {
      accountScore -= 15
      criticalIssues.push(`${account.accountName}: ${failedLogins.length} failed login attempts`)
    }

    totalScore += Math.max(accountScore, 0)
  })

  const overallScore = Math.round(totalScore / accounts.length)
  const accountsAtRisk = accounts.filter(account => {
    const accountLogins = recentLogins.filter(login => login.accountId === account.id)
    return accountLogins.some(login => login.suspicious) || !account.twoFactorEnabled
  }).length

  // Generate summary
  let summary = ''
  if (overallScore >= 80) {
    summary = `✅ Your account security is strong (${overallScore}/100). ${accounts.length - accountsAtRisk}/${accounts.length} accounts are secure.`
  } else if (overallScore >= 60) {
    summary = `⚠️ Your account security needs attention (${overallScore}/100). ${accountsAtRisk} account(s) at risk.`
  } else {
    summary = `🚨 CRITICAL: Your account security is compromised (${overallScore}/100). Immediate action required!`
  }

  // Add general recommendations
  if (accountsAtRisk > 0) {
    recommendations.push(`Review and secure ${accountsAtRisk} account(s) with suspicious activity`)
  }

  const accounts2FADisabled = accounts.filter(a => !a.twoFactorEnabled).length
  if (accounts2FADisabled > 0) {
    recommendations.push(`Enable 2FA on ${accounts2FADisabled} account(s) without protection`)
  }

  return {
    overallScore,
    accountsAtRisk,
    recommendations,
    summary,
    criticalIssues
  }
}

/**
 * Simulate login activity for testing
 */
export function generateMockLoginActivity(accountId: string): LoginActivity[] {
  const now = Date.now()
  const hour = 60 * 60 * 1000

  return [
    {
      id: 'login-1',
      accountId,
      accountType: 'gmail',
      accountName: 'personal@gmail.com',
      timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
      location: {
        ip: '192.168.1.1',
        city: 'San Francisco',
        country: 'USA',
        latitude: 37.7749,
        longitude: -122.4194
      },
      device: {
        type: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
        deviceName: 'MacBook Pro'
      },
      success: true,
      suspicious: false,
      suspicionReasons: [],
      riskLevel: 'low'
    },
    {
      id: 'login-2',
      accountId,
      accountType: 'gmail',
      accountName: 'personal@gmail.com',
      timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
      location: {
        ip: '45.123.45.67',
        city: 'Moscow',
        country: 'Russia',
        latitude: 55.7558,
        longitude: 37.6173
      },
      device: {
        type: 'mobile',
        browser: 'Safari',
        os: 'Android',
        deviceName: 'Unknown'
      },
      success: true,
      suspicious: true,
      suspicionReasons: ['Different country', 'Different device', 'Rapid login'],
      riskLevel: 'critical'
    }
  ]
}

/**
 * Get account security recommendations
 */
export function getSecurityRecommendations(account: UserAccount): string[] {
  const recommendations: string[] = []

  if (!account.twoFactorEnabled) {
    recommendations.push('🔐 Enable two-factor authentication immediately')
  }

  recommendations.push('🔒 Use a strong, unique password (12+ characters)')
  recommendations.push('📧 Set up login alerts for unusual activity')
  recommendations.push('🔄 Review connected devices and remove unknown ones')
  recommendations.push('👀 Check recent activity regularly')

  return recommendations
}

/**
 * Secure account (generates action items)
 */
export function secureAccount(account: UserAccount): {
  steps: string[]
  priority: 'immediate' | 'high' | 'medium'
  estimatedTime: string
} {
  const steps: string[] = []
  let priority: 'immediate' | 'high' | 'medium' = 'high'

  steps.push('1. Change your password immediately')
  steps.push('2. Enable two-factor authentication')
  steps.push('3. Review recent login activity')
  steps.push('4. Sign out of all other sessions')
  steps.push('5. Check account recovery options')
  steps.push('6. Review connected apps and permissions')

  if (!account.twoFactorEnabled) {
    priority = 'immediate'
  }

  return {
    steps,
    priority,
    estimatedTime: '10-15 minutes'
  }
}
