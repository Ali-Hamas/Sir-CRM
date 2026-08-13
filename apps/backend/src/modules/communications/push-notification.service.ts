import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  async send(params: { recipients: { address: string }[]; title: string; body: string; providerConfig?: any }) {
    this.logger.log(`Sending push notification to ${params.recipients.map((r) => r.address).join(', ')}`);
    return { success: true, messageId: `push_${Date.now()}` };
  }
}
