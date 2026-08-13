import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PromptVariableDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'CONTEXT'])
  type?: string;
}

export class CreatePromptDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsString()
  @IsNotEmpty()
  userPrompt: string;

  @IsOptional()
  @IsString()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsArray()
  modelCompatibility?: string[];

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromptVariableDto)
  variables?: PromptVariableDto[];
}

export class UpdatePromptDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  userPrompt?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsArray()
  modelCompatibility?: string[];

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromptVariableDto)
  variables?: PromptVariableDto[];

  @IsOptional()
  @IsString()
  changeSummary?: string;
}

export class PreviewPromptDto {
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsString()
  @IsNotEmpty()
  userPrompt: string;

  @IsOptional()
  variables?: Record<string, any>;
}

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
