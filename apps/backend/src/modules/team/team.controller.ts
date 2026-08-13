import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  // --- TEAM CRUD ---
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('teams')
  createTeam(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.teamService.createTeam(orgId, req.user.id, data);
  }

  @Get('teams')
  findAllTeams(@Param('orgId') orgId: string) {
    return this.teamService.findAllTeams(orgId);
  }

  @Get('teams/:teamId')
  findOneTeam(@Param('orgId') orgId: string, @Param('teamId') teamId: string) {
    return this.teamService.findOneTeam(orgId, teamId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('teams/:teamId')
  updateTeam(@Req() req: any, @Param('orgId') orgId: string, @Param('teamId') teamId: string, @Body() data: any) {
    return this.teamService.updateTeam(orgId, teamId, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('teams/:teamId')
  removeTeam(@Req() req: any, @Param('orgId') orgId: string, @Param('teamId') teamId: string) {
    return this.teamService.removeTeam(orgId, teamId, req.user.id);
  }

  // --- MEMBERSHIP & INVITATIONS ---
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Post('invite')
  inviteMember(@Req() req: any, @Param('orgId') orgId: string, @Body() inviteData: any) {
    return this.teamService.inviteMember(orgId, req.user.id, inviteData);
  }

  @Get('members')
  getMembers(@Param('orgId') orgId: string, @Query() query: any) {
    return this.teamService.getMembers(orgId, {
      search: query.search,
      departmentId: query.departmentId,
      teamId: query.teamId,
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
    });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('members/:memberId/role')
  changeRole(@Param('orgId') orgId: string, @Param('memberId') memberId: string, @Body() data: { role: Role }) {
    return this.teamService.changeRole(orgId, memberId, data.role);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('members/:memberId')
  removeMember(@Param('orgId') orgId: string, @Param('memberId') memberId: string) {
    return this.teamService.removeMember(orgId, memberId);
  }
}

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly teamService: TeamService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':token/accept')
  acceptInvitation(@Req() req: any, @Param('token') token: string) {
    return this.teamService.acceptInvitation(token, req.user.id);
  }
}
