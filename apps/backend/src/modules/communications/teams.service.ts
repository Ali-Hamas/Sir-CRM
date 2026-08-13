import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  async send(params: { recipients: { address: string; name?: string }[]; body: string; providerConfig?: any }) {
    this.logger.log(`Sending Teams message to ${params.recipients.map((r) => r.address).join(', ')}`);
    return { success: true, messageId: `teams_${Date.now()}` };
  }
}
