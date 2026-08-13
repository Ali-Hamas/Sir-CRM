import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const rawKey = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    // Ensure key is 32 bytes (256 bits)
    this.key = crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypts plaintext string using AES-256-GCM
   */
  encrypt(text: string): string {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedText
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts formatted ciphertext string
   */
  decrypt(cipherText: string): string {
    if (!cipherText || !cipherText.includes(':')) return cipherText;
    
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 3) return cipherText;

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = parts[2];

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('[EncryptionService] Decryption failed:', error.message);
      return cipherText;
    }
  }

  /**
   * Generates secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Computes SHA-256 hash
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
