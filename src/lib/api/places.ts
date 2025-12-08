/**
 * Google Places Autocomplete API
 * Provides real-time address suggestions as users type
 */

export interface PlacePrediction {
  id: string
  name: string
  address: string
  coordinates?: { lat: number; lng: number }
  placeId?: string
}

// API keys from environment
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const LOCATIONIQ_API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY || ''

// Track if Google Maps script is loaded
let googleMapsLoaded = false
let googleMapsLoading = false
let googleMapsError = false // Track if API failed (not activated, etc.)
let loadPromise: Promise<void> | null = null

/**
 * Load Google Maps JavaScript API with Places library
 */
export async function loadGoogleMapsAPI(): Promise<boolean> {
  if (googleMapsLoaded) return true
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('[Places] No Google Maps API key configured. Using fallback.')
    return false
  }

  if (googleMapsLoading && loadPromise) {
    await loadPromise
    return googleMapsLoaded
  }

  googleMapsLoading = true
  loadPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      googleMapsLoaded = true
      googleMapsLoading = false
      resolve()
    }
    script.onerror = () => {
      console.error('[Places] Failed to load Google Maps API')
      googleMapsLoading = false
      resolve()
    }
    document.head.appendChild(script)
  })

  await loadPromise
  return googleMapsLoaded
}

/**
 * Get place predictions using Google Places Autocomplete
 */
export async function getPlacePredictions(
  query: string,
  options?: {
    types?: string[]
    componentRestrictions?: { country: string | string[] }
  }
): Promise<PlacePrediction[]> {
  if (!query || query.length < 2) return []

  // Try Google Places API first (if not previously errored)
  if (GOOGLE_MAPS_API_KEY && !googleMapsError) {
    try {
      const loaded = await loadGoogleMapsAPI()
      if (loaded && window.google?.maps?.places) {
        const results = await getGooglePredictions(query, options)
        // If we got results, Google API is working
        if (results.length > 0) {
          return results
        }
        // If no results, could be the query or API issue - try Nominatim too
      }
    } catch (error) {
      console.warn('[Places] Google API error, falling back to Nominatim:', error)
      googleMapsError = true // Don't retry Google API this session
    }
  }

  // Try LocationIQ (more accurate, free tier)
  if (LOCATIONIQ_API_KEY) {
    try {
      const results = await getLocationIQPredictions(query)
      if (results.length > 0) return results
    } catch (error) {
      console.warn('[Places] LocationIQ error:', error)
    }
  }

  // Fallback to OpenStreetMap Nominatim
  return await getNominatimPredictions(query)
}

/**
 * Get predictions from Google Places API
 */
async function getGooglePredictions(
  query: string,
  options?: {
    types?: string[]
    componentRestrictions?: { country: string | string[] }
  }
): Promise<PlacePrediction[]> {
  return new Promise((resolve, reject) => {
    try {
      const service = new window.google.maps.places.AutocompleteService()

      service.getPlacePredictions(
        {
          input: query,
          types: options?.types || ['geocode', 'establishment'],
          componentRestrictions: options?.componentRestrictions,
        },
        (predictions, status) => {
          // Check for API errors (not activated, quota exceeded, etc.)
          if (status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT') {
            console.warn('[Places] Google API error:', status)
            googleMapsError = true
            resolve([]) // Return empty, caller will fallback to Nominatim
            return
          }

          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
            resolve([])
            return
          }

          const results: PlacePrediction[] = predictions.map((prediction) => ({
            id: prediction.place_id,
            name: prediction.structured_formatting.main_text,
            address: prediction.description,
            placeId: prediction.place_id,
          }))

          resolve(results)
        }
      )
    } catch (error) {
      console.warn('[Places] Google AutocompleteService error:', error)
      googleMapsError = true
      reject(error)
    }
  })
}

/**
 * Get place details including coordinates
 */
export async function getPlaceDetails(placeId: string): Promise<PlacePrediction | null> {
  if (!placeId || !window.google?.maps?.places) return null

  return new Promise((resolve) => {
    const service = new window.google.maps.places.PlacesService(
      document.createElement('div')
    )

    service.getDetails(
      {
        placeId,
        fields: ['name', 'formatted_address', 'geometry'],
      },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) {
          resolve(null)
          return
        }

        resolve({
          id: placeId,
          name: place.name || '',
          address: place.formatted_address || '',
          placeId,
          coordinates: place.geometry?.location
            ? {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              }
            : undefined,
        })
      }
    )
  })
}

/**
 * LocationIQ: More accurate geocoding with free tier (5,000 req/day)
 * Sign up at: https://locationiq.com/
 * Focused on Asia/Philippines for better local results
 */
async function getLocationIQPredictions(query: string): Promise<PlacePrediction[]> {
  try {
    // Focus on Philippines/Asia for better local results
    // viewbox: Philippines bounding box, bounded=0 to prioritize but not restrict
    const response = await fetch(
      `https://us1.locationiq.com/v1/autocomplete?` +
        `key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(query)}&limit=8&dedupe=1` +
        `&countrycodes=ph,sg,my,th,id,vn,jp,kr,hk,tw` + // Asia-Pacific
        `&viewbox=116.0,4.5,127.0,21.5&bounded=0`, // Philippines viewbox, not strict
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error('[Places] LocationIQ request failed:', response.status)
      return []
    }

    const data = await response.json()

    return data.map((item: any) => {
      // Parse the display name for better formatting
      const parts = item.display_name.split(', ')
      const mainText = item.display_place || parts[0]
      const secondaryText = item.display_address || parts.slice(1, 4).join(', ')

      return {
        id: `locationiq-${item.place_id}`,
        name: mainText,
        address: secondaryText || item.display_name,
        coordinates: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        },
      }
    })
  } catch (error) {
    console.error('[Places] LocationIQ error:', error)
    return []
  }
}

/**
 * Fallback: Get predictions from OpenStreetMap Nominatim (free, no API key)
 * Focused on Asia/Philippines for better local results
 */
async function getNominatimPredictions(query: string): Promise<PlacePrediction[]> {
  try {
    // Focus on Asia/Philippines for better local results
    // viewbox: Philippines and nearby Southeast Asian region
    // bounded=1 means prioritize results in viewbox but allow others
    const viewbox = '116.0,4.5,127.0,21.5' // Philippines bounding box

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1` +
        `&countrycodes=ph,sg,my,th,id,vn,jp,kr,hk,tw` + // Asia-Pacific countries
        `&viewbox=${viewbox}&bounded=0`, // Prioritize but don't restrict
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'FlowSphere/1.0',
        },
      }
    )

    if (!response.ok) {
      console.error('[Places] Nominatim request failed:', response.status)
      return []
    }

    const data = await response.json()

    return data.map((item: any, index: number) => {
      // Format the address nicely
      const parts = item.display_name.split(', ')
      const mainText = parts[0]
      const secondaryText = parts.slice(1, 4).join(', ')

      return {
        id: `nominatim-${index}-${Date.now()}`,
        name: mainText,
        address: secondaryText || item.display_name,
        coordinates: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        },
      }
    })
  } catch (error) {
    console.error('[Places] Nominatim error:', error)
    return []
  }
}

/**
 * Check if Google Places API is available
 */
export function isGooglePlacesAvailable(): boolean {
  return !!GOOGLE_MAPS_API_KEY && googleMapsLoaded
}

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          AutocompleteService: new () => {
            getPlacePredictions: (
              request: {
                input: string
                types?: string[]
                componentRestrictions?: { country: string | string[] }
              },
              callback: (
                predictions: Array<{
                  place_id: string
                  description: string
                  structured_formatting: {
                    main_text: string
                    secondary_text: string
                  }
                }> | null,
                status: string
              ) => void
            ) => void
          }
          PlacesService: new (element: HTMLElement) => {
            getDetails: (
              request: { placeId: string; fields: string[] },
              callback: (
                place: {
                  name?: string
                  formatted_address?: string
                  geometry?: {
                    location: {
                      lat: () => number
                      lng: () => number
                    }
                  }
                } | null,
                status: string
              ) => void
            ) => void
          }
          PlacesServiceStatus: {
            OK: string
          }
        }
      }
    }
  }
}
