import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ToolPermissionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Validates organization membership, workspace scope, and RBAC tool permissions.
   */
  async validateExecutionPermission(
    toolId: string,
    orgId: string,
    userId: string,
    workspaceId?: string,
  ) {
    // 1. Check user exists and belongs to organization
    const orgMember = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId },
    });

    if (!orgMember) {
      throw new ForbiddenException('User does not belong to this organization');
    }

    // 2. Check workspace membership if workspaceId is provided
    if (workspaceId) {
      const wsMember = await this.prisma.workspaceMember.findFirst({
        where: { workspaceId, userId },
      });
      if (!wsMember) {
        throw new ForbiddenException('User does not belong to the target workspace');
      }
    }

    // 3. Check tool permission for user role
    const userRole = orgMember.role || 'EMPLOYEE';
    const permission = await this.prisma.aIToolPermission.findUnique({
      where: { toolId_role: { toolId, role: userRole } },
    });

    if (permission && !permission.allowed) {
      throw new ForbiddenException(`Role ${userRole} is not granted permission to execute this tool`);
    }

    return {
      allowed: true,
      role: userRole,
      requiresApproval: permission?.requiresApproval || false,
    };
  }

  /**
   * Update permission matrix for a tool.
   */
  async updateToolPermissions(
    toolId: string,
    permissions: { role: string; allowed: boolean; requiresApproval: boolean }[],
  ) {
    for (const item of permissions) {
      await this.prisma.aIToolPermission.upsert({
        where: { toolId_role: { toolId, role: item.role } },
        update: { allowed: item.allowed, requiresApproval: item.requiresApproval },
        create: { toolId, role: item.role, allowed: item.allowed, requiresApproval: item.requiresApproval },
      });
    }

    return this.prisma.aIToolPermission.findMany({ where: { toolId } });
  }
}
