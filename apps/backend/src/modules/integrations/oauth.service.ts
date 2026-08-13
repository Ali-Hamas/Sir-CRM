import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CredentialEncryptionService } from './credential-encryption.service';

@Injectable()
export class OAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: CredentialEncryptionService,
  ) {}

  /**
   * Generate an OAuth2 Authorization URL for a provider.
   */
  async getAuthorizeUrl(organizationId: string, providerKey: string, redirectUri?: string) {
    const provider = await this.prisma.integrationProvider.findUnique({
      where: { key: providerKey },
    });
    if (!provider) throw new BadRequestException(`Provider ${providerKey} not found`);

    const state = Buffer.from(JSON.stringify({ organizationId, providerKey, nonce: Date.now() })).toString('base64');
    const defaultRedirect = redirectUri || `${process.env.APP_URL || 'http://localhost:3000'}/settings/integrations/callback`;

    // Constructs provider-specific authorization URL
    const authUrls: Record<string, string> = {
      GOOGLE_WORKSPACE: `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=mock_google_id&scope=https://www.googleapis.com/auth/userinfo.profile+https://www.googleapis.com/auth/calendar&state=${state}&redirect_uri=${encodeURIComponent(defaultRedirect)}`,
      MS_365: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=mock_ms_id&response_type=code&scope=User.Read+Calendars.ReadWrite&state=${state}&redirect_uri=${encodeURIComponent(defaultRedirect)}`,
      SLACK: `https://slack.com/oauth/v2/authorize?client_id=mock_slack_id&scope=chat:write,channels:read&state=${state}&redirect_uri=${encodeURIComponent(defaultRedirect)}`,
      GITHUB: `https://github.com/login/oauth/authorize?client_id=mock_github_id&scope=repo,user&state=${state}&redirect_uri=${encodeURIComponent(defaultRedirect)}`,
      JIRA: `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=mock_jira_id&scope=read:jira-work%20write:jira-work&state=${state}&redirect_uri=${encodeURIComponent(defaultRedirect)}`,
      HUBSPOT: `https://app.hubspot.com/oauth/authorize?client_id=mock_hubspot_id&scope=contacts%20crm.objects.deals.read&state=${state}&redirect_uri=${encodeURIComponent(defaultRedirect)}`,
      SALESFORCE: `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=mock_sf_id&state=${state}&redirect_uri=${encodeURIComponent(defaultRedirect)}`,
    };

    return {
      providerKey,
      authUrl: authUrls[providerKey] || `https://auth.${providerKey.toLowerCase()}.com/oauth2/auth?state=${state}&redirect_uri=${encodeURIComponent(defaultRedirect)}`,
      state,
    };
  }

  /**
   * Complete OAuth2 Code Exchange to connect the integration.
   */
  async handleCallback(organizationId: string, userId: string, data: {
    providerKey: string;
    code: string;
    state?: string;
  }) {
    const provider = await this.prisma.integrationProvider.findUnique({
      where: { key: data.providerKey },
    });
    if (!provider) throw new BadRequestException(`Provider ${data.providerKey} not found`);

    // Simulate token exchange payload
    const mockAccessToken = `act_${data.providerKey.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const mockRefreshToken = `rft_${data.providerKey.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create or update connection
    const existing = await this.prisma.integrationConnection.findFirst({
      where: { organizationId, providerId: provider.id },
    });

    let connectionId: string;
    if (existing) {
      connectionId = existing.id;
      await this.prisma.integrationConnection.update({
        where: { id: existing.id },
        data: {
          status: 'CONNECTED',
          healthStatus: 'HEALTHY',
          lastSyncedAt: new Date(),
        },
      });
    } else {
      const created = await this.prisma.integrationConnection.create({
        data: {
          organizationId,
          providerId: provider.id,
          name: `${provider.name} Connection`,
          status: 'CONNECTED',
          authType: 'OAUTH2',
          externalAccountEmail: `connected-user@${data.providerKey.toLowerCase()}.org`,
          scopes: JSON.stringify(['read', 'write', 'offline_access']),
          healthStatus: 'HEALTHY',
          createdById: userId,
        },
      });
      connectionId = created.id;
    }

    // Save encrypted credentials
    const encAccess = this.encryptionService.encrypt(mockAccessToken);
    await this.prisma.integrationCredential.create({
      data: {
        connectionId,
        type: 'ACCESS_TOKEN',
        encryptedData: encAccess.encryptedData,
        iv: encAccess.iv,
        expiresAt: new Date(Date.now() + 3600000 * 24 * 30),
      },
    });

    const encRefresh = this.encryptionService.encrypt(mockRefreshToken);
    await this.prisma.integrationCredential.create({
      data: {
        connectionId,
        type: 'REFRESH_TOKEN',
        encryptedData: encRefresh.encryptedData,
        iv: encRefresh.iv,
      },
    });

    await this.prisma.integrationLog.create({
      data: {
        organizationId,
        connectionId,
        level: 'INFO',
        action: 'OAUTH_CONNECT',
        message: `Successfully connected ${provider.name} via OAuth2`,
      },
    });

    return { success: true, connectionId, providerKey: provider.key };
  }
}
