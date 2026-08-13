import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ChatAIAssistantDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  context?: string; // JSON string payload of context
}
