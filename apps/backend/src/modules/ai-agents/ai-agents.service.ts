import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AgentFactoryService } from './agent-factory.service';
import { AgentExecutorService } from './agent-executor.service';
import { CreateAIAgentDto } from './dto/create-agent.dto';
import { UpdateAIAgentDto } from './dto/update-agent.dto';
import { ChatAIAgentDto } from './dto/chat-agent.dto';

@Injectable()
export class AIAgentsService {
  constructor(
    private prisma: PrismaService,
    private factoryService: AgentFactoryService,
    private executorService: AgentExecutorService,
  ) {}

  /**
   * Helper to resolve Organization entity by ID or Slug.
   */
  private async resolveOrg(idOrSlug: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isDeleted: false,
      },
    });

    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  /**
   * List all AI agents for an organization (auto-initializes default department agents).
   */
  async listAgents(orgIdOrSlug: string, userId: string) {
    const org = await this.resolveOrg(orgIdOrSlug);
    return this.factoryService.ensureDefaultAgents(org.id, userId);
  }

  /**
   * Get single agent by ID.
   */
  async getAgent(orgIdOrSlug: string, agentId: string) {
    const org = await this.resolveOrg(orgIdOrSlug);

    const agent = await this.prisma.aIAgent.findFirst({
      where: { id: agentId, organizationId: org.id, isDeleted: false },
      include: {
        capabilities: true,
        prompts: true,
        knowledgeScopes: true,
        toolAccesses: true,
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!agent) throw new NotFoundException('AI Agent not found');
    return agent;
  }

  /**
   * Create custom agent for an organization.
   */
  async createAgent(orgIdOrSlug: string, userId: string, dto: CreateAIAgentDto) {
    const org = await this.resolveOrg(orgIdOrSlug);
    return this.factoryService.createCustomAgent(org.id, userId, dto);
  }

  /**
   * Update AI Agent configuration.
   */
  async updateAgent(orgIdOrSlug: string, agentId: string, userId: string, dto: UpdateAIAgentDto) {
    const org = await this.resolveOrg(orgIdOrSlug);
    return this.factoryService.updateAgent(agentId, org.id, userId, dto);
  }

  /**
   * Soft delete AI Agent.
   */
  async removeAgent(orgIdOrSlug: string, agentId: string, userId: string) {
    const org = await this.resolveOrg(orgIdOrSlug);

    const existing = await this.prisma.aIAgent.findFirst({
      where: { id: agentId, organizationId: org.id, isDeleted: false },
    });

    if (!existing) throw new NotFoundException('AI Agent not found');

    return this.prisma.aIAgent.update({
      where: { id: agentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        enabled: false,
        updatedBy: userId,
      },
    });
  }

  /**
   * Execute chat / prompt with specified agent.
   */
  async chatAgent(orgIdOrSlug: string, agentId: string, userId: string, dto: ChatAIAgentDto) {
    const org = await this.resolveOrg(orgIdOrSlug);
    return this.executorService.executeAgent(agentId, org.id, userId, dto);
  }

  /**
   * Get execution history logs for an agent.
   */
  async listExecutions(orgIdOrSlug: string, agentId: string, limit = 30) {
    const org = await this.resolveOrg(orgIdOrSlug);

    return this.prisma.aIAgentExecution.findMany({
      where: { agentId, organizationId: org.id },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }
}
