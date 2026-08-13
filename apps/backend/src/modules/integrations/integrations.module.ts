import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { ProviderRegistryService } from './provider-registry.service';
import { CredentialEncryptionService } from './credential-encryption.service';
import { ConnectionManagerService } from './connection-manager.service';
import { OAuthService } from './oauth.service';
import { SyncEngineService } from './sync-engine.service';
import { WebhookManagerService } from './webhook-manager.service';
import { EventDispatcherService } from './event-dispatcher.service';
import { IntegrationAuditService } from './integration-audit.service';

@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    ProviderRegistryService,
    CredentialEncryptionService,
    ConnectionManagerService,
    OAuthService,
    SyncEngineService,
    WebhookManagerService,
    EventDispatcherService,
    IntegrationAuditService,
  ],
  exports: [
    IntegrationsService,
    ProviderRegistryService,
    CredentialEncryptionService,
    ConnectionManagerService,
    OAuthService,
    SyncEngineService,
    WebhookManagerService,
    EventDispatcherService,
    IntegrationAuditService,
  ],
})
export class IntegrationsModule {}
