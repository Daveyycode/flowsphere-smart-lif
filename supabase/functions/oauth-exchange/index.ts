// Supabase Edge Function: OAuth Token Exchange
// Keeps OAuth client secrets server-side, never exposed to frontend
//
// SETUP: Add secrets in Supabase Dashboard > Edge Functions > Secrets:
//   GOOGLE_CLIENT_ID = your_google_client_id
//   GOOGLE_CLIENT_SECRET = your_google_client_secret
//   YAHOO_CLIENT_ID = your_yahoo_client_id (optional)
//   YAHOO_CLIENT_SECRET = your_yahoo_client_secret (optional)
//   OUTLOOK_CLIENT_ID = your_outlook_client_id (optional)
//   OUTLOOK_CLIENT_SECRET = your_outlook_client_secret (optional)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenExchangeRequest {
  provider: 'google' | 'yahoo' | 'outlook'
  code: string
  redirectUri: string
  action: 'exchange' | 'refresh'
  refreshToken?: string
  codeVerifier?: string // PKCE code verifier for Microsoft OAuth
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { provider, code, redirectUri, action, refreshToken, codeVerifier }: TokenExchangeRequest = await req.json()

    console.log(`[OAuth] Request received - provider: ${provider}, action: ${action}`)
    console.log(`[OAuth] Redirect URI: ${redirectUri}`)
    console.log(`[OAuth] PKCE code verifier provided: ${!!codeVerifier}`)

    if (!provider || !['google', 'yahoo', 'outlook'].includes(provider)) {
      return new Response(
        JSON.stringify({ error: 'Invalid provider. Use: google, yahoo, outlook' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get credentials from secure environment
    let clientId: string | undefined
    let clientSecret: string | undefined
    let tokenUrl: string

    switch (provider) {
      case 'google':
        clientId = Deno.env.get('GOOGLE_CLIENT_ID')
        clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
        tokenUrl = 'https://oauth2.googleapis.com/token'
        break
      case 'yahoo':
        clientId = Deno.env.get('YAHOO_CLIENT_ID')
        clientSecret = Deno.env.get('YAHOO_CLIENT_SECRET')
        tokenUrl = 'https://api.login.yahoo.com/oauth2/get_token'
        break
      case 'outlook':
        clientId = Deno.env.get('OUTLOOK_CLIENT_ID')
        clientSecret = Deno.env.get('OUTLOOK_CLIENT_SECRET')
        tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Unsupported provider' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    console.log(`[OAuth] ${provider} - Client ID configured: ${!!clientId}`)
    console.log(`[OAuth] ${provider} - Client Secret configured: ${!!clientSecret}`)

    if (!clientId || !clientSecret) {
      console.error(`${provider} OAuth credentials not configured - clientId: ${!!clientId}, clientSecret: ${!!clientSecret}`)
      return new Response(
        JSON.stringify({ error: `${provider} OAuth not configured - missing credentials` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build token request body
    let body: URLSearchParams

    if (action === 'refresh' && refreshToken) {
      // Refresh token flow
      body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      })
    } else if (action === 'exchange' && code) {
      // Authorization code exchange flow
      body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      })

      // Add PKCE code_verifier for Microsoft OAuth (required for SPAs)
      if (provider === 'outlook' && codeVerifier) {
        body.append('code_verifier', codeVerifier)
        console.log('[OAuth] Added PKCE code_verifier for Outlook')
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid request: code or refreshToken required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Make token request
    console.log(`[OAuth] Making token request to: ${tokenUrl}`)

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    console.log(`[OAuth] Token endpoint response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[OAuth] ${provider} token exchange failed - Status: ${response.status}`)
      console.error(`[OAuth] Error response: ${errorText}`)

      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { error: errorText }
      }

      return new Response(
        JSON.stringify({
          error: error.error_description || error.error || 'Token exchange failed',
          details: error
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    console.log(`[OAuth] ${provider} token exchange successful`)

    // Return tokens (never expose client_secret)
    return new Response(
      JSON.stringify({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('OAuth exchange error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
