import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class SyncEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async getSyncJobs(organizationId: string) {
    return this.prisma.integrationSyncJob.findMany({
      where: { organizationId },
      include: { connection: { include: { provider: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async triggerSync(organizationId: string, connectionId: string, options?: {
    syncType?: string;
    entityType?: string;
  }) {
    const connection = await this.prisma.integrationConnection.findFirst({
      where: { id: connectionId, organizationId },
      include: { provider: true },
    });
    if (!connection) throw new NotFoundException('Connection not found');

    const syncType = options?.syncType || 'INCREMENTAL';
    const entityType = options?.entityType || 'CONTACTS';

    // Create Sync Job
    const job = await this.prisma.integrationSyncJob.create({
      data: {
        organizationId,
        connectionId: connection.id,
        syncType,
        status: 'IN_PROGRESS',
        entityType,
        startedAt: new Date(),
        recordsProcessed: 0,
        recordsFailed: 0,
      },
    });

    // Update connection status
    await this.prisma.integrationConnection.update({
      where: { id: connection.id },
      data: { status: 'SYNCING' },
    });

    // Simulate async sync task execution
    const mockProcessed = Math.floor(Math.random() * 45) + 12;
    const completedJob = await this.prisma.integrationSyncJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        recordsProcessed: mockProcessed,
        recordsFailed: 0,
        completedAt: new Date(),
      },
    });

    // Restore connection status & last synced timestamp
    await this.prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        status: 'CONNECTED',
        lastSyncedAt: new Date(),
        healthStatus: 'HEALTHY',
      },
    });

    // Log completion
    await this.prisma.integrationLog.create({
      data: {
        organizationId,
        connectionId: connection.id,
        syncJobId: job.id,
        level: 'INFO',
        action: 'SYNC_COMPLETE',
        message: `Completed ${syncType} sync for ${connection.provider.name} (${entityType}): ${mockProcessed} records synced.`,
      },
    });

    return completedJob;
  }

  async retrySyncJob(organizationId: string, jobId: string) {
    const job = await this.prisma.integrationSyncJob.findFirst({
      where: { id: jobId, organizationId },
    });
    if (!job) throw new NotFoundException('Sync job not found');

    return this.triggerSync(organizationId, job.connectionId, {
      syncType: 'RETRY',
      entityType: job.entityType,
    });
  }
}
