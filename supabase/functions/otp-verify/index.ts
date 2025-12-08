// Supabase Edge Function: OTP Verify
// Validates OTP codes from the database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { email, code } = await req.json()

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase with service role key (server-side only)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find valid OTP
    const { data: otpRecord, error: selectError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (selectError || !otpRecord) {
      // Increment attempt counter for rate limiting
      await supabase
        .from('otp_codes')
        .update({ attempts: (otpRecord?.attempts || 0) + 1 })
        .eq('email', email.toLowerCase())
        .eq('used', false)

      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Invalid or expired code'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Too many attempts. Please request a new code.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from('otp_codes')
      .update({
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', otpRecord.id)

    if (updateError) {
      console.error('Failed to mark OTP as used:', updateError)
    }

    // Log successful verification
    await supabase
      .from('security_logs')
      .insert({
        user_id: email.toLowerCase(),
        event_type: 'otp_verified',
        severity: 'info',
        description: `OTP verified for ${otpRecord.purpose}`,
        metadata: { purpose: otpRecord.purpose }
      })

    return new Response(
      JSON.stringify({
        valid: true,
        purpose: otpRecord.purpose,
        message: 'Code verified successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('OTP verify error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
