/**
 * Active Device Configuration System
 * Default grayed guidance mode with click-to-configure functionality
 * Manages devices, family, automation, energy API, cameras, etc.
 */

export interface DeviceConfig {
  id: string
  name: string
  type: 'smart-light' | 'thermostat' | 'lock' | 'camera' | 'sensor' | 'other'
  location: string
  status: 'online' | 'offline' | 'inactive'
  configured: boolean
  settings: Record<string, any>
  lastActivity?: string
  apiKey?: string
}

export interface AutomationRule {
  id: string
  name: string
  enabled: boolean
  trigger: {
    type: 'time' | 'device' | 'location' | 'weather' | 'manual'
    conditions: Record<string, any>
  }
  actions: Array<{
    deviceId: string
    action: string
    parameters: Record<string, any>
  }>
  configured: boolean
}

export interface EnergyConfig {
  id: string
  provider: string
  apiKey?: string
  configured: boolean
  monitoring: {
    realTime: boolean
    history: boolean
    predictions: boolean
  }
  usage: {
    current?: number
    daily?: number
    monthly?: number
  }
}

export interface CameraConfig {
  id: string
  name: string
  type: 'cctv' | 'hidden' | 'doorbell' | 'security'
  location: string
  configured: boolean
  hidden: boolean // Hidden cameras stored in vault
  stream?: {
    url: string
    protocol: 'rtsp' | 'http' | 'webrtc'
  }
  recording: {
    enabled: boolean
    storage: 'local' | 'cloud'
    retention: number // days
  }
  alerts: {
    motion: boolean
    sound: boolean
    faceDetection: boolean
  }
}

export interface ConfigSection {
  id: string
  title: string
  description: string
  configured: boolean
  items: number // Count of configured items
  icon: string
  guidanceText: string
}

/**
 * Active Device Configuration Manager
 */
export class ActiveDeviceConfigManager {
  private devicesKey = 'flowsphere-devices-config'
  private automationKey = 'flowsphere-automation-config'
  private energyKey = 'flowsphere-energy-config'
  private camerasKey = 'flowsphere-cameras-config'
  private sectionsKey = 'flowsphere-config-sections'

  constructor() {
    this.initializeSections()
  }

  /**
   * Initialize configuration sections
   */
  private initializeSections(): void {
    const existing = this.getAllSections()
    if (existing.length > 0) return

    const defaultSections: ConfigSection[] = [
      {
        id: 'devices',
        title: 'Smart Devices',
        description: 'Connect and control your smart home devices',
        configured: false,
        items: 0,
        icon: '🏠',
        guidanceText: 'Click to add smart lights, thermostats, locks, and more'
      },
      {
        id: 'family',
        title: 'Family Members',
        description: 'Add family members for safety monitoring',
        configured: false,
        items: 0,
        icon: '👨‍👩‍👧‍👦',
        guidanceText: 'Click to add family members with phone numbers and locations'
      },
      {
        id: 'automation',
        title: 'Automation Rules',
        description: 'Create smart automation rules',
        configured: false,
        items: 0,
        icon: '⚡',
        guidanceText: 'Click to create automation rules based on time, location, or events'
      },
      {
        id: 'energy',
        title: 'Energy Monitoring',
        description: 'Monitor your energy usage',
        configured: false,
        items: 0,
        icon: '🔋',
        guidanceText: 'Click to connect your energy provider API'
      },
      {
        id: 'cameras',
        title: 'Security Cameras',
        description: 'Manage CCTV and security cameras',
        configured: false,
        items: 0,
        icon: '📹',
        guidanceText: 'Click to add CCTV cameras and configure recording'
      },
      {
        id: 'hidden-cameras',
        title: 'Hidden Cameras',
        description: 'Secure hidden camera vault',
        configured: false,
        items: 0,
        icon: '🔒',
        guidanceText: 'Click to add hidden cameras (stored in secure vault)'
      }
    ]

    localStorage.setItem(this.sectionsKey, JSON.stringify(defaultSections))
  }

  /**
   * Get all configuration sections
   */
  getAllSections(): ConfigSection[] {
    try {
      const stored = localStorage.getItem(this.sectionsKey)
      if (!stored) return []

      const sections: ConfigSection[] = JSON.parse(stored)

      // Update item counts dynamically
      sections.forEach(section => {
        switch (section.id) {
          case 'devices':
            section.items = this.getAllDevices().length
            section.configured = section.items > 0
            break
          case 'family':
            // Import from family-safety-enhanced if available
            section.items = 0 // Would get from EnhancedFamilySafetyManager
            break
          case 'automation':
            section.items = this.getAllAutomationRules().length
            section.configured = section.items > 0
            break
          case 'energy':
            const energy = this.getEnergyConfig()
            section.configured = energy?.configured || false
            section.items = section.configured ? 1 : 0
            break
          case 'cameras':
            const cameras = this.getAllCameras().filter(c => !c.hidden)
            section.items = cameras.length
            section.configured = cameras.length > 0
            break
          case 'hidden-cameras':
            const hiddenCameras = this.getAllCameras().filter(c => c.hidden)
            section.items = hiddenCameras.length
            section.configured = hiddenCameras.length > 0
            break
        }
      })

      return sections
    } catch {
      return []
    }
  }

  /**
   * Get section by ID
   */
  getSection(sectionId: string): ConfigSection | null {
    const sections = this.getAllSections()
    return sections.find(s => s.id === sectionId) || null
  }

  // Device Management

  /**
   * Add a device
   */
  addDevice(device: Omit<DeviceConfig, 'id' | 'configured'>): DeviceConfig {
    const newDevice: DeviceConfig = {
      ...device,
      id: `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      configured: true
    }

    const devices = this.getAllDevices()
    devices.push(newDevice)
    localStorage.setItem(this.devicesKey, JSON.stringify(devices))

    this.updateSectionStatus('devices')

    return newDevice
  }

  /**
   * Get all devices
   */
  getAllDevices(): DeviceConfig[] {
    try {
      const stored = localStorage.getItem(this.devicesKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Get devices by location
   */
  getDevicesByLocation(location: string): DeviceConfig[] {
    return this.getAllDevices().filter(d => d.location === location)
  }

  /**
   * Update device
   */
  updateDevice(deviceId: string, updates: Partial<DeviceConfig>): void {
    const devices = this.getAllDevices()
    const device = devices.find(d => d.id === deviceId)

    if (device) {
      Object.assign(device, updates)
      localStorage.setItem(this.devicesKey, JSON.stringify(devices))
    }
  }

  /**
   * Delete device
   */
  deleteDevice(deviceId: string): void {
    const devices = this.getAllDevices()
    const filtered = devices.filter(d => d.id !== deviceId)
    localStorage.setItem(this.devicesKey, JSON.stringify(filtered))

    this.updateSectionStatus('devices')
  }

  /**
   * Control device
   */
  controlDevice(deviceId: string, action: string, parameters?: Record<string, any>): {
    success: boolean
    message: string
  } {
    const device = this.getAllDevices().find(d => d.id === deviceId)

    if (!device) {
      return { success: false, message: 'Device not found' }
    }

    if (device.status === 'offline') {
      return { success: false, message: 'Device is offline' }
    }

    // In production, this would call the actual device API
    console.log(`Controlling device ${device.name}: ${action}`, parameters)

    // Update device status
    device.lastActivity = new Date().toISOString()
    this.updateDevice(deviceId, device)

    return { success: true, message: `Device ${action} successful` }
  }

  // Automation Management

  /**
   * Add automation rule
   */
  addAutomationRule(rule: Omit<AutomationRule, 'id' | 'configured'>): AutomationRule {
    const newRule: AutomationRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      configured: true
    }

    const rules = this.getAllAutomationRules()
    rules.push(newRule)
    localStorage.setItem(this.automationKey, JSON.stringify(rules))

    this.updateSectionStatus('automation')

    return newRule
  }

  /**
   * Get all automation rules
   */
  getAllAutomationRules(): AutomationRule[] {
    try {
      const stored = localStorage.getItem(this.automationKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Get enabled automation rules
   */
  getEnabledRules(): AutomationRule[] {
    return this.getAllAutomationRules().filter(r => r.enabled)
  }

  /**
   * Update automation rule
   */
  updateAutomationRule(ruleId: string, updates: Partial<AutomationRule>): void {
    const rules = this.getAllAutomationRules()
    const rule = rules.find(r => r.id === ruleId)

    if (rule) {
      Object.assign(rule, updates)
      localStorage.setItem(this.automationKey, JSON.stringify(rules))
    }
  }

  /**
   * Delete automation rule
   */
  deleteAutomationRule(ruleId: string): void {
    const rules = this.getAllAutomationRules()
    const filtered = rules.filter(r => r.id !== ruleId)
    localStorage.setItem(this.automationKey, JSON.stringify(filtered))

    this.updateSectionStatus('automation')
  }

  /**
   * Execute automation rule
   */
  executeAutomationRule(ruleId: string): { success: boolean; message: string } {
    const rule = this.getAllAutomationRules().find(r => r.id === ruleId)

    if (!rule) {
      return { success: false, message: 'Rule not found' }
    }

    if (!rule.enabled) {
      return { success: false, message: 'Rule is disabled' }
    }

    // Execute each action
    let allSucceeded = true
    for (const action of rule.actions) {
      const result = this.controlDevice(action.deviceId, action.action, action.parameters)
      if (!result.success) {
        allSucceeded = false
      }
    }

    return {
      success: allSucceeded,
      message: allSucceeded ? 'All actions executed successfully' : 'Some actions failed'
    }
  }

  // Energy Monitoring

  /**
   * Configure energy monitoring
   */
  configureEnergy(config: Omit<EnergyConfig, 'id'>): EnergyConfig {
    const energyConfig: EnergyConfig = {
      ...config,
      id: 'energy-main'
    }

    localStorage.setItem(this.energyKey, JSON.stringify(energyConfig))
    this.updateSectionStatus('energy')

    return energyConfig
  }

  /**
   * Get energy configuration
   */
  getEnergyConfig(): EnergyConfig | null {
    try {
      const stored = localStorage.getItem(this.energyKey)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  /**
   * Update energy usage
   */
  updateEnergyUsage(usage: EnergyConfig['usage']): void {
    const config = this.getEnergyConfig()
    if (config) {
      config.usage = { ...config.usage, ...usage }
      localStorage.setItem(this.energyKey, JSON.stringify(config))
    }
  }

  // Camera Management

  /**
   * Add camera
   */
  addCamera(camera: Omit<CameraConfig, 'id' | 'configured'>): CameraConfig {
    const newCamera: CameraConfig = {
      ...camera,
      id: `camera-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      configured: true
    }

    const cameras = this.getAllCameras()
    cameras.push(newCamera)
    localStorage.setItem(this.camerasKey, JSON.stringify(cameras))

    this.updateSectionStatus(camera.hidden ? 'hidden-cameras' : 'cameras')

    return newCamera
  }

  /**
   * Get all cameras
   */
  getAllCameras(): CameraConfig[] {
    try {
      const stored = localStorage.getItem(this.camerasKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Get visible cameras (not hidden)
   */
  getVisibleCameras(): CameraConfig[] {
    return this.getAllCameras().filter(c => !c.hidden)
  }

  /**
   * Get hidden cameras (vault)
   */
  getHiddenCameras(): CameraConfig[] {
    return this.getAllCameras().filter(c => c.hidden)
  }

  /**
   * Update camera
   */
  updateCamera(cameraId: string, updates: Partial<CameraConfig>): void {
    const cameras = this.getAllCameras()
    const camera = cameras.find(c => c.id === cameraId)

    if (camera) {
      Object.assign(camera, updates)
      localStorage.setItem(this.camerasKey, JSON.stringify(cameras))
    }
  }

  /**
   * Delete camera
   */
  deleteCamera(cameraId: string): void {
    const cameras = this.getAllCameras()
    const camera = cameras.find(c => c.id === cameraId)
    const wasHidden = camera?.hidden

    const filtered = cameras.filter(c => c.id !== cameraId)
    localStorage.setItem(this.camerasKey, JSON.stringify(filtered))

    this.updateSectionStatus(wasHidden ? 'hidden-cameras' : 'cameras')
  }

  /**
   * Get camera stream
   */
  getCameraStream(cameraId: string): CameraConfig['stream'] | null {
    const camera = this.getAllCameras().find(c => c.id === cameraId)
    return camera?.stream || null
  }

  // Helper methods

  /**
   * Update section configuration status
   */
  private updateSectionStatus(sectionId: string): void {
    const sections = this.getAllSections()
    const section = sections.find(s => s.id === sectionId)

    if (section) {
      localStorage.setItem(this.sectionsKey, JSON.stringify(sections))
    }
  }

  /**
   * Check if any section is configured
   */
  hasConfiguredSections(): boolean {
    const sections = this.getAllSections()
    return sections.some(s => s.configured)
  }

  /**
   * Get configuration summary
   */
  getConfigurationSummary(): {
    totalSections: number
    configuredSections: number
    totalDevices: number
    totalAutomation: number
    totalCameras: number
    energyConfigured: boolean
  } {
    const sections = this.getAllSections()

    return {
      totalSections: sections.length,
      configuredSections: sections.filter(s => s.configured).length,
      totalDevices: this.getAllDevices().length,
      totalAutomation: this.getAllAutomationRules().length,
      totalCameras: this.getAllCameras().length,
      energyConfigured: this.getEnergyConfig()?.configured || false
    }
  }

  /**
   * Export all configurations
   */
  exportConfigurations(): string {
    return JSON.stringify({
      devices: this.getAllDevices(),
      automation: this.getAllAutomationRules(),
      energy: this.getEnergyConfig(),
      cameras: this.getAllCameras()
    }, null, 2)
  }

  /**
   * Import configurations
   */
  importConfigurations(data: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(data)

      if (parsed.devices) {
        localStorage.setItem(this.devicesKey, JSON.stringify(parsed.devices))
      }
      if (parsed.automation) {
        localStorage.setItem(this.automationKey, JSON.stringify(parsed.automation))
      }
      if (parsed.energy) {
        localStorage.setItem(this.energyKey, JSON.stringify(parsed.energy))
      }
      if (parsed.cameras) {
        localStorage.setItem(this.camerasKey, JSON.stringify(parsed.cameras))
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Invalid configuration data' }
    }
  }

  /**
   * Reset all configurations
   */
  resetAllConfigurations(): void {
    localStorage.removeItem(this.devicesKey)
    localStorage.removeItem(this.automationKey)
    localStorage.removeItem(this.energyKey)
    localStorage.removeItem(this.camerasKey)
    this.initializeSections()
  }
}

/**
 * Initialize active device configuration
 */
export function initializeActiveDeviceConfig(): ActiveDeviceConfigManager {
  return new ActiveDeviceConfigManager()
}
