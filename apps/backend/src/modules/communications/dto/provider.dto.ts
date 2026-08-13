import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsObject } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  channel: string;

  @IsString()
  @IsNotEmpty()
  providerType: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsInt()
  @IsOptional()
  priority?: number;
}

export class UpdateProviderDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsInt()
  @IsOptional()
  priority?: number;
}
