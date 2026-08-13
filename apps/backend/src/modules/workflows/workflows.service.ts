import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/create-workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  async create(userId: string, orgId: string, dto: CreateWorkflowDto) {
    const workflow = await (this.prisma as any).workflow.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        description: dto.description,
        status: dto.status || 'DRAFT',
        createdBy: userId,
        triggers: {
          create: dto.triggers.map((t) => ({
            type: t.type,
            config: t.config || null,
          })),
        },
        conditions: dto.conditions
          ? {
              create: dto.conditions.map((c, idx) => ({
                field: c.field,
                operator: c.operator,
                value: c.value,
                stepOrder: c.stepOrder ?? idx,
              })),
            }
          : undefined,
        actions: {
          create: dto.actions.map((a, idx) => ({
            type: a.type,
            config: typeof a.config === 'object' ? JSON.stringify(a.config) : a.config,
            stepOrder: a.stepOrder ?? idx,
          })),
        },
      },
      include: {
        triggers: true,
        conditions: true,
        actions: true,
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'WORKFLOW_CREATED',
      module: 'WORKFLOWS',
      entityType: 'WORKFLOW',
      entityId: workflow.id,
      metadata: { name: workflow.name, status: workflow.status },
    });

    return workflow;
  }

  async findAll(orgId: string, query: { status?: string; search?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: orgId,
      isDeleted: false,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    const [items, total] = await Promise.all([
      (this.prisma as any).workflow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          triggers: true,
          conditions: true,
          actions: true,
          creator: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { executions: true } },
        },
      }),
      (this.prisma as any).workflow.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, orgId: string) {
    const workflow = await (this.prisma as any).workflow.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
      include: {
        triggers: true,
        conditions: { orderBy: { stepOrder: 'asc' } },
        actions: { orderBy: { stepOrder: 'asc' } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        updater: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }
    return workflow;
  }

  async update(id: string, userId: string, orgId: string, dto: UpdateWorkflowDto) {
    await this.findOne(id, orgId);

    // Perform updates in transaction
    const updated = await (this.prisma as any).$transaction(async (tx: any) => {
      if (dto.triggers) {
        await tx.workflowTrigger.deleteMany({ where: { workflowId: id } });
        await tx.workflowTrigger.createMany({
          data: dto.triggers.map((t) => ({
            workflowId: id,
            type: t.type,
            config: t.config || null,
          })),
        });
      }

      if (dto.conditions) {
        await tx.workflowCondition.deleteMany({ where: { workflowId: id } });
        await tx.workflowCondition.createMany({
          data: dto.conditions.map((c, idx) => ({
            workflowId: id,
            field: c.field,
            operator: c.operator,
            value: c.value,
            stepOrder: c.stepOrder ?? idx,
          })),
        });
      }

      if (dto.actions) {
        await tx.workflowAction.deleteMany({ where: { workflowId: id } });
        await tx.workflowAction.createMany({
          data: dto.actions.map((a, idx) => ({
            workflowId: id,
            type: a.type,
            config: typeof a.config === 'object' ? JSON.stringify(a.config) : a.config,
            stepOrder: a.stepOrder ?? idx,
          })),
        });
      }

      return tx.workflow.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          status: dto.status,
          updatedBy: userId,
        },
        include: {
          triggers: true,
          conditions: true,
          actions: true,
        },
      });
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'WORKFLOW_UPDATED',
      module: 'WORKFLOWS',
      entityType: 'WORKFLOW',
      entityId: id,
      metadata: { name: updated.name, status: updated.status },
    });

    return updated;
  }

  async remove(id: string, userId: string, orgId: string) {
    const workflow = await this.findOne(id, orgId);

    const deleted = await (this.prisma as any).workflow.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'WORKFLOW_DELETED',
      module: 'WORKFLOWS',
      entityType: 'WORKFLOW',
      entityId: id,
      metadata: { name: workflow.name },
    });

    return deleted;
  }

  async getExecutions(id: string, orgId: string, page = 1, limit = 20) {
    await this.findOne(id, orgId);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any).workflowExecution.findMany({
        where: { workflowId: id, organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          executedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      (this.prisma as any).workflowExecution.count({
        where: { workflowId: id, organizationId: orgId },
      }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDashboardStats(orgId: string) {
    const [totalWorkflows, activeWorkflows, totalExecutions, successExecutions] = await Promise.all([
      (this.prisma as any).workflow.count({ where: { organizationId: orgId, isDeleted: false } }),
      (this.prisma as any).workflow.count({ where: { organizationId: orgId, status: 'ACTIVE', isDeleted: false } }),
      (this.prisma as any).workflowExecution.count({ where: { organizationId: orgId } }),
      (this.prisma as any).workflowExecution.count({ where: { organizationId: orgId, status: 'SUCCESS' } }),
    ]);

    const successRate = totalExecutions > 0 ? Math.round((successExecutions / totalExecutions) * 100) : 100;

    return {
      totalWorkflows,
      activeWorkflows,
      totalExecutions,
      successRate,
    };
  }
}
