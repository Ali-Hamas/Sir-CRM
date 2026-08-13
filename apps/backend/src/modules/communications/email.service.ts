import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send(params: {
    to: { address: string; name?: string }[];
    cc?: { address: string; name?: string }[];
    bcc?: { address: string; name?: string }[];
    subject: string;
    body: string;
    bodyFormat: string;
    providerConfig?: any;
  }) {
    this.logger.log(`Sending email to ${params.to.map((r) => r.address).join(', ')}: "${params.subject}"`);
    return { success: true, messageId: `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` };
  }
}
