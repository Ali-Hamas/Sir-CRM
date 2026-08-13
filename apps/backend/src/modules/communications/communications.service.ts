import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TemplateEngineService } from './template-engine.service';
import { EmailService } from './email.service';
import { SlackService } from './slack.service';
import { TeamsService } from './teams.service';
import { DiscordService } from './discord.service';
import { WebhookService } from './webhook.service';
import { SMSService } from './sms.service';
import { PushNotificationService } from './push-notification.service';
import { DeliveryTrackerService } from './delivery-tracker.service';
import { CommunicationAuditService } from './communication-audit.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(
    private prisma: PrismaService,
    private templateEngine: TemplateEngineService,
    private emailService: EmailService,
    private slackService: SlackService,
    private teamsService: TeamsService,
    private discordService: DiscordService,
    private webhookService: WebhookService,
    private smsService: SMSService,
    private pushService: PushNotificationService,
    private deliveryTracker: DeliveryTrackerService,
    private auditService: CommunicationAuditService,
  ) {}

  private async resolveOrg(idOrSlug: string) {
    const org = await this.prisma.organization.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], isDeleted: false },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async send(orgIdOrSlug: string, userId: string, dto: SendMessageDto) {
    const org = await this.resolveOrg(orgIdOrSlug);

    let body = dto.body;
    let subject = dto.subject;

    if (dto.templateId && dto.templateVariables) {
      const template = await this.prisma.communicationTemplate.findFirst({
        where: { id: dto.templateId, organizationId: org.id },
      });
      if (template) {
        body = this.templateEngine.render(template.body, dto.templateVariables, template.bodyFormat);
        if (template.subject && dto.subject) subject = this.templateEngine.render(template.subject, dto.templateVariables);
      }
    }

    const provider = dto.providerId
      ? await this.prisma.communicationProvider.findFirst({ where: { id: dto.providerId, organizationId: org.id } })
      : await this.prisma.communicationProvider.findFirst({ where: { organizationId: org.id, channel: dto.channel, isDefault: true, isEnabled: true } });

    const message = await this.prisma.communicationMessage.create({
      data: {
        organizationId: org.id,
        channel: dto.channel,
        subject,
        body,
        bodyFormat: dto.bodyFormat || 'HTML',
        senderId: userId,
        recipients: JSON.stringify(dto.recipients),
        cc: dto.cc ? JSON.stringify(dto.cc) : undefined,
        bcc: dto.bcc ? JSON.stringify(dto.bcc) : undefined,
        templateId: dto.templateId,
        providerId: provider?.id,
        relatedEntityType: dto.relatedEntityType,
        relatedEntityId: dto.relatedEntityId,
        priority: dto.priority || 'NORMAL',
        status: dto.scheduledAt ? 'PENDING' : 'SENDING',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });

    await this.auditService.log({ messageId: message.id, action: 'SENT', channel: dto.channel });

    if (!dto.scheduledAt) {
      this.deliver(message.id, org.id, dto, provider?.config).catch((err) => {
        this.logger.error(`Delivery failed for message ${message.id}: ${err.message}`);
      });
    }

    return message;
  }

  private async deliver(messageId: string, organizationId: string, dto: SendMessageDto, providerConfig?: any) {
    try {
      for (const recipient of dto.recipients) {
        let result: any = { success: false };

        switch (dto.channel) {
          case 'EMAIL':
            result = await this.emailService.send({
              to: [recipient],
              cc: dto.cc?.map((a: any) => ({ address: a })),
              bcc: dto.bcc?.map((a: any) => ({ address: a })),
              subject: dto.subject || '',
              body: dto.body,
              bodyFormat: dto.bodyFormat || 'HTML',
              providerConfig,
            });
            break;
          case 'SLACK':
            result = await this.slackService.send({ recipients: [recipient], body: dto.body, providerConfig });
            break;
          case 'TEAMS':
            result = await this.teamsService.send({ recipients: [recipient], body: dto.body, providerConfig });
            break;
          case 'DISCORD':
            result = await this.discordService.send({ recipients: [recipient], body: dto.body, providerConfig });
            break;
          case 'SMS':
            result = await this.smsService.send({ recipients: [recipient], body: dto.body, providerConfig });
            break;
          case 'PUSH':
            result = await this.pushService.send({ recipients: [recipient], title: dto.subject || '', body: dto.body, providerConfig });
            break;
        }

        const status = result.success ? 'DELIVERED' : 'FAILED';
        await this.deliveryTracker.track(messageId, recipient.address, dto.channel, status, undefined, result.error?.message, result.messageId);

        if (!result.success) {
          await this.auditService.log({ messageId, action: 'FAILED', channel: dto.channel, details: { error: result.error } });
        }
      }

      const allDeliveries = await this.deliveryTracker.getDeliveriesForMessage(messageId);
      const allDelivered = allDeliveries.every((d) => d.status === 'DELIVERED');

      await this.prisma.communicationMessage.update({
        where: { id: messageId },
        data: {
          status: allDelivered ? 'DELIVERED' : 'PARTIALLY_DELIVERED',
          deliveredAt: new Date(),
        },
      });

      if (allDelivered) {
        await this.auditService.log({ messageId, action: 'DELIVERED', channel: dto.channel });
      }
    } catch (err: any) {
      this.logger.error(`Delivery error for message ${messageId}: ${err.message}`);
      await this.prisma.communicationMessage.update({
        where: { id: messageId },
        data: { status: 'FAILED', errorMessage: err.message },
      });
      await this.deliveryTracker.track(messageId, 'all', dto.channel, 'FAILED', undefined, err.message);
      await this.auditService.log({ messageId, action: 'FAILED', channel: dto.channel, details: { error: err.message } });
    }
  }

  async sendBulk(orgIdOrSlug: string, userId: string, messages: SendMessageDto[]) {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const results = [];
    for (const msg of messages) {
      const result = await this.send(orgIdOrSlug, userId, msg);
      await this.prisma.communicationMessage.update({
        where: { id: result.id },
        data: { batchId },
      });
      results.push(result);
    }
    return { batchId, total: results.length, messages: results };
  }

  async retryFailed(messageId: string, organizationId: string) {
    const message = await this.prisma.communicationMessage.findFirst({
      where: { id: messageId, organizationId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.status !== 'FAILED') throw new BadRequestException('Message is not in failed state');

    await this.prisma.communicationMessage.update({
      where: { id: messageId },
      data: { status: 'SENDING', retryCount: { increment: 1 }, errorMessage: null },
    });

    const dto = new SendMessageDto();
    dto.channel = message.channel;
    dto.subject = message.subject || undefined;
    dto.body = message.body;
    dto.bodyFormat = message.bodyFormat;
    dto.recipients = JSON.parse(message.recipients);
    dto.providerId = message.providerId || undefined;

    await this.auditService.log({ messageId, action: 'RETRIED', channel: message.channel, details: { retryCount: message.retryCount + 1 } });
    this.deliver(message.id, organizationId, dto).catch((err) => this.logger.error(`Retry delivery failed: ${err.message}`));

    return { id: messageId, status: 'SENDING' };
  }

  async getMessages(orgIdOrSlug: string, channel?: string, status?: string, limit = 20, skip = 0) {
    const org = await this.resolveOrg(orgIdOrSlug);
    const where: any = { organizationId: org.id };
    if (channel) where.channel = channel;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.communicationMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          sender: { select: { id: true, email: true, firstName: true, lastName: true } },
          provider: { select: { id: true, name: true, channel: true } },
          _count: { select: { deliveries: true, audits: true } },
        },
      }),
      this.prisma.communicationMessage.count({ where }),
    ]);
    return { items, total, limit, skip };
  }

  async getMessage(orgIdOrSlug: string, messageId: string) {
    const org = await this.resolveOrg(orgIdOrSlug);
    const message = await this.prisma.communicationMessage.findFirst({
      where: { id: messageId, organizationId: org.id },
      include: {
        sender: { select: { id: true, email: true, firstName: true, lastName: true } },
        provider: { select: { id: true, name: true, channel: true } },
        template: { select: { id: true, name: true } },
        deliveries: { orderBy: { createdAt: 'desc' } },
        audits: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  async getStats(orgIdOrSlug: string) {
    const org = await this.resolveOrg(orgIdOrSlug);
    const [total, byChannel, byStatus, deliveryStats] = await Promise.all([
      this.prisma.communicationMessage.count({ where: { organizationId: org.id } }),
      this.prisma.communicationMessage.groupBy({
        by: ['channel'],
        where: { organizationId: org.id },
        _count: true,
      }),
      this.prisma.communicationMessage.groupBy({
        by: ['status'],
        where: { organizationId: org.id },
        _count: true,
      }),
      this.deliveryTracker.getDeliveryStats(org.id),
    ]);
    return { total, byChannel, byStatus, deliveryStats };
  }
}
