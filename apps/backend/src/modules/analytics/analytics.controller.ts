import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';
import { AnalyticsService } from './analytics.service';
import { MetricsCollectorService } from './metrics-collector.service';
import { DashboardService } from './dashboard.service';
import { WidgetService } from './widget.service';
import { ForecastService } from './forecast.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { RecommendationService } from './recommendation.service';
import { ReportGeneratorService } from './report-generator.service';
import { SnapshotService } from './snapshot.service';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly metricsCollector: MetricsCollectorService,
    private readonly dashboardService: DashboardService,
    private readonly widgetService: WidgetService,
    private readonly forecastService: ForecastService,
    private readonly anomalyDetectionService: AnomalyDetectionService,
    private readonly recommendationService: RecommendationService,
    private readonly reportGeneratorService: ReportGeneratorService,
    private readonly snapshotService: SnapshotService,
  ) {}

  // ==========================================
  // OVERVIEW & STATS
  // ==========================================

  @Get('overview')
  getOverview(@Param('orgId') orgId: string) {
    return this.analyticsService.getOverview(orgId);
  }

  @Get('stats')
  getStats(@Param('orgId') orgId: string) {
    return this.analyticsService.getStats(orgId);
  }

  @Get('metrics')
  async getMetrics(@Param('orgId') orgId: string) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.metricsCollector.collectAllMetrics(resolvedOrgId);
  }

  // ==========================================
  // DASHBOARDS
  // ==========================================

  @Get('dashboards')
  async getDashboards(@Param('orgId') orgId: string) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.dashboardService.getDashboards(resolvedOrgId);
  }

  @Get('dashboards/:id')
  async getDashboardById(@Param('orgId') orgId: string, @Param('id') id: string) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.dashboardService.getDashboardById(resolvedOrgId, id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Post('dashboards')
  async createDashboard(@Req() req: any, @Param('orgId') orgId: string, @Body() body: any) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.dashboardService.createDashboard(resolvedOrgId, req.user.id, body);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Patch('dashboards/:id')
  async updateDashboard(@Param('orgId') orgId: string, @Param('id') id: string, @Body() body: any) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.dashboardService.updateDashboard(resolvedOrgId, id, body);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('dashboards/:id')
  async deleteDashboard(@Param('orgId') orgId: string, @Param('id') id: string) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.dashboardService.deleteDashboard(resolvedOrgId, id);
  }

  // ==========================================
  // WIDGETS
  // ==========================================

  @Get('dashboards/:dashboardId/widgets')
  getWidgets(@Param('dashboardId') dashboardId: string) {
    return this.widgetService.getWidgets(dashboardId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Post('dashboards/:dashboardId/widgets')
  createWidget(@Param('dashboardId') dashboardId: string, @Body() body: any) {
    return this.widgetService.createWidget(dashboardId, body);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Patch('widgets/:id')
  updateWidget(@Param('id') id: string, @Body() body: any) {
    return this.widgetService.updateWidget(id, body);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Delete('widgets/:id')
  deleteWidget(@Param('id') id: string) {
    return this.widgetService.deleteWidget(id);
  }

  // ==========================================
  // FORECASTS
  // ==========================================

  @Get('forecasts')
  async getForecasts(@Param('orgId') orgId: string) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.forecastService.getForecasts(resolvedOrgId);
  }

  // ==========================================
  // ANOMALIES
  // ==========================================

  @Get('anomalies')
  async getAnomalies(@Param('orgId') orgId: string) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.anomalyDetectionService.getAnomalies(resolvedOrgId);
  }

  @Patch('anomalies/:id/resolve')
  async resolveAnomaly(@Param('orgId') orgId: string, @Param('id') id: string) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.anomalyDetectionService.resolveAnomaly(resolvedOrgId, id);
  }

  // ==========================================
  // RECOMMENDATIONS
  // ==========================================

  @Get('recommendations')
  async getRecommendations(@Param('orgId') orgId: string) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.recommendationService.getRecommendations(resolvedOrgId);
  }

  @Patch('recommendations/:id/status')
  async updateRecommendationStatus(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'APPLIED' | 'DISMISSED',
  ) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.recommendationService.updateStatus(resolvedOrgId, id, status);
  }

  // ==========================================
  // REPORTS
  // ==========================================

  @Get('reports')
  async getReports(@Param('orgId') orgId: string) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.reportGeneratorService.getReports(resolvedOrgId);
  }

  @Get('reports/:id')
  async getReportById(@Param('orgId') orgId: string, @Param('id') id: string) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.reportGeneratorService.getReportById(resolvedOrgId, id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Post('reports/generate')
  async generateReport(@Req() req: any, @Param('orgId') orgId: string, @Body() body: any) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.reportGeneratorService.generateReport(resolvedOrgId, req.user.id, body);
  }

  @Get('reports/:id/export')
  async exportReport(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Query('format') format: 'JSON' | 'CSV' | 'HTML' = 'JSON',
  ) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.reportGeneratorService.exportReportFormat(resolvedOrgId, id, format);
  }

  // ==========================================
  // SNAPSHOTS
  // ==========================================

  @Get('snapshots')
  async getSnapshots(@Param('orgId') orgId: string) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.snapshotService.getSnapshots(resolvedOrgId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Post('snapshots')
  async createSnapshot(@Param('orgId') orgId: string, @Body() body: any) {
    const resolvedOrgId = await this.analyticsService.getOrgId(orgId);
    return this.snapshotService.createSnapshot(resolvedOrgId, body?.title, body?.type);
  }
}
