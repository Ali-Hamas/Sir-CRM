import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/roles';
import { IntegrationsService } from './integrations.service';
import { ProviderRegistryService } from './provider-registry.service';
import { ConnectionManagerService } from './connection-manager.service';
import { OAuthService } from './oauth.service';
import { SyncEngineService } from './sync-engine.service';
import { WebhookManagerService } from './webhook-manager.service';
import { EventDispatcherService } from './event-dispatcher.service';
import { IntegrationAuditService } from './integration-audit.service';

@Controller('organizations/:orgId/integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly oauthService: OAuthService,
    private readonly syncEngine: SyncEngineService,
    private readonly webhookManager: WebhookManagerService,
    private readonly eventDispatcher: EventDispatcherService,
    private readonly auditService: IntegrationAuditService,
  ) {}

  // ==========================================
  // PUBLIC WEBHOOK RECEIVER (NO JWT AUTH)
  // ==========================================

  @Post('webhooks/receive/:secretKey')
  receiveWebhook(@Param('secretKey') secretKey: string, @Body() body: any) {
    return this.webhookManager.processInboundWebhook(secretKey, body);
  }

  // ==========================================
  // PROTECTED ENDPOINTS (JWT AUTH REQUIRED)
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  getStats(@Param('orgId') orgId: string) {
    return this.integrationsService.getStats(orgId);
  }

  // PROVIDERS & MARKETPLACE
  @UseGuards(JwtAuthGuard)
  @Get('providers')
  async getProviders() {
    return this.providerRegistry.getProviders();
  }

  // CONNECTIONS
  @UseGuards(JwtAuthGuard)
  @Get('connections')
  async getConnections(@Param('orgId') orgId: string) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.connectionManager.getConnections(resolvedOrgId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('connections/:id')
  async getConnectionById(@Param('orgId') orgId: string, @Param('id') id: string) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.connectionManager.getConnectionById(resolvedOrgId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Post('connections')
  async createConnection(@Req() req: any, @Param('orgId') orgId: string, @Body() body: any) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.connectionManager.createConnection(resolvedOrgId, req.user.id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Patch('connections/:id')
  async updateConnection(@Param('orgId') orgId: string, @Param('id') id: string, @Body() body: any) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.connectionManager.updateConnection(resolvedOrgId, id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('connections/:id')
  async disconnect(@Param('orgId') orgId: string, @Param('id') id: string) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.connectionManager.disconnect(resolvedOrgId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('connections/:id/health')
  async checkHealth(@Param('orgId') orgId: string, @Param('id') id: string) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.connectionManager.checkConnectionHealth(resolvedOrgId, id);
  }

  // OAUTH FLOWS
  @UseGuards(JwtAuthGuard)
  @Get('oauth/authorize')
  async getAuthorizeUrl(
    @Param('orgId') orgId: string,
    @Query('providerKey') providerKey: string,
    @Query('redirectUri') redirectUri?: string,
  ) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.oauthService.getAuthorizeUrl(resolvedOrgId, providerKey, redirectUri);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Post('oauth/callback')
  async handleOAuthCallback(@Req() req: any, @Param('orgId') orgId: string, @Body() body: any) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.oauthService.handleCallback(resolvedOrgId, req.user.id, body);
  }

  // SYNC ENGINE
  @UseGuards(JwtAuthGuard)
  @Get('sync-jobs')
  async getSyncJobs(@Param('orgId') orgId: string) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.syncEngine.getSyncJobs(resolvedOrgId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Post('connections/:id/sync')
  async triggerSync(@Param('orgId') orgId: string, @Param('id') id: string, @Body() body: any) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.syncEngine.triggerSync(resolvedOrgId, id, body);
  }

  // WEBHOOKS MANAGEMENT
  @UseGuards(JwtAuthGuard)
  @Get('webhooks')
  async getWebhooks(@Param('orgId') orgId: string) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.webhookManager.getWebhooks(resolvedOrgId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Post('webhooks')
  async createWebhook(@Param('orgId') orgId: string, @Body() body: any) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.webhookManager.createWebhook(resolvedOrgId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('webhooks/:id')
  async deleteWebhook(@Param('orgId') orgId: string, @Param('id') id: string) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.webhookManager.deleteWebhook(resolvedOrgId, id);
  }

  // EVENTS
  @UseGuards(JwtAuthGuard)
  @Get('events')
  async getEvents(@Param('orgId') orgId: string) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.eventDispatcher.getEvents(resolvedOrgId);
  }

  // AUDIT LOGS & TEMPLATES
  @UseGuards(JwtAuthGuard)
  @Get('logs')
  async getLogs(@Param('orgId') orgId: string, @Query('level') level?: string) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.auditService.getLogs(resolvedOrgId, level);
  }

  @UseGuards(JwtAuthGuard)
  @Get('templates')
  async getTemplates(@Param('orgId') orgId: string) {
    const resolvedOrgId = await this.integrationsService.getOrgId(orgId);
    return this.auditService.getTemplates(resolvedOrgId);
  }
}
