import { Module } from '@nestjs/common';
import { AIChatService } from './ai-chat.service';
import { AIChatController } from './ai-chat.controller';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AIProvidersModule } from '../ai-providers/ai-providers.module';

@Module({
  imports: [ActivityModule, NotificationsModule, AIProvidersModule],
  controllers: [AIChatController],
  providers: [AIChatService],
  exports: [AIChatService],
})
export class AIChatModule {}
