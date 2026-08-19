import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AIAssistantCapabilityService } from './ai-assistant-capability.service';
import { AIAssistantPermissionService } from './ai-assistant-permission.service';
import { AIAssistantSessionService } from './ai-assistant-session.service';
import { AIAssistantExecutionService } from './ai-assistant-execution.service';
import { MockResponseService } from './mock-response.service';
import { ActivityService } from '../activity/activity.service';
import { CreateAIAssistantDto } from './dto/create-assistant.dto';
import { UpdateAIAssistantDto } from './dto/update-assistant.dto';
import { ChatAIAssistantDto } from './dto/chat-assistant.dto';

import { AIProviderFactoryService } from '../ai-providers/services/ai-provider-factory.service';

@Injectable()
export class AIAssistantService {
  constructor(
    private prisma: PrismaService,
    private capabilityService: AIAssistantCapabilityService,
    private permissionService: AIAssistantPermissionService,
    private sessionService: AIAssistantSessionService,
    private executionService: AIAssistantExecutionService,
    private mockResponseService: MockResponseService,
    private activityService: ActivityService,
    private providerFactory: AIProviderFactoryService,
  ) {}

  /**
   * Get or initialize default AI Assistant for an organization.
   */
  async getOrInitializeAssistant(orgId: string, userId: string) {
    let assistant = await this.prisma.aIAssistant.findFirst({
      where: { organizationId: orgId, isDeleted: false },
      include: {
        capabilities: true,
        permissions: true,
      },
    });

    if (!assistant) {
      assistant = await this.createAssistant(userId, orgId, {
        name: 'Britsync AI Assistant',
        description: 'Central Enterprise AI Assistant orchestrating intelligence across all workspace modules.',
        defaultProvider: 'OPENAI',
        defaultModel: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
        enabled: true,
      });
    }

    return assistant;
  }

  /**
   * Create a new AI Assistant configuration for an organization.
   */
  async createAssistant(userId: string, orgId: string, dto: CreateAIAssistantDto) {
    const assistant = await this.prisma.aIAssistant.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        avatar: dto.avatar || null,
        systemPrompt: dto.systemPrompt || 'You are Britsync Assistant, an intelligent enterprise AI assistant designed to automate workflows and guide operations.',
        defaultProvider: dto.defaultProvider || 'OPENAI',
        defaultModel: dto.defaultModel || 'gpt-4o',
        temperature: dto.temperature ?? 0.7,
        maxTokens: dto.maxTokens ?? 4096,
        enabled: dto.enabled ?? true,
        organizationId: orgId,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Auto-initialize default capabilities & permissions
    await this.capabilityService.initializeDefaultCapabilities(assistant.id);
    await this.permissionService.initializeDefaultPermissions(assistant.id);

    // Log Activity
    await this.activityService.log({
      userId,
      organizationId: orgId,
      action: 'AI_ASSISTANT_CREATED',
      module: 'AI_ASSISTANT',
      entityType: 'AIAssistant',
      entityId: assistant.id,
      metadata: JSON.stringify({ name: assistant.name }),
    });

    return this.prisma.aIAssistant.findUnique({
      where: { id: assistant.id },
      include: {
        capabilities: true,
        permissions: true,
      },
    });
  }

  /**
   * Update AI Assistant settings.
   */
  async updateAssistant(id: string, orgId: string, userId: string, dto: UpdateAIAssistantDto) {
    const existing = await this.prisma.aIAssistant.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });

    if (!existing) throw new NotFoundException('AI Assistant not found');

    const updated = await this.prisma.aIAssistant.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: userId,
      },
      include: {
        capabilities: true,
        permissions: true,
      },
    });

    await this.activityService.log({
      userId,
      organizationId: orgId,
      action: 'AI_ASSISTANT_UPDATED',
      module: 'AI_ASSISTANT',
      entityType: 'AIAssistant',
      entityId: updated.id,
    });

    return updated;
  }

  /**
   * Soft-delete AI Assistant.
   */
  async removeAssistant(id: string, orgId: string, userId: string) {
    const existing = await this.prisma.aIAssistant.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });

    if (!existing) throw new NotFoundException('AI Assistant not found');

    return this.prisma.aIAssistant.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedBy: userId,
        enabled: false,
      },
    });
  }

  /**
   * Process a chat interaction with the AI Assistant Core (Real AI provider execution + failover).
   */
  async processChat(orgId: string, userId: string, dto: ChatAIAssistantDto) {
    const assistant = await this.getOrInitializeAssistant(orgId, userId);
    const capabilities = assistant.capabilities.filter((c) => c.enabled).map((c) => c.capability);

    // Get or create session
    let sessionId = dto.sessionId;
    if (!sessionId) {
      const session = await this.sessionService.createSession(
        assistant.id,
        orgId,
        userId,
        dto.prompt.substring(0, 40) + '...',
        dto.provider || assistant.defaultProvider,
        dto.model || assistant.defaultModel,
        dto.context,
      );
      sessionId = session.id;
    }

    // Execute via Provider Factory
    const provider = dto.provider || assistant.defaultProvider;
    const model = dto.model || assistant.defaultModel;

    const result = await this.providerFactory.executeWithFailover(orgId, provider, model, {
      systemPrompt: assistant.systemPrompt || undefined,
      messages: [{ role: 'user', content: dto.prompt }],
      temperature: assistant.temperature,
      maxTokens: assistant.maxTokens,
    });

    // Simulated tools/memory metadata for audit compatibility
    const mockMeta = this.mockResponseService.generateMockResponse(dto.prompt, capabilities);

    // Log Execution
    const execution = await this.executionService.logExecution({
      assistantId: assistant.id,
      sessionId,
      organizationId: orgId,
      userId,
      userPrompt: dto.prompt,
      assistantResponse: result.content,
      tokens: result.totalTokens,
      latencyMs: result.latencyMs,
      provider: result.provider,
      model: result.model,
      memoryUsed: mockMeta.memoryUsed,
      toolsRequested: mockMeta.toolsRequested,
      executionStatus: 'SUCCESS',
    });

    return {
      sessionId,
      executionId: execution.id,
      prompt: dto.prompt,
      response: result.content,
      provider: result.provider,
      model: result.model,
      tokens: result.totalTokens,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      estimatedCost: result.estimatedCost,
      latencyMs: result.latencyMs,
      isMockFallback: result.isMockFallback || false,
      memoryUsed: mockMeta.memoryUsed,
      toolsRequested: mockMeta.toolsRequested,
      createdAt: execution.createdAt,
    };
  }
}
