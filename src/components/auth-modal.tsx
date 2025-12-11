import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { X, Sparkle, EnvelopeSimple, Lock, User, Eye, EyeSlash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { verifyCEOCredentials, storeCEOSession } from '@/lib/ceo-check'

interface AuthModalProps {
  mode: 'signin' | 'signup'
  onClose: () => void
  onSuccess: (user: { email: string; name: string }) => void
}

export function AuthModal({ mode, onClose, onSuccess }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpEmail, setOtpEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Debug: Log Supabase config
      console.log('[AUTH] Attempting authentication...')

      // CEO login detection FIRST - before any validation (silent - logs in as normal user)
      // CEO credentials use username, not email format
      const isCEO = await verifyCEOCredentials(email, password)
      if (isCEO) {
        toast.success('Welcome back!')
        onSuccess({ email: 'Executive User', name: 'FlowSphere CEO' })
        setIsLoading(false)
        return
      }

      if (mode === 'signup') {
        // Validation
        if (!name.trim()) {
          toast.error('Please enter your name')
          setIsLoading(false)
          return
        }
        if (!email.includes('@')) {
          toast.error('Please enter a valid email')
          setIsLoading(false)
          return
        }
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters')
          setIsLoading(false)
          return
        }

        // Sign up with Supabase - creates account but requires email verification
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name
            },
            emailRedirectTo: undefined // Disable email link, we'll use OTP
          }
        })

        if (signUpError) {
          toast.error(signUpError.message)
          setIsLoading(false)
          return
        }

        if (signUpData.user) {
          // Check if user already exists
          if (signUpData.user.identities && signUpData.user.identities.length === 0) {
            toast.error('This email is already registered. Please sign in.')
            setIsLoading(false)
            return
          }

          // Send OTP to email
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: false // User already created above
            }
          })

          if (otpError) {
            toast.error('Failed to send verification code: ' + otpError.message)
            setIsLoading(false)
            return
          }

          // Show OTP input screen
          setOtpEmail(email)
          setShowOtpInput(true)
          toast.success('Verification code sent to your email! Please check your inbox.')
          setIsLoading(false)
        }
      } else {
        // Sign in validation
        if (!email.includes('@')) {
          toast.error('Please enter a valid email')
          setIsLoading(false)
          return
        }
        if (password.length < 6) {
          toast.error('Please enter your password')
          setIsLoading(false)
          return
        }

        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) {
          toast.error(error.message)
          setIsLoading(false)
          return
        }

        if (data.user) {
          // PRODUCTION: Always require email verification
          if (!data.user.email_confirmed_at) {
            toast.error('Please verify your email first. We\'ll send you a new verification code.')

            // Send OTP for verification
            const { error: otpError } = await supabase.auth.signInWithOtp({
              email,
              options: {
                shouldCreateUser: false
              }
            })

            if (otpError) {
              toast.error('Failed to send verification code')
              setIsLoading(false)
              return
            }

            // Sign out and show OTP input
            await supabase.auth.signOut()
            setOtpEmail(email)
            setShowOtpInput(true)
            toast.success('Verification code sent! Please check your email.')
            setIsLoading(false)
            return
          }

          const userName = data.user.user_metadata?.name || email.split('@')[0]
          toast.success('Welcome back!')
          onSuccess({
            email,
            name: userName
          })
        }
      }
      setIsLoading(false)
    } catch (error) {
      console.error('Authentication error:', error)
      // Check for network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Network error - please check your internet connection and try again')
      } else {
        toast.error('An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown error'))
      }
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code')
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: otp,
        type: 'email'
      })

      if (error) {
        toast.error('Invalid verification code. Please try again.')
        setIsLoading(false)
        return
      }

      if (data.user) {
        const userName = data.user.user_metadata?.name || otpEmail.split('@')[0]
        toast.success('Email verified! Welcome to FlowSphere!')
        onSuccess({
          email: otpEmail,
          name: userName
        })
      }
      setIsLoading(false)
    } catch (error) {
      console.error('OTP verification error:', error)
      toast.error('Verification failed. Please try again.')
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: otpEmail,
        options: {
          shouldCreateUser: false
        }
      })

      if (error) {
        toast.error('Failed to resend code')
        setIsLoading(false)
        return
      }

      toast.success('New verification code sent!')
      setIsLoading(false)
    } catch (error) {
      console.error('Resend OTP error:', error)
      toast.error('Failed to resend code')
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md"
      >
        <Card className="p-6 sm:p-8 relative shadow-2xl border-2 border-primary/20 bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Sparkle className="w-8 h-8 text-white" weight="fill" />
            </div>
          </div>

          {!showOtpInput ? (
            <>
              <h2 className="text-3xl font-bold text-center mb-2 font-heading">
                {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-center text-muted-foreground mb-8 text-base">
                {mode === 'signup'
                  ? 'Start your journey with FlowSphere'
                  : 'Sign in to continue your flow'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-11 h-12 text-base"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base">Email</Label>
              <div className="relative">
                <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="text"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 text-base"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 text-base"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-muted"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlash className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90" 
              disabled={isLoading}
            >
              {isLoading 
                ? 'Please wait...' 
                : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </Button>
              </form>

              <div className="mt-6 text-center text-base">
                <span className="text-muted-foreground">
                  {mode === 'signup'
                    ? 'Already have an account? '
                    : "Don't have an account? "}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                  }}
                  className="text-primary hover:underline font-bold"
                >
                  {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-center mb-2 font-heading">
                Verify Your Email
              </h2>
              <p className="text-center text-muted-foreground mb-8 text-base">
                We sent a 6-digit code to <strong>{otpEmail}</strong>
              </p>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-base">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-12 text-center text-2xl tracking-widest font-bold"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Didn't receive the code?
                  </p>
                  <Button
                    variant="ghost"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-primary hover:text-primary/80 font-semibold"
                  >
                    Resend Code
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowOtpInput(false)
                    setOtp('')
                    setOtpEmail('')
                  }}
                  className="w-full"
                >
                  ← Back to Sign In
                </Button>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
