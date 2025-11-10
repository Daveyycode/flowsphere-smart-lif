# FlowSphere - Smart Life Management Platform

One app to simplify your entire life — home, work, and family in perfect flow.

**Tagline**: A unified platform that brings together family safety, smart home control, notification intelligence, security monitoring, and AI-powered insights into one beautiful, privacy-first interface.

**Experience Qualities:**
1. **Sophisticated** - Professional, polished interface that exudes trust and reliability through thoughtful design and smooth interactions
2. **Intuitive** - Effortless navigation with clear visual hierarchy, predictable interactions, and contextual help at every step
3. **Delightful** - Subtle animations, thoughtful micro-interactions, and AI-powered insights that create memorable moments and anticipate needs

**Complexity Level**: Complex Application (advanced functionality, comprehensive state management)
A full-featured lifestyle command center with multiple interconnected systems including real-time monitoring, intelligent automation, notification management, security integration, and AI assistance - all persisted using useKV for seamless experience across sessions with local-first, privacy-by-design architecture.

## Essential Features

### Smart Sleep Guardian
- **Functionality**: Automatically detects sleep patterns and enables Do Not Disturb mode with intelligent filtering
- **Purpose**: Peaceful sleep without missing critical communications
- **Trigger**: User enables DND mode or automatic sleep detection
- **Progression**: Detect sleep → Enable DND → Filter notifications by category → Emergency override (3+ calls in 10 min) → Wake summary
- **Success criteria**: All notifications properly categorized, emergency override reliable, morning voice summary clear and actionable

### Notification Intelligence
- **Functionality**: AI-powered categorization of notifications into Urgent, Work, Personal, Subscription, and Miscellaneous
- **Purpose**: Reduce notification overload and surface what matters
- **Trigger**: New notification arrives or user opens Notifications tab
- **Progression**: Receive notification → AI categorizes → Store locally encrypted → Display in organized tabs → User can mark read/delete
- **Success criteria**: 95%+ categorization accuracy, instant filtering, smooth tab switching, all data encrypted locally

### Morning Brief
- **Functionality**: Personalized daily summary with weather, sleep quality, commute traffic, schedule, and day optimizer suggestions
- **Purpose**: Start day informed and prepared with AI-powered insights
- **Trigger**: User opens app in morning or Dashboard tab
- **Progression**: Load personal data → Analyze patterns → Generate brief → Display cards → Offer voice playback
- **Success criteria**: Data loads within 2 seconds, voice synthesis clear, suggestions contextually relevant

### Dashboard Overview
- **Functionality**: Central hub displaying stats, quick actions, and recent activity
- **Purpose**: Provide at-a-glance understanding of home and family status
- **Trigger**: User lands on app after authentication
- **Progression**: Load → Render greeting → Display stats cards → Show device status → Present AI insights
- **Success criteria**: All data loads within 2 seconds, responsive on mobile, smooth animations

### Smart Device Control
- **Functionality**: Manage IoT devices (lights, thermostats, cameras, locks) with contextual controls
- **Purpose**: Centralized control of all smart home devices
- **Trigger**: User clicks device card or navigates to Devices tab
- **Progression**: View devices → Select device → Adjust controls (brightness/temp/lock) → Confirm change → Update state
- **Success criteria**: State changes persist, visual feedback immediate, supports common device types, controls contextual to device type

### CCTV & Security Monitoring
- **Functionality**: Multi-camera dashboard with live feeds, recording control, and motion alerts
- **Purpose**: Comprehensive home security monitoring from single interface
- **Trigger**: User navigates to Cameras tab or security alert received
- **Progression**: View camera grid → Select camera → View live feed → Control recording → Review motion history
- **Success criteria**: Smooth video playback, instant recording toggle, clear status indicators, grid and list view modes

### Intelligent Automations
- **Functionality**: Create time/location/device/condition-based automation routines
- **Purpose**: Automate repetitive tasks and optimize home efficiency
- **Trigger**: User creates automation or scheduled trigger fires
- **Progression**: Define trigger → Select actions → Set schedule → Enable automation → Monitor execution
- **Success criteria**: Automations fire reliably, easy creation flow, clear status indicators, one-tap enable/disable

### Family Safety Tracking
- **Functionality**: Real-time GPS tracking with safety zones and smart alerts
- **Purpose**: Peace of mind knowing where loved ones are
- **Trigger**: User navigates to Family tab
- **Progression**: View member locations → Check battery status → Monitor safety zones → Receive arrival/departure alerts
- **Success criteria**: Updates every 30 seconds, smooth map interactions, clear status indicators, privacy controls

### AI Assistant
- **Functionality**: Conversational AI that provides insights, automation suggestions, and answers questions
- **Purpose**: Intelligent recommendations based on usage patterns
- **Trigger**: User clicks floating AI orb or types query
- **Progression**: Open chat → Enter question → AI processes → Display response → Suggest actionable automations
- **Success criteria**: Responses within 3 seconds, contextually relevant, actionable insights, natural conversation

### Settings & Privacy
- **Functionality**: Account management, notification preferences, security settings, and subscription management
- **Trigger**: User navigates to Settings tab
- **Progression**: View profile → Adjust preferences → Manage notifications → Review security → Upgrade plan
- **Success criteria**: All settings persist immediately, clear privacy information, seamless payment flow

## Edge Case Handling
- **Offline Mode**: Cache critical data locally, show offline indicator, queue actions for sync when reconnected
- **Device Unavailable**: Display last known state, show "offline" badge with timestamp, auto-retry connection periodically
- **API Failures**: Graceful error messages with retry options, fallback to cached data, maintain UI responsiveness
- **Empty States**: Helpful onboarding prompts with visual guides for adding first device/member/automation
- **Slow Network**: Skeleton loaders for perceived performance, optimistic UI updates, clear loading indicators
- **Emergency Override**: Reliable call detection algorithm, clear visual/audio indicators when override triggered
- **Data Corruption**: Validate data on load, provide reset options, never crash on bad data
- **Camera Streams**: Graceful degradation if stream unavailable, fallback to last thumbnail, clear error messaging

## Design Direction
The design should feel sophisticated yet approachable - like a premium smart home app that's both powerful and easy to use. It should evoke trust through clean layouts and professional polish while maintaining warmth through subtle gradients and smooth animations. The interface should be minimal, letting content breathe, with purposeful use of color to guide attention. Privacy and security should feel tangible through design choices that emphasize local-first architecture and user control.

## Color Selection
**Triadic** color scheme creating visual interest while maintaining harmony, used to distinguish different feature categories (home, family, AI, security) with distinct but cohesive personalities.

- **Primary Color**: Deep Purple `oklch(0.35 0.12 285)` - Communicates sophistication, technology, and trust. Used for primary actions, navigation, and sleep/DND features.
- **Secondary Colors**: 
  - Warm Coral `oklch(0.72 0.15 35)` - Friendly, approachable, used for family features and thermal controls
  - Cool Mint `oklch(0.75 0.12 165)` - Fresh, calming, used for smart home devices and positive states
- **Accent Color**: Electric Blue `oklch(0.65 0.25 250)` - High energy, attention-grabbing for CTAs, AI features, and important alerts
- **Foreground/Background Pairings**:
  - Background (Soft Cream `oklch(0.97 0.01 85)`): Dark Purple text `oklch(0.25 0.08 285)` - Ratio 9.2:1 ✓
  - Card (White `oklch(1 0 0)`): Dark text `oklch(0.2 0 0)` - Ratio 15.8:1 ✓
  - Primary (Deep Purple): White text `oklch(0.98 0 0)` - Ratio 8.5:1 ✓
  - Accent (Electric Blue): White text `oklch(0.98 0 0)` - Ratio 5.2:1 ✓
  - Coral (Warm): White text - Ratio 4.8:1 ✓
  - Mint (Cool): Dark text `oklch(0.2 0 0)` - Ratio 8.1:1 ✓
  - Muted (Light Gray `oklch(0.94 0 0)`): Medium Gray text `oklch(0.5 0 0)` - Ratio 6.1:1 ✓

## Font Selection
Typography should feel modern and tech-forward while maintaining excellent readability across all device sizes - combining geometric precision with humanist warmth.

- **Typographic Hierarchy**:
  - H1 (Hero Headlines): Poppins Bold/48px/tight letter spacing/-0.02em - commanding presence for main section headers
  - H2 (Section Headers): Poppins SemiBold/32px/normal letter spacing - clear hierarchy for subsections
  - H3 (Card Titles): Poppins Medium/20px/normal letter spacing - approachable weight for card headers
  - Body (Content): Inter Regular/16px/1.6 line height - optimal readability for descriptions
  - Caption (Metadata): Inter Regular/14px/1.4 line height/text-muted - subtle information and timestamps
  - Button Labels: Inter SemiBold/14px/0.01em letter spacing - clear calls to action

## Animations
Animations should feel purposeful and physics-based, creating a sense of responsiveness without slowing down interactions - subtle enough to be professional, delightful enough to notice and remember.

- **Purposeful Meaning**: 
  - Device state changes use spring animations to feel tactile and satisfying
  - AI assistant entrance uses scale + fade to feel magical but not overwhelming
  - Page transitions slide content to maintain spatial relationships
  - Success actions pulse once to confirm without distracting
  - Recording indicators use gentle pulsing to draw attention without alarm
  - Morning brief cards stagger in for progressive disclosure
  
- **Hierarchy of Movement**:
  1. Critical feedback (toggle switches, button presses) - 150ms instant response
  2. State transitions (card flips, modals, recording start/stop) - 300ms with ease-out
  3. Page navigation between tabs - 400ms with shared element transitions
  4. Ambient motion (AI orb glow, subtle gradients, recording pulse) - slow, continuous

## Component Selection
- **Components**:
  - Dialogs for device control panels, camera fullscreen, and automation creation
  - Cards with hover states for devices, cameras, automations, family members, and notifications
  - Tabs for main navigation and notification categories
  - Switch components for device on/off, automation enable/disable, and DND toggle
  - Slider for brightness, temperature, and emergency override threshold controls
  - Tooltips for icon buttons and quick info
  - Toast notifications (via sonner) for confirmations, alerts, and error messages
  - Avatar components for family members
  - Badge for device status, notification categories, and recording indicators
  - Progress bars for loading states, metrics, and sleep quality
  - Scroll areas for long notification lists and activity feeds

- **Customizations**:
  - Floating AI Assistant Orb - custom animated component with gradient and pulsing glow effect
  - Morning Brief Cards - custom grid layout with weather/sleep/traffic/schedule cards
  - CCTV Grid View - custom responsive grid with live feed thumbnails and recording indicators
  - Notification Category Tabs - custom tab system with counts and color-coded categories
  - Automation Cards - custom layouts with trigger icons and action badges
  - Device Control Cards - context-specific controls (sliders for lights, locks for doors)
  - Stats Dashboard Cards - custom visualization with icons, trends, and progress indicators

- **States**:
  - Buttons: Subtle shadow on hover, slight scale on press, disabled state with 50% opacity
  - Device Cards: Border glow on hover, lift with shadow, active state when device is on
  - Camera Cards: Recording pulse animation, hover overlay with "View Live" button
  - Inputs: Focus ring with primary color, error state with destructive color
  - Toggle Switches: Smooth transition with spring animation, clear on/off colors
  - Notification Cards: Unread state with full opacity, read state with muted appearance

- **Icon Selection**:
  - Phosphor icons throughout for consistent weight and duotone style
  - House/Home for dashboard
  - Bell for notifications with badge support
  - Cpu/Lightbulb/Thermometer/Lock for specific device types
  - Camera/VideoCamera for CCTV features
  - Lightning for automations and AI
  - Users/UsersThree for family features
  - Moon for sleep guardian and night mode
  - Sun for morning routines and day mode
  - MapPin for location features
  - Gear for settings

- **Spacing**:
  - Container padding: px-4 md:px-6 lg:px-8 (responsive, comfortable)
  - Card padding: p-6 (comfortable internal spacing for readability)
  - Grid gaps: gap-4 for dense layouts (cameras, devices), gap-6 for breathable layouts (dashboard)
  - Section spacing: space-y-8 for major sections, space-y-6 for related groups
  - Element spacing: space-x-2 for inline elements, space-y-4 for vertical lists

- **Mobile**:
  - Bottom tab navigation on mobile (<768px) with 4 main tabs visible
  - Single column layouts on small screens with touch-optimized spacing
  - Touch-friendly 44px minimum hit areas for all interactive elements
  - Camera grid adapts to single column on mobile
  - Notification tabs scroll horizontally with touch gestures
  - AI assistant orb repositions to bottom-right with appropriate mobile size
  - Morning brief cards stack vertically on mobile with full-width layout
  - Device controls expand to show full slider controls on tap
