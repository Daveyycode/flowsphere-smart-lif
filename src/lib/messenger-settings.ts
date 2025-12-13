/**
 * Messenger Settings System
 * Customize conversations with nicknames, themes, and preferences
 */

import { logger } from '@/lib/security-utils'

export interface ContactTheme {
  primaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  bubbleStyle: 'rounded' | 'square' | 'modern' | 'bubble' | 'minimal'
  bubbleAlignment: 'left' | 'right' | 'dynamic'
  fontSize: 'small' | 'medium' | 'large'
  fontFamily: string
  messageSpacing: 'compact' | 'normal' | 'relaxed'
  showTimestamps: boolean
  showReadReceipts: boolean
  customBackground?: string
  gradientEnabled: boolean
  gradientColors?: [string, string]
}

export interface ConversationSettings {
  contactId: string
  contactName: string
  nickname?: string
  emoji?: string
  theme: ContactTheme
  notificationSettings: {
    muted: boolean
    customSound?: string
    vibration: boolean
    showPreview: boolean
  }
  chatBehavior: {
    autoReply?: string
    quickReplies: string[]
    scheduledMessages: ScheduledMessage[]
  }
  privacy: {
    hideTypingIndicator: boolean
    hideReadReceipts: boolean
    hideLastSeen: boolean
  }
  customization: {
    chatWallpaper?: string
    customFont?: string
    messageEffects: boolean
    stickers: string[]
  }
}

export interface ScheduledMessage {
  id: string
  message: string
  scheduledTime: string
  recurring?: 'daily' | 'weekly' | 'monthly'
  enabled: boolean
}

export interface MessengerGlobalSettings {
  defaultTheme: ContactTheme
  appearance: 'light' | 'dark' | 'auto'
  compactMode: boolean
  animations: boolean
  soundEffects: boolean
  hapticFeedback: boolean
  enterToSend: boolean
  mediaQuality: 'low' | 'medium' | 'high' | 'original'
  autoDownloadMedia: {
    photos: boolean
    videos: boolean
    files: boolean
    onWifiOnly: boolean
  }
  privacy: {
    onlineStatus: boolean
    lastSeen: boolean
    profilePhoto: boolean
    readReceipts: boolean
  }
  dataUsage: {
    autoPlayVideos: boolean
    autoPlayGIFs: boolean
    lowDataMode: boolean
  }
}

/**
 * Predefined Theme Templates
 */
export const THEME_TEMPLATES: Record<string, ContactTheme> = {
  default: {
    primaryColor: '#007AFF',
    accentColor: '#5AC8FA',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    bubbleStyle: 'rounded',
    bubbleAlignment: 'dynamic',
    fontSize: 'medium',
    fontFamily: 'system-ui',
    messageSpacing: 'normal',
    showTimestamps: true,
    showReadReceipts: true,
    gradientEnabled: false,
  },
  ocean: {
    primaryColor: '#0077BE',
    accentColor: '#00B4D8',
    backgroundColor: '#E8F4F8',
    textColor: '#023E8A',
    bubbleStyle: 'bubble',
    bubbleAlignment: 'dynamic',
    fontSize: 'medium',
    fontFamily: 'system-ui',
    messageSpacing: 'normal',
    showTimestamps: true,
    showReadReceipts: true,
    gradientEnabled: true,
    gradientColors: ['#0077BE', '#00B4D8'],
  },
  sunset: {
    primaryColor: '#FF6B6B',
    accentColor: '#FFD93D',
    backgroundColor: '#FFF5E6',
    textColor: '#2D1E2F',
    bubbleStyle: 'rounded',
    bubbleAlignment: 'dynamic',
    fontSize: 'medium',
    fontFamily: 'system-ui',
    messageSpacing: 'relaxed',
    showTimestamps: true,
    showReadReceipts: true,
    gradientEnabled: true,
    gradientColors: ['#FF6B6B', '#FFD93D'],
  },
  forest: {
    primaryColor: '#2D6A4F',
    accentColor: '#52B788',
    backgroundColor: '#F1F8F4',
    textColor: '#1B4332',
    bubbleStyle: 'modern',
    bubbleAlignment: 'dynamic',
    fontSize: 'medium',
    fontFamily: 'system-ui',
    messageSpacing: 'normal',
    showTimestamps: true,
    showReadReceipts: true,
    gradientEnabled: false,
  },
  midnight: {
    primaryColor: '#6C5CE7',
    accentColor: '#A29BFE',
    backgroundColor: '#1E1E2E',
    textColor: '#FFFFFF',
    bubbleStyle: 'modern',
    bubbleAlignment: 'dynamic',
    fontSize: 'medium',
    fontFamily: 'system-ui',
    messageSpacing: 'normal',
    showTimestamps: true,
    showReadReceipts: true,
    gradientEnabled: true,
    gradientColors: ['#6C5CE7', '#A29BFE'],
  },
  minimal: {
    primaryColor: '#000000',
    accentColor: '#888888',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    bubbleStyle: 'minimal',
    bubbleAlignment: 'left',
    fontSize: 'medium',
    fontFamily: 'monospace',
    messageSpacing: 'compact',
    showTimestamps: false,
    showReadReceipts: false,
    gradientEnabled: false,
  },
}

/**
 * Messenger Settings Manager
 */
export class MessengerSettingsManager {
  private settingsKey = 'flowsphere-messenger-settings'
  private conversationSettingsKey = 'flowsphere-conversation-settings'

  /**
   * Get global messenger settings
   */
  getGlobalSettings(): MessengerGlobalSettings {
    try {
      const data = localStorage.getItem(this.settingsKey)
      if (data) {
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('Error loading messenger settings:', error)
    }

    return this.getDefaultGlobalSettings()
  }

  /**
   * Get default global settings
   */
  private getDefaultGlobalSettings(): MessengerGlobalSettings {
    return {
      defaultTheme: THEME_TEMPLATES.default,
      appearance: 'auto',
      compactMode: false,
      animations: true,
      soundEffects: true,
      hapticFeedback: true,
      enterToSend: false,
      mediaQuality: 'high',
      autoDownloadMedia: {
        photos: true,
        videos: false,
        files: false,
        onWifiOnly: true,
      },
      privacy: {
        onlineStatus: true,
        lastSeen: true,
        profilePhoto: true,
        readReceipts: true,
      },
      dataUsage: {
        autoPlayVideos: false,
        autoPlayGIFs: true,
        lowDataMode: false,
      },
    }
  }

  /**
   * Save global messenger settings
   */
  saveGlobalSettings(settings: MessengerGlobalSettings): void {
    localStorage.setItem(this.settingsKey, JSON.stringify(settings))
  }

  /**
   * Update global settings
   */
  updateGlobalSettings(updates: Partial<MessengerGlobalSettings>): MessengerGlobalSettings {
    const current = this.getGlobalSettings()
    const updated = { ...current, ...updates }
    this.saveGlobalSettings(updated)
    return updated
  }

  /**
   * Get conversation settings for a contact
   */
  getConversationSettings(contactId: string): ConversationSettings | null {
    try {
      const allSettings = this.getAllConversationSettings()
      return allSettings.find(s => s.contactId === contactId) || null
    } catch (error) {
      console.error('Error loading conversation settings:', error)
      return null
    }
  }

  /**
   * Get all conversation settings
   */
  getAllConversationSettings(): ConversationSettings[] {
    try {
      const data = localStorage.getItem(this.conversationSettingsKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      logger.error('Failed to get conversation settings from storage', error, 'MessengerSettings')
      return []
    }
  }

  /**
   * Create/update conversation settings
   */
  saveConversationSettings(settings: ConversationSettings): ConversationSettings {
    const allSettings = this.getAllConversationSettings()
    const existingIndex = allSettings.findIndex(s => s.contactId === settings.contactId)

    if (existingIndex >= 0) {
      allSettings[existingIndex] = settings
    } else {
      allSettings.push(settings)
    }

    localStorage.setItem(this.conversationSettingsKey, JSON.stringify(allSettings))
    return settings
  }

  /**
   * Update conversation settings
   */
  updateConversationSettings(
    contactId: string,
    updates: Partial<ConversationSettings>
  ): ConversationSettings {
    let settings = this.getConversationSettings(contactId)

    if (!settings) {
      // Create default settings
      const globalSettings = this.getGlobalSettings()
      settings = {
        contactId,
        contactName: '',
        theme: globalSettings.defaultTheme,
        notificationSettings: {
          muted: false,
          vibration: true,
          showPreview: true,
        },
        chatBehavior: {
          quickReplies: [],
          scheduledMessages: [],
        },
        privacy: {
          hideTypingIndicator: false,
          hideReadReceipts: false,
          hideLastSeen: false,
        },
        customization: {
          messageEffects: true,
          stickers: [],
        },
      }
    }

    const updated = { ...settings, ...updates }
    return this.saveConversationSettings(updated)
  }

  /**
   * Set nickname for contact
   */
  setNickname(contactId: string, nickname: string): ConversationSettings {
    return this.updateConversationSettings(contactId, { nickname })
  }

  /**
   * Set emoji for contact
   */
  setEmoji(contactId: string, emoji: string): ConversationSettings {
    return this.updateConversationSettings(contactId, { emoji })
  }

  /**
   * Apply theme template
   */
  applyThemeTemplate(
    contactId: string,
    templateName: keyof typeof THEME_TEMPLATES
  ): ConversationSettings {
    const theme = THEME_TEMPLATES[templateName]
    if (!theme) {
      throw new Error(`Theme template "${templateName}" not found`)
    }

    return this.updateConversationSettings(contactId, { theme })
  }

  /**
   * Customize theme colors
   */
  customizeTheme(contactId: string, themeUpdates: Partial<ContactTheme>): ConversationSettings {
    const settings = this.getConversationSettings(contactId)
    const currentTheme = settings?.theme || this.getGlobalSettings().defaultTheme

    const updatedTheme: ContactTheme = { ...currentTheme, ...themeUpdates }

    return this.updateConversationSettings(contactId, { theme: updatedTheme })
  }

  /**
   * Set custom background
   */
  setCustomBackground(contactId: string, backgroundUrl: string): ConversationSettings {
    return this.updateConversationSettings(contactId, {
      customization: {
        ...(this.getConversationSettings(contactId)?.customization || {}),
        chatWallpaper: backgroundUrl,
      } as any,
    })
  }

  /**
   * Mute/unmute conversation
   */
  toggleMute(contactId: string, muted?: boolean): ConversationSettings {
    const settings = this.getConversationSettings(contactId)
    const currentMuted = settings?.notificationSettings.muted || false
    const newMuted = muted !== undefined ? muted : !currentMuted

    return this.updateConversationSettings(contactId, {
      notificationSettings: {
        ...(settings?.notificationSettings || {}),
        muted: newMuted,
      } as any,
    })
  }

  /**
   * Add quick reply
   */
  addQuickReply(contactId: string, reply: string): ConversationSettings {
    const settings = this.getConversationSettings(contactId)
    const quickReplies = settings?.chatBehavior.quickReplies || []

    if (!quickReplies.includes(reply)) {
      quickReplies.push(reply)
    }

    return this.updateConversationSettings(contactId, {
      chatBehavior: {
        ...(settings?.chatBehavior || {}),
        quickReplies,
      } as any,
    })
  }

  /**
   * Remove quick reply
   */
  removeQuickReply(contactId: string, reply: string): ConversationSettings {
    const settings = this.getConversationSettings(contactId)
    const quickReplies = (settings?.chatBehavior.quickReplies || []).filter(r => r !== reply)

    return this.updateConversationSettings(contactId, {
      chatBehavior: {
        ...(settings?.chatBehavior || {}),
        quickReplies,
      } as any,
    })
  }

  /**
   * Schedule message
   */
  scheduleMessage(
    contactId: string,
    message: string,
    scheduledTime: string,
    recurring?: 'daily' | 'weekly' | 'monthly'
  ): ConversationSettings {
    const settings = this.getConversationSettings(contactId)
    const scheduledMessages = settings?.chatBehavior.scheduledMessages || []

    const newMessage: ScheduledMessage = {
      id: `scheduled-${Date.now()}`,
      message,
      scheduledTime,
      recurring,
      enabled: true,
    }

    scheduledMessages.push(newMessage)

    return this.updateConversationSettings(contactId, {
      chatBehavior: {
        ...(settings?.chatBehavior || {}),
        scheduledMessages,
      } as any,
    })
  }

  /**
   * Delete scheduled message
   */
  deleteScheduledMessage(contactId: string, messageId: string): ConversationSettings {
    const settings = this.getConversationSettings(contactId)
    const scheduledMessages = (settings?.chatBehavior.scheduledMessages || []).filter(
      m => m.id !== messageId
    )

    return this.updateConversationSettings(contactId, {
      chatBehavior: {
        ...(settings?.chatBehavior || {}),
        scheduledMessages,
      } as any,
    })
  }

  /**
   * Export settings
   */
  exportSettings(): string {
    return JSON.stringify(
      {
        global: this.getGlobalSettings(),
        conversations: this.getAllConversationSettings(),
      },
      null,
      2
    )
  }

  /**
   * Import settings
   */
  importSettings(data: string): { success: boolean; error?: string } {
    try {
      const imported = JSON.parse(data)

      if (imported.global) {
        this.saveGlobalSettings(imported.global)
      }

      if (imported.conversations && Array.isArray(imported.conversations)) {
        imported.conversations.forEach((settings: ConversationSettings) => {
          this.saveConversationSettings(settings)
        })
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
      }
    }
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(contactId?: string): void {
    if (contactId) {
      // Reset specific conversation
      const allSettings = this.getAllConversationSettings().filter(s => s.contactId !== contactId)
      localStorage.setItem(this.conversationSettingsKey, JSON.stringify(allSettings))
    } else {
      // Reset all
      localStorage.removeItem(this.settingsKey)
      localStorage.removeItem(this.conversationSettingsKey)
    }
  }

  /**
   * Get theme CSS variables
   */
  getThemeCSS(contactId: string): Record<string, string> {
    const settings = this.getConversationSettings(contactId)
    const theme = settings?.theme || this.getGlobalSettings().defaultTheme

    const css: Record<string, string> = {
      '--chat-primary-color': theme.primaryColor,
      '--chat-accent-color': theme.accentColor,
      '--chat-bg-color': theme.backgroundColor,
      '--chat-text-color': theme.textColor,
      '--chat-font-size':
        theme.fontSize === 'small' ? '14px' : theme.fontSize === 'large' ? '18px' : '16px',
      '--chat-font-family': theme.fontFamily,
      '--chat-message-spacing':
        theme.messageSpacing === 'compact'
          ? '4px'
          : theme.messageSpacing === 'relaxed'
            ? '12px'
            : '8px',
    }

    if (theme.gradientEnabled && theme.gradientColors) {
      css['--chat-gradient'] =
        `linear-gradient(135deg, ${theme.gradientColors[0]}, ${theme.gradientColors[1]})`
    }

    if (settings?.customization?.chatWallpaper) {
      css['--chat-wallpaper'] = `url(${settings.customization.chatWallpaper})`
    }

    return css
  }

  /**
   * Apply theme to DOM
   */
  applyThemeToDOM(contactId: string, element?: HTMLElement): void {
    const targetElement = element || document.documentElement
    const cssVars = this.getThemeCSS(contactId)

    Object.entries(cssVars).forEach(([key, value]) => {
      targetElement.style.setProperty(key, value)
    })
  }
}
