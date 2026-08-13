import { Injectable } from '@nestjs/common';

export interface ChunkResult {
  chunkIndex: number;
  content: string;
  tokenCount: number;
}

@Injectable()
export class ChunkingService {
  /**
   * Chunks text based on requested strategy, chunkSize (characters/tokens approximation), and overlap.
   */
  chunkText(
    text: string,
    strategy: 'DOCUMENT' | 'MARKDOWN' | 'PARAGRAPH' | 'SENTENCE' | string = 'PARAGRAPH',
    chunkSize: number = 512,
    chunkOverlap: number = 64,
  ): ChunkResult[] {
    if (!text || text.trim().length === 0) return [];

    let rawUnits: string[] = [];

    switch (strategy.toUpperCase()) {
      case 'DOCUMENT':
        rawUnits = [text];
        break;

      case 'MARKDOWN':
        // Split by markdown headers (#, ##, ###) or double newlines
        rawUnits = text.split(/(?=\n#{1,3}\s)/g).filter(Boolean);
        break;

      case 'SENTENCE':
        // Split by sentence terminators
        rawUnits = text.split(/(?<=[.!?])\s+/).filter(Boolean);
        break;

      case 'PARAGRAPH':
      default:
        // Split by paragraph double newlines
        rawUnits = text.split(/\n\s*\n/).filter(Boolean);
        break;
    }

    const chunks: ChunkResult[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const unit of rawUnits) {
      const trimmedUnit = unit.trim();
      if (!trimmedUnit) continue;

      if ((currentChunk + ' ' + trimmedUnit).length > chunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          chunkIndex,
          content: currentChunk.trim(),
          tokenCount: Math.ceil(currentChunk.length / 4),
        });
        chunkIndex++;

        // Calculate overlap string from the end of currentChunk
        const overlapText = chunkOverlap > 0 ? currentChunk.slice(-chunkOverlap) : '';
        currentChunk = overlapText + ' ' + trimmedUnit;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedUnit : trimmedUnit;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        chunkIndex,
        content: currentChunk.trim(),
        tokenCount: Math.ceil(currentChunk.length / 4),
      });
    }

    return chunks;
  }
}
