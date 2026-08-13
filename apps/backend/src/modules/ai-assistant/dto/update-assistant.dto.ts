import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class UpdateAIAssistantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  defaultProvider?: string;

  @IsOptional()
  @IsString()
  defaultModel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(32000)
  maxTokens?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
