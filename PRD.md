# FlowSphere - Smart Life Management Platform

A unified platform that brings together family safety, smart home control, and AI-powered insights into one beautiful, intuitive interface.

**Experience Qualities:**
1. **Sophisticated** - Professional, polished interface that exudes trust and reliability
2. **Intuitive** - Effortless navigation with clear visual hierarchy and predictable interactions
3. **Delightful** - Subtle animations and thoughtful micro-interactions that create memorable moments

**Complexity Level**: Light Application (multiple features with basic state)
Multiple interconnected features including dashboard overview, device management, family tracking, and AI assistant - all persisted using useKV for seamless experience across sessions.

## Essential Features

### Dashboard Overview
- **Functionality**: Central hub displaying stats, quick actions, and recent activity
- **Purpose**: Provide at-a-glance understanding of home and family status
- **Trigger**: User lands on app after authentication
- **Progression**: Load → Render greeting → Display stats cards → Show device status → Present AI insights
- **Success criteria**: All data loads within 2 seconds, responsive on mobile, smooth animations

### Smart Device Control
- **Functionality**: Manage IoT devices (lights, thermostats, cameras, locks)
- **Purpose**: Centralized control of all smart home devices
- **Trigger**: User clicks device card or navigates to Devices tab
- **Progression**: View devices → Select device → Adjust controls → Confirm change → Update state
- **Success criteria**: State changes persist, visual feedback immediate, supports common device types

### Family Safety Tracking
- **Functionality**: View family member locations and set safety zones
- **Purpose**: Peace of mind knowing where loved ones are
- **Trigger**: User navigates to Family tab
- **Progression**: View map → See member locations → Create safety zones → Receive alerts
- **Success criteria**: Updates every 30 seconds, smooth map interactions, clear status indicators

### AI Assistant
- **Functionality**: Conversational AI that provides insights and automation suggestions
- **Purpose**: Intelligent recommendations based on usage patterns
- **Trigger**: User clicks floating AI orb or types query
- **Progression**: Open chat → Enter question → AI processes → Display response → Suggest actions
- **Success criteria**: Responses within 3 seconds, contextually relevant, actionable insights

### Subscription Management
- **Functionality**: Manage premium features and billing
- **Trigger**: User navigates to Settings → Subscription
- **Progression**: View current plan → Compare tiers → Select upgrade → Enter payment → Confirm
- **Success criteria**: Clear pricing, secure payment flow, instant feature unlock

## Edge Case Handling
- **Offline Mode**: Cache critical data, show offline indicator, queue actions for sync
- **Device Unavailable**: Display last known state, show "offline" badge, retry connection
- **API Failures**: Graceful error messages, retry mechanism, fallback to cached data
- **Empty States**: Helpful onboarding prompts, visual guides for adding first device/member
- **Slow Network**: Skeleton loaders, optimistic UI updates, clear loading indicators

## Design Direction
The design should feel sophisticated yet approachable - like a premium smart home app that's both powerful and easy to use. It should evoke trust through clean layouts and professional polish while maintaining warmth through subtle gradients and smooth animations. The interface should be minimal, letting content breathe, with purposeful use of color to guide attention.

## Color Selection
**Triadic** color scheme creating visual interest while maintaining harmony, used to distinguish different feature categories (home, family, AI) with distinct but cohesive personalities.

- **Primary Color**: Deep Purple `oklch(0.35 0.12 285)` - Communicates sophistication, technology, and trust. Used for primary actions and navigation.
- **Secondary Colors**: 
  - Warm Coral `oklch(0.72 0.15 35)` - Friendly, approachable, used for family features
  - Cool Mint `oklch(0.75 0.12 165)` - Fresh, calming, used for smart home devices
- **Accent Color**: Electric Blue `oklch(0.65 0.25 250)` - High energy, attention-grabbing for CTAs and AI features
- **Foreground/Background Pairings**:
  - Background (Soft Cream `oklch(0.97 0.01 85)`): Dark Purple text `oklch(0.25 0.08 285)` - Ratio 9.2:1 ✓
  - Card (White `oklch(1 0 0)`): Dark text `oklch(0.2 0 0)` - Ratio 15.8:1 ✓
  - Primary (Deep Purple): White text `oklch(0.98 0 0)` - Ratio 8.5:1 ✓
  - Accent (Electric Blue): White text `oklch(0.98 0 0)` - Ratio 5.2:1 ✓
  - Muted (Light Gray `oklch(0.94 0 0)`): Medium Gray text `oklch(0.5 0 0)` - Ratio 6.1:1 ✓

## Font Selection
Typography should feel modern and tech-forward while maintaining excellent readability across all device sizes - combining geometric precision with humanist warmth.

- **Typographic Hierarchy**:
  - H1 (Hero Headlines): Poppins Bold/48px/tight letter spacing/-0.02em - commanding presence
  - H2 (Section Headers): Poppins SemiBold/32px/normal letter spacing - clear hierarchy
  - H3 (Card Titles): Poppins Medium/20px/normal letter spacing - approachable weight
  - Body (Content): Inter Regular/16px/1.6 line height - optimal readability
  - Caption (Metadata): Inter Regular/14px/1.4 line height/text-muted - subtle information
  - Button Labels: Inter SemiBold/14px/0.01em letter spacing/uppercase - clear actions

## Animations
Animations should feel purposeful and physics-based, creating a sense of responsiveness without slowing down interactions - subtle enough to be professional, delightful enough to notice.

- **Purposeful Meaning**: 
  - Device state changes use spring animations to feel tactile and satisfying
  - AI assistant entrance uses scale + fade to feel magical but not overwhelming
  - Page transitions slide content to maintain spatial relationships
  - Success actions pulse once to confirm without distracting
  
- **Hierarchy of Movement**:
  1. Critical feedback (toggle switches, button presses) - 150ms instant response
  2. State transitions (card flips, modals) - 300ms with ease-out
  3. Page navigation - 400ms with shared element transitions
  4. Ambient motion (floating orb, subtle gradients) - slow, continuous

## Component Selection
- **Components**:
  - Dialogs for device control panels and settings
  - Cards with hover states for device grid and family members
  - Tabs for main navigation between Dashboard/Devices/Family/Settings
  - Switch components for device on/off states
  - Slider for brightness and temperature controls
  - Tooltips for icon buttons and quick info
  - Toast notifications (via sonner) for confirmations and alerts
  - Avatar components for family members
  - Badge for device status indicators
  - Progress bars for loading states and metrics

- **Customizations**:
  - Floating AI Assistant Orb - custom animated component with gradient and pulsing glow
  - Interactive Map Component - custom integration for family tracking
  - Device Control Cards - custom layouts with context-specific controls
  - Stats Dashboard Cards - custom visualization with icons and trend indicators

- **States**:
  - Buttons: Subtle shadow on hover, slight scale on press, disabled state with 50% opacity
  - Device Cards: Border glow on hover, lift with shadow, active state when selected
  - Inputs: Focus ring with primary color, error state with destructive color
  - Toggle Switches: Smooth transition with spring animation, clear on/off colors

- **Icon Selection**:
  - Phosphor icons throughout for consistent weight and style
  - Home/House for dashboard and smart home features
  - Users/UsersThree for family features
  - Lightbulb/Thermometer/Lock/Camera for specific devices
  - Lightning for automations and AI
  - Bell for notifications
  - Gear for settings

- **Spacing**:
  - Container padding: px-4 md:px-6 lg:px-8 (responsive)
  - Card padding: p-6 (comfortable internal spacing)
  - Grid gaps: gap-4 for dense layouts, gap-6 for breathable layouts
  - Section spacing: space-y-8 for major sections
  - Element spacing: space-x-2 for inline elements, space-y-4 for vertical lists

- **Mobile**:
  - Bottom tab navigation on mobile (<768px)
  - Single column layouts on small screens
  - Touch-friendly 44px minimum hit areas
  - Collapsible sidebar becomes full-screen drawer
  - Device cards stack vertically
  - AI assistant orb repositions to bottom-right with smaller size
