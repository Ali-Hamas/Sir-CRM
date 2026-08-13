import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { MetricsAggregatorService } from './metrics-aggregator.service';
import { InsightsService } from './insights.service';
import { PredictionService } from './prediction.service';
import { AlertsService } from './alerts.service';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import { ExecutiveDashboardController } from './executive-dashboard.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ExecutiveDashboardController],
  providers: [
    MetricsAggregatorService,
    InsightsService,
    PredictionService,
    AlertsService,
    ExecutiveDashboardService,
  ],
  exports: [
    MetricsAggregatorService,
    InsightsService,
    PredictionService,
    AlertsService,
    ExecutiveDashboardService,
  ],
})
export class ExecutiveDashboardModule {}
