import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AIAssistantService } from './ai-assistant.service';
import { AIAssistantCapabilityService } from './ai-assistant-capability.service';
import { AIAssistantPermissionService } from './ai-assistant-permission.service';
import { AIAssistantSessionService } from './ai-assistant-session.service';
import { AIAssistantExecutionService } from './ai-assistant-execution.service';
import { CreateAIAssistantDto } from './dto/create-assistant.dto';
import { UpdateAIAssistantDto } from './dto/update-assistant.dto';
import { ChatAIAssistantDto } from './dto/chat-assistant.dto';
import { UpdateCapabilitiesDto } from './dto/update-capabilities.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/ai/assistant')
export class AIAssistantController {
  constructor(
    private readonly assistantService: AIAssistantService,
    private readonly capabilityService: AIAssistantCapabilityService,
    private readonly permissionService: AIAssistantPermissionService,
    private readonly sessionService: AIAssistantSessionService,
    private readonly executionService: AIAssistantExecutionService,
  ) {}

  @Get()
  getAssistant(@Req() req: any, @Param('orgId') orgId: string) {
    return this.assistantService.getOrInitializeAssistant(orgId, req.user.id);
  }

  @Post()
  createAssistant(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateAIAssistantDto,
  ) {
    return this.assistantService.createAssistant(req.user.id, orgId, dto);
  }

  @Patch(':id')
  updateAssistant(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAIAssistantDto,
  ) {
    return this.assistantService.updateAssistant(id, orgId, req.user.id, dto);
  }

  @Delete(':id')
  removeAssistant(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.assistantService.removeAssistant(id, orgId, req.user.id);
  }

  @Post('chat')
  chat(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: ChatAIAssistantDto,
  ) {
    return this.assistantService.processChat(orgId, req.user.id, dto);
  }

  @Get('sessions')
  getSessions(@Param('orgId') orgId: string, @Query('limit') limit?: number) {
    return this.sessionService.listSessions(orgId, undefined, limit ? Number(limit) : 20);
  }

  @Get('executions')
  getExecutions(@Param('orgId') orgId: string, @Query('limit') limit?: number) {
    return this.executionService.listExecutions(orgId, limit ? Number(limit) : 30);
  }

  @Patch(':id/capabilities')
  updateCapabilities(
    @Param('id') id: string,
    @Body() dto: UpdateCapabilitiesDto,
  ) {
    return this.capabilityService.updateCapabilities(id, dto.capabilities);
  }

  @Patch(':id/permissions')
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.permissionService.updatePermissions(id, dto.permissions);
  }
}
