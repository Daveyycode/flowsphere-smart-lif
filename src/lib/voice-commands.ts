/**
 * Voice command utilities for FlowSphere
 * Shared functions and constants for voice recognition across the app
 */

/**
 * Exit phrases that users can say to stop continuous voice listening
 */
export const EXIT_PHRASES = [
  "that's it",
  'thats it',
  'that is it',
  'ok turn off',
  'turn off now',
  'turn off',
  'thanks',
  'thank you',
  'done',
  'stop listening',
  'goodbye',
  'bye',
  'bye bye',
  'stop',
  'quit',
  'exit',
]

/**
 * Detects if the transcript contains an exit phrase
 * @param transcript The voice transcript to check (will be converted to lowercase)
 * @returns true if an exit phrase is detected
 */
export function detectExitPhrase(transcript: string): boolean {
  const lowercaseTranscript = transcript.toLowerCase().trim()
  return EXIT_PHRASES.some(phrase => lowercaseTranscript.includes(phrase))
}

/**
 * Checks if browser supports Web Speech API
 * @returns true if speech recognition is supported
 */
export function supportsSpeechRecognition(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}

/**
 * Gets the SpeechRecognition constructor for the current browser
 * @returns SpeechRecognition constructor or null if not supported
 */
export function getSpeechRecognition(): any {
  if (!supportsSpeechRecognition()) {
    return null
  }
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
}
