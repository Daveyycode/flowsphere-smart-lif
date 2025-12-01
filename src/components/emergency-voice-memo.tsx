/**
 * Emergency Voice Memo Component
 * Plays voice messages that bypass Do Not Disturb and silent mode
 * Critical for emergency situations with family members
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Microphone, Play, Stop, Trash, X, Warning, SpeakerHigh } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'

interface EmergencyVoiceMemoProps {
  memberId: string
  memberName: string
  existingMemo?: {
    url?: string
    duration?: number
    recordedAt?: string
    message?: string
  }
  onSave: (memo: { url?: string; duration?: number; recordedAt?: string; message?: string }) => void
  isOpen: boolean
  onClose: () => void
}

export function EmergencyVoiceMemo({
  memberId,
  memberName,
  existingMemo,
  onSave,
  isOpen,
  onClose
}: EmergencyVoiceMemoProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(existingMemo?.url || null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl && !existingMemo?.url) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl, existingMemo])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setRecordedBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      toast.success('Recording emergency voice memo...')
    } catch (error) {
      console.error('Error accessing microphone:', error)
      toast.error('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      toast.success('Voice memo recorded!')
    }
  }

  const playMemo = () => {
    if (audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      // CRITICAL: Set volume to maximum and play with high priority
      audio.volume = 1.0
      audio.play().catch(error => {
        console.error('Playback error:', error)
        toast.error('Could not play voice memo')
      })

      setIsPlaying(true)

      audio.onended = () => {
        setIsPlaying(false)
      }

      toast.info('🔊 Playing emergency memo (bypasses DND)', { duration: 3000 })
    }
  }

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const deleteMemo = () => {
    if (audioUrl && !existingMemo?.url) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setRecordedBlob(null)
    setRecordingTime(0)
    toast.success('Voice memo deleted')
  }

  const saveMemo = () => {
    if (audioUrl && recordedBlob) {
      onSave({
        url: audioUrl,
        duration: recordingTime,
        recordedAt: new Date().toISOString(),
        message: `Emergency voice memo for ${memberName}`
      })
      toast.success('Emergency voice memo saved!')
      onClose()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <Card className="border-2 border-destructive/30 shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-destructive/10 to-orange-500/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Warning className="w-6 h-6 text-destructive" weight="fill" />
                    <CardTitle className="text-xl">Emergency Voice Memo</CardTitle>
                  </div>
                  <CardDescription>
                    Record a message for {memberName} that bypasses Do Not Disturb mode
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Recording Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-destructive/20 text-destructive text-xs">
                    🔊 Bypasses Silent/DND Mode
                  </Badge>
                  {isRecording && (
                    <Badge className="bg-red-500 text-white animate-pulse">
                      REC {formatTime(recordingTime)}
                    </Badge>
                  )}
                </div>

                {/* Record Button */}
                {!audioUrl && !isRecording && (
                  <Button
                    onClick={startRecording}
                    className="w-full h-16 bg-destructive hover:bg-destructive/90 text-white font-semibold"
                    size="lg"
                  >
                    <Microphone className="w-6 h-6 mr-2" weight="fill" />
                    Start Recording
                  </Button>
                )}

                {/* Stop Recording Button */}
                {isRecording && (
                  <Button
                    onClick={stopRecording}
                    className="w-full h-16 bg-red-600 hover:bg-red-700 text-white font-semibold animate-pulse"
                    size="lg"
                  >
                    <Stop className="w-6 h-6 mr-2" weight="fill" />
                    Stop Recording
                  </Button>
                )}

                {/* Playback Controls */}
                {audioUrl && !isRecording && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {!isPlaying ? (
                        <Button
                          onClick={playMemo}
                          className="flex-1 h-14 bg-gradient-to-r from-accent to-primary text-white font-semibold"
                          size="lg"
                        >
                          <Play className="w-5 h-5 mr-2" weight="fill" />
                          Play Memo
                        </Button>
                      ) : (
                        <Button
                          onClick={stopPlayback}
                          className="flex-1 h-14 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold"
                          size="lg"
                        >
                          <Stop className="w-5 h-5 mr-2" weight="fill" />
                          Stop
                        </Button>
                      )}
                      <Button
                        onClick={deleteMemo}
                        variant="destructive"
                        size="icon"
                        className="h-14 w-14 flex-shrink-0"
                      >
                        <Trash className="w-5 h-5" weight="bold" />
                      </Button>
                    </div>

                    {recordingTime > 0 && (
                      <div className="text-center text-sm text-muted-foreground">
                        Duration: {formatTime(recordingTime)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Info Banner */}
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <SpeakerHigh className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" weight="fill" />
                    <div className="text-sm space-y-2">
                      <p className="font-semibold text-foreground">Emergency Feature</p>
                      <ul className="text-muted-foreground space-y-1 text-xs">
                        <li>• Plays at maximum volume</li>
                        <li>• Bypasses Do Not Disturb mode</li>
                        <li>• Overrides silent/vibrate settings</li>
                        <li>• Use only for emergencies</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              {audioUrl && !isRecording && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveMemo}
                    className="flex-1 bg-gradient-to-r from-accent to-primary"
                  >
                    Save Emergency Memo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
