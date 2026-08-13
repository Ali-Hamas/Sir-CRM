import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class ExecuteToolDto {
  @IsString()
  @IsNotEmpty()
  toolKey: string;

  @IsObject()
  params: Record<string, any>;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  assistantId?: string;
}
