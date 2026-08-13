import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class TriggerDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  config?: string;
}

export class ConditionDto {
  @IsString()
  @IsNotEmpty()
  field: string;

  @IsString()
  @IsNotEmpty()
  operator: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsOptional()
  @IsInt()
  stepOrder?: number;
}

export class ActionDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  config: string;

  @IsOptional()
  @IsInt()
  stepOrder?: number;
}

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'DISABLED'])
  status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TriggerDto)
  triggers: TriggerDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions?: ConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions: ActionDto[];
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'DISABLED'])
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TriggerDto)
  triggers?: TriggerDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions?: ConditionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions?: ActionDto[];
}
