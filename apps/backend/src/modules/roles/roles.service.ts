import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async createRole(orgId: string, data: any) {
    const { name, description, permissions } = data;
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.customRole.create({
        data: {
          name,
          description,
          organizationId: orgId,
        },
      });

      if (permissions && permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p: any) => ({
            customRoleId: role.id,
            resource: p.resource,
            action: p.action,
          })),
        });
      }

      return role;
    });
  }

  async getRoles(orgId: string) {
    return this.prisma.customRole.findMany({
      where: { organizationId: orgId, isDeleted: false },
      include: {
        permissions: true,
        _count: { select: { members: true } },
      },
    });
  }

  async getRole(orgId: string, roleId: string) {
    const role = await this.prisma.customRole.findFirst({
      where: { id: roleId, organizationId: orgId, isDeleted: false },
      include: { permissions: true },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async updateRole(orgId: string, roleId: string, data: any) {
    const existing = await this.prisma.customRole.findFirst({
      where: { id: roleId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Role not found');

    const { permissions, ...updateData } = data;
    
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.customRole.update({
        where: { id: roleId },
        data: updateData,
      });

      if (permissions) {
        // Replace all permissions
        await tx.rolePermission.deleteMany({ where: { customRoleId: roleId } });
        await tx.rolePermission.createMany({
          data: permissions.map((p: any) => ({
            customRoleId: roleId,
            resource: p.resource,
            action: p.action,
          })),
        });
      }
      return role;
    });
  }

  async deleteRole(orgId: string, roleId: string) {
    const existing = await this.prisma.customRole.findFirst({
      where: { id: roleId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Role not found');

    return this.prisma.customRole.update({
      where: { id: roleId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }
}
