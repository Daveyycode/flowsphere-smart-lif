/**
 * CEO Authentication Setup
 * One-time QR code generation for authenticator app setup
 * Allows CEO to change username after initial setup
 *
 * SECURITY: Uses real TOTP verification via otpauth library
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { QrCode, ShieldCheck, Key, User, Check, Copy } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'
import QRCode from 'qrcode'
import * as OTPAuth from 'otpauth'

interface CEOAuthSetupProps {
  onSetupComplete: () => void
}

export function CEOAuthSetup({ onSetupComplete }: CEOAuthSetupProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [hasCompletedSetup, setHasCompletedSetup] = useKV<boolean>('flowsphere-ceo-auth-setup-complete', false)
  const [ceoUsername, setCeoUsername] = useKV<string>('flowsphere-ceo-username', '19780111')

  // Generate secret key and QR code on mount
  useEffect(() => {
    if (!hasCompletedSetup) {
      generateQRCode()
    }
  }, [hasCompletedSetup])

  const generateSecret = () => {
    // Generate cryptographically secure secret using OTPAuth library
    const otpSecret = new OTPAuth.Secret({ size: 20 })
    return otpSecret.base32
  }

  const generateQRCode = async () => {
    const newSecret = generateSecret()
    setSecret(newSecret)

    // Create otpauth URL for authenticator apps
    const issuer = 'FlowSphere'
    const account = 'CEO'
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${newSecret}&issuer=${encodeURIComponent(issuer)}`

    try {
      const qrUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeUrl(qrUrl)
    } catch (error) {
      console.error('QR code generation error:', error)
      toast.error('Failed to generate QR code')
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    toast.success('Secret key copied to clipboard')
  }

  const verifyCode = () => {
    // SECURITY: Real TOTP verification using otpauth library
    if (!verificationCode || verificationCode.length !== 6 || !/^\d{6}$/.test(verificationCode)) {
      toast.error('Invalid code format. Please enter a 6-digit code.')
      return
    }

    try {
      const totp = new OTPAuth.TOTP({
        issuer: 'FlowSphere',
        label: 'CEO',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
      })

      // Validate with a time window of ±1 period (30 seconds)
      const delta = totp.validate({
        token: verificationCode.trim(),
        window: 1
      })

      if (delta !== null) {
        // Store the secret for future logins
        localStorage.setItem('flowsphere_ceo_setup_totp_secret', secret)
        setIsVerified(true)
        toast.success('Verification successful! Your authenticator is configured.')
      } else {
        toast.error('Invalid code. Make sure you scanned the QR code and the time is synced.')
      }
    } catch (error) {
      console.error('[CEO Auth Setup] TOTP verification error:', error)
      toast.error('Verification failed. Please try again.')
    }
  }

  const completeSetup = () => {
    if (!newUsername.trim()) {
      toast.error('Please enter a new username')
      return
    }

    if (newUsername.length < 4) {
      toast.error('Username must be at least 4 characters')
      return
    }

    setIsSettingUp(true)

    setTimeout(() => {
      setCeoUsername(newUsername)
      setHasCompletedSetup(true)
      toast.success('CEO authentication setup complete!')
      onSetupComplete()
      setIsSettingUp(false)
    }, 1000)
  }

  if (hasCompletedSetup) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center min-h-[400px]"
      >
        <Card className="border-2 border-accent/30 bg-gradient-to-br from-accent/10 to-primary/10 max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-accent" weight="fill" />
            </div>
            <h3 className="text-xl font-bold mb-2">Authentication Already Configured</h3>
            <p className="text-muted-foreground mb-4">
              CEO authentication has been set up. You can now use your authenticator app to login.
            </p>
            <Badge className="bg-accent text-white">
              <Check className="w-4 h-4 mr-1" weight="bold" />
              Setup Complete
            </Badge>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6">
      <Card className="border-2 border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" weight="bold" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl">CEO Authentication Setup</CardTitle>
              <CardDescription>One-time configuration for secure access</CardDescription>
            </div>
          </div>
          <Badge className="bg-destructive/20 text-destructive text-xs w-fit">
            This setup can only be done once
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: QR Code */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-white">Step 1</Badge>
              <h3 className="font-semibold">Scan QR Code with Authenticator App</h3>
            </div>
            <Card className="bg-muted/50 p-6">
              <div className="flex flex-col items-center gap-4">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64 border-4 border-background rounded-lg" />
                ) : (
                  <div className="w-64 h-64 bg-background/50 rounded-lg flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-muted-foreground animate-pulse" />
                  </div>
                )}
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Scan this QR code with Google Authenticator, Authy, or any TOTP-compatible app
                </p>
              </div>
            </Card>
            <div className="bg-background/50 p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Manual Entry Key (if QR scan fails)
                  </Label>
                  <code className="text-xs sm:text-sm font-mono break-all">{secret}</code>
                </div>
                <Button variant="outline" size="icon" onClick={copySecret}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Step 2: Verify Code */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-accent text-white">Step 2</Badge>
              <h3 className="font-semibold">Verify with Generated Code</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verification-code">Enter 6-digit code from your app</Label>
              <div className="flex gap-2">
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="font-mono text-lg text-center tracking-widest"
                  disabled={isVerified}
                />
                <Button
                  onClick={verifyCode}
                  disabled={verificationCode.length !== 6 || isVerified}
                  className="bg-accent"
                >
                  {isVerified ? <Check className="w-5 h-5" weight="bold" /> : 'Verify'}
                </Button>
              </div>
              {isVerified && (
                <p className="text-sm text-accent flex items-center gap-1">
                  <Check className="w-4 h-4" weight="bold" />
                  Code verified successfully!
                </p>
              )}
            </div>
          </div>

          {/* Step 3: Set New Username */}
          {isVerified && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <Badge className="bg-coral text-white">Step 3</Badge>
                <h3 className="font-semibold">Choose New Username</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-username">New CEO Username</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="new-username"
                      type="text"
                      placeholder="Enter new username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={completeSetup}
                    disabled={!newUsername || isSettingUp}
                    className="bg-gradient-to-r from-primary to-accent"
                  >
                    {isSettingUp ? 'Setting up...' : 'Complete Setup'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Current username (19780111) will be replaced with your new username
                </p>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-accent/20 bg-accent/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Important Notes:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• This QR code will disappear after setup is complete</li>
                <li>• Make sure to save your authenticator app backup</li>
                <li>• Your password is managed securely via server-side authentication</li>
                <li>• Only the username will change after this setup</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
