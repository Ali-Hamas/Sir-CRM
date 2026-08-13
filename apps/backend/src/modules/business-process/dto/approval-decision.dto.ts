import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class ApprovalDecisionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['APPROVED', 'REJECTED'])
  status: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
