import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/time-entries')
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post()
  create(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.timeTrackingService.createTimeEntry(orgId, req.user.id, data, req.user.role);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('billable') billable?: string,
    @Query('projectId') projectId?: string,
    @Query('taskId') taskId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.timeTrackingService.findAll(
      orgId,
      {
        search,
        status,
        billable,
        projectId,
        taskId,
        userId,
        startDate,
        endDate,
        sortBy,
        sortOrder,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
      req.user,
    );
  }

  @Get('my')
  findMyEntries(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.timeTrackingService.findMyEntries(req.user.id, orgId, { startDate, endDate, projectId });
  }

  @Get('stats')
  getStats(@Param('orgId') orgId: string, @Query('userId') userId?: string) {
    return this.timeTrackingService.getStats(orgId, userId);
  }

  @Get('weekly')
  getWeeklyTimesheet(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.timeTrackingService.getWeeklyTimesheet(orgId, req.user.id, { weekStart });
  }

  @Get('timer/running')
  getRunningTimer(@Req() req: any, @Param('orgId') orgId: string) {
    return this.timeTrackingService.getRunningTimer(orgId, req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post('timer/start')
  startTimer(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.timeTrackingService.startTimer(orgId, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post('timer/:entryId/stop')
  stopTimer(@Req() req: any, @Param('orgId') orgId: string, @Param('entryId') entryId: string) {
    return this.timeTrackingService.stopTimer(orgId, req.user.id, entryId);
  }

  @Get(':entryId')
  findOne(@Param('orgId') orgId: string, @Param('entryId') entryId: string) {
    return this.timeTrackingService.findOne(orgId, entryId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Patch(':entryId')
  update(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('entryId') entryId: string,
    @Body() data: any,
  ) {
    return this.timeTrackingService.update(orgId, entryId, req.user.id, data, req.user.role);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post(':entryId/submit')
  submit(@Req() req: any, @Param('orgId') orgId: string, @Param('entryId') entryId: string) {
    return this.timeTrackingService.submit(orgId, entryId, req.user.id, req.user.role);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Post(':entryId/approve')
  approve(@Req() req: any, @Param('orgId') orgId: string, @Param('entryId') entryId: string) {
    return this.timeTrackingService.approve(orgId, entryId, req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Delete(':entryId')
  remove(@Req() req: any, @Param('orgId') orgId: string, @Param('entryId') entryId: string) {
    return this.timeTrackingService.remove(orgId, entryId, req.user.id, req.user.role);
  }
}
