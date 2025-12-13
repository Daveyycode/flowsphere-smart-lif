/**
 * Custom Slash Commands for Email Path Navigation
 * Allows users to quickly access email folders with slash commands
 */

import { EmailFolder } from './email-folder-manager'
import { EmailMessage } from './email-scanner'

export interface EmailSlashCommand {
  command: string
  path: string
  description: string
  icon: string
  category: string
  usage: string
  examples: string[]
}

export interface SlashCommandResult {
  command: string
  executed: boolean
  result?: {
    path: string
    emails: EmailMessage[]
    count: number
    message: string
  }
  error?: string
}

/**
 * Generate slash commands from email folders
 */
export function generateEmailSlashCommands(folders: EmailFolder[]): EmailSlashCommand[] {
  const commands: EmailSlashCommand[] = []

  folders.forEach(folder => {
    // Create command from folder path
    const command = folder.path.replace('/', '/email-')

    commands.push({
      command,
      path: folder.path,
      description: folder.description,
      icon: folder.icon,
      category: 'Email Navigation',
      usage: `${command} [search terms]`,
      examples: [`${command}`, `${command} unread`, `${command} from:john`, `${command} urgent`],
    })
  })

  // Add special commands
  commands.push(
    {
      command: '/email-paths',
      path: '',
      description: 'Show all available email folder paths',
      icon: 'folder-open',
      category: 'Email Utilities',
      usage: '/email-paths',
      examples: ['/email-paths'],
    },
    {
      command: '/email-search',
      path: '',
      description: 'Search across all email folders',
      icon: 'magnifying-glass',
      category: 'Email Utilities',
      usage: '/email-search [query]',
      examples: ['/email-search invoice', '/email-search meeting', '/email-search @john'],
    },
    {
      command: '/email-unread',
      path: '',
      description: 'Show all unread emails across folders',
      icon: 'envelope-simple',
      category: 'Email Utilities',
      usage: '/email-unread [folder]',
      examples: ['/email-unread', '/email-unread work', '/email-unread personal'],
    },
    {
      command: '/email-important',
      path: '',
      description: 'Show all important/starred emails',
      icon: 'star',
      category: 'Email Utilities',
      usage: '/email-important',
      examples: ['/email-important'],
    }
  )

  return commands
}

/**
 * Parse slash command from input
 */
export function parseEmailSlashCommand(input: string): {
  command: string
  args: string[]
  isEmailCommand: boolean
} {
  const trimmed = input.trim()

  // Check if starts with /email-
  if (!trimmed.startsWith('/email-')) {
    return { command: '', args: [], isEmailCommand: false }
  }

  // Split command and arguments
  const parts = trimmed.split(/\s+/)
  const command = parts[0]
  const args = parts.slice(1)

  return {
    command,
    args,
    isEmailCommand: true,
  }
}

/**
 * Execute email slash command
 */
export function executeEmailSlashCommand(
  input: string,
  folders: EmailFolder[],
  emails: EmailMessage[]
): SlashCommandResult {
  const { command, args, isEmailCommand } = parseEmailSlashCommand(input)

  if (!isEmailCommand) {
    return {
      command: input,
      executed: false,
      error: 'Not an email slash command',
    }
  }

  // Handle /email-paths
  if (command === '/email-paths') {
    return handleEmailPathsCommand(folders)
  }

  // Handle /email-search
  if (command === '/email-search') {
    return handleEmailSearchCommand(args, emails, folders)
  }

  // Handle /email-unread
  if (command === '/email-unread') {
    return handleEmailUnreadCommand(args, emails, folders)
  }

  // Handle /email-important
  if (command === '/email-important') {
    return handleEmailImportantCommand(emails, folders)
  }

  // Handle folder-specific commands
  const folderPath = command.replace('/email-', '/')
  const folder = folders.find(f => f.path === folderPath)

  if (folder) {
    return handleFolderCommand(folder, args, emails)
  }

  return {
    command,
    executed: false,
    error: `Unknown command: ${command}`,
  }
}

/**
 * Handle /email-paths command
 */
function handleEmailPathsCommand(folders: EmailFolder[]): SlashCommandResult {
  const pathsList = folders
    .map(folder => {
      return `📁 **${folder.path}** - ${folder.name} (${folder.count} emails)\n   ${folder.description}`
    })
    .join('\n\n')

  const message = `**Available Email Folder Paths:**\n\n${pathsList}\n\n💡 **Usage Examples:**\n• \`/email-work\` - Open work folder\n• \`/email-work meeting\` - Search "meeting" in work folder\n• \`/email-subscriptions unread\` - Unread subscriptions\n• \`/email-search invoice\` - Search all folders`

  return {
    command: '/email-paths',
    executed: true,
    result: {
      path: '',
      emails: [],
      count: folders.length,
      message,
    },
  }
}

/**
 * Handle /email-search command
 */
function handleEmailSearchCommand(
  args: string[],
  emails: EmailMessage[],
  folders: EmailFolder[]
): SlashCommandResult {
  if (args.length === 0) {
    return {
      command: '/email-search',
      executed: false,
      error: 'Please provide search terms. Usage: /email-search [query]',
    }
  }

  const query = args.join(' ').toLowerCase()

  // Search across all emails
  const matchingEmails = emails.filter(email => {
    const searchText = `${email.subject} ${email.from} ${email.body}`.toLowerCase()
    return searchText.includes(query)
  })

  // Group by folder
  const byFolder: Record<string, EmailMessage[]> = {}

  matchingEmails.forEach(email => {
    folders.forEach(folder => {
      if (folder.emailIds.includes(email.id)) {
        if (!byFolder[folder.path]) {
          byFolder[folder.path] = []
        }
        byFolder[folder.path].push(email)
      }
    })
  })

  let message = `**Search Results for "${query}"**\n\nFound ${matchingEmails.length} emails:\n\n`

  Object.entries(byFolder).forEach(([path, folderEmails]) => {
    message += `📁 **${path}** (${folderEmails.length}):\n`
    folderEmails.slice(0, 3).forEach(email => {
      const status = email.read ? '✓' : '•'
      message += `   ${status} ${email.subject} (from ${email.from})\n`
    })
    if (folderEmails.length > 3) {
      message += `   ...and ${folderEmails.length - 3} more\n`
    }
    message += '\n'
  })

  return {
    command: '/email-search',
    executed: true,
    result: {
      path: '',
      emails: matchingEmails,
      count: matchingEmails.length,
      message,
    },
  }
}

/**
 * Handle /email-unread command
 */
function handleEmailUnreadCommand(
  args: string[],
  emails: EmailMessage[],
  folders: EmailFolder[]
): SlashCommandResult {
  let targetFolder: EmailFolder | undefined

  if (args.length > 0) {
    const folderName = args[0].toLowerCase()
    targetFolder = folders.find(
      f => f.name.toLowerCase().includes(folderName) || f.path.toLowerCase().includes(folderName)
    )
  }

  let unreadEmails: EmailMessage[]

  if (targetFolder) {
    // Filter unread in specific folder
    unreadEmails = emails.filter(email => !email.read && targetFolder.emailIds.includes(email.id))
  } else {
    // All unread emails
    unreadEmails = emails.filter(email => !email.read)
  }

  const folderInfo = targetFolder ? ` in ${targetFolder.path}` : ' across all folders'
  let message = `**Unread Emails${folderInfo}**\n\n${unreadEmails.length} unread:\n\n`

  unreadEmails.slice(0, 10).forEach(email => {
    message += `• **${email.subject}**\n  From: ${email.from}\n  ${new Date(email.timestamp).toLocaleDateString()}\n\n`
  })

  if (unreadEmails.length > 10) {
    message += `...and ${unreadEmails.length - 10} more unread emails`
  }

  return {
    command: '/email-unread',
    executed: true,
    result: {
      path: targetFolder?.path || '',
      emails: unreadEmails,
      count: unreadEmails.length,
      message,
    },
  }
}

/**
 * Handle /email-important command
 */
function handleEmailImportantCommand(
  emails: EmailMessage[],
  folders: EmailFolder[]
): SlashCommandResult {
  const importantEmails = emails.filter(email => email.important)

  let message = `**Important Emails**\n\n${importantEmails.length} important:\n\n`

  // Group by folder
  const byFolder: Record<string, EmailMessage[]> = {}

  importantEmails.forEach(email => {
    folders.forEach(folder => {
      if (folder.emailIds.includes(email.id)) {
        if (!byFolder[folder.path]) {
          byFolder[folder.path] = []
        }
        byFolder[folder.path].push(email)
      }
    })
  })

  Object.entries(byFolder).forEach(([path, folderEmails]) => {
    message += `📁 **${path}** (${folderEmails.length}):\n`
    folderEmails.slice(0, 3).forEach(email => {
      const status = email.read ? '✓' : '•'
      message += `   ${status} ${email.subject}\n`
    })
    if (folderEmails.length > 3) {
      message += `   ...and ${folderEmails.length - 3} more\n`
    }
    message += '\n'
  })

  return {
    command: '/email-important',
    executed: true,
    result: {
      path: '',
      emails: importantEmails,
      count: importantEmails.length,
      message,
    },
  }
}

/**
 * Handle folder-specific command
 */
function handleFolderCommand(
  folder: EmailFolder,
  args: string[],
  emails: EmailMessage[]
): SlashCommandResult {
  // Get emails in folder
  let folderEmails = emails.filter(email => folder.emailIds.includes(email.id))

  // Apply search filter if args provided
  if (args.length > 0) {
    const query = args.join(' ').toLowerCase()

    folderEmails = folderEmails.filter(email => {
      // Handle special keywords
      if (query === 'unread') {
        return !email.read
      }
      if (query === 'read') {
        return email.read
      }
      if (query === 'important') {
        return email.important
      }

      // Handle from: filter
      if (query.startsWith('from:')) {
        const sender = query.replace('from:', '').trim()
        return email.from.toLowerCase().includes(sender)
      }

      // General search
      const searchText = `${email.subject} ${email.from} ${email.body}`.toLowerCase()
      return searchText.includes(query)
    })
  }

  const searchInfo = args.length > 0 ? ` matching "${args.join(' ')}"` : ''
  let message = `**${folder.path} - ${folder.name}**\n\n${folderEmails.length} emails${searchInfo}:\n\n`

  folderEmails.slice(0, 10).forEach(email => {
    const status = email.read ? '✓' : '•'
    const important = email.important ? '⭐ ' : ''
    message += `${status} ${important}**${email.subject}**\n   From: ${email.from}\n   ${new Date(email.timestamp).toLocaleDateString()}\n\n`
  })

  if (folderEmails.length > 10) {
    message += `...and ${folderEmails.length - 10} more emails\n\n`
  }

  message += `💡 **Quick Actions:**\n• \`${folder.path.replace('/', '/email-')} unread\` - Show unread\n• \`${folder.path.replace('/', '/email-')} from:john\` - Filter by sender\n• \`${folder.path.replace('/', '/email-')} important\` - Important only`

  return {
    command: folder.path.replace('/', '/email-'),
    executed: true,
    result: {
      path: folder.path,
      emails: folderEmails,
      count: folderEmails.length,
      message,
    },
  }
}

/**
 * Get command suggestions based on partial input
 */
export function getEmailCommandSuggestions(
  partialInput: string,
  folders: EmailFolder[]
): EmailSlashCommand[] {
  const commands = generateEmailSlashCommands(folders)

  if (!partialInput.startsWith('/email')) {
    return []
  }

  return commands.filter(cmd => cmd.command.toLowerCase().startsWith(partialInput.toLowerCase()))
}

/**
 * Format command help text
 */
export function formatCommandHelp(command: EmailSlashCommand): string {
  return `**${command.command}**
${command.description}

📝 **Usage:** \`${command.usage}\`

💡 **Examples:**
${command.examples.map(ex => `• \`${ex}\``).join('\n')}
`
}
