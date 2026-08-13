import { Module } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { PromptsController } from './prompts.controller';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ActivityModule, NotificationsModule],
  controllers: [PromptsController],
  providers: [PromptsService],
  exports: [PromptsService],
})
export class PromptsModule {}
