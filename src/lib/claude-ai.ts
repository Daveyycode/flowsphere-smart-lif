/**
 * Claude AI Service for FlowSphere CEO Executive AI
 * Uses Anthropic's Claude API for intelligent analysis
 */

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeResponse {
  content: Array<{ type: 'text'; text: string }>
  model: string
  stop_reason: string
}

/**
 * Call Claude AI API
 */
export async function callClaudeAI(
  prompt: string,
  options?: {
    model?: string
    maxTokens?: number
    systemPrompt?: string
  }
): Promise<string> {
  const apiKey = localStorage.getItem('flowsphere-ceo-anthropic-key')

  if (!apiKey) {
    throw new Error('NO_API_KEY')
  }

  const model = options?.model || 'claude-sonnet-4-20250514'
  const maxTokens = options?.maxTokens || 4096

  const messages: ClaudeMessage[] = [
    { role: 'user', content: prompt }
  ]

  const requestBody: {
    model: string
    max_tokens: number
    messages: ClaudeMessage[]
    system?: string
  } = {
    model,
    max_tokens: maxTokens,
    messages
  }

  if (options?.systemPrompt) {
    requestBody.system = options.systemPrompt
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[Claude AI] API Error:', errorData)

    if (response.status === 401) {
      throw new Error('INVALID_API_KEY')
    }
    if (response.status === 429) {
      throw new Error('RATE_LIMITED')
    }

    throw new Error(errorData.error?.message || 'API request failed')
  }

  const data = await response.json() as ClaudeResponse

  // Extract text from response
  const textContent = data.content.find(c => c.type === 'text')
  return textContent?.text || ''
}

/**
 * CEO Executive AI Assistant - Powered by Claude
 */
export class CEOExecutiveAI {
  private getApiKey(): string | null {
    return localStorage.getItem('flowsphere-ceo-anthropic-key')
  }

  /**
   * Check if Claude AI is configured
   */
  isConfigured(): boolean {
    return !!this.getApiKey()
  }

  /**
   * Generate workflow based on request
   */
  async generateWorkflow(request: string, context: {
    totalUsers: number
    revenue: number
    growthRate: number
  }): Promise<string> {
    const prompt = `You are a CEO Executive AI assistant specializing in workflow creation. Based on the user's request, create a detailed workflow with steps, responsibilities, and timelines. Format the response in a clear, actionable way with numbered steps.

Context:
- Company: FlowSphere (Life management platform)
- Users: ${context.totalUsers.toLocaleString()}
- Monthly Revenue: $${context.revenue.toLocaleString()}
- Growth Rate: ${context.growthRate}%

User Request: ${request}

Generate a comprehensive workflow that includes:
1. Overview and objectives
2. Step-by-step process
3. Team responsibilities
4. Timeline estimates
5. Success metrics`

    return callClaudeAI(prompt)
  }

  /**
   * Analyze issues and provide solutions
   */
  async analyzeIssues(issue: string, context: {
    activeUsers: number
    churnRate: number
    growthRate: number
  }): Promise<string> {
    const prompt = `You are a CEO Executive AI assistant specializing in issue analysis and solution generation. Analyze the user's concern and provide:
1. Root cause analysis
2. Impact assessment
3. Recommended solutions (ranked by priority)
4. Implementation steps
5. Risk mitigation strategies

Current Business Context:
- Active Users: ${context.activeUsers.toLocaleString()}
- Churn Rate: ${context.churnRate}%
- Growth: ${context.growthRate}%

Issue/Concern: ${issue}

Provide actionable insights and solutions.`

    return callClaudeAI(prompt)
  }

  /**
   * Generate executive report
   */
  async generateReport(request: string, context: {
    totalUsers: number
    activeUsers: number
    revenue: number
    growthRate: number
    churnRate: number
    suggestions?: Array<{ title: string; description: string }>
  }): Promise<string> {
    const prompt = `You are a CEO Executive AI assistant specializing in executive report generation. Create a professional executive report based on the user's request.

Business Metrics:
- Total Users: ${context.totalUsers.toLocaleString()}
- Active Users: ${context.activeUsers.toLocaleString()}
- Monthly Revenue: $${context.revenue.toLocaleString()}
- Growth Rate: ${context.growthRate}%
- Churn Rate: ${context.churnRate}%

Recent Business Insights:
${context.suggestions?.map(s => `- ${s.title}: ${s.description}`).join('\n') || 'No recent insights available'}

Report Request: ${request}

Generate a comprehensive executive report with:
1. Executive Summary
2. Key Findings
3. Data Analysis
4. Recommendations
5. Next Steps`

    return callClaudeAI(prompt)
  }

  /**
   * General analysis - debug, troubleshoot, guard
   */
  async analyze(request: string, mode: 'debug' | 'guard' | 'troubleshoot' | 'general' = 'general'): Promise<string> {
    let systemContext = ''

    switch (mode) {
      case 'debug':
        systemContext = 'You are an expert debugging assistant. Analyze the issue, identify root causes, and provide step-by-step debugging guidance.'
        break
      case 'guard':
        systemContext = 'You are a security guard AI. Analyze for potential risks, vulnerabilities, and compliance issues. Provide security recommendations.'
        break
      case 'troubleshoot':
        systemContext = 'You are a troubleshooting expert. Systematically diagnose the problem and provide clear resolution steps.'
        break
      default:
        systemContext = 'You are a helpful CEO Executive AI assistant. Provide clear, actionable analysis and recommendations.'
    }

    return callClaudeAI(request, { systemPrompt: systemContext })
  }
}

// Export singleton instance
export const ceoAI = new CEOExecutiveAI()
