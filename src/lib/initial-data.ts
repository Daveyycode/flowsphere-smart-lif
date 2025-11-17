import { Device } from '@/components/devices-view'
import { FamilyMember } from '@/components/family-view'
import { Notification } from '@/components/notifications-view'
import { CCTVCamera } from '@/components/cctv-view'
import { Automation } from '@/components/automations-view'

export const initialDevices: Device[] = [
  {
    id: '1',
    name: 'Living Room Light',
    type: 'light',
    status: 'online',
    isOn: true,
    brightness: 75,
    room: 'Living Room'
  },
  {
    id: '2',
    name: 'Bedroom Thermostat',
    type: 'thermostat',
    status: 'online',
    isOn: true,
    temperature: 72,
    room: 'Bedroom'
  },
  {
    id: '3',
    name: 'Front Door Lock',
    type: 'lock',
    status: 'online',
    isOn: true,
    locked: true,
    room: 'Entrance'
  },
  {
    id: '4',
    name: 'Front Door Camera',
    type: 'camera',
    status: 'online',
    isOn: true,
    isRecording: false,
    cameraLocation: 'outside',
    room: 'Front Door'
  },
  {
    id: '5',
    name: 'Backyard Camera',
    type: 'camera',
    status: 'online',
    isOn: true,
    isRecording: false,
    cameraLocation: 'outside',
    room: 'Backyard'
  },
  {
    id: '6',
    name: 'Living Room Camera',
    type: 'camera',
    status: 'online',
    isOn: false,
    isRecording: false,
    cameraLocation: 'inside',
    room: 'Living Room'
  }
]

export const initialFamilyMembers: FamilyMember[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    location: 'Lincoln High School',
    battery: 85,
    status: 'school',
    lastSeen: '5 minutes ago',
    gpsCoordinates: { lat: 37.7849, lng: -122.4094 },
    registeredIpLocation: { lat: 37.7749, lng: -122.4194, address: '123 Main St, San Francisco, CA' },
    emailNotificationsEnabled: true
  },
  {
    id: '2',
    name: 'Michael Johnson',
    location: 'Tech Corp Office',
    battery: 62,
    status: 'work',
    lastSeen: '10 minutes ago',
    gpsCoordinates: { lat: 37.7949, lng: -122.3994 },
    registeredIpLocation: { lat: 37.7749, lng: -122.4194, address: '123 Main St, San Francisco, CA' },
    emailNotificationsEnabled: true
  },
  {
    id: '3',
    name: 'Emma Johnson',
    location: 'Home',
    battery: 95,
    status: 'home',
    lastSeen: 'Just now',
    gpsCoordinates: { lat: 37.7749, lng: -122.4194 },
    registeredIpLocation: { lat: 37.7749, lng: -122.4194, address: '123 Main St, San Francisco, CA' },
    emailNotificationsEnabled: true
  }
]

export const initialNotifications: Notification[] = [
  {
    id: '1',
    category: 'urgent',
    title: 'Security Alert',
    message: 'Motion detected at front door',
    time: '5 minutes ago',
    isRead: false,
    source: 'Security'
  },
  {
    id: '2',
    category: 'work',
    title: 'Meeting Reminder',
    message: 'Team standup in 30 minutes',
    time: '10 minutes ago',
    isRead: false,
    source: 'Calendar'
  },
  {
    id: '3',
    category: 'personal',
    title: 'Package Delivered',
    message: 'Your Amazon package has been delivered',
    time: '1 hour ago',
    isRead: false,
    source: 'Amazon'
  },
  {
    id: '4',
    category: 'work',
    title: 'Q4 Report Review Needed',
    message: 'Please review the Q4 report by end of day',
    time: '2 hours ago',
    isRead: false,
    source: 'Work Email'
  },
  {
    id: '5',
    category: 'work',
    title: 'Project Update from Sarah',
    message: 'New milestone completed on the FlowSphere project',
    time: '3 hours ago',
    isRead: false,
    source: 'Work Email'
  },
  {
    id: '6',
    category: 'personal',
    title: 'Invoice from Web Hosting',
    message: 'Your monthly hosting bill is ready',
    time: '5 hours ago',
    isRead: false,
    source: 'Personal Email'
  },
  {
    id: '7',
    category: 'subscription',
    title: 'Netflix Payment',
    message: 'Your subscription has been renewed',
    time: '1 day ago',
    isRead: true,
    source: 'Netflix'
  },
  {
    id: '8',
    category: 'personal',
    title: 'Text from Mom',
    message: 'Don\'t forget dinner on Sunday',
    time: '1 day ago',
    isRead: true,
    source: 'Messages'
  }
]

export const initialCameras: CCTVCamera[] = [
  {
    id: '1',
    name: 'Front Door Camera',
    location: 'front-door',
    status: 'online',
    isRecording: false,
    lastMotion: '10 minutes ago'
  },
  {
    id: '2',
    name: 'Backyard Camera',
    location: 'backyard',
    status: 'online',
    isRecording: false,
    lastMotion: '2 hours ago'
  },
  {
    id: '3',
    name: 'Garage Camera',
    location: 'garage',
    status: 'online',
    isRecording: true,
    lastMotion: '30 minutes ago'
  },
  {
    id: '4',
    name: 'Driveway Camera',
    location: 'driveway',
    status: 'online',
    isRecording: false,
    lastMotion: '1 hour ago'
  }
]

export const initialAutomations: Automation[] = [
  {
    id: '1',
    name: 'Morning Routine',
    trigger: 'time',
    triggerDetails: '6:45 AM',
    actions: ['Turn on bedroom lights', 'Set thermostat to 72°F', 'Start coffee maker'],
    isActive: true,
    lastRun: 'Today at 6:45 AM',
    icon: 'sun'
  },
  {
    id: '2',
    name: 'Night Mode',
    trigger: 'time',
    triggerDetails: '10:00 PM',
    actions: ['Turn off all lights', 'Lock all doors', 'Arm security system'],
    isActive: true,
    lastRun: 'Yesterday at 10:00 PM',
    icon: 'moon'
  },
  {
    id: '3',
    name: 'Away Mode',
    trigger: 'location',
    triggerDetails: 'When last person leaves',
    actions: ['Turn off all lights', 'Lock doors', 'Set thermostat to eco mode', 'Enable cameras'],
    isActive: true,
    lastRun: 'Today at 8:00 AM',
    icon: 'lock'
  }
]
