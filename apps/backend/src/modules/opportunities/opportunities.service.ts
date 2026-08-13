import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkflowsExecutionService } from '../workflows/workflows-execution.service';

@Injectable()
export class OpportunitiesService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
    private notificationsService: NotificationsService,
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

  private parseFloatOrNull(v: any): number | null | undefined {
    if (v === undefined) return undefined;
    if (v === null || v === '' || isNaN(Number(v))) return null;
    return parseFloat(v);
  }

  private parseIntOrNull(v: any): number | null | undefined {
    if (v === undefined) return undefined;
    if (v === null || v === '' || isNaN(Number(v))) return null;
    return parseInt(v, 10);
  }

  private parseDateOrNull(v: any): Date | null | undefined {
    if (v === undefined) return undefined;
    if (!v || isNaN(Date.parse(v))) return null;
    return new Date(v);
  }

  async create(orgIdOrSlug: string, userId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);

    const opportunity = await this.prisma.opportunity.create({
      data: {
        name: data.name,
        probability: this.parseIntOrNull(data.probability) ?? 0,
        estimatedValue: this.parseFloatOrNull(data.estimatedValue) ?? null,
        currency: data.currency || 'USD',
        expectedCloseDate: this.parseDateOrNull(data.expectedCloseDate) ?? null,
        source: data.source || null,
        description: data.description || null,
        competitor: data.competitor || null,
        nextFollowupDate: this.parseDateOrNull(data.nextFollowupDate) ?? null,
        stage: data.stage || 'NEW_OPPORTUNITY',
        status: data.status || 'OPEN',
        companyId: this.cleanId(data.companyId) ?? null,
        contactId: this.cleanId(data.contactId) ?? null,
        leadId: this.cleanId(data.leadId) ?? null,
        organizationId: orgId,
        workspaceId: this.cleanId(data.workspaceId) ?? null,
        assignedToId: this.cleanId(data.assignedToId) ?? null,
        createdById: validUserId,
        updatedBy: validUserId,
        tags: data.tags?.length
          ? { create: data.tags.map((name: string) => ({ name })) }
          : undefined,
      },
      include: {
        tags: true,
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'OPPORTUNITY_CREATED',
      module: 'CRM',
      entityType: 'OPPORTUNITY',
      entityId: opportunity.id,
      metadata: { name: opportunity.name, stage: opportunity.stage },
    }).catch(() => null);

    return opportunity;
  }

  async findAll(
    orgIdOrSlug: string,
    query: {
      search?: string;
      status?: string;
      stage?: string;
      companyId?: string;
      assignedToId?: string;
      minValue?: number;
      maxValue?: number;
      closeDateFrom?: string;
      closeDateTo?: string;
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
    if (query.stage) where.stage = query.stage;
    if (query.companyId) where.companyId = query.companyId;
    if (query.assignedToId) where.assignedToId = query.assignedToId;

    if (query.minValue || query.maxValue) {
      where.estimatedValue = {};
      if (query.minValue) where.estimatedValue.gte = query.minValue;
      if (query.maxValue) where.estimatedValue.lte = query.maxValue;
    }

    if (query.closeDateFrom || query.closeDateTo) {
      where.expectedCloseDate = {};
      if (query.closeDateFrom && !isNaN(Date.parse(query.closeDateFrom))) where.expectedCloseDate.gte = new Date(query.closeDateFrom);
      if (query.closeDateTo && !isNaN(Date.parse(query.closeDateTo))) where.expectedCloseDate.lte = new Date(query.closeDateTo);
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { competitor: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const validSorts = ['name', 'status', 'stage', 'estimatedValue', 'probability', 'expectedCloseDate', 'createdAt', 'updatedAt'];
    if (query.sortBy && validSorts.includes(query.sortBy)) {
      orderBy[query.sortBy] = query.sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          company: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          tags: true,
          _count: { select: { notes: true, activities: true, proposals: true, contracts: true } },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByStage(orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const items = await this.prisma.opportunity.findMany({
      where: { organizationId: orgId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        tags: true,
      },
    });

    const stages = [
      'NEW_OPPORTUNITY', 'QUALIFICATION', 'DISCOVERY', 'PROPOSAL',
      'NEGOTIATION', 'CONTRACT_REVIEW', 'WON', 'LOST',
    ];

    const grouped: Record<string, any[]> = {};
    stages.forEach((s) => { grouped[s] = []; });
    items.forEach((item) => {
      const stageKey = stages.includes(item.stage) ? item.stage : 'NEW_OPPORTUNITY';
      if (!grouped[stageKey]) grouped[stageKey] = [];
      grouped[stageKey].push(item);
    });

    return grouped;
  }

  async findOne(orgIdOrSlug: string, oppId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: oppId, organizationId: orgId, isDeleted: false },
      include: {
        company: { select: { id: true, name: true, industry: true, website: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, jobTitle: true } },
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        tags: true,
        proposals: {
          where: { isDeleted: false },
          select: { id: true, proposalNumber: true, title: true, status: true, totalValue: true },
        },
        contracts: {
          where: { isDeleted: false },
          select: { id: true, contractNumber: true, title: true, status: true, contractValue: true },
        },
        notes: {
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!opp) throw new NotFoundException('Opportunity not found');
    return opp;
  }

  async update(orgIdOrSlug: string, oppId: string, userId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.opportunity.findFirst({
      where: { id: oppId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Opportunity not found');

    const { tags, companyId, contactId, leadId, workspaceId, assignedToId, probability, estimatedValue, expectedCloseDate, nextFollowupDate, ...updateData } = data;
    if (tags !== undefined) {
      await this.prisma.opportunityTag.deleteMany({ where: { opportunityId: oppId } });
      if (tags?.length) {
        await this.prisma.opportunityTag.createMany({
          data: tags.map((name: string) => ({ opportunityId: oppId, name })),
        });
      }
    }

    const cleanedPayload: any = { ...updateData, updatedBy: validUserId };
    if (companyId !== undefined) cleanedPayload.companyId = this.cleanId(companyId);
    if (contactId !== undefined) cleanedPayload.contactId = this.cleanId(contactId);
    if (leadId !== undefined) cleanedPayload.leadId = this.cleanId(leadId);
    if (workspaceId !== undefined) cleanedPayload.workspaceId = this.cleanId(workspaceId);
    if (assignedToId !== undefined) cleanedPayload.assignedToId = this.cleanId(assignedToId);
    if (probability !== undefined) cleanedPayload.probability = this.parseIntOrNull(probability) ?? 0;
    if (estimatedValue !== undefined) cleanedPayload.estimatedValue = this.parseFloatOrNull(estimatedValue);
    if (expectedCloseDate !== undefined) cleanedPayload.expectedCloseDate = this.parseDateOrNull(expectedCloseDate);
    if (nextFollowupDate !== undefined) cleanedPayload.nextFollowupDate = this.parseDateOrNull(nextFollowupDate);

    if (cleanedPayload.status && cleanedPayload.status !== existing.status) {
      if (cleanedPayload.status === 'WON' || cleanedPayload.status === 'LOST') {
        cleanedPayload.actualCloseDate = new Date();
      }
    }

    const opp = await this.prisma.opportunity.update({
      where: { id: oppId },
      data: cleanedPayload,
      include: {
        tags: true,
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'OPPORTUNITY_UPDATED',
      module: 'CRM',
      entityType: 'OPPORTUNITY',
      entityId: oppId,
      metadata: { name: opp.name },
    }).catch(() => null);

    return opp;
  }

  async updateStage(orgIdOrSlug: string, oppId: string, userId: string, stage: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const validStages = [
      'NEW_OPPORTUNITY', 'QUALIFICATION', 'DISCOVERY', 'PROPOSAL',
      'NEGOTIATION', 'CONTRACT_REVIEW', 'WON', 'LOST',
    ];
    if (!validStages.includes(stage)) {
      throw new BadRequestException('Invalid stage');
    }

    const existing = await this.prisma.opportunity.findFirst({
      where: { id: oppId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Opportunity not found');

    const updateData: any = { stage, updatedBy: validUserId };
    if (stage === 'WON' || stage === 'LOST') {
      updateData.actualCloseDate = new Date();
      updateData.status = stage;
    } else {
      updateData.status = 'OPEN';
    }

    const opp = await this.prisma.opportunity.update({
      where: { id: oppId },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'OPPORTUNITY_STAGE_CHANGED',
      module: 'CRM',
      entityType: 'OPPORTUNITY',
      entityId: oppId,
      metadata: { name: opp.name, from: existing.stage, to: stage },
    }).catch(() => null);

    if (stage === 'WON') {
      this.workflowsExecutionService.handleTrigger({
        type: 'OPPORTUNITY_WON',
        organizationId: orgId,
        userId: validUserId,
        entityType: 'OPPORTUNITY',
        entityId: oppId,
        entityData: opp,
      }).catch(() => null);
    }

    if (existing.assignedToId && existing.assignedToId !== validUserId) {
      try {
        await this.notificationsService.createNotification({
          userId: existing.assignedToId,
          organizationId: orgId,
          title: 'Opportunity Stage Updated',
          message: `"${opp.name}" moved to ${stage.replace(/_/g, ' ')}`,
          category: 'CRM',
          priority: 'LOW',
          linkUrl: `/crm/opportunities/${oppId}`,
        });
      } catch {}
    }

    return opp;
  }

  async remove(orgIdOrSlug: string, oppId: string, userId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.opportunity.findFirst({
      where: { id: oppId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Opportunity not found');

    await this.prisma.opportunity.update({
      where: { id: oppId },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: validUserId },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'OPPORTUNITY_DELETED',
      module: 'CRM',
      entityType: 'OPPORTUNITY',
      entityId: oppId,
      metadata: { name: existing.name },
    }).catch(() => null);

    return { success: true };
  }

  async addNote(orgIdOrSlug: string, oppId: string, userId: string, content: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.opportunity.findFirst({
      where: { id: oppId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Opportunity not found');

    const note = await this.prisma.opportunityNote.create({
      data: { opportunityId: oppId, content, createdById: validUserId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'OPPORTUNITY_NOTE_ADDED',
      module: 'CRM',
      entityType: 'OPPORTUNITY_NOTE',
      entityId: note.id,
      metadata: { opportunityId: oppId, opportunityName: existing.name },
    }).catch(() => null);

    return note;
  }

  async removeNote(orgIdOrSlug: string, oppId: string, noteId: string) {
    await this.prisma.opportunityNote.deleteMany({ where: { id: noteId, opportunityId: oppId } });
    return { success: true };
  }

  async getStats(orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const [total, byStage, byStatus, totalValue, wonValue, lostValue, closingThisMonth] = await Promise.all([
        this.prisma.opportunity.count({
          where: { organizationId: orgId, isDeleted: false },
        }),
        this.prisma.opportunity.groupBy({
          by: ['stage'],
          where: { organizationId: orgId, isDeleted: false },
          _count: true,
          _sum: { estimatedValue: true },
        }).catch(() => []),
        this.prisma.opportunity.groupBy({
          by: ['status'],
          where: { organizationId: orgId, isDeleted: false },
          _count: true,
        }).catch(() => []),
        this.prisma.opportunity.aggregate({
          where: { organizationId: orgId, isDeleted: false, estimatedValue: { not: null } },
          _sum: { estimatedValue: true },
        }).catch(() => ({ _sum: { estimatedValue: 0 } })),
        this.prisma.opportunity.aggregate({
          where: { organizationId: orgId, isDeleted: false, status: 'WON', estimatedValue: { not: null } },
          _sum: { estimatedValue: true },
        }).catch(() => ({ _sum: { estimatedValue: 0 } })),
        this.prisma.opportunity.aggregate({
          where: { organizationId: orgId, isDeleted: false, status: 'LOST', estimatedValue: { not: null } },
          _sum: { estimatedValue: true },
        }).catch(() => ({ _sum: { estimatedValue: 0 } })),
        this.prisma.opportunity.count({
          where: {
            organizationId: orgId, isDeleted: false, status: 'OPEN',
            expectedCloseDate: { gte: monthStart, lte: monthEnd },
          },
        }).catch(() => 0),
      ]);

      const formatCount = (itemCount: any) =>
        typeof itemCount === 'number' ? itemCount : (itemCount?._all ?? itemCount?.id ?? 1);

      return {
        total,
        totalValue: totalValue._sum.estimatedValue || 0,
        wonValue: wonValue._sum.estimatedValue || 0,
        lostValue: lostValue._sum.estimatedValue || 0,
        closingThisMonth,
        byStage: (byStage || []).reduce((acc: any, item: any) => ({
          ...acc,
          [item.stage]: { count: formatCount(item._count), value: item._sum?.estimatedValue || 0 },
        }), {}),
        byStatus: (byStatus || []).reduce((acc: any, item: any) => ({ ...acc, [item.status]: formatCount(item._count) }), {}),
      };
    } catch {
      return { total: 0, totalValue: 0, wonValue: 0, lostValue: 0, closingThisMonth: 0, byStage: {}, byStatus: {} };
    }
  }
}
