import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { WorkflowsExecutionService } from '../workflows/workflows-execution.service';

@Injectable()
export class MeetingsService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
    private workflowsExecutionService: WorkflowsExecutionService,
  ) {}

  private async resolveOrgId(orgIdOrSlug: string): Promise<string> {
    if (orgIdOrSlug) {
      const org = await this.prisma.organization.findFirst({
        where: {
          OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }],
          isDeleted: false,
        },
        select: { id: true },
      });
      if (org) return org.id;
    }

    const fallbackOrg = await this.prisma.organization.findFirst({
      where: { isDeleted: false },
      select: { id: true },
    });
    if (fallbackOrg) return fallbackOrg.id;

    const newOrg = await this.prisma.organization.create({
      data: { name: 'Default Organization', slug: 'default-org' },
      select: { id: true },
    });
    return newOrg.id;
  }

  private async resolveUserId(userId: string): Promise<string> {
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (user) return user.id;
    }
    const fallbackUser = await this.prisma.user.findFirst({ select: { id: true } });
    return fallbackUser ? fallbackUser.id : userId;
  }

  private cleanId(id?: string): string | null | undefined {
    if (id === undefined) return undefined;
    if (id === null || id === '' || id.trim() === '') return null;
    return id.trim();
  }

  private parseDateOrNow(v: any): Date {
    if (!v || isNaN(Date.parse(v))) return new Date();
    return new Date(v);
  }

  private parseDateOrNull(v: any): Date | null | undefined {
    if (v === undefined) return undefined;
    if (!v || isNaN(Date.parse(v))) return null;
    return new Date(v);
  }

  async create(orgIdOrSlug: string, userId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);

    const meeting = await this.prisma.meeting.create({
      data: {
        title: data.title,
        meetingType: data.meetingType || 'DISCOVERY',
        status: data.status || 'SCHEDULED',
        date: this.parseDateOrNow(data.date),
        startTime: data.startTime || '09:00',
        endTime: data.endTime || '10:00',
        location: data.location || null,
        meetingLink: data.meetingLink || null,
        agenda: data.agenda || null,
        outcome: data.outcome || null,
        nextFollowupDate: this.parseDateOrNull(data.nextFollowupDate) ?? null,
        companyId: this.cleanId(data.companyId) ?? null,
        contactId: this.cleanId(data.contactId) ?? null,
        leadId: this.cleanId(data.leadId) ?? null,
        opportunityId: this.cleanId(data.opportunityId) ?? null,
        organizationId: orgId,
        workspaceId: this.cleanId(data.workspaceId) ?? null,
        createdById: validUserId,
        updatedBy: validUserId,
        participants: data.participantIds?.length
          ? { create: data.participantIds.map((uid: string) => ({ userId: uid })) }
          : undefined,
      },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'MEETING_CREATED',
      module: 'CRM',
      entityType: 'MEETING',
      entityId: meeting.id,
      metadata: { title: meeting.title, type: meeting.meetingType },
    }).catch(() => null);

    this.workflowsExecutionService.handleTrigger({
      type: 'MEETING_SCHEDULED',
      organizationId: orgId,
      userId: validUserId,
      entityType: 'MEETING',
      entityId: meeting.id,
      entityData: meeting,
    }).catch(() => null);

    return meeting;
  }

  async findAll(
    orgIdOrSlug: string,
    query: {
      search?: string;
      status?: string;
      meetingType?: string;
      companyId?: string;
      dateFrom?: string;
      dateTo?: string;
      upcoming?: string;
      sortBy?: string;
      sortOrder?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: orgId,
      isDeleted: false,
    };

    if (query.status) where.status = query.status;
    if (query.meetingType) where.meetingType = query.meetingType;
    if (query.companyId) where.companyId = query.companyId;

    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom && !isNaN(Date.parse(query.dateFrom))) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo && !isNaN(Date.parse(query.dateTo))) where.date.lte = new Date(query.dateTo);
    }

    if (query.upcoming === 'true') {
      where.date = { gte: new Date() };
      where.status = 'SCHEDULED';
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { agenda: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy === 'date') {
      orderBy.date = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.date = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.meeting.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          company: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          participants: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
          _count: { select: { notes: true, actionItems: true } },
        },
      }),
      this.prisma.meeting.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getCalendar(orgIdOrSlug: string, year: number, month: number) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const meetings = await this.prisma.meeting.findMany({
      where: {
        organizationId: orgId,
        isDeleted: false,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    return meetings;
  }

  async findOne(orgIdOrSlug: string, meetingId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, organizationId: orgId, isDeleted: false },
      include: {
        company: { select: { id: true, name: true, industry: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        opportunity: { select: { id: true, name: true, stage: true, estimatedValue: true } },
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } } },
        },
        notes: {
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        actionItems: {
          include: {
            owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { dueDate: 'asc' },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  async update(orgIdOrSlug: string, meetingId: string, userId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.meeting.findFirst({
      where: { id: meetingId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Meeting not found');

    const { participantIds, companyId, contactId, leadId, opportunityId, workspaceId, date, nextFollowupDate, ...updateData } = data;
    const cleanedPayload: any = { ...updateData, updatedBy: validUserId };

    if (companyId !== undefined) cleanedPayload.companyId = this.cleanId(companyId);
    if (contactId !== undefined) cleanedPayload.contactId = this.cleanId(contactId);
    if (leadId !== undefined) cleanedPayload.leadId = this.cleanId(leadId);
    if (opportunityId !== undefined) cleanedPayload.opportunityId = this.cleanId(opportunityId);
    if (workspaceId !== undefined) cleanedPayload.workspaceId = this.cleanId(workspaceId);
    if (date !== undefined) cleanedPayload.date = this.parseDateOrNow(date);
    if (nextFollowupDate !== undefined) cleanedPayload.nextFollowupDate = this.parseDateOrNull(nextFollowupDate);

    if (participantIds !== undefined) {
      await this.prisma.meetingParticipant.deleteMany({ where: { meetingId } });
      if (participantIds.length) {
        await this.prisma.meetingParticipant.createMany({
          data: participantIds.map((uid: string) => ({ meetingId, userId: uid })),
        });
      }
    }

    const meeting = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: cleanedPayload,
      include: {
        company: { select: { id: true, name: true } },
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'MEETING_UPDATED',
      module: 'CRM',
      entityType: 'MEETING',
      entityId: meetingId,
      metadata: { title: meeting.title },
    }).catch(() => null);

    return meeting;
  }

  async remove(orgIdOrSlug: string, meetingId: string, userId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.meeting.findFirst({
      where: { id: meetingId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Meeting not found');

    await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: validUserId },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'MEETING_DELETED',
      module: 'CRM',
      entityType: 'MEETING',
      entityId: meetingId,
      metadata: { title: existing.title },
    }).catch(() => null);

    return { success: true };
  }

  async addNote(orgIdOrSlug: string, meetingId: string, userId: string, content: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.meeting.findFirst({
      where: { id: meetingId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Meeting not found');

    return this.prisma.meetingNote.create({
      data: { meetingId, content, createdById: validUserId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
      },
    });
  }

  async removeNote(orgIdOrSlug: string, meetingId: string, noteId: string) {
    await this.prisma.meetingNote.deleteMany({ where: { id: noteId, meetingId } });
    return { success: true };
  }

  async addActionItem(orgIdOrSlug: string, meetingId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const existing = await this.prisma.meeting.findFirst({
      where: { id: meetingId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Meeting not found');

    return this.prisma.meetingActionItem.create({
      data: {
        meetingId,
        title: data.title,
        description: data.description || null,
        ownerId: this.cleanId(data.ownerId) ?? null,
        dueDate: this.parseDateOrNull(data.dueDate) ?? null,
        status: data.status || 'PENDING',
        priority: data.priority || 'MEDIUM',
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async updateActionItem(orgIdOrSlug: string, meetingId: string, itemId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const existing = await this.prisma.meeting.findFirst({
      where: { id: meetingId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Meeting not found');

    const updateData: any = { ...data };
    if (updateData.ownerId !== undefined) updateData.ownerId = this.cleanId(updateData.ownerId);
    if (updateData.dueDate !== undefined) updateData.dueDate = this.parseDateOrNull(updateData.dueDate);

    return this.prisma.meetingActionItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async removeActionItem(orgIdOrSlug: string, meetingId: string, itemId: string) {
    await this.prisma.meetingActionItem.deleteMany({ where: { id: itemId, meetingId } });
    return { success: true };
  }

  async getStats(orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const [total, upcoming, today, thisWeek, byType, byStatus] = await Promise.all([
        this.prisma.meeting.count({ where: { organizationId: orgId, isDeleted: false } }),
        this.prisma.meeting.count({
          where: { organizationId: orgId, isDeleted: false, status: 'SCHEDULED', date: { gte: now } },
        }).catch(() => 0),
        this.prisma.meeting.count({
          where: { organizationId: orgId, isDeleted: false, date: { gte: todayStart, lte: todayEnd } },
        }).catch(() => 0),
        this.prisma.meeting.count({
          where: { organizationId: orgId, isDeleted: false, status: 'SCHEDULED', date: { gte: now, lte: weekEnd } },
        }).catch(() => 0),
        this.prisma.meeting.groupBy({
          by: ['meetingType'],
          where: { organizationId: orgId, isDeleted: false },
          _count: true,
        }).catch(() => []),
        this.prisma.meeting.groupBy({
          by: ['status'],
          where: { organizationId: orgId, isDeleted: false },
          _count: true,
        }).catch(() => []),
      ]);

      const formatCount = (itemCount: any) =>
        typeof itemCount === 'number' ? itemCount : (itemCount?._all ?? itemCount?.id ?? 1);

      return {
        total,
        upcoming,
        today,
        thisWeek,
        byType: (byType || []).reduce((acc: any, item: any) => ({ ...acc, [item.meetingType]: formatCount(item._count) }), {}),
        byStatus: (byStatus || []).reduce((acc: any, item: any) => ({ ...acc, [item.status]: formatCount(item._count) }), {}),
      };
    } catch {
      return { total: 0, upcoming: 0, today: 0, thisWeek: 0, byType: {}, byStatus: {} };
    }
  }
}
