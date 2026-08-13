import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AIOrchestratorService } from './ai-orchestrator.service';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/ai/orchestrator')
export class AIOrchestratorController {
  constructor(private readonly orchestratorService: AIOrchestratorService) {}

  @Post('execute')
  executeWorkflow(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: ExecuteWorkflowDto,
  ) {
    return this.orchestratorService.executeWorkflow(orgId, req.user.id, dto);
  }

  @Get('workflows')
  listWorkflows(
    @Param('orgId') orgId: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    return this.orchestratorService.listWorkflows(orgId, limit ? Number(limit) : 20, skip ? Number(skip) : 0);
  }

  @Get('workflows/:workflowId')
  getWorkflow(
    @Param('orgId') orgId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.orchestratorService.getWorkflow(orgId, workflowId);
  }

  @Get('workflows/:workflowId/logs')
  getWorkflowLogs(
    @Param('orgId') orgId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.orchestratorService.getWorkflowLogs(orgId, workflowId);
  }

  @Get('workflows/:workflowId/context')
  getSharedContext(
    @Param('orgId') orgId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.orchestratorService.getSharedContext(orgId, workflowId);
  }

  @Get('workflows/:workflowId/delegations')
  getDelegationGraph(
    @Param('orgId') orgId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.orchestratorService.getDelegationGraph(orgId, workflowId);
  }

  @Get('workflows/:workflowId/graph')
  getExecutionGraph(
    @Param('orgId') orgId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.orchestratorService.getExecutionGraph(orgId, workflowId);
  }
}
