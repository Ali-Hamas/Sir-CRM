import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkflowsExecutionService } from '../workflows/workflows-execution.service';

@Injectable()
export class LeadsService {
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

    const lead = await this.prisma.lead.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName || null,
        email: data.email || null,
        phone: data.phone || null,
        jobTitle: data.jobTitle || null,
        country: data.country || null,
        source: data.source || 'OTHER',
        status: data.status || 'NEW',
        leadScore: this.parseIntOrNull(data.leadScore) ?? 0,
        estimatedValue: this.parseFloatOrNull(data.estimatedValue) ?? null,
        expectedCloseDate: this.parseDateOrNull(data.expectedCloseDate) ?? null,
        description: data.description || null,
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
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'LEAD_CREATED',
      module: 'CRM',
      entityType: 'LEAD',
      entityId: lead.id,
      metadata: { name: `${lead.firstName} ${lead.lastName}`, source: lead.source },
    }).catch(() => null);

    this.workflowsExecutionService.handleTrigger({
      type: 'LEAD_CREATED',
      organizationId: orgId,
      userId: validUserId,
      entityType: 'LEAD',
      entityId: lead.id,
      entityData: lead,
    }).catch(() => null);

    return lead;
  }

  async findAll(
    orgIdOrSlug: string,
    query: {
      search?: string;
      status?: string;
      source?: string;
      country?: string;
      assignedToId?: string;
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
    if (query.source) where.source = query.source;
    if (query.country) where.country = query.country;
    if (query.assignedToId) where.assignedToId = query.assignedToId;

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const validSorts = ['firstName', 'lastName', 'status', 'source', 'leadScore', 'estimatedValue', 'createdAt', 'updatedAt'];
    if (query.sortBy && validSorts.includes(query.sortBy)) {
      orderBy[query.sortBy] = query.sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          tags: true,
          _count: { select: { notes: true, activities: true, opportunities: true } },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(orgIdOrSlug: string, leadId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId, isDeleted: false },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        tags: true,
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

    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(orgIdOrSlug: string, leadId: string, userId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Lead not found');

    const { tags, workspaceId, assignedToId, leadScore, estimatedValue, expectedCloseDate, ...updateData } = data;
    if (tags !== undefined) {
      await this.prisma.leadTag.deleteMany({ where: { leadId } });
      if (tags?.length) {
        await this.prisma.leadTag.createMany({
          data: tags.map((name: string) => ({ leadId, name })),
        });
      }
    }

    const cleanedPayload: any = { ...updateData, updatedBy: validUserId };
    if (workspaceId !== undefined) cleanedPayload.workspaceId = this.cleanId(workspaceId);
    if (assignedToId !== undefined) cleanedPayload.assignedToId = this.cleanId(assignedToId);
    if (leadScore !== undefined) cleanedPayload.leadScore = this.parseIntOrNull(leadScore) ?? 0;
    if (estimatedValue !== undefined) cleanedPayload.estimatedValue = this.parseFloatOrNull(estimatedValue);
    if (expectedCloseDate !== undefined) cleanedPayload.expectedCloseDate = this.parseDateOrNull(expectedCloseDate);

    const lead = await this.prisma.lead.update({
      where: { id: leadId },
      data: cleanedPayload,
      include: {
        tags: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'LEAD_UPDATED',
      module: 'CRM',
      entityType: 'LEAD',
      entityId: leadId,
      metadata: { name: `${lead.firstName} ${lead.lastName}` },
    }).catch(() => null);

    return lead;
  }

  async remove(orgIdOrSlug: string, leadId: string, userId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Lead not found');

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: validUserId },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'LEAD_DELETED',
      module: 'CRM',
      entityType: 'LEAD',
      entityId: leadId,
      metadata: { name: `${existing.firstName} ${existing.lastName}` },
    }).catch(() => null);

    return { success: true };
  }

  async addNote(orgIdOrSlug: string, leadId: string, userId: string, content: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Lead not found');

    const note = await this.prisma.leadNote.create({
      data: { leadId, content, createdById: validUserId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'LEAD_NOTE_ADDED',
      module: 'CRM',
      entityType: 'LEAD_NOTE',
      entityId: note.id,
      metadata: { leadId, leadName: `${existing.firstName} ${existing.lastName}` },
    }).catch(() => null);

    return note;
  }

  async removeNote(orgIdOrSlug: string, leadId: string, noteId: string) {
    await this.prisma.leadNote.deleteMany({ where: { id: noteId, leadId } });
    return { success: true };
  }

  async convert(orgIdOrSlug: string, leadId: string, userId: string, data?: { companyId?: string; opportunityName?: string; estimatedValue?: number }) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId, isDeleted: false },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const cleanCompanyId = this.cleanId(data?.companyId);

    const result = await this.prisma.$transaction(async (tx) => {
      let company = null;

      if (cleanCompanyId) {
        company = await tx.company.findFirst({
          where: { id: cleanCompanyId, organizationId: orgId, isDeleted: false },
        });
        if (!company) throw new NotFoundException('Company not found');
      } else if (lead.companyName) {
        company = await tx.company.create({
          data: {
            name: lead.companyName,
            email: lead.email,
            phone: lead.phone,
            country: lead.country,
            organizationId: orgId,
            createdById: validUserId,
            updatedBy: validUserId,
            status: 'PROSPECT',
          },
        });
      }

      const contact = await tx.contact.create({
        data: {
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          jobTitle: lead.jobTitle,
          country: lead.country,
          companyId: company?.id || null,
          organizationId: orgId,
          createdById: validUserId,
          updatedBy: validUserId,
          isPrimary: true,
          status: 'ACTIVE',
        },
      });

      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: { status: 'CONVERTED', updatedBy: validUserId },
      });

      await tx.leadActivity.create({
        data: {
          leadId,
          action: 'LEAD_CONVERTED',
          description: `Converted to${company ? ` Company "${company.name}"` : ''} and Contact "${contact.firstName} ${contact.lastName}"`,
          userId: validUserId,
          metadata: JSON.stringify({
            companyId: company?.id,
            contactId: contact.id,
          }),
        },
      });

      return { lead: updatedLead, company, contact };
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'LEAD_CONVERTED',
      module: 'CRM',
      entityType: 'LEAD',
      entityId: leadId,
      metadata: {
        leadName: `${lead.firstName} ${lead.lastName}`,
        companyId: result.company?.id,
        contactId: result.contact.id,
      },
    }).catch(() => null);

    this.workflowsExecutionService.handleTrigger({
      type: 'LEAD_CONVERTED',
      organizationId: orgId,
      userId: validUserId,
      entityType: 'LEAD',
      entityId: leadId,
      entityData: result.lead,
    }).catch(() => null);

    if (lead.assignedToId && lead.assignedToId !== validUserId) {
      try {
        await this.notificationsService.createNotification({
          userId: lead.assignedToId,
          organizationId: orgId,
          title: 'Lead Converted',
          message: `Lead "${lead.firstName} ${lead.lastName}" has been converted to a contact${result.company ? ` at ${result.company.name}` : ''}.`,
          category: 'CRM',
          priority: 'MEDIUM',
          linkUrl: `/crm/leads/${leadId}`,
        });
      } catch {}
    }

    return result;
  }

  async getStats(orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    try {
      const [total, byStatus, bySource, totalValue] = await Promise.all([
        this.prisma.lead.count({
          where: { organizationId: orgId, isDeleted: false },
        }),
        this.prisma.lead.groupBy({
          by: ['status'],
          where: { organizationId: orgId, isDeleted: false },
          _count: true,
        }).catch(() => []),
        this.prisma.lead.groupBy({
          by: ['source'],
          where: { organizationId: orgId, isDeleted: false },
          _count: true,
          orderBy: { _count: { source: 'desc' } },
          take: 10,
        }).catch(() => []),
        this.prisma.lead.aggregate({
          where: { organizationId: orgId, isDeleted: false, estimatedValue: { not: null } },
          _sum: { estimatedValue: true },
        }).catch(() => ({ _sum: { estimatedValue: 0 } })),
      ]);

      const formatCount = (itemCount: any) =>
        typeof itemCount === 'number' ? itemCount : (itemCount?._all ?? itemCount?.id ?? 1);

      return {
        total,
        totalValue: totalValue._sum.estimatedValue || 0,
        byStatus: (byStatus || []).reduce((acc: any, item: any) => ({ ...acc, [item.status]: formatCount(item._count) }), {}),
        bySource: (bySource || []).map((item: any) => ({ source: item.source, count: formatCount(item._count) })),
      };
    } catch {
      return { total: 0, totalValue: 0, byStatus: {}, bySource: [] };
    }
  }
}
