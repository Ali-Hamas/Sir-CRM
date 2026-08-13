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
import { AIChatService } from './ai-chat.service';
import { CreateConversationDto, UpdateConversationDto, CreateMessageDto, CreateFolderDto } from './dto/create-chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/ai/chat')
export class AIChatController {
  constructor(private readonly aiChatService: AIChatService) {}

  @Post('conversations')
  createConversation(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.aiChatService.createConversation(req.user.id, orgId, dto);
  }

  @Get('conversations')
  findAllConversations(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Query('folderId') folderId?: string,
  ) {
    return this.aiChatService.findAllConversations(req.user.id, orgId, folderId);
  }

  @Get('conversations/:id')
  findOneConversation(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
  ) {
    return this.aiChatService.findOneConversation(id, req.user.id, orgId);
  }

  @Patch('conversations/:id')
  updateConversation(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.aiChatService.updateConversation(id, req.user.id, orgId, dto);
  }

  @Delete('conversations/:id')
  removeConversation(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
  ) {
    return this.aiChatService.removeConversation(id, req.user.id, orgId);
  }

  @Post('conversations/:id/pin')
  togglePin(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
  ) {
    return this.aiChatService.togglePin(id, req.user.id, orgId);
  }

  @Post('messages')
  createMessage(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.aiChatService.createMessage(req.user.id, orgId, dto);
  }

  @Get('messages/:conversationId')
  getMessages(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Param('orgId') orgId: string,
  ) {
    return this.aiChatService.getMessages(conversationId, req.user.id, orgId);
  }

  @Post('folders')
  createFolder(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.aiChatService.createFolder(req.user.id, orgId, dto);
  }

  @Get('folders')
  getFolders(
    @Req() req: any,
    @Param('orgId') orgId: string,
  ) {
    return this.aiChatService.getFolders(req.user.id, orgId);
  }
}
