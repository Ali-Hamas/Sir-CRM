import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhookManagerService {
  constructor(private readonly prisma: PrismaService) {}

  async getWebhooks(organizationId: string) {
    return this.prisma.integrationWebhook.findMany({
      where: { organizationId },
      include: { connection: { include: { provider: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWebhook(organizationId: string, data: {
    connectionId?: string;
    name: string;
    events: string[];
  }) {
    const secretKey = `whsec_${crypto.randomBytes(16).toString('hex')}`;
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';
    const webhookUrl = `${baseUrl}/organizations/${organizationId}/integrations/webhooks/receive/${secretKey}`;

    return this.prisma.integrationWebhook.create({
      data: {
        organizationId,
        connectionId: data.connectionId || null,
        name: data.name,
        webhookUrl,
        secretKey,
        events: JSON.stringify(data.events || ['*']),
        isEnabled: true,
      },
    });
  }

  async processInboundWebhook(secretKey: string, payload: any, headers?: Record<string, string>) {
    const webhook = await this.prisma.integrationWebhook.findFirst({
      where: { secretKey, isEnabled: true },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook endpoint not registered or disabled');
    }

    const eventType = payload.event || payload.type || 'generic.webhook';

    const event = await this.prisma.integrationEvent.create({
      data: {
        organizationId: webhook.organizationId,
        connectionId: webhook.connectionId,
        webhookId: webhook.id,
        eventType,
        payloadJson: JSON.stringify(payload),
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    // Update webhook counter & timestamp
    await this.prisma.integrationWebhook.update({
      where: { id: webhook.id },
      data: {
        lastTriggeredAt: new Date(),
        totalDelivered: { increment: 1 },
      },
    });

    await this.prisma.integrationLog.create({
      data: {
        organizationId: webhook.organizationId,
        connectionId: webhook.connectionId,
        level: 'INFO',
        action: 'WEBHOOK_RECEIVED',
        message: `Processed webhook event ${eventType} for ${webhook.name}`,
      },
    });

    return { success: true, eventId: event.id, status: 'PROCESSED' };
  }

  async deleteWebhook(organizationId: string, webhookId: string) {
    const webhook = await this.prisma.integrationWebhook.findFirst({
      where: { id: webhookId, organizationId },
    });
    if (!webhook) throw new NotFoundException('Webhook not found');

    return this.prisma.integrationWebhook.delete({ where: { id: webhookId } });
  }
}
