import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CredentialEncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly secretKey: Buffer;

  constructor() {
    const rawKey = process.env.ENCRYPTION_SECRET || 'blackdesk-enterprise-encryption-secret-key-32bytes!';
    // Ensure key is exactly 32 bytes
    this.secretKey = crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypt a string or object payload using AES-256-CBC.
   */
  encrypt(plainTextOrObj: string | Record<string, any>): { encryptedData: string; iv: string } {
    const text = typeof plainTextOrObj === 'string' ? plainTextOrObj : JSON.stringify(plainTextOrObj);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
    };
  }

  /**
   * Decrypt an AES-256-CBC encrypted payload.
   */
  decrypt(encryptedData: string, ivHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Decrypt and attempt JSON parse.
   */
  decryptJson<T = Record<string, any>>(encryptedData: string, ivHex: string): T {
    const raw = this.decrypt(encryptedData, ivHex);
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }
}
