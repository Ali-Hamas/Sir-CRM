import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post()
  create(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.meetingsService.create(orgId, req.user?.id, data);
  }

  @Get()
  findAll(
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('meetingType') meetingType?: string,
    @Query('companyId') companyId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('upcoming') upcoming?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.meetingsService.findAll(orgId, {
      search, status, meetingType, companyId, dateFrom, dateTo, upcoming, sortBy, sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('calendar')
  getCalendar(
    @Param('orgId') orgId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    return this.meetingsService.getCalendar(
      orgId,
      year ? parseInt(year, 10) : now.getFullYear(),
      month ? parseInt(month, 10) : now.getMonth() + 1,
    );
  }

  @Get('stats')
  getStats(@Param('orgId') orgId: string) {
    return this.meetingsService.getStats(orgId);
  }

  @Get(':meetingId')
  findOne(@Param('orgId') orgId: string, @Param('meetingId') meetingId: string) {
    return this.meetingsService.findOne(orgId, meetingId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Patch(':meetingId')
  update(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('meetingId') meetingId: string,
    @Body() data: any,
  ) {
    return this.meetingsService.update(orgId, meetingId, req.user?.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Delete(':meetingId')
  remove(@Req() req: any, @Param('orgId') orgId: string, @Param('meetingId') meetingId: string) {
    return this.meetingsService.remove(orgId, meetingId, req.user?.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post(':meetingId/notes')
  addNote(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('meetingId') meetingId: string,
    @Body('content') content: string,
  ) {
    return this.meetingsService.addNote(orgId, meetingId, req.user?.id, content);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Delete(':meetingId/notes/:noteId')
  removeNote(
    @Param('orgId') orgId: string,
    @Param('meetingId') meetingId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.meetingsService.removeNote(orgId, meetingId, noteId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post(':meetingId/action-items')
  addActionItem(
    @Param('orgId') orgId: string,
    @Param('meetingId') meetingId: string,
    @Body() data: any,
  ) {
    return this.meetingsService.addActionItem(orgId, meetingId, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Patch(':meetingId/action-items/:itemId')
  updateActionItem(
    @Param('orgId') orgId: string,
    @Param('meetingId') meetingId: string,
    @Param('itemId') itemId: string,
    @Body() data: any,
  ) {
    return this.meetingsService.updateActionItem(orgId, meetingId, itemId, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Delete(':meetingId/action-items/:itemId')
  removeActionItem(
    @Param('orgId') orgId: string,
    @Param('meetingId') meetingId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.meetingsService.removeActionItem(orgId, meetingId, itemId);
  }
}
