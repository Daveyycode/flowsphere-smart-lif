# Camera QR Code Scanning - Implementation Guide

## Overview
FlowSphere now includes full camera access for QR code scanning directly within the secure messenger. This feature enables users to quickly add contacts by scanning QR codes using their device camera, with intelligent fallbacks and comprehensive controls.

## Features Implemented

### 1. QR Code Scanner Component (`/src/components/qr-scanner.tsx`)
A full-screen camera interface with real-time QR code detection:

#### Camera Features
- **Real-time Detection**: Uses `jsQR` library to detect QR codes at 4 FPS (every 250ms)
- **Camera Permissions**: Requests and manages camera permissions with graceful error handling
- **Dual Camera Support**: Automatically detects front and back cameras
- **Camera Switching**: Button to toggle between front-facing and rear-facing cameras
- **Flash Control**: Toggle flashlight/torch on supported devices
- **Responsive Design**: Full-screen overlay that works on mobile and desktop

#### Visual Feedback
- **Scanning Frame**: Animated corner markers showing scan area
- **Scan Line Animation**: Moving horizontal line indicates active scanning
- **Permission States**: Clear UI for denied/granted camera access
- **Success Feedback**: Haptic feedback (vibration) on successful scan

#### Technical Details
- **Library**: jsQR for QR code detection
- **Video Constraints**: 1280x720 ideal resolution
- **Facing Mode**: Environment (rear) camera preferred by default
- **Error Correction**: High error correction level for reliable scanning

### 2. QR Code Display Component (`/src/components/qr-code-display.tsx`)
Generates high-quality QR codes for sharing invite codes:

#### Features
- **Library**: Uses `qrcode` npm package
- **Size**: Configurable size (default 256px)
- **Quality**: High error correction level (Level H - 30% recovery)
- **Format**: Canvas-based rendering for sharp display
- **Styling**: Customizable via className prop

### 3. Secure Messenger Integration
The secure messenger now includes three ways to add contacts:

#### Method 1: Scan QR Code (Primary)
1. Click "Scan QR" button in messenger header
2. Grant camera permissions when prompted
3. Point camera at QR code
4. Automatic detection and contact addition
5. Confirmation toast notification

#### Method 2: Generate and Share QR Code
1. Click "Generate QR" button
2. Display QR code on screen
3. Other user scans with their device
4. Copy code button for manual sharing

#### Method 3: Manual Code Entry (Fallback)
1. Click "Add Contact" button
2. Choose "Enter Code Manually"
3. Type or paste invite code
4. Confirm to add contact

## User Experience Flow

### Adding a Contact via Camera Scan

```
User Flow:
Messenger → "Scan QR" → Camera Permission Request → Grant Access
→ Camera View Opens → Position QR Code → Automatic Detection
→ Success Feedback (Vibration + Toast) → Camera Closes → Contact Added
```

### Creating an Invite

```
User Flow:
Messenger → "Generate QR" → QR Code Modal Opens → Display QR Code
→ Other User Scans → Share Code Button (Copy to Clipboard)
→ Manual Code Entry Alternative
```

## Camera Controls

### In-Scanner Controls
Located at the bottom of the camera view:

1. **Switch Camera Button** (if multiple cameras detected)
   - Icon: Camera rotation icon
   - Toggles between front/rear cameras
   - Only visible when 2+ cameras available

2. **Flash Toggle Button**
   - Icon: Lightning bolt (filled when on, outlined when off)
   - Controls device flashlight/torch
   - Only functional on supported devices
   - Shows error toast if not available

3. **Close Button** (top-right corner)
   - Icon: X
   - Stops camera and closes scanner
   - Proper cleanup of media streams

## Security & Privacy

### Camera Permissions
- **User Control**: Explicit permission request
- **Clear Messaging**: Explains why camera access is needed
- **Graceful Degradation**: Falls back to manual entry if denied
- **No Background Access**: Camera only active when scanner is open
- **Proper Cleanup**: All media streams stopped when closing

### QR Code Security
- **One-Time Use**: Invite codes expire after 24 hours
- **Unique Generation**: Each invite generates a unique code
- **No Server Storage**: Codes stored locally only
- **Encrypted Transport**: All data stays within vault security

## Browser Compatibility

### Supported Browsers
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Safari (iOS 11+)
- ✅ Firefox (Desktop & Mobile)
- ✅ Samsung Internet
- ✅ Opera

### Required APIs
- `navigator.mediaDevices.getUserMedia()` - Camera access
- `MediaStreamTrack.getCapabilities()` - Flash detection
- `navigator.vibrate()` - Haptic feedback (optional)
- `HTMLCanvasElement` - QR rendering and detection

### Fallback Support
- Manual code entry always available
- Camera not required for functionality
- Clipboard API for easy code sharing

## Technical Implementation

### Key Dependencies
```json
{
  "jsqr": "^1.4.0",          // QR code detection
  "qrcode": "^1.5.4",        // QR code generation
  "@types/qrcode": "^1.5.6"  // TypeScript types
}
```

### Components Structure
```
src/components/
├── qr-scanner.tsx           // Full-screen camera scanner
├── qr-code-display.tsx      // QR code generator display
├── secure-messenger.tsx     // Messenger with QR integration
└── vault.tsx                // Vault container
```

### State Management
- Uses `useKV` for persistent storage
- Camera state managed locally in component
- Contact list updates on successful scan
- Real-time sync with encrypted messenger

## Mobile Optimization

### Performance
- 250ms scan interval (4 FPS) balances detection and battery
- Canvas reused for efficiency
- Proper stream cleanup prevents memory leaks
- Automatic camera release on app backgrounding

### UX Considerations
- Large touch targets (44x44px minimum)
- Clear visual feedback
- Haptic confirmation
- Portrait and landscape support
- Safe area insets respected

## Troubleshooting

### Common Issues

**Camera Not Working**
- Check browser permissions in settings
- Ensure HTTPS connection (required for camera API)
- Try different browser
- Verify camera isn't in use by another app

**QR Code Not Detected**
- Ensure good lighting
- Hold camera steady
- Try enabling flash
- Clean camera lens
- Verify QR code quality

**Flash Not Available**
- Not all devices support torch API
- Works best on mobile devices
- Desktop webcams typically lack flash

## Future Enhancements

### Planned Features
- [ ] Batch scanning for multiple contacts
- [ ] QR code history/saved codes
- [ ] Custom QR code styling (colors, logos)
- [ ] Alternative barcode format support
- [ ] Distance-based auto-focus hints
- [ ] QR code validation before generation

### Potential Improvements
- [ ] Machine learning-enhanced detection
- [ ] Image stabilization
- [ ] Low-light enhancement
- [ ] Accessibility features (voice guidance)
- [ ] Analytics for scan success rates

## Testing Checklist

### Manual Testing
- ✅ Camera permission request
- ✅ Permission denied fallback
- ✅ QR code detection accuracy
- ✅ Flash toggle functionality
- ✅ Camera switching
- ✅ Contact addition after scan
- ✅ QR code generation
- ✅ Code copy to clipboard
- ✅ Manual entry fallback
- ✅ Mobile responsiveness

### Browser Testing
- ✅ Chrome desktop
- ✅ Chrome mobile
- ✅ Safari iOS
- ✅ Firefox
- ✅ Edge

### Device Testing
- ✅ iPhone (various models)
- ✅ Android phones
- ✅ Tablets
- ✅ Desktop webcam

## Usage Examples

### For Users

**To Add Someone:**
1. Open FlowSphere app
2. Navigate to Settings → Tap "About" 7 times → Open Vault
3. Go to Messages tab → Click "Open Messenger"
4. Click "Scan QR" button
5. Allow camera access
6. Point at their QR code
7. Contact added automatically!

**To Share Your Code:**
1. Open Messenger
2. Click "Generate QR"
3. Show QR code to other person
4. Or click "Copy" to share code via text

### For Developers

**Import Components:**
```typescript
import { QRScanner } from '@/components/qr-scanner'
import { QRCodeDisplay } from '@/components/qr-code-display'
```

**Use Scanner:**
```typescript
const [showScanner, setShowScanner] = useState(false)

<QRScanner 
  isOpen={showScanner}
  onClose={() => setShowScanner(false)}
  onScan={(code) => {
    console.log('Scanned:', code)
    handleAddContact(code)
  }}
/>
```

**Display QR Code:**
```typescript
<QRCodeDisplay 
  data="FSM-INVITE-CODE-123"
  size={280}
  className="mx-auto"
/>
```

## Conclusion

The camera QR scanning feature significantly enhances the user experience of FlowSphere's secure messenger by providing a fast, intuitive way to add contacts. The implementation prioritizes security, privacy, and usability while maintaining broad browser compatibility and graceful degradation.

For questions or issues, please refer to the main troubleshooting documentation or contact support.
