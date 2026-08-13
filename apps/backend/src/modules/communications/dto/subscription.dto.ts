import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  event: string;

  @IsArray()
  channels: string[];

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsOptional()
  filters?: Record<string, any>;
}

export class UpdateSubscriptionDto {
  @IsArray()
  @IsOptional()
  channels?: string[];

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsOptional()
  filters?: Record<string, any>;
}
