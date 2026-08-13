import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePromptDto, UpdatePromptDto, PreviewPromptDto, CreateCategoryDto } from './dto/create-prompt.dto';

@Injectable()
export class PromptsService {
  private readonly logger = new Logger(PromptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  extractPlaceholders(text?: string): string[] {
    if (!text) return [];
    const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches);
  }

  async create(userId: string, orgId: string, dto: CreatePromptDto) {
    const extractedVarNames = new Set([
      ...this.extractPlaceholders(dto.systemPrompt),
      ...this.extractPlaceholders(dto.userPrompt),
    ]);

    const finalVariablesMap = new Map<string, any>();
    extractedVarNames.forEach((varName) => {
      finalVariablesMap.set(varName, {
        name: varName,
        description: `Auto-extracted placeholder {{${varName}}}`,
        required: true,
        defaultValue: null,
        type: 'STRING',
      });
    });

    if (dto.variables) {
      dto.variables.forEach((v) => {
        finalVariablesMap.set(v.name, {
          name: v.name,
          description: v.description || null,
          required: v.required !== undefined ? v.required : true,
          defaultValue: v.defaultValue || null,
          type: v.type || 'STRING',
        });
      });
    }

    const variablesData = Array.from(finalVariablesMap.values());

    const template = await (this.prisma as any).promptTemplate.create({
      data: {
        organizationId: orgId,
        categoryId: dto.categoryId || null,
        name: dto.name,
        description: dto.description || null,
        systemPrompt: dto.systemPrompt || null,
        userPrompt: dto.userPrompt,
        currentVersion: 1,
        status: dto.status || 'DRAFT',
        tags: JSON.stringify(dto.tags || []),
        modelCompatibility: JSON.stringify(dto.modelCompatibility || ['gpt-4o', 'claude-3-5-sonnet']),
        temperature: dto.temperature ?? 0.7,
        maxTokens: dto.maxTokens ?? 4096,
        createdBy: userId,
        variables: {
          create: variablesData,
        },
        versions: {
          create: {
            versionNumber: 1,
            systemPrompt: dto.systemPrompt || null,
            userPrompt: dto.userPrompt,
            variablesJson: JSON.stringify(variablesData),
            temperature: dto.temperature ?? 0.7,
            maxTokens: dto.maxTokens ?? 4096,
            changeSummary: 'Initial version created',
            createdBy: userId,
          },
        },
      },
      include: {
        category: true,
        variables: true,
        versions: true,
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'PROMPT_CREATED',
      module: 'AI_PLATFORM',
      entityType: 'PROMPT_TEMPLATE',
      entityId: template.id,
      metadata: { name: template.name, status: template.status },
    });

    return this.formatPrompt(template);
  }

  async findAll(orgId: string, query?: { search?: string; status?: string; categoryId?: string }) {
    const where: any = { organizationId: orgId, isDeleted: false };

    if (query?.status) where.status = query.status;
    if (query?.categoryId) where.categoryId = query.categoryId;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
        { userPrompt: { contains: query.search } },
      ];
    }

    const templates = await (this.prisma as any).promptTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        category: true,
        variables: true,
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return templates.map((t: any) => this.formatPrompt(t));
  }

  async findOne(id: string, orgId: string) {
    const template = await (this.prisma as any).promptTemplate.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
      include: {
        category: true,
        variables: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { creator: { select: { id: true, firstName: true, lastName: true } } },
        },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        updater: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!template) throw new NotFoundException('Prompt template not found');
    return this.formatPrompt(template);
  }

  async update(id: string, userId: string, orgId: string, dto: UpdatePromptDto) {
    const existing = await (this.prisma as any).promptTemplate.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
      include: { variables: true },
    });

    if (!existing) throw new NotFoundException('Prompt template not found');

    const newVersionNumber = existing.currentVersion + 1;

    const newSystemPrompt = dto.systemPrompt !== undefined ? dto.systemPrompt : existing.systemPrompt;
    const newUserPrompt = dto.userPrompt !== undefined ? dto.userPrompt : existing.userPrompt;

    const extractedVarNames = new Set([
      ...this.extractPlaceholders(newSystemPrompt),
      ...this.extractPlaceholders(newUserPrompt),
    ]);

    const finalVariablesMap = new Map<string, any>();
    extractedVarNames.forEach((varName) => {
      finalVariablesMap.set(varName, {
        name: varName,
        description: `Auto-extracted placeholder {{${varName}}}`,
        required: true,
        defaultValue: null,
        type: 'STRING',
      });
    });

    if (dto.variables) {
      dto.variables.forEach((v) => {
        finalVariablesMap.set(v.name, {
          name: v.name,
          description: v.description || null,
          required: v.required !== undefined ? v.required : true,
          defaultValue: v.defaultValue || null,
          type: v.type || 'STRING',
        });
      });
    }

    const variablesData = Array.from(finalVariablesMap.values());

    await (this.prisma as any).promptVariable.deleteMany({ where: { templateId: id } });

    const updated = await (this.prisma as any).promptTemplate.update({
      where: { id },
      data: {
        categoryId: dto.categoryId !== undefined ? dto.categoryId : existing.categoryId,
        name: dto.name || existing.name,
        description: dto.description !== undefined ? dto.description : existing.description,
        systemPrompt: newSystemPrompt,
        userPrompt: newUserPrompt,
        currentVersion: newVersionNumber,
        status: dto.status || existing.status,
        tags: dto.tags ? JSON.stringify(dto.tags) : existing.tags,
        modelCompatibility: dto.modelCompatibility ? JSON.stringify(dto.modelCompatibility) : existing.modelCompatibility,
        temperature: dto.temperature !== undefined ? dto.temperature : existing.temperature,
        maxTokens: dto.maxTokens !== undefined ? dto.maxTokens : existing.maxTokens,
        updatedBy: userId,
        variables: {
          create: variablesData,
        },
        versions: {
          create: {
            versionNumber: newVersionNumber,
            systemPrompt: newSystemPrompt,
            userPrompt: newUserPrompt,
            variablesJson: JSON.stringify(variablesData),
            temperature: dto.temperature !== undefined ? dto.temperature : existing.temperature,
            maxTokens: dto.maxTokens !== undefined ? dto.maxTokens : existing.maxTokens,
            changeSummary: dto.changeSummary || `Updated to version ${newVersionNumber}`,
            createdBy: userId,
          },
        },
      },
      include: {
        category: true,
        variables: true,
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'PROMPT_UPDATED',
      module: 'AI_PLATFORM',
      entityType: 'PROMPT_TEMPLATE',
      entityId: id,
      metadata: { name: updated.name, version: newVersionNumber },
    });

    return this.formatPrompt(updated);
  }

  async remove(id: string, userId: string, orgId: string) {
    const existing = await this.findOne(id, orgId);

    await (this.prisma as any).promptTemplate.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedBy: userId,
        status: 'ARCHIVED',
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'PROMPT_DELETED',
      module: 'AI_PLATFORM',
      entityType: 'PROMPT_TEMPLATE',
      entityId: id,
      metadata: { name: existing.name },
    });

    return { success: true, message: 'Prompt template archived' };
  }

  async getVersions(id: string, orgId: string) {
    await this.findOne(id, orgId);
    return (this.prisma as any).promptVersion.findMany({
      where: { templateId: id },
      orderBy: { versionNumber: 'desc' },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async restoreVersion(id: string, versionId: string, userId: string, orgId: string) {
    const targetVersion = await (this.prisma as any).promptVersion.findFirst({
      where: { id: versionId, templateId: id },
    });

    if (!targetVersion) throw new NotFoundException('Prompt version not found');

    let restoredVars: any[] = [];
    try {
      restoredVars = JSON.parse(targetVersion.variablesJson || '[]');
    } catch (e) {
      restoredVars = [];
    }

    return this.update(id, userId, orgId, {
      systemPrompt: targetVersion.systemPrompt,
      userPrompt: targetVersion.userPrompt,
      temperature: targetVersion.temperature,
      maxTokens: targetVersion.maxTokens,
      variables: restoredVars,
      changeSummary: `Restored from version ${targetVersion.versionNumber}`,
    });
  }

  async duplicate(id: string, userId: string, orgId: string) {
    const original = await this.findOne(id, orgId);
    return this.create(userId, orgId, {
      name: `${original.name} (Copy)`,
      description: original.description,
      categoryId: original.categoryId,
      systemPrompt: original.systemPrompt,
      userPrompt: original.userPrompt,
      status: 'DRAFT',
      tags: original.tags,
      modelCompatibility: original.modelCompatibility,
      temperature: original.temperature,
      maxTokens: original.maxTokens,
      variables: original.variables,
    });
  }

  async preview(dto: PreviewPromptDto) {
    const variablesInput = dto.variables || {};
    let compiledSystemPrompt = dto.systemPrompt || '';
    let compiledUserPrompt = dto.userPrompt || '';

    const placeholders = new Set([
      ...this.extractPlaceholders(dto.systemPrompt),
      ...this.extractPlaceholders(dto.userPrompt),
    ]);

    const missingVariables: string[] = [];

    placeholders.forEach((varName) => {
      const val = variablesInput[varName];
      if (val === undefined || val === null || val === '') {
        missingVariables.push(varName);
      }
      const replacement = val !== undefined && val !== null ? String(val) : `[MISSING: {{${varName}}}]`;
      compiledSystemPrompt = compiledSystemPrompt.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), replacement);
      compiledUserPrompt = compiledUserPrompt.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), replacement);
    });

    return {
      compiledSystemPrompt,
      compiledUserPrompt,
      placeholdersDetected: Array.from(placeholders),
      missingVariables,
      isFullyResolved: missingVariables.length === 0,
    };
  }

  // Category CRUD
  async createCategory(userId: string, orgId: string, dto: CreateCategoryDto) {
    return (this.prisma as any).promptCategory.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        description: dto.description || null,
      },
    });
  }

  async getCategories(orgId: string) {
    return (this.prisma as any).promptCategory.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { templates: true } },
      },
    });
  }

  private formatPrompt(template: any) {
    if (!template) return null;
    let tags = [];
    let modelCompatibility = [];
    try {
      tags = typeof template.tags === 'string' ? JSON.parse(template.tags) : template.tags || [];
    } catch (e) {
      tags = [];
    }
    try {
      modelCompatibility = typeof template.modelCompatibility === 'string' ? JSON.parse(template.modelCompatibility) : template.modelCompatibility || [];
    } catch (e) {
      modelCompatibility = [];
    }

    return {
      ...template,
      tags,
      modelCompatibility,
    };
  }
}
