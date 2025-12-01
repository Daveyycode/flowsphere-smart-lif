/**
 * AI-Powered Script Generator for Notes
 * Converts recorded notes into human-like, polished scripts
 */

export interface GeneratedScript {
  original: string
  generated: string
  improvements: ScriptImprovement[]
  tone: 'professional' | 'casual' | 'formal' | 'friendly'
  wordCount: number
  readingTime: string
  suggestions: string[]
}

export interface ScriptImprovement {
  type: 'grammar' | 'clarity' | 'flow' | 'tone' | 'structure'
  description: string
  before: string
  after: string
}

export interface ScriptOptions {
  tone?: 'professional' | 'casual' | 'formal' | 'friendly'
  includeGreeting?: boolean
  includeClosing?: boolean
  removeFillers?: boolean
  improvePacing?: boolean
  enhanceClarity?: boolean
}

/**
 * Generate human-like script from notes
 */
export async function generateScriptFromNotes(
  transcript: string,
  options: ScriptOptions = {}
): Promise<GeneratedScript> {
  const {
    tone = 'professional',
    includeGreeting = true,
    includeClosing = true,
    removeFillers = true,
    improvePacing = true,
    enhanceClarity = true
  } = options

  // Clean and process transcript
  let processedText = transcript.trim()

  // Step 1: Remove filler words
  const improvements: ScriptImprovement[] = []

  if (removeFillers) {
    const fillerWords = /\b(um|uh|like|you know|actually|basically|literally|sort of|kind of)\b/gi
    const beforeFiller = processedText
    processedText = processedText.replace(fillerWords, '').replace(/\s{2,}/g, ' ')

    if (beforeFiller !== processedText) {
      improvements.push({
        type: 'clarity',
        description: 'Removed filler words for smoother flow',
        before: 'um, like, you know...',
        after: 'Clear and direct language'
      })
    }
  }

  // Step 2: Improve sentence structure
  if (enhanceClarity) {
    processedText = improveSentenceStructure(processedText)
    improvements.push({
      type: 'structure',
      description: 'Enhanced sentence structure and paragraph breaks',
      before: 'Long run-on sentences',
      after: 'Clear, well-structured sentences'
    })
  }

  // Step 3: Adjust tone
  processedText = adjustTone(processedText, tone)
  improvements.push({
    type: 'tone',
    description: `Adjusted tone to be more ${tone}`,
    before: 'Raw transcript',
    after: `${tone.charAt(0).toUpperCase() + tone.slice(1)} tone applied`
  })

  // Step 4: Add greeting and closing
  const sections: string[] = []

  if (includeGreeting) {
    sections.push(getGreeting(tone))
  }

  sections.push(processedText)

  if (includeClosing) {
    sections.push(getClosing(tone))
  }

  const generatedScript = sections.join('\n\n')

  // Calculate stats
  const wordCount = generatedScript.split(/\s+/).length
  const readingTime = calculateReadingTime(wordCount)

  // Generate suggestions for further improvement
  const suggestions = generateSuggestions(generatedScript, improvements)

  return {
    original: transcript,
    generated: generatedScript,
    improvements,
    tone,
    wordCount,
    readingTime,
    suggestions
  }
}

/**
 * Improve sentence structure
 */
function improveSentenceStructure(text: string): string {
  // Split into sentences
  let sentences = text.split(/([.!?]+)/).filter(s => s.trim().length > 0)

  // Combine sentence content with punctuation
  const structuredSentences: string[] = []
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] || ''
    const punctuation = sentences[i + 1] || '.'
    structuredSentences.push(sentence.trim() + punctuation)
  }

  // Group into paragraphs (every 3-4 sentences)
  const paragraphs: string[] = []
  for (let i = 0; i < structuredSentences.length; i += 3) {
    const paragraph = structuredSentences.slice(i, i + 3).join(' ')
    if (paragraph.trim()) {
      paragraphs.push(paragraph)
    }
  }

  return paragraphs.join('\n\n')
}

/**
 * Adjust tone of text
 */
function adjustTone(text: string, tone: ScriptOptions['tone']): string {
  switch (tone) {
    case 'professional':
      // Use formal language, avoid contractions
      return text
        .replace(/\bcan't\b/gi, 'cannot')
        .replace(/\bdon't\b/gi, 'do not')
        .replace(/\bwon't\b/gi, 'will not')
        .replace(/\bisn't\b/gi, 'is not')
        .replace(/\bhey\b/gi, 'hello')

    case 'casual':
      // Use contractions, friendly language
      return text
        .replace(/\bcannot\b/gi, "can't")
        .replace(/\bdo not\b/gi, "don't")
        .replace(/\bwill not\b/gi, "won't")
        .replace(/\bis not\b/gi, "isn't")

    case 'formal':
      // Very formal, no contractions, proper titles
      return text
        .replace(/\bcan't\b/gi, 'cannot')
        .replace(/\bdon't\b/gi, 'do not')
        .replace(/\bwon't\b/gi, 'will not')
        .replace(/\bisn't\b/gi, 'is not')
        .replace(/\bhey\b/gi, 'Dear')
        .replace(/\bthanks\b/gi, 'Thank you')

    case 'friendly':
      // Warm, approachable
      return text

    default:
      return text
  }
}

/**
 * Get appropriate greeting
 */
function getGreeting(tone: ScriptOptions['tone'] = 'professional'): string {
  const greetings = {
    professional: 'Good morning/afternoon. Thank you for joining me.',
    casual: 'Hey everyone! Thanks for being here.',
    formal: 'Dear colleagues and stakeholders, I appreciate your time and attention.',
    friendly: 'Hi there! Great to connect with you today.'
  }

  return greetings[tone] || greetings.professional
}

/**
 * Get appropriate closing
 */
function getClosing(tone: ScriptOptions['tone'] = 'professional'): string {
  const closings = {
    professional: 'Thank you for your time and attention. Please feel free to reach out with any questions.',
    casual: 'Thanks for listening! Hit me up if you have any questions.',
    formal: 'I thank you for your attention and remain available for any clarifications you may require.',
    friendly: 'Thanks so much! Feel free to reach out anytime with questions or thoughts.'
  }

  return closings[tone] || closings.professional
}

/**
 * Calculate reading time
 */
function calculateReadingTime(wordCount: number): string {
  const wordsPerMinute = 150
  const minutes = Math.ceil(wordCount / wordsPerMinute)

  if (minutes < 1) {
    return 'Less than 1 minute'
  } else if (minutes === 1) {
    return '1 minute'
  } else {
    return `${minutes} minutes`
  }
}

/**
 * Generate suggestions for improvement
 */
function generateSuggestions(script: string, improvements: ScriptImprovement[]): string[] {
  const suggestions: string[] = []

  const wordCount = script.split(/\s+/).length
  const sentenceCount = script.split(/[.!?]+/).filter(s => s.trim().length > 0).length
  const avgWordsPerSentence = wordCount / sentenceCount

  // Word count suggestions
  if (wordCount < 50) {
    suggestions.push('💡 Consider adding more detail and examples to reach your audience better')
  } else if (wordCount > 500) {
    suggestions.push('💡 Your script is quite long. Consider breaking it into multiple parts or removing less essential details')
  }

  // Sentence length suggestions
  if (avgWordsPerSentence > 25) {
    suggestions.push('💡 Some sentences are quite long. Break them down for better clarity and flow')
  } else if (avgWordsPerSentence < 10) {
    suggestions.push('💡 Try combining some short sentences for better flow')
  }

  // Paragraph suggestions
  const paragraphs = script.split('\n\n').filter(p => p.trim().length > 0)
  if (paragraphs.length === 1 && wordCount > 100) {
    suggestions.push('💡 Break your content into multiple paragraphs for better readability')
  }

  // Engagement suggestions
  if (!script.match(/\?/)) {
    suggestions.push('💡 Add rhetorical questions to engage your audience')
  }

  // Call to action
  if (!script.toLowerCase().includes('reach out') && !script.toLowerCase().includes('contact')) {
    suggestions.push('💡 Include a call to action or next steps for your audience')
  }

  // Formatting suggestions
  if (script.length > 200 && !script.includes('\n\n')) {
    suggestions.push('💡 Add paragraph breaks to improve visual readability')
  }

  // Default suggestion
  if (suggestions.length === 0) {
    suggestions.push('✨ Your script looks great! Consider practicing delivery for best results')
  }

  return suggestions
}

/**
 * Get quick improvement tips
 */
export function getScriptImprovementTips(script: string): string[] {
  const tips: string[] = []

  // Check for transitions
  if (!script.includes('furthermore') && !script.includes('additionally') && !script.includes('moreover')) {
    tips.push('Add transition words (furthermore, additionally, moreover) to connect ideas')
  }

  // Check for examples
  if (!script.includes('for example') && !script.includes('for instance') && !script.includes('such as')) {
    tips.push('Include specific examples to illustrate your points')
  }

  // Check for emphasis
  if (!script.includes('important') && !script.includes('crucial') && !script.includes('essential')) {
    tips.push('Highlight key points with emphasis words (important, crucial, essential)')
  }

  // Check for conclusion
  if (!script.includes('conclusion') && !script.includes('summary') && !script.includes('in summary')) {
    tips.push('Add a clear conclusion or summary section')
  }

  return tips
}

/**
 * Format script for email
 */
export function formatScriptForEmail(script: string, subject?: string): string {
  let emailContent = ''

  if (subject) {
    emailContent += `Subject: ${subject}\n\n`
  }

  emailContent += script

  // Ensure professional email formatting
  emailContent = emailContent
    .replace(/\n{3,}/g, '\n\n') // Max 2 line breaks
    .trim()

  return emailContent
}

/**
 * Generate multiple script variations
 */
export async function generateScriptVariations(
  transcript: string
): Promise<Record<string, GeneratedScript>> {
  const tones: Array<ScriptOptions['tone']> = ['professional', 'casual', 'formal', 'friendly']

  const variations: Record<string, GeneratedScript> = {}

  for (const tone of tones) {
    variations[tone] = await generateScriptFromNotes(transcript, { tone })
  }

  return variations
}
