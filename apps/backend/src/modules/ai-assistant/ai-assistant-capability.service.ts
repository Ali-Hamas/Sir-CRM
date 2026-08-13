import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export const DEFAULT_CAPABILITIES = [
  'CRM',
  'PROJECTS',
  'TASKS',
  'KNOWLEDGE',
  'DOCUMENTS',
  'MEETINGS',
  'CONTRACTS',
  'PROPOSALS',
  'WORKFLOW_ENGINE',
  'GLOBAL_SEARCH',
  'MEMORY',
  'NOTIFICATIONS',
];

@Injectable()
export class AIAssistantCapabilityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Initializes default capability toggles for an AI Assistant.
   */
  async initializeDefaultCapabilities(assistantId: string) {
    const data = DEFAULT_CAPABILITIES.map((capability) => ({
      assistantId,
      capability,
      enabled: true,
    }));

    await this.prisma.aIAssistantCapability.createMany({
      data,
      // Handle potential duplicate re-initialization gracefully
      // In SQLite, createMany handles batch inserts
    }).catch(() => {});

    return this.getCapabilities(assistantId);
  }

  /**
   * Get all capabilities for an AI Assistant.
   */
  async getCapabilities(assistantId: string) {
    return this.prisma.aIAssistantCapability.findMany({
      where: { assistantId },
      orderBy: { capability: 'asc' },
    });
  }

  /**
   * Batch update capability toggle states.
   */
  async updateCapabilities(
    assistantId: string,
    capabilities: { capability: string; enabled: boolean }[],
  ) {
    for (const item of capabilities) {
      await this.prisma.aIAssistantCapability.upsert({
        where: {
          assistantId_capability: {
            assistantId,
            capability: item.capability,
          },
        },
        update: { enabled: item.enabled },
        create: {
          assistantId,
          capability: item.capability,
          enabled: item.enabled,
        },
      });
    }

    return this.getCapabilities(assistantId);
  }
}
