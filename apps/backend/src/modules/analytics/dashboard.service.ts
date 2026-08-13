import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboards(organizationId: string) {
    const dashboards = await this.prisma.analyticsDashboard.findMany({
      where: { organizationId },
      include: { widgets: true },
      orderBy: { createdAt: 'asc' },
    });

    if (dashboards.length === 0) {
      // Seed default dashboards for org
      return [await this.seedDefaultDashboard(organizationId)];
    }

    return dashboards;
  }

  async getDashboardById(organizationId: string, id: string) {
    const dashboard = await this.prisma.analyticsDashboard.findFirst({
      where: { id, organizationId },
      include: { widgets: true },
    });

    if (!dashboard) {
      throw new NotFoundException(`Dashboard ${id} not found`);
    }

    return dashboard;
  }

  async createDashboard(organizationId: string, userId: string, data: any) {
    return this.prisma.analyticsDashboard.create({
      data: {
        organizationId,
        workspaceId: data.workspaceId || null,
        name: data.name,
        description: data.description || '',
        category: data.category || 'GENERAL',
        isDefault: data.isDefault || false,
        isPublic: data.isPublic || false,
        layoutConfig: data.layoutConfig ? JSON.stringify(data.layoutConfig) : null,
        createdBy: userId,
      },
    });
  }

  async updateDashboard(organizationId: string, id: string, data: any) {
    await this.getDashboardById(organizationId, id);

    return this.prisma.analyticsDashboard.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        isDefault: data.isDefault,
        isPublic: data.isPublic,
        layoutConfig: data.layoutConfig ? (typeof data.layoutConfig === 'string' ? data.layoutConfig : JSON.stringify(data.layoutConfig)) : undefined,
      },
    });
  }

  async deleteDashboard(organizationId: string, id: string) {
    await this.getDashboardById(organizationId, id);
    await this.prisma.analyticsWidget.deleteMany({ where: { dashboardId: id } });
    return this.prisma.analyticsDashboard.delete({ where: { id } });
  }

  private async seedDefaultDashboard(organizationId: string) {
    const defaultDash = await this.prisma.analyticsDashboard.create({
      data: {
        organizationId,
        name: 'Main Decision Intelligence Dashboard',
        description: 'Default executive & module operational dashboard',
        category: 'EXECUTIVE',
        isDefault: true,
        isPublic: true,
        layoutConfig: JSON.stringify({ columns: 12 }),
      },
    });

    // Seed preset widgets
    await this.prisma.analyticsWidget.createMany({
      data: [
        {
          dashboardId: defaultDash.id,
          title: 'Organization Health Score',
          type: 'GAUGE',
          metricKey: 'overview.healthScore',
          config: JSON.stringify({ color: '#10B981', min: 0, max: 100 }),
          positionX: 0,
          positionY: 0,
          width: 4,
          height: 3,
        },
        {
          dashboardId: defaultDash.id,
          title: 'Sales Pipeline Value',
          type: 'METRIC_CARD',
          metricKey: 'crm.salesPipelineValue',
          config: JSON.stringify({ format: 'currency', currency: 'USD' }),
          positionX: 4,
          positionY: 0,
          width: 4,
          height: 3,
        },
        {
          dashboardId: defaultDash.id,
          title: 'Project Task Completion Rate',
          type: 'CHART_LINE',
          metricKey: 'projects.taskCompletionRate',
          config: JSON.stringify({ showTrend: true, target: 90 }),
          positionX: 8,
          positionY: 0,
          width: 4,
          height: 3,
        },
        {
          dashboardId: defaultDash.id,
          title: 'Automation & AI Usage',
          type: 'CHART_BAR',
          metricKey: 'aiUsage.totalAiExecutions',
          config: JSON.stringify({ period: 'daily' }),
          positionX: 0,
          positionY: 3,
          width: 6,
          height: 4,
        },
        {
          dashboardId: defaultDash.id,
          title: 'Workflow Execution Success Rate',
          type: 'HEATMAP',
          metricKey: 'workflowsAndProcesses.workflowSuccessRate',
          config: JSON.stringify({ thresholds: [80, 90, 95] }),
          positionX: 6,
          positionY: 3,
          width: 6,
          height: 4,
        },
      ],
    });

    return this.prisma.analyticsDashboard.findUnique({
      where: { id: defaultDash.id },
      include: { widgets: true },
    });
  }
}
