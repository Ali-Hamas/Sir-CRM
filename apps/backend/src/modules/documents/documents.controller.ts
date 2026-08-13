import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ===================================
  // FOLDERS
  // ===================================

  @Post('folders')
  createFolder(@Req() req: any, @Param('orgId') orgId: string, @Body() data: { name: string; parentId?: string }) {
    return this.documentsService.createFolder(orgId, req.user.id, data);
  }

  @Get('folders')
  getFolders(@Param('orgId') orgId: string, @Query('parentId') parentId?: string) {
    return this.documentsService.getFolders(orgId, parentId);
  }

  // ===================================
  // DOCUMENTS
  // ===================================

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @UploadedFile() file: any, // Express.Multer.File equivalent
    @Body('folderId') folderId?: string,
    @Body('moduleReference') moduleReference?: string
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentsService.uploadDocument(orgId, req.user.id, file, folderId, moduleReference);
  }

  @Get()
  getDocuments(
    @Param('orgId') orgId: string,
    @Query('folderId') folderId?: string,
    @Query('moduleReference') moduleReference?: string
  ) {
    return this.documentsService.getDocuments(orgId, folderId, moduleReference);
  }

  @Patch(':id/rename')
  renameDocument(@Req() req: any, @Param('orgId') orgId: string, @Param('id') id: string, @Body('name') name: string) {
    return this.documentsService.renameDocument(orgId, id, req.user.id, name);
  }

  @Patch(':id/move')
  moveDocument(@Req() req: any, @Param('orgId') orgId: string, @Param('id') id: string, @Body('folderId') folderId: string | null) {
    return this.documentsService.moveDocument(orgId, id, req.user.id, folderId);
  }

  @Delete(':id')
  deleteDocument(@Req() req: any, @Param('orgId') orgId: string, @Param('id') id: string) {
    return this.documentsService.softDeleteDocument(orgId, id, req.user.id);
  }
}
