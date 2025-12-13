/**
 * FlowSphere Messenger Attachments with E2EE
 *
 * SECURITY: All attachments are encrypted BEFORE storage using AES-256-GCM
 * STORAGE: Supabase Database (JSONB + Base64) - NOT Supabase Storage
 * NOTE: Supabase Storage is ONLY for Vault, NOT for messenger
 * PRIVACY: End-to-end encrypted, FlowSphere cannot read contents
 *
 * Storage Strategy (Hybrid):
 * - Small files (<5MB): Store in Supabase DB as base64 (fast, syncs)
 * - Large files (>5MB): Store in IndexedDB (client-side, no cost)
 * - Voice messages: Always in Supabase DB (usually <1MB)
 * - Photos: Compressed + stored in Supabase DB
 *
 * Supports:
 * - Photos (camera + gallery)
 * - Files (documents, PDFs, etc)
 * - Voice messages (WebM audio)
 */

import { encryptFile, decryptFile, type EncryptionResult } from './encryption'
import { logger } from '@/lib/security-utils'

// ============================================
// TYPES
// ============================================

export type AttachmentType = 'photo' | 'file' | 'voice'

export interface AttachmentMetadata {
  id: string // Unique attachment ID
  type: AttachmentType // Type of attachment
  fileName: string // Original filename
  fileSize: number // Size in bytes
  mimeType: string // MIME type
  encryptionMeta: Omit<EncryptionResult, 'encryptedData'> // Encryption metadata
  encryptedData: string // Encrypted file as base64 (stored in DB or IndexedDB)
  storageLocation: 'database' | 'indexeddb' // Where the file is stored
  uploadedAt: string // ISO timestamp
  encryptedBy: string // Device ID of sender
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

// ============================================
// CONFIGURATION
// ============================================

const STORAGE_CONFIG = {
  databaseSizeLimit: 5 * 1024 * 1024, // 5MB - store in Supabase DB if smaller
  maxFileSize: 50 * 1024 * 1024, // 50MB - absolute max
  maxVoiceDuration: 300, // 5 minutes max for voice
  imageCompressQuality: 0.8, // Compress images to 80% quality
  imageMaxDimension: 1920, // Max width/height for images
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  allowedFileTypes: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    // Images (also allowed as files)
    ...['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  ],
  allowedVoiceTypes: ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'],
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate file before encryption/upload
 */
export function validateFile(file: File, type: AttachmentType): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > STORAGE_CONFIG.maxFileSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${STORAGE_CONFIG.maxFileSize / (1024 * 1024)}MB`,
    }
  }

  // Check file type
  let allowedTypes: string[]
  switch (type) {
    case 'photo':
      allowedTypes = STORAGE_CONFIG.allowedImageTypes
      break
    case 'voice':
      allowedTypes = STORAGE_CONFIG.allowedVoiceTypes
      break
    case 'file':
      allowedTypes = STORAGE_CONFIG.allowedFileTypes
      break
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not supported: ${file.type}`,
    }
  }

  return { valid: true }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

// ============================================
// UPLOAD (WITH E2EE)
// ============================================

/**
 * Compress image before encryption (for photos only)
 */
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Resize if too large
        const maxDim = STORAGE_CONFIG.imageMaxDimension
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim
            width = maxDim
          } else {
            width = (width / height) * maxDim
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not create canvas'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          STORAGE_CONFIG.imageCompressQuality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Encrypt and prepare attachment (stores in DB or IndexedDB based on size)
 *
 * @param file - File to encrypt
 * @param type - Type of attachment
 * @param deviceId - Sender's device ID
 * @param encryptionKey - User's encryption key
 * @returns Attachment metadata with encrypted data
 */
export async function encryptAttachment(
  file: File,
  type: AttachmentType,
  deviceId: string,
  encryptionKey: string
): Promise<AttachmentMetadata> {
  try {
    // Validate file
    const validation = validateFile(file, type)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Compress photos before encryption
    let fileToEncrypt = file
    if (type === 'photo' && file.type.startsWith('image/')) {
      try {
        fileToEncrypt = await compressImage(file)
        logger.info(
          `Compressed image: ${formatFileSize(file.size)} → ${formatFileSize(fileToEncrypt.size)}`
        )
      } catch (err) {
        console.warn('Image compression failed, using original:', err)
      }
    }

    // Encrypt file using AES-256-GCM
    const { blob: encryptedBlob, metadata: encryptionMeta } = await encryptFile(
      fileToEncrypt,
      encryptionKey
    )

    // Convert encrypted blob to base64
    const arrayBuffer = await encryptedBlob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const encryptedData = btoa(binary)

    const timestamp = Date.now()
    const randomBytes = new Uint8Array(8)
    crypto.getRandomValues(randomBytes)
    const random = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 10)
    const attachmentId = `att_${timestamp}_${random}`

    // Decide storage location based on size
    const storageLocation =
      fileToEncrypt.size <= STORAGE_CONFIG.databaseSizeLimit ? 'database' : 'indexeddb'

    const metadata: AttachmentMetadata = {
      id: attachmentId,
      type,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      encryptionMeta,
      encryptedData,
      storageLocation,
      uploadedAt: new Date().toISOString(),
      encryptedBy: deviceId,
    }

    // If storing in IndexedDB (large files), save there
    if (storageLocation === 'indexeddb') {
      await saveToIndexedDB(attachmentId, encryptedData)
    }

    return metadata
  } catch (error) {
    logger.error('Attachment encryption failed:', error)
    throw error
  }
}

// ============================================
// INDEXEDDB HELPERS (for large files)
// ============================================

const DB_NAME = 'FlowSphereMessenger'
const DB_VERSION = 1
const STORE_NAME = 'attachments'

/**
 * Open IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

/**
 * Save encrypted data to IndexedDB
 */
async function saveToIndexedDB(id: string, data: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(data, id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Get encrypted data from IndexedDB
 */
async function getFromIndexedDB(id: string): Promise<string> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result)
      } else {
        reject(new Error('Attachment not found in IndexedDB'))
      }
    }
  })
}

/**
 * Delete from IndexedDB
 */
async function deleteFromIndexedDB(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// ============================================
// DOWNLOAD (WITH DECRYPTION)
// ============================================

/**
 * Decrypt attachment and return as Blob
 *
 * @param metadata - Attachment metadata
 * @param encryptionKey - User's encryption key
 * @returns Decrypted file as Blob
 */
export async function decryptAttachment(
  metadata: AttachmentMetadata,
  encryptionKey: string
): Promise<Blob> {
  try {
    // Get encrypted data (from metadata or IndexedDB)
    let encryptedData = metadata.encryptedData
    if (metadata.storageLocation === 'indexeddb') {
      encryptedData = await getFromIndexedDB(metadata.id)
    }

    // Convert base64 to blob
    const binary = atob(encryptedData)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const encryptedBlob = new Blob([bytes])

    // Decrypt file
    const decryptedBlob = await decryptFile(
      encryptedBlob,
      metadata.encryptionMeta,
      encryptionKey,
      metadata.mimeType
    )

    return decryptedBlob
  } catch (error) {
    logger.error('Attachment decryption failed:', error)
    throw new Error('Failed to decrypt attachment')
  }
}

// ============================================
// DELETE
// ============================================

/**
 * Delete attachment (from DB or IndexedDB)
 *
 * @param metadata - Attachment metadata
 */
export async function deleteAttachment(metadata: AttachmentMetadata): Promise<void> {
  try {
    // If stored in IndexedDB, delete from there
    if (metadata.storageLocation === 'indexeddb') {
      await deleteFromIndexedDB(metadata.id)
    }
    // Data in database will be deleted when message is deleted
  } catch (error) {
    logger.error('Failed to delete attachment:', error)
    throw error
  }
}

// ============================================
// VOICE RECORDING
// ============================================

/**
 * Record voice message using Web Audio API
 */
export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private startTime: number = 0

  /**
   * Start recording
   */
  async start(): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Create media recorder
      const options = { mimeType: 'audio/webm' }
      this.mediaRecorder = new MediaRecorder(this.stream, options)

      this.audioChunks = []
      this.startTime = Date.now()

      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start()
    } catch (error) {
      logger.error('Failed to start recording:', error)
      throw new Error('Could not access microphone')
    }
  }

  /**
   * Stop recording and return audio file
   */
  async stop(): Promise<File> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
        const duration = Math.floor((Date.now() - this.startTime) / 1000)
        const fileName = `voice_${Date.now()}.webm`

        const audioFile = new File([audioBlob], fileName, {
          type: 'audio/webm',
          lastModified: Date.now(),
        })

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop())
        }

        resolve(audioFile)
      }

      this.mediaRecorder.stop()
    })
  }

  /**
   * Cancel recording
   */
  cancel(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop()
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
    }
    this.audioChunks = []
  }

  /**
   * Get recording duration in seconds
   */
  getDuration(): number {
    if (!this.startTime) return 0
    return Math.floor((Date.now() - this.startTime) / 1000)
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create image thumbnail (for photo previews)
 */
export async function createThumbnail(
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not create canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.startsWith('video/')) return '🎥'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('word')) return '📝'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦'
  return '📎'
}

// ============================================
// NOTES FOR IMPLEMENTATION
// ============================================

/**
 * STORAGE ARCHITECTURE:
 *
 * Small files (<5MB):
 * - Encrypted and stored as base64 in Supabase DB
 * - Included in message payload (attachment field)
 * - Fast, syncs across devices, real-time
 *
 * Large files (>5MB):
 * - Encrypted and stored in IndexedDB (client-side)
 * - Metadata stored in Supabase DB
 * - Device-specific, doesn't sync (trade-off for size)
 *
 * Voice messages:
 * - Always in Supabase DB (usually <1MB)
 * - Real-time delivery
 *
 * Photos:
 * - Compressed before encryption
 * - Stored in Supabase DB (usually <2MB after compression)
 *
 * NO SUPABASE STORAGE USED:
 * - Supabase Storage is ONLY for Vault, NOT messenger
 * - This keeps separation clean and secure
 */
