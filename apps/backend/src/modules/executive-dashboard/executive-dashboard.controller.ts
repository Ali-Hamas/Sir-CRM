import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';
import { ExecutiveDashboardService } from './executive-dashboard.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
@Controller('organizations/:orgId/executive')
export class ExecutiveDashboardController {
  constructor(private readonly dashboardService: ExecutiveDashboardService) {}

  @Get('dashboard')
  getDashboard(@Req() req: any, @Param('orgId') orgId: string) {
    return this.dashboardService.getDashboard(orgId);
  }

  @Get('insights')
  getInsights(@Req() req: any, @Param('orgId') orgId: string) {
    return this.dashboardService.getInsights(orgId);
  }

  @Get('alerts')
  getAlerts(@Req() req: any, @Param('orgId') orgId: string) {
    return this.dashboardService.getAlerts(orgId);
  }

  @Get('predictions')
  getPredictions(@Req() req: any, @Param('orgId') orgId: string) {
    return this.dashboardService.getPredictions(orgId);
  }
}

