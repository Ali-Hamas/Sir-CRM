import { IsString, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';

export class UpdateAIAgentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @IsString()
  @IsOptional()
  defaultProvider?: string;

  @IsString()
  @IsOptional()
  defaultModel?: string;

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  maxTokens?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsArray()
  @IsOptional()
  capabilities?: { capability: string; displayName: string; description?: string; enabled?: boolean }[];

  @IsArray()
  @IsOptional()
  prompts?: { promptType?: string; name: string; content: string; isActive?: boolean; promptTemplateId?: string }[];

  @IsArray()
  @IsOptional()
  knowledgeScopes?: { scopeType: string; allowed: boolean }[];

  @IsArray()
  @IsOptional()
  toolAccesses?: { toolKey: string; allowed: boolean; requiresApproval?: boolean }[];
}
