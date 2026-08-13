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

  async createNotification(data: Prisma.NotificationUncheckedCreateInput) {
    const notification = await this.prisma.notification.create({ data });
    
    // Future: Check user preferences before emitting
    this.gateway.emitToUser(data.userId, 'new_notification', notification);
    
    return notification;
  }

  async getUserNotifications(userId: string, orgId: string, query: { isRead?: boolean, limit?: number, page?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId, organizationId: orgId, isDeleted: false };
    if (query.isRead !== undefined) {
      where.isRead = String(query.isRead) === 'true';
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

  async getUnreadCount(userId: string, orgId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, organizationId: orgId, isRead: false, isDeleted: false }
    });
    return { count };
  }

  async markAsRead(userId: string, orgId: string, notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId, userId, organizationId: orgId },
      data: { isRead: true }
    });
  }

  async markAllAsRead(userId: string, orgId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, organizationId: orgId, isRead: false, isDeleted: false },
      data: { isRead: true }
    });
  }

  async deleteNotification(userId: string, orgId: string, notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId, userId, organizationId: orgId },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async getPreferences(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: { userId, categories: '{}' }
      });
    }
    return prefs;
  }

  async updatePreferences(userId: string, data: Partial<Prisma.NotificationPreferenceUpdateInput>) {
    return this.prisma.notificationPreference.update({
      where: { userId },
      data
    });
  }
}
