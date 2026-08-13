import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsArray } from 'class-validator';

export class CreateBusinessProcessDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedDuration?: number;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  workspaceId?: string;
}
