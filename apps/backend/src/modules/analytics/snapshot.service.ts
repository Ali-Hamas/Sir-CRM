import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MetricsCollectorService } from './metrics-collector.service';

@Injectable()
export class SnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsCollector: MetricsCollectorService,
  ) {}

  async getSnapshots(organizationId: string) {
    return this.prisma.analyticsSnapshot.findMany({
      where: { organizationId },
      orderBy: { takenAt: 'desc' },
      take: 30,
    });
  }

  async createSnapshot(organizationId: string, title?: string, type = 'MANUAL') {
    const metrics = await this.metricsCollector.collectAllMetrics(organizationId);

    const snapshot = await this.prisma.analyticsSnapshot.create({
      data: {
        organizationId,
        title: title || `Snapshot ${new Date().toISOString().substring(0, 10)} (${type})`,
        type,
        healthScore: metrics.overview.healthScore,
        snapshotDataJson: JSON.stringify(metrics),
        takenAt: new Date(),
      },
    });

    return snapshot;
  }
}
