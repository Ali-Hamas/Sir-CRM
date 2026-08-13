import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class EventDispatcherService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvents(organizationId: string) {
    return this.prisma.integrationEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async dispatchEvent(organizationId: string, eventType: string, payload: Record<string, any>) {
    const event = await this.prisma.integrationEvent.create({
      data: {
        organizationId,
        eventType,
        payloadJson: JSON.stringify(payload),
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    return event;
  }
}
