import { Module } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [ActivityModule, NotificationsModule, WorkflowsModule],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
