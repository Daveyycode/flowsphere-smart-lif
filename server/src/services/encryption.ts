import CryptoJS from 'crypto-js'
import { config } from '../config.js'

/**
 * Encryption service for secure token storage
 * Uses AES-256 encryption for OAuth tokens
 */
export class EncryptionService {
  private key: string

  constructor() {
    this.key = config.encryptionKey
  }

  /**
   * Encrypt sensitive data (tokens, credentials)
   */
  encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.key).toString()
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.key)
    return bytes.toString(CryptoJS.enc.Utf8)
  }

  /**
   * Hash sensitive data (for lookups without storing plain text)
   */
  hash(data: string): string {
    return CryptoJS.SHA256(data).toString()
  }

  /**
   * Encrypt an object (tokens)
   */
  encryptObject<T extends object>(obj: T): string {
    return this.encrypt(JSON.stringify(obj))
  }

  /**
   * Decrypt to object
   */
  decryptObject<T extends object>(encryptedData: string): T {
    const decrypted = this.decrypt(encryptedData)
    return JSON.parse(decrypted) as T
  }
}

export const encryptionService = new EncryptionService()
