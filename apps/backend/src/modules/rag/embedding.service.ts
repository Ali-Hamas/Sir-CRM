import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
  /**
   * Generates a deterministic mock vector embedding placeholder (1536 dimensions).
   */
  generateMockEmbedding(
    text: string,
    provider: string = 'OPENAI',
    dimensions: number = 1536,
  ): number[] {
    const vector: number[] = [];
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    // Generate pseudo-random vector values normalized between -1 and 1
    for (let d = 0; d < dimensions; d++) {
      const val = Math.sin(hash + d * 0.1) * Math.cos(d * 0.05);
      vector.push(parseFloat(val.toFixed(4)));
    }

    return vector;
  }
}
