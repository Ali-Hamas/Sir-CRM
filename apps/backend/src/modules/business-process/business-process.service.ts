import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateBusinessProcessDto } from './dto/create-business-process.dto';
import { UpdateBusinessProcessDto } from './dto/update-business-process.dto';

@Injectable()
export class BusinessProcessService {
  constructor(private prisma: PrismaService) {}

  private async resolveOrg(idOrSlug: string) {
    const org = await this.prisma.organization.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], isDeleted: false },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async create(orgIdOrSlug: string, dto: CreateBusinessProcessDto) {
    const org = await this.resolveOrg(orgIdOrSlug);
    return this.prisma.businessProcess.create({
      data: {
        organizationId: org.id,
        workspaceId: dto.workspaceId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        priority: dto.priority,
        estimatedDuration: dto.estimatedDuration,
        icon: dto.icon,
        color: dto.color,
        tags: dto.tags ? JSON.stringify(dto.tags) : undefined,
        templateId: dto.templateId,
        status: 'DRAFT',
      },
    });
  }

  async findAll(orgIdOrSlug: string, category?: string, status?: string, limit = 20, skip = 0) {
    const org = await this.resolveOrg(orgIdOrSlug);
    const where: any = { organizationId: org.id, isDeleted: false };
    if (category) where.category = category;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.businessProcess.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          _count: { select: { executions: true } },
          template: { select: { id: true, name: true } },
        },
      }),
      this.prisma.businessProcess.count({ where }),
    ]);
    return { items, total, limit, skip };
  }

  async findOne(orgIdOrSlug: string, id: string) {
    const org = await this.resolveOrg(orgIdOrSlug);
    const process = await this.prisma.businessProcess.findFirst({
      where: { id, organizationId: org.id, isDeleted: false },
      include: {
        template: true,
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { _count: { select: { steps: true, approvals: true } } },
        },
        schedules: { where: { isDeleted: false } },
      },
    });
    if (!process) throw new NotFoundException('Business process not found');
    return process;
  }

  async update(orgIdOrSlug: string, id: string, dto: UpdateBusinessProcessDto) {
    const org = await this.resolveOrg(orgIdOrSlug);
    const existing = await this.prisma.businessProcess.findFirst({
      where: { id, organizationId: org.id, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Business process not found');

    const data: any = { ...dto };
    if (dto.tags) data.tags = JSON.stringify(dto.tags);
    return this.prisma.businessProcess.update({ where: { id }, data });
  }

  async remove(orgIdOrSlug: string, id: string) {
    const org = await this.resolveOrg(orgIdOrSlug);
    const existing = await this.prisma.businessProcess.findFirst({
      where: { id, organizationId: org.id, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Business process not found');

    return this.prisma.businessProcess.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  async getStats(orgIdOrSlug: string) {
    const org = await this.resolveOrg(orgIdOrSlug);
    const [totalProcesses, activeProcesses, totalExecutions, completedExecutions, failedExecutions, pendingApprovals] =
      await Promise.all([
        this.prisma.businessProcess.count({ where: { organizationId: org.id, isDeleted: false } }),
        this.prisma.businessProcess.count({ where: { organizationId: org.id, status: 'ACTIVE', isDeleted: false } }),
        this.prisma.businessProcessExecution.count({ where: { organizationId: org.id } }),
        this.prisma.businessProcessExecution.count({ where: { organizationId: org.id, status: 'COMPLETED' } }),
        this.prisma.businessProcessExecution.count({ where: { organizationId: org.id, status: 'FAILED' } }),
        this.prisma.businessProcessApproval.count({ where: { organizationId: org.id, status: 'PENDING' } }),
      ]);

    return {
      totalProcesses,
      activeProcesses,
      totalExecutions,
      completedExecutions,
      failedExecutions,
      pendingApprovals,
      successRate: totalExecutions > 0 ? Math.round((completedExecutions / totalExecutions) * 100) : 0,
    };
  }
}
