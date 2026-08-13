import { Module } from '@nestjs/common';
import { ResourceManagementService } from './resource-management.service';
import { ResourceManagementController } from './resource-management.controller';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ActivityModule, NotificationsModule],
  controllers: [ResourceManagementController],
  providers: [ResourceManagementService],
  exports: [ResourceManagementService],
})
export class ResourceManagementModule {}
