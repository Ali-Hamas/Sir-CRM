import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsExecutionService } from './workflows-execution.service';
import { WorkflowsController } from './workflows.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [NotificationsModule, ActivityModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowsExecutionService],
  exports: [WorkflowsService, WorkflowsExecutionService],
})
export class WorkflowsModule {}
