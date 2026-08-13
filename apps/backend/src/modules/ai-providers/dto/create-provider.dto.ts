import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ModelDto {
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  contextWindow?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class CreateAIProviderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsEnum(['OPENAI', 'ANTHROPIC', 'GEMINI', 'DEEPSEEK', 'OPENROUTER', 'OLLAMA'])
  providerType: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModelDto)
  models?: ModelDto[];
}

export class UpdateAIProviderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModelDto)
  models?: ModelDto[];
}
