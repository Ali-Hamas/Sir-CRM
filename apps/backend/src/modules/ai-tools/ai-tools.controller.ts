import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ToolRegistryService } from './tool-registry.service';
import { ToolExecutorService } from './tool-executor.service';
import { ToolPermissionService } from './tool-permission.service';
import { ToolExecutionLoggerService } from './tool-execution-logger.service';
import { ExecuteToolDto } from './dto/execute-tool.dto';
import { UpdateToolPermissionsDto } from './dto/update-tool-permission.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/ai/tools')
export class AIToolsController {
  constructor(
    private readonly registryService: ToolRegistryService,
    private readonly executorService: ToolExecutorService,
    private readonly permissionService: ToolPermissionService,
    private readonly loggerService: ToolExecutionLoggerService,
  ) {}

  @Get()
  getTools() {
    return this.registryService.getAllTools();
  }

  @Get('categories')
  getCategories() {
    return this.registryService.getAllCategories();
  }

  @Get('executions')
  getExecutions(@Param('orgId') orgId: string, @Query('limit') limit?: number) {
    return this.loggerService.listExecutions(orgId, limit ? Number(limit) : 30);
  }

  @Post('execute')
  executeTool(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: ExecuteToolDto,
  ) {
    return this.executorService.executeTool(
      dto.toolKey,
      orgId,
      req.user.id,
      dto.params,
      dto.workspaceId,
      dto.assistantId,
    );
  }

  @Patch(':toolId/permissions')
  updatePermissions(
    @Param('toolId') toolId: string,
    @Body() dto: UpdateToolPermissionsDto,
  ) {
    return this.permissionService.updateToolPermissions(toolId, dto.permissions);
  }
}
