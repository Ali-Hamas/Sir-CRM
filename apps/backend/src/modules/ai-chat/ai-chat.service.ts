import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateConversationDto, UpdateConversationDto, CreateMessageDto, CreateFolderDto } from './dto/create-chat.dto';
import { AIProviderFactoryService } from '../ai-providers/services/ai-provider-factory.service';

const MOCK_AI_RESPONSES = [
  `Here is a breakdown of your query based on enterprise best practices:

### Key Highlights
1. **Security & Compliance**: All API operations are strictly scoped per organization role (RBAC).
2. **Performance**: Streaming architecture ensures ultra-low initial byte latency.
3. **Integration**: Seamless connectivity with **Britsync CRM**, **Projects**, and **Workflows**.

\`\`\`typescript
// Sample Enterprise AI Helper Function
export async function executeAiTask(payload: { prompt: string; model: string }) {
  console.log("Executing enterprise prompt payload...", payload.model);
  return { status: "SUCCESS", tokensProcessed: 142 };
}
\`\`\`

Let me know if you would like me to generate a detailed proposal or project schedule for this task!`,

  `I've analyzed your request. Here is a summary of recommended actions:

| Step | Action Item | Priority | Assigned Department |
| :--- | :--- | :--- | :--- |
| **01** | Audit API Permissions | High | Security & IT |
| **02** | Configure LLM Provider Preset | High | Enterprise Admin |
| **03** | Test Workflow Automations | Medium | Operations |

Feel free to ask if you need further adjustments to this plan!`,

  `Understood. I have updated the contextual parameters. You can seamlessly leverage this prompt in your **Workflow Engine** or **CRM Pipeline** triggers.`,
];

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
    private readonly providerFactory: AIProviderFactoryService,
  ) {}

  private async resolveOrgId(orgIdOrSlug: string): Promise<string> {
    if (!orgIdOrSlug) return orgIdOrSlug;
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }],
        isDeleted: false,
      },
      select: { id: true },
    });
    return org ? org.id : orgIdOrSlug;
  }

  async createConversation(userId: string, orgIdOrSlug: string, dto: CreateConversationDto) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const title = dto.title?.trim() || 'New AI Chat Thread';

    const conversation = await (this.prisma as any).aIConversation.create({
      data: {
        organizationId: orgId,
        userId,
        folderId: dto.folderId || null,
        title,
        provider: dto.provider || 'OPENAI',
        model: dto.model || 'gpt-4o',
        systemPrompt: dto.systemPrompt || 'You are an enterprise AI assistant for Britsync.',
      },
      include: {
        folder: true,
        messages: true,
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'AI_CHAT_STARTED',
      module: 'AI_PLATFORM',
      entityType: 'AI_CONVERSATION',
      entityId: conversation.id,
      metadata: { title: conversation.title, model: conversation.model },
    });

    return conversation;
  }

  async findAllConversations(userId: string, orgIdOrSlug: string, folderId?: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const where: any = {
      organizationId: orgId,
      userId,
      isDeleted: false,
      isArchived: false,
    };
    if (folderId) where.folderId = folderId;

    return (this.prisma as any).aIConversation.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      include: {
        folder: true,
        _count: { select: { messages: true } },
      },
    });
  }

  async findOneConversation(id: string, userId: string, orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const conversation = await (this.prisma as any).aIConversation.findFirst({
      where: { id, organizationId: orgId, userId, isDeleted: false },
      include: {
        folder: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async updateConversation(id: string, userId: string, orgIdOrSlug: string, dto: UpdateConversationDto) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    await this.findOneConversation(id, userId, orgId);

    return (this.prisma as any).aIConversation.update({
      where: { id },
      data: {
        title: dto.title,
        folderId: dto.folderId !== undefined ? dto.folderId : undefined,
        isPinned: dto.isPinned !== undefined ? dto.isPinned : undefined,
        isArchived: dto.isArchived !== undefined ? dto.isArchived : undefined,
        provider: dto.provider,
        model: dto.model,
        systemPrompt: dto.systemPrompt,
      },
    });
  }

  async removeConversation(id: string, userId: string, orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    await this.findOneConversation(id, userId, orgId);

    await (this.prisma as any).aIConversation.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return { success: true, message: 'Conversation deleted' };
  }

  async createMessage(userId: string, orgIdOrSlug: string, dto: CreateMessageDto) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const conversation = await this.findOneConversation(dto.conversationId, userId, orgId);

    const userTokenEstimate = Math.ceil(dto.content.length / 4);

    const userMsg = await (this.prisma as any).aIMessage.create({
      data: {
        conversationId: dto.conversationId,
        role: dto.role || 'USER',
        content: dto.content,
        tokens: userTokenEstimate,
        responseTimeMs: 0,
        provider: dto.provider || conversation.provider,
        model: dto.model || conversation.model,
        status: 'DELIVERED',
      },
    });

    if (conversation.title === 'New AI Chat Thread' && dto.content.length > 0) {
      const autoTitle = dto.content.substring(0, 30) + (dto.content.length > 30 ? '...' : '');
      await (this.prisma as any).aIConversation.update({
        where: { id: conversation.id },
        data: { title: autoTitle },
      });
    }

    const provider = dto.provider || conversation.provider;
    const model = dto.model || conversation.model;

    // Execute via Provider Factory
    const result = await this.providerFactory.executeWithFailover(orgId, provider, model, {
      systemPrompt: conversation.systemPrompt || undefined,
      messages: [{ role: 'user', content: dto.content }],
    });

    const assistantMsg = await (this.prisma as any).aIMessage.create({
      data: {
        conversationId: dto.conversationId,
        role: 'ASSISTANT',
        content: result.content,
        tokens: result.totalTokens,
        responseTimeMs: result.latencyMs,
        provider: result.provider,
        model: result.model,
        status: 'DELIVERED',
      },
    });

    await (this.prisma as any).aIConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return {
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    };
  }

  async getMessages(conversationId: string, userId: string, orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    await this.findOneConversation(conversationId, userId, orgId);
    return (this.prisma as any).aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createFolder(userId: string, orgIdOrSlug: string, dto: CreateFolderDto) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    return (this.prisma as any).aIConversationFolder.create({
      data: {
        organizationId: orgId,
        userId,
        name: dto.name,
        color: dto.color || 'bg-blue-500',
      },
    });
  }

  async getFolders(userId: string, orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    return (this.prisma as any).aIConversationFolder.findMany({
      where: { organizationId: orgId, userId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { conversations: true } },
      },
    });
  }

  async togglePin(id: string, userId: string, orgIdOrSlug: string) {
    const orgId = await this.resolveOrgId(orgIdOrSlug);
    const conv = await this.findOneConversation(id, userId, orgId);
    return (this.prisma as any).aIConversation.update({
      where: { id },
      data: { isPinned: !conv.isPinned },
    });
  }
}

