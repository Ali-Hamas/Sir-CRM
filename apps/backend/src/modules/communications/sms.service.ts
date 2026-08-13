import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SMSService {
  private readonly logger = new Logger(SMSService.name);

  async send(params: { recipients: { address: string }[]; body: string; providerConfig?: any }) {
    this.logger.log(`Sending SMS to ${params.recipients.map((r) => r.address).join(', ')}`);
    return { success: true, messageId: `sms_${Date.now()}` };
  }
}
