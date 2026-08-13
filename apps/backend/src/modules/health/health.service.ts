import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as os from 'os';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async checkHealth() {
    const dbStatus = await this.pingDatabase();
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const memUsage = process.memoryUsage();

    return {
      status: dbStatus.ok ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      environment: process.env.NODE_ENV || 'development',
      database: {
        provider: 'MongoDB',
        connected: dbStatus.ok,
        latencyMs: dbStatus.latencyMs,
        error: dbStatus.error || null,
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cpusCount: os.cpus().length,
        totalMemoryBytes: os.totalmem(),
        freeMemoryBytes: os.freemem(),
        memoryUsageRatio: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100) / 100,
      },
      process: {
        pid: process.pid,
        rssBytes: memUsage.rss,
        heapTotalBytes: memUsage.heapTotal,
        heapUsedBytes: memUsage.heapUsed,
        externalBytes: memUsage.external,
      },
    };
  }

  async checkReadiness() {
    const dbStatus = await this.pingDatabase();
    return {
      ready: dbStatus.ok,
      timestamp: new Date().toISOString(),
      database: dbStatus.ok ? 'CONNECTED' : 'DISCONNECTED',
      latencyMs: dbStatus.latencyMs,
    };
  }

  async checkLiveness() {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  async getDiagnostics() {
    const health = await this.checkHealth();
    const [
      userCount,
      orgCount,
      projectCount,
      taskCount,
      aiExecutionCount,
      integrationCount,
    ] = await Promise.all([
      this.prisma.user.count().catch(() => 0),
      this.prisma.organization.count().catch(() => 0),
      this.prisma.project.count().catch(() => 0),
      this.prisma.task.count().catch(() => 0),
      this.prisma.aIAgentExecution.count().catch(() => 0),
      this.prisma.integrationConnection.count().catch(() => 0),
    ]);

    return {
      ...health,
      metricsSummary: {
        totalUsers: userCount,
        totalOrganizations: orgCount,
        totalProjects: projectCount,
        totalTasks: taskCount,
        totalAiExecutions: aiExecutionCount,
        totalIntegrations: integrationCount,
      },
      activeModules: [
        'AuthModule',
        'UsersModule',
        'OrganizationsModule',
        'WorkspacesModule',
        'TeamModule',
        'DepartmentsModule',
        'RolesModule',
        'ActivityModule',
        'NotificationsModule',
        'DocumentsModule',
        'CompaniesModule',
        'ContactsModule',
        'LeadsModule',
        'OpportunitiesModule',
        'MeetingsModule',
        'ProposalsModule',
        'ContractsModule',
        'ProjectsModule',
        'TasksModule',
        'TimeTrackingModule',
        'ResourceManagementModule',
        'KnowledgeModule',
        'WorkflowsModule',
        'AIProvidersModule',
        'PromptsModule',
        'AIChatModule',
        'AIMemoryModule',
        'AIAssistantModule',
        'AIToolModule',
        'RAGModule',
        'AIAgentsModule',
        'ExecutiveDashboardModule',
        'AIOrchestratorModule',
        'BusinessProcessModule',
        'CommunicationsModule',
        'AnalyticsModule',
        'IntegrationsModule',
        'HealthModule',
      ],
    };
  }

  private async pingDatabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
      const latencyMs = Date.now() - start;
      return { ok: true, latencyMs };
    } catch (err: any) {
      // Fallback count query if raw command is restricted
      try {
        await this.prisma.user.findFirst({ select: { id: true } });
        return { ok: true, latencyMs: Date.now() - start };
      } catch (fallbackErr: any) {
        return { ok: false, latencyMs: Date.now() - start, error: fallbackErr.message };
      }
    }
  }
}
