import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AgentRegistryService, AgentSpec } from './agent-registry.service';
import { CreateAIAgentDto } from './dto/create-agent.dto';
import { UpdateAIAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentFactoryService {
  constructor(
    private prisma: PrismaService,
    private registryService: AgentRegistryService,
  ) {}

  /**
   * Ensure default department agents exist for an organization.
   */
  async ensureDefaultAgents(orgId: string, userId?: string) {
    const defaultSpecs = this.registryService.getDefaultAgentsSpecs();

    for (const spec of defaultSpecs) {
      const existing = await this.prisma.aIAgent.findFirst({
        where: { organizationId: orgId, key: spec.key, isDeleted: false },
      });

      if (!existing) {
        await this.createAgentFromSpec(orgId, spec, userId);
      }
    }

    return this.prisma.aIAgent.findMany({
      where: { organizationId: orgId, isDeleted: false },
      include: {
        capabilities: true,
        prompts: true,
        knowledgeScopes: true,
        toolAccesses: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create an AI agent from a registry spec.
   */
  async createAgentFromSpec(orgId: string, spec: AgentSpec, userId?: string) {
    const agent = await this.prisma.aIAgent.create({
      data: {
        organizationId: orgId,
        key: spec.key,
        name: spec.name,
        role: spec.role,
        department: spec.department,
        description: spec.description,
        avatar: spec.avatar || null,
        systemPrompt: spec.systemPrompt,
        defaultProvider: 'OPENAI',
        defaultModel: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
        enabled: true,
        isCustom: false,
        createdBy: userId || null,
        updatedBy: userId || null,
      },
    });

    // Seed capabilities
    for (const cap of spec.capabilities) {
      await this.prisma.aIAgentCapability.create({
        data: {
          agentId: agent.id,
          capability: cap.capability,
          displayName: cap.displayName,
          description: cap.description,
          enabled: cap.enabled,
        },
      });
    }

    // Seed default system prompt
    await this.prisma.aIAgentPrompt.create({
      data: {
        agentId: agent.id,
        promptType: 'SYSTEM',
        name: `${spec.name} Master System Prompt`,
        content: spec.systemPrompt,
        isActive: true,
      },
    });

    // Seed knowledge scopes
    for (const scope of spec.knowledgeScopes) {
      await this.prisma.aIAgentKnowledgeScope.create({
        data: {
          agentId: agent.id,
          scopeType: scope.scopeType,
          allowed: scope.allowed,
        },
      });
    }

    // Seed tool access
    for (const tool of spec.toolAccesses) {
      await this.prisma.aIAgentToolAccess.create({
        data: {
          agentId: agent.id,
          toolKey: tool.toolKey,
          allowed: tool.allowed,
          requiresApproval: tool.requiresApproval,
        },
      });
    }

    return agent;
  }

  /**
   * Create a custom AI agent.
   */
  async createCustomAgent(orgId: string, userId: string, dto: CreateAIAgentDto) {
    const agent = await this.prisma.aIAgent.create({
      data: {
        organizationId: orgId,
        key: dto.key,
        name: dto.name,
        role: dto.role,
        department: dto.department,
        description: dto.description || null,
        avatar: dto.avatar || null,
        systemPrompt: dto.systemPrompt || `You are ${dto.name}, an AI agent specialized in ${dto.role}.`,
        defaultProvider: dto.defaultProvider || 'OPENAI',
        defaultModel: dto.defaultModel || 'gpt-4o',
        temperature: dto.temperature ?? 0.7,
        maxTokens: dto.maxTokens ?? 4096,
        enabled: dto.enabled ?? true,
        isCustom: true,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    if (dto.capabilities && dto.capabilities.length > 0) {
      for (const cap of dto.capabilities) {
        await this.prisma.aIAgentCapability.create({
          data: {
            agentId: agent.id,
            capability: cap.capability,
            displayName: cap.displayName,
            description: cap.description || null,
            enabled: cap.enabled ?? true,
          },
        });
      }
    }

    if (dto.knowledgeScopes && dto.knowledgeScopes.length > 0) {
      for (const scope of dto.knowledgeScopes) {
        await this.prisma.aIAgentKnowledgeScope.create({
          data: {
            agentId: agent.id,
            scopeType: scope.scopeType,
            allowed: scope.allowed ?? true,
          },
        });
      }
    }

    if (dto.toolAccesses && dto.toolAccesses.length > 0) {
      for (const tool of dto.toolAccesses) {
        await this.prisma.aIAgentToolAccess.create({
          data: {
            agentId: agent.id,
            toolKey: tool.toolKey,
            allowed: tool.allowed ?? true,
            requiresApproval: tool.requiresApproval ?? false,
          },
        });
      }
    }

    return this.prisma.aIAgent.findUnique({
      where: { id: agent.id },
      include: {
        capabilities: true,
        prompts: true,
        knowledgeScopes: true,
        toolAccesses: true,
      },
    });
  }

  /**
   * Update AI agent configuration.
   */
  async updateAgent(agentId: string, orgId: string, userId: string, dto: UpdateAIAgentDto) {
    const existing = await this.prisma.aIAgent.findFirst({
      where: { id: agentId, organizationId: orgId, isDeleted: false },
    });

    if (!existing) throw new NotFoundException('Agent not found');

    const updated = await this.prisma.aIAgent.update({
      where: { id: agentId },
      data: {
        name: dto.name ?? existing.name,
        role: dto.role ?? existing.role,
        department: dto.department ?? existing.department,
        description: dto.description !== undefined ? dto.description : existing.description,
        avatar: dto.avatar !== undefined ? dto.avatar : existing.avatar,
        systemPrompt: dto.systemPrompt ?? existing.systemPrompt,
        defaultProvider: dto.defaultProvider ?? existing.defaultProvider,
        defaultModel: dto.defaultModel ?? existing.defaultModel,
        temperature: dto.temperature ?? existing.temperature,
        maxTokens: dto.maxTokens ?? existing.maxTokens,
        enabled: dto.enabled !== undefined ? dto.enabled : existing.enabled,
        updatedBy: userId,
      },
    });

    // Update capabilities if provided
    if (dto.capabilities) {
      for (const cap of dto.capabilities) {
        await this.prisma.aIAgentCapability.upsert({
          where: {
            agentId_capability: {
              agentId,
              capability: cap.capability,
            },
          },
          update: {
            displayName: cap.displayName,
            description: cap.description,
            enabled: cap.enabled ?? true,
          },
          create: {
            agentId,
            capability: cap.capability,
            displayName: cap.displayName,
            description: cap.description,
            enabled: cap.enabled ?? true,
          },
        });
      }
    }

    // Update prompts if provided
    if (dto.prompts) {
      for (const p of dto.prompts) {
        await this.prisma.aIAgentPrompt.create({
          data: {
            agentId,
            promptType: p.promptType || 'SYSTEM',
            name: p.name,
            content: p.content,
            isActive: p.isActive ?? true,
            promptTemplateId: p.promptTemplateId || null,
          },
        });
      }
    }

    // Update knowledge scopes if provided
    if (dto.knowledgeScopes) {
      for (const ks of dto.knowledgeScopes) {
        await this.prisma.aIAgentKnowledgeScope.upsert({
          where: {
            agentId_scopeType: {
              agentId,
              scopeType: ks.scopeType,
            },
          },
          update: {
            allowed: ks.allowed,
          },
          create: {
            agentId,
            scopeType: ks.scopeType,
            allowed: ks.allowed,
          },
        });
      }
    }

    // Update tool accesses if provided
    if (dto.toolAccesses) {
      for (const ta of dto.toolAccesses) {
        await this.prisma.aIAgentToolAccess.upsert({
          where: {
            agentId_toolKey: {
              agentId,
              toolKey: ta.toolKey,
            },
          },
          update: {
            allowed: ta.allowed,
            requiresApproval: ta.requiresApproval ?? false,
          },
          create: {
            agentId,
            toolKey: ta.toolKey,
            allowed: ta.allowed,
            requiresApproval: ta.requiresApproval ?? false,
          },
        });
      }
    }

    return this.prisma.aIAgent.findUnique({
      where: { id: agentId },
      include: {
        capabilities: true,
        prompts: true,
        knowledgeScopes: true,
        toolAccesses: true,
      },
    });
  }
}
