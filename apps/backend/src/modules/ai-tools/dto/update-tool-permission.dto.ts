import { IsArray, ValidateNested, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ToolPermissionItemDto {
  @IsString()
  role: string;

  @IsBoolean()
  allowed: boolean;

  @IsBoolean()
  requiresApproval: boolean;
}

export class UpdateToolPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToolPermissionItemDto)
  permissions: ToolPermissionItemDto[];
}
