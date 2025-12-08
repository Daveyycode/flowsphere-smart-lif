import express from 'express'
import compression from 'compression'
import { config, validateConfig } from './config.js'
import { logger, requestLogger } from './utils/logger.js'
import {
  corsMiddleware,
  securityHeaders,
  rateLimiter,
  sanitizeRequest,
  requestId
} from './middleware/security.js'
import authRoutes from './routes/auth.js'

// Validate config on startup
validateConfig()

const app = express()

// Trust proxy (for rate limiting behind load balancer)
app.set('trust proxy', 1)

// ============ MIDDLEWARE ============

// Request ID for tracing
app.use(requestId)

// Security headers (Helmet)
app.use(securityHeaders)

// CORS
app.use(corsMiddleware)

// Compression (gzip)
app.use(compression())

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request sanitization
app.use(sanitizeRequest)

// Request logging
app.use(requestLogger)

// Rate limiting
app.use(rateLimiter)

// ============ ROUTES ============

// Health check (before auth)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  })
})

// Ready check (for Kubernetes)
app.get('/ready', (req, res) => {
  // Add checks for database, Redis, etc. here
  res.json({ status: 'ready' })
})

// API version
app.get('/', (req, res) => {
  res.json({
    name: 'FlowSphere API',
    version: '1.0.0',
    docs: '/docs'
  })
})

// Auth routes
app.use('/auth', authRoutes)

// ============ ERROR HANDLING ============

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    path: req.path
  })
})

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  })

  // Don't leak error details in production
  const message = config.nodeEnv === 'production'
    ? 'An unexpected error occurred'
    : err.message

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message,
    requestId: req.headers['x-request-id']
  })
})

// ============ START SERVER ============

const server = app.listen(config.port, () => {
  logger.info(`🚀 FlowSphere API started`, {
    port: config.port,
    environment: config.nodeEnv,
    url: config.apiUrl
  })

  // Log enabled OAuth providers
  const providers = ['google', 'outlook', 'yahoo', 'apple']
  const enabled = providers.filter(p => {
    const c = config.oauth[p as keyof typeof config.oauth]
    return c && 'clientId' in c && c.clientId
  })
  logger.info(`OAuth providers enabled: ${enabled.join(', ') || 'none'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

export default app
