/**
 * Real-time News Integration
 * Uses free RSS2JSON service - no API key needed
 */

export interface NewsItem {
  id: string
  title: string
  source: string
  category: string
  time: string
  url?: string
}

const NEWS_CACHE_KEY = 'flowsphere-news-cache'
const NEWS_CACHE_TIMESTAMP_KEY = 'flowsphere-news-cache-timestamp'
const CACHE_DURATION_HOURS = 6

/**
 * Fetch top headlines using RSS2JSON (free, no API key)
 */
export async function fetchDailyNews(category: string = 'general', maxResults: number = 10): Promise<NewsItem[]> {
  try {
    const cachedNews = localStorage.getItem(NEWS_CACHE_KEY)
    const cacheTimestamp = localStorage.getItem(NEWS_CACHE_TIMESTAMP_KEY)

    if (cachedNews && cacheTimestamp) {
      const cacheAge = Date.now() - parseInt(cacheTimestamp)
      const cacheAgeHours = cacheAge / (1000 * 60 * 60)

      if (cacheAgeHours < CACHE_DURATION_HOURS) {
        return JSON.parse(cachedNews)
      }
    }

    // Use RSS2JSON free service with Google News RSS feed
    const rssUrl = encodeURIComponent('https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en')
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&count=${maxResults}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`RSS fetch error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid RSS response')
    }

    const newsItems: NewsItem[] = data.items.map((item: any, index: number) => ({
      id: `news-${Date.now()}-${index}`,
      title: item.title,
      source: item.author || 'Google News',
      category: category,
      time: formatTime(item.pubDate),
      url: item.link
    }))

    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(newsItems))
    localStorage.setItem(NEWS_CACHE_TIMESTAMP_KEY, Date.now().toString())

    return newsItems
  } catch (error) {
    console.error('Error fetching news:', error)

    const cachedNews = localStorage.getItem(NEWS_CACHE_KEY)
    if (cachedNews) {
      return JSON.parse(cachedNews)
    }

    return []
  }
}

/**
 * Format ISO timestamp to relative time
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

/**
 * Clear news cache to force refresh
 */
export function clearNewsCache(): void {
  localStorage.removeItem(NEWS_CACHE_KEY)
  localStorage.removeItem(NEWS_CACHE_TIMESTAMP_KEY)
}
