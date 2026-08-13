import { IsOptional, IsString } from 'class-validator';

export class UpdateKnowledgeCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;
}
