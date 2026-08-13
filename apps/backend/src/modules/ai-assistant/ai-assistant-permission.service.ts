import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export const DEFAULT_PERMISSIONS = [
  'READ',
  'WRITE',
  'EXECUTE_ACTIONS',
  'ACCESS_FINANCIAL_DATA',
  'ACCESS_SENSITIVE_INFO',
  'ORGANIZATION_SCOPE',
  'WORKSPACE_SCOPE',
];

@Injectable()
export class AIAssistantPermissionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Initializes default permission grants for an AI Assistant.
   */
  async initializeDefaultPermissions(assistantId: string) {
    const data = DEFAULT_PERMISSIONS.map((permission) => ({
      assistantId,
      permission,
      granted: permission !== 'ACCESS_SENSITIVE_INFO', // Default sensitive info to false for security
    }));

    await this.prisma.aIAssistantPermission.createMany({
      data,
    }).catch(() => {});

    return this.getPermissions(assistantId);
  }

  /**
   * Get all permissions for an AI Assistant.
   */
  async getPermissions(assistantId: string) {
    return this.prisma.aIAssistantPermission.findMany({
      where: { assistantId },
      orderBy: { permission: 'asc' },
    });
  }

  /**
   * Batch update permission grants.
   */
  async updatePermissions(
    assistantId: string,
    permissions: { permission: string; granted: boolean }[],
  ) {
    for (const item of permissions) {
      await this.prisma.aIAssistantPermission.upsert({
        where: {
          assistantId_permission: {
            assistantId,
            permission: item.permission,
          },
        },
        update: { granted: item.granted },
        create: {
          assistantId,
          permission: item.permission,
          granted: item.granted,
        },
      });
    }

    return this.getPermissions(assistantId);
  }
}
