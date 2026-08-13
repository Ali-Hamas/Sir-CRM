import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class ContactsService {
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

  async create(orgIdOrSlug: string, userId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);

    const contact = await this.prisma.contact.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        jobTitle: data.jobTitle || null,
        department: data.department || null,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        linkedinUrl: data.linkedinUrl || null,
        country: data.country || null,
        city: data.city || null,
        preferredLanguage: data.preferredLanguage || null,
        status: data.status || 'ACTIVE',
        isPrimary: Boolean(data.isPrimary),
        companyId: this.cleanId(data.companyId) ?? null,
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
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'CONTACT_CREATED',
      module: 'CRM',
      entityType: 'CONTACT',
      entityId: contact.id,
      metadata: { name: `${contact.firstName} ${contact.lastName}` },
    }).catch(() => null);

    return contact;
  }

  async findAll(
    orgIdOrSlug: string,
    query: {
      search?: string;
      status?: string;
      companyId?: string;
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
    if (query.companyId) where.companyId = query.companyId;
    if (query.country) where.country = query.country;
    if (query.assignedToId) where.assignedToId = query.assignedToId;

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { mobile: { contains: query.search, mode: 'insensitive' } },
        { jobTitle: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const validSorts = ['firstName', 'lastName', 'status', 'createdAt', 'updatedAt', 'jobTitle'];
    if (query.sortBy && validSorts.includes(query.sortBy)) {
      orderBy[query.sortBy] = query.sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          company: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          tags: true,
          _count: { select: { notes: true, activities: true, opportunities: true } },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(orgIdOrSlug: string, contactId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId: orgId, isDeleted: false },
      include: {
        company: { select: { id: true, name: true, industry: true, website: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        tags: true,
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

    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(orgIdOrSlug: string, contactId: string, userId: string, data: any) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Contact not found');

    const { tags, companyId, workspaceId, assignedToId, isPrimary, ...updateData } = data;
    if (tags !== undefined) {
      await this.prisma.contactTag.deleteMany({ where: { contactId } });
      if (tags?.length) {
        await this.prisma.contactTag.createMany({
          data: tags.map((name: string) => ({ contactId, name })),
        });
      }
    }

    const cleanedPayload: any = { ...updateData, updatedBy: validUserId };
    if (companyId !== undefined) cleanedPayload.companyId = this.cleanId(companyId);
    if (workspaceId !== undefined) cleanedPayload.workspaceId = this.cleanId(workspaceId);
    if (assignedToId !== undefined) cleanedPayload.assignedToId = this.cleanId(assignedToId);
    if (isPrimary !== undefined) cleanedPayload.isPrimary = Boolean(isPrimary);

    const contact = await this.prisma.contact.update({
      where: { id: contactId },
      data: cleanedPayload,
      include: {
        tags: true,
        company: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'CONTACT_UPDATED',
      module: 'CRM',
      entityType: 'CONTACT',
      entityId: contactId,
      metadata: { name: `${contact.firstName} ${contact.lastName}` },
    }).catch(() => null);

    return contact;
  }

  async remove(orgIdOrSlug: string, contactId: string, userId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Contact not found');

    await this.prisma.contact.update({
      where: { id: contactId },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: validUserId },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'CONTACT_DELETED',
      module: 'CRM',
      entityType: 'CONTACT',
      entityId: contactId,
      metadata: { name: `${existing.firstName} ${existing.lastName}` },
    }).catch(() => null);

    return { success: true };
  }

  async addNote(orgIdOrSlug: string, contactId: string, userId: string, content: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const validUserId = await this.resolveUserId(userId);
    const existing = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Contact not found');

    const note = await this.prisma.contactNote.create({
      data: { contactId, content, createdById: validUserId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
      },
    });

    await this.activityService.logActivity({
      userId: validUserId,
      organizationId: orgId,
      action: 'CONTACT_NOTE_ADDED',
      module: 'CRM',
      entityType: 'CONTACT_NOTE',
      entityId: note.id,
      metadata: { contactId, contactName: `${existing.firstName} ${existing.lastName}` },
    }).catch(() => null);

    return note;
  }

  async removeNote(orgIdOrSlug: string, contactId: string, noteId: string) {
    await this.prisma.contactNote.deleteMany({ where: { id: noteId, contactId } });
    return { success: true };
  }

  async getByCompany(orgIdOrSlug: string, companyId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    return this.prisma.contact.findMany({
      where: { organizationId: orgId, companyId, isDeleted: false },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        tags: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }
}
