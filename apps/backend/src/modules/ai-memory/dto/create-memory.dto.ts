import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsEnum } from 'class-validator';

export class CreateMemoryDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsEnum(['USER', 'ORGANIZATION', 'WORKSPACE', 'CONVERSATION', 'CRM', 'PROJECT', 'KNOWLEDGE'])
  memoryType: string;

  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsString()
  @IsEnum(['CRM', 'PROJECT', 'KNOWLEDGE', 'DOCUMENT', 'MEETING', 'CONVERSATION', 'WORKFLOW', 'USER_INPUT'])
  source: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsNumber()
  importance?: number;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class UpdateMemoryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsNumber()
  importance?: number;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

export class BuildContextDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsArray()
  includeSources?: string[];
}

export class CreatePreferenceDto {
  @IsString()
  @IsNotEmpty()
  preferenceKey: string;

  @IsString()
  @IsNotEmpty()
  preferenceValue: string;

  @IsOptional()
  @IsString()
  category?: string;
}
