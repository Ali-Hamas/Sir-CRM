import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class RecipientDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  type?: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['EMAIL', 'SLACK', 'TEAMS', 'DISCORD', 'SMS', 'PUSH', 'WEBHOOK'])
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

  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  @IsArray()
  recipients: RecipientDto[];

  @IsArray()
  @IsOptional()
  cc?: string[];

  @IsArray()
  @IsOptional()
  bcc?: string[];

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsObject()
  @IsOptional()
  templateVariables?: Record<string, any>;

  @IsString()
  @IsOptional()
  providerId?: string;

  @IsString()
  @IsOptional()
  relatedEntityType?: string;

  @IsString()
  @IsOptional()
  relatedEntityId?: string;

  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  priority?: string;
}
