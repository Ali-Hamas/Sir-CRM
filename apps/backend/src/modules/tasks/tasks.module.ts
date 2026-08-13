import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [ActivityModule, NotificationsModule, WorkflowsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
