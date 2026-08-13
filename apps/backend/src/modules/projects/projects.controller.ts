import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post()
  create(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.projectsService.create(orgId, req.user.id, data);
  }

  @Get()
  findAll(
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('companyId') companyId?: string,
    @Query('projectManagerId') projectManagerId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.projectsService.findAll(orgId, {
      search, status, priority, companyId, projectManagerId, sortBy, sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  getStats(@Param('orgId') orgId: string) {
    return this.projectsService.getStats(orgId);
  }

  // Create from contract
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post('from-contract/:contractId')
  createFromContract(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('contractId') contractId: string,
    @Body() data?: any,
  ) {
    return this.projectsService.createFromContract(orgId, contractId, req.user.id, data);
  }

  @Get(':projectId')
  findOne(@Param('orgId') orgId: string, @Param('projectId') projectId: string) {
    return this.projectsService.findOne(orgId, projectId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Patch(':projectId')
  update(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Body() data: any,
  ) {
    return this.projectsService.update(orgId, projectId, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Delete(':projectId')
  remove(@Req() req: any, @Param('orgId') orgId: string, @Param('projectId') projectId: string) {
    return this.projectsService.remove(orgId, projectId, req.user.id);
  }

  // Members
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post(':projectId/members')
  addMember(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Body() data: { memberId: string; role?: string },
  ) {
    return this.projectsService.addMember(orgId, projectId, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Delete(':projectId/members/:memberId')
  removeMember(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.projectsService.removeMember(orgId, projectId, req.user.id, memberId);
  }

  // Phases
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post(':projectId/phases')
  addPhase(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Body() data: any,
  ) {
    return this.projectsService.addPhase(orgId, projectId, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Patch(':projectId/phases/:phaseId')
  updatePhase(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
    @Body() data: any,
  ) {
    return this.projectsService.updatePhase(orgId, projectId, phaseId, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Delete(':projectId/phases/:phaseId')
  removePhase(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
  ) {
    return this.projectsService.removePhase(orgId, projectId, phaseId, req.user.id);
  }

  // Milestones
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post(':projectId/milestones')
  addMilestone(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Body() data: any,
  ) {
    return this.projectsService.addMilestone(orgId, projectId, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Patch(':projectId/milestones/:milestoneId')
  updateMilestone(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() data: any,
  ) {
    return this.projectsService.updateMilestone(orgId, projectId, milestoneId, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Delete(':projectId/milestones/:milestoneId')
  removeMilestone(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.projectsService.removeMilestone(orgId, projectId, milestoneId, req.user.id);
  }

}
