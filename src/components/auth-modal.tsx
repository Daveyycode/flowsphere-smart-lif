import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { X, Sparkle, EnvelopeSimple, Lock, User } from '@phosphor-icons/react'
import { toast } from 'sonner'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      if (mode === 'signup') {
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
        
        toast.success('Welcome to FlowSphere!')
        onSuccess({ email, name })
      } else {
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
        
        toast.success('Welcome back!')
        onSuccess({ 
          email, 
          name: name || email.split('@')[0] 
        })
      }
      setIsLoading(false)
    }, 1000)
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
                  type="email"
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
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 text-base"
                  required
                />
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
                setTimeout(() => {
                  mode === 'signup' ? onClose() : onClose()
                }, 100)
              }}
              className="text-primary hover:underline font-bold"
            >
              {mode === 'signup' ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
