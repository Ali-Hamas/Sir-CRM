import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateKnowledgeArticleDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: string;

  @IsString()
  @IsOptional()
  @IsIn(['PRIVATE', 'TEAM', 'ORGANIZATION'])
  visibility?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  featuredImageUrl?: string;
}
