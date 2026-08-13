import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ActivityService } from '../../activity/activity.service';
import { CreateMemoryDto, UpdateMemoryDto, CreatePreferenceDto } from '../dto/create-memory.dto';

@Injectable()
export class AIMemoryService {
  private readonly logger = new Logger(AIMemoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  async createMemory(userId: string, orgId: string, dto: CreateMemoryDto) {
    const memory = await (this.prisma as any).aIMemory.create({
      data: {
        organizationId: orgId,
        workspaceId: dto.workspaceId || null,
        userId: dto.memoryType === 'USER' ? userId : null,
        categoryId: dto.categoryId || null,
        title: dto.title,
        memoryType: dto.memoryType,
        summary: dto.summary,
        source: dto.source,
        tags: JSON.stringify(dto.tags || []),
        importance: dto.importance ?? 5,
        isPinned: dto.isPinned || false,
        lastUsedAt: new Date(),
      },
      include: {
        category: true,
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'AI_MEMORY_CREATED',
      module: 'AI_PLATFORM',
      entityType: 'AI_MEMORY',
      entityId: memory.id,
      metadata: { title: memory.title, memoryType: memory.memoryType },
    });

    return this.formatMemory(memory);
  }

  async findAllMemories(orgId: string, query?: { search?: string; memoryType?: string; source?: string; minImportance?: number }) {
    const where: any = { organizationId: orgId, isDeleted: false };

    if (query?.memoryType) where.memoryType = query.memoryType;
    if (query?.source) where.source = query.source;
    if (query?.minImportance) where.importance = { gte: Number(query.minImportance) };
    if (query?.search) {
      where.OR = [
        { title: { contains: query.search } },
        { summary: { contains: query.search } },
        { tags: { contains: query.search } },
      ];
    }

    const memories = await (this.prisma as any).aIMemory.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { importance: 'desc' }, { createdAt: 'desc' }],
      include: {
        category: true,
      },
    });

    return memories.map((m: any) => this.formatMemory(m));
  }

  async findOneMemory(id: string, orgId: string) {
    const memory = await (this.prisma as any).aIMemory.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
      include: {
        category: true,
      },
    });

    if (!memory) throw new NotFoundException('AI Memory record not found');
    return this.formatMemory(memory);
  }

  async updateMemory(id: string, userId: string, orgId: string, dto: UpdateMemoryDto) {
    await this.findOneMemory(id, orgId);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.summary !== undefined) updateData.summary = dto.summary;
    if (dto.importance !== undefined) updateData.importance = dto.importance;
    if (dto.isPinned !== undefined) updateData.isPinned = dto.isPinned;
    if (dto.isArchived !== undefined) updateData.isArchived = dto.isArchived;
    if (dto.tags) updateData.tags = JSON.stringify(dto.tags);

    const updated = await (this.prisma as any).aIMemory.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'AI_MEMORY_UPDATED',
      module: 'AI_PLATFORM',
      entityType: 'AI_MEMORY',
      entityId: id,
      metadata: { title: updated.title },
    });

    return this.formatMemory(updated);
  }

  async removeMemory(id: string, userId: string, orgId: string) {
    await this.findOneMemory(id, orgId);

    await (this.prisma as any).aIMemory.update({
      where: { id },
      data: { isDeleted: true },
    });

    return { success: true, message: 'AI Memory archived' };
  }

  async setPreference(userId: string, orgId: string, dto: CreatePreferenceDto) {
    const existing = await (this.prisma as any).aIUserPreference.findFirst({
      where: { userId, organizationId: orgId, preferenceKey: dto.preferenceKey },
    });

    if (existing) {
      return (this.prisma as any).aIUserPreference.update({
        where: { id: existing.id },
        data: {
          preferenceValue: dto.preferenceValue,
          category: dto.category || existing.category,
        },
      });
    }

    return (this.prisma as any).aIUserPreference.create({
      data: {
        userId,
        organizationId: orgId,
        preferenceKey: dto.preferenceKey,
        preferenceValue: dto.preferenceValue,
        category: dto.category || 'GENERAL',
      },
    });
  }

  async getPreferences(userId: string, orgId: string) {
    return (this.prisma as any).aIUserPreference.findMany({
      where: { userId, organizationId: orgId },
      orderBy: { preferenceKey: 'asc' },
    });
  }

  private formatMemory(memory: any) {
    if (!memory) return null;
    let tags = [];
    try {
      tags = typeof memory.tags === 'string' ? JSON.parse(memory.tags) : memory.tags || [];
    } catch (e) {
      tags = [];
    }
    return {
      ...memory,
      tags,
    };
  }
}
