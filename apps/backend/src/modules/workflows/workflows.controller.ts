import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsExecutionService } from './workflows-execution.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/create-workflow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/workflows')
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly executionService: WorkflowsExecutionService,
  ) {}

  @Get('stats')
  getDashboardStats(@Param('orgId') orgId: string) {
    return this.workflowsService.getDashboardStats(orgId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.workflowsService.create(req.user.id, orgId, dto);
  }

  @Get()
  findAll(
    @Param('orgId') orgId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.workflowsService.findAll(orgId, {
      status,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.workflowsService.findOne(id, orgId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(id, req.user.id, orgId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  remove(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
  ) {
    return this.workflowsService.remove(id, req.user.id, orgId);
  }

  @Get(':id/executions')
  getExecutions(
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.workflowsService.getExecutions(
      id,
      orgId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post(':id/test')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async testWorkflow(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Body() payload: any,
  ) {
    const workflow = await this.workflowsService.findOne(id, orgId);
    const primaryTrigger = workflow.triggers?.[0]?.type || 'MANUAL_TEST';

    return this.executionService.executeWorkflow(workflow, {
      type: primaryTrigger,
      organizationId: orgId,
      userId: req.user.id,
      entityType: payload.entityType || 'TEST_ENTITY',
      entityId: payload.entityId || 'test-123',
      entityData: payload.entityData || { status: 'ACTIVE', priority: 'HIGH', title: 'Test Workflow Event' },
    });
  }
}
