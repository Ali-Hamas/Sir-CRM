import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ExecuteWorkflowDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsOptional()
  context?: any;
}
