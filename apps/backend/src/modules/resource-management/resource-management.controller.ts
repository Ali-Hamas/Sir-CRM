import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ResourceManagementService } from './resource-management.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/resource-allocations')
export class ResourceManagementController {
  constructor(private readonly resourceManagementService: ResourceManagementService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.resourceManagementService.createAllocation(orgId, req.user.id, data);
  }

  @Get()
  findAll(
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('projectId') projectId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.resourceManagementService.findAll(orgId, {
      search, projectId, userId, startDate, endDate, sortBy, sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  getStats(@Param('orgId') orgId: string) {
    return this.resourceManagementService.getStats(orgId);
  }

  @Get('workload')
  getTeamWorkload(@Param('orgId') orgId: string, @Query('projectId') projectId?: string) {
    return this.resourceManagementService.getTeamWorkload(orgId, projectId);
  }

  @Get(':allocationId')
  findOne(@Param('orgId') orgId: string, @Param('allocationId') allocationId: string) {
    return this.resourceManagementService.findOne(orgId, allocationId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Patch(':allocationId')
  update(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('allocationId') allocationId: string,
    @Body() data: any,
  ) {
    return this.resourceManagementService.update(orgId, allocationId, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Delete(':allocationId')
  remove(@Req() req: any, @Param('orgId') orgId: string, @Param('allocationId') allocationId: string) {
    return this.resourceManagementService.remove(orgId, allocationId, req.user.id);
  }
}
