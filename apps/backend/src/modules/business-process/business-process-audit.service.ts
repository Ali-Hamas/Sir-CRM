import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class BusinessProcessAuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    organizationId: string;
    executionId?: string;
    processId?: string;
    action: string;
    entityType: string;
    entityId: string;
    userId?: string;
    details?: any;
    metadata?: any;
  }) {
    return this.prisma.businessProcessAudit.create({
      data: {
        organizationId: params.organizationId,
        executionId: params.executionId,
        processId: params.processId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        userId: params.userId,
        details: params.details ? JSON.stringify(params.details) : undefined,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      },
    });
  }

  async findByExecution(executionId: string) {
    return this.prisma.businessProcessAudit.findMany({
      where: { executionId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async findByProcess(organizationId: string, processId: string, limit = 50, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.businessProcessAudit.findMany({
        where: { organizationId, processId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
      this.prisma.businessProcessAudit.count({ where: { organizationId, processId } }),
    ]);
    return { items, total, limit, skip };
  }

  async findByOrganization(organizationId: string, limit = 50, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.businessProcessAudit.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
      this.prisma.businessProcessAudit.count({ where: { organizationId } }),
    ]);
    return { items, total, limit, skip };
  }
}
