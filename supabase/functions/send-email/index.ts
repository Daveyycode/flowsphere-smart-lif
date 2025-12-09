// Supabase Edge Function: Resend Email Proxy
// Keeps RESEND_API_KEY server-side, never exposed to frontend
//
// SETUP: Add secrets in Supabase Dashboard > Edge Functions > Secrets:
//   RESEND_API_KEY = your_resend_api_key
//   EMAIL_FROM = FlowSphere <noreply@myflowsphere.com>

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
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'FlowSphere <noreply@myflowsphere.com>'

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured in Edge Function secrets')
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { to, subject, body, html, replyTo } = await req.json()

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ success: false, error: 'Recipient and subject required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        text: body || '',
        html: html || (body ? body.replace(/\n/g, '<br>') : ''),
        reply_to: replyTo,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('Resend API error:', error)

      if (response.status === 401) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (response.status === 403) {
        return new Response(
          JSON.stringify({ success: false, error: 'Domain not verified' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: false, error: error.message || 'Failed to send email' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
