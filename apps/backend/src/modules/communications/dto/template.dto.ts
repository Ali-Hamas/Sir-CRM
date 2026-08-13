import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  channel: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsOptional()
  bodyFormat?: string;

  @IsArray()
  @IsOptional()
  variables?: string[];
}

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  bodyFormat?: string;

  @IsArray()
  @IsOptional()
  variables?: string[];
}
