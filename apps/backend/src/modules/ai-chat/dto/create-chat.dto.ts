import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;
}

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsString()
  systemPrompt?: string;
}

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  @IsEnum(['SYSTEM', 'USER', 'ASSISTANT', 'TOOL'])
  role?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  model?: string;
}

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;
}
