import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') })

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5000',

  // Security
  jwtSecret: process.env.JWT_SECRET || 'change-this-in-production',
  encryptionKey: process.env.ENCRYPTION_KEY || 'change-this-32-byte-key-here!!',

  // Redis
  redisUrl: process.env.REDIS_URL,

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // OAuth Providers
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]
    },
    outlook: {
      clientId: process.env.OUTLOOK_CLIENT_ID || '',
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
      scopes: ['openid', 'profile', 'email', 'User.Read', 'Mail.Read', 'Mail.Send', 'Mail.ReadWrite', 'offline_access']
    },
    yahoo: {
      clientId: process.env.YAHOO_CLIENT_ID || '',
      clientSecret: process.env.YAHOO_CLIENT_SECRET || '',
      scopes: ['openid', 'profile', 'email', 'mail-r', 'mail-w']
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID || '',
      teamId: process.env.APPLE_TEAM_ID || '',
      keyId: process.env.APPLE_KEY_ID || '',
      privateKey: process.env.APPLE_PRIVATE_KEY || ''
    }
  },

  // Allowed origins for CORS
  allowedOrigins: [
    'http://localhost:5000',
    'http://localhost:5173',
    'https://myflowsphere.com',
    'https://www.myflowsphere.com',
    'https://app.myflowsphere.com'
  ]
}

// Validate required config in production
export function validateConfig(): void {
  if (config.nodeEnv === 'production') {
    const required = [
      ['JWT_SECRET', config.jwtSecret !== 'change-this-in-production'],
      ['ENCRYPTION_KEY', config.encryptionKey !== 'change-this-32-byte-key-here!!'],
    ]

    const missing = required.filter(([_, valid]) => !valid).map(([name]) => name)
    if (missing.length > 0) {
      throw new Error(`Missing required production config: ${missing.join(', ')}`)
    }
  }
}
