import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BuildContextDto } from '../dto/create-memory.dto';

@Injectable()
export class AIContextBuilderService {
  private readonly logger = new Logger(AIContextBuilderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async buildContext(userId: string, orgId: string, dto: BuildContextDto) {
    this.logger.log(`Building multi-module AI context for org: ${orgId}, user: ${userId}`);

    const [crmLeads, projects, tasks, knowledgeArticles, meetings, activeMemories, userPreferences] = await Promise.all([
      (this.prisma as any).lead?.findMany({
        where: { organizationId: orgId, isDeleted: false },
        take: 5,
        select: { id: true, name: true, companyName: true, status: true, value: true },
      }).catch(() => []),

      (this.prisma as any).project?.findMany({
        where: { organizationId: orgId, isDeleted: false },
        take: 5,
        select: { id: true, name: true, status: true, progress: true },
      }).catch(() => []),

      (this.prisma as any).task?.findMany({
        where: { organizationId: orgId, isDeleted: false },
        take: 5,
        select: { id: true, title: true, status: true, priority: true },
      }).catch(() => []),

      (this.prisma as any).knowledgeArticle?.findMany({
        where: { organizationId: orgId, status: 'PUBLISHED', isDeleted: false },
        take: 5,
        select: { id: true, title: true, category: { select: { name: true } } },
      }).catch(() => []),

      (this.prisma as any).meeting?.findMany({
        where: { organizationId: orgId, isDeleted: false },
        take: 5,
        select: { id: true, title: true, startTime: true, status: true },
      }).catch(() => []),

      (this.prisma as any).aIMemory?.findMany({
        where: { organizationId: orgId, isDeleted: false },
        orderBy: [{ isPinned: 'desc' }, { importance: 'desc' }],
        take: 10,
        select: { id: true, title: true, memoryType: true, summary: true, importance: true },
      }).catch(() => []),

      (this.prisma as any).aIUserPreference?.findMany({
        where: { userId, organizationId: orgId },
      }).catch(() => []),
    ]);

    const contextPayload = {
      organizationId: orgId,
      requestedByUserId: userId,
      compiledAt: new Date().toISOString(),
      modulesSummary: {
        crmLeadsCount: crmLeads.length,
        projectsCount: projects.length,
        tasksCount: tasks.length,
        knowledgeArticlesCount: knowledgeArticles.length,
        meetingsCount: meetings.length,
        activeMemoriesCount: activeMemories.length,
      },
      dataSources: {
        crmLeads,
        projects,
        tasks,
        knowledgeArticles,
        meetings,
        memories: activeMemories,
        userPreferences,
      },
      compiledSystemContextString: `[ENTERPRISE AI CONTEXT]
Org ID: ${orgId}
Active Projects (${projects.length}): ${projects.map((p: any) => p.name).join(', ') || 'None'}
Recent CRM Leads (${crmLeads.length}): ${crmLeads.map((l: any) => `${l.name} (${l.status})`).join(', ') || 'None'}
Active Memories (${activeMemories.length}): ${activeMemories.map((m: any) => `${m.title} [Imp: ${m.importance}]`).join(' | ') || 'None'}`,
    };

    if (dto.entityType && dto.entityId) {
      await (this.prisma as any).aIContext.create({
        data: {
          organizationId: orgId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          contextData: JSON.stringify(contextPayload),
          summary: `Compiled context snapshot for ${dto.entityType}:${dto.entityId}`,
        },
      }).catch(() => null);
    }

    return contextPayload;
  }

  async getConversationContext(conversationId: string) {
    const existing = await (this.prisma as any).aIConversationContext.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    });

    if (!existing) {
      return {
        conversationId,
        contextSnapshot: null,
        activeMemories: [],
        message: 'No saved conversation context snapshot found.',
      };
    }

    let parsedSnapshot = null;
    let parsedMemories = [];
    try {
      parsedSnapshot = JSON.parse(existing.contextSnapshot);
    } catch (e) {
      parsedSnapshot = existing.contextSnapshot;
    }
    try {
      parsedMemories = JSON.parse(existing.activeMemories);
    } catch (e) {
      parsedMemories = [];
    }

    return {
      conversationId,
      contextSnapshot: parsedSnapshot,
      activeMemories: parsedMemories,
      createdAt: existing.createdAt,
    };
  }
}
