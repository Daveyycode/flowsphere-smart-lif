/**
 * Vercel Serverless Function for Sending Emails
 * Uses Resend API for reliable email delivery
 * For parent alerts from Kids Learning Center
 *
 * IMPORTANT: This function is designed to NEVER break the app.
 * It always returns success (200) even if email fails, to prevent
 * any impact on the main application functionality.
 */

import type { IncomingMessage, ServerResponse } from 'http'

interface VercelRequest extends IncomingMessage {
  body: any
  query: Record<string, string | string[]>
  cookies: Record<string, string>
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse
  json: (data: any) => void
  send: (data: any) => void
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(200).json({ success: true, skipped: true, reason: 'Method not POST' })
  }

  try {
    // Parse body if needed
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        // Don't fail - just skip email
        return res.status(200).json({ success: true, skipped: true, reason: 'Invalid JSON' })
      }
    }

    const { to, subject, html } = body || {}

    // Validate required fields - don't fail, just skip
    if (!to || !subject || !html) {
      return res.status(200).json({ success: true, skipped: true, reason: 'Missing fields' })
    }

    // Validate email format - don't fail, just skip
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return res.status(200).json({ success: true, skipped: true, reason: 'Invalid email' })
    }

    // Get Resend API key from environment (check both possible names)
    const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY

    if (!RESEND_API_KEY) {
      console.log('Email skipped: RESEND_API_KEY not configured')
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: 'Email service not configured',
      })
    }

    // Attempt to send email - but never let it break the app
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FlowSphere Alerts <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      console.error('Resend API error (non-fatal):', error)
      // Still return success to not break the app
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: error.message || 'Email provider error',
      })
    }

    const data = await response.json().catch(() => ({ id: 'unknown' }))
    return res.status(200).json({
      success: true,
      sent: true,
      id: data.id,
    })
  } catch (error) {
    // NEVER let an error break the app
    console.error('Email error (non-fatal):', error)
    return res.status(200).json({
      success: true,
      skipped: true,
      reason: 'Internal error - email skipped',
    })
  }
}
