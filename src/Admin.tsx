import { useState, useEffect } from 'react'
import { AdminDashboard } from '@/components/admin-dashboard'
import { Toaster } from '@/components/ui/sonner'
import { motion } from 'framer-motion'
import { ShieldCheck, Sparkle } from '@phosphor-icons/react'

function Admin() {
  const [isOwner, setIsOwner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkOwnership = async () => {
      try {
        const user = await window.spark.user()
        setIsOwner(user?.isOwner || false)
      } catch (error) {
        setIsOwner(false)
      } finally {
        setIsLoading(false)
      }
    }
    checkOwnership()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="relative inline-block mb-4">
            <Sparkle className="w-12 h-12 text-accent animate-pulse" weight="fill" />
            <div className="absolute inset-0 bg-accent/30 blur-lg" />
          </div>
          <p className="text-muted-foreground">Verifying access...</p>
        </motion.div>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="bg-destructive/10 border-2 border-destructive/20 rounded-2xl p-8 mb-6">
            <ShieldCheck className="w-16 h-16 text-destructive mx-auto mb-4" weight="fill" />
            <h1 className="text-2xl font-heading font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">
              This admin panel is restricted to the app owner only.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Return to Main App
          </a>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Sparkle className="w-8 h-8 text-accent" weight="fill" />
                <div className="absolute inset-0 bg-accent/30 blur-lg" />
              </div>
              <div>
                <span className="font-heading font-bold text-xl">FlowSphere Admin</span>
                <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5" weight="fill" />
                  <span>Owner Access</span>
                </div>
              </div>
            </div>

            <a
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Main App
            </a>
          </div>
        </header>

        <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AdminDashboard />
          </motion.div>
        </main>
      </div>

      <Toaster position="top-center" />
    </>
  )
}

export default Admin
