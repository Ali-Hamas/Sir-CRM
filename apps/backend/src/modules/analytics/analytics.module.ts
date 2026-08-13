import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { MetricsCollectorService } from './metrics-collector.service';
import { DashboardService } from './dashboard.service';
import { WidgetService } from './widget.service';
import { ForecastService } from './forecast.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { RecommendationService } from './recommendation.service';
import { ReportGeneratorService } from './report-generator.service';
import { SnapshotService } from './snapshot.service';

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    MetricsCollectorService,
    DashboardService,
    WidgetService,
    ForecastService,
    AnomalyDetectionService,
    RecommendationService,
    ReportGeneratorService,
    SnapshotService,
  ],
  exports: [
    AnalyticsService,
    MetricsCollectorService,
    DashboardService,
    WidgetService,
    ForecastService,
    AnomalyDetectionService,
    RecommendationService,
    ReportGeneratorService,
    SnapshotService,
  ],
})
export class AnalyticsModule {}
