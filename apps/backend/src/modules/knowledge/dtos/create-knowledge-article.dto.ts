import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateKnowledgeArticleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

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
