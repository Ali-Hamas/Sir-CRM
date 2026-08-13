import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface CompiledAgentContext {
  agentId: string;
  agentName: string;
  agentRole: string;
  department: string;
  systemPrompt: string;
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  activeCapabilities: string[];
  allowedKnowledgeScopes: string[];
  allowedTools: string[];
  activeMemories: string[];
}

@Injectable()
export class AgentContextBuilderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Build complete context bundle for an AI Agent execution.
   */
  async buildContext(agentId: string, orgId: string, userId: string): Promise<CompiledAgentContext> {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id: agentId, organizationId: orgId, isDeleted: false },
      include: {
        capabilities: true,
        prompts: { where: { isActive: true } },
        knowledgeScopes: { where: { allowed: true } },
        toolAccesses: { where: { allowed: true } },
      },
    });

    if (!agent) {
      throw new Error(`AI Agent ${agentId} not found in organization ${orgId}`);
    }

    // Active system prompt override or default
    const activePrompt = agent.prompts.find((p) => p.promptType === 'SYSTEM')?.content || agent.systemPrompt || '';

    // Active capabilities
    const activeCapabilities = agent.capabilities.filter((c) => c.enabled).map((c) => c.capability);

    // Knowledge scopes
    const allowedKnowledgeScopes = agent.knowledgeScopes.map((k) => k.scopeType);

    // Allowed tools
    const allowedTools = agent.toolAccesses.map((t) => t.toolKey);

    // Workspace & User memories
    const userPrefs = await this.prisma.aIUserPreference.findMany({
      where: { userId, organizationId: orgId },
      take: 5,
    });
    const activeMemories = userPrefs.map((p) => `${p.preferenceKey}: ${p.preferenceValue}`);

    return {
      agentId: agent.id,
      agentName: agent.name,
      agentRole: agent.role,
      department: agent.department,
      systemPrompt: activePrompt,
      provider: agent.defaultProvider,
      model: agent.defaultModel,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      activeCapabilities,
      allowedKnowledgeScopes,
      allowedTools,
      activeMemories,
    };
  }
}
