import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN) // Usually restricted to Admins
  @Get()
  getActivities(@Param('orgId') orgId: string, @Query() query: any): Promise<any> {
    return this.activityService.getActivities(orgId, {
      userId: query.userId,
      entityType: query.entityType,
      action: query.action,
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
    });
  }
}
