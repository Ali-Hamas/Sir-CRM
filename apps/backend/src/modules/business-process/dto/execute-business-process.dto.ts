import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class ExecuteBusinessProcessDto {
  @IsString()
  @IsOptional()
  trigger?: string;

  @IsOptional()
  inputData?: any;

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}
