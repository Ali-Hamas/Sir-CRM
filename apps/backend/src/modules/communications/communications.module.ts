import { Module } from '@nestjs/common';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { EmailService } from './email.service';
import { SlackService } from './slack.service';
import { TeamsService } from './teams.service';
import { DiscordService } from './discord.service';
import { WebhookService } from './webhook.service';
import { SMSService } from './sms.service';
import { PushNotificationService } from './push-notification.service';
import { TemplateEngineService } from './template-engine.service';
import { DeliveryTrackerService } from './delivery-tracker.service';
import { CommunicationAuditService } from './communication-audit.service';

@Module({
  controllers: [CommunicationsController],
  providers: [
    CommunicationsService,
    EmailService,
    SlackService,
    TeamsService,
    DiscordService,
    WebhookService,
    SMSService,
    PushNotificationService,
    TemplateEngineService,
    DeliveryTrackerService,
    CommunicationAuditService,
  ],
  exports: [
    CommunicationsService,
    TemplateEngineService,
    DeliveryTrackerService,
    CommunicationAuditService,
  ],
})
export class CommunicationsModule {}
