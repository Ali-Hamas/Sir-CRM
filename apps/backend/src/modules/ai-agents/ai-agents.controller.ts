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
import { AIAgentsService } from './ai-agents.service';
import { CreateAIAgentDto } from './dto/create-agent.dto';
import { UpdateAIAgentDto } from './dto/update-agent.dto';
import { ChatAIAgentDto } from './dto/chat-agent.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/ai/agents')
export class AIAgentsController {
  constructor(private readonly agentsService: AIAgentsService) {}

  @Get()
  listAgents(@Req() req: any, @Param('orgId') orgId: string) {
    return this.agentsService.listAgents(orgId, req.user.id);
  }

  @Post()
  createAgent(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateAIAgentDto,
  ) {
    return this.agentsService.createAgent(orgId, req.user.id, dto);
  }

  @Get(':id')
  getAgent(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.agentsService.getAgent(orgId, id);
  }

  @Patch(':id')
  updateAgent(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAIAgentDto,
  ) {
    return this.agentsService.updateAgent(orgId, id, req.user.id, dto);
  }

  @Delete(':id')
  removeAgent(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.agentsService.removeAgent(orgId, id, req.user.id);
  }

  @Post(':id/chat')
  chatAgent(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: ChatAIAgentDto,
  ) {
    return this.agentsService.chatAgent(orgId, id, req.user.id, dto);
  }

  @Get(':id/executions')
  getExecutions(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.agentsService.listExecutions(orgId, id, limit ? Number(limit) : 30);
  }
}
