import { Injectable } from '@nestjs/common';
import { RetrieverService } from './retriever.service';

@Injectable()
export class ContextBuilderService {
  constructor(private retrieverService: RetrieverService) {}

  /**
   * Assembles a structured multi-source JSON context payload for AI Assistant prompts.
   */
  async buildContextPayload(
    orgId: string,
    userId: string,
    query: string,
    sources?: string[],
    maxTokenLimit: number = 2048,
  ) {
    const searchResult = await this.retrieverService.search(
      orgId,
      userId,
      query,
      'HYBRID',
      sources || [],
      8,
    );

    const matchesBySource: Record<string, any[]> = {};
    let accumulatedTokens = 0;
    const includedChunks: any[] = [];

    for (const res of searchResult.results) {
      if (accumulatedTokens + res.tokenCount > maxTokenLimit) break;

      if (!matchesBySource[res.sourceType]) {
        matchesBySource[res.sourceType] = [];
      }

      matchesBySource[res.sourceType].push({
        title: res.title,
        content: res.content,
        relevanceScore: res.relevanceScore,
        metadata: res.metadata,
      });

      includedChunks.push({
        chunkId: res.chunkId,
        sourceType: res.sourceType,
        title: res.title,
        relevanceScore: res.relevanceScore,
      });

      accumulatedTokens += res.tokenCount;
    }

    // Format final prompt-ready string
    let promptContextFormatted = `=== RAG CONTEXT PAYLOAD (Query: "${query}") ===\n\n`;
    for (const [sourceType, items] of Object.entries(matchesBySource)) {
      promptContextFormatted += `--- SOURCE: ${sourceType} ---\n`;
      for (const item of items) {
        promptContextFormatted += `[${item.title}] (Relevance: ${item.relevanceScore})\n${item.content}\n\n`;
      }
    }

    return {
      query,
      tokensUsed: accumulatedTokens,
      tokenLimit: maxTokenLimit,
      sourcesCount: Object.keys(matchesBySource).length,
      includedChunksCount: includedChunks.length,
      contextBySource: matchesBySource,
      includedChunks,
      promptContextFormatted,
    };
  }
}
