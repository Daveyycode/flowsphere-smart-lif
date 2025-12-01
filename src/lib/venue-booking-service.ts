/**
 * Venue & Restaurant Booking Service
 * Finds venues/restaurants and makes AI-powered reservations
 */

export interface Venue {
  id: string
  name: string
  type: 'restaurant' | 'cafe' | 'bar' | 'event-venue' | 'meeting-room'
  address: string
  phone: string
  email: string
  website?: string
  rating: number
  reviewCount: number
  distance: number
  priceRange: '$' | '$$' | '$$$' | '$$$$'
  cuisine?: string[]
  capacity: number
  amenities: string[]
  hours: BusinessHours
  images: string[]
  verified: boolean
  availableForEvents: boolean
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

export interface VenueBookingRequest {
  venueId: string
  occasion: string
  date: string
  time: string
  partySize: number
  customerName: string
  customerPhone: string
  customerEmail: string
  specialRequests?: string
}

export type VenueSearchCriteria = 'nearest' | 'highest-rated' | 'budget-friendly' | 'upscale'

/**
 * Search for venues/restaurants
 */
export async function searchVenues(
  criteria: VenueSearchCriteria,
  type: Venue['type'],
  occasion: string,
  userLocation: { lat: number; lng: number }
): Promise<Venue[]> {
  // Mock data - in production would use Google Places, Yelp, OpenTable APIs
  const mockVenues: Venue[] = [
    {
      id: 'venue-1',
      name: 'The Garden Bistro',
      type: 'restaurant',
      address: '234 Valencia St, San Francisco, CA 94103',
      phone: '+1 (415) 555-2345',
      email: 'reservations@gardenbistro.com',
      website: 'https://gardenbistro.com',
      rating: 4.7,
      reviewCount: 892,
      distance: 0.8,
      priceRange: '$$',
      cuisine: ['Mediterranean', 'Vegetarian', 'Organic'],
      capacity: 120,
      amenities: ['Outdoor Seating', 'Private Dining', 'Full Bar', 'Parking'],
      hours: {
        monday: 'Closed',
        tuesday: '11:00 AM - 10:00 PM',
        wednesday: '11:00 AM - 10:00 PM',
        thursday: '11:00 AM - 10:00 PM',
        friday: '11:00 AM - 11:00 PM',
        saturday: '10:00 AM - 11:00 PM',
        sunday: '10:00 AM - 9:00 PM'
      },
      images: [],
      verified: true,
      availableForEvents: true
    },
    {
      id: 'venue-2',
      name: 'Skyline Event Space',
      type: 'event-venue',
      address: '567 Market St, 25th Floor, San Francisco, CA 94105',
      phone: '+1 (415) 555-5678',
      email: 'events@skylinevenuesfcom',
      website: 'https://skylinevenue.com',
      rating: 4.9,
      reviewCount: 324,
      distance: 1.5,
      priceRange: '$$$$',
      capacity: 200,
      amenities: ['AV Equipment', 'Catering Kitchen', 'City Views', 'WiFi', 'Parking', 'Stage'],
      hours: {
        monday: '8:00 AM - 10:00 PM',
        tuesday: '8:00 AM - 10:00 PM',
        wednesday: '8:00 AM - 10:00 PM',
        thursday: '8:00 AM - 10:00 PM',
        friday: '8:00 AM - 11:00 PM',
        saturday: '9:00 AM - 11:00 PM',
        sunday: '9:00 AM - 8:00 PM'
      },
      images: [],
      verified: true,
      availableForEvents: true
    },
    {
      id: 'venue-3',
      name: 'Taco Loco',
      type: 'restaurant',
      address: '890 Mission St, San Francisco, CA 94103',
      phone: '+1 (415) 555-8900',
      email: 'info@tacoloco.com',
      rating: 4.3,
      reviewCount: 567,
      distance: 0.3,
      priceRange: '$',
      cuisine: ['Mexican', 'Tacos', 'Casual'],
      capacity: 60,
      amenities: ['Takeout', 'Delivery', 'Outdoor Seating'],
      hours: {
        monday: '11:00 AM - 9:00 PM',
        tuesday: '11:00 AM - 9:00 PM',
        wednesday: '11:00 AM - 9:00 PM',
        thursday: '11:00 AM - 9:00 PM',
        friday: '11:00 AM - 10:00 PM',
        saturday: '10:00 AM - 10:00 PM',
        sunday: '10:00 AM - 9:00 PM'
      },
      images: [],
      verified: false,
      availableForEvents: false
    },
    {
      id: 'venue-4',
      name: 'La Maison Fine Dining',
      type: 'restaurant',
      address: '123 Nob Hill Ave, San Francisco, CA 94108',
      phone: '+1 (415) 555-1234',
      email: 'reserve@lamaison.com',
      website: 'https://lamaisonsf.com',
      rating: 4.9,
      reviewCount: 1243,
      distance: 2.1,
      priceRange: '$$$$',
      cuisine: ['French', 'Fine Dining', 'Wine Bar'],
      capacity: 80,
      amenities: ['Private Dining', 'Sommelier', 'Valet Parking', 'Dress Code'],
      hours: {
        monday: 'Closed',
        tuesday: '5:00 PM - 10:00 PM',
        wednesday: '5:00 PM - 10:00 PM',
        thursday: '5:00 PM - 10:00 PM',
        friday: '5:00 PM - 11:00 PM',
        saturday: '5:00 PM - 11:00 PM',
        sunday: '5:00 PM - 9:00 PM'
      },
      images: [],
      verified: true,
      availableForEvents: true
    }
  ]

  let sorted = [...mockVenues]

  // Filter by type
  if (type !== 'restaurant') {
    sorted = sorted.filter(v => v.type === type)
  }

  // Sort by criteria
  switch (criteria) {
    case 'nearest':
      sorted.sort((a, b) => a.distance - b.distance)
      break
    case 'highest-rated':
      sorted.sort((a, b) => {
        const scoreA = a.rating * Math.log(a.reviewCount + 1)
        const scoreB = b.rating * Math.log(b.reviewCount + 1)
        return scoreB - scoreA
      })
      break
    case 'budget-friendly':
      sorted = sorted.filter(v => v.priceRange === '$' || v.priceRange === '$$')
      sorted.sort((a, b) => {
        const order = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 }
        return order[a.priceRange] - order[b.priceRange]
      })
      break
    case 'upscale':
      sorted = sorted.filter(v => v.priceRange === '$$$' || v.priceRange === '$$$$')
      sorted.sort((a, b) => b.rating - a.rating)
      break
  }

  return sorted.slice(0, 3)
}

/**
 * Make AI booking at venue
 */
export async function makeVenueAIBooking(
  venue: Venue,
  booking: VenueBookingRequest,
  contactMethod: 'email' | 'phone' | 'sms',
  userApproved: boolean
): Promise<{
  success: boolean
  confirmed: boolean
  message: string
  confirmationNumber?: string
  cost: number
}> {
  if (!userApproved) {
    return {
      success: false,
      confirmed: false,
      message: 'Booking cancelled',
      cost: 0
    }
  }

  let message = ''
  let cost = 0

  switch (contactMethod) {
    case 'email':
      message = generateVenueEmailBooking(venue, booking)
      cost = 0.50
      console.log('AI Email:', message)
      return {
        success: true,
        confirmed: false,
        message: `Reservation request sent to ${venue.name}. You'll receive confirmation via email.`,
        cost
      }

    case 'phone':
      cost = 2.00
      console.log(`AI calling ${venue.phone} for reservation`)
      return {
        success: true,
        confirmed: true,
        confirmationNumber: `RES-${Date.now()}`,
        message: `Reservation confirmed at ${venue.name} for ${booking.partySize} guests on ${booking.date} at ${booking.time}`,
        cost
      }

    case 'sms':
      message = generateVenueSMSBooking(venue, booking)
      cost = 0.75
      console.log('AI SMS:', message)
      return {
        success: true,
        confirmed: false,
        message: `Reservation request sent via SMS. ${venue.name} will confirm shortly.`,
        cost
      }
  }
}

function generateVenueEmailBooking(venue: Venue, booking: VenueBookingRequest): string {
  return `
Subject: Reservation Request - ${booking.occasion}

Dear ${venue.name},

I would like to make a reservation:

Occasion: ${booking.occasion}
Date: ${booking.date}
Time: ${booking.time}
Party Size: ${booking.partySize} guests

Customer Information:
Name: ${booking.customerName}
Phone: ${booking.customerPhone}
Email: ${booking.customerEmail}

${booking.specialRequests ? `Special Requests:\n${booking.specialRequests}\n\n` : ''}
Please confirm this reservation at your earliest convenience.

Thank you,
${booking.customerName}

---
This message was sent via FlowSphere AI Assistant
  `.trim()
}

function generateVenueSMSBooking(venue: Venue, booking: VenueBookingRequest): string {
  return `Hi ${venue.name}! I'd like to reserve a table for ${booking.partySize} on ${booking.date} at ${booking.time} for ${booking.occasion}. Name: ${booking.customerName}, Phone: ${booking.customerPhone}. Please confirm!`
}

/**
 * Get occasion recommendations
 */
export function getOccasionRecommendations(venueType: Venue['type']): string[] {
  const recommendations: Record<Venue['type'], string[]> = {
    'restaurant': ['Dinner', 'Lunch', 'Birthday', 'Anniversary', 'Date Night', 'Business Meal'],
    'cafe': ['Coffee Meeting', 'Brunch', 'Work Session', 'Casual Meetup'],
    'bar': ['Happy Hour', 'After Work Drinks', 'Celebration', 'Social Gathering'],
    'event-venue': ['Wedding', 'Corporate Event', 'Conference', 'Party', 'Fundraiser', 'Workshop'],
    'meeting-room': ['Business Meeting', 'Interview', 'Presentation', 'Training Session']
  }

  return recommendations[venueType] || ['General Reservation']
}
