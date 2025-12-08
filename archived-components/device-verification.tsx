/**
 * Device Verification Component
 *
 * Handles device binding verification for FlowSphere Vault
 * Shows when a user tries to access vault from a different device
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Shield,
  Warning,
  DeviceMobile,
  ArrowRight,
  Trash,
  CheckCircle,
  XCircle,
  Info
} from '@phosphor-icons/react'
import {
  checkDeviceChange,
  bindDeviceToEmail,
  clearVaultData,
  getDeviceIdForDisplay,
  type DeviceChangeResult
} from '@/lib/device-fingerprint'

interface DeviceVerificationProps {
  email: string
  onVerified: () => void
  onNewSetup: () => void
}

export function DeviceVerification({ email, onVerified, onNewSetup }: DeviceVerificationProps) {
  const [status, setStatus] = useState<'checking' | 'verified' | 'new_device' | 'different_device'>('checking')
  const [deviceId, setDeviceId] = useState<string>('')
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  useEffect(() => {
    verifyDevice()
  }, [email])

  const verifyDevice = async () => {
    setStatus('checking')

    try {
      // Get display device ID
      const displayId = await getDeviceIdForDisplay()
      setDeviceId(displayId)

      // Check device binding
      const result = await checkDeviceChange(email)

      if (result.action === 'continue') {
        setStatus('verified')
        setTimeout(onVerified, 1000) // Brief pause to show verification
      } else if (result.action === 'new_setup') {
        setStatus('new_device')
      } else if (result.action === 'restore') {
        setStatus('different_device')
      }
    } catch (error) {
      console.error('Device verification failed:', error)
      // Default to new device setup on error
      setStatus('new_device')
    }
  }

  const handleSetupNewDevice = async () => {
    try {
      // Bind this device to the email
      await bindDeviceToEmail(email)
      onNewSetup()
    } catch (error) {
      console.error('Failed to setup device:', error)
      // Still proceed with setup on error
      onNewSetup()
    }
  }

  const handleClearAndSetup = async () => {
    setIsClearing(true)

    try {
      // Clear all vault data
      clearVaultData()

      // Bind new device
      await bindDeviceToEmail(email)
    } catch (error) {
      console.error('Failed to bind device:', error)
    }

    setIsClearing(false)
    setShowConfirmClear(false)
    onNewSetup()
  }

  // Checking state
  if (status === 'checking') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto mb-4"
          >
            <Shield className="w-16 h-16 text-purple-500" />
          </motion.div>
          <h2 className="text-white text-xl font-bold mb-2">Verifying Device</h2>
          <p className="text-gray-400">Checking device fingerprint...</p>
        </motion.div>
      </div>
    )
  }

  // Verified state
  if (status === 'verified') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10 }}
          >
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" weight="fill" />
          </motion.div>
          <h2 className="text-white text-xl font-bold mb-2">Device Verified</h2>
          <p className="text-gray-400">Access granted to your vault</p>
          <p className="text-purple-400 text-sm mt-2 font-mono">{deviceId}</p>
        </motion.div>
      </div>
    )
  }

  // New device (first time setup)
  if (status === 'new_device') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <Card className="w-full max-w-md bg-gray-900 border-purple-500/30">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <DeviceMobile className="w-8 h-8 text-purple-500" />
              </div>
              <CardTitle className="text-white">Welcome to FlowSphere</CardTitle>
              <CardDescription className="text-gray-400">
                Setting up secure vault on this device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-300">
                    <p className="font-medium text-purple-300 mb-1">Device Binding</p>
                    <p>Your vault will be encrypted and bound to this specific device. This means:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
                      <li>Maximum security - data cannot be accessed elsewhere</li>
                      <li>If you switch devices, you'll need to set up fresh</li>
                      <li>Data stays on this device only</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500">
                <p>Device ID: <span className="font-mono text-purple-400">{deviceId}</span></p>
              </div>

              <Button
                onClick={handleSetupNewDevice}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Set Up Vault on This Device
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Different device detected
  if (status === 'different_device') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {!showConfirmClear ? (
            <motion.div
              key="warning"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
            >
              <Card className="w-full max-w-md bg-gray-900 border-orange-500/30">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Warning className="w-8 h-8 text-orange-500" weight="fill" />
                  </div>
                  <CardTitle className="text-white">Different Device Detected</CardTitle>
                  <CardDescription className="text-gray-400">
                    Your vault was set up on a different device
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/20">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-300">
                        <p className="font-medium text-orange-300 mb-1">Security Notice</p>
                        <p>
                          Your vault data is encrypted and bound to your original device.
                          It cannot be transferred or accessed from this device.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-gray-400">Current Device:</p>
                    <p className="font-mono text-purple-400 text-sm">{deviceId}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-400 text-center">Your options:</p>

                    <Button
                      variant="outline"
                      className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                      onClick={() => setShowConfirmClear(true)}
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Set Up Fresh on This Device
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      Your original vault data remains on the original device
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
            >
              <Card className="w-full max-w-md bg-gray-900 border-red-500/30">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Trash className="w-8 h-8 text-red-500" />
                  </div>
                  <CardTitle className="text-white">Confirm New Setup</CardTitle>
                  <CardDescription className="text-gray-400">
                    This will clear any local data and set up a fresh vault
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                    <p className="text-sm text-red-300">
                      Any data stored locally on this device will be cleared.
                      Your original vault on the other device is not affected.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-gray-700"
                      onClick={() => setShowConfirmClear(false)}
                      disabled={isClearing}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={handleClearAndSetup}
                      disabled={isClearing}
                    >
                      {isClearing ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <Shield className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return null
}

/**
 * Hook to check device verification status
 */
export function useDeviceVerification(email: string | null) {
  const [isVerified, setIsVerified] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [isDifferentDevice, setIsDifferentDevice] = useState(false)

  useEffect(() => {
    if (!email) {
      setIsChecking(false)
      return
    }

    const check = async () => {
      setIsChecking(true)
      const result = await checkDeviceChange(email)

      setIsVerified(result.action === 'continue')
      setNeedsSetup(result.action === 'new_setup')
      setIsDifferentDevice(result.action === 'restore')
      setIsChecking(false)
    }

    check()
  }, [email])

  return { isVerified, isChecking, needsSetup, isDifferentDevice }
}
