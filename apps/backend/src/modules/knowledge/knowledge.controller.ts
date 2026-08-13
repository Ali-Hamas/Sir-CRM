import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query,
  UseInterceptors, UploadedFile, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';
import { CreateKnowledgeCategoryDto } from './dtos/create-knowledge-category.dto';
import { UpdateKnowledgeCategoryDto } from './dtos/update-knowledge-category.dto';
import { CreateKnowledgeArticleDto } from './dtos/create-knowledge-article.dto';
import { UpdateKnowledgeArticleDto } from './dtos/update-knowledge-article.dto';
import { QueryKnowledgeArticleDto } from './dtos/query-knowledge-article.dto';
import { CreateKnowledgeCommentDto } from './dtos/create-knowledge-comment.dto';
import { UpdateKnowledgeCommentDto } from './dtos/update-knowledge-comment.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  // ===================================
  // DASHBOARD & FAVORITES
  // ===================================

  @Get('stats')
  getStats(@Param('orgId') orgId: string) {
    return this.knowledgeService.getDashboardStats(orgId);
  }

  @Get('favorites')
  getUserFavorites(@Req() req: any, @Param('orgId') orgId: string) {
    return this.knowledgeService.getUserFavorites(orgId, req.user.id);
  }

  // ===================================
  // CATEGORIES
  // ===================================

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post('categories')
  createCategory(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateKnowledgeCategoryDto,
  ) {
    return this.knowledgeService.createCategory(orgId, req.user.id, dto);
  }

  @Get('categories')
  findCategories(@Param('orgId') orgId: string) {
    return this.knowledgeService.findCategories(orgId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Patch('categories/:id')
  updateCategory(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeCategoryDto,
  ) {
    return this.knowledgeService.updateCategory(orgId, id, req.user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Delete('categories/:id')
  deleteCategory(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.deleteCategory(orgId, id, req.user.id);
  }

  // ===================================
  // ARTICLES
  // ===================================

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post('articles')
  createArticle(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateKnowledgeArticleDto,
  ) {
    return this.knowledgeService.createArticle(orgId, req.user.id, dto);
  }

  @Get('articles')
  findArticles(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Query() query: QueryKnowledgeArticleDto,
  ) {
    return this.knowledgeService.findArticles(orgId, query, req.user?.id);
  }

  @Get('articles/:id')
  findOneArticle(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.findArticleByIdOrSlug(orgId, id, req.user?.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Patch('articles/:id')
  updateArticle(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeArticleDto,
  ) {
    return this.knowledgeService.updateArticle(orgId, id, req.user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Delete('articles/:id')
  deleteArticle(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.deleteArticle(orgId, id, req.user.id);
  }

  // ===================================
  // FAVORITES
  // ===================================

  @Post('articles/:id/favorite')
  favoriteArticle(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.favoriteArticle(orgId, id, req.user.id);
  }

  @Delete('articles/:id/favorite')
  unfavoriteArticle(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.unfavoriteArticle(orgId, id, req.user.id);
  }

  // ===================================
  // REVISIONS
  // ===================================

  @Get('articles/:id/revisions')
  getRevisions(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.getRevisions(orgId, id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Post('articles/:id/revisions/:revisionId/restore')
  restoreRevision(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
  ) {
    return this.knowledgeService.restoreRevision(orgId, id, revisionId, req.user.id);
  }

  // ===================================
  // COMMENTS
  // ===================================

  @Post('articles/:id/comments')
  addComment(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: CreateKnowledgeCommentDto,
  ) {
    return this.knowledgeService.addComment(orgId, id, req.user.id, dto.content);
  }

  @Get('articles/:id/comments')
  getComments(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.getComments(orgId, id);
  }

  @Patch('comments/:id')
  updateComment(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeCommentDto,
  ) {
    return this.knowledgeService.updateComment(orgId, id, req.user.id, dto.content);
  }

  @Delete('comments/:id')
  deleteComment(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.deleteComment(orgId, id, req.user.id);
  }

  // ===================================
  // ATTACHMENTS
  // ===================================

  @Post('articles/:id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  addAttachment(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.knowledgeService.addAttachment(orgId, id, req.user.id, file);
  }

  @Get('articles/:id/attachments')
  getAttachments(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.getAttachments(orgId, id);
  }

  @Delete('attachments/:id')
  deleteAttachment(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.deleteAttachment(orgId, id, req.user.id);
  }
}
