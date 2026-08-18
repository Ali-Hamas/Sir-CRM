import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { Prisma } from '@blackdesk/database';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway
  ) {}

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

  async createNotification(data: Prisma.NotificationUncheckedCreateInput) {
    const orgId = await this.resolveOrgId(data.organizationId);
    const notification = await this.prisma.notification.create({
      data: {
        ...data,
        organizationId: orgId,
      },
    });
    
    // Check in-app notification preference
    try {
      const prefs = await this.getPreferences(data.userId);
      if (prefs.inAppEnabled !== false) {
        this.gateway.emitToUser(data.userId, 'new_notification', notification);
      }
      const unread = await this.getUnreadCount(data.userId, orgId);
      this.gateway.emitToUser(data.userId, 'unread_count', unread);
    } catch {
      this.gateway.emitToUser(data.userId, 'new_notification', notification);
    }
    
    return notification;
  }

  async getUserNotifications(
    userId: string,
    orgIdOrSlug: string,
    query: { isRead?: boolean | string; category?: string; search?: string; limit?: number; page?: number }
  ) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId, organizationId: orgId, isDeleted: false };
    if (query.isRead !== undefined && query.isRead !== '') {
      where.isRead = String(query.isRead) === 'true';
    }
    if (query.category && query.category !== 'ALL') {
      where.category = query.category;
    }
    if (query.search && query.search.trim()) {
      where.OR = [
        { title: { contains: query.search.trim(), mode: 'insensitive' } },
        { message: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where })
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUnreadCount(userId: string, orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const count = await this.prisma.notification.count({
      where: { userId, organizationId: orgId, isRead: false, isDeleted: false }
    });
    return { count };
  }

  async markAsRead(userId: string, orgIdOrSlug: string, notificationId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Notification not found');

    const updated = await this.prisma.notification.update({
      where: { id: existing.id },
      data: { isRead: true },
    });

    const unread = await this.getUnreadCount(userId, orgId);
    this.gateway.emitToUser(userId, 'unread_count', unread);

    return updated;
  }

  async markAllAsRead(userId: string, orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const result = await this.prisma.notification.updateMany({
      where: { userId, organizationId: orgId, isRead: false, isDeleted: false },
      data: { isRead: true }
    });

    this.gateway.emitToUser(userId, 'unread_count', { count: 0 });
    return result;
  }

  async deleteNotification(userId: string, orgIdOrSlug: string, notificationId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId, organizationId: orgId },
    });
    if (!existing) throw new NotFoundException('Notification not found');

    const updated = await this.prisma.notification.update({
      where: { id: existing.id },
      data: { isDeleted: true, deletedAt: new Date() }
    });

    const unread = await this.getUnreadCount(userId, orgId);
    this.gateway.emitToUser(userId, 'unread_count', unread);

    return updated;
  }

  async getPreferences(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: {
          userId,
          emailEnabled: true,
          pushEnabled: true,
          inAppEnabled: true,
          categories: JSON.stringify({
            TASKS: true,
            PROJECTS: true,
            CRM: true,
            MEETINGS: true,
            SYSTEM: true,
            SECURITY: true,
          }),
        }
      });
    }
    return prefs;
  }

  async updatePreferences(userId: string, data: any) {
    await this.getPreferences(userId); // Ensure default exists
    const updateData: any = {};
    if (data.emailEnabled !== undefined) updateData.emailEnabled = Boolean(data.emailEnabled);
    if (data.pushEnabled !== undefined) updateData.pushEnabled = Boolean(data.pushEnabled);
    if (data.inAppEnabled !== undefined) updateData.inAppEnabled = Boolean(data.inAppEnabled);
    if (data.categories !== undefined) {
      updateData.categories = typeof data.categories === 'object' ? JSON.stringify(data.categories) : String(data.categories);
    }

    return this.prisma.notificationPreference.update({
      where: { userId },
      data: updateData,
    });
  }
}
