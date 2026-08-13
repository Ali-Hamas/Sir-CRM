import { Module } from '@nestjs/common';
import { AIAssistantController } from './ai-assistant.controller';
import { AIAssistantService } from './ai-assistant.service';
import { AIAssistantCapabilityService } from './ai-assistant-capability.service';
import { AIAssistantPermissionService } from './ai-assistant-permission.service';
import { AIAssistantSessionService } from './ai-assistant-session.service';
import { AIAssistantExecutionService } from './ai-assistant-execution.service';
import { MockResponseService } from './mock-response.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityModule } from '../activity/activity.module';
import { AIProvidersModule } from '../ai-providers/ai-providers.module';

@Module({
  imports: [NotificationsModule, ActivityModule, AIProvidersModule],
  controllers: [AIAssistantController],
  providers: [
    AIAssistantService,
    AIAssistantCapabilityService,
    AIAssistantPermissionService,
    AIAssistantSessionService,
    AIAssistantExecutionService,
    MockResponseService,
  ],
  exports: [
    AIAssistantService,
    AIAssistantCapabilityService,
    AIAssistantPermissionService,
    AIAssistantSessionService,
    AIAssistantExecutionService,
    MockResponseService,
  ],
})
export class AIAssistantModule {}
