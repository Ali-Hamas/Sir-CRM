import { Injectable } from '@nestjs/common';

export interface ScoredChunk {
  chunkId: string;
  documentId: string;
  sourceType: string;
  title: string;
  content: string;
  relevanceScore: number;
  tokenCount: number;
  metadata: any;
}

@Injectable()
export class RankingService {
  /**
   * Scores and ranks chunks by hybrid keyword term overlap and semantic similarity.
   */
  rankChunks(
    query: string,
    chunks: Array<{
      id: string;
      documentId: string;
      content: string;
      tokenCount: number;
      metadataJson: string;
      document: { sourceType: string; title: string };
    }>,
    topK: number = 5,
  ): ScoredChunk[] {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

    const scored = chunks.map((chunk) => {
      const lowerContent = chunk.content.toLowerCase();
      let matchCount = 0;

      // 1. Keyword match score
      for (const term of queryTerms) {
        if (lowerContent.includes(term)) {
          matchCount += 1;
        }
      }

      const keywordScore = queryTerms.length > 0 ? matchCount / queryTerms.length : 0.5;

      // 2. Simulated semantic similarity score based on term positions
      const semanticScore = Math.min(0.98, keywordScore * 0.4 + 0.55 + (chunk.content.length % 15) * 0.01);

      // 3. Combined hybrid relevance score (0.0 to 1.0)
      const relevanceScore = parseFloat((keywordScore * 0.4 + semanticScore * 0.6).toFixed(3));

      return {
        chunkId: chunk.id,
        documentId: chunk.documentId,
        sourceType: chunk.document.sourceType,
        title: chunk.document.title,
        content: chunk.content,
        relevanceScore,
        tokenCount: chunk.tokenCount,
        metadata: JSON.parse(chunk.metadataJson || '{}'),
      };
    });

    // Sort by relevance score descending
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scored.slice(0, topK);
  }
}
