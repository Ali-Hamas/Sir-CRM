import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '../../common/roles';

@Injectable()
export class TimeTrackingService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
    private notificationsService: NotificationsService,
  ) {}

  private async resolveOrgId(orgIdOrSlug: string): Promise<string> {
    const org = await this.prisma.organization.findFirst({
      where: { OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }] },
      select: { id: true },
    });
    return org ? org.id : orgIdOrSlug;
  }

  async createTimeEntry(orgId: string, userId: string, data: any, userRole?: string) {
    const realOrgId = await this.resolveOrgId(orgId);

    if (userRole === Role.CLIENT) {
      throw new ForbiddenException('Clients cannot create time entries');
    }

    if (data.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: data.projectId, organizationId: realOrgId, isDeleted: false },
      });
      if (!project) throw new NotFoundException('Project not found');
    }

    if (data.taskId) {
      const task = await this.prisma.task.findFirst({
        where: { id: data.taskId, organizationId: realOrgId, isDeleted: false },
      });
      if (!task) throw new NotFoundException('Task not found');
    }

    const entry = await this.prisma.timeEntry.create({
      data: {
        description: data.description || null,
        date: data.date ? new Date(data.date) : new Date(),
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
        duration: data.duration ? parseFloat(data.duration) : null,
        billable: data.billable ?? false,
        status: data.status || 'DRAFT',
        userId: data.userId || userId,
        projectId: data.projectId || null,
        taskId: data.taskId || null,
        organizationId: realOrgId,
        createdById: userId,
        updatedBy: userId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, projectName: true, projectCode: true } },
        task: { select: { id: true, title: true } },
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'TIME_ENTRY_CREATED',
      module: 'TIME_TRACKING',
      entityType: 'TIME_ENTRY',
      entityId: entry.id,
      metadata: { description: entry.description, date: entry.date },
    });

    return entry;
  }

  async findAll(
    orgId: string,
    query: {
      search?: string;
      status?: string;
      billable?: string;
      projectId?: string;
      taskId?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: string;
      page?: number;
      limit?: number;
    } = {},
    currentUser?: { id: string; role: string },
  ) {
    const realOrgId = await this.resolveOrgId(orgId);
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { organizationId: realOrgId, isDeleted: false };

    if (query.status) where.status = query.status;
    if (query.billable !== undefined && query.billable !== '') where.billable = query.billable === 'true';
    if (query.projectId) where.projectId = query.projectId;
    if (query.taskId) where.taskId = query.taskId;
    if (query.userId) where.userId = query.userId;

    if (currentUser?.role === Role.CLIENT) {
      const clientRecord = await this.prisma.client.findFirst({
        where: { organizationId: realOrgId, OR: [{ id: currentUser.id }, { companyId: currentUser.id }] },
      });
      if (clientRecord) {
        where.project = { OR: [{ clientId: clientRecord.id }, { companyId: clientRecord.companyId }] };
      } else {
        where.userId = currentUser.id;
      }
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy === 'date') {
      orderBy.date = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (query.sortBy === 'duration') {
      orderBy.duration = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where, skip, take: limit, orderBy,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          project: { select: { id: true, projectName: true, projectCode: true } },
          task: { select: { id: true, title: true } },
        },
      }),
      this.prisma.timeEntry.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findMyEntries(userId: string, orgId: string, query: {
    startDate?: string;
    endDate?: string;
    projectId?: string;
  } = {}) {
    const realOrgId = await this.resolveOrgId(orgId);
    const where: any = { userId, organizationId: realOrgId, isDeleted: false };

    if (query.projectId) where.projectId = query.projectId;

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    const entries = await this.prisma.timeEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        project: { select: { id: true, projectName: true, projectCode: true } },
        task: { select: { id: true, title: true } },
      },
    });

    const totalDuration = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const billableDuration = entries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration || 0), 0);

    return {
      entries,
      totalDuration: Math.round(totalDuration * 100) / 100,
      billableDuration: Math.round(billableDuration * 100) / 100,
      nonBillableDuration: Math.round((totalDuration - billableDuration) * 100) / 100,
    };
  }

  async findOne(orgId: string, entryId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id: entryId, organizationId: realOrgId, isDeleted: false },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
        project: { select: { id: true, projectName: true, projectCode: true } },
        task: { select: { id: true, title: true, status: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!entry) throw new NotFoundException('Time entry not found');
    return entry;
  }

  async update(orgId: string, entryId: string, userId: string, data: any, userRole?: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const existing = await this.prisma.timeEntry.findFirst({
      where: { id: entryId, organizationId: realOrgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Time entry not found');

    const isManagerOrAdmin = userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN || userRole === Role.MANAGER;
    if (!isManagerOrAdmin) {
      if (existing.userId !== userId) {
        throw new ForbiddenException('You can only edit your own time entries');
      }
      if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
        throw new BadRequestException('Only draft or rejected entries can be edited');
      }
    }

    const updateData: any = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.startTime !== undefined) updateData.startTime = data.startTime ? new Date(data.startTime) : null;
    if (data.endTime !== undefined) updateData.endTime = data.endTime ? new Date(data.endTime) : null;
    if (data.duration !== undefined) updateData.duration = data.duration ? parseFloat(data.duration) : null;
    if (data.billable !== undefined) updateData.billable = data.billable;
    if (data.status !== undefined && isManagerOrAdmin) updateData.status = data.status;
    if (data.projectId !== undefined) updateData.projectId = data.projectId || null;
    if (data.taskId !== undefined) updateData.taskId = data.taskId || null;
    updateData.updatedBy = userId;

    const entry = await this.prisma.timeEntry.update({
      where: { id: entryId },
      data: updateData,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, projectName: true, projectCode: true } },
        task: { select: { id: true, title: true } },
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'TIME_ENTRY_UPDATED',
      module: 'TIME_TRACKING',
      entityType: 'TIME_ENTRY',
      entityId: entryId,
      metadata: { description: entry.description },
    });

    return entry;
  }

  async submit(orgId: string, entryId: string, userId: string, userRole?: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const existing = await this.prisma.timeEntry.findFirst({
      where: { id: entryId, organizationId: realOrgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Time entry not found');

    const isManagerOrAdmin = userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN || userRole === Role.MANAGER;
    if (!isManagerOrAdmin && existing.userId !== userId) {
      throw new ForbiddenException('You can only submit your own time entries');
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      throw new BadRequestException('Only draft or rejected entries can be submitted');
    }

    return this.prisma.timeEntry.update({
      where: { id: entryId },
      data: { status: 'SUBMITTED', updatedBy: userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, projectName: true } },
      },
    });
  }

  async approve(orgId: string, entryId: string, userId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const existing = await this.prisma.timeEntry.findFirst({
      where: { id: entryId, organizationId: realOrgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Time entry not found');

    const entry = await this.prisma.timeEntry.update({
      where: { id: entryId },
      data: { status: 'APPROVED', updatedBy: userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, projectName: true } },
      },
    });

    try {
      await this.notificationsService.createNotification({
        userId: existing.userId,
        organizationId: realOrgId,
        title: 'Time Entry Approved',
        message: `Your time entry for ${existing.duration || 0}h has been approved`,
        category: 'TIME_TRACKING',
        priority: 'LOW',
        linkUrl: `/projects/time-tracking`,
      });
    } catch {}

    return entry;
  }

  async remove(orgId: string, entryId: string, userId: string, userRole?: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const existing = await this.prisma.timeEntry.findFirst({
      where: { id: entryId, organizationId: realOrgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Time entry not found');

    const isManagerOrAdmin = userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN || userRole === Role.MANAGER;
    if (!isManagerOrAdmin) {
      if (existing.userId !== userId) {
        throw new ForbiddenException('You can only delete your own time entries');
      }
      if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
        throw new BadRequestException('Only draft entries can be deleted');
      }
    }

    await this.prisma.timeEntry.update({
      where: { id: entryId },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: userId },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'TIME_ENTRY_DELETED',
      module: 'TIME_TRACKING',
      entityType: 'TIME_ENTRY',
      entityId: entryId,
      metadata: { description: existing.description },
    });

    return { success: true };
  }

  // --- Timer ---
  async startTimer(orgId: string, userId: string, data: any) {
    const realOrgId = await this.resolveOrgId(orgId);
    const running = await this.prisma.timeEntry.findFirst({
      where: { userId, organizationId: realOrgId, status: 'RUNNING', isDeleted: false },
    });
    if (running) {
      return running;
    }

    const entry = await this.prisma.timeEntry.create({
      data: {
        description: data?.description || null,
        date: new Date(),
        startTime: new Date(),
        status: 'RUNNING',
        billable: data?.billable ?? false,
        projectId: data?.projectId || null,
        taskId: data?.taskId || null,
        organizationId: realOrgId,
        userId,
        createdById: userId,
        updatedBy: userId,
      },
      include: {
        project: { select: { id: true, projectName: true, projectCode: true } },
        task: { select: { id: true, title: true } },
      },
    });

    return entry;
  }

  async stopTimer(orgId: string, userId: string, entryId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id: entryId, userId, organizationId: realOrgId, status: 'RUNNING', isDeleted: false },
    });
    if (!entry) throw new NotFoundException('Running timer not found');

    const now = new Date();
    const startTime = entry.startTime || entry.createdAt;
    const diffHours = (now.getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60);
    const duration = Math.max(0.01, Math.round(diffHours * 100) / 100);

    return this.prisma.timeEntry.update({
      where: { id: entryId },
      data: { endTime: now, duration, status: 'DRAFT', updatedBy: userId },
      include: {
        project: { select: { id: true, projectName: true, projectCode: true } },
        task: { select: { id: true, title: true } },
      },
    });
  }

  async getRunningTimer(orgId: string, userId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    return this.prisma.timeEntry.findFirst({
      where: { userId, organizationId: realOrgId, status: 'RUNNING', isDeleted: false },
      include: {
        project: { select: { id: true, projectName: true, projectCode: true } },
        task: { select: { id: true, title: true } },
      },
    });
  }

  // --- Dashboard Stats ---
  async getStats(orgId: string, userId?: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const where: any = { organizationId: realOrgId, isDeleted: false };
    if (userId) where.userId = userId;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalEntries, thisWeek, thisMonth, billableCount, runningCount, byProject] = await Promise.all([
      this.prisma.timeEntry.count({ where }),
      this.prisma.timeEntry.count({ where: { ...where, date: { gte: weekStart } } }),
      this.prisma.timeEntry.count({ where: { ...where, date: { gte: monthStart } } }),
      this.prisma.timeEntry.count({ where: { ...where, billable: true } }),
      this.prisma.timeEntry.count({ where: { ...where, status: 'RUNNING' } }),
      this.prisma.timeEntry.groupBy({
        by: ['projectId'],
        where: { ...where, projectId: { not: null } },
        _sum: { duration: true },
        _count: true,
      }),
    ]);

    const totalDurationResult = await this.prisma.timeEntry.aggregate({
      where,
      _sum: { duration: true },
    });

    const billableDurationResult = await this.prisma.timeEntry.aggregate({
      where: { ...where, billable: true },
      _sum: { duration: true },
    });

    const totalDuration = Math.round((totalDurationResult._sum.duration || 0) * 100) / 100;
    const billableDuration = Math.round((billableDurationResult._sum.duration || 0) * 100) / 100;

    return {
      totalEntries,
      totalDuration,
      billableDuration,
      nonBillableDuration: Math.round((totalDuration - billableDuration) * 100) / 100,
      thisWeekEntries: thisWeek,
      thisMonthEntries: thisMonth,
      billableEntries: billableCount,
      activeTimers: runningCount,
      byProject: byProject.map(p => ({
        projectId: p.projectId,
        totalDuration: Math.round((p._sum.duration || 0) * 100) / 100,
        entryCount: p._count,
      })),
    };
  }

  // --- Weekly Timesheet ---
  async getWeeklyTimesheet(orgId: string, userId: string, query: { weekStart?: string }) {
    const realOrgId = await this.resolveOrgId(orgId);
    let weekStartDate: Date;
    if (query.weekStart) {
      weekStartDate = new Date(query.weekStart);
    } else {
      weekStartDate = new Date();
      weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());
    }
    weekStartDate.setHours(0, 0, 0, 0);

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        organizationId: realOrgId,
        isDeleted: false,
        date: { gte: weekStartDate, lt: weekEndDate },
      },
      orderBy: { date: 'asc' },
      include: {
        project: { select: { id: true, projectName: true, projectCode: true } },
        task: { select: { id: true, title: true } },
      },
    });

    const days: Record<string, any[]> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStartDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      days[key] = [];
    }

    for (const entry of entries) {
      const key = entry.date ? new Date(entry.date).toISOString().split('T')[0] : '';
      if (days[key]) days[key].push(entry);
    }

    const totalDuration = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const billableDuration = entries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration || 0), 0);

    return {
      weekStart: weekStartDate.toISOString().split('T')[0],
      days,
      totalDuration: Math.round(totalDuration * 100) / 100,
      billableDuration: Math.round(billableDuration * 100) / 100,
      entries,
    };
  }
}
