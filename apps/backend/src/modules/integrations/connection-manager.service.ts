import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CredentialEncryptionService } from './credential-encryption.service';

@Injectable()
export class ConnectionManagerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: CredentialEncryptionService,
  ) {}

  async getConnections(organizationId: string) {
    return this.prisma.integrationConnection.findMany({
      where: { organizationId },
      include: {
        provider: true,
        credentials: {
          select: {
            id: true,
            type: true,
            expiresAt: true,
            isRevoked: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            syncJobs: true,
            logs: true,
            webhooks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConnectionById(organizationId: string, id: string) {
    const connection = await this.prisma.integrationConnection.findFirst({
      where: { id, organizationId },
      include: {
        provider: true,
        credentials: true,
        syncJobs: { take: 5, orderBy: { createdAt: 'desc' } },
        webhooks: true,
      },
    });

    if (!connection) throw new NotFoundException(`Connection ${id} not found`);
    return connection;
  }

  async createConnection(organizationId: string, userId: string, data: {
    providerKey: string;
    name: string;
    workspaceId?: string;
    authType?: string;
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    externalAccountId?: string;
    externalAccountEmail?: string;
    settings?: Record<string, any>;
  }) {
    const provider = await this.prisma.integrationProvider.findUnique({
      where: { key: data.providerKey },
    });
    if (!provider) throw new BadRequestException(`Provider ${data.providerKey} not found`);

    const connection = await this.prisma.integrationConnection.create({
      data: {
        organizationId,
        workspaceId: data.workspaceId || null,
        providerId: provider.id,
        name: data.name || `${provider.name} Connection`,
        status: 'CONNECTED',
        authType: data.authType || provider.authType,
        externalAccountId: data.externalAccountId || null,
        externalAccountEmail: data.externalAccountEmail || null,
        scopes: JSON.stringify(['read', 'write']),
        settingsJson: JSON.stringify(data.settings || {}),
        healthStatus: 'HEALTHY',
        createdById: userId,
      },
    });

    // Store encrypted credentials if provided
    if (data.apiKey) {
      const encrypted = this.encryptionService.encrypt(data.apiKey);
      await this.prisma.integrationCredential.create({
        data: {
          connectionId: connection.id,
          type: 'API_KEY',
          encryptedData: encrypted.encryptedData,
          iv: encrypted.iv,
        },
      });
    }

    if (data.accessToken) {
      const encrypted = this.encryptionService.encrypt(data.accessToken);
      await this.prisma.integrationCredential.create({
        data: {
          connectionId: connection.id,
          type: 'ACCESS_TOKEN',
          encryptedData: encrypted.encryptedData,
          iv: encrypted.iv,
          expiresAt: new Date(Date.now() + 3600000 * 24 * 30), // 30 days default
        },
      });
    }

    if (data.refreshToken) {
      const encrypted = this.encryptionService.encrypt(data.refreshToken);
      await this.prisma.integrationCredential.create({
        data: {
          connectionId: connection.id,
          type: 'REFRESH_TOKEN',
          encryptedData: encrypted.encryptedData,
          iv: encrypted.iv,
        },
      });
    }

    // Log connect event
    await this.prisma.integrationLog.create({
      data: {
        organizationId,
        connectionId: connection.id,
        level: 'INFO',
        action: 'OAUTH_CONNECT',
        message: `Successfully established connection to ${provider.name}`,
        metadataJson: JSON.stringify({ providerKey: provider.key }),
      },
    });

    return connection;
  }

  async updateConnection(organizationId: string, id: string, data: {
    name?: string;
    settings?: Record<string, any>;
    status?: string;
  }) {
    await this.getConnectionById(organizationId, id);

    return this.prisma.integrationConnection.update({
      where: { id },
      data: {
        name: data.name,
        status: data.status,
        settingsJson: data.settings ? JSON.stringify(data.settings) : undefined,
      },
    });
  }

  async disconnect(organizationId: string, id: string) {
    const conn = await this.getConnectionById(organizationId, id);

    // Revoke credentials
    await this.prisma.integrationCredential.updateMany({
      where: { connectionId: id },
      data: { isRevoked: true },
    });

    // Delete credentials & webhooks
    await this.prisma.integrationCredential.deleteMany({ where: { connectionId: id } });
    await this.prisma.integrationWebhook.deleteMany({ where: { connectionId: id } });
    await this.prisma.integrationSyncJob.deleteMany({ where: { connectionId: id } });

    await this.prisma.integrationLog.create({
      data: {
        organizationId,
        connectionId: id,
        level: 'INFO',
        action: 'DISCONNECT',
        message: `Disconnected ${conn.name}`,
      },
    });

    return this.prisma.integrationConnection.delete({ where: { id } });
  }

  async checkConnectionHealth(organizationId: string, id: string) {
    const conn = await this.getConnectionById(organizationId, id);
    const hasCreds = conn.credentials.length > 0;
    const healthStatus = hasCreds ? 'HEALTHY' : 'DEGRADED';

    await this.prisma.integrationConnection.update({
      where: { id },
      data: { healthStatus },
    });

    return { id: conn.id, status: conn.status, healthStatus, credentialsCount: conn.credentials.length };
  }
}
