import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post()
  create(@Req() req: any, @Param('orgId') orgId: string, @Body() data: any) {
    return this.tasksService.create(orgId, req.user.id, data);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('projectId') projectId?: string,
    @Query('milestoneId') milestoneId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('reporterId') reporterId?: string,
    @Query('label') label?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tasksService.findAll(
      orgId,
      {
        search,
        status,
        priority,
        projectId,
        milestoneId,
        assigneeId,
        reporterId,
        label,
        sortBy,
        sortOrder,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
      req.user,
    );
  }

  @Get('stats')
  getStats(@Param('orgId') orgId: string, @Query('projectId') projectId?: string) {
    return this.tasksService.getStats(orgId, projectId);
  }

  @Get('kanban')
  getKanbanBoardDefault(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.tasksService.getKanbanBoard(orgId, projectId, req.user);
  }

  @Get('kanban/:projectId')
  getKanbanBoard(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.tasksService.getKanbanBoard(orgId, projectId, req.user);
  }

  @Get(':taskId')
  findOne(@Req() req: any, @Param('orgId') orgId: string, @Param('taskId') taskId: string) {
    return this.tasksService.findOne(orgId, taskId, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Patch(':taskId')
  update(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('taskId') taskId: string,
    @Body() data: any,
  ) {
    return this.tasksService.update(orgId, taskId, req.user.id, data, req.user.role);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Patch(':taskId/status')
  updateStatus(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('taskId') taskId: string,
    @Body('status') status: string,
  ) {
    return this.tasksService.updateStatus(orgId, taskId, req.user.id, status, req.user.role);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Delete(':taskId')
  remove(@Req() req: any, @Param('orgId') orgId: string, @Param('taskId') taskId: string) {
    return this.tasksService.remove(orgId, taskId, req.user.id);
  }

  // Comments
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post(':taskId/comments')
  addComment(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('taskId') taskId: string,
    @Body() data: { content: string },
  ) {
    return this.tasksService.addComment(orgId, taskId, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Delete(':taskId/comments/:commentId')
  removeComment(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.tasksService.removeComment(orgId, taskId, commentId, req.user.id);
  }

  // Checklists
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post(':taskId/checklists')
  addChecklist(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('taskId') taskId: string,
    @Body() data: { title: string; items?: string[] },
  ) {
    return this.tasksService.addChecklist(orgId, taskId, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Patch(':taskId/checklists/items/:itemId')
  updateChecklistItem(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('taskId') taskId: string,
    @Param('itemId') itemId: string,
    @Body() data: { isCompleted: boolean },
  ) {
    return this.tasksService.updateChecklistItem(orgId, taskId, itemId, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Delete(':taskId/checklists/:checklistId')
  removeChecklist(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('taskId') taskId: string,
    @Param('checklistId') checklistId: string,
  ) {
    return this.tasksService.removeChecklist(orgId, taskId, checklistId, req.user.id);
  }

  // Dependencies
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post(':taskId/dependencies')
  addDependency(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('taskId') taskId: string,
    @Body() data: { dependsOnId: string },
  ) {
    return this.tasksService.addDependency(orgId, taskId, req.user.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Delete(':taskId/dependencies/:dependencyId')
  removeDependency(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('taskId') taskId: string,
    @Param('dependencyId') dependencyId: string,
  ) {
    return this.tasksService.removeDependency(orgId, taskId, dependencyId, req.user.id);
  }
}
