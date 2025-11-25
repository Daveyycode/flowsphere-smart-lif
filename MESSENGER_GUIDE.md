# Secure Messenger Guide

## Overview
The Secure Messenger is a real-time, end-to-end encrypted messaging system integrated into the FlowSphere Vault. It provides secure communication using one-time QR code invites.

## Features

### 🔐 End-to-End Encryption
- All messages are encrypted before transmission
- Messages stored locally in your secure vault
- No data stored on external servers

### 📱 QR Code Invitations
1. **Generate Invite**: Click "Generate QR" button
2. **Share Code**: 
   - Show QR code to contact (they scan with camera)
   - Or copy/share the text code
3. **Expiration**: Codes expire after 24 hours for security

### 💬 Real-Time Messaging
- Send text messages instantly
- Attach images and files
- Record and send voice notes
- Message status indicators:
  - ✓ Sent
  - ✓✓ Delivered
  - ✓✓ (blue) Read

### 👥 Contact Management
- View online/offline/away status
- Search contacts quickly
- Unread message badges
- Contact avatars with initials

### 📞 Additional Features
- Voice call button (coming soon)
- Video call button (coming soon)
- Contact options menu

## How to Use

### Adding Your First Contact
1. Open Vault → Messages Tab
2. Click "Open Messenger"
3. Click "Add Contact" button
4. Two options:
   - **Scan QR Code**: Use camera to scan their invite
   - **Enter Code**: Type in their invite code manually
5. Contact appears in your list

### Sending Messages
1. Select a contact from the list
2. Type your message in the input field
3. Optional: Attach files or record voice
4. Press Enter or click Send button

### Attaching Files
- Click paperclip icon to browse files
- Click image icon for photos
- Click microphone to record voice note
- Remove attachments with the X button

### Generating Your Invite
1. Click "Generate QR" in messenger header
2. Share the QR code by showing your screen
3. Or copy the text code and send via any method
4. Code expires in 24 hours

## Security Features

### Privacy-First Design
- Messages stored only on your device
- No cloud sync or external servers
- Vault auto-lock after inactivity
- Biometric unlock support (if enabled)

### Encryption
- Military-grade end-to-end encryption
- Unique public/private key pairs
- Secure key exchange via QR codes

## Tips & Best Practices

1. **Verify Contacts**: Always verify identity when sharing invite codes
2. **Regenerate Codes**: Generate new invite codes regularly
3. **Secure Device**: Enable vault auto-lock and biometric unlock
4. **Regular Backups**: Enable auto-backup in vault settings
5. **Clean Up**: Regularly review and remove old messages

## Troubleshooting

### Contact Not Receiving Messages
- Check their online status
- Verify they're using the same vault system
- Regenerate invite code and reconnect

### QR Code Not Scanning
- Ensure good lighting
- Hold steady at proper distance
- Try manual code entry instead

### Messages Not Syncing
- Messages are local-only by design
- Each device has its own message history
- This ensures maximum privacy and security

## Technical Details

### Message Status Flow
1. **Sent**: Message sent from your device
2. **Delivered**: Confirmed received by contact's device
3. **Read**: Contact has viewed the message

### Data Storage
- All data stored using useKV (local storage)
- Keys prefixed with 'flowsphere-messenger-'
- Encrypted at rest in vault

### Contact Public Keys
- Format: `FSM-[random-string]`
- Unique per user
- Used for secure communication

## Future Enhancements
- Voice/Video calling integration
- Group messaging
- Message reactions and replies
- Media galleries
- Message search
- Contact nicknames and custom avatars
