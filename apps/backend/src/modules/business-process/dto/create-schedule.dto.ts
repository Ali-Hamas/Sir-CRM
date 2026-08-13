import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  processId: string;

  @IsString()
  @IsOptional()
  cronExpression?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  intervalMinutes?: number;

  @IsOptional()
  startAt?: string;

  @IsOptional()
  endAt?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxExecutions?: number;

  @IsOptional()
  config?: any;
}
