import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  async send(params: { recipients: { address: string; name?: string }[]; body: string; providerConfig?: any }) {
    this.logger.log(`Sending Discord message to ${params.recipients.map((r) => r.address).join(', ')}`);
    return { success: true, messageId: `discord_${Date.now()}` };
  }
}
