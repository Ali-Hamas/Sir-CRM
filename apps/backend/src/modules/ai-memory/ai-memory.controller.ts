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
import { AIMemoryService } from './services/ai-memory.service';
import { AIContextBuilderService } from './services/ai-context-builder.service';
import { CreateMemoryDto, UpdateMemoryDto, BuildContextDto, CreatePreferenceDto } from './dto/create-memory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/ai')
export class AIMemoryController {
  constructor(
    private readonly memoryService: AIMemoryService,
    private readonly contextBuilderService: AIContextBuilderService,
  ) {}

  @Post('memory')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  createMemory(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateMemoryDto,
  ) {
    return this.memoryService.createMemory(req.user.id, orgId, dto);
  }

  @Get('memory')
  findAllMemories(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('memoryType') memoryType?: string,
    @Query('source') source?: string,
    @Query('minImportance') minImportance?: number,
  ) {
    return this.memoryService.findAllMemories(req.user.id, orgId, req.user.role, { search, memoryType, source, minImportance });
  }

  @Get('memory/preferences')
  getPreferences(@Req() req: any, @Param('orgId') orgId: string) {
    return this.memoryService.getPreferences(req.user.id, orgId);
  }

  @Post('memory/preferences')
  setPreference(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreatePreferenceDto,
  ) {
    return this.memoryService.setPreference(req.user.id, orgId, dto);
  }

  @Get('memory/:id')
  findOneMemory(@Req() req: any, @Param('id') id: string, @Param('orgId') orgId: string) {
    return this.memoryService.findOneMemory(id, req.user.id, orgId, req.user.role);
  }

  @Patch('memory/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  updateMemory(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Body() dto: UpdateMemoryDto,
  ) {
    return this.memoryService.updateMemory(id, req.user.id, orgId, dto, req.user.role);
  }

  @Delete('memory/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  removeMemory(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
  ) {
    return this.memoryService.removeMemory(id, req.user.id, orgId, req.user.role);
  }

  @Post('context/build')
  buildContext(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: BuildContextDto,
  ) {
    return this.contextBuilderService.buildContext(req.user.id, orgId, dto);
  }

  @Get('context/:conversationId')
  getConversationContext(@Param('conversationId') conversationId: string) {
    return this.contextBuilderService.getConversationContext(conversationId);
  }
}
