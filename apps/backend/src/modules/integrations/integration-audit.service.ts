import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class IntegrationAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(organizationId: string, level?: string) {
    const where: any = { organizationId };
    if (level && level !== 'ALL') where.level = level;

    return this.prisma.integrationLog.findMany({
      where,
      include: { connection: { include: { provider: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getTemplates(organizationId: string) {
    const templates = await this.prisma.integrationTemplate.findMany({
      where: {
        OR: [{ organizationId }, { isPublic: true }],
      },
      include: { provider: true },
      orderBy: { name: 'asc' },
    });

    if (templates.length === 0) {
      return this.seedDefaultTemplates(organizationId);
    }

    return templates;
  }

  private async seedDefaultTemplates(organizationId: string) {
    const providers = await this.prisma.integrationProvider.findMany();
    const slackProv = providers.find((p) => p.key === 'SLACK');
    const githubProv = providers.find((p) => p.key === 'GITHUB');
    const stripeProv = providers.find((p) => p.key === 'STRIPE');

    const seedItems = [
      {
        name: 'GitHub Issue -> Britsync Task Auto-Sync',
        description: 'Automatically convert new GitHub issues into Britsync project tasks.',
        category: 'PROJECT',
        providerId: githubProv?.id || null,
        configTemplateJson: JSON.stringify({ trigger: 'github.issue.created', action: 'create_task' }),
        isPublic: true,
      },
      {
        name: 'Slack Notification on Deal Won',
        description: 'Send a celebrated message to #sales-wins when a CRM Opportunity stage changes to Closed Won.',
        category: 'CRM',
        providerId: slackProv?.id || null,
        configTemplateJson: JSON.stringify({ trigger: 'crm.opportunity.won', action: 'slack_send_message' }),
        isPublic: true,
      },
      {
        name: 'Stripe Invoice Payment -> Contract Renewal',
        description: 'Auto-update CRM contract payment status when Stripe payment_intent succeeds.',
        category: 'PAYMENT',
        providerId: stripeProv?.id || null,
        configTemplateJson: JSON.stringify({ trigger: 'stripe.payment.succeeded', action: 'update_contract_status' }),
        isPublic: true,
      },
    ];

    await Promise.all(
      seedItems.map((item) =>
        this.prisma.integrationTemplate.create({
          data: {
            organizationId,
            providerId: item.providerId,
            name: item.name,
            description: item.description,
            category: item.category,
            configTemplateJson: item.configTemplateJson,
            isPublic: item.isPublic,
          },
        })
      )
    );

    return this.prisma.integrationTemplate.findMany({
      where: { OR: [{ organizationId }, { isPublic: true }] },
      include: { provider: true },
    });
  }
}
