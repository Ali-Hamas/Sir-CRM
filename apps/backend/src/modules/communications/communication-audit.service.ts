import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class CommunicationAuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    messageId?: string;
    action: string;
    channel?: string;
    providerId?: string;
    details?: any;
    metadata?: any;
  }) {
    return this.prisma.communicationAudit.create({
      data: {
        messageId: params.messageId,
        action: params.action,
        channel: params.channel,
        providerId: params.providerId,
        details: params.details ? JSON.stringify(params.details) : undefined,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      },
    });
  }

  async findByMessage(messageId: string) {
    return this.prisma.communicationAudit.findMany({
      where: { messageId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAll(limit = 50, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.communicationAudit.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.communicationAudit.count(),
    ]);
    return { items, total, limit, skip };
  }
}
