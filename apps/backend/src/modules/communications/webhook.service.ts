import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  async send(params: { url: string; body: string; headers?: Record<string, string>; secret?: string; retryCount?: number; timeoutMs?: number }) {
    this.logger.log(`Sending webhook to ${params.url}`);
    return { success: true, statusCode: 200, messageId: `webhook_${Date.now()}` };
  }
}
