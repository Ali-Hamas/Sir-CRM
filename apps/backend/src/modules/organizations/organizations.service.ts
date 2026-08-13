import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma } from '@blackdesk/database';
import { Role } from '../../common/roles';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: Prisma.OrganizationCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId,
          organizationId: org.id,
          role: Role.SUPER_ADMIN,
        },
      });

      // Create default workspace
      const workspace = await tx.workspace.create({
        data: {
          name: 'Default Workspace',
          description: 'Your default workspace',
          organizationId: org.id,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId,
          workspaceId: workspace.id,
          role: Role.SUPER_ADMIN,
        },
      });

      return org;
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        isDeleted: false,
        members: {
          some: { userId },
        },
      },
    });
  }

  async findOne(idOrSlug: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug },
        ],
        isDeleted: false,
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(idOrSlug: string, userId: string, data: Prisma.OrganizationUpdateInput) {
    const org = await this.findOne(idOrSlug);
    return this.prisma.organization.update({
      where: { id: org.id },
      data: {
        ...data,
        updatedBy: userId,
      },
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.organization.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedBy: userId,
        status: 'SUSPENDED',
      },
    });
  }
}
