import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DocumentsService } from '../../documents/documents.service';

@Injectable()
export class DocumentExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
  ) {}

  async executeDocumentTool(toolKey: string, orgId: string, userId: string, params: Record<string, any>) {
    switch (toolKey) {
      case 'documents_upload': {
        // Create document metadata entry in database
        const document = await (this.prisma as any).document.create({
          data: {
            name: params.fileName,
            originalName: params.fileName,
            mimeType: params.mimeType || 'application/octet-stream',
            size: params.size ? Number(params.size) : 1024,
            storagePath: `storage/uploads/${params.fileName}`,
            extension: params.fileName.split('.').pop() || 'doc',
            organizationId: orgId,
            ownerId: userId,
            folderId: params.folderId || null,
            moduleReference: params.moduleReference || null,
          },
        });

        return {
          documentId: document.id,
          name: document.name,
          size: document.size,
          mimeType: document.mimeType,
          summary: `Registered document file metadata "${document.name}" (ID: ${document.id})`,
        };
      }

      case 'documents_download': {
        const doc = await (this.prisma as any).document.findFirst({
          where: { id: params.documentId, organizationId: orgId, isDeleted: false },
        });

        if (!doc) {
          throw new NotFoundException(`Document with ID '${params.documentId}' not found`);
        }

        return {
          documentId: doc.id,
          name: doc.name,
          downloadUrl: `/api/v1/documents/${doc.id}/download`,
          summary: `Generated secure download URL for "${doc.name}"`,
        };
      }

      default:
        throw new NotFoundException(`Document tool handler '${toolKey}' not found`);
    }
  }
}
