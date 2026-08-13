import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ResourceManagementService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
    private notificationsService: NotificationsService,
  ) {}

  async createAllocation(orgId: string, userId: string, data: any) {
    const project = await this.prisma.project.findFirst({
      where: { id: data.projectId, organizationId: orgId, isDeleted: false },
    });
    if (!project) throw new NotFoundException('Project not found');

    const user = await this.prisma.user.findFirst({ where: { id: data.userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.resourceAllocation.findFirst({
      where: { userId: data.userId, projectId: data.projectId, isDeleted: false },
    });
    if (existing) throw new BadRequestException('User is already allocated to this project');

    const totalAllocation = await this.prisma.resourceAllocation.aggregate({
      where: {
        userId: data.userId,
        isDeleted: false,
        startDate: { lte: new Date(data.endDate || data.startDate) },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date(data.startDate) } },
        ],
      },
      _sum: { allocationPercentage: true },
    });

    const currentTotal = totalAllocation._sum.allocationPercentage || 0;
    const newAllocation = parseFloat(data.allocationPercentage) || 100;
    if (currentTotal + newAllocation > 100) {
      throw new BadRequestException(
        `User would be overallocated. Current: ${currentTotal}%, Adding: ${newAllocation}%`,
      );
    }

    const allocation = await this.prisma.resourceAllocation.create({
      data: {
        role: data.role || null,
        allocationPercentage: newAllocation,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        capacity: data.capacity ? parseFloat(data.capacity) : null,
        notes: data.notes || null,
        userId: data.userId,
        projectId: data.projectId,
        organizationId: orgId,
        createdById: userId,
        updatedBy: userId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, projectName: true, projectCode: true } },
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'RESOURCE_ALLOCATION_CREATED',
      module: 'RESOURCE_MANAGEMENT',
      entityType: 'RESOURCE_ALLOCATION',
      entityId: allocation.id,
      metadata: { user: `${user.firstName} ${user.lastName}`, project: project.projectName, allocation: newAllocation },
    });

    return allocation;
  }

  async findAll(
    orgId: string,
    query: {
      search?: string;
      projectId?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { organizationId: orgId, isDeleted: false };

    if (query.projectId) where.projectId = query.projectId;
    if (query.userId) where.userId = query.userId;

    if (query.startDate || query.endDate) {
      where.startDate = {};
      if (query.startDate) where.startDate.gte = new Date(query.startDate);
      if (query.endDate) where.startDate.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { role: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
        { user: { OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
        ]}},
      ];
    }

    const orderBy: any = {};
    if (query.sortBy === 'allocation') {
      orderBy.allocationPercentage = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (query.sortBy === 'startDate') {
      orderBy.startDate = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.resourceAllocation.findMany({
        where, skip, take: limit, orderBy,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
          project: { select: { id: true, projectName: true, projectCode: true } },
        },
      }),
      this.prisma.resourceAllocation.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(orgId: string, allocationId: string) {
    const allocation = await this.prisma.resourceAllocation.findFirst({
      where: { id: allocationId, organizationId: orgId, isDeleted: false },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
        project: { select: { id: true, projectName: true, projectCode: true, startDate: true, endDate: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!allocation) throw new NotFoundException('Resource allocation not found');
    return allocation;
  }

  async update(orgId: string, allocationId: string, userId: string, data: any) {
    const existing = await this.prisma.resourceAllocation.findFirst({
      where: { id: allocationId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Resource allocation not found');

    const updateData: any = {};
    if (data.role !== undefined) updateData.role = data.role;
    if (data.allocationPercentage !== undefined) updateData.allocationPercentage = parseFloat(data.allocationPercentage);
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.capacity !== undefined) updateData.capacity = data.capacity ? parseFloat(data.capacity) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;
    updateData.updatedBy = userId;

    const allocation = await this.prisma.resourceAllocation.update({
      where: { id: allocationId },
      data: updateData,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, projectName: true, projectCode: true } },
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'RESOURCE_ALLOCATION_UPDATED',
      module: 'RESOURCE_MANAGEMENT',
      entityType: 'RESOURCE_ALLOCATION',
      entityId: allocationId,
      metadata: { allocation: allocation.allocationPercentage },
    });

    return allocation;
  }

  async remove(orgId: string, allocationId: string, userId: string) {
    const existing = await this.prisma.resourceAllocation.findFirst({
      where: { id: allocationId, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Resource allocation not found');

    await this.prisma.resourceAllocation.update({
      where: { id: allocationId },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: userId },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'RESOURCE_ALLOCATION_DELETED',
      module: 'RESOURCE_MANAGEMENT',
      entityType: 'RESOURCE_ALLOCATION',
      entityId: allocationId,
    });

    return { success: true };
  }

  // --- Workload ---
  async getTeamWorkload(orgId: string, projectId?: string) {
    const where: any = { organizationId: orgId, isDeleted: false };
    if (projectId) where.projectId = projectId;

    const allocations = await this.prisma.resourceAllocation.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, profilePictureUrl: true } },
        project: { select: { id: true, projectName: true, projectCode: true } },
      },
      orderBy: { allocationPercentage: 'desc' },
    });

    const userWorkloads: Record<string, {
      user: any;
      allocations: any[];
      totalAllocation: number;
      isOverallocated: boolean;
    }> = {};

    for (const allocation of allocations) {
      const uid = allocation.userId;
      if (!userWorkloads[uid]) {
        userWorkloads[uid] = {
          user: allocation.user,
          allocations: [],
          totalAllocation: 0,
          isOverallocated: false,
        };
      }
      userWorkloads[uid].allocations.push(allocation);
      userWorkloads[uid].totalAllocation += allocation.allocationPercentage;
      userWorkloads[uid].isOverallocated = userWorkloads[uid].totalAllocation > 100;
    }

    const workload = Object.values(userWorkloads);
    const overallocated = workload.filter(w => w.isOverallocated);
    const available = workload.filter(w => w.totalAllocation < 100);

    return { workload, overallocated, available, totalAllocations: allocations.length };
  }

  // --- Dashboard Stats ---
  async getStats(orgId: string) {
    const now = new Date();

    const [totalAllocations, activeAllocations, projectCount] = await Promise.all([
      this.prisma.resourceAllocation.count({ where: { organizationId: orgId, isDeleted: false } }),
      this.prisma.resourceAllocation.count({
        where: {
          organizationId: orgId, isDeleted: false,
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      }),
      this.prisma.resourceAllocation.groupBy({
        by: ['projectId'],
        where: { organizationId: orgId, isDeleted: false },
        _sum: { allocationPercentage: true },
        _count: true,
      }),
    ]);

    const totalCapacity = await this.prisma.resourceAllocation.aggregate({
      where: { organizationId: orgId, isDeleted: false },
      _sum: { allocationPercentage: true },
    });

    const activeCapacity = await this.prisma.resourceAllocation.aggregate({
      where: {
        organizationId: orgId, isDeleted: false,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      _sum: { allocationPercentage: true },
    });

    const allAllocations = await this.prisma.resourceAllocation.findMany({
      where: { organizationId: orgId, isDeleted: false },
      select: { userId: true, allocationPercentage: true },
    });

    const userTotals: Record<string, number> = {};
    for (const a of allAllocations) {
      userTotals[a.userId] = (userTotals[a.userId] || 0) + a.allocationPercentage;
    }

    const overallocatedCount = Object.values(userTotals).filter(t => t > 100).length;
    const availableCount = Object.values(userTotals).filter(t => t < 100).length;

    const uniqueUsers = Object.keys(userTotals).length;
    const avgUtilization = uniqueUsers > 0
      ? Math.round(Object.values(userTotals).reduce((a, b) => a + b, 0) / uniqueUsers)
      : 0;

    return {
      totalAllocations,
      activeAllocations,
      totalCapacity: totalCapacity._sum.allocationPercentage || 0,
      activeCapacity: activeCapacity._sum.allocationPercentage || 0,
      overallocatedResources: overallocatedCount,
      availableResources: availableCount,
      avgUtilization,
      projects: projectCount.map(p => ({
        projectId: p.projectId,
        totalAllocation: p._sum.allocationPercentage || 0,
        memberCount: p._count,
      })),
    };
  }
}
