import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post()
  create(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.opportunitiesService.create(orgId, req.user?.id, data);
  }

  @Get()
  findAll(
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @Query('companyId') companyId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('minValue') minValue?: string,
    @Query('maxValue') maxValue?: string,
    @Query('closeDateFrom') closeDateFrom?: string,
    @Query('closeDateTo') closeDateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.opportunitiesService.findAll(orgId, {
      search, status, stage, companyId, assignedToId,
      minValue: minValue ? parseFloat(minValue) : undefined,
      maxValue: maxValue ? parseFloat(maxValue) : undefined,
      closeDateFrom, closeDateTo, sortBy, sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('kanban')
  findByStage(@Param('orgId') orgId: string) {
    return this.opportunitiesService.findByStage(orgId);
  }

  @Get('stats')
  getStats(@Param('orgId') orgId: string) {
    return this.opportunitiesService.getStats(orgId);
  }

  @Get(':oppId')
  findOne(@Param('orgId') orgId: string, @Param('oppId') oppId: string) {
    return this.opportunitiesService.findOne(orgId, oppId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Patch(':oppId/stage')
  updateStage(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('oppId') oppId: string,
    @Body('stage') stage: string,
  ) {
    return this.opportunitiesService.updateStage(orgId, oppId, req.user?.id, stage);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Patch(':oppId')
  update(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('oppId') oppId: string,
    @Body() data: any,
  ) {
    return this.opportunitiesService.update(orgId, oppId, req.user?.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Delete(':oppId')
  remove(@Req() req: any, @Param('orgId') orgId: string, @Param('oppId') oppId: string) {
    return this.opportunitiesService.remove(orgId, oppId, req.user?.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post(':oppId/notes')
  addNote(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('oppId') oppId: string,
    @Body('content') content: string,
  ) {
    return this.opportunitiesService.addNote(orgId, oppId, req.user?.id, content);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Delete(':oppId/notes/:noteId')
  removeNote(
    @Param('orgId') orgId: string,
    @Param('oppId') oppId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.opportunitiesService.removeNote(orgId, oppId, noteId);
  }
}
