/**
 * FlowSphere Smart Home Integration
 * Connects to Google Home, Alexa, and other smart home platforms
 */

import { logger } from '@/lib/security-utils'

// Smart Home Device Types
export interface SmartDevice {
  id: string
  name: string
  type: SmartDeviceType
  traits: SmartDeviceTrait[]
  room: string
  platform: 'google' | 'alexa' | 'homekit' | 'local'
  isOnline: boolean
  lastUpdated: number
  state: DeviceState
}

export type SmartDeviceType =
  | 'light'
  | 'thermostat'
  | 'lock'
  | 'camera'
  | 'switch'
  | 'speaker'
  | 'display'
  | 'fan'
  | 'air_purifier'
  | 'vacuum'
  | 'sensor'
  | 'outlet'

export type SmartDeviceTrait =
  | 'OnOff'
  | 'Brightness'
  | 'ColorSetting'
  | 'TemperatureSetting'
  | 'FanSpeed'
  | 'LockUnlock'
  | 'OpenClose'
  | 'Volume'
  | 'MediaState'
  | 'Modes'
  | 'Scene'
  | 'StartStop'

export interface DeviceState {
  on?: boolean
  brightness?: number
  color?: { hue: number; saturation: number; brightness: number }
  temperature?: number
  targetTemperature?: number
  humidity?: number
  locked?: boolean
  openPercent?: number
  volume?: number
  isMuted?: boolean
  fanSpeed?: number
  mode?: string
  isRunning?: boolean
  currentActivity?: string
}

// Google Home Integration
export interface GoogleHomeConfig {
  clientId: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
}

// Storage key for smart home config
const STORAGE_KEY = 'flowsphere-smart-home-config'
const DEVICES_KEY = 'flowsphere-smart-home-devices'

class SmartHomeManager {
  private config: GoogleHomeConfig | null = null
  private devices: SmartDevice[] = []
  private listeners: Array<(devices: SmartDevice[]) => void> = []
  private refreshInterval: NodeJS.Timeout | null = null

  constructor() {
    this.loadConfig()
    this.loadDevices()
  }

  private loadConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.config = JSON.parse(stored)
      }
    } catch (error) {
      logger.error('Failed to load smart home config', error, 'SmartHome')
    }
  }

  private saveConfig() {
    try {
      if (this.config) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config))
      }
    } catch (error) {
      logger.error('Failed to save smart home config', error, 'SmartHome')
    }
  }

  private loadDevices() {
    try {
      const stored = localStorage.getItem(DEVICES_KEY)
      if (stored) {
        this.devices = JSON.parse(stored)
      }
    } catch (error) {
      logger.error('Failed to load smart home devices', error, 'SmartHome')
    }
  }

  private saveDevices() {
    try {
      localStorage.setItem(DEVICES_KEY, JSON.stringify(this.devices))
    } catch (error) {
      logger.error('Failed to save smart home devices', error, 'SmartHome')
    }
  }

  /**
   * Check if Google Home is connected
   */
  isGoogleConnected(): boolean {
    return !!(
      this.config?.accessToken &&
      this.config.expiresAt &&
      this.config.expiresAt > Date.now()
    )
  }

  /**
   * Get Google Home OAuth URL
   */
  getGoogleAuthUrl(): string {
    const clientId = import.meta.env.VITE_GOOGLE_HOME_CLIENT_ID || ''
    if (!clientId) {
      throw new Error('Google Home Client ID not configured')
    }

    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/google-home/callback`)
    const scope = encodeURIComponent('https://www.googleapis.com/auth/homegraph')
    const state = encodeURIComponent(crypto.randomUUID())

    // Store state for verification
    sessionStorage.setItem('google-home-auth-state', state)

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`
  }

  /**
   * Handle OAuth callback
   */
  async handleGoogleCallback(code: string, state: string): Promise<boolean> {
    const storedState = sessionStorage.getItem('google-home-auth-state')
    if (state !== storedState) {
      logger.error('Invalid OAuth state', null, 'SmartHome')
      return false
    }

    try {
      // Exchange code for tokens
      // In production, this should go through your backend to keep client secret secure
      const response = await fetch('/api/auth/google-home/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        throw new Error('Failed to exchange code for tokens')
      }

      const tokens = await response.json()

      this.config = {
        clientId: import.meta.env.VITE_GOOGLE_HOME_CLIENT_ID || '',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      }

      this.saveConfig()
      await this.syncDevices()

      return true
    } catch (error) {
      logger.error('Failed to complete Google Home OAuth', error, 'SmartHome')
      return false
    }
  }

  /**
   * Disconnect Google Home
   */
  disconnectGoogle() {
    this.config = null
    this.devices = this.devices.filter(d => d.platform !== 'google')
    localStorage.removeItem(STORAGE_KEY)
    this.saveDevices()
    this.notifyListeners()
  }

  /**
   * Sync devices from Google Home
   */
  async syncDevices(): Promise<SmartDevice[]> {
    if (!this.isGoogleConnected()) {
      logger.warn('Not connected to Google Home', null, 'SmartHome')
      return this.devices
    }

    try {
      // In production, make actual API call to Google Home Graph
      // For now, we'll simulate device discovery
      const response = await this.makeGoogleRequest('/devices')

      if (response.devices) {
        const googleDevices: SmartDevice[] = response.devices.map((d: any) => ({
          id: d.id,
          name: d.name.name,
          type: this.mapGoogleDeviceType(d.type),
          traits: d.traits || [],
          room: d.roomHint || 'Unknown',
          platform: 'google' as const,
          isOnline: d.willReportState,
          lastUpdated: Date.now(),
          state: this.parseGoogleDeviceState(d),
        }))

        // Update devices, preserving non-Google devices
        this.devices = [...this.devices.filter(d => d.platform !== 'google'), ...googleDevices]
        this.saveDevices()
        this.notifyListeners()
      }

      return this.devices
    } catch (error) {
      logger.error('Failed to sync devices', error, 'SmartHome')
      return this.devices
    }
  }

  /**
   * Make authenticated request to Google Home API
   */
  private async makeGoogleRequest(endpoint: string, method = 'GET', body?: any): Promise<any> {
    if (!this.config?.accessToken) {
      throw new Error('Not authenticated with Google Home')
    }

    // Check if token needs refresh
    if (this.config.expiresAt && this.config.expiresAt < Date.now() + 60000) {
      await this.refreshGoogleToken()
    }

    const response = await fetch(`https://homegraph.googleapis.com/v1${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Refresh Google access token
   */
  private async refreshGoogleToken(): Promise<void> {
    if (!this.config?.refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await fetch('/api/auth/google-home/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.config.refreshToken }),
      })

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }

      const tokens = await response.json()
      this.config.accessToken = tokens.access_token
      this.config.expiresAt = Date.now() + tokens.expires_in * 1000
      this.saveConfig()
    } catch (error) {
      logger.error('Failed to refresh Google token', error, 'SmartHome')
      this.disconnectGoogle()
    }
  }

  /**
   * Execute device command
   */
  async executeCommand(
    deviceId: string,
    command: string,
    params?: Record<string, any>
  ): Promise<boolean> {
    const device = this.devices.find(d => d.id === deviceId)
    if (!device) {
      logger.error('Device not found', { deviceId }, 'SmartHome')
      return false
    }

    try {
      if (device.platform === 'google') {
        // Send command to Google Home
        await this.makeGoogleRequest('/devices:executeCommand', 'POST', {
          requestId: crypto.randomUUID(),
          inputs: [
            {
              intent: 'action.devices.EXECUTE',
              payload: {
                commands: [
                  {
                    devices: [{ id: deviceId }],
                    execution: [
                      {
                        command: `action.devices.commands.${command}`,
                        params: params || {},
                      },
                    ],
                  },
                ],
              },
            },
          ],
        })
      }

      // Update local state optimistically
      this.updateDeviceState(deviceId, command, params)
      return true
    } catch (error) {
      logger.error('Failed to execute command', error, 'SmartHome')
      return false
    }
  }

  /**
   * Update local device state
   */
  private updateDeviceState(deviceId: string, command: string, params?: Record<string, any>) {
    const deviceIndex = this.devices.findIndex(d => d.id === deviceId)
    if (deviceIndex === -1) return

    const device = { ...this.devices[deviceIndex] }
    const state = { ...device.state }

    switch (command) {
      case 'OnOff':
        state.on = params?.on ?? !state.on
        break
      case 'BrightnessAbsolute':
        state.brightness = params?.brightness ?? 100
        break
      case 'ColorAbsolute':
        if (params?.color) {
          state.color = params.color
        }
        break
      case 'ThermostatTemperatureSetpoint':
        state.targetTemperature = params?.thermostatTemperatureSetpoint
        break
      case 'LockUnlock':
        state.locked = params?.lock ?? !state.locked
        break
      case 'SetVolume':
        state.volume = params?.volumeLevel ?? 50
        break
      case 'SetFanSpeed':
        state.fanSpeed = params?.fanSpeed ?? 50
        break
    }

    device.state = state
    device.lastUpdated = Date.now()
    this.devices[deviceIndex] = device
    this.saveDevices()
    this.notifyListeners()
  }

  /**
   * Get all devices
   */
  getDevices(): SmartDevice[] {
    return [...this.devices]
  }

  /**
   * Get devices by room
   */
  getDevicesByRoom(room: string): SmartDevice[] {
    return this.devices.filter(d => d.room.toLowerCase() === room.toLowerCase())
  }

  /**
   * Get device by ID
   */
  getDevice(id: string): SmartDevice | undefined {
    return this.devices.find(d => d.id === id)
  }

  /**
   * Add local device (not from smart home platform)
   */
  addLocalDevice(device: Omit<SmartDevice, 'id' | 'platform' | 'lastUpdated'>): SmartDevice {
    const newDevice: SmartDevice = {
      ...device,
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      platform: 'local',
      lastUpdated: Date.now(),
    }

    this.devices.push(newDevice)
    this.saveDevices()
    this.notifyListeners()
    return newDevice
  }

  /**
   * Remove device
   */
  removeDevice(id: string): boolean {
    const index = this.devices.findIndex(d => d.id === id)
    if (index === -1) return false

    this.devices.splice(index, 1)
    this.saveDevices()
    this.notifyListeners()
    return true
  }

  /**
   * Subscribe to device updates
   */
  subscribe(callback: (devices: SmartDevice[]) => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback([...this.devices])
      } catch (error) {
        logger.error('Listener error', error, 'SmartHome')
      }
    })
  }

  /**
   * Map Google device type to our type
   */
  private mapGoogleDeviceType(googleType: string): SmartDeviceType {
    const typeMap: Record<string, SmartDeviceType> = {
      'action.devices.types.LIGHT': 'light',
      'action.devices.types.THERMOSTAT': 'thermostat',
      'action.devices.types.LOCK': 'lock',
      'action.devices.types.CAMERA': 'camera',
      'action.devices.types.SWITCH': 'switch',
      'action.devices.types.SPEAKER': 'speaker',
      'action.devices.types.TV': 'display',
      'action.devices.types.FAN': 'fan',
      'action.devices.types.AIRPURIFIER': 'air_purifier',
      'action.devices.types.VACUUM': 'vacuum',
      'action.devices.types.SENSOR': 'sensor',
      'action.devices.types.OUTLET': 'outlet',
    }
    return typeMap[googleType] || 'switch'
  }

  /**
   * Parse Google device state
   */
  private parseGoogleDeviceState(device: any): DeviceState {
    const state: DeviceState = {}
    const traits = device.traits || []

    if (traits.includes('action.devices.traits.OnOff')) {
      state.on = device.states?.on ?? false
    }
    if (traits.includes('action.devices.traits.Brightness')) {
      state.brightness = device.states?.brightness ?? 100
    }
    if (traits.includes('action.devices.traits.TemperatureSetting')) {
      state.temperature = device.states?.thermostatTemperatureAmbient
      state.targetTemperature = device.states?.thermostatTemperatureSetpoint
    }
    if (traits.includes('action.devices.traits.LockUnlock')) {
      state.locked = device.states?.isLocked ?? false
    }
    if (traits.includes('action.devices.traits.Volume')) {
      state.volume = device.states?.currentVolume ?? 50
      state.isMuted = device.states?.isMuted ?? false
    }

    return state
  }

  /**
   * Start periodic device refresh
   */
  startAutoRefresh(intervalMs = 30000) {
    if (this.refreshInterval) return

    this.refreshInterval = setInterval(() => {
      if (this.isGoogleConnected()) {
        this.syncDevices()
      }
    }, intervalMs)
  }

  /**
   * Stop periodic refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
  }
}

// Singleton instance
let smartHomeInstance: SmartHomeManager | null = null

export function getSmartHomeManager(): SmartHomeManager {
  if (!smartHomeInstance) {
    smartHomeInstance = new SmartHomeManager()
  }
  return smartHomeInstance
}

/**
 * React hook for smart home devices
 */
export function useSmartHome() {
  const manager = getSmartHomeManager()

  return {
    isGoogleConnected: () => manager.isGoogleConnected(),
    getGoogleAuthUrl: () => manager.getGoogleAuthUrl(),
    handleGoogleCallback: (code: string, state: string) =>
      manager.handleGoogleCallback(code, state),
    disconnectGoogle: () => manager.disconnectGoogle(),
    syncDevices: () => manager.syncDevices(),
    executeCommand: (deviceId: string, command: string, params?: Record<string, any>) =>
      manager.executeCommand(deviceId, command, params),
    getDevices: () => manager.getDevices(),
    getDevicesByRoom: (room: string) => manager.getDevicesByRoom(room),
    getDevice: (id: string) => manager.getDevice(id),
    addLocalDevice: (device: Omit<SmartDevice, 'id' | 'platform' | 'lastUpdated'>) =>
      manager.addLocalDevice(device),
    removeDevice: (id: string) => manager.removeDevice(id),
    subscribe: (callback: (devices: SmartDevice[]) => void) => manager.subscribe(callback),
    startAutoRefresh: (intervalMs?: number) => manager.startAutoRefresh(intervalMs),
    stopAutoRefresh: () => manager.stopAutoRefresh(),
  }
}

// Common device commands for easy use
export const DeviceCommands = {
  // OnOff
  turnOn: (deviceId: string) =>
    getSmartHomeManager().executeCommand(deviceId, 'OnOff', { on: true }),
  turnOff: (deviceId: string) =>
    getSmartHomeManager().executeCommand(deviceId, 'OnOff', { on: false }),
  toggle: (deviceId: string) => getSmartHomeManager().executeCommand(deviceId, 'OnOff'),

  // Brightness
  setBrightness: (deviceId: string, level: number) =>
    getSmartHomeManager().executeCommand(deviceId, 'BrightnessAbsolute', { brightness: level }),

  // Thermostat
  setTemperature: (deviceId: string, temp: number) =>
    getSmartHomeManager().executeCommand(deviceId, 'ThermostatTemperatureSetpoint', {
      thermostatTemperatureSetpoint: temp,
    }),

  // Lock
  lock: (deviceId: string) =>
    getSmartHomeManager().executeCommand(deviceId, 'LockUnlock', { lock: true }),
  unlock: (deviceId: string) =>
    getSmartHomeManager().executeCommand(deviceId, 'LockUnlock', { lock: false }),

  // Volume
  setVolume: (deviceId: string, level: number) =>
    getSmartHomeManager().executeCommand(deviceId, 'SetVolume', { volumeLevel: level }),

  // Fan
  setFanSpeed: (deviceId: string, speed: number) =>
    getSmartHomeManager().executeCommand(deviceId, 'SetFanSpeed', { fanSpeed: speed }),
}
