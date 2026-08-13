import { Module } from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { TimeTrackingController } from './time-tracking.controller';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ActivityModule, NotificationsModule],
  controllers: [TimeTrackingController],
  providers: [TimeTrackingService],
  exports: [TimeTrackingService],
})
export class TimeTrackingModule {}
