import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post()
  create(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.proposalsService.create(orgId, req.user?.id, data);
  }

  @Get()
  findAll(
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.proposalsService.findAll(orgId, {
      search, status, companyId, ownerId, sortBy, sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  getStats(@Param('orgId') orgId: string) {
    return this.proposalsService.getStats(orgId);
  }

  @Get(':proposalId')
  findOne(@Param('orgId') orgId: string, @Param('proposalId') proposalId: string) {
    return this.proposalsService.findOne(orgId, proposalId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Patch(':proposalId')
  update(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('proposalId') proposalId: string,
    @Body() data: any,
  ) {
    return this.proposalsService.update(orgId, proposalId, req.user?.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Delete(':proposalId')
  remove(@Req() req: any, @Param('orgId') orgId: string, @Param('proposalId') proposalId: string) {
    return this.proposalsService.remove(orgId, proposalId, req.user?.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post(':proposalId/approve')
  approve(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('proposalId') proposalId: string,
    @Body() data: { action: string; comment?: string },
  ) {
    return this.proposalsService.approve(orgId, proposalId, req.user?.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post(':proposalId/send')
  send(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.proposalsService.send(orgId, proposalId, req.user?.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post(':proposalId/duplicate')
  duplicate(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.proposalsService.duplicate(orgId, proposalId, req.user?.id);
  }
}
