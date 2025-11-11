import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PricingSection } from '@/components/pricing-section'
import { 
  Brain, 
  House, 
  Users, 
  Shield, 
  Bell, 
  Clock, 
  Heart,
  Sparkle
} from '@phosphor-icons/react'

interface LandingPageProps {
  onSignIn: () => void
  onSignUp: () => void
}

export function LandingPage({ onSignIn, onSignUp }: LandingPageProps) {
  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: 'AI-Powered',
      description: 'Smart assistant that learns your rhythm'
    },
    {
      icon: <House className="w-8 h-8" />,
      title: 'Home Control',
      description: 'Manage all your smart devices in one place'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Family Safety',
      description: 'Track and protect your loved ones'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Privacy First',
      description: 'Your data stays secure and private'
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: 'Smart Notifications',
      description: 'AI-filtered alerts that matter'
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Time Management',
      description: 'Productivity insights and meeting optimizer'
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Wellness',
      description: 'Sleep tracking, prayer time, and daily reflection'
    },
    {
      icon: <Sparkle className="w-8 h-8" />,
      title: 'Life Rhythm',
      description: 'Synchronize work, family, rest, and home'
    }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2px)'
        }}
      />
      
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/95 to-accent/10" />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="px-4 sm:px-6 py-4 sm:py-6 flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 sm:gap-3"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkle className="w-5 h-5 sm:w-6 sm:h-6 text-white" weight="fill" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground font-heading">FlowSphere</h1>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-2 sm:gap-3"
          >
            <Button variant="ghost" onClick={onSignIn} className="min-touch-target">
              Sign In
            </Button>
            <Button onClick={onSignUp} className="min-touch-target">
              Get Started
            </Button>
          </motion.div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
          <div className="max-w-6xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-3 sm:mb-4 font-heading">
                FlowSphere
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-primary font-semibold mb-4 sm:mb-6">
                "One app for your life rhythm"
              </p>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-3xl mx-auto px-4 leading-relaxed">
                An AI-driven, privacy-first companion that synchronizes work, family, rest, and home into a single daily flow
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <Card className="p-4 sm:p-6 h-full flex flex-col items-center text-center gap-2 sm:gap-3 hover:shadow-lg transition-shadow bg-card/80 backdrop-blur-sm border-border/50">
                    <div className="text-primary">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base text-foreground font-heading">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center"
            >
              <Button 
                size="lg" 
                onClick={onSignUp}
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 min-touch-target"
              >
                Start Your Journey
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={onSignIn}
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 min-touch-target"
              >
                Sign In
              </Button>
            </motion.div>
          </div>
        </main>

        <PricingSection onGetStarted={onSignUp} />

        <footer className="px-4 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm text-muted-foreground">
          <p>© 2024 FlowSphere. Privacy-first, AI-powered life management.</p>
        </footer>
      </div>
    </div>
  )
}
