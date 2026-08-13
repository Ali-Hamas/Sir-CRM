import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkflowsExecutionService } from '../workflows/workflows-execution.service';

@Injectable()
export class ContractsService {
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

  private async generateContractNumber(orgId: string): Promise<string> {
    const count = await this.prisma.contract.count({ where: { organizationId: orgId } });
    const num = (count + 1).toString().padStart(4, '0');
    return `CTR-${num}`;
  }

  async create(orgIdOrSlug: string, userId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const contractNumber = await this.generateContractNumber(orgId);

    const contract = await this.prisma.contract.create({
      data: {
        contractNumber,
        title: data.title,
        status: data.status || 'DRAFT',
        contractType: data.contractType || 'SERVICE_AGREEMENT',
        currency: data.currency || 'USD',
        contractValue: this.parseFloatOrNull(data.contractValue) ?? null,
        paymentTerms: data.paymentTerms || null,
        autoRenewal: Boolean(data.autoRenewal),
        notes: data.notes || null,
        startDate: this.parseDateOrNull(data.startDate) ?? null,
        endDate: this.parseDateOrNull(data.endDate) ?? null,
        renewalDate: this.parseDateOrNull(data.renewalDate) ?? null,
        proposalId: this.cleanId(data.proposalId) ?? null,
        opportunityId: this.cleanId(data.opportunityId) ?? null,
        companyId: this.cleanId(data.companyId) ?? null,
        contactId: this.cleanId(data.contactId) ?? null,
        organizationId: orgId,
        workspaceId: this.cleanId(data.workspaceId) ?? null,
        createdById: validUserId,
        ownerId: this.cleanId(data.ownerId) || validUserId,
        updatedBy: validUserId,
      },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        proposal: { select: { id: true, title: true, proposalNumber: true } },
        opportunity: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.prisma.contractVersion.create({
      data: {
        contractId: contract.id,
        versionNumber: 1,
        title: contract.title,
        status: contract.status,
        contractValue: contract.contractValue,
        createdById: validUserId,
      },
    }).catch(() => null);

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'CONTRACT_CREATED',
      module: 'CRM',
      entityType: 'CONTRACT',
      entityId: contract.id,
      metadata: { number: contractNumber, title: contract.title },
    }).catch(() => null);

    return contract;
  }

  async findAll(
    orgIdOrSlug: string,
    query: {
      search?: string;
      status?: string;
      companyId?: string;
      contractType?: string;
      expiringSoon?: string;
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
    if (query.contractType) where.contractType = query.contractType;

    if (query.expiringSoon === 'true') {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      where.endDate = { lte: thirtyDays, gte: new Date() };
      where.status = 'ACTIVE';
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { contractNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy === 'endDate') {
      orderBy.endDate = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (query.sortBy === 'contractValue') {
      orderBy.contractValue = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.contract.findMany({
        where, skip, take: limit, orderBy,
        include: {
          company: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          proposal: { select: { id: true, title: true } },
          opportunity: { select: { id: true, name: true } },
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { versions: true, approvalLogs: true } },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(orgIdOrSlug: string, contractId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, organizationId: orgId, isDeleted: false },
      include: {
        company: { select: { id: true, name: true, industry: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        proposal: { select: { id: true, title: true, proposalNumber: true } },
        opportunity: { select: { id: true, name: true, stage: true, estimatedValue: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        versions: { orderBy: { versionNumber: 'desc' } },
        approvalLogs: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async update(orgIdOrSlug: string, contractId: string, userId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.contract.findFirst({
      where: { id: contractId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Contract not found');

    const { companyId, contactId, proposalId, opportunityId, workspaceId, ownerId, startDate, endDate, renewalDate, contractValue, autoRenewal, ...updateData } = data;
    const cleanedPayload: any = { ...updateData, updatedBy: validUserId };

    if (companyId !== undefined) cleanedPayload.companyId = this.cleanId(companyId);
    if (contactId !== undefined) cleanedPayload.contactId = this.cleanId(contactId);
    if (proposalId !== undefined) cleanedPayload.proposalId = this.cleanId(proposalId);
    if (opportunityId !== undefined) cleanedPayload.opportunityId = this.cleanId(opportunityId);
    if (workspaceId !== undefined) cleanedPayload.workspaceId = this.cleanId(workspaceId);
    if (ownerId !== undefined) cleanedPayload.ownerId = this.cleanId(ownerId);

    if (startDate !== undefined) cleanedPayload.startDate = this.parseDateOrNull(startDate);
    if (endDate !== undefined) cleanedPayload.endDate = this.parseDateOrNull(endDate);
    if (renewalDate !== undefined) cleanedPayload.renewalDate = this.parseDateOrNull(renewalDate);
    if (contractValue !== undefined) cleanedPayload.contractValue = this.parseFloatOrNull(contractValue);
    if (autoRenewal !== undefined) cleanedPayload.autoRenewal = Boolean(autoRenewal);

    const contract = await this.prisma.contract.update({
      where: { id: contractId },
      data: cleanedPayload,
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'CONTRACT_UPDATED',
      module: 'CRM',
      entityType: 'CONTRACT',
      entityId: contractId,
      metadata: { number: existing.contractNumber, title: contract.title },
    }).catch(() => null);

    return contract;
  }

  async remove(orgIdOrSlug: string, contractId: string, userId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.contract.findFirst({
      where: { id: contractId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Contract not found');

    await this.prisma.contract.update({
      where: { id: contractId },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: validUserId },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'CONTRACT_DELETED',
      module: 'CRM',
      entityType: 'CONTRACT',
      entityId: contractId,
      metadata: { number: existing.contractNumber, title: existing.title },
    }).catch(() => null);

    return { success: true };
  }

  async activate(orgIdOrSlug: string, contractId: string, userId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, organizationId: orgId, isDeleted: false },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedContract = await tx.contract.update({
        where: { id: contractId },
        data: {
          status: 'ACTIVE',
          startDate: contract.startDate || new Date(),
          updatedBy: validUserId,
        },
      });

      let client = null;
      if (contract.companyId) {
        const existingClient = await tx.client.findUnique({ where: { companyId: contract.companyId } });
        const company = await tx.company.findUnique({ where: { id: contract.companyId } });
        if (!existingClient && company) {
          client = await tx.client.create({
            data: {
              companyName: company.name,
              companyId: contract.companyId,
              organizationId: orgId,
              createdById: validUserId,
              activatedById: validUserId,
              convertedAt: new Date(),
            },
          });

          await tx.company.update({
            where: { id: contract.companyId },
            data: { status: 'CLIENT', updatedBy: validUserId },
          });
        }
      }

      if (contract.opportunityId) {
        await tx.opportunity.update({
          where: { id: contract.opportunityId },
          data: { status: 'WON', stage: 'CLOSED_WON', actualCloseDate: new Date(), updatedBy: validUserId },
        });
      }

      await tx.contractApproval.create({
        data: { contractId, action: 'ACTIVATED', userId: validUserId },
      });

      return { contract: updatedContract, client };
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'CONTRACT_ACTIVATED',
      module: 'CRM',
      entityType: 'CONTRACT',
      entityId: contractId,
      metadata: {
        number: contract.contractNumber,
        title: contract.title,
        clientId: result.client?.id,
        opportunityUpdated: !!contract.opportunityId,
      },
    }).catch(() => null);

    this.workflowsExecutionService.handleTrigger({
      type: 'CONTRACT_ACTIVATED',
      organizationId: orgId,
      userId: validUserId,
      entityType: 'CONTRACT',
      entityId: contractId,
      entityData: result.contract,
    }).catch(() => null);

    if (contract.ownerId && contract.ownerId !== validUserId) {
      try {
        await this.notificationsService.createNotification({
          userId: contract.ownerId,
          organizationId: orgId,
          title: 'Contract Activated',
          message: `Contract "${contract.title}" has been activated.${result.client ? ' Company converted to client.' : ''}`,
          category: 'CRM',
          priority: 'HIGH',
          linkUrl: `/crm/contracts/${contractId}`,
        });
      } catch {}
    }

    return result;
  }

  async renew(orgIdOrSlug: string, contractId: string, userId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, organizationId: orgId, isDeleted: false },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    const newStartDate = contract.endDate || new Date();
    const newEndDate = new Date(newStartDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id: contractId },
        data: { status: 'EXPIRED', updatedBy: validUserId },
      });

      const newContractNumber = await this.generateContractNumber(orgId);
      const newContract = await tx.contract.create({
        data: {
          contractNumber: newContractNumber,
          title: `${contract.title} (Renewal)`,
          status: 'DRAFT',
          contractType: contract.contractType,
          currency: contract.currency,
          contractValue: contract.contractValue,
          paymentTerms: contract.paymentTerms,
          autoRenewal: contract.autoRenewal,
          startDate: newStartDate,
          endDate: newEndDate,
          renewalDate: newEndDate,
          proposalId: contract.proposalId,
          opportunityId: contract.opportunityId,
          companyId: contract.companyId,
          contactId: contract.contactId,
          organizationId: orgId,
          createdById: validUserId,
          ownerId: contract.ownerId,
          updatedBy: validUserId,
        },
      });

      await tx.contractApproval.create({
        data: { contractId, action: 'RENEWED', comment: `Renewed as ${newContractNumber}`, userId: validUserId },
      });

      return { oldContract: contract, newContract };
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'CONTRACT_RENEWED',
      module: 'CRM',
      entityType: 'CONTRACT',
      entityId: contractId,
      metadata: { oldNumber: contract.contractNumber, newNumber: result.newContract.contractNumber },
    }).catch(() => null);

    return result;
  }

  async getStats(orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    try {
      const now = new Date();
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);

      const [total, byStatus, totalValue, expiringSoon, activeCount] = await Promise.all([
        this.prisma.contract.count({ where: { organizationId: orgId, isDeleted: false } }),
        this.prisma.contract.groupBy({
          by: ['status'],
          where: { organizationId: orgId, isDeleted: false },
          _count: true,
        }).catch(() => []),
        this.prisma.contract.aggregate({
          where: { organizationId: orgId, isDeleted: false, status: 'ACTIVE', contractValue: { not: null } },
          _sum: { contractValue: true },
        }).catch(() => ({ _sum: { contractValue: 0 } })),
        this.prisma.contract.count({
          where: { organizationId: orgId, isDeleted: false, status: 'ACTIVE', endDate: { lte: thirtyDays, gte: now } },
        }).catch(() => 0),
        this.prisma.contract.count({
          where: { organizationId: orgId, isDeleted: false, status: 'ACTIVE' },
        }).catch(() => 0),
      ]);

      const formatCount = (itemCount: any) =>
        typeof itemCount === 'number' ? itemCount : (itemCount?._all ?? itemCount?.id ?? 1);

      return {
        total,
        active: activeCount,
        totalValue: totalValue._sum.contractValue || 0,
        expiringSoon,
        byStatus: (byStatus || []).reduce((acc: any, item: any) => ({ ...acc, [item.status]: formatCount(item._count) }), {}),
      };
    } catch {
      return { total: 0, active: 0, totalValue: 0, expiringSoon: 0, byStatus: {} };
    }
  }
}
