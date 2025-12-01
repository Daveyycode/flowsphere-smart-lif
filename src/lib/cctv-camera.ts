/**
 * CCTV Camera Integration
 * Application-based camera connection and monitoring
 */

export interface CCTVCamera {
  id: string
  name: string
  location: string
  type: 'indoor' | 'outdoor' | 'doorbell' | 'ptz' | 'dome'
  status: 'online' | 'offline' | 'recording' | 'error'
  streamUrl?: string
  snapshotUrl?: string
  resolution: string // e.g., "1080p", "4K"
  fps: number
  hasAudio: boolean
  hasPTZ: boolean // Pan-Tilt-Zoom
  hasMotionDetection: boolean
  hasNightVision: boolean
  batteryLevel?: number // For wireless cameras
  lastActivity: string
  recordingSchedule: {
    enabled: boolean
    mode: 'continuous' | 'motion' | 'scheduled'
    schedule?: Array<{
      day: number // 0-6
      startTime: string
      endTime: string
    }>
  }
}

export interface CameraEvent {
  id: string
  cameraId: string
  cameraName: string
  type: 'motion' | 'person' | 'vehicle' | 'animal' | 'package' | 'sound' | 'offline'
  timestamp: string
  snapshotUrl?: string
  videoUrl?: string
  confidence: number // 0-1
  zone?: string // Area where detection occurred
  severity: 'info' | 'warning' | 'alert'
}

export interface CameraAlert {
  id: string
  cameraId: string
  cameraName: string
  alertType: 'motion-detected' | 'person-detected' | 'camera-offline' | 'low-battery' | 'recording-stopped'
  severity: 'info' | 'warning' | 'critical'
  timestamp: string
  title: string
  message: string
  snapshotUrl?: string
  actionable: boolean
  actions: Array<{
    label: string
    type: 'view-live' | 'view-recording' | 'dismiss' | 'call-police'
  }>
}

export interface CameraStream {
  cameraId: string
  streamUrl: string
  isLive: boolean
  quality: 'low' | 'medium' | 'high' | 'auto'
  latency: number // milliseconds
}

/**
 * Connect to CCTV camera (simulated)
 * In production, would use actual camera API (ONVIF, RTSP, etc.)
 */
export async function connectCamera(
  connectionInfo: {
    ip: string
    port: number
    username: string
    password: string
    protocol: 'rtsp' | 'http' | 'onvif'
  }
): Promise<CCTVCamera> {
  // Simulate connection delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // In production, would actually connect to camera
  // For now, return mock camera
  const camera: CCTVCamera = {
    id: `camera-${Date.now()}`,
    name: 'Front Door Camera',
    location: 'Front entrance',
    type: 'doorbell',
    status: 'online',
    streamUrl: `${connectionInfo.protocol}://${connectionInfo.ip}:${connectionInfo.port}/stream`,
    snapshotUrl: `http://${connectionInfo.ip}:${connectionInfo.port}/snapshot`,
    resolution: '1080p',
    fps: 30,
    hasAudio: true,
    hasPTZ: false,
    hasMotionDetection: true,
    hasNightVision: true,
    lastActivity: new Date().toISOString(),
    recordingSchedule: {
      enabled: true,
      mode: 'motion'
    }
  }

  return camera
}

/**
 * Get camera live stream
 */
export async function getCameraStream(camera: CCTVCamera): Promise<CameraStream> {
  if (!camera.streamUrl) {
    throw new Error('Camera does not have a stream URL')
  }

  return {
    cameraId: camera.id,
    streamUrl: camera.streamUrl,
    isLive: camera.status === 'online' || camera.status === 'recording',
    quality: 'auto',
    latency: 500
  }
}

/**
 * Get camera snapshot
 */
export async function getCameraSnapshot(camera: CCTVCamera): Promise<string> {
  if (!camera.snapshotUrl) {
    throw new Error('Camera does not support snapshots')
  }

  // In production, would fetch actual snapshot
  // For now, return placeholder
  return camera.snapshotUrl
}

/**
 * Control PTZ camera (Pan-Tilt-Zoom)
 */
export async function controlPTZ(
  camera: CCTVCamera,
  action: 'pan-left' | 'pan-right' | 'tilt-up' | 'tilt-down' | 'zoom-in' | 'zoom-out' | 'preset'| 'home',
  value?: number
): Promise<void> {
  if (!camera.hasPTZ) {
    throw new Error('Camera does not support PTZ')
  }

  // In production, would send actual PTZ commands
  console.log(`PTZ action: ${action}`, value)
  await new Promise(resolve => setTimeout(resolve, 500))
}

/**
 * Monitor cameras for events
 */
export function monitorCameras(
  cameras: CCTVCamera[],
  onEvent: (event: CameraEvent) => void,
  onAlert: (alert: CameraAlert) => void
): () => void {
  const intervals: NodeJS.Timeout[] = []

  cameras.forEach(camera => {
    // Check camera status every 30 seconds
    const statusInterval = setInterval(() => {
      // Simulate random events (in production, would receive from camera API)
      if (Math.random() > 0.95 && camera.hasMotionDetection) {
        const eventType = Math.random() > 0.7 ? 'person' : 'motion'

        const event: CameraEvent = {
          id: `event-${Date.now()}`,
          cameraId: camera.id,
          cameraName: camera.name,
          type: eventType,
          timestamp: new Date().toISOString(),
          snapshotUrl: camera.snapshotUrl,
          confidence: 0.85 + Math.random() * 0.15,
          severity: eventType === 'person' ? 'alert' : 'info'
        }

        onEvent(event)

        // Generate alert for person detection
        if (eventType === 'person') {
          const alert: CameraAlert = {
            id: `alert-${Date.now()}`,
            cameraId: camera.id,
            cameraName: camera.name,
            alertType: 'person-detected',
            severity: 'warning',
            timestamp: new Date().toISOString(),
            title: `👤 Person Detected - ${camera.name}`,
            message: `Motion detected at ${camera.location}. A person was identified with 85% confidence.`,
            snapshotUrl: camera.snapshotUrl,
            actionable: true,
            actions: [
              { label: 'View Live', type: 'view-live' },
              { label: 'View Recording', type: 'view-recording' },
              { label: 'Dismiss', type: 'dismiss' }
            ]
          }

          onAlert(alert)
        }
      }

      // Check for offline cameras
      if (camera.status === 'offline') {
        const alert: CameraAlert = {
          id: `offline-${camera.id}`,
          cameraId: camera.id,
          cameraName: camera.name,
          alertType: 'camera-offline',
          severity: 'warning',
          timestamp: new Date().toISOString(),
          title: `📹 Camera Offline - ${camera.name}`,
          message: `${camera.name} at ${camera.location} has gone offline. Check power and network connection.`,
          actionable: false,
          actions: [{ label: 'Dismiss', type: 'dismiss' }]
        }

        onAlert(alert)
      }

      // Check battery level
      if (camera.batteryLevel !== undefined && camera.batteryLevel < 20) {
        const alert: CameraAlert = {
          id: `battery-${camera.id}`,
          cameraId: camera.id,
          cameraName: camera.name,
          alertType: 'low-battery',
          severity: 'warning',
          timestamp: new Date().toISOString(),
          title: `🔋 Low Battery - ${camera.name}`,
          message: `${camera.name} battery is at ${camera.batteryLevel}%. Charge soon.`,
          actionable: false,
          actions: [{ label: 'Dismiss', type: 'dismiss' }]
        }

        onAlert(alert)
      }
    }, 30000) // Every 30 seconds

    intervals.push(statusInterval)
  })

  // Cleanup function
  return () => {
    intervals.forEach(interval => clearInterval(interval))
  }
}

/**
 * Start/stop camera recording
 */
export async function toggleRecording(camera: CCTVCamera, enable: boolean): Promise<void> {
  // In production, would send actual recording command to camera
  console.log(`Recording ${enable ? 'started' : 'stopped'} for ${camera.name}`)
  await new Promise(resolve => setTimeout(resolve, 500))
}

/**
 * Get camera recordings
 */
export async function getCameraRecordings(
  camera: CCTVCamera,
  startDate: Date,
  endDate: Date
): Promise<Array<{
  id: string
  timestamp: string
  duration: number
  thumbnailUrl: string
  videoUrl: string
  events: string[]
}>> {
  // In production, would fetch actual recordings from NVR/camera
  // For now, return mock data
  const recordings = []
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  for (let i = 0; i < Math.min(daysDiff, 10); i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    recordings.push({
      id: `recording-${i}`,
      timestamp: date.toISOString(),
      duration: Math.floor(Math.random() * 300) + 60, // 60-360 seconds
      thumbnailUrl: camera.snapshotUrl || '',
      videoUrl: `${camera.streamUrl}/recording-${i}.mp4`,
      events: ['motion']
    })
  }

  return recordings
}

/**
 * Add popular camera brands integration info
 */
export interface CameraBrandSetup {
  brand: string
  models: string[]
  setupInstructions: string[]
  defaultPort: number
  protocol: 'rtsp' | 'http' | 'onvif'
  appSupport: boolean
}

export const SUPPORTED_CAMERAS: CameraBrandSetup[] = [
  {
    brand: 'Ring',
    models: ['Video Doorbell', 'Stick Up Cam', 'Spotlight Cam'],
    setupInstructions: [
      '1. Open Ring app and log in',
      '2. Go to Account > Authorized Client Apps',
      '3. Generate API token',
      '4. Enter token in FlowSphere AI',
      '5. Cameras will auto-discover'
    ],
    defaultPort: 443,
    protocol: 'http',
    appSupport: true
  },
  {
    brand: 'Nest',
    models: ['Nest Cam', 'Nest Hello', 'Nest Cam IQ'],
    setupInstructions: [
      '1. Open Google Home app',
      '2. Enable Camera API in settings',
      '3. Generate access token',
      '4. Link to FlowSphere AI',
      '5. Grant camera permissions'
    ],
    defaultPort: 443,
    protocol: 'http',
    appSupport: true
  },
  {
    brand: 'Arlo',
    models: ['Arlo Pro', 'Arlo Ultra', 'Arlo Essential'],
    setupInstructions: [
      '1. Log into Arlo account',
      '2. Enable API access',
      '3. Copy API credentials',
      '4. Paste into FlowSphere AI',
      '5. Select cameras to monitor'
    ],
    defaultPort: 443,
    protocol: 'http',
    appSupport: true
  },
  {
    brand: 'Hikvision',
    models: ['DS-2CD2xxx', 'DS-2DE2xxx', 'Various IP Cameras'],
    setupInstructions: [
      '1. Find camera IP address',
      '2. Enable ONVIF in camera settings',
      '3. Create user account with viewer permissions',
      '4. Enter IP and credentials in FlowSphere AI',
      '5. Test connection'
    ],
    defaultPort: 554,
    protocol: 'rtsp',
    appSupport: false
  },
  {
    brand: 'Dahua',
    models: ['IPC-HFWxxxx', 'IPC-HDWxxxx', 'Various models'],
    setupInstructions: [
      '1. Access camera web interface',
      '2. Enable RTSP stream',
      '3. Configure motion detection',
      '4. Add camera to FlowSphere AI with IP:554',
      '5. Test live view'
    ],
    defaultPort: 554,
    protocol: 'rtsp',
    appSupport: false
  },
  {
    brand: 'Wyze',
    models: ['Wyze Cam v2', 'Wyze Cam v3', 'Wyze Cam Pan'],
    setupInstructions: [
      '1. Enable RTSP firmware on camera',
      '2. Note RTSP URL and credentials',
      '3. Add to FlowSphere AI',
      '4. Configure alerts',
      '5. Done!'
    ],
    defaultPort: 554,
    protocol: 'rtsp',
    appSupport: true
  }
]

/**
 * Generate mock cameras for testing
 */
export function generateMockCameras(): CCTVCamera[] {
  return [
    {
      id: 'camera-1',
      name: 'Front Door',
      location: 'Main entrance',
      type: 'doorbell',
      status: 'online',
      streamUrl: 'rtsp://192.168.1.100:554/stream',
      snapshotUrl: 'http://192.168.1.100/snapshot.jpg',
      resolution: '1080p',
      fps: 30,
      hasAudio: true,
      hasPTZ: false,
      hasMotionDetection: true,
      hasNightVision: true,
      lastActivity: new Date().toISOString(),
      recordingSchedule: {
        enabled: true,
        mode: 'motion'
      }
    },
    {
      id: 'camera-2',
      name: 'Backyard',
      location: 'Back garden',
      type: 'outdoor',
      status: 'online',
      streamUrl: 'rtsp://192.168.1.101:554/stream',
      snapshotUrl: 'http://192.168.1.101/snapshot.jpg',
      resolution: '4K',
      fps: 20,
      hasAudio: false,
      hasPTZ: true,
      hasMotionDetection: true,
      hasNightVision: true,
      lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      recordingSchedule: {
        enabled: true,
        mode: 'continuous'
      }
    },
    {
      id: 'camera-3',
      name: 'Living Room',
      location: 'Indoor living area',
      type: 'indoor',
      status: 'recording',
      resolution: '1080p',
      fps: 25,
      hasAudio: true,
      hasPTZ: true,
      hasMotionDetection: true,
      hasNightVision: false,
      batteryLevel: 85,
      lastActivity: new Date().toISOString(),
      recordingSchedule: {
        enabled: true,
        mode: 'scheduled',
        schedule: [
          { day: 1, startTime: '08:00', endTime: '18:00' },
          { day: 2, startTime: '08:00', endTime: '18:00' },
          { day: 3, startTime: '08:00', endTime: '18:00' }
        ]
      }
    }
  ]
}
