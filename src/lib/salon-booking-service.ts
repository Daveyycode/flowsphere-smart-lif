/**
 * Salon Booking Service
 * Finds salons and makes AI-powered reservations
 */

export interface Salon {
  id: string
  name: string
  address: string
  phone: string
  email: string
  website?: string
  rating: number
  reviewCount: number
  distance: number // in miles
  priceRange: '$' | '$$' | '$$$' | '$$$$'
  services: SalonService[]
  hours: BusinessHours
  specialties: string[]
  images: string[]
  verified: boolean
}

export interface SalonService {
  id: string
  name: string
  description: string
  duration: number // minutes
  price: number
  category: 'haircut' | 'color' | 'styling' | 'treatment' | 'nails' | 'spa'
}

export interface BusinessHours {
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
}

export interface BookingRequest {
  salonId: string
  service: string
  preferredDate: string
  preferredTime: string
  customerName: string
  customerPhone: string
  customerEmail: string
  notes?: string
}

export interface AIBookingResult {
  success: boolean
  confirmed: boolean
  confirmationNumber?: string
  message: string
  contactMethod: 'email' | 'phone' | 'sms'
  cost: number
}

// Search criteria types
export type SearchCriteria = 'nearest' | 'most-trusted' | 'cheapest' | 'vip'

/**
 * Search for salons based on criteria
 * Uses real-time data from browser search if needed
 */
export async function searchSalons(
  criteria: SearchCriteria,
  serviceType: string,
  userLocation: { lat: number; lng: number },
  useBrowserSearch: boolean = true
): Promise<Salon[]> {
  // In production, this would call real APIs (Google Places, Yelp, etc.)
  // For now, we'll return mock data with realistic information

  const mockSalons: Salon[] = [
    {
      id: 'salon-1',
      name: 'Glamour Studio',
      address: '123 Main St, San Francisco, CA 94102',
      phone: '+1 (415) 555-0123',
      email: 'booking@glamourstudio.com',
      website: 'https://glamourstudio.com',
      rating: 4.8,
      reviewCount: 342,
      distance: 0.5,
      priceRange: '$$$',
      services: [
        {
          id: 'svc-1',
          name: 'Women\'s Haircut & Style',
          description: 'Professional cut with wash and style',
          duration: 60,
          price: 85,
          category: 'haircut'
        },
        {
          id: 'svc-2',
          name: 'Full Balayage',
          description: 'Hand-painted highlights',
          duration: 180,
          price: 250,
          category: 'color'
        }
      ],
      hours: {
        monday: '9:00 AM - 7:00 PM',
        tuesday: '9:00 AM - 7:00 PM',
        wednesday: '9:00 AM - 7:00 PM',
        thursday: '9:00 AM - 8:00 PM',
        friday: '9:00 AM - 8:00 PM',
        saturday: '8:00 AM - 6:00 PM',
        sunday: 'Closed'
      },
      specialties: ['Balayage', 'Color Correction', 'Extensions'],
      images: [],
      verified: true
    },
    {
      id: 'salon-2',
      name: 'Luxury Hair Lounge',
      address: '456 Market St, San Francisco, CA 94103',
      phone: '+1 (415) 555-0456',
      email: 'appointments@luxuryhair.com',
      website: 'https://luxuryhairlounge.com',
      rating: 4.9,
      reviewCount: 528,
      distance: 1.2,
      priceRange: '$$$$',
      services: [
        {
          id: 'svc-3',
          name: 'Premium Haircut',
          description: 'Luxury haircut experience',
          duration: 90,
          price: 150,
          category: 'haircut'
        },
        {
          id: 'svc-4',
          name: 'Keratin Treatment',
          description: 'Professional smoothing treatment',
          duration: 240,
          price: 400,
          category: 'treatment'
        }
      ],
      hours: {
        monday: '10:00 AM - 8:00 PM',
        tuesday: '10:00 AM - 8:00 PM',
        wednesday: '10:00 AM - 8:00 PM',
        thursday: '10:00 AM - 8:00 PM',
        friday: '10:00 AM - 8:00 PM',
        saturday: '9:00 AM - 7:00 PM',
        sunday: '10:00 AM - 6:00 PM'
      },
      specialties: ['Keratin', 'Brazilian Blowout', 'Luxury Services'],
      images: [],
      verified: true
    },
    {
      id: 'salon-3',
      name: 'Budget Cuts & Style',
      address: '789 Valencia St, San Francisco, CA 94110',
      phone: '+1 (415) 555-0789',
      email: 'hello@budgetcuts.com',
      rating: 4.2,
      reviewCount: 156,
      distance: 2.1,
      priceRange: '$',
      services: [
        {
          id: 'svc-5',
          name: 'Quick Haircut',
          description: 'Fast and affordable cut',
          duration: 30,
          price: 35,
          category: 'haircut'
        },
        {
          id: 'svc-6',
          name: 'Basic Color',
          description: 'Single process color',
          duration: 90,
          price: 75,
          category: 'color'
        }
      ],
      hours: {
        monday: '9:00 AM - 6:00 PM',
        tuesday: '9:00 AM - 6:00 PM',
        wednesday: '9:00 AM - 6:00 PM',
        thursday: '9:00 AM - 6:00 PM',
        friday: '9:00 AM - 6:00 PM',
        saturday: '9:00 AM - 5:00 PM',
        sunday: 'Closed'
      },
      specialties: ['Quick Service', 'Walk-ins Welcome'],
      images: [],
      verified: false
    }
  ]

  // Sort based on criteria
  let sortedSalons = [...mockSalons]

  switch (criteria) {
    case 'nearest':
      sortedSalons.sort((a, b) => a.distance - b.distance)
      break
    case 'most-trusted':
      sortedSalons.sort((a, b) => {
        // Sort by rating * reviewCount (trust score)
        const trustScoreA = a.rating * Math.log(a.reviewCount + 1)
        const trustScoreB = b.rating * Math.log(b.reviewCount + 1)
        return trustScoreB - trustScoreA
      })
      break
    case 'cheapest':
      sortedSalons = sortedSalons.filter(s => s.priceRange === '$' || s.priceRange === '$$')
      sortedSalons.sort((a, b) => {
        const priceOrder = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 }
        return priceOrder[a.priceRange] - priceOrder[b.priceRange]
      })
      break
    case 'vip':
      sortedSalons = sortedSalons.filter(s => s.priceRange === '$$$' || s.priceRange === '$$$$')
      sortedSalons.sort((a, b) => {
        const priceOrder = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 }
        return priceOrder[b.priceRange] - priceOrder[a.priceRange]
      })
      break
  }

  // Return top 3
  return sortedSalons.slice(0, 3)
}

/**
 * Fetch real-time salon data using browser search
 */
export async function fetchRealtimeSalonData(
  salonName: string,
  location: string
): Promise<Partial<Salon> | null> {
  // This would integrate with Google Places API, Yelp API, etc.
  // For now, returns mock data
  console.log(`Fetching real-time data for ${salonName} in ${location}`)

  return {
    rating: 4.5,
    reviewCount: 250,
    verified: true
  }
}

/**
 * Make AI-powered booking via email
 */
export async function makeAIEmailBooking(
  salon: Salon,
  booking: BookingRequest,
  userApproved: boolean
): Promise<AIBookingResult> {
  if (!userApproved) {
    return {
      success: false,
      confirmed: false,
      message: 'Booking cancelled - user did not approve',
      contactMethod: 'email',
      cost: 0
    }
  }

  // Simulate AI email generation and sending
  const emailContent = generateBookingEmail(salon, booking)

  console.log('AI Email Content:', emailContent)

  // In production, this would actually send the email using user's API keys
  // and deduct credits from their balance

  return {
    success: true,
    confirmed: false, // Requires salon confirmation
    message: `Booking request sent to ${salon.name} via email. You'll receive a confirmation within 24 hours.`,
    contactMethod: 'email',
    cost: 0.50 // Cost of AI email from credit system
  }
}

/**
 * Make AI-powered booking via phone call
 */
export async function makeAIPhoneBooking(
  salon: Salon,
  booking: BookingRequest,
  userApproved: boolean
): Promise<AIBookingResult> {
  if (!userApproved) {
    return {
      success: false,
      confirmed: false,
      message: 'Booking cancelled - user did not approve',
      contactMethod: 'phone',
      cost: 0
    }
  }

  // Simulate AI phone call
  console.log(`AI calling ${salon.phone} to make booking`)

  // In production, this would use AI voice calling service
  // with user's API keys and deduct credits

  return {
    success: true,
    confirmed: true,
    confirmationNumber: `CONF-${Date.now()}`,
    message: `Booking confirmed at ${salon.name} for ${booking.preferredDate} at ${booking.preferredTime}`,
    contactMethod: 'phone',
    cost: 2.00 // Cost of AI phone call from credit system
  }
}

/**
 * Make AI-powered booking via SMS
 */
export async function makeAISMSBooking(
  salon: Salon,
  booking: BookingRequest,
  userApproved: boolean
): Promise<AIBookingResult> {
  if (!userApproved) {
    return {
      success: false,
      confirmed: false,
      message: 'Booking cancelled - user did not approve',
      contactMethod: 'sms',
      cost: 0
    }
  }

  const smsContent = generateBookingSMS(salon, booking)

  console.log('AI SMS Content:', smsContent)

  return {
    success: true,
    confirmed: false,
    message: `Booking request sent to ${salon.name} via SMS. They'll reply to confirm.`,
    contactMethod: 'sms',
    cost: 0.75 // Cost of AI SMS from credit system
  }
}

/**
 * Generate booking email content
 */
function generateBookingEmail(salon: Salon, booking: BookingRequest): string {
  return `
Subject: Booking Request - ${booking.service}

Dear ${salon.name},

I would like to book an appointment for the following:

Service: ${booking.service}
Preferred Date: ${booking.preferredDate}
Preferred Time: ${booking.preferredTime}

Customer Information:
Name: ${booking.customerName}
Phone: ${booking.customerPhone}
Email: ${booking.customerEmail}

${booking.notes ? `Additional Notes: ${booking.notes}` : ''}

Please confirm this appointment at your earliest convenience.

Thank you,
${booking.customerName}

---
This message was sent via FlowSphere AI Assistant
  `.trim()
}

/**
 * Generate booking SMS content
 */
function generateBookingSMS(salon: Salon, booking: BookingRequest): string {
  return `Hi ${salon.name}, I'd like to book ${booking.service} on ${booking.preferredDate} at ${booking.preferredTime}. Name: ${booking.customerName}, Phone: ${booking.customerPhone}. Please confirm. Thanks!`
}

/**
 * Get service recommendations based on hair needs
 */
export function getServiceRecommendations(hairNeeds: string): string[] {
  const recommendations: Record<string, string[]> = {
    'haircut': ['Women\'s Haircut', 'Men\'s Haircut', 'Kids Haircut', 'Trim'],
    'color': ['Full Color', 'Highlights', 'Balayage', 'Color Correction', 'Root Touch-up'],
    'treatment': ['Keratin Treatment', 'Deep Conditioning', 'Scalp Treatment', 'Brazilian Blowout'],
    'styling': ['Blowout', 'Updo', 'Curls', 'Special Occasion Style'],
    'length': ['Extensions', 'Weave', 'Hair Addition'],
    'texture': ['Perm', 'Relaxer', 'Straightening']
  }

  const lowerNeeds = hairNeeds.toLowerCase()

  for (const [key, services] of Object.entries(recommendations)) {
    if (lowerNeeds.includes(key)) {
      return services
    }
  }

  return ['General Consultation', 'Hair Assessment', 'Styling']
}
