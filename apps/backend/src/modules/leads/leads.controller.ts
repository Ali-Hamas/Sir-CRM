import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post()
  create(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.leadsService.create(orgId, req.user?.id, data);
  }

  @Get()
  findAll(
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('country') country?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leadsService.findAll(orgId, {
      search,
      status,
      source,
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
    return this.leadsService.getStats(orgId);
  }

  @Get(':leadId')
  findOne(@Param('orgId') orgId: string, @Param('leadId') leadId: string) {
    return this.leadsService.findOne(orgId, leadId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Patch(':leadId')
  update(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('leadId') leadId: string,
    @Body() data: any,
  ) {
    return this.leadsService.update(orgId, leadId, req.user?.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Delete(':leadId')
  remove(@Req() req: any, @Param('orgId') orgId: string, @Param('leadId') leadId: string) {
    return this.leadsService.remove(orgId, leadId, req.user?.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post(':leadId/notes')
  addNote(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('leadId') leadId: string,
    @Body('content') content: string,
  ) {
    return this.leadsService.addNote(orgId, leadId, req.user?.id, content);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Delete(':leadId/notes/:noteId')
  removeNote(
    @Param('orgId') orgId: string,
    @Param('leadId') leadId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.leadsService.removeNote(orgId, leadId, noteId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post(':leadId/convert')
  convert(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('leadId') leadId: string,
    @Body() data?: { companyId?: string },
  ) {
    return this.leadsService.convert(orgId, leadId, req.user?.id, data);
  }
}
