// Supabase Edge Function: Groq AI Proxy
// Keeps GROQ_API_KEY server-side, never exposed to frontend
//
// SETUP: Add secret in Supabase Dashboard > Edge Functions > Secrets:
//   GROQ_API_KEY = your_groq_api_key

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
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured in Edge Function secrets')
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { prompt, model, temperature, max_tokens, messages } = await req.json()

    if (!prompt && !messages) {
      return new Response(
        JSON.stringify({ error: 'Prompt or messages required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build messages array
    const chatMessages = messages || [{ role: 'user', content: prompt }]

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages: chatMessages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 2048,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('Groq API error:', error)
      return new Response(
        JSON.stringify({ error: error.error?.message || 'AI request failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    return new Response(
      JSON.stringify({
        content,
        usage: data.usage,
        model: data.model,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
