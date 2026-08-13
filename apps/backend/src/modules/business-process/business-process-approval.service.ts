import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class BusinessProcessApprovalService {
  constructor(private prisma: PrismaService) {}

  async findPendingByUser(organizationId: string, userId: string) {
    return this.prisma.businessProcessApproval.findMany({
      where: {
        organizationId,
        assignedToId: userId,
        status: 'PENDING',
      },
      include: {
        execution: {
          select: { id: true, processId: true, status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingByOrganization(organizationId: string) {
    return this.prisma.businessProcessApproval.findMany({
      where: { organizationId, status: 'PENDING' },
      include: {
        assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
        execution: {
          select: { id: true, processId: true, status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByExecution(executionId: string) {
    return this.prisma.businessProcessApproval.findMany({
      where: { executionId },
      include: {
        assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
        decidedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async decide(id: string, userId: string, status: string, comment?: string) {
    const approval = await this.prisma.businessProcessApproval.findUnique({
      where: { id },
      include: { execution: true },
    });
    if (!approval) throw new NotFoundException('Approval not found');
    if (approval.status !== 'PENDING') throw new BadRequestException('Approval already decided');

    const updated = await this.prisma.businessProcessApproval.update({
      where: { id },
      data: {
        status,
        comment,
        decidedById: userId,
        decidedAt: new Date(),
      },
    });

    if (status === 'APPROVED') {
      const pendingSteps = await this.prisma.businessProcessStep.count({
        where: { executionId: approval.executionId, status: 'WAITING_APPROVAL' },
      });
      if (pendingSteps === 0) {
        await this.prisma.businessProcessExecution.update({
          where: { id: approval.executionId },
          data: { status: 'EXECUTING' },
        });
      }
    }

    if (status === 'REJECTED') {
      await this.prisma.businessProcessExecution.update({
        where: { id: approval.executionId },
        data: { status: 'FAILED', errorMessage: `Rejected at approval checkpoint: ${approval.title}` },
      });
    }

    return updated;
  }
}
