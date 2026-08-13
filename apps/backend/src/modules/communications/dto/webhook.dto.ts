import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsArray } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  secret?: string;

  @IsArray()
  events: string[];

  @IsOptional()
  headers?: Record<string, string>;

  @IsInt()
  @IsOptional()
  retryCount?: number;

  @IsInt()
  @IsOptional()
  timeoutMs?: number;
}

export class UpdateWebhookDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  secret?: string;

  @IsArray()
  @IsOptional()
  events?: string[];

  @IsOptional()
  headers?: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsInt()
  @IsOptional()
  retryCount?: number;

  @IsInt()
  @IsOptional()
  timeoutMs?: number;
}
