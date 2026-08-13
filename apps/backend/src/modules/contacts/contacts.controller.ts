import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post()
  create(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.contactsService.create(orgId, req.user?.id, data);
  }

  @Get()
  findAll(
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
    @Query('country') country?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contactsService.findAll(orgId, {
      search,
      status,
      companyId,
      country,
      assignedToId,
      sortBy,
      sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('company/:companyId')
  getByCompany(@Param('orgId') orgId: string, @Param('companyId') companyId: string) {
    return this.contactsService.getByCompany(orgId, companyId);
  }

  @Get(':contactId')
  findOne(@Param('orgId') orgId: string, @Param('contactId') contactId: string) {
    return this.contactsService.findOne(orgId, contactId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Patch(':contactId')
  update(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('contactId') contactId: string,
    @Body() data: any,
  ) {
    return this.contactsService.update(orgId, contactId, req.user?.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Delete(':contactId')
  remove(@Req() req: any, @Param('orgId') orgId: string, @Param('contactId') contactId: string) {
    return this.contactsService.remove(orgId, contactId, req.user?.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Post(':contactId/notes')
  addNote(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('contactId') contactId: string,
    @Body('content') content: string,
  ) {
    return this.contactsService.addNote(orgId, contactId, req.user?.id, content);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Delete(':contactId/notes/:noteId')
  removeNote(
    @Param('orgId') orgId: string,
    @Param('contactId') contactId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.contactsService.removeNote(orgId, contactId, noteId);
  }
}
