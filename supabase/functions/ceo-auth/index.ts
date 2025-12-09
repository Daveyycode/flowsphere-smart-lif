// Supabase Edge Function: CEO Authentication
// Server-side only - credentials NEVER exposed to frontend
//
// SETUP REQUIRED:
// 1. Set these secrets in Supabase Dashboard > Edge Functions > Secrets:
//    - CEO_USERNAME: The CEO's username
//    - CEO_PASSWORD_HASH: SHA-256 hash of the CEO's password
//    - CEO_EMAIL: The CEO's email address
//
// To generate password hash, run in browser console:
//   const password = 'your_password';
//   const encoder = new TextEncoder();
//   const data = encoder.encode(password);
//   const hashBuffer = await crypto.subtle.digest('SHA-256', data);
//   const hashArray = Array.from(new Uint8Array(hashBuffer));
//   console.log(hashArray.map(b => b.toString(16).padStart(2, '0')).join(''));

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hash password using SHA-256
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate secure session token
function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, username, password, sessionToken } = await req.json()

    // Get CEO credentials from secure environment (NOT exposed to frontend)
    const ceoUsername = Deno.env.get('CEO_USERNAME')
    const ceoPasswordHash = Deno.env.get('CEO_PASSWORD_HASH')
    const ceoEmail = Deno.env.get('CEO_EMAIL')

    if (!ceoUsername || !ceoPasswordHash) {
      console.error('CEO credentials not configured in Edge Function secrets')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get client info for logging
    const ipAddress = req.headers.get('x-forwarded-for') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // ========== LOGIN ACTION ==========
    if (action === 'login') {
      if (!username || !password) {
        return new Response(
          JSON.stringify({ error: 'Username and password required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Hash the provided password
      const providedHash = await hashPassword(password)

      // Verify credentials
      const isValid = username === ceoUsername && providedHash === ceoPasswordHash

      // Log the attempt
      await supabase.from('ceo_login_attempts').insert({
        username,
        success: isValid,
        ip_address: ipAddress,
        user_agent: userAgent,
        failure_reason: isValid ? null : 'Invalid credentials',
        created_at: new Date().toISOString(),
      })

      if (!isValid) {
        // Check for too many failed attempts (rate limiting)
        const { data: recentAttempts } = await supabase
          .from('ceo_login_attempts')
          .select('id')
          .eq('ip_address', ipAddress)
          .eq('success', false)
          .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())

        if (recentAttempts && recentAttempts.length >= 5) {
          return new Response(
            JSON.stringify({ error: 'Too many failed attempts. Try again in 15 minutes.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate session token
      const newSessionToken = generateSessionToken()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

      // Store session
      await supabase.from('ceo_sessions').insert({
        session_token: newSessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })

      return new Response(
        JSON.stringify({
          success: true,
          sessionToken: newSessionToken,
          expiresAt,
          email: ceoEmail,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== VERIFY SESSION ACTION ==========
    if (action === 'verify') {
      if (!sessionToken) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Session token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if session exists and is valid
      const { data: session, error } = await supabase
        .from('ceo_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !session) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          valid: true,
          email: ceoEmail,
          expiresAt: session.expires_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== LOGOUT ACTION ==========
    if (action === 'logout') {
      if (sessionToken) {
        await supabase
          .from('ceo_sessions')
          .delete()
          .eq('session_token', sessionToken)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Logged out successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== ROTATE CREDENTIALS ACTION ==========
    if (action === 'rotate') {
      // Only allow if valid session
      if (!sessionToken) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify session
      const { data: session } = await supabase
        .from('ceo_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Invalid session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate new 6-digit username
      const newUsername = Math.floor(100000 + Math.random() * 900000).toString()

      // Note: In production, you would update the environment variable
      // through Supabase CLI or API. This returns the new username for
      // the CEO to manually update in the dashboard.
      return new Response(
        JSON.stringify({
          success: true,
          message: 'New username generated. Update CEO_USERNAME in Edge Function secrets.',
          newUsername,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: login, verify, logout, rotate' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('CEO auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
