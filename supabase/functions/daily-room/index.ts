import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY')

    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured')
    }

    const { roomName, callType } = await req.json()

    if (!roomName) {
      throw new Error('roomName is required')
    }

    // Create room via Daily.co API
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: callType === 'audio',
          start_audio_off: false,
          max_participants: 2
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Daily.co API error:', error)

      // If room already exists, try to get it
      if (response.status === 400) {
        const getResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`
          }
        })

        if (getResponse.ok) {
          const existingRoom = await getResponse.json()
          return new Response(
            JSON.stringify({ success: true, room: existingRoom }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      throw new Error(`Failed to create room: ${error}`)
    }

    const room = await response.json()

    return new Response(
      JSON.stringify({ success: true, room }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
