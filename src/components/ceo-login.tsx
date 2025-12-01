import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Eye, EyeClosed, User, Lock, QrCode } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { FaceCaptureSecurityManager } from '@/lib/face-capture-security'
import { ActiveSessionsMonitor } from '@/lib/active-sessions-monitor'
import { useKV } from '@github/spark/hooks'
import { rotateUsername, createLoginAttempt, type CEOCredentials } from '@/lib/ceo-auth'
import { TermsCheckbox } from '@/components/terms-checkbox'

interface CEOLoginProps {
  onSuccess: () => void
}

export function CEOLogin({ onSuccess }: CEOLoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Get current rotating username and stored credentials
  const [ceoCredentials, setCeoCredentials] = useKV<CEOCredentials>('flowsphere-ceo-credentials', {
    username: '778101', // Default 6-digit rotating code
    password: 'papakoEddie@tripzy.international',
    lastRotation: new Date().toISOString(),
    deviceId: 'device-' + Math.random().toString(36).substring(7)
  })

  const [loginAttempts, setLoginAttempts] = useKV<any[]>('flowsphere-ceo-login-attempts', [])

  const handleLogin = async () => {
    // Check terms agreement
    if (!agreedToTerms) {
      toast.error('Please agree to the terms and conditions')
      return
    }

    setIsLoading(true)

    try {
      // Simulate small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500))

      // Validate against rotating username and stored password
      const isValidUsername = username === ceoCredentials?.username
      const isValidPassword = password === ceoCredentials?.password

      if (isValidUsername && isValidPassword) {
        // Successful CEO login
        const attempt = createLoginAttempt(username, true, 'manual')
        setLoginAttempts([...(loginAttempts || []), attempt])

        const sessionsMonitor = new ActiveSessionsMonitor()
        await sessionsMonitor.recordSuccessfulLogin(
          username,
          'CEO',
          'CEO Executive'
        )

        toast.success('Welcome, CEO! Username rotating for security...')

        // Rotate username for next login
        const newCredentials = rotateUsername(ceoCredentials!)
        setCeoCredentials(newCredentials)

        // Store CEO auth in localStorage
        localStorage.setItem('flowsphere-ceo-authenticated', 'true')
        localStorage.setItem('flowsphere-ceo-login-time', new Date().toISOString())

        onSuccess()
      } else {
        // Failed login - capture face silently
        const faceCapture = new FaceCaptureSecurityManager()
        const sessionsMonitor = new ActiveSessionsMonitor()

        const failureReason = !isValidUsername
          ? 'Invalid username (6-digit code)'
          : 'Invalid password'

        const attempt = createLoginAttempt(username, false, 'manual', failureReason)
        setLoginAttempts([...(loginAttempts || []), attempt])

        // Capture face silently (NO sounds, vibrations, or alerts)
        await faceCapture.captureOnFailedLogin(username || 'Unknown', {
          username: username,
          ipAddress: await getIPAddress()
        })

        // Record failed attempt
        await sessionsMonitor.recordFailedLogin(
          username || 'Unknown',
          failureReason
        )

        setAttempts(prev => prev + 1)

        if (attempts >= 2) {
          toast.error('Multiple failed attempts detected. Security team notified.')
        } else {
          toast.error('Invalid credentials. Check your QR code for current username.')
        }

        // Clear password field
        setPassword('')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-accent/5 to-primary/5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="border-accent/30 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-white" weight="fill" />
            </div>
            <div>
              <CardTitle className="text-2xl">CEO Dashboard Access</CardTitle>
              <CardDescription className="mt-2 space-y-2">
                <div>Secure executive portal - Authorized personnel only</div>
                <Badge variant="outline" className="gap-1.5 bg-accent/10">
                  <QrCode className="w-3 h-3" />
                  <span className="text-xs">Rotating 6-digit username required</span>
                </Badge>
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ceo-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="ceo-username"
                    type="text"
                    placeholder="Enter CEO username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="pl-10"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ceo-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="ceo-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter CEO password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="pl-10 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeClosed className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms and Conditions Checkbox */}
            <TermsCheckbox
              checked={agreedToTerms}
              onCheckedChange={setAgreedToTerms}
              required
              termsType="ceo"
            />

            <Button
              onClick={handleLogin}
              disabled={isLoading || !username || !password || !agreedToTerms}
              className="w-full bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90"
              size="lg"
            >
              {isLoading ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Authenticating...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 mr-2" weight="fill" />
                  Access CEO Dashboard
                </>
              )}
            </Button>

            {attempts > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-center"
              >
                <p className="text-sm text-destructive">
                  {attempts} failed attempt{attempts > 1 ? 's' : ''} detected
                  {attempts >= 2 && ' - Security monitoring active'}
                </p>
              </motion.div>
            )}

            <div className="text-center text-xs text-muted-foreground pt-4 border-t space-y-2">
              <div className="flex items-center justify-center gap-2 text-accent">
                <QrCode className="w-4 h-4" weight="fill" />
                <span className="font-medium">Use QR code from your phone for current username</span>
              </div>
              <p>⚠️ Unauthorized access attempts are logged and monitored</p>
              <p>All login attempts are recorded with security cameras</p>
              <p className="text-[10px] mt-2">Username rotates automatically after each login/logout</p>
            </div>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-center text-xs text-muted-foreground"
        >
          <p>FlowSphere CEO Portal © 2025 - Tripzy International</p>
        </motion.div>
      </motion.div>
    </div>
  )
}

// Helper function to get IP address
async function getIPAddress(): Promise<string | undefined> {
  try {
    // In production, this would call your backend
    return undefined
  } catch {
    return undefined
  }
}
