import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MetricsCollectorService } from './metrics-collector.service';
import { ForecastService } from './forecast.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { RecommendationService } from './recommendation.service';
import { DashboardService } from './dashboard.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsCollector: MetricsCollectorService,
    private readonly forecastService: ForecastService,
    private readonly anomalyDetectionService: AnomalyDetectionService,
    private readonly recommendationService: RecommendationService,
    private readonly dashboardService: DashboardService,
  ) {}

  /**
   * Helper to resolve Organization entity by ID or Slug.
   */
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

  /**
   * Get full executive analytics overview bundle.
   */
  async getOverview(orgIdOrSlug: string) {
    const org = await this.resolveOrg(orgIdOrSlug);

    const [metrics, forecasts, anomalies, recommendations, dashboards] = await Promise.all([
      this.metricsCollector.collectAllMetrics(org.id),
      this.forecastService.getForecasts(org.id),
      this.anomalyDetectionService.getAnomalies(org.id),
      this.recommendationService.getRecommendations(org.id),
      this.dashboardService.getDashboards(org.id),
    ]);

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      healthScore: metrics.overview.healthScore,
      aiConfidenceScore: metrics.overview.aiConfidenceScore,
      metrics,
      forecasts,
      anomalies,
      recommendations,
      activeDashboard: dashboards[0] || null,
      lastCalculatedAt: new Date(),
    };
  }

  /**
   * Get quick statistics for KPI headers.
   */
  async getStats(orgIdOrSlug: string) {
    const org = await this.resolveOrg(orgIdOrSlug);
    const metrics = await this.metricsCollector.collectAllMetrics(org.id);

    return {
      healthScore: metrics.overview.healthScore,
      salesPipelineValue: metrics.crm.salesPipelineValue,
      opportunityWinRate: metrics.crm.opportunityWinRate,
      activeProjects: metrics.projects.activeProjects,
      taskCompletionRate: metrics.projects.taskCompletionRate,
      workflowSuccessRate: metrics.workflowsAndProcesses.workflowSuccessRate,
      automationSavingsHours: metrics.workflowsAndProcesses.automationSavingsHours,
      totalAiExecutions: metrics.aiUsage.totalAiExecutions,
    };
  }

  async getOrgId(orgIdOrSlug: string): Promise<string> {
    const org = await this.resolveOrg(orgIdOrSlug);
    return org.id;
  }
}
