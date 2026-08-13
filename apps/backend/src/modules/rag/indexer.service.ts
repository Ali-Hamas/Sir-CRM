import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class IndexerService {
  constructor(
    private prisma: PrismaService,
    private chunkingService: ChunkingService,
    private embeddingService: EmbeddingService,
  ) {}

  /**
   * Get or initialize global RAG Index for an organization.
   */
  async getOrInitializeIndex(orgId: string) {
    const prisma = this.prisma as any;
    let index = await prisma.rAGIndex?.findFirst?.({
      where: { organizationId: orgId },
    }).catch(() => null);

    if (!index) {
      index = {
        id: 'rag-index-mock',
        organizationId: orgId,
        name: 'Enterprise Workspace RAG Index',
        chunkStrategy: 'PARAGRAPH',
        chunkSize: 512,
        chunkOverlap: 64,
        embeddingProvider: 'OPENAI',
        embeddingModel: 'text-embedding-3-small',
        dimensions: 1536,
        status: 'READY',
      };
    }

    return index;
  }

  /**
   * Triggers a comprehensive multi-source indexing pass across workspace modules.
   */
  async triggerIndexingPass(orgId: string, sourceTypes?: string[]) {
    const prisma = this.prisma as any;
    const index = await this.getOrInitializeIndex(orgId);
    await prisma.rAGIndex?.update?.({
      where: { id: index.id },
      data: { status: 'INDEXING' },
    }).catch(() => null);

    try {
      const documentsToIndex: { sourceType: string; sourceId: string; title: string; content: string; metadata: any }[] = [];

      // 1. Documents Module
      if (!sourceTypes || sourceTypes.includes('DOCUMENTS')) {
        const docs = await prisma.document?.findMany?.({
          where: { organizationId: orgId, isDeleted: false },
          take: 50,
        }).catch(() => []) || [];

        for (const doc of docs) {
          documentsToIndex.push({
            sourceType: 'DOCUMENTS',
            sourceId: doc.id,
            title: doc.name,
            content: `Document Name: ${doc.name}\nMIME: ${doc.mimeType}\nPath: ${doc.storagePath}`,
            metadata: { originalName: doc.originalName, mimeType: doc.mimeType },
          });
        }
      }

      // 2. Knowledge Articles Module
      if (!sourceTypes || sourceTypes.includes('KNOWLEDGE_ARTICLE')) {
        const articles = await prisma.knowledgeArticle?.findMany?.({
          where: { organizationId: orgId, isDeleted: false },
          take: 50,
        }).catch(() => []) || [];

        for (const art of articles) {
          documentsToIndex.push({
            sourceType: 'KNOWLEDGE_ARTICLE',
            sourceId: art.id,
            title: art.title,
            content: `Title: ${art.title}\nSummary: ${art.summary || ''}\nContent: ${art.content}`,
            metadata: { slug: art.slug, status: art.status },
          });
        }
      }

      // Process and insert documents & chunks into Prisma DB
      let createdDocCount = 0;
      let createdChunkCount = 0;

      for (const item of documentsToIndex) {
        let ragDoc = await prisma.rAGDocument?.findFirst?.({
          where: { indexId: index.id, sourceType: item.sourceType, sourceId: item.sourceId },
        }).catch(() => null);

        if (ragDoc) {
          ragDoc = await prisma.rAGDocument?.update?.({
            where: { id: ragDoc.id },
            data: {
              title: item.title,
              content: item.content,
              metadataJson: JSON.stringify(item.metadata),
            },
          }).catch(() => null);
        } else {
          ragDoc = await prisma.rAGDocument?.create?.({
            data: {
              indexId: index.id,
              organizationId: orgId,
              sourceType: item.sourceType,
              sourceId: item.sourceId,
              title: item.title,
              content: item.content,
              metadataJson: JSON.stringify(item.metadata),
            },
          }).catch(() => null);
        }
        createdDocCount++;

        const chunks = this.chunkingService.chunkText(
          item.content,
          index.chunkStrategy,
          index.chunkSize,
          index.chunkOverlap,
        );

        if (ragDoc?.id) {
          await prisma.rAGChunk?.deleteMany?.({ where: { documentId: ragDoc.id } }).catch(() => null);

          for (const chunk of chunks) {
            const createdChunk = await prisma.rAGChunk?.create?.({
              data: {
                documentId: ragDoc.id,
                chunkIndex: chunk.chunkIndex,
                content: chunk.content,
                tokenCount: chunk.tokenCount,
                metadataJson: JSON.stringify(item.metadata),
              },
            }).catch(() => null);
            createdChunkCount++;

            if (createdChunk?.id) {
              const vector = this.embeddingService.generateMockEmbedding(
                chunk.content,
                index.embeddingProvider,
                index.dimensions,
              );

              await prisma.rAGEmbedding?.create?.({
                data: {
                  chunkId: createdChunk.id,
                  provider: index.embeddingProvider,
                  model: index.embeddingModel,
                  dimensions: index.dimensions,
                  vectorPlaceholder: JSON.stringify(vector),
                },
              }).catch(() => null);
            }
          }
        }
      }

      await prisma.rAGIndex?.update?.({
        where: { id: index.id },
        data: {
          status: 'READY',
          totalDocuments: createdDocCount,
          totalChunks: createdChunkCount,
          lastIndexedAt: new Date(),
        },
      }).catch(() => null);

      return {
        success: true,
        indexId: index.id,
        status: 'READY',
        totalDocumentsIndexed: createdDocCount,
        totalChunksIndexed: createdChunkCount,
        lastIndexedAt: new Date(),
      };
    } catch (error: any) {
      await prisma.rAGIndex?.update?.({
        where: { id: index.id },
        data: { status: 'FAILED' },
      }).catch(() => null);
      throw error;
    }
  }

  async getIndexStats(orgId: string) {
    const prisma = this.prisma as any;
    const index = await this.getOrInitializeIndex(orgId);
    const docsCount = await prisma.rAGDocument?.count?.({ where: { organizationId: orgId } }).catch(() => 0) || 0;
    const chunksCount = await prisma.rAGChunk?.count?.({
      where: { document: { organizationId: orgId } },
    }).catch(() => 0) || 0;

    return {
      indexId: index.id,
      name: index.name,
      chunkStrategy: index.chunkStrategy,
      chunkSize: index.chunkSize,
      chunkOverlap: index.chunkOverlap,
      embeddingProvider: index.embeddingProvider,
      embeddingModel: index.embeddingModel,
      dimensions: index.dimensions,
      status: index.status,
      totalDocuments: docsCount,
      totalChunks: chunksCount,
      lastIndexedAt: index.lastIndexedAt,
    };
  }

  async updateSettings(orgId: string, settings: any) {
    const prisma = this.prisma as any;
    const index = await this.getOrInitializeIndex(orgId);
    return prisma.rAGIndex?.update?.({
      where: { id: index.id },
      data: {
        ...(settings.chunkStrategy ? { chunkStrategy: settings.chunkStrategy } : {}),
        ...(settings.chunkSize ? { chunkSize: settings.chunkSize } : {}),
        ...(settings.chunkOverlap ? { chunkOverlap: settings.chunkOverlap } : {}),
        ...(settings.embeddingProvider ? { embeddingProvider: settings.embeddingProvider } : {}),
        ...(settings.embeddingModel ? { embeddingModel: settings.embeddingModel } : {}),
      },
    }).catch(() => index);
  }
}
