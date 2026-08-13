import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MetricsAggregatorService } from './metrics-aggregator.service';
import { InsightsService } from './insights.service';
import { PredictionService } from './prediction.service';
import { AlertsService } from './alerts.service';

@Injectable()
export class ExecutiveDashboardService {
  constructor(
    private prisma: PrismaService,
    private metricsAggregator: MetricsAggregatorService,
    private insightsService: InsightsService,
    private predictionService: PredictionService,
    private alertsService: AlertsService,
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
   * Get full executive dashboard data bundle.
   */
  async getDashboard(orgIdOrSlug: string) {
    const org = await this.resolveOrg(orgIdOrSlug);

    const [metrics, insights, predictions, alerts] = await Promise.all([
      this.metricsAggregator.aggregateMetrics(org.id),
      this.insightsService.getInsights(org.id),
      this.predictionService.getPredictions(org.id),
      this.alertsService.getAlerts(org.id),
    ]);

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      healthScore: metrics.overview.healthScore,
      aiConfidenceScore: metrics.overview.aiConfidenceScore,
      summaryText: metrics.overview.weeklySummary,
      dailyHighlights: metrics.overview.dailyHighlights,
      metrics,
      insights,
      predictions,
      alerts,
      lastCalculatedAt: new Date(),
    };
  }

  /**
   * Get insights.
   */
  async getInsights(orgIdOrSlug: string) {
    const org = await this.resolveOrg(orgIdOrSlug);
    return this.insightsService.getInsights(org.id);
  }

  /**
   * Get alerts.
   */
  async getAlerts(orgIdOrSlug: string) {
    const org = await this.resolveOrg(orgIdOrSlug);
    return this.alertsService.getAlerts(org.id);
  }

  /**
   * Get predictions.
   */
  async getPredictions(orgIdOrSlug: string) {
    const org = await this.resolveOrg(orgIdOrSlug);
    return this.predictionService.getPredictions(org.id);
  }
}
