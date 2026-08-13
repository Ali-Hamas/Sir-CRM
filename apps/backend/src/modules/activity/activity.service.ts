import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async logActivity(data: { userId: string; organizationId: string; action: string; module?: string; entityType?: string; entityId?: string; metadata?: any; ipAddress?: string; device?: string }): Promise<any> {
    return this.prisma.userActivity.create({
      data,
    });
  }

  async log(data: { userId: string; organizationId: string; action: string; module?: string; entityType?: string; entityId?: string; metadata?: any; ipAddress?: string; device?: string }): Promise<any> {
    return this.logActivity(data);
  }

  async getActivities(orgId: string, query: { userId?: string, module?: string, entityType?: string, action?: string, page?: number, limit?: number }): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { organizationId: orgId };
    if (query.userId) where.userId = query.userId;
    if (query.module) where.module = query.module;
    if (query.entityType) where.entityType = query.entityType;
    if (query.action) where.action = query.action;

    const [items, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
        }
      }),
      this.prisma.userActivity.count({ where })
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
