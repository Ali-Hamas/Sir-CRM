import { IsNotEmpty, IsString } from 'class-validator';

export class CreateKnowledgeCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
