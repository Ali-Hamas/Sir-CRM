import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { IndexerService } from './indexer.service';
import { RankingService, ScoredChunk } from './ranking.service';

@Injectable()
export class RetrieverService {
  constructor(
    private prisma: PrismaService,
    private indexerService: IndexerService,
    private rankingService: RankingService,
  ) {}

  /**
   * Performs hybrid search across indexed chunks with metadata and source filtering.
   */
  async search(
    orgId: string,
    userId: string,
    query: string,
    searchType: 'KEYWORD' | 'SEMANTIC' | 'HYBRID' | string = 'HYBRID',
    sourceFilters: string[] = [],
    topK: number = 5,
  ) {
    const prisma = this.prisma as any;
    const startTime = Date.now();
    const index = await this.indexerService.getOrInitializeIndex(orgId);

    // Filter documents by organization and optional source filters
    const chunks = await prisma.rAGChunk?.findMany?.({
      where: {
        document: {
          organizationId: orgId,
          ...(sourceFilters && sourceFilters.length > 0
            ? { sourceType: { in: sourceFilters } }
            : {}),
        },
      },
      include: {
        document: {
          select: { sourceType: true, title: true },
        },
      },
      take: 200,
    }).catch(() => []) || [];

    // Rank chunks using RankingService
    const rankedResults: ScoredChunk[] = this.rankingService.rankChunks(query, chunks, topK);

    const executionTimeMs = Date.now() - startTime;

    // Log Search Query & Results
    const searchRecord = await prisma.rAGSearch?.create?.({
      data: {
        indexId: index.id,
        organizationId: orgId,
        userId,
        query,
        searchType: searchType || 'HYBRID',
        sourceFilters: JSON.stringify(sourceFilters || []),
        topK,
        executionTimeMs,
      },
    }).catch(() => ({ id: 'search-mock-id' }));

    if (searchRecord?.id) {
      for (let i = 0; i < rankedResults.length; i++) {
        const res = rankedResults[i];
        await prisma.rAGSearchResult?.create?.({
          data: {
            searchId: searchRecord.id,
            chunkId: res.chunkId,
            relevanceScore: res.relevanceScore,
            rank: i + 1,
          },
        }).catch(() => {});
      }
    }

    return {
      searchId: searchRecord?.id || 'search-mock-id',
      query,
      searchType,
      sourceFilters,
      totalMatches: rankedResults.length,
      executionTimeMs,
      results: rankedResults,
    };
  }
}
