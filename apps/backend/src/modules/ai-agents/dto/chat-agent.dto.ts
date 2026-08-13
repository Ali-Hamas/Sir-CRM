import { IsString, IsOptional } from 'class-validator';

export class ChatAIAgentDto {
  @IsString()
  prompt: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsOptional()
  context?: any;
}
