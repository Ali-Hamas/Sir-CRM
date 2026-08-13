import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateKnowledgeCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
