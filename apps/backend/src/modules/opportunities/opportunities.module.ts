import { Module } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { OpportunitiesController } from './opportunities.controller';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [ActivityModule, NotificationsModule, WorkflowsModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
