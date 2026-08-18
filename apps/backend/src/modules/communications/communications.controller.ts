import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';
import { CommunicationsService } from './communications.service';
import { CommunicationAuditService } from './communication-audit.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';
import { PrismaService } from '../../core/prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/communications')
export class CommunicationsController {
  constructor(
    private readonly communicationsService: CommunicationsService,
    private readonly auditService: CommunicationAuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('stats')
  getStats(@Param('orgId') orgId: string): Promise<any> {
    return this.communicationsService.getStats(orgId);
  }

  @Post('send')
  send(@Param('orgId') orgId: string, @Req() req: any, @Body() dto: SendMessageDto): Promise<any> {
    return this.communicationsService.send(orgId, req.user.id, dto);
  }

  @Post('send-bulk')
  sendBulk(@Param('orgId') orgId: string, @Req() req: any, @Body() messages: SendMessageDto[]): Promise<any> {
    return this.communicationsService.sendBulk(orgId, req.user.id, messages);
  }

  @Post('messages/:messageId/retry')
  retry(@Param('orgId') orgId: string, @Param('messageId') messageId: string): Promise<any> {
    return this.communicationsService.retryFailed(messageId, orgId);
  }

  @Get('messages')
  getMessages(
    @Param('orgId') orgId: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ): Promise<any> {
    return this.communicationsService.getMessages(orgId, channel, status, limit ? Number(limit) : 20, skip ? Number(skip) : 0);
  }

  @Get('messages/:messageId')
  getMessage(@Param('orgId') orgId: string, @Param('messageId') messageId: string): Promise<any> {
    return this.communicationsService.getMessage(orgId, messageId);
  }

  @Get('messages/:messageId/deliveries')
  getDeliveries(@Param('messageId') messageId: string): Promise<any> {
    return this.prisma.communicationDelivery.findMany({ where: { messageId }, orderBy: { createdAt: 'desc' } });
  }

  @Get('messages/:messageId/audit')
  getMessageAudit(@Param('messageId') messageId: string): Promise<any> {
    return this.auditService.findByMessage(messageId);
  }

  private maskProviderSecrets(provider: any): any {
    if (!provider) return provider;
    let configObj: any = {};
    if (provider.config) {
      try {
        configObj = typeof provider.config === 'string' ? JSON.parse(provider.config) : provider.config;
      } catch {
        configObj = {};
      }
    }

    const maskedConfig: Record<string, any> = {};
    for (const [k, v] of Object.entries(configObj)) {
      const lower = k.toLowerCase();
      if (
        (lower.includes('key') ||
          lower.includes('pass') ||
          lower.includes('secret') ||
          lower.includes('token') ||
          lower.includes('auth')) &&
        typeof v === 'string' &&
        v.length > 0
      ) {
        maskedConfig[k] = v.length > 8 ? `${v.substring(0, 4)}••••••••${v.substring(v.length - 2)}` : '••••••••';
      } else {
        maskedConfig[k] = v;
      }
    }

    return {
      ...provider,
      config: JSON.stringify(maskedConfig),
      configParsed: maskedConfig,
    };
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('providers')
  async createProvider(@Param('orgId') orgId: string, @Body() dto: CreateProviderDto, @Req() req: any): Promise<any> {
    const configStr = typeof dto.config === 'object' ? JSON.stringify(dto.config) : dto.config;
    const provider = await this.prisma.communicationProvider.create({
      data: { ...dto, config: configStr, organizationId: orgId, createdById: req.user.id },
    });
    return this.maskProviderSecrets(provider);
  }

  @Get('providers')
  async getProviders(@Param('orgId') orgId: string): Promise<any> {
    const providers = await this.prisma.communicationProvider.findMany({
      where: { organizationId: orgId, isDeleted: false },
      orderBy: { priority: 'asc' },
    });
    return providers.map((p) => this.maskProviderSecrets(p));
  }

  @Get('providers/:providerId')
  async getProvider(@Param('orgId') orgId: string, @Param('providerId') providerId: string): Promise<any> {
    const provider = await this.prisma.communicationProvider.findFirst({
      where: { id: providerId, organizationId: orgId, isDeleted: false },
    });
    return this.maskProviderSecrets(provider);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('providers/:providerId')
  async updateProvider(@Param('providerId') providerId: string, @Body() dto: UpdateProviderDto): Promise<any> {
    const existing = await this.prisma.communicationProvider.findUnique({ where: { id: providerId } });
    let finalConfig: string | undefined = undefined;

    if (dto.config && existing?.config) {
      try {
        const incomingConfig = typeof dto.config === 'string' ? JSON.parse(dto.config) : { ...dto.config };
        const storedConfig = typeof existing.config === 'string' ? JSON.parse(existing.config as string) : existing.config;

        // Merge without overwriting with masked placeholders
        for (const [k, v] of Object.entries(incomingConfig)) {
          if (typeof v === 'string' && (v.includes('••••') || v === '••••••••')) {
            incomingConfig[k] = (storedConfig as any)[k];
          }
        }
        finalConfig = JSON.stringify(incomingConfig);
      } catch {
        finalConfig = typeof dto.config === 'object' ? JSON.stringify(dto.config) : String(dto.config);
      }
    } else if (dto.config) {
      finalConfig = typeof dto.config === 'object' ? JSON.stringify(dto.config) : String(dto.config);
    }

    const updated = await this.prisma.communicationProvider.update({
      where: { id: providerId },
      data: { ...dto, config: finalConfig } as any,
    });
    return this.maskProviderSecrets(updated);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('providers/:providerId/test')
  async testProvider(
    @Param('orgId') orgId: string,
    @Param('providerId') providerId: string,
    @Req() req: any,
    @Body() body: any
  ): Promise<any> {
    return this.communicationsService.testProvider(orgId, providerId, req.user.id, body?.recipient);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('providers/:providerId')
  deleteProvider(@Param('providerId') providerId: string): Promise<any> {
    return this.prisma.communicationProvider.update({ where: { id: providerId }, data: { isDeleted: true, deletedAt: new Date() } });
  }

  @Post('templates')
  createTemplate(@Param('orgId') orgId: string, @Body() dto: CreateTemplateDto, @Req() req: any): Promise<any> {
    return this.prisma.communicationTemplate.create({
      data: { ...dto, variables: dto.variables ? JSON.stringify(dto.variables) : undefined, organizationId: orgId, createdById: req.user.id },
    });
  }

  @Get('templates')
  getTemplates(@Param('orgId') orgId: string, @Query('channel') channel?: string): Promise<any> {
    const where: any = { organizationId: orgId, isDeleted: false };
    if (channel) where.channel = channel;
    return this.prisma.communicationTemplate.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  @Get('templates/:templateId')
  getTemplate(@Param('templateId') templateId: string): Promise<any> {
    return this.prisma.communicationTemplate.findUnique({ where: { id: templateId } });
  }

  @Patch('templates/:templateId')
  updateTemplate(@Param('templateId') templateId: string, @Body() dto: UpdateTemplateDto): Promise<any> {
    return this.prisma.communicationTemplate.update({
      where: { id: templateId },
      data: { ...dto, variables: dto.variables ? JSON.stringify(dto.variables) : undefined },
    });
  }

  @Delete('templates/:templateId')
  deleteTemplate(@Param('templateId') templateId: string): Promise<any> {
    return this.prisma.communicationTemplate.update({ where: { id: templateId }, data: { isDeleted: true, deletedAt: new Date() } });
  }

  @Post('templates/:templateId/preview')
  async previewTemplate(@Param('templateId') templateId: string, @Body() variables: Record<string, any>): Promise<any> {
    const template = await this.prisma.communicationTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error('Template not found');
    const { TemplateEngineService } = require('./template-engine.service');
    const engine = new TemplateEngineService();
    return {
      subject: template.subject ? engine.render(template.subject, variables) : null,
      body: engine.render(template.body, variables, template.bodyFormat),
    };
  }

  @Post('webhooks')
  createWebhook(@Param('orgId') orgId: string, @Body() dto: CreateWebhookDto, @Req() req: any): Promise<any> {
    return this.prisma.communicationWebhook.create({
      data: { ...dto, events: JSON.stringify(dto.events), headers: dto.headers ? JSON.stringify(dto.headers) : undefined, organizationId: orgId, createdById: req.user.id },
    });
  }

  @Get('webhooks')
  getWebhooks(@Param('orgId') orgId: string): Promise<any> {
    return this.prisma.communicationWebhook.findMany({ where: { organizationId: orgId, isDeleted: false }, orderBy: { createdAt: 'desc' } });
  }

  @Patch('webhooks/:webhookId')
  updateWebhook(@Param('webhookId') webhookId: string, @Body() dto: UpdateWebhookDto): Promise<any> {
    return this.prisma.communicationWebhook.update({
      where: { id: webhookId },
      data: { ...dto, events: dto.events ? JSON.stringify(dto.events) : undefined, headers: dto.headers ? JSON.stringify(dto.headers) : undefined },
    });
  }

  @Delete('webhooks/:webhookId')
  deleteWebhook(@Param('webhookId') webhookId: string): Promise<any> {
    return this.prisma.communicationWebhook.update({ where: { id: webhookId }, data: { isDeleted: true, deletedAt: new Date() } });
  }

  @Post('subscriptions')
  createSubscription(@Param('orgId') orgId: string, @Req() req: any, @Body() dto: CreateSubscriptionDto): Promise<any> {
    return this.prisma.communicationSubscription.create({
      data: { ...dto, channels: JSON.stringify(dto.channels), filters: dto.filters ? JSON.stringify(dto.filters) : undefined, organizationId: orgId, userId: req.user.id },
    });
  }

  @Get('subscriptions')
  getSubscriptions(@Param('orgId') orgId: string, @Req() req: any): Promise<any> {
    return this.prisma.communicationSubscription.findMany({ where: { organizationId: orgId, userId: req.user.id } });
  }

  @Patch('subscriptions/:subscriptionId')
  updateSubscription(@Param('subscriptionId') subscriptionId: string, @Body() dto: UpdateSubscriptionDto): Promise<any> {
    return this.prisma.communicationSubscription.update({
      where: { id: subscriptionId },
      data: { ...dto, channels: dto.channels ? JSON.stringify(dto.channels) : undefined, filters: dto.filters ? JSON.stringify(dto.filters) : undefined },
    });
  }

  @Delete('subscriptions/:subscriptionId')
  deleteSubscription(@Param('subscriptionId') subscriptionId: string): Promise<any> {
    return this.prisma.communicationSubscription.delete({ where: { id: subscriptionId } });
  }

  @Get('audit')
  getAuditLogs(@Query('limit') limit?: number, @Query('skip') skip?: number): Promise<any> {
    return this.auditService.findAll(limit ? Number(limit) : 50, skip ? Number(skip) : 0);
  }
}
