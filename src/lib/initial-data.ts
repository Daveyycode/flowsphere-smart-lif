import { Device, Automation } from '@/components/devices-automations-view'
import { FamilyMember } from '@/components/family-view'
import { Notification } from '@/components/notifications-resources-view'
import { CCTVCamera } from '@/components/cctv-guard-ai'

// Devices will be added by users via the UI
export const initialDevices: Device[] = []

// Family members will be added by users via the invite form
export const initialFamilyMembers: FamilyMember[] = []

// Notifications will be populated from real sources (email, calendar, security, etc.)
export const initialNotifications: Notification[] = []

// Cameras will be added when users configure their CCTV devices
export const initialCameras: CCTVCamera[] = []

// Automations will be created by users via the automation builder
export const initialAutomations: Automation[] = []
