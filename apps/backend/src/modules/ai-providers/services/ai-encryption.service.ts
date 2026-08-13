import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class AIEncryptionService {
  private readonly logger = new Logger(AIEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  // Secret key derived or fallback to consistent secret
  private readonly secretKey = crypto
    .createHash('sha256')
    .update(process.env.ENCRYPTION_SECRET || 'blackdesk-enterprise-ai-secret-key-2026')
    .digest();

  encrypt(text: string): string {
    if (!text) return '';
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt secret payload');
    }
  }

  decrypt(cipherText: string): string {
    if (!cipherText) return '';
    // If text isn't in encrypted format (e.g. legacy plain key), return as is
    if (!cipherText.includes(':')) return cipherText;

    try {
      const parts = cipherText.split(':');
      if (parts.length !== 3) return cipherText;

      const [ivHex, authTagHex, encryptedText] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.warn('Decryption failed or plain text key provided.');
      return cipherText;
    }
  }

  maskKey(key: string | null | undefined): string {
    if (!key) return 'Not Configured';
    const plain = this.decrypt(key);
    if (!plain || plain.length <= 8) return '••••••••';
    const start = plain.substring(0, 4);
    const end = plain.substring(plain.length - 4);
    return `${start}••••••••${end}`;
  }
}
