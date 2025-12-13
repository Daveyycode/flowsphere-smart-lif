/**
 * Web Search Service for FlowSphere AI
 *
 * Provides real-time web search capabilities for the AI assistant.
 * Uses Tavily API (free tier available) for AI-optimized search results.
 *
 * To enable: Add VITE_TAVILY_API_KEY to your .env file
 * Get a free key at: https://tavily.com
 */

import { logger } from '@/lib/security-utils'

export interface SearchResult {
  title: string
  url: string
  content: string
  score: number
  publishedDate?: string
}

export interface SearchResponse {
  success: boolean
  query: string
  results: SearchResult[]
  answer?: string // AI-generated answer from Tavily
  error?: string
}

const TAVILY_API_KEY = import.meta.env.VITE_TAVILY_API_KEY || ''

/**
 * Check if web search is configured
 */
export function isWebSearchEnabled(): boolean {
  return !!TAVILY_API_KEY
}

/**
 * Perform a web search using Tavily API
 */
export async function searchWeb(
  query: string,
  options?: {
    maxResults?: number
    includeAnswer?: boolean
    searchDepth?: 'basic' | 'advanced'
  }
): Promise<SearchResponse> {
  if (!TAVILY_API_KEY) {
    return {
      success: false,
      query,
      results: [],
      error: 'Web search not configured. Add VITE_TAVILY_API_KEY to enable.',
    }
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: options?.maxResults || 5,
        include_answer: options?.includeAnswer ?? true,
        search_depth: options?.searchDepth || 'basic',
        include_images: false,
        include_raw_content: false,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Search failed: ${response.status}`)
    }

    const data = await response.json()

    return {
      success: true,
      query,
      results: (data.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score || 0,
        publishedDate: r.published_date,
      })),
      answer: data.answer,
    }
  } catch (error) {
    logger.error('[WebSearch] Error:', error, 'WebSearch')
    return {
      success: false,
      query,
      results: [],
      error: error instanceof Error ? error.message : 'Search failed',
    }
  }
}

/**
 * Format search results for AI context
 */
export function formatSearchResultsForAI(response: SearchResponse): string {
  if (!response.success) {
    return `Web search failed: ${response.error}`
  }

  if (response.results.length === 0) {
    return 'No relevant search results found.'
  }

  let formatted = ''

  // Include AI answer if available
  if (response.answer) {
    formatted += `**Answer:** ${response.answer}\n\n`
  }

  // Include top results
  formatted += `**Search Results for "${response.query}":**\n\n`
  response.results.forEach((result, index) => {
    formatted += `${index + 1}. **${result.title}**\n`
    formatted += `   ${result.content.substring(0, 200)}...\n`
    formatted += `   Source: ${result.url}\n\n`
  })

  return formatted
}

/**
 * Detect if a query requires web search
 */
export function shouldSearchWeb(query: string): boolean {
  const searchIndicators = [
    // Direct search requests
    'search for',
    'search the web',
    'look up',
    'find information',
    'what is the latest',
    'current',
    'today',
    'recent',
    'news about',
    'update on',
    // Questions about current events
    'what happened',
    "what's happening",
    'who won',
    'score of',
    'weather in',
    'stock price',
    'cryptocurrency price',
    'bitcoin price',
    // Research queries
    'how to',
    'tutorial for',
    'guide to',
    'best way to',
    'reviews of',
    'compare',
  ]

  const lowerQuery = query.toLowerCase()

  // Check for search indicators
  if (searchIndicators.some(indicator => lowerQuery.includes(indicator))) {
    return true
  }

  // Check for question patterns about specific topics
  const questionWords = ['what', 'who', 'when', 'where', 'why', 'how']
  const startsWithQuestion = questionWords.some(w => lowerQuery.startsWith(w))

  // If it's a question about recent/current events
  if (
    startsWithQuestion &&
    (lowerQuery.includes('2024') ||
      lowerQuery.includes('2025') ||
      lowerQuery.includes('latest') ||
      lowerQuery.includes('new'))
  ) {
    return true
  }

  return false
}

/**
 * Quick search for AI assistant
 * Returns a formatted string ready to be added to AI context
 */
export async function quickSearch(query: string): Promise<string> {
  if (!isWebSearchEnabled()) {
    return 'Web search is not configured. I can only answer based on my training data.'
  }

  const response = await searchWeb(query, {
    maxResults: 3,
    includeAnswer: true,
    searchDepth: 'basic',
  })

  return formatSearchResultsForAI(response)
}
