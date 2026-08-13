import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DocumentsModule } from '../documents/documents.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [ActivityModule, NotificationsModule, DocumentsModule, WorkflowsModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
