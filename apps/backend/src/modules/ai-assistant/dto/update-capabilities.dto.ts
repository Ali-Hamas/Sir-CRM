import { IsArray, ValidateNested, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CapabilityItemDto {
  @IsString()
  capability: string;

  @IsBoolean()
  enabled: boolean;
}

export class UpdateCapabilitiesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapabilityItemDto)
  capabilities: CapabilityItemDto[];
}
