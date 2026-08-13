import { IsArray, ValidateNested, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class PermissionItemDto {
  @IsString()
  permission: string;

  @IsBoolean()
  granted: boolean;
}

export class UpdatePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionItemDto)
  permissions: PermissionItemDto[];
}
