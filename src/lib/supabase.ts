import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/security-utils'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'FlowSphere',
    },
  },
})

export type AuthUser = {
  id: string
  email: string
  name: string
}

// ==========================================
// Security Logs Service
// ==========================================

export interface SecurityLogEntry {
  user_id?: string
  event_type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'vault_access' | 'suspicious_activity' | 'session_start' | 'session_end'
  severity: 'info' | 'warning' | 'error' | 'critical'
  description: string
  ip_address?: string
  device?: string
  location?: string
  metadata?: Record<string, unknown>
}

export async function logSecurityEvent(entry: SecurityLogEntry): Promise<void> {
  try {
    const { error } = await supabase.from('security_logs').insert({
      user_id: entry.user_id,
      event_type: entry.event_type,
      severity: entry.severity,
      description: entry.description,
      ip_address: entry.ip_address,
      device: entry.device,
      location: entry.location,
      metadata: entry.metadata,
    })

    if (error) {
      logger.error('[Supabase] Failed to log security event:', error.message)
    }
  } catch (err) {
    logger.error('[Supabase] Security log error:', err)
  }
}

export async function getSecurityLogs(options?: {
  userId?: string
  eventType?: string
  limit?: number
  offset?: number
}): Promise<SecurityLogEntry[]> {
  try {
    let query = supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (options?.userId) {
      query = query.eq('user_id', options.userId)
    }
    if (options?.eventType) {
      query = query.eq('event_type', options.eventType)
    }
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[Supabase] Failed to fetch security logs:', error.message)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('[Supabase] Security logs fetch error:', err)
    return []
  }
}

// ==========================================
// Analytics Service
// ==========================================

export interface AnalyticsEvent {
  user_id?: string
  event_name: string
  event_category?: 'navigation' | 'feature_usage' | 'error' | 'performance'
  properties?: Record<string, unknown>
  session_id?: string
  device_type?: string
  platform?: string
}

export async function logAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const { error } = await supabase.from('analytics_events').insert({
      user_id: event.user_id,
      event_name: event.event_name,
      event_category: event.event_category,
      properties: event.properties,
      session_id: event.session_id,
      device_type: event.device_type,
      platform: event.platform,
    })

    if (error) {
      logger.error('[Supabase] Failed to log analytics:', error.message)
    }
  } catch (err) {
    logger.error('[Supabase] Analytics log error:', err)
  }
}

// ==========================================
// User Feedback Service
// ==========================================

export interface UserFeedbackEntry {
  user_id: string
  user_name?: string
  type: 'complaint' | 'inquiry' | 'feature-request' | 'bug-report' | 'praise'
  category?: string
  subject: string
  message: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
}

export async function submitFeedback(feedback: UserFeedbackEntry): Promise<{ success: boolean; id?: string }> {
  try {
    const { data, error } = await supabase
      .from('user_feedback')
      .insert({
        user_id: feedback.user_id,
        user_name: feedback.user_name,
        type: feedback.type,
        category: feedback.category,
        subject: feedback.subject,
        message: feedback.message,
        priority: feedback.priority || 'medium',
        status: 'new',
      })
      .select('id')
      .single()

    if (error) {
      logger.error('[Supabase] Failed to submit feedback:', error.message)
      return { success: false }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    logger.error('[Supabase] Feedback submit error:', err)
    return { success: false }
  }
}

export async function getFeedbackList(options?: {
  status?: string
  type?: string
  limit?: number
}): Promise<UserFeedbackEntry[]> {
  try {
    let query = supabase
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false })

    if (options?.status) {
      query = query.eq('status', options.status)
    }
    if (options?.type) {
      query = query.eq('type', options.type)
    }
    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[Supabase] Failed to fetch feedback:', error.message)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('[Supabase] Feedback fetch error:', err)
    return []
  }
}

// ==========================================
// User Settings Sync Service
// ==========================================

export async function syncUserSettings(userId: string, settings: Record<string, unknown>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        settings,
        last_synced: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (error) {
      logger.error('[Supabase] Failed to sync settings:', error.message)
      return false
    }

    return true
  } catch (err) {
    logger.error('[Supabase] Settings sync error:', err)
    return false
  }
}

export async function getUserSettings(userId: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - user has no settings yet
        return null
      }
      logger.error('[Supabase] Failed to fetch settings:', error.message)
      return null
    }

    return data?.settings || null
  } catch (err) {
    logger.error('[Supabase] Settings fetch error:', err)
    return null
  }
}

// ==========================================
// Connection Check
// ==========================================

export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('security_logs').select('count', { count: 'exact', head: true })
    return !error
  } catch (error) {
    logger.debug('Supabase connection check failed', error)
    return false
  }
}
