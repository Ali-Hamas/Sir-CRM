import { IsString, IsNotEmpty, IsOptional, IsArray, IsInt, Min, Max } from 'class-validator';

export class SearchRAGDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsString()
  searchType?: string; // KEYWORD, SEMANTIC, HYBRID

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceFilters?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  topK?: number;
}
