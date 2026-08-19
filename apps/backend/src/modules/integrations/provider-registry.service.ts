import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface ProviderDefinition {
  key: string;
  name: string;
  category: 'AUTH' | 'CRM' | 'PROJECT' | 'PAYMENT' | 'COMMUNICATION' | 'AUTOMATION' | 'STORAGE';
  description: string;
  iconUrl: string;
  authType: 'OAUTH2' | 'API_KEY' | 'WEBHOOK' | 'BASIC';
  docUrl: string;
  supportedCapabilities: string[];
}

@Injectable()
export class ProviderRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly catalog: ProviderDefinition[] = [
    // GOOGLE WORKSPACE
    {
      key: 'GOOGLE_WORKSPACE',
      name: 'Google Workspace',
      category: 'COMMUNICATION',
      description: 'Connect Gmail, Google Calendar, Google Drive, and Google Docs for enterprise sync.',
      iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg',
      authType: 'OAUTH2',
      docUrl: 'https://workspace.google.com',
      supportedCapabilities: ['Gmail Sync', 'Calendar Sync', 'Drive Storage', 'Docs Export', 'OAuth2 Single Sign-On'],
    },
    // MICROSOFT 365
    {
      key: 'MS_365',
      name: 'Microsoft 365',
      category: 'COMMUNICATION',
      description: 'Integrate Outlook, Teams, OneDrive, and Calendar across your enterprise workspace.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_365_%282022%29.svg',
      authType: 'OAUTH2',
      docUrl: 'https://www.office.com',
      supportedCapabilities: ['Outlook Mail', 'Teams Notifications', 'OneDrive Cloud Storage', 'Exchange Calendar'],
    },
    // SLACK
    {
      key: 'SLACK',
      name: 'Slack',
      category: 'COMMUNICATION',
      description: 'Send task notifications, channel updates, and AI agent messages directly to Slack.',
      iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/slack/slack-original.svg',
      authType: 'OAUTH2',
      docUrl: 'https://slack.com',
      supportedCapabilities: ['Channel Messaging', 'Direct Messages', 'Bot Actions', 'Slash Commands'],
    },
    // MICROSOFT TEAMS
    {
      key: 'MS_TEAMS',
      name: 'Microsoft Teams',
      category: 'COMMUNICATION',
      description: 'Broadcast workflow triggers and AI assistant summaries into MS Teams channels.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Microsoft_Office_Teams_%282018%E2%80%93present%29.svg',
      authType: 'OAUTH2',
      docUrl: 'https://teams.microsoft.com',
      supportedCapabilities: ['Channel Webhooks', 'Adaptive Cards', 'Meeting Integration'],
    },
    // ZOOM
    {
      key: 'ZOOM',
      name: 'Zoom Video Communications',
      category: 'COMMUNICATION',
      description: 'Auto-schedule CRM meetings, generate video links, and capture meeting notes.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Zoom_Communications_Logo.svg',
      authType: 'OAUTH2',
      docUrl: 'https://zoom.us',
      supportedCapabilities: ['Meeting Scheduling', 'Cloud Recording Sync', 'Participant Tracking'],
    },
    // GITHUB
    {
      key: 'GITHUB',
      name: 'GitHub',
      category: 'PROJECT',
      description: 'Link pull requests, code commits, issues, and release deployments with Britsync tasks.',
      iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg',
      authType: 'OAUTH2',
      docUrl: 'https://github.com',
      supportedCapabilities: ['Repository Sync', 'Issue Tracking', 'Pull Request Linking', 'Webhook Stream'],
    },
    // GITLAB
    {
      key: 'GITLAB',
      name: 'GitLab',
      category: 'PROJECT',
      description: 'Sync CI/CD pipeline statuses, merge requests, and project issues.',
      iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg',
      authType: 'OAUTH2',
      docUrl: 'https://gitlab.com',
      supportedCapabilities: ['Merge Requests', 'CI/CD Pipelines', 'Issue Management'],
    },
    // JIRA
    {
      key: 'JIRA',
      name: 'Jira Software',
      category: 'PROJECT',
      description: 'Bi-directional synchronization between Jira issues, sprints, and Britsync project tasks.',
      iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jira/jira-original.svg',
      authType: 'OAUTH2',
      docUrl: 'https://atlassian.com/software/jira',
      supportedCapabilities: ['Issue Sync', 'Sprint Mapping', 'Custom Field Sync', 'Workflow Triggers'],
    },
    // TRELLO
    {
      key: 'TRELLO',
      name: 'Trello',
      category: 'PROJECT',
      description: 'Import and sync Kanban boards, card checklists, and member assignments.',
      iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/trello/trello-plain.svg',
      authType: 'OAUTH2',
      docUrl: 'https://trello.com',
      supportedCapabilities: ['Board Sync', 'Card Status Mapping', 'Checklist Tracking'],
    },
    // ASANA
    {
      key: 'ASANA',
      name: 'Asana',
      category: 'PROJECT',
      description: 'Sync project tasks, milestones, section columns, and team assignments.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Asana_logo.svg',
      authType: 'OAUTH2',
      docUrl: 'https://asana.com',
      supportedCapabilities: ['Task Sync', 'Milestone Tracking', 'Portfolio Views'],
    },
    // NOTION
    {
      key: 'NOTION',
      name: 'Notion',
      category: 'STORAGE',
      description: 'Bi-directional page and database sync with Britsync Knowledge Base and Documents.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Notion-logo.svg',
      authType: 'OAUTH2',
      docUrl: 'https://notion.so',
      supportedCapabilities: ['Database Sync', 'Knowledge Article Export', 'Page Import'],
    },
    // STRIPE
    {
      key: 'STRIPE',
      name: 'Stripe Payments',
      category: 'PAYMENT',
      description: 'Capture invoice payments, subscription status, and customer billing events in CRM.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg',
      authType: 'API_KEY',
      docUrl: 'https://stripe.com',
      supportedCapabilities: ['Invoice Sync', 'Payment Intent Webhooks', 'Subscription Tracking'],
    },
    // PAYPAL
    {
      key: 'PAYPAL',
      name: 'PayPal',
      category: 'PAYMENT',
      description: 'Sync client payments, payout receipts, and transaction status.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg',
      authType: 'API_KEY',
      docUrl: 'https://paypal.com',
      supportedCapabilities: ['Payment Verification', 'Dispute Alerts', 'Transaction Logs'],
    },
    // HUBSPOT
    {
      key: 'HUBSPOT',
      name: 'HubSpot CRM',
      category: 'CRM',
      description: 'Sync companies, contacts, deals, and marketing activities with Britsync CRM Suite.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/HubSpot_Logo.svg',
      authType: 'OAUTH2',
      docUrl: 'https://hubspot.com',
      supportedCapabilities: ['Contact Sync', 'Company Mapping', 'Deal Pipeline Sync'],
    },
    // SALESFORCE
    {
      key: 'SALESFORCE',
      name: 'Salesforce Enterprise',
      category: 'CRM',
      description: 'Enterprise bi-directional sync for Accounts, Leads, Opportunities, and Contracts.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg',
      authType: 'OAUTH2',
      docUrl: 'https://salesforce.com',
      supportedCapabilities: ['Account Sync', 'Lead Ingestion', 'Opportunity Pipeline', 'Custom Object Mapping'],
    },
    // ZAPIER
    {
      key: 'ZAPIER',
      name: 'Zapier Automation',
      category: 'AUTOMATION',
      description: 'Connect Britsync with 5,000+ external apps via Zapier Zaps and webhooks.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Zapier_logo.svg',
      authType: 'API_KEY',
      docUrl: 'https://zapier.com',
      supportedCapabilities: ['Trigger Engine', 'Action Handlers', 'Multi-Step Zaps'],
    },
    // MAKE (INTEGROMAT)
    {
      key: 'MAKE',
      name: 'Make (Integromat)',
      category: 'AUTOMATION',
      description: 'Build complex visual integration scenarios with Make webhooks and API keys.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Make-Logo.svg',
      authType: 'API_KEY',
      docUrl: 'https://make.com',
      supportedCapabilities: ['Scenario Webhooks', 'Data Transformations', 'Custom Modules'],
    },
    // WEBHOOK ENGINE
    {
      key: 'WEBHOOK_ENGINE',
      name: 'Webhook Engine',
      category: 'AUTOMATION',
      description: 'Custom HTTP webhook endpoints with HMAC-SHA256 signature verification.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Webhook_icon.svg',
      authType: 'WEBHOOK',
      docUrl: 'https://Britsync.os/docs/webhooks',
      supportedCapabilities: ['Inbound Webhooks', 'Outbound Webhooks', 'HMAC Verification', 'Retry Queue'],
    },
    // REST API
    {
      key: 'REST_API',
      name: 'Custom REST API Connector',
      category: 'AUTOMATION',
      description: 'Connect any proprietary REST API using custom headers, Bearer tokens, or Basic Auth.',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Logo-OpenAPI.svg',
      authType: 'API_KEY',
      docUrl: 'https://Britsync.os/docs/api',
      supportedCapabilities: ['Custom HTTP Requests', 'Header Management', 'JSON Payload Parser'],
    },
  ];

  async getProviders() {
    let dbProviders = await this.prisma.integrationProvider.findMany({
      orderBy: { name: 'asc' },
    });

    if (dbProviders.length === 0) {
      await this.seedCatalog();
      dbProviders = await this.prisma.integrationProvider.findMany({
        orderBy: { name: 'asc' },
      });
    }

    return dbProviders;
  }

  async seedCatalog() {
    for (const item of this.catalog) {
      await this.prisma.integrationProvider.upsert({
        where: { key: item.key },
        update: {
          name: item.name,
          category: item.category,
          description: item.description,
          iconUrl: item.iconUrl,
          authType: item.authType,
          docUrl: item.docUrl,
          supportedCapabilities: JSON.stringify(item.supportedCapabilities),
        },
        create: {
          key: item.key,
          name: item.name,
          category: item.category,
          description: item.description,
          iconUrl: item.iconUrl,
          authType: item.authType,
          docUrl: item.docUrl,
          supportedCapabilities: JSON.stringify(item.supportedCapabilities),
          isVerified: true,
          isEnabled: true,
        },
      });
    }
  }

  async getProviderByKey(key: string) {
    return this.prisma.integrationProvider.findUnique({ where: { key } });
  }
}
