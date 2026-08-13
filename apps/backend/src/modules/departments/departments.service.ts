import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, userId: string, data: any) {
    return this.prisma.department.create({
      data: {
        ...data,
        organizationId: orgId,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async findAll(orgId: string) {
    return this.prisma.department.findMany({
      where: { organizationId: orgId, isDeleted: false },
      include: {
        head: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { members: true, teams: true } },
      },
    });
  }

  async findOne(orgId: string, id: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
      include: {
        head: { select: { id: true, firstName: true, lastName: true, email: true } },
        teams: { where: { isDeleted: false } },
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async update(orgId: string, id: string, userId: string, data: any) {
    const existing = await this.prisma.department.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Department not found');

    return this.prisma.department.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });
  }

  async remove(orgId: string, id: string, userId: string) {
    const existing = await this.prisma.department.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Department not found');

    return this.prisma.department.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: userId },
    });
  }
}
