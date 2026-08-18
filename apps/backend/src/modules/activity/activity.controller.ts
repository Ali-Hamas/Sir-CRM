import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  getActivities(@Req() req: any, @Param('orgId') orgId: string, @Query() query: any): Promise<any> {
    const user = req.user;
    const isOrgAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    
    // Normal users can only see their own activities; Admins can see all or filter by requested userId
    const targetUserId = isOrgAdmin ? query.userId : user.id;

    return this.activityService.getActivities(orgId, {
      userId: targetUserId,
      module: query.module,
      entityType: query.entityType,
      action: query.action,
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      excludeAdminActions: !isOrgAdmin,
    });
  }
}

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/activities')
export class ActivitiesAliasController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  getActivities(@Req() req: any, @Param('orgId') orgId: string, @Query() query: any): Promise<any> {
    const user = req.user;
    const isOrgAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    const targetUserId = isOrgAdmin ? query.userId : user.id;

    return this.activityService.getActivities(orgId, {
      userId: targetUserId,
      module: query.module,
      entityType: query.entityType,
      action: query.action,
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      excludeAdminActions: !isOrgAdmin,
    });
  }
}

