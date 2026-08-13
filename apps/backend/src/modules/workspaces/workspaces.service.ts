import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma } from '@blackdesk/database';
import { Role } from '../../common/roles';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  private async resolveOrgId(orgIdOrSlug: string): Promise<string> {
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [
          { id: orgIdOrSlug },
          { slug: orgIdOrSlug },
        ],
        isDeleted: false,
      },
      select: { id: true },
    });
    return org ? org.id : orgIdOrSlug;
  }

  async create(userId: string, orgIdOrSlug: string, data: Prisma.WorkspaceCreateWithoutOrganizationInput) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          ...data,
          organizationId: orgId,
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

      return workspace;
    });
  }

  async findAllForOrg(orgIdOrSlug: string, userId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    let workspaces = await this.prisma.workspace.findMany({
      where: {
        organizationId: orgId,
        isDeleted: false,
      },
    });

    if (workspaces.length === 0) {
      const defaultWorkspace = await this.create(userId, orgId, {
        name: 'Default Workspace',
        description: 'Your default workspace',
      });
      return [defaultWorkspace];
    }

    for (const ws of workspaces) {
      const isMember = await this.prisma.workspaceMember.findFirst({
        where: { workspaceId: ws.id, userId },
      });
      if (!isMember) {
        await this.prisma.workspaceMember.create({
          data: {
            userId,
            workspaceId: ws.id,
            role: Role.EMPLOYEE,
          },
        }).catch(() => null);
      }
    }

    return workspaces;
  }

  async findOne(id: string, orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async update(id: string, orgIdOrSlug: string, userId: string, data: Prisma.WorkspaceUpdateInput) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const existing = await this.prisma.workspace.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Workspace not found');

    return this.prisma.workspace.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
      },
    });
  }

  async remove(id: string, orgIdOrSlug: string, userId: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const existing = await this.prisma.workspace.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Workspace not found');

    return this.prisma.workspace.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedBy: userId,
        status: 'ARCHIVED',
      },
    });
  }
}
