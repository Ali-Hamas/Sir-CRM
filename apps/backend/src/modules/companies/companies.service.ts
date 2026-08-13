import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
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

  async create(orgIdOrSlug: string, userId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);

    const company = await this.prisma.company.create({
      data: {
        name: data.name,
        legalName: data.legalName || null,
        industry: data.industry || null,
        companyType: data.companyType || null,
        website: data.website || null,
        email: data.email || null,
        phone: data.phone || null,
        country: data.country || null,
        city: data.city || null,
        address: data.address || null,
        postalCode: data.postalCode || null,
        numberOfEmployees: this.parseIntOrNull(data.numberOfEmployees) ?? null,
        annualRevenue: this.parseFloatOrNull(data.annualRevenue) ?? null,
        status: data.status || 'PROSPECT',
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
      action: 'COMPANY_CREATED',
      module: 'CRM',
      entityType: 'COMPANY',
      entityId: company.id,
      metadata: { name: company.name },
    }).catch(() => null);

    return company;
  }

  async findAll(
    orgIdOrSlug: string,
    query: {
      search?: string;
      status?: string;
      industry?: string;
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
    if (query.industry) where.industry = query.industry;
    if (query.country) where.country = query.country;
    if (query.assignedToId) where.assignedToId = query.assignedToId;

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { legalName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { website: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy) {
      const validSorts = ['name', 'status', 'industry', 'createdAt', 'updatedAt', 'numberOfEmployees', 'annualRevenue'];
      if (validSorts.includes(query.sortBy)) {
        orderBy[query.sortBy] = query.sortOrder === 'desc' ? 'desc' : 'asc';
      } else {
        orderBy.createdAt = 'desc';
      }
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          tags: true,
          _count: { select: { notes: true, activities: true, contacts: true, opportunities: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(orgIdOrSlug: string, companyId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, organizationId: orgId, isDeleted: false },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        tags: true,
        contacts: {
          where: { isDeleted: false },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, jobTitle: true },
        },
        opportunities: {
          where: { isDeleted: false },
          select: { id: true, name: true, stage: true, status: true, estimatedValue: true },
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

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async update(orgIdOrSlug: string, companyId: string, userId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.company.findFirst({
      where: { id: companyId, organizationId: orgId, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException('Company not found');
    }

    const { tags, workspaceId, assignedToId, annualRevenue, numberOfEmployees, ...updateData } = data;
    if (tags !== undefined) {
      await this.prisma.companyTag.deleteMany({ where: { companyId } });
      if (tags?.length) {
        await this.prisma.companyTag.createMany({
          data: tags.map((name: string) => ({ companyId, name })),
        });
      }
    }

    const cleanedPayload: any = {
      ...updateData,
      updatedBy: validUserId,
    };

    if (workspaceId !== undefined) cleanedPayload.workspaceId = this.cleanId(workspaceId);
    if (assignedToId !== undefined) cleanedPayload.assignedToId = this.cleanId(assignedToId);
    if (annualRevenue !== undefined) cleanedPayload.annualRevenue = this.parseFloatOrNull(annualRevenue);
    if (numberOfEmployees !== undefined) cleanedPayload.numberOfEmployees = this.parseIntOrNull(numberOfEmployees);

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: cleanedPayload,
      include: {
        tags: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'COMPANY_UPDATED',
      module: 'CRM',
      entityType: 'COMPANY',
      entityId: companyId,
      metadata: { name: company.name },
    }).catch(() => null);

    return company;
  }

  async remove(orgIdOrSlug: string, companyId: string, userId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.company.findFirst({
      where: { id: companyId, organizationId: orgId, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException('Company not found');
    }

    await this.prisma.company.update({
      where: { id: companyId },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: validUserId },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'COMPANY_DELETED',
      module: 'CRM',
      entityType: 'COMPANY',
      entityId: companyId,
      metadata: { name: existing.name },
    }).catch(() => null);

    return { success: true };
  }

  async addNote(orgIdOrSlug: string, companyId: string, userId: string, content: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.company.findFirst({
      where: { id: companyId, organizationId: orgId, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException('Company not found');
    }

    const note = await this.prisma.companyNote.create({
      data: {
        companyId,
        content,
        createdById: validUserId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'COMPANY_NOTE_ADDED',
      module: 'CRM',
      entityType: 'COMPANY_NOTE',
      entityId: note.id,
      metadata: { companyId, companyName: existing.name },
    }).catch(() => null);

    return note;
  }

  async removeNote(orgIdOrSlug: string, companyId: string, noteId: string) {
    await this.prisma.companyNote.deleteMany({
      where: { id: noteId, companyId },
    });

    return { success: true };
  }

  async getStats(orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    try {
      const [total, byStatus, byIndustry] = await Promise.all([
        this.prisma.company.count({
          where: { organizationId: orgId, isDeleted: false },
        }),
        this.prisma.company.groupBy({
          by: ['status'],
          where: { organizationId: orgId, isDeleted: false },
          _count: true,
        }).catch(() => []),
        this.prisma.company.groupBy({
          by: ['industry'],
          where: { organizationId: orgId, isDeleted: false, industry: { not: null } },
          _count: true,
          orderBy: { _count: { industry: 'desc' } },
          take: 10,
        }).catch(() => []),
      ]);

      const formatCount = (itemCount: any) =>
        typeof itemCount === 'number' ? itemCount : (itemCount?._all ?? itemCount?.id ?? 1);

      return {
        total,
        byStatus: (byStatus || []).reduce((acc: any, item: any) => ({ ...acc, [item.status]: formatCount(item._count) }), {}),
        byIndustry: (byIndustry || []).map((item: any) => ({
          industry: item.industry,
          count: formatCount(item._count),
        })),
      };
    } catch {
      return { total: 0, byStatus: {}, byIndustry: [] };
    }
  }
}
