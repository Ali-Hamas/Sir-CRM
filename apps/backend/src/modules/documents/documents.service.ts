import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { StorageService } from './storage.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private activityService: ActivityService
  ) {}

  // ===================================
  // FOLDERS
  // ===================================

  async createFolder(orgId: string, userId: string, data: { name: string; parentId?: string }) {
    const folder = await this.prisma.folder.create({
      data: {
        name: data.name,
        parentId: data.parentId,
        organizationId: orgId,
        ownerId: userId,
      },
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'FOLDER_CREATED',
      module: 'DOCUMENTS',
      entityType: 'FOLDER',
      entityId: folder.id,
      metadata: { name: folder.name },
    });

    return folder;
  }

  async getFolders(orgId: string, parentId?: string) {
    return this.prisma.folder.findMany({
      where: {
        organizationId: orgId,
        parentId: parentId || null,
        isDeleted: false,
      },
      include: {
        _count: { select: { children: true, documents: true } }
      }
    });
  }

  // ===================================
  // DOCUMENTS
  // ===================================

  async uploadDocument(orgId: string, userId: string, file: any, folderId?: string, moduleReference?: string) {
    // 1. Upload to storage adapter
    const uploaded = await this.storage.uploadFile(file);

    // 2. Save metadata in Prisma
    const document = await this.prisma.document.create({
      data: {
        name: file.originalname,
        originalName: file.originalname,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        storagePath: uploaded.key,
        extension: file.originalname.split('.').pop(),
        organizationId: orgId,
        ownerId: userId,
        folderId,
        moduleReference,
      },
    });

    // 3. Track initial version
    await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        versionNum: 1,
        size: uploaded.size,
        storagePath: uploaded.key,
        createdBy: userId,
      }
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'DOCUMENT_UPLOADED',
      module: 'DOCUMENTS',
      entityType: 'DOCUMENT',
      entityId: document.id,
      metadata: { name: document.name, size: uploaded.size },
    });

    return document;
  }

  async getDocuments(orgId: string, folderId?: string, moduleReference?: string) {
    const where: any = { organizationId: orgId, isDeleted: false };
    
    if (moduleReference) {
      where.moduleReference = moduleReference;
    } else {
      where.folderId = folderId || null;
    }

    return this.prisma.document.findMany({
      where,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } },
        tags: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async renameDocument(orgId: string, id: string, userId: string, name: string) {
    const existing = await this.prisma.document.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Document not found');

    return this.prisma.document.update({
      where: { id },
      data: { name }
    });
  }

  async moveDocument(orgId: string, id: string, userId: string, newFolderId: string | null) {
    const existing = await this.prisma.document.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Document not found');

    return this.prisma.document.update({
      where: { id },
      data: { folderId: newFolderId }
    });
  }

  async softDeleteDocument(orgId: string, id: string, userId: string) {
    const existing = await this.prisma.document.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Document not found');

    const doc = await this.prisma.document.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'DOCUMENT_DELETED',
      module: 'DOCUMENTS',
      entityType: 'DOCUMENT',
      entityId: doc.id,
    });

    return doc;
  }
}
