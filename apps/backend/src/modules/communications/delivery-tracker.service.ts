import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class DeliveryTrackerService {
  private readonly logger = new Logger(DeliveryTrackerService.name);

  constructor(private prisma: PrismaService) {}

  async track(messageId: string, recipient: string, channel: string, status: string, providerId?: string, errorMessage?: string, providerMessageId?: string) {
    return this.prisma.communicationDelivery.create({
      data: {
        messageId,
        recipient,
        channel,
        status,
        providerId,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        errorMessage,
        providerMessageId,
      },
    });
  }

  async updateDeliveryStatus(deliveryId: string, status: string, errorMessage?: string, providerMessageId?: string) {
    const data: any = { status, attemptCount: { increment: 1 }, lastAttemptAt: new Date() };
    if (status === 'DELIVERED') data.deliveredAt = new Date();
    if (status === 'READ') data.readAt = new Date();
    if (errorMessage) data.errorMessage = errorMessage;
    if (providerMessageId) data.providerMessageId = providerMessageId;

    return this.prisma.communicationDelivery.update({ where: { id: deliveryId }, data });
  }

  async getDeliveriesForMessage(messageId: string) {
    return this.prisma.communicationDelivery.findMany({
      where: { messageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDeliveryStats(organizationId: string) {
    const [total, delivered, failed, pending, bounced] = await Promise.all([
      this.prisma.communicationMessage.count({ where: { organizationId } }),
      this.prisma.communicationMessage.count({ where: { organizationId, status: 'DELIVERED' } }),
      this.prisma.communicationMessage.count({ where: { organizationId, status: 'FAILED' } }),
      this.prisma.communicationMessage.count({ where: { organizationId, status: 'PENDING' } }),
      this.prisma.communicationMessage.count({ where: { organizationId, status: 'BOUNCED' } }),
    ]);
    return { total, delivered, failed, pending, bounced, successRate: total > 0 ? Math.round((delivered / total) * 100) : 0 };
  }
}
