import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storagePath = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

  constructor() {
    this.ensureStorageDir();
  }

  private ensureStorageDir() {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
      this.logger.log(`Created mock storage directory at ${this.storagePath}`);
    }
  }

  /**
   * Mocks saving a file stream/buffer to S3 by saving it locally.
   */
  async uploadFile(file: any): Promise<{ key: string; size: number; mimeType: string }> {
    // In a real S3 scenario, this would use AWS SDK S3Client
    const extension = path.extname(file.originalname);
    const key = `${uuidv4()}${extension}`;
    const destination = path.join(this.storagePath, key);

    return new Promise((resolve, reject) => {
      // Mocking Multer behavior where file.buffer is available
      fs.writeFile(destination, file.buffer || 'mock-data', (err) => {
        if (err) {
          this.logger.error('Failed to save file to mock storage', err);
          return reject(err);
        }
        resolve({
          key,
          size: file.size || Buffer.byteLength(file.buffer || 'mock-data'),
          mimeType: file.mimetype || 'application/octet-stream',
        });
      });
    });
  }

  async deleteFile(key: string): Promise<void> {
    const destination = path.join(this.storagePath, key);
    return new Promise((resolve, reject) => {
      fs.unlink(destination, (err) => {
        if (err && err.code !== 'ENOENT') {
          this.logger.error(`Failed to delete file ${key}`, err);
          return reject(err);
        }
        resolve();
      });
    });
  }

  // File Download logic would go here returning streams
}
