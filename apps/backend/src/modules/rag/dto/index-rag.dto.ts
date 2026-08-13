import { IsOptional, IsArray, IsString } from 'class-validator';

export class IndexRAGDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceTypes?: string[];

  @IsOptional()
  @IsString()
  workspaceId?: string;
}
