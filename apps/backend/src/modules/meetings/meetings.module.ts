import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { ActivityModule } from '../activity/activity.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [ActivityModule, WorkflowsModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
