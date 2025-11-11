# FlowSphere - Complete Life Management Platform

One app for your life rhythm - An AI-driven, privacy-first companion that synchronizes work, family, rest, and home into a single daily flow.

**Tagline**: "One app for your life rhythm" - A unified platform combining Notion's elegance, Waze's intelligence, and Duolingo's engagement to manage every aspect of daily life.

**Experience Qualities:**
1. **Sophisticated** - Professional, polished interface that exudes trust and reliability through thoughtful design and smooth interactions, inspired by Notion's clean aesthetic
2. **Intuitive** - Effortless navigation with clear visual hierarchy, predictable interactions like Waze's smart guidance, and contextual help at every step
3. **Delightful** - Subtle animations, thoughtful micro-interactions like Duolingo's encouragement, and AI-powered insights that create memorable moments and anticipate needs

**Complexity Level**: Complex Application (advanced functionality, comprehensive state management)
A full-featured lifestyle command center with authentication, multiple interconnected layers (Personal, Professional, Family, Home), AI assistance, prayer/wellness features, emergency services, and comprehensive monitoring - all persisted using useKV for seamless experience across sessions with local-first, privacy-by-design architecture.

## Architecture Layers

### Personal Layer
- **Sleep Tracking**: Automatic sleep pattern detection with quality metrics
- **Do Not Disturb (DND)**: Smart DND with configurable emergency override (default: 3 calls in 10 minutes)
- **Notification Management**: AI-categorized notifications from emails, SMS, calls, messengers, Instagram, etc.
  - Notifications turn off based on configured rules
  - Emergency override: rings when same number calls 3 times in a span of 10 minutes
  - AI summarizes notifications (reads subjects and preview text, not full email content)
- **Reminders**: Meeting reminders, school activities, kids' exams, weekly grocery checker
- **Prayer & Bible**: Daily scripture reading with voice synthesis, 2-5 minute sessions, random verses

### Professional Layer
- **Email & Task Summarizer**: AI-powered email subject and preview summarization
- **Meeting Optimizer**: Smart scheduling and productivity insights
- **Productivity Insights**: Time tracking and efficiency analytics
- **Remote Timer**: Accessible timer that syncs across devices
- **Meeting Note Taker**: 
  - Auto-detects 200 languages
  - Prioritizes native language and English
  - Word-by-word transcription
  - AI offers to summarize when meeting ends

### Family Layer
- **Kid Tracker**: Real-time GPS tracking with battery status
- **Emergency Alerts**: Instant notifications for family safety
- **Household Status**: Overview of home and family activities
- **Weekend Recommendations**: 
  - AI suggests new places to visit every Thursday/Friday
  - Famous things to do with family
  - Restaurant and food recommendations
  - Local events and activities

### Home Layer
- **CCTV Access**: Multi-camera dashboard with live feeds and recording control
- **IoT Control**: Manage all smart devices (lights, thermostats, locks, etc.)
- **Smart Timers**: Scheduled device automation
- **Appliance Scheduling**: Energy-efficient appliance management

### AI Assistant Layer
- **Voice Summaries**: Spoken briefings of notifications, schedules, and updates
- **Text Summaries**: Written summaries connecting all layers
- **Integration**: Connects and synthesizes information from all four layers
- **Conversational**: Natural language interaction for queries and commands

## Essential Features

### Authentication System
- **Functionality**: Secure sign-in and sign-up with email/password
- **Purpose**: Protect user data and personalize experience
- **Trigger**: User lands on app for first time or after logout
- **Progression**: Landing page → Sign In/Sign Up modal → Authentication → Main dashboard
- **Success criteria**: Smooth authentication flow, persistent login state, secure credential handling

### Landing Page
- **Functionality**: Beautiful landing page with living room background (blended with color theme), tagline, feature showcase, and comprehensive pricing section with 4-tier plans
- **Purpose**: Welcome users, explain value proposition, and clearly present subscription options
- **Trigger**: Unauthenticated user visits app
- **Progression**: Display hero → Show features → Present pricing plans with monthly/yearly toggle → CTA buttons → Authentication modal
- **Success criteria**: Inspiring design, clear messaging, smooth transition to auth, visually distinct pricing tiers with Gold plan highlighted

### Prayer & Bible Reading
- **Functionality**: Daily scripture reading with 2-5 minute voice synthesis, random verses, prayer focus
- **Purpose**: Spiritual wellness and daily reflection
- **Trigger**: User navigates to Prayer tab
- **Progression**: Select time (2 or 5 min) → Random verse displayed → Voice reading option → New verse button
- **Success criteria**: Natural voice synthesis, relevant verses, peaceful UX

### Emergency Hotlines
- **Functionality**: Quick access to emergency numbers with one-tap calling
- **Purpose**: Critical safety resource for emergencies
- **Trigger**: User navigates to Emergency tab
- **Progression**: View hotlines → Select service → Initiate call
- **Success criteria**: Instant access, clear categorization, international numbers included

### Game Time Monitoring
- **Functionality**: Track children's gaming sessions with daily limits and alerts
- **Purpose**: Healthy screen time management for kids
- **Trigger**: Displayed in Resources tab
- **Progression**: Track sessions → Display progress → Alert when over limit → Daily reset
- **Success criteria**: Accurate tracking, clear visualization, configurable limits

### Daily News Updates
- **Functionality**: Curated news feed with category filtering
- **Purpose**: Stay informed about relevant daily events
- **Trigger**: Displayed in Resources tab
- **Progression**: Load news → Display by category → Tap to read more → Refresh for updates
- **Success criteria**: Relevant content, fast loading, clean presentation

### Smart Sleep Guardian
- **Functionality**: Automatically detects sleep patterns and enables Do Not Disturb mode with intelligent filtering, plus AI-powered audio notification summaries
- **Purpose**: Peaceful sleep without missing critical communications, with morning voice briefing of what you missed
- **Trigger**: User enables DND mode or automatic sleep detection, audio summary requested via "Hear Summary" button
- **Progression**: Detect sleep → Enable DND → Filter notifications by category → Emergency override (3+ calls in 10 min) → Wake summary → User requests audio → AI generates natural summary → Text-to-speech playback
- **Success criteria**: All notifications properly categorized, emergency override reliable, morning voice summary clear and actionable, audio summary natural and conversational, ability to stop playback mid-summary

### Notification Intelligence
- **Functionality**: AI-powered categorization of notifications into Urgent, Work, Personal, Subscription, and Miscellaneous, with audio summarization via Web Speech API
- **Purpose**: Reduce notification overload and surface what matters, provide hands-free notification catch-up
- **Trigger**: New notification arrives or user opens Notifications tab, audio summary triggered by "Hear Summary" button
- **Progression**: Receive notification → AI categorizes → Store locally encrypted → Display in organized tabs → User can mark read/delete → User requests audio summary → AI generates conversational summary → Text-to-speech speaks summary
- **Success criteria**: 95%+ categorization accuracy, instant filtering, smooth tab switching, all data encrypted locally, audio summary completes in under 5 seconds, natural-sounding voice synthesis

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

### Admin Dashboard (Owner Only)
- **Functionality**: Separate admin interface accessible only to the app owner via /admin.html route, providing analytics, user management, and system controls
- **Purpose**: Give the app owner full control and visibility over the entire system without cluttering the user interface
- **Trigger**: Owner navigates directly to /admin.html URL
- **Progression**: Verify ownership → Display access denied or load admin dashboard → View system analytics → Manage users/settings
- **Success criteria**: Strict ownership verification, completely separate from main app navigation, clear "Back to Main App" link, professional admin interface

### Pricing & Subscription Management
- **Functionality**: 4-tier subscription model (Basic $9/mo, Pro $19.99/mo, Gold $39.99/mo, Family/Team $79.99/mo) with 50% yearly discount, presented on landing page with monthly/yearly toggle
- **Purpose**: Monetize the platform while offering flexible options for different user needs, from individual exploration to full family/team plans
- **Trigger**: User views landing page pricing section or navigates to subscription management in settings
- **Progression**: View pricing tiers → Toggle monthly/yearly → Compare features → Select plan → Authentication/payment → Activate subscription
- **Success criteria**: Clear pricing presentation, smooth plan switching, Gold plan visually highlighted as "Most Popular", responsive design across devices, seamless upgrade/downgrade flow

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
  - H1 (Hero Headlines): Poppins Bold/text-2xl sm:text-3xl md:text-4xl/tight letter spacing/-0.02em - commanding presence for main section headers, fully responsive
  - H2 (Section Headers): Poppins SemiBold/text-xl sm:text-2xl md:text-3xl/normal letter spacing - clear hierarchy for subsections, scales with viewport
  - H3 (Card Titles): Poppins Medium/text-lg sm:text-xl md:text-2xl/normal letter spacing - approachable weight for card headers
  - H4 (Subsection Headers): Poppins Medium/text-base sm:text-lg - sub-card headers and labels
  - Body (Content): Inter Regular/text-sm sm:text-base/1.6 line height - optimal readability for descriptions, scales for mobile
  - Caption (Metadata): Inter Regular/text-[10px] sm:text-xs/1.4 line height/text-muted - subtle information and timestamps, extra small on mobile
  - Button Labels: Inter SemiBold/text-xs sm:text-sm/0.01em letter spacing - clear calls to action
  - Logo Text: Poppins Bold/text-lg sm:text-xl md:text-2xl - brand identity scales from mobile to desktop

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
  - SpeakerHigh for audio summary playback
  - Stop for stopping audio playback

- **Spacing**:
  - Container padding: px-3 sm:px-4 md:px-6 lg:px-8 (fully responsive, comfortable on all devices)
  - Card padding: p-4 sm:p-5 md:p-6 (scales from compact mobile to spacious desktop)
  - Grid gaps: gap-3 sm:gap-4 for dense layouts (cameras, devices), gap-4 sm:gap-6 for breathable layouts (dashboard)
  - Section spacing: space-y-6 sm:space-y-8 for major sections, space-y-4 sm:space-y-6 for related groups
  - Element spacing: space-x-1 sm:space-x-2 for inline elements, space-y-3 sm:space-y-4 for vertical lists
  - Touch targets: min-width and min-height of 44px on all interactive elements for accessibility

- **Mobile**:
  - Bottom tab navigation on mobile (<768px) with 4 main tabs visible, optimized sizing with h-16 sm:h-18
  - Single/dual column layouts on small screens: grid-cols-2 for stat cards, grid-cols-1 for content
  - Touch-friendly 44px minimum hit areas with active:scale-95 for tactile feedback
  - Camera grid adapts to single column on mobile with full-width cards
  - Notification tabs scroll horizontally with touch gestures
  - AI assistant orb repositions to bottom-20 md:bottom-6 right-4 md:right-6 with size w-14 h-14 sm:w-16 sm:h-16
  - AI assistant chat adapts to full-width on mobile (bottom-32 md:bottom-28 right-3 md:right-6 left-3 md:left-auto)
  - Morning brief cards stack in 2x2 grid on mobile (grid-cols-2 lg:grid-cols-4)
  - Device controls expand to show full slider controls on tap
  - All icons scale responsively: w-4 h-4 sm:w-5 sm:h-5 or w-5 h-5 sm:w-6 sm:h-6
  - Logo scales from w-6 h-6 on mobile to w-8 h-8 on desktop
  - Header height adapts: h-14 sm:h-16
  - All text uses responsive Tailwind classes for proper sizing across viewports
