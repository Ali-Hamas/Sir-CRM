import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkflowsExecutionService } from '../workflows/workflows-execution.service';
import { Role } from '../../common/roles';

@Injectable()
export class ProjectsService {
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

  private async generateProjectCode(realOrgId: string) {
    const count = await this.prisma.project.count({ where: { organizationId: realOrgId } });
    const num = (count + 1).toString().padStart(4, '0');
    return `PRJ-${num}`;
  }

  async create(orgId: string, userId: string, data: any) {
    const realOrgId = await this.resolveOrgId(orgId);
    const projectCode = await this.generateProjectCode(realOrgId);

    const startDate = data.startDate ? new Date(data.startDate) : null;
    const endDate = data.endDate ? new Date(data.endDate) : null;
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    const progress = Math.min(100, Math.max(0, parseInt(data.progress, 10) || 0));

    const project = await this.prisma.project.create({
      data: {
        projectName: data.projectName,
        projectCode,
        description: data.description || null,
        status: data.status || 'PLANNING',
        priority: data.priority || 'MEDIUM',
        budget: data.budget ? parseFloat(data.budget) : null,
        currency: data.currency || 'USD',
        startDate,
        endDate,
        progress,
        clientId: data.clientId || null,
        companyId: data.companyId || null,
        contractId: data.contractId || null,
        projectManagerId: data.projectManagerId || null,
        organizationId: realOrgId,
        workspaceId: data.workspaceId || null,
        createdById: userId,
        updatedBy: userId,
      },
      include: {
        company: { select: { id: true, name: true } },
        client: { select: { id: true, companyName: true } },
        contract: { select: { id: true, title: true, contractNumber: true } },
        projectManager: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Add initial team members
    if (data.teamMemberIds && Array.isArray(data.teamMemberIds) && data.teamMemberIds.length > 0) {
      await this.prisma.projectMember.createMany({
        data: data.teamMemberIds.map((uid: string) => ({
          projectId: project.id,
          userId: uid,
          role: 'MEMBER',
          createdBy: userId,
        })),
      });
    }

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'PROJECT_CREATED',
      module: 'PROJECTS',
      entityType: 'PROJECT',
      entityId: project.id,
      metadata: { code: projectCode, name: project.projectName },
    });

    this.workflowsExecutionService.handleTrigger({
      type: 'PROJECT_CREATED',
      organizationId: realOrgId,
      userId,
      entityType: 'PROJECT',
      entityId: project.id,
      entityData: project,
    }).catch(() => null);

    return project;
  }

  async findAll(
    orgId: string,
    query: {
      search?: string;
      status?: string;
      priority?: string;
      companyId?: string;
      projectManagerId?: string;
      workspaceId?: string;
      sortBy?: string;
      sortOrder?: string;
      page?: number;
      limit?: number;
    } = {},
    user?: { id: string; role: string },
  ) {
    const realOrgId = await this.resolveOrgId(orgId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { organizationId: realOrgId, isDeleted: false };

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.companyId) where.companyId = query.companyId;
    if (query.projectManagerId) where.projectManagerId = query.projectManagerId;
    if (query.workspaceId) where.workspaceId = query.workspaceId;

    // RBAC client restriction
    if (user?.role === Role.CLIENT) {
      const clientRecord = await this.prisma.client.findFirst({
        where: { organizationId: realOrgId, OR: [{ id: user.id }, { companyId: user.id }] },
      });
      if (clientRecord) {
        where.OR = [{ clientId: clientRecord.id }, { companyId: clientRecord.companyId }];
      } else {
        where.createdById = user.id;
      }
    }

    if (query.search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { projectName: { contains: query.search, mode: 'insensitive' } },
          { projectCode: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    const orderBy: any = {};
    if (query.sortBy === 'projectName') {
      orderBy.projectName = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (query.sortBy === 'priority') {
      orderBy.priority = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (query.sortBy === 'progress') {
      orderBy.progress = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where, skip, take: limit, orderBy,
        include: {
          company: { select: { id: true, name: true } },
          client: { select: { id: true, companyName: true } },
          contract: { select: { id: true, title: true } },
          projectManager: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { members: true, phases: true, milestones: true, tasks: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(orgId: string, projectId: string, user?: { id: string; role: string }) {
    const realOrgId = await this.resolveOrgId(orgId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: realOrgId, isDeleted: false },
      include: {
        company: { select: { id: true, name: true, industry: true } },
        client: { select: { id: true, companyName: true, status: true } },
        contract: { select: { id: true, title: true, contractNumber: true, contractValue: true } },
        projectManager: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
        phases: { orderBy: { sortOrder: 'asc' } },
        milestones: { orderBy: { createdAt: 'asc' } },
        activities: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    if (user?.role === Role.CLIENT) {
      const clientRecord = await this.prisma.client.findFirst({
        where: { organizationId: realOrgId, OR: [{ id: user.id }, { companyId: user.id }] },
      });
      if (clientRecord && project.clientId !== clientRecord.id && project.companyId !== clientRecord.companyId && project.createdById !== user.id) {
        throw new ForbiddenException('You do not have permission to view this project');
      }
    }

    return project;
  }

  async update(orgId: string, projectId: string, userId: string, data: any) {
    const realOrgId = await this.resolveOrgId(orgId);
    const existing = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: realOrgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Project not found');

    const updateData: any = {};
    if (data.projectName !== undefined) updateData.projectName = data.projectName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.budget !== undefined) updateData.budget = data.budget ? parseFloat(data.budget) : null;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.progress !== undefined) updateData.progress = Math.min(100, Math.max(0, parseInt(data.progress, 10) || 0));
    if (data.clientId !== undefined) updateData.clientId = data.clientId || null;
    if (data.companyId !== undefined) updateData.companyId = data.companyId || null;
    if (data.contractId !== undefined) updateData.contractId = data.contractId || null;
    if (data.projectManagerId !== undefined) updateData.projectManagerId = data.projectManagerId || null;
    if (data.workspaceId !== undefined) updateData.workspaceId = data.workspaceId || null;

    updateData.updatedBy = userId;

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    if (data.status === 'COMPLETED') {
      this.workflowsExecutionService.handleTrigger({
        type: 'PROJECT_COMPLETED',
        organizationId: realOrgId,
        userId,
        entityType: 'PROJECT',
        entityId: projectId,
        entityData: updated,
      }).catch(() => null);
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        company: { select: { id: true, name: true } },
        client: { select: { id: true, companyName: true } },
        contract: { select: { id: true, title: true, contractNumber: true } },
        projectManager: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'PROJECT_UPDATED',
      module: 'PROJECTS',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: { code: existing.projectCode, name: project?.projectName || existing.projectName },
    });

    return project;
  }

  async remove(orgId: string, projectId: string, userId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const existing = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: realOrgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Project not found');

    await this.prisma.project.update({
      where: { id: projectId },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: userId },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'PROJECT_DELETED',
      module: 'PROJECTS',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: { code: existing.projectCode, name: existing.projectName },
    });

    return { success: true };
  }

  // --- Members ---
  async addMember(orgId: string, projectId: string, userId: string, data: { memberId: string; role?: string }) {
    const realOrgId = await this.resolveOrgId(orgId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: realOrgId, isDeleted: false },
    });
    if (!project) throw new NotFoundException('Project not found');

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: data.memberId } },
    });
    if (existing) throw new BadRequestException('User is already a member of this project');

    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: data.memberId,
        role: data.role || 'MEMBER',
        createdBy: userId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'PROJECT_MEMBER_ADDED',
      module: 'PROJECTS',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: { memberId: data.memberId, role: data.role || 'MEMBER' },
    });

    return member;
  }

  async removeMember(orgId: string, projectId: string, userId: string, memberId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: realOrgId, isDeleted: false },
    });
    if (!project) throw new NotFoundException('Project not found');

    await this.prisma.projectMember.deleteMany({
      where: { projectId, userId: memberId },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'PROJECT_MEMBER_REMOVED',
      module: 'PROJECTS',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: { memberId },
    });

    return { success: true };
  }

  // --- Phases ---
  async addPhase(orgId: string, projectId: string, userId: string, data: any) {
    const realOrgId = await this.resolveOrgId(orgId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: realOrgId, isDeleted: false },
    });
    if (!project) throw new NotFoundException('Project not found');

    const phase = await this.prisma.projectPhase.create({
      data: {
        projectId,
        name: data.name,
        description: data.description || null,
        status: data.status || 'PENDING',
        sortOrder: data.sortOrder ?? 0,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdBy: userId,
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'PROJECT_PHASE_ADDED',
      module: 'PROJECTS',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: { phaseName: phase.name },
    });

    return phase;
  }

  async updatePhase(orgId: string, projectId: string, phaseId: string, userId: string, data: any) {
    const realOrgId = await this.resolveOrgId(orgId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: realOrgId, isDeleted: false },
    });
    if (!project) throw new NotFoundException('Project not found');

    const existing = await this.prisma.projectPhase.findFirst({
      where: { id: phaseId, projectId },
    });
    if (!existing) throw new NotFoundException('Phase not found');

    const phase = await this.prisma.projectPhase.update({
      where: { id: phaseId },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        description: data.description !== undefined ? data.description : undefined,
        status: data.status !== undefined ? data.status : undefined,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : undefined,
        startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
        endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
      },
    });

    return phase;
  }

  async removePhase(orgId: string, projectId: string, phaseId: string, userId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: realOrgId, isDeleted: false },
    });
    if (!project) throw new NotFoundException('Project not found');

    await this.prisma.projectPhase.deleteMany({
      where: { id: phaseId, projectId },
    });

    return { success: true };
  }

  // --- Milestones ---
  async addMilestone(orgId: string, projectId: string, userId: string, data: any) {
    const realOrgId = await this.resolveOrgId(orgId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: realOrgId, isDeleted: false },
    });
    if (!project) throw new NotFoundException('Project not found');

    const milestone = await this.prisma.milestone.create({
      data: {
        projectId,
        title: data.title,
        description: data.description || null,
        status: data.status || 'PENDING',
        priority: data.priority || 'MEDIUM',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdBy: userId,
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'PROJECT_MILESTONE_ADDED',
      module: 'PROJECTS',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: { milestoneTitle: milestone.title },
    });

    return milestone;
  }

  async updateMilestone(orgId: string, projectId: string, milestoneId: string, userId: string, data: any) {
    const realOrgId = await this.resolveOrgId(orgId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: realOrgId, isDeleted: false },
    });
    if (!project) throw new NotFoundException('Project not found');

    const existing = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });
    if (!existing) throw new NotFoundException('Milestone not found');

    const milestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        description: data.description !== undefined ? data.description : undefined,
        status: data.status !== undefined ? data.status : undefined,
        priority: data.priority !== undefined ? data.priority : undefined,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
      },
    });

    return milestone;
  }

  async removeMilestone(orgId: string, projectId: string, milestoneId: string, userId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: realOrgId, isDeleted: false },
    });
    if (!project) throw new NotFoundException('Project not found');

    await this.prisma.milestone.deleteMany({
      where: { id: milestoneId, projectId },
    });

    return { success: true };
  }

  // --- Dashboard Stats ---
  async getStats(orgId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const [total, byStatus, byPriority, totalBudget, completedCount] = await Promise.all([
      this.prisma.project.count({ where: { organizationId: realOrgId, isDeleted: false } }),
      this.prisma.project.groupBy({
        by: ['status'],
        where: { organizationId: realOrgId, isDeleted: false },
        _count: true,
      }),
      this.prisma.project.groupBy({
        by: ['priority'],
        where: { organizationId: realOrgId, isDeleted: false },
        _count: true,
      }),
      this.prisma.project.aggregate({
        where: { organizationId: realOrgId, isDeleted: false, budget: { not: null } },
        _sum: { budget: true },
      }),
      this.prisma.project.count({
        where: { organizationId: realOrgId, isDeleted: false, status: 'COMPLETED' },
      }),
    ]);

    return {
      total,
      completed: completedCount,
      totalBudget: totalBudget._sum.budget || 0,
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.status]: item._count }), {}),
      byPriority: byPriority.reduce((acc, item) => ({ ...acc, [item.priority]: item._count }), {}),
    };
  }

  // --- Create from Contract ---
  async createFromContract(orgId: string, contractId: string, userId: string, data?: any) {
    const realOrgId = await this.resolveOrgId(orgId);
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, organizationId: realOrgId, isDeleted: false },
      include: { company: true, contact: true },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.status !== 'ACTIVE') throw new BadRequestException('Only active contracts can have projects');

    const projectCode = await this.generateProjectCode(realOrgId);

    const project = await this.prisma.project.create({
      data: {
        projectName: data?.projectName || `${contract.title} Project`,
        projectCode,
        description: data?.description || `Project created from contract ${contract.contractNumber}`,
        status: 'PLANNING',
        priority: data?.priority || 'MEDIUM',
        budget: contract.contractValue,
        currency: contract.currency,
        startDate: contract.startDate,
        endDate: contract.endDate,
        companyId: contract.companyId,
        clientId: null,
        contractId: contract.id,
        projectManagerId: userId,
        organizationId: realOrgId,
        workspaceId: contract.workspaceId,
        createdById: userId,
        updatedBy: userId,
      },
      include: {
        company: { select: { id: true, name: true } },
        contract: { select: { id: true, title: true, contractNumber: true } },
        projectManager: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Find client if exists
    if (contract.companyId) {
      const client = await this.prisma.client.findUnique({ where: { companyId: contract.companyId } });
      if (client) {
        await this.prisma.project.update({
          where: { id: project.id },
          data: { clientId: client.id },
        });
      }
    }

    await this.activityService.logActivity({
      userId,
      organizationId: realOrgId,
      action: 'PROJECT_CREATED_FROM_CONTRACT',
      module: 'PROJECTS',
      entityType: 'PROJECT',
      entityId: project.id,
      metadata: { contractId, contractNumber: contract.contractNumber },
    });

    return project;
  }
}
