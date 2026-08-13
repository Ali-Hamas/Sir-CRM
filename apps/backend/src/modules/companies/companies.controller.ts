import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post()
  create(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.companiesService.create(orgId, req.user?.id, data);
  }

  @Get()
  findAll(
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('industry') industry?: string,
    @Query('country') country?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.companiesService.findAll(orgId, {
      search,
      status,
      industry,
      country,
      assignedToId,
      sortBy,
      sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  getStats(@Param('orgId') orgId: string) {
    return this.companiesService.getStats(orgId);
  }

  @Get(':companyId')
  findOne(@Param('orgId') orgId: string, @Param('companyId') companyId: string) {
    return this.companiesService.findOne(orgId, companyId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Patch(':companyId')
  update(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('companyId') companyId: string,
    @Body() data: any,
  ) {
    return this.companiesService.update(orgId, companyId, req.user?.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Delete(':companyId')
  remove(@Req() req: any, @Param('orgId') orgId: string, @Param('companyId') companyId: string) {
    return this.companiesService.remove(orgId, companyId, req.user?.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post(':companyId/notes')
  addNote(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('companyId') companyId: string,
    @Body('content') content: string,
  ) {
    return this.companiesService.addNote(orgId, companyId, req.user?.id, content);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Delete(':companyId/notes/:noteId')
  removeNote(
    @Param('orgId') orgId: string,
    @Param('companyId') companyId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.companiesService.removeNote(orgId, companyId, noteId);
  }
}
