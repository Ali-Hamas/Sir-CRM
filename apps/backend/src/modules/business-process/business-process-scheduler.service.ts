import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { BusinessProcessExecutorService } from './business-process-executor.service';

@Injectable()
export class BusinessProcessSchedulerService {
  private readonly logger = new Logger(BusinessProcessSchedulerService.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private executor: BusinessProcessExecutorService,
  ) {}

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.processSchedules(), 60000);
    this.logger.log('Business process scheduler started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async processSchedules() {
    try {
      const now = new Date();
      const schedules = await this.prisma.businessProcessSchedule.findMany({
        where: {
          status: 'ACTIVE',
          nextRunAt: { lte: now },
          isDeleted: false,
        },
        include: { process: true },
      });

      for (const schedule of schedules) {
        try {
          await this.executeSchedule(schedule);
        } catch (err: any) {
          this.logger.error(`Schedule ${schedule.id} execution failed: ${err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`Schedule processing failed: ${err.message}`);
    }
  }

  private async executeSchedule(schedule: any) {
    if (schedule.maxExecutions > 0 && schedule.executedCount >= schedule.maxExecutions) {
      await this.prisma.businessProcessSchedule.update({
        where: { id: schedule.id },
        data: { status: 'COMPLETED' },
      });
      return;
    }

    const input = schedule.config ? JSON.parse(schedule.config) : undefined;
    const execution = await this.executor.execute(
      schedule.organizationId,
      schedule.processId,
      schedule.createdBy || '',
      input,
      'SCHEDULED',
    );

    await this.prisma.businessProcessSchedule.update({
      where: { id: schedule.id },
      data: {
        executionId: execution.id,
        executedCount: { increment: 1 },
        lastExecutedAt: new Date(),
        nextRunAt: this.calculateNextRun(schedule),
      },
    });
  }

  private calculateNextRun(schedule: any): Date | null {
    if (schedule.endAt && new Date(schedule.endAt) < new Date()) return null;
    if (schedule.intervalMinutes) {
      return new Date(Date.now() + schedule.intervalMinutes * 60000);
    }
    return null;
  }

  async create(data: {
    organizationId: string;
    processId: string;
    cronExpression?: string;
    intervalMinutes?: number;
    startAt?: string | Date;
    endAt?: string | Date;
    maxExecutions?: number;
    config?: any;
    createdBy?: string;
  }) {
    const startDate = data.startAt ? new Date(data.startAt) : new Date();
    const endDate = data.endAt ? new Date(data.endAt) : undefined;
    return this.prisma.businessProcessSchedule.create({
      data: {
        organizationId: data.organizationId,
        processId: data.processId,
        cronExpression: data.cronExpression,
        intervalMinutes: data.intervalMinutes,
        startAt: startDate,
        endAt: endDate,
        maxExecutions: data.maxExecutions || 0,
        config: data.config ? JSON.stringify(data.config) : undefined,
        createdBy: data.createdBy,
        nextRunAt: startDate,
        status: 'ACTIVE',
      },
    });
  }

  async findByProcess(processId: string) {
    return this.prisma.businessProcessSchedule.findMany({
      where: { processId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOrganization(organizationId: string) {
    return this.prisma.businessProcessSchedule.findMany({
      where: { organizationId, isDeleted: false },
      include: { process: { select: { id: true, name: true } } },
      orderBy: { nextRunAt: 'asc' },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.businessProcessSchedule.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.businessProcessSchedule.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), status: 'COMPLETED' },
    });
  }
}
