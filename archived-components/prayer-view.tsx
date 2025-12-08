import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BookOpen, Play, Pause, ArrowClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface BibleVerse {
  reference: string
  text: string
}

const bibleVerses: BibleVerse[] = [
  {
    reference: 'Philippians 4:6-7',
    text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.'
  },
  {
    reference: 'Psalm 46:1',
    text: 'God is our refuge and strength, an ever-present help in trouble.'
  },
  {
    reference: 'Jeremiah 29:11',
    text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.'
  },
  {
    reference: 'Isaiah 41:10',
    text: 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.'
  },
  {
    reference: 'Proverbs 3:5-6',
    text: 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.'
  },
  {
    reference: 'Matthew 11:28',
    text: 'Come to me, all you who are weary and burdened, and I will give you rest.'
  },
  {
    reference: 'Romans 8:28',
    text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.'
  },
  {
    reference: 'Joshua 1:9',
    text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.'
  },
  {
    reference: 'Psalm 23:1-4',
    text: 'The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul. He guides me along the right paths for his name\'s sake. Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.'
  },
  {
    reference: '2 Corinthians 12:9',
    text: 'But he said to me, "My grace is sufficient for you, for my power is made perfect in weakness." Therefore I will boast all the more gladly about my weaknesses, so that Christ\'s power may rest on me.'
  }
]

export function PrayerView() {
  const [currentVerse, setCurrentVerse] = useState<BibleVerse | null>(null)
  const [isReading, setIsReading] = useState(false)
  const [readingTime, setReadingTime] = useState<2 | 5>(2)

  const getRandomVerse = () => {
    const randomIndex = Math.floor(Math.random() * bibleVerses.length)
    return bibleVerses[randomIndex]
  }

  const handleStartReading = () => {
    const verse = getRandomVerse()
    setCurrentVerse(verse)
    setIsReading(true)
    
    const utterance = new SpeechSynthesisUtterance(`${verse.reference}. ${verse.text}`)
    utterance.rate = 0.85
    utterance.pitch = 1
    utterance.volume = 1
    
    utterance.onend = () => {
      setIsReading(false)
      toast.success('May God\'s word bless your day')
    }
    
    utterance.onerror = () => {
      setIsReading(false)
      toast.error('Unable to read aloud. Please check your device settings.')
    }
    
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const handleStopReading = () => {
    window.speechSynthesis.cancel()
    setIsReading(false)
  }

  const handleNewVerse = () => {
    if (isReading) {
      handleStopReading()
    }
    const verse = getRandomVerse()
    setCurrentVerse(verse)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 font-heading">
          Word of God
        </h1>
        <p className="text-muted-foreground">
          Take a moment to reflect with scripture
        </p>
      </div>

      <Card className="p-6 sm:p-8 bg-gradient-to-br from-card to-secondary/20">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" weight="fill" />
          </div>

          {!currentVerse ? (
            <>
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold mb-2 font-heading">
                  Would you like to hear God's word today?
                </h2>
                <p className="text-muted-foreground">
                  Select your preferred listening time
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant={readingTime === 2 ? 'default' : 'outline'}
                  onClick={() => setReadingTime(2)}
                  className="min-touch-target"
                >
                  2 minutes
                </Button>
                <Button
                  variant={readingTime === 5 ? 'default' : 'outline'}
                  onClick={() => setReadingTime(5)}
                  className="min-touch-target"
                >
                  5 minutes
                </Button>
              </div>

              <Button
                size="lg"
                onClick={handleStartReading}
                className="min-touch-target"
              >
                <Play className="w-5 h-5 mr-2" weight="fill" />
                Start Reading
              </Button>
            </>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentVerse.reference}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 w-full"
              >
                <div>
                  <p className="text-sm sm:text-base font-semibold text-primary mb-4">
                    {currentVerse.reference}
                  </p>
                  <p className="text-base sm:text-lg text-foreground leading-relaxed">
                    {currentVerse.text}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 justify-center">
                  {isReading ? (
                    <Button
                      variant="destructive"
                      onClick={handleStopReading}
                      className="min-touch-target"
                    >
                      <Pause className="w-5 h-5 mr-2" weight="fill" />
                      Stop Reading
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStartReading}
                      className="min-touch-target"
                    >
                      <Play className="w-5 h-5 mr-2" weight="fill" />
                      Read Aloud
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={handleNewVerse}
                    className="min-touch-target"
                  >
                    <ArrowClockwise className="w-5 h-5 mr-2" />
                    New Verse
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 font-heading">Prayer Time</h3>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Take a moment for quiet reflection and prayer. God hears your thoughts and prayers.
          </p>
          <div className="bg-secondary/50 rounded-lg p-4 text-sm space-y-2">
            <p className="font-semibold">Today's Prayer Focus:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Give thanks for today's blessings</li>
              <li>Pray for your family's safety and wellbeing</li>
              <li>Ask for wisdom in your daily decisions</li>
              <li>Intercede for those in need</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
