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
import { useDeviceType } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface LandingPageProps {
  onSignIn: () => void
  onSignUp: () => void
}

export function LandingPage({ onSignIn, onSignUp }: LandingPageProps) {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'
  const isTablet = deviceType === 'tablet'
  
  const features = [
    {
      icon: <Brain className={cn(isMobile ? "w-6 h-6" : "w-8 h-8")} />,
      title: 'AI-Powered',
      description: 'Smart assistant that learns your rhythm'
    },
    {
      icon: <House className={cn(isMobile ? "w-6 h-6" : "w-8 h-8")} />,
      title: 'Home Control',
      description: 'Manage all your smart devices in one place'
    },
    {
      icon: <Users className={cn(isMobile ? "w-6 h-6" : "w-8 h-8")} />,
      title: 'Family Safety',
      description: 'Track and protect your loved ones'
    },
    {
      icon: <Shield className={cn(isMobile ? "w-6 h-6" : "w-8 h-8")} />,
      title: 'Privacy First',
      description: 'Your data stays secure and private'
    },
    {
      icon: <Bell className={cn(isMobile ? "w-6 h-6" : "w-8 h-8")} />,
      title: 'Smart Notifications',
      description: 'AI-filtered alerts that matter'
    },
    {
      icon: <Clock className={cn(isMobile ? "w-6 h-6" : "w-8 h-8")} />,
      title: 'Time Management',
      description: 'Productivity insights and meeting optimizer'
    },
    {
      icon: <Heart className={cn(isMobile ? "w-6 h-6" : "w-8 h-8")} />,
      title: 'Wellness',
      description: 'Sleep tracking, prayer time, and daily reflection'
    },
    {
      icon: <Sparkle className={cn(isMobile ? "w-6 h-6" : "w-8 h-8")} />,
      title: 'Life Rhythm',
      description: 'Synchronize work, family, rest, and home'
    }
  ]

  const gridCols = isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-3' : 'grid-cols-4'
  const padding = isMobile ? 'px-4' : 'px-6'
  const verticalPadding = isMobile ? 'py-4' : 'py-6'
  const mainPadding = isMobile ? 'py-8' : isTablet ? 'py-10' : 'py-12'

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
        <header className={cn("flex justify-between items-center", padding, verticalPadding)}>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn("flex items-center", isMobile ? "gap-2" : "gap-3")}
          >
            <div className={cn("rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center", isMobile ? "w-8 h-8" : isTablet ? "w-9 h-9" : "w-10 h-10")}>
              <Sparkle className={cn("text-white", isMobile ? "w-5 h-5" : "w-6 h-6")} weight="fill" />
            </div>
            <div>
              <h1 className={cn("font-bold text-foreground font-heading", isMobile ? "text-xl" : "text-2xl")}>FlowSphere</h1>
              {!isMobile && <p className={cn("text-muted-foreground", isTablet ? "text-xs" : "text-xs")}>Command center for modern life</p>}
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn("flex", isMobile ? "gap-2" : "gap-3")}
          >
            <Button variant="ghost" onClick={onSignIn} className="min-touch-target" size={isMobile ? "sm" : "default"}>
              Sign In
            </Button>
            <Button onClick={onSignUp} className="min-touch-target" size={isMobile ? "sm" : "default"}>
              Get Started
            </Button>
          </motion.div>
        </header>

        <main className={cn("flex-1 flex items-center justify-center", padding, mainPadding)}>
          <div className="max-w-6xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cn("text-center", isMobile ? "mb-8" : "mb-12")}
            >
              <h2 className={cn("font-bold text-foreground font-heading", isMobile ? "text-3xl mb-3" : isTablet ? "text-4xl mb-3" : "text-6xl mb-4")}>
                FlowSphere
              </h2>
              <p className={cn("text-accent font-medium", isMobile ? "text-base mb-2" : isTablet ? "text-lg mb-2" : "text-xl mb-3")}>
                "Command center for modern life"
              </p>
              <p className={cn("text-muted-foreground", isMobile ? "text-sm mb-4" : isTablet ? "text-base mb-5" : "text-lg mb-6")}>
                All subscription in one app
              </p>
              <p className={cn("text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed", isMobile ? "text-sm px-4" : "text-base")}>
                An AI-driven, privacy-first companion that synchronizes work, family, rest, and home into a single daily flow
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={cn("grid gap-3 mb-8", gridCols, isMobile && "gap-3", isTablet && "gap-4", !isMobile && !isTablet && "gap-6")}
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <Card className={cn("h-full flex flex-col items-center text-center hover:shadow-lg transition-shadow bg-card/80 backdrop-blur-sm border-border/50", isMobile ? "p-4 gap-2" : isTablet ? "p-5 gap-2" : "p-6 gap-3")}>
                    <div className="text-primary">
                      {feature.icon}
                    </div>
                    <h3 className={cn("font-semibold text-foreground font-heading", isMobile ? "text-sm" : "text-base")}>
                      {feature.title}
                    </h3>
                    <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
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
              className={cn("flex justify-center items-center", isMobile ? "flex-col gap-3" : "flex-row gap-4")}
            >
              <Button 
                size={isMobile ? "default" : "lg"}
                onClick={onSignUp}
                className={cn("min-touch-target", isMobile ? "w-full px-6 py-4 text-base" : isTablet ? "px-7 py-5 text-lg" : "px-8 py-6 text-lg")}
              >
                Start Your Journey
              </Button>
              <Button 
                size={isMobile ? "default" : "lg"}
                variant="outline" 
                onClick={onSignIn}
                className={cn("min-touch-target", isMobile ? "w-full px-6 py-4 text-base" : isTablet ? "px-7 py-5 text-lg" : "px-8 py-6 text-lg")}
              >
                Sign In
              </Button>
            </motion.div>
          </div>
        </main>

        <PricingSection onGetStarted={onSignUp} />

        <footer className={cn("text-center text-muted-foreground", padding, isMobile ? "py-3 text-xs" : "py-4 text-sm")}>
          <p>© 2024 FlowSphere. Privacy-first, AI-powered life management.</p>
        </footer>
      </div>
    </div>
  )
}
