import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  private sanitizeMetadata(metadata: any): string | null {
    if (!metadata) return null;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        return metadata;
      }
    }

    const redact = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(redact);

      const cleaned: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        const lowerKey = k.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token') ||
          lowerKey.includes('hash') ||
          lowerKey.includes('apikey') ||
          lowerKey.includes('api_key') ||
          lowerKey.includes('auth') ||
          lowerKey.includes('creditcard')
        ) {
          cleaned[k] = '[REDACTED]';
        } else if (typeof v === 'object' && v !== null) {
          cleaned[k] = redact(v);
        } else {
          cleaned[k] = v;
        }
      }
      return cleaned;
    };

    return JSON.stringify(redact(metadata));
  }

  private async resolveOrgId(orgIdOrSlug: string): Promise<string> {
    if (!orgIdOrSlug) return orgIdOrSlug;
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }],
        isDeleted: false,
      },
      select: { id: true },
    });
    return org ? org.id : orgIdOrSlug;
  }

  async logActivity(data: {
    userId: string;
    organizationId: string;
    action: string;
    module?: string;
    entityType?: string;
    entityId?: string;
    metadata?: any;
    ipAddress?: string;
    device?: string;
  }): Promise<any> {
    try {
      const orgId = await this.resolveOrgId(data.organizationId);
      const sanitizedMeta = this.sanitizeMetadata(data.metadata);

      return await this.prisma.userActivity.create({
        data: {
          userId: data.userId,
          organizationId: orgId,
          action: data.action,
          module: data.module || 'SYSTEM',
          entityType: data.entityType,
          entityId: data.entityId,
          metadata: sanitizedMeta,
          ipAddress: data.ipAddress || '127.0.0.1',
          device: data.device,
        },
      });
    } catch (err: any) {
      // Don't break calling operations if activity logging encounters non-fatal DB errors
      console.warn(`[ACTIVITY_LOG_WARN] Failed to log activity ${data.action}:`, err.message);
      return null;
    }
  }

  async log(data: {
    userId: string;
    organizationId: string;
    action: string;
    module?: string;
    entityType?: string;
    entityId?: string;
    metadata?: any;
    ipAddress?: string;
    device?: string;
  }): Promise<any> {
    return this.logActivity(data);
  }

  async getActivities(
    orgIdOrSlug: string,
    query: {
      userId?: string;
      module?: string;
      entityType?: string;
      action?: string;
      search?: string;
      page?: number;
      limit?: number;
      excludeAdminActions?: boolean;
    }
  ): Promise<any> {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: any = { organizationId: orgId };
    if (query.userId) where.userId = query.userId;
    if (query.module && query.module !== 'ALL') where.module = query.module;
    if (query.entityType) where.entityType = query.entityType;
    if (query.action) where.action = query.action;

    if (query.excludeAdminActions) {
      // Non-admins shouldn't see system-wide admin actions or credentials changes
      where.module = { notIn: ['ADMIN', 'SECURITY_AUDIT', 'ROLE_MANAGEMENT'] };
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { action: { contains: s, mode: 'insensitive' } },
        { module: { contains: s, mode: 'insensitive' } },
        { entityType: { contains: s, mode: 'insensitive' } },
        { metadata: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePictureUrl: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.userActivity.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

