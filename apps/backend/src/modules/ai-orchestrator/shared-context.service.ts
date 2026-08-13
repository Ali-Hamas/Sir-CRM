import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface ContextEntry {
  contextKey: string;
  contextType: string;
  data: any;
  sourceAgentKey?: string;
}

@Injectable()
export class SharedContextService {
  constructor(private prisma: PrismaService) {}

  async setContext(workflowId: string, entry: ContextEntry) {
    const existing = await this.prisma.agentSharedContext.findUnique({
      where: { workflowId_contextKey: { workflowId, contextKey: entry.contextKey } },
    });

    if (existing) {
      return this.prisma.agentSharedContext.update({
        where: { id: existing.id },
        data: {
          data: JSON.stringify(entry.data),
          sourceAgentKey: entry.sourceAgentKey ?? existing.sourceAgentKey,
          version: existing.version + 1,
        },
      });
    }

    return this.prisma.agentSharedContext.create({
      data: {
        workflowId,
        contextKey: entry.contextKey,
        contextType: entry.contextType,
        data: JSON.stringify(entry.data),
        sourceAgentKey: entry.sourceAgentKey ?? null,
        version: 1,
      },
    });
  }

  async getContext(workflowId: string, contextKey: string) {
    const entry = await this.prisma.agentSharedContext.findUnique({
      where: { workflowId_contextKey: { workflowId, contextKey } },
    });
    if (!entry) return null;
    return { ...entry, data: JSON.parse(entry.data) };
  }

  async getAllContext(workflowId: string) {
    const entries = await this.prisma.agentSharedContext.findMany({
      where: { workflowId },
    });
    return entries.map((e) => ({ ...e, data: JSON.parse(e.data) }));
  }

  async buildCombinedContext(workflowId: string) {
    const entries = await this.getAllContext(workflowId);
    const combined: Record<string, any> = {};
    for (const entry of entries) {
      combined[entry.contextKey] = entry.data;
    }
    return combined;
  }

  async removeContext(workflowId: string, contextKey: string) {
    return this.prisma.agentSharedContext.deleteMany({
      where: { workflowId, contextKey },
    });
  }
}
