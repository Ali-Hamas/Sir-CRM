import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkflowsExecutionService } from '../workflows/workflows-execution.service';

@Injectable()
export class ProposalsService {
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

  private parseDateOrNull(v: any): Date | null | undefined {
    if (v === undefined) return undefined;
    if (!v || isNaN(Date.parse(v))) return null;
    return new Date(v);
  }

  private async generateProposalNumber(orgId: string): Promise<string> {
    const count = await this.prisma.proposal.count({ where: { organizationId: orgId } });
    const num = (count + 1).toString().padStart(4, '0');
    return `PROP-${num}`;
  }

  async create(orgIdOrSlug: string, userId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const proposalNumber = await this.generateProposalNumber(orgId);

    const proposal = await this.prisma.proposal.create({
      data: {
        proposalNumber,
        title: data.title,
        status: data.status || 'DRAFT',
        currency: data.currency || 'USD',
        totalValue: this.parseFloatOrNull(data.totalValue) ?? null,
        discount: this.parseFloatOrNull(data.discount) ?? null,
        tax: this.parseFloatOrNull(data.tax) ?? null,
        issueDate: this.parseDateOrNull(data.issueDate) ?? null,
        expiryDate: this.parseDateOrNull(data.expiryDate) ?? null,
        notes: data.notes || null,
        termsAndConditions: data.termsAndConditions || null,
        companyId: this.cleanId(data.companyId) ?? null,
        contactId: this.cleanId(data.contactId) ?? null,
        opportunityId: this.cleanId(data.opportunityId) ?? null,
        meetingId: this.cleanId(data.meetingId) ?? null,
        organizationId: orgId,
        workspaceId: this.cleanId(data.workspaceId) ?? null,
        createdById: validUserId,
        ownerId: this.cleanId(data.ownerId) || validUserId,
        updatedBy: validUserId,
        sections: data.sections?.length
          ? { create: data.sections.map((s: any, i: number) => ({ title: s.title, content: s.content, sortOrder: i })) }
          : undefined,
      },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        opportunity: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        sections: { orderBy: { sortOrder: 'asc' } },
      },
    });

    await this.prisma.proposalVersion.create({
      data: {
        proposalId: proposal.id,
        versionNumber: 1,
        title: proposal.title,
        status: proposal.status,
        totalValue: proposal.totalValue,
        content: JSON.stringify(data.sections || []),
        createdById: validUserId,
      },
    }).catch(() => null);

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'PROPOSAL_CREATED',
      module: 'CRM',
      entityType: 'PROPOSAL',
      entityId: proposal.id,
      metadata: { number: proposalNumber, title: proposal.title },
    }).catch(() => null);

    return proposal;
  }

  async findAll(
    orgIdOrSlug: string,
    query: {
      search?: string;
      status?: string;
      companyId?: string;
      ownerId?: string;
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

    const where: any = { organizationId: orgId, isDeleted: false };

    if (query.status) where.status = query.status;
    if (query.companyId) where.companyId = query.companyId;
    if (query.ownerId) where.ownerId = query.ownerId;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { proposalNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const validSorts = ['title', 'status', 'totalValue', 'createdAt', 'expiryDate'];
    if (query.sortBy && validSorts.includes(query.sortBy)) {
      orderBy[query.sortBy] = query.sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where, skip, take: limit, orderBy,
        include: {
          company: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          opportunity: { select: { id: true, name: true } },
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { sections: true, versions: true, approvalLogs: true, contracts: true } },
        },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(orgIdOrSlug: string, proposalId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId: orgId, isDeleted: false },
      include: {
        company: { select: { id: true, name: true, industry: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        opportunity: { select: { id: true, name: true, stage: true, estimatedValue: true } },
        meeting: { select: { id: true, title: true, date: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        sections: { orderBy: { sortOrder: 'asc' } },
        versions: { orderBy: { versionNumber: 'desc' } },
        approvalLogs: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        activities: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!proposal) throw new NotFoundException('Proposal not found');
    return proposal;
  }

  async update(orgIdOrSlug: string, proposalId: string, userId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Proposal not found');

    const { sections, companyId, contactId, opportunityId, meetingId, workspaceId, ownerId, issueDate, expiryDate, totalValue, discount, tax, ...updateData } = data;
    const cleanedPayload: any = { ...updateData, updatedBy: validUserId };

    if (companyId !== undefined) cleanedPayload.companyId = this.cleanId(companyId);
    if (contactId !== undefined) cleanedPayload.contactId = this.cleanId(contactId);
    if (opportunityId !== undefined) cleanedPayload.opportunityId = this.cleanId(opportunityId);
    if (meetingId !== undefined) cleanedPayload.meetingId = this.cleanId(meetingId);
    if (workspaceId !== undefined) cleanedPayload.workspaceId = this.cleanId(workspaceId);
    if (ownerId !== undefined) cleanedPayload.ownerId = this.cleanId(ownerId);

    if (issueDate !== undefined) cleanedPayload.issueDate = this.parseDateOrNull(issueDate);
    if (expiryDate !== undefined) cleanedPayload.expiryDate = this.parseDateOrNull(expiryDate);
    if (totalValue !== undefined) cleanedPayload.totalValue = this.parseFloatOrNull(totalValue);
    if (discount !== undefined) cleanedPayload.discount = this.parseFloatOrNull(discount);
    if (tax !== undefined) cleanedPayload.tax = this.parseFloatOrNull(tax);

    const proposal = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: cleanedPayload,
      include: {
        company: { select: { id: true, name: true } },
        sections: { orderBy: { sortOrder: 'asc' } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (sections !== undefined) {
      await this.prisma.proposalSection.deleteMany({ where: { proposalId } });
      if (sections.length) {
        await this.prisma.proposalSection.createMany({
          data: sections.map((s: any, i: number) => ({ proposalId, title: s.title, content: s.content, sortOrder: i })),
        });
      }
    }

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'PROPOSAL_UPDATED',
      module: 'CRM',
      entityType: 'PROPOSAL',
      entityId: proposalId,
      metadata: { number: existing.proposalNumber, title: proposal.title },
    }).catch(() => null);

    return proposal;
  }

  async remove(orgIdOrSlug: string, proposalId: string, userId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Proposal not found');

    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: validUserId },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'PROPOSAL_DELETED',
      module: 'CRM',
      entityType: 'PROPOSAL',
      entityId: proposalId,
      metadata: { number: existing.proposalNumber, title: existing.title },
    }).catch(() => null);

    return { success: true };
  }

  async approve(orgIdOrSlug: string, proposalId: string, userId: string, data: { action: string; comment?: string }) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const validActions = ['APPROVED', 'REJECTED', 'REVISION_REQUESTED'];
    if (!validActions.includes(data.action)) {
      throw new BadRequestException('Invalid approval action');
    }

    const existing = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Proposal not found');

    const statusMap: Record<string, string> = {
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      REVISION_REQUESTED: 'REVISION_REQUESTED',
    };

    await this.prisma.$transaction([
      this.prisma.proposal.update({
        where: { id: proposalId },
        data: { status: statusMap[data.action], updatedBy: validUserId },
      }),
      this.prisma.proposalApprovalLog.create({
        data: {
          proposalId,
          action: data.action,
          comment: data.comment || null,
          userId: validUserId,
        },
      }),
    ]);

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: `PROPOSAL_${data.action}`,
      module: 'CRM',
      entityType: 'PROPOSAL',
      entityId: proposalId,
      metadata: { number: existing.proposalNumber, comment: data.comment },
    }).catch(() => null);

    if (data.action === 'APPROVED') {
      this.workflowsExecutionService.handleTrigger({
        type: 'PROPOSAL_APPROVED',
        organizationId: orgId,
        userId: validUserId,
        entityType: 'PROPOSAL',
        entityId: proposalId,
        entityData: existing,
      }).catch(() => null);
    }

    if (existing.ownerId && existing.ownerId !== validUserId) {
      try {
        await this.notificationsService.createNotification({
          userId: existing.ownerId,
          organizationId: orgId,
          title: `Proposal ${data.action.replace(/_/g, ' ').toLowerCase()}`,
          message: `Your proposal "${existing.title}" has been ${data.action.replace(/_/g, ' ').toLowerCase()}.${data.comment ? ` Comment: ${data.comment}` : ''}`,
          category: 'CRM',
          priority: 'MEDIUM',
          linkUrl: `/crm/proposals/${proposalId}`,
        });
      } catch {}
    }

    return { success: true };
  }

  async send(orgIdOrSlug: string, proposalId: string, userId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Proposal not found');

    await this.prisma.$transaction([
      this.prisma.proposal.update({
        where: { id: proposalId },
        data: { status: 'SENT', issueDate: existing.issueDate || new Date(), updatedBy: validUserId },
      }),
      this.prisma.proposalApprovalLog.create({
        data: { proposalId, action: 'SENT', userId: validUserId },
      }),
    ]);

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'PROPOSAL_SENT',
      module: 'CRM',
      entityType: 'PROPOSAL',
      entityId: proposalId,
      metadata: { number: existing.proposalNumber, title: existing.title },
    }).catch(() => null);

    return { success: true };
  }

  async duplicate(orgIdOrSlug: string, proposalId: string, userId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId: orgId, isDeleted: false },
      include: { sections: true },
    });
    if (!existing) throw new NotFoundException('Proposal not found');

    const proposalNumber = await this.generateProposalNumber(orgId);

    const newProposal = await this.prisma.proposal.create({
      data: {
        proposalNumber,
        title: `${existing.title} (Copy)`,
        status: 'DRAFT',
        currency: existing.currency,
        totalValue: existing.totalValue,
        discount: existing.discount,
        tax: existing.tax,
        notes: existing.notes,
        termsAndConditions: existing.termsAndConditions,
        companyId: existing.companyId,
        contactId: existing.contactId,
        opportunityId: existing.opportunityId,
        organizationId: orgId,
        createdById: validUserId,
        ownerId: validUserId,
        updatedBy: validUserId,
        sections: {
          create: existing.sections.map((s, i) => ({
            title: s.title,
            content: s.content,
            sortOrder: i,
          })),
        },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'PROPOSAL_DUPLICATED',
      module: 'CRM',
      entityType: 'PROPOSAL',
      entityId: newProposal.id,
      metadata: { originalNumber: existing.proposalNumber, newNumber: proposalNumber },
    }).catch(() => null);

    return newProposal;
  }

  async getStats(orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    try {
      const [total, byStatus, totalValue] = await Promise.all([
        this.prisma.proposal.count({ where: { organizationId: orgId, isDeleted: false } }),
        this.prisma.proposal.groupBy({
          by: ['status'],
          where: { organizationId: orgId, isDeleted: false },
          _count: true,
        }).catch(() => []),
        this.prisma.proposal.aggregate({
          where: { organizationId: orgId, isDeleted: false, totalValue: { not: null } },
          _sum: { totalValue: true },
        }).catch(() => ({ _sum: { totalValue: 0 } })),
      ]);

      const formatCount = (itemCount: any) =>
        typeof itemCount === 'number' ? itemCount : (itemCount?._all ?? itemCount?.id ?? 1);

      return {
        total,
        totalValue: totalValue._sum.totalValue || 0,
        byStatus: (byStatus || []).reduce((acc: any, item: any) => ({ ...acc, [item.status]: formatCount(item._count) }), {}),
      };
    } catch {
      return { total: 0, totalValue: 0, byStatus: {} };
    }
  }
}
