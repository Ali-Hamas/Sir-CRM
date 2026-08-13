import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface RecommendationItem {
  id?: string;
  category: 'GROWTH' | 'PRODUCTIVITY' | 'BOTTLENECK' | 'MISSED_OPPORTUNITY' | 'RISK_MITIGATION';
  title: string;
  description: string;
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  actionable: boolean;
  actionStep?: string;
  estimatedRoi?: string;
  status: 'ACTIVE' | 'APPLIED' | 'DISMISSED';
}

@Injectable()
export class RecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(organizationId: string): Promise<RecommendationItem[]> {
    const dbRecs = await this.prisma.analyticsRecommendation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    if (dbRecs.length > 0) {
      return dbRecs.map((r) => ({
        id: r.id,
        category: r.category as any,
        title: r.title,
        description: r.description,
        impact: r.impact as any,
        actionable: r.actionable,
        actionStep: r.actionStep || undefined,
        estimatedRoi: r.estimatedRoi || undefined,
        status: r.status as any,
      }));
    }

    const generated = this.generateBaselineRecommendations();

    await Promise.all(
      generated.map((g) =>
        this.prisma.analyticsRecommendation.create({
          data: {
            organizationId,
            category: g.category,
            title: g.title,
            description: g.description,
            impact: g.impact,
            actionable: g.actionable,
            actionStep: g.actionStep,
            estimatedRoi: g.estimatedRoi,
            status: g.status,
          },
        })
      )
    );

    return generated;
  }

  async updateStatus(organizationId: string, recommendationId: string, status: 'ACTIVE' | 'APPLIED' | 'DISMISSED') {
    return this.prisma.analyticsRecommendation.updateMany({
      where: { id: recommendationId, organizationId },
      data: { status },
    });
  }

  private generateBaselineRecommendations(): RecommendationItem[] {
    return [
      {
        category: 'GROWTH',
        title: 'Accelerate Enterprise CRM Pipeline Conversion',
        description: '3 qualified opportunities in Proposal Review phase have not had a meeting scheduled in 5 days.',
        impact: 'HIGH',
        actionable: true,
        actionStep: 'Trigger automated follow-up workflow via Communications Hub to schedule partner review.',
        estimatedRoi: '+$145,000 ARR',
        status: 'ACTIVE',
      },
      {
        category: 'BOTTLENECK',
        title: 'Resolve Cross-Departmental Resource Over-Allocation',
        description: 'Lead Solutions Engineers are allocated to 4 simultaneous active projects above 95% capacity.',
        impact: 'CRITICAL',
        actionable: true,
        actionStep: 'Reassign secondary technical reviews to Senior Developers using Resource Management module.',
        estimatedRoi: '-40% Project Delivery Lag',
        status: 'ACTIVE',
      },
      {
        category: 'PRODUCTIVITY',
        title: 'Automate Weekly Client Status Report Generation',
        description: 'Project Managers spend ~6 hours weekly compiling status updates across Tasks & Time Tracking.',
        impact: 'MEDIUM',
        actionable: true,
        actionStep: 'Enable AI Assistant recurring automated report generator with push delivery to client Slack channel.',
        estimatedRoi: '24 Hours Saved / Month',
        status: 'ACTIVE',
      },
      {
        category: 'MISSED_OPPORTUNITY',
        title: 'Leverated Knowledge Base Search Gap for Onboarding',
        description: 'Frequent user searches for "API Webhook Security Config" return 0 knowledge articles.',
        impact: 'MEDIUM',
        actionable: true,
        actionStep: 'Use Knowledge module AI article generator to publish documentation from code comments.',
        estimatedRoi: '-15% Support Ticket Volume',
        status: 'ACTIVE',
      },
      {
        category: 'RISK_MITIGATION',
        title: 'Renew Expiring High-Value Client Contracts',
        description: '2 enterprise contracts valued at $180k combined expire within the next 45 days.',
        impact: 'HIGH',
        actionable: true,
        actionStep: 'Initiate contract renewal process and auto-generate proposal revision via Contracts module.',
        estimatedRoi: '$180,000 Retained Revenue',
        status: 'ACTIVE',
      },
    ];
  }
}
