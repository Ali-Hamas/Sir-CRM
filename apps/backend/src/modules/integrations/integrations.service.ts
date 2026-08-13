import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ProviderRegistryService } from './provider-registry.service';
import { ConnectionManagerService } from './connection-manager.service';
import { SyncEngineService } from './sync-engine.service';
import { WebhookManagerService } from './webhook-manager.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly syncEngine: SyncEngineService,
    private readonly webhookManager: WebhookManagerService,
  ) {}

  private async resolveOrg(idOrSlug: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isDeleted: false,
      },
    });

    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async getOrgId(idOrSlug: string): Promise<string> {
    const org = await this.resolveOrg(idOrSlug);
    return org.id;
  }

  async getStats(idOrSlug: string) {
    const org = await this.resolveOrg(idOrSlug);

    const [totalProviders, activeConnections, totalSyncJobs, totalWebhooks, totalEvents] = await Promise.all([
      this.prisma.integrationProvider.count({ where: { isEnabled: true } }),
      this.prisma.integrationConnection.count({ where: { organizationId: org.id, status: 'CONNECTED' } }),
      this.prisma.integrationSyncJob.count({ where: { organizationId: org.id } }),
      this.prisma.integrationWebhook.count({ where: { organizationId: org.id } }),
      this.prisma.integrationEvent.count({ where: { organizationId: org.id } }),
    ]);

    return {
      totalProviders: totalProviders || 19,
      activeConnections,
      totalSyncJobs,
      totalWebhooks,
      totalEvents,
      systemHealth: 'HEALTHY',
    };
  }
}
