import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post()
  create(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.contractsService.create(orgId, req.user?.id, data);
  }

  @Get()
  findAll(
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
    @Query('contractType') contractType?: string,
    @Query('expiringSoon') expiringSoon?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contractsService.findAll(orgId, {
      search, status, companyId, contractType, expiringSoon, sortBy, sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  getStats(@Param('orgId') orgId: string) {
    return this.contractsService.getStats(orgId);
  }

  @Get(':contractId')
  findOne(@Param('orgId') orgId: string, @Param('contractId') contractId: string) {
    return this.contractsService.findOne(orgId, contractId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Patch(':contractId')
  update(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('contractId') contractId: string,
    @Body() data: any,
  ) {
    return this.contractsService.update(orgId, contractId, req.user?.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Delete(':contractId')
  remove(@Req() req: any, @Param('orgId') orgId: string, @Param('contractId') contractId: string) {
    return this.contractsService.remove(orgId, contractId, req.user?.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post(':contractId/activate')
  activate(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('contractId') contractId: string,
  ) {
    return this.contractsService.activate(orgId, contractId, req.user?.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post(':contractId/renew')
  renew(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('contractId') contractId: string,
  ) {
    return this.contractsService.renew(orgId, contractId, req.user?.id);
  }
}
