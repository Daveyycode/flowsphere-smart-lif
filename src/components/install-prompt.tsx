import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { isAppInstalled } from '@/lib/pwa-utils'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    setIsInstalled(isAppInstalled())

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show prompt after user has been on site for a bit
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Show manual instructions
      alert(
        'To install FlowSphere:\n\n' +
          'iOS/Safari:\n' +
          '1. Tap the Share button (square with arrow)\n' +
          '2. Tap "Add to Home Screen"\n\n' +
          'Android/Chrome:\n' +
          '1. Tap the menu (3 dots)\n' +
          '2. Tap "Install App" or "Add to Home Screen"'
      )
      return
    }

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Show again in 7 days
    localStorage.setItem('installPromptDismissed', Date.now().toString())
  }

  // Don't show if already installed
  if (isInstalled) {
    return null
  }

  // Check if user dismissed recently
  const dismissed = localStorage.getItem('installPromptDismissed')
  if (dismissed) {
    const daysSinceDismiss = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24)
    if (daysSinceDismiss < 7) {
      return null
    }
  }

  return (
    <>
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:w-96"
          >
            <Card className="p-4 shadow-2xl border-2 border-primary/20 bg-background/95 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <Download className="w-6 h-6 text-white" weight="bold" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-1">Install FlowSphere</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Install app for faster access, offline use, and notifications
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleInstallClick} className="flex-1 h-8">
                      Install
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismiss}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual install button in header/settings */}
      {!isInstalled && !showPrompt && (
        <Button variant="outline" size="sm" onClick={() => setShowPrompt(true)} className="gap-2">
          <Download className="w-4 h-4" />
          Install App
        </Button>
      )}
    </>
  )
}
