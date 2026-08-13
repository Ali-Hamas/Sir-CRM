import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UpdateRAGSettingsDto {
  @IsOptional()
  @IsString()
  chunkStrategy?: string; // DOCUMENT, MARKDOWN, PARAGRAPH, SENTENCE

  @IsOptional()
  @IsInt()
  @Min(64)
  @Max(4096)
  chunkSize?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(512)
  chunkOverlap?: number;

  @IsOptional()
  @IsString()
  embeddingProvider?: string; // OPENAI, GEMINI, CLAUDE, OLLAMA, OPENROUTER

  @IsOptional()
  @IsString()
  embeddingModel?: string;
}
