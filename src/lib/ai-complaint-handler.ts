/**
 * AI-Powered Complaint Handler
 * Automatically analyzes and resolves user complaints
 * Escalates to CEO email if AI cannot resolve
 */

export interface Complaint {
  id: string
  userId: string
  userName: string
  userEmail: string
  category: 'technical' | 'billing' | 'feature' | 'service' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  subject: string
  description: string
  attachments?: string[]
  status: 'pending' | 'ai-analyzing' | 'ai-resolved' | 'escalated' | 'closed'
  aiResolution?: {
    analysis: string
    solution: string
    confidence: number
    resolvedAt: string
  }
  escalation?: {
    reason: string
    escalatedAt: string
    emailSent: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface AIResolutionResult {
  canResolve: boolean
  confidence: number
  analysis: string
  solution: string
  suggestedActions?: string[]
}

/**
 * AI analyzes the complaint and attempts to resolve it
 */
export async function analyzeComplaint(complaint: Complaint): Promise<AIResolutionResult> {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  // AI resolution knowledge base (in production, this would use actual AI/ML)
  const knowledgeBase = {
    technical: {
      patterns: [
        { keywords: ['login', 'password', 'forgot', 'reset'], solution: 'Password Reset' },
        { keywords: ['slow', 'loading', 'performance'], solution: 'Performance Optimization' },
        { keywords: ['crash', 'error', 'bug', 'broken'], solution: 'Bug Investigation' },
        { keywords: ['sync', 'not updating', 'refresh'], solution: 'Data Synchronization' },
        { keywords: ['notification', 'alert', 'not receiving'], solution: 'Notification Settings' },
      ],
      confidence: 0.85,
    },
    billing: {
      patterns: [
        { keywords: ['charge', 'charged', 'payment'], solution: 'Billing Review' },
        { keywords: ['cancel', 'refund', 'subscription'], solution: 'Subscription Management' },
        { keywords: ['invoice', 'receipt', 'billing'], solution: 'Invoice Generation' },
        { keywords: ['price', 'cost', 'expensive'], solution: 'Pricing Information' },
      ],
      confidence: 0.75,
    },
    feature: {
      patterns: [
        { keywords: ['how to', 'can i', 'is it possible'], solution: 'Feature Tutorial' },
        { keywords: ['missing', 'where is', 'cannot find'], solution: 'Feature Location Guide' },
        { keywords: ['request', 'suggestion', 'add'], solution: 'Feature Request Logged' },
      ],
      confidence: 0.8,
    },
    service: {
      patterns: [
        { keywords: ['support', 'help', 'assistance'], solution: 'Support Guidance' },
        { keywords: ['response', 'reply', 'contact'], solution: 'Contact Information' },
        { keywords: ['account', 'profile', 'settings'], solution: 'Account Management' },
      ],
      confidence: 0.7,
    },
  }

  const text = `${complaint.subject} ${complaint.description}`.toLowerCase()
  const category = complaint.category !== 'other' ? complaint.category : 'service'
  const categoryKB = knowledgeBase[category]

  // Find matching pattern
  let matchedPattern: { keywords: string[]; solution: string } | null = null
  let maxMatches = 0

  for (const pattern of categoryKB.patterns) {
    const matches = pattern.keywords.filter(keyword => text.includes(keyword)).length
    if (matches > maxMatches) {
      maxMatches = matches
      matchedPattern = pattern
    }
  }

  // Determine if AI can resolve
  const hasMatch = maxMatches > 0
  const confidence = hasMatch ? categoryKB.confidence : 0.3
  const canResolve = confidence >= 0.65

  if (canResolve && matchedPattern) {
    return {
      canResolve: true,
      confidence,
      analysis: `AI has analyzed your ${category} complaint and identified a solution.`,
      solution: generateSolution(category, matchedPattern.solution, complaint),
      suggestedActions: generateActions(category, matchedPattern.solution),
    }
  } else {
    return {
      canResolve: false,
      confidence,
      analysis: `AI could not confidently resolve this complaint. This issue requires human review.`,
      solution: 'Your complaint has been escalated to our executive team for personal attention.',
      suggestedActions: [
        'CEO will review your case personally',
        'You will receive a response via email within 24 hours',
      ],
    }
  }
}

function generateSolution(category: string, solutionType: string, complaint: Complaint): string {
  const solutions: Record<string, string> = {
    'Password Reset': `Hi ${complaint.userName}, you can reset your password by:
1. Click "Forgot Password" on the login page
2. Enter your email: ${complaint.userEmail}
3. Check your email for a reset link (valid for 1 hour)
4. Create a new secure password

If you're still having trouble, please try clearing your browser cache or using a different browser.`,

    'Performance Optimization': `Hi ${complaint.userName}, to improve performance:
1. Clear your browser cache (Ctrl+Shift+Del)
2. Ensure you're using the latest browser version
3. Check your internet connection speed
4. Try closing other browser tabs
5. Disable browser extensions temporarily

We're constantly optimizing our platform. If issues persist, we'll escalate this to our engineering team.`,

    'Bug Investigation': `Hi ${complaint.userName}, thank you for reporting this issue. We're investigating:
1. Our AI has logged this bug report
2. Engineering team will review within 24 hours
3. You'll receive updates via email
4. In the meantime, try: refreshing the page, using a different browser, or clearing cache

We appreciate your patience as we work to resolve this.`,

    'Data Synchronization': `Hi ${complaint.userName}, to resolve sync issues:
1. Refresh the page (Ctrl+R or Cmd+R)
2. Check your internet connection
3. Log out and log back in
4. Ensure you're not in airplane mode
5. Try the mobile app if you're on desktop (or vice versa)

Data typically syncs within 30 seconds. If problems continue, this will be escalated.`,

    'Notification Settings': `Hi ${complaint.userName}, to enable notifications:
1. Go to Settings > Notifications
2. Enable the notification types you want
3. Allow browser notifications when prompted
4. Check your email spam folder for our emails
5. Add notifications@flowsphere.com to your contacts

You can customize notification preferences anytime in your settings.`,

    'Billing Review': `Hi ${complaint.userName}, regarding your billing concern:
1. View your billing history in Settings > Subscription & Billing
2. Download invoices for your records
3. Payment method: ending in ****
4. Next billing date is shown in your account

If you see an unexpected charge, please reply with the date and amount, and we'll investigate immediately.`,

    'Subscription Management': `Hi ${complaint.userName}, to manage your subscription:
1. Go to Settings > Subscription & Billing
2. View your current plan and features
3. Upgrade/downgrade options available
4. Cancel anytime (access continues until period ends)
5. Reactivate within 30 days without losing data

Need help choosing a plan? Our AI can recommend the best fit for your needs.`,

    'Invoice Generation': `Hi ${complaint.userName}, to access your invoices:
1. Settings > Subscription & Billing > Billing History
2. Click "Download Invoice" next to any charge
3. Invoices include all transaction details
4. PDF format, ready for accounting/reimbursement

Invoices are automatically sent to ${complaint.userEmail} after each charge.`,

    'Pricing Information': `Hi ${complaint.userName}, our transparent pricing:
- Basic: Free - Core features
- Pro: $9.99/month - Advanced features
- Gold: $19.99/month - Premium + priority support
- Family: $29.99/month - Up to 6 users

All plans include 14-day free trial. Annual billing saves 20%. No hidden fees.`,

    'Feature Tutorial': `Hi ${complaint.userName}, here's how to use this feature:
1. Navigate to the feature in the main dashboard
2. Click the "?" help icon for guided tour
3. Check out our video tutorials in Settings > Help
4. Read the documentation at docs.flowsphere.com

Our AI assistant can also guide you through specific features. Just ask!`,

    'Feature Location Guide': `Hi ${complaint.userName}, to find this feature:
1. Check the main navigation menu
2. Use the search bar (Ctrl+K or Cmd+K)
3. Look in Settings for configuration options
4. Try the "Quick Access" boxes on dashboard

Still can't find it? It might be a premium feature. Check your subscription tier.`,

    'Feature Request Logged': `Hi ${complaint.userName}, thank you for your suggestion!
1. Your feature request has been logged with ID: ${Date.now()}
2. Our product team reviews all requests monthly
3. Highly requested features are prioritized
4. You'll be notified if your request is implemented

Vote on other feature requests in Settings > Feedback & Ideas.`,

    'Support Guidance': `Hi ${complaint.userName}, we're here to help:
1. Check our Help Center: help.flowsphere.com
2. Search documentation for instant answers
3. Use AI chat assistant (bottom right corner)
4. Email support: support@flowsphere.com
5. For urgent issues, this complaint is escalated to CEO

Average response time: < 2 hours during business hours.`,

    'Contact Information': `Hi ${complaint.userName}, contact us:
📧 Email: support@flowsphere.com
📧 CEO Direct: ceo@flowsphere.com
🌐 Website: flowsphere.com/contact
📱 Twitter: @FlowSphere
💬 Live Chat: Available in-app (bottom right)

Business Hours: Monday-Friday, 9 AM - 6 PM PST
Emergency support available 24/7 for Gold+ subscribers.`,

    'Account Management': `Hi ${complaint.userName}, manage your account:
1. Profile Settings: Update name, email, photo
2. Security Settings: Change password, enable 2FA
3. Privacy Settings: Control data sharing, visibility
4. Connected Devices: View and manage all devices
5. Delete Account: Available in Settings > Advanced

All changes sync across all your devices instantly.`,
  }

  return (
    solutions[solutionType] ||
    `Hi ${complaint.userName}, our AI team is working on your ${category} issue. You'll receive a detailed response soon.`
  )
}

function generateActions(category: string, solutionType: string): string[] {
  const actions: Record<string, string[]> = {
    'Password Reset': ['Reset password', 'Contact support if needed', 'Enable 2FA for security'],
    'Performance Optimization': ['Clear cache', 'Update browser', 'Check connection'],
    'Bug Investigation': [
      'Wait for engineering review',
      'Try workarounds',
      'Monitor email for updates',
    ],
    'Data Synchronization': ['Refresh page', 'Check connection', 'Re-login if needed'],
    'Notification Settings': [
      'Check settings',
      'Enable browser notifications',
      'Check spam folder',
    ],
    'Billing Review': ['Review billing history', 'Download invoice', 'Contact if discrepancy'],
    'Subscription Management': ['Visit subscription settings', 'Compare plans', 'Manage billing'],
    'Invoice Generation': ['Download from settings', 'Check email', 'Save for records'],
    'Pricing Information': ['Review plan comparison', 'Start free trial', 'Contact sales'],
    'Feature Tutorial': ['Watch video tutorial', 'Read documentation', 'Use guided tour'],
    'Feature Location Guide': ['Use search', 'Check navigation', 'Review plan features'],
    'Feature Request Logged': ['Vote on similar requests', 'Share with team', 'Monitor updates'],
    'Support Guidance': ['Check Help Center', 'Use AI chat', 'Email support'],
    'Contact Information': ['Save contact info', 'Follow on social', 'Join community'],
    'Account Management': ['Update profile', 'Review security', 'Manage devices'],
  }

  return actions[solutionType] || ['Review your account settings', 'Contact support if needed']
}

/**
 * Send escalation email to CEO
 */
export async function sendEscalationEmail(
  complaint: Complaint,
  ceoEmail: string = 'ceo@flowsphere.com'
): Promise<boolean> {
  try {
    // In production, integrate with actual email service (SendGrid, AWS SES, etc.)
    const emailData = {
      to: ceoEmail,
      from: 'complaints@flowsphere.com',
      subject: `🚨 Escalated Complaint: ${complaint.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">⚠️ Complaint Escalation</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">AI could not resolve - requires your attention</p>
          </div>

          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Complaint Details</h2>

            <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #e0e0e0;"><strong>ID:</strong></td>
                <td style="padding: 10px; background: white; border: 1px solid #e0e0e0;">${complaint.id}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #e0e0e0;"><strong>User:</strong></td>
                <td style="padding: 10px; background: white; border: 1px solid #e0e0e0;">${complaint.userName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #e0e0e0;"><strong>Email:</strong></td>
                <td style="padding: 10px; background: white; border: 1px solid #e0e0e0;">${complaint.userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #e0e0e0;"><strong>Category:</strong></td>
                <td style="padding: 10px; background: white; border: 1px solid #e0e0e0;">${complaint.category.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #e0e0e0;"><strong>Priority:</strong></td>
                <td style="padding: 10px; background: white; border: 1px solid #e0e0e0;">
                  <span style="background: ${getPriorityColor(complaint.priority)}; color: white; padding: 5px 10px; border-radius: 5px;">
                    ${complaint.priority.toUpperCase()}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #e0e0e0;"><strong>Submitted:</strong></td>
                <td style="padding: 10px; background: white; border: 1px solid #e0e0e0;">${new Date(complaint.createdAt).toLocaleString()}</td>
              </tr>
            </table>

            <h3 style="color: #333; margin-top: 30px;">Subject</h3>
            <p style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 10px 0;">${complaint.subject}</p>

            <h3 style="color: #333; margin-top: 30px;">Description</h3>
            <div style="background: white; padding: 20px; border-radius: 5px; line-height: 1.6;">
              ${complaint.description.replace(/\n/g, '<br>')}
            </div>

            ${
              complaint.escalation
                ? `
            <h3 style="color: #333; margin-top: 30px;">Escalation Reason</h3>
            <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 10px 0;">
              ${complaint.escalation.reason}
            </p>
            `
                : ''
            }

            <div style="margin-top: 30px; padding: 20px; background: #e8f4f8; border-radius: 5px; text-align: center;">
              <p style="margin: 0; color: #666;">
                <strong>Action Required:</strong> Please review and respond to this complaint within 24 hours.
              </p>
              <a href="http://localhost:5001/ceo-dashboard/complaints/${complaint.id}"
                 style="display: inline-block; margin-top: 15px; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                View in CEO Dashboard
              </a>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>FlowSphere Automated Complaint System</p>
            <p>This email was sent because the AI could not automatically resolve the complaint.</p>
          </div>
        </div>
      `,
    }

    // Simulate email sending (in production, use actual email service)
    console.log('📧 Escalation Email Sent:', emailData)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))

    return true
  } catch (error) {
    console.error('Failed to send escalation email:', error)
    return false
  }
}

function getPriorityColor(priority: string): string {
  const colors = {
    low: '#28a745',
    medium: '#ffc107',
    high: '#fd7e14',
    urgent: '#dc3545',
  }
  return colors[priority as keyof typeof colors] || '#6c757d'
}

/**
 * Process a new complaint through AI system
 */
export async function processComplaint(complaint: Complaint): Promise<Complaint> {
  // Update status to analyzing
  complaint.status = 'ai-analyzing'
  complaint.updatedAt = new Date().toISOString()

  // AI analyzes the complaint
  const resolution = await analyzeComplaint(complaint)

  if (resolution.canResolve) {
    // AI successfully resolved
    complaint.status = 'ai-resolved'
    complaint.aiResolution = {
      analysis: resolution.analysis,
      solution: resolution.solution,
      confidence: resolution.confidence,
      resolvedAt: new Date().toISOString(),
    }
  } else {
    // Escalate to CEO
    complaint.status = 'escalated'
    complaint.escalation = {
      reason: resolution.analysis,
      escalatedAt: new Date().toISOString(),
      emailSent: false,
    }

    // Send email to CEO
    const emailSent = await sendEscalationEmail(complaint)
    complaint.escalation.emailSent = emailSent
  }

  complaint.updatedAt = new Date().toISOString()
  return complaint
}
