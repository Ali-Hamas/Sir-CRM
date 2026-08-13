import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  async send(params: { recipients: { address: string; name?: string }[]; body: string; providerConfig?: any }) {
    this.logger.log(`Sending Slack message to ${params.recipients.map((r) => r.address).join(', ')}`);
    return { success: true, messageId: `slack_${Date.now()}` };
  }
}
