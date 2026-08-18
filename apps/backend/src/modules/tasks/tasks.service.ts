import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkflowsExecutionService } from '../workflows/workflows-execution.service';
import { Role } from '../../common/roles';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
    private notificationsService: NotificationsService,
    private workflowsExecutionService: WorkflowsExecutionService,
  ) {}

  private async resolveOrgId(orgIdOrSlug: string): Promise<string> {
    const org = await this.prisma.organization.findFirst({
      where: { OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }] },
      select: { id: true },
    });
    return org ? org.id : orgIdOrSlug;
  }

  async create(orgId: string, userId: string, data: any) {
    const realOrgId = await this.resolveOrgId(orgId);
    const project = await this.prisma.project.findFirst({
      where: { id: data.projectId, organizationId: realOrgId, isDeleted: false },
    });
    if (!project) throw new NotFoundException('Project not found in this organization');

    const task = await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        status: data.status || 'TODO',
        priority: data.priority || 'MEDIUM',
        labels: data.labels || null,
        tags: data.tags || null,
        estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        projectId: data.projectId,
        milestoneId: data.milestoneId || null,
        reporterId: data.reporterId || userId,
        organizationId: realOrgId,
        createdById: userId,
        updatedBy: userId,
      },
      include: {
        project: { select: { id: true, projectName: true, projectCode: true } },
        milestone: { select: { id: true, title: true } },
        reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignees: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });

    // Add assignees
    if (data.assigneeIds && Array.isArray(data.assigneeIds) && data.assigneeIds.length > 0) {
      await this.prisma.taskAssignee.createMany({
        data: data.assigneeIds.map((uid: string) => ({ taskId: task.id, userId: uid })),
      });
    }

    // Create checklists
    if (data.checklists && Array.isArray(data.checklists) && data.checklists.length > 0) {
      for (const cl of data.checklists) {
        const checklist = await this.prisma.taskChecklist.create({
          data: { taskId: task.id, title: cl.title },
        });
        if (cl.items && Array.isArray(cl.items) && cl.items.length > 0) {
          await this.prisma.taskChecklistItem.createMany({
            data: cl.items.map((item: string, idx: number) => ({
              checklistId: checklist.id,
              title: item,
              sortOrder: idx,
            })),
          });
        }
      }
    }

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'TASK_CREATED',
      module: 'TASKS',
      entityType: 'TASK',
      entityId: task.id,
      metadata: { title: task.title, priority: task.priority },
    });

    this.workflowsExecutionService.handleTrigger({
      type: 'TASK_CREATED',
      organizationId: realOrgId,
      userId,
      entityType: 'TASK',
      entityId: task.id,
      entityData: task,
    }).catch(() => null);

    return task;
  }

  async findAll(
    orgId: string,
    query: {
      search?: string;
      status?: string;
      priority?: string;
      projectId?: string;
      milestoneId?: string;
      assigneeId?: string;
      reporterId?: string;
      label?: string;
      sortBy?: string;
      sortOrder?: string;
      page?: number;
      limit?: number;
    } = {},
    user?: { id: string; role: string },
  ) {
    const realOrgId = await this.resolveOrgId(orgId);
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { organizationId: realOrgId, isDeleted: false };

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.projectId) where.projectId = query.projectId;
    if (query.milestoneId) where.milestoneId = query.milestoneId;
    if (query.reporterId) where.reporterId = query.reporterId;
    if (query.label) where.labels = { contains: query.label, mode: 'insensitive' };

    if (query.assigneeId) {
      where.assignees = { some: { userId: query.assigneeId } };
    }

    // RBAC client scoping
    if (user?.role === Role.CLIENT) {
      const clientRecord = await this.prisma.client.findFirst({
        where: { organizationId: realOrgId, OR: [{ id: user.id }, { companyId: user.id }] },
      });
      if (clientRecord) {
        where.project = { OR: [{ clientId: clientRecord.id }, { companyId: clientRecord.companyId }] };
      } else {
        where.createdById = user.id;
      }
    }

    if (query.search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { labels: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    const orderBy: any = {};
    if (query.sortBy === 'title') {
      orderBy.title = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (query.sortBy === 'priority') {
      orderBy.priority = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (query.sortBy === 'dueDate') {
      orderBy.dueDate = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where, skip, take: limit, orderBy,
        include: {
          project: { select: { id: true, projectName: true, projectCode: true } },
          milestone: { select: { id: true, title: true } },
          reporter: { select: { id: true, firstName: true, lastName: true } },
          assignees: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
          _count: { select: { comments: true, attachments: true, checklists: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(orgId: string, taskId: string, user?: { id: string; role: string }) {
    const realOrgId = await this.resolveOrgId(orgId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: realOrgId, isDeleted: false },
      include: {
        project: { select: { id: true, projectName: true, projectCode: true, clientId: true, companyId: true } },
        milestone: { select: { id: true, title: true, status: true } },
        reporter: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignees: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } } },
        },
        comments: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        checklists: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
        },
        parentDependencies: {
          include: { dependsOn: { select: { id: true, title: true, status: true } } },
        },
        childDependencies: {
          include: { task: { select: { id: true, title: true, status: true } } },
        },
      },
    });

    if (!task) throw new NotFoundException('Task not found');

    if (user?.role === Role.CLIENT) {
      const clientRecord = await this.prisma.client.findFirst({
        where: { organizationId: realOrgId, OR: [{ id: user.id }, { companyId: user.id }] },
      });
      if (clientRecord && task.project?.clientId !== clientRecord.id && task.project?.companyId !== clientRecord.companyId && task.createdById !== user.id) {
        throw new ForbiddenException('You do not have permission to view this task');
      }
    }

    return task;
  }

  async update(orgId: string, taskId: string, userId: string, data: any, userRole?: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const existing = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: realOrgId, isDeleted: false },
      include: { assignees: true },
    });
    if (!existing) throw new NotFoundException('Task not found');

    if (userRole === Role.CLIENT) {
      throw new ForbiddenException('Clients cannot edit internal tasks');
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'DONE') updateData.completedAt = new Date();
      else if (existing.status === 'DONE' && data.status !== 'DONE') updateData.completedAt = null;
    }
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.labels !== undefined) updateData.labels = data.labels;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.estimatedHours !== undefined) updateData.estimatedHours = data.estimatedHours ? parseFloat(data.estimatedHours) : null;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.milestoneId !== undefined) updateData.milestoneId = data.milestoneId || null;
    if (data.reporterId !== undefined) updateData.reporterId = data.reporterId;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    updateData.updatedBy = userId;

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        project: { select: { id: true, projectName: true, projectCode: true } },
        milestone: { select: { id: true, title: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
        assignees: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });

    // Update assignees if provided
    if (data.assigneeIds !== undefined && Array.isArray(data.assigneeIds)) {
      await this.prisma.taskAssignee.deleteMany({ where: { taskId } });
      if (data.assigneeIds.length > 0) {
        await this.prisma.taskAssignee.createMany({
          data: data.assigneeIds.map((uid: string) => ({ taskId, userId: uid })),
        });
      }
    }

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'TASK_UPDATED',
      module: 'TASKS',
      entityType: 'TASK',
      entityId: taskId,
      metadata: { title: existing.title },
    });

    return task;
  }

  async updateStatus(orgId: string, taskId: string, userId: string, status: string, userRole?: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const existing = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: realOrgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Task not found');

    if (userRole === Role.CLIENT) {
      throw new ForbiddenException('Clients cannot change task status');
    }

    const updateData: any = { status, updatedBy: userId };
    if (status === 'DONE') updateData.completedAt = new Date();
    else if (existing.status === 'DONE' && status !== 'DONE') updateData.completedAt = null;

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        project: { select: { id: true, projectName: true, projectCode: true } },
        assignees: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'TASK_STATUS_CHANGED',
      module: 'TASKS',
      entityType: 'TASK',
      entityId: taskId,
      metadata: { title: existing.title, from: existing.status, to: status },
    });

    if (status === 'DONE') {
      this.workflowsExecutionService.handleTrigger({
        type: 'TASK_COMPLETED',
        organizationId: realOrgId,
        userId,
        entityType: 'TASK',
        entityId: taskId,
        entityData: task,
      }).catch(() => null);
    }

    // Notify assignees
    for (const assignee of task.assignees) {
      if (assignee.userId !== userId) {
        try {
          await this.notificationsService.createNotification({
            userId: assignee.userId,
            organizationId: realOrgId,
            title: 'Task Status Updated',
            message: `Task "${task.title}" moved to ${status.replace(/_/g, ' ')}`,
            category: 'TASKS',
            priority: 'LOW',
            linkUrl: `/projects/tasks/${taskId}`,
          });
        } catch {}
      }
    }

    return task;
  }

  async remove(orgId: string, taskId: string, userId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const existing = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: realOrgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Task not found');

    await this.prisma.task.update({
      where: { id: taskId },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: userId },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'TASK_DELETED',
      module: 'TASKS',
      entityType: 'TASK',
      entityId: taskId,
      metadata: { title: existing.title },
    });

    return { success: true };
  }

  // --- Comments ---
  async addComment(orgId: string, taskId: string, userId: string, data: { content: string }) {
    const realOrgId = await this.resolveOrgId(orgId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: realOrgId, isDeleted: false },
    });
    if (!task) throw new NotFoundException('Task not found');

    const comment = await this.prisma.taskComment.create({
      data: { taskId, content: data.content, userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } } },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'TASK_COMMENT_ADDED',
      module: 'TASKS',
      entityType: 'TASK',
      entityId: taskId,
      metadata: { title: task.title },
    });

    return comment;
  }

  async removeComment(orgId: string, taskId: string, commentId: string, userId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: realOrgId, isDeleted: false },
    });
    if (!task) throw new NotFoundException('Task not found');

    await this.prisma.taskComment.deleteMany({ where: { id: commentId, taskId } });
    return { success: true };
  }

  // --- Checklists ---
  async addChecklist(orgId: string, taskId: string, userId: string, data: { title: string; items?: string[] }) {
    const realOrgId = await this.resolveOrgId(orgId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: realOrgId, isDeleted: false },
    });
    if (!task) throw new NotFoundException('Task not found');

    const checklist = await this.prisma.taskChecklist.create({
      data: { taskId, title: data.title },
    });

    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      await this.prisma.taskChecklistItem.createMany({
        data: data.items.map((item, idx) => ({ checklistId: checklist.id, title: item, sortOrder: idx })),
      });
    }

    return this.prisma.taskChecklist.findUnique({
      where: { id: checklist.id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async updateChecklistItem(orgId: string, taskId: string, itemId: string, userId: string, data: { isCompleted: boolean }) {
    const realOrgId = await this.resolveOrgId(orgId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: realOrgId, isDeleted: false },
    });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: { isCompleted: data.isCompleted },
    });
  }

  async removeChecklist(orgId: string, taskId: string, checklistId: string, userId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: realOrgId, isDeleted: false },
    });
    if (!task) throw new NotFoundException('Task not found');

    await this.prisma.taskChecklist.deleteMany({ where: { id: checklistId, taskId } });
    return { success: true };
  }

  // --- Dependencies ---
  async addDependency(orgId: string, taskId: string, userId: string, data: { dependsOnId: string }) {
    const realOrgId = await this.resolveOrgId(orgId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: realOrgId, isDeleted: false },
    });
    if (!task) throw new NotFoundException('Task not found');

    const dependsOn = await this.prisma.task.findFirst({
      where: { id: data.dependsOnId, organizationId: realOrgId, isDeleted: false },
    });
    if (!dependsOn) throw new NotFoundException('Dependency task not found');

    if (taskId === data.dependsOnId) throw new BadRequestException('Task cannot depend on itself');

    return this.prisma.taskDependency.create({
      data: { taskId, dependsOnId: data.dependsOnId },
      include: { dependsOn: { select: { id: true, title: true, status: true } } },
    });
  }

  async removeDependency(orgId: string, taskId: string, dependencyId: string, userId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: realOrgId, isDeleted: false },
    });
    if (!task) throw new NotFoundException('Task not found');

    await this.prisma.taskDependency.deleteMany({ where: { id: dependencyId } });
    return { success: true };
  }

  // --- Stats ---
  async getStats(orgId: string, projectId?: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const baseWhere: any = { organizationId: realOrgId, isDeleted: false };
    if (projectId && projectId !== 'all') Object.assign(baseWhere, { projectId });

    const now = new Date();

    const [total, byStatus, byPriority, overdueCount, completedCount] = await Promise.all([
      this.prisma.task.count({ where: baseWhere }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
      }),
      this.prisma.task.groupBy({
        by: ['priority'],
        where: baseWhere,
        _count: true,
      }),
      this.prisma.task.count({
        where: { ...baseWhere, dueDate: { lt: now }, status: { notIn: ['DONE'] } },
      }),
      this.prisma.task.count({
        where: { ...baseWhere, status: 'DONE' },
      }),
    ]);

    return {
      total,
      completed: completedCount,
      overdue: overdueCount,
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.status]: item._count }), {}),
      byPriority: byPriority.reduce((acc, item) => ({ ...acc, [item.priority]: item._count }), {}),
    };
  }

  // --- Kanban ---
  async getKanbanBoard(orgId: string, projectId?: string, user?: { id: string; role: string }) {
    const realOrgId = await this.resolveOrgId(orgId);
    const where: any = { organizationId: realOrgId, isDeleted: false };
    if (projectId && projectId !== 'all') {
      where.projectId = projectId;
    }

    if (user?.role === Role.CLIENT) {
      const clientRecord = await this.prisma.client.findFirst({
        where: { organizationId: realOrgId, OR: [{ id: user.id }, { companyId: user.id }] },
      });
      if (clientRecord) {
        where.project = { OR: [{ clientId: clientRecord.id }, { companyId: clientRecord.companyId }] };
      } else {
        where.createdById = user.id;
      }
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, projectName: true, projectCode: true } },
        milestone: { select: { id: true, title: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
        assignees: {
          include: { user: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } } },
        },
        _count: { select: { comments: true, checklists: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const columns = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];
    const board: Record<string, any[]> = {};
    for (const col of columns) {
      board[col] = [];
    }

    for (const task of tasks) {
      if (board[task.status]) {
        board[task.status].push(task);
      } else {
        // Handle unexpected status fallback into TODO
        board['TODO'].push(task);
      }
    }

    return board;
  }
}
