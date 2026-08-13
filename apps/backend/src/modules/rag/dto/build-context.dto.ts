import { IsString, IsNotEmpty, IsOptional, IsArray, IsInt } from 'class-validator';

export class BuildContextDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @IsInt()
  maxTokenLimit?: number;
}
