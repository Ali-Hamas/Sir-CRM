import { Injectable } from '@nestjs/common';

export interface ExecutiveInsightItem {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  actionable: boolean;
  recommendedAction: string;
  metadata?: any;
}

@Injectable()
export class InsightsService {
  /**
   * Get synthesized executive insights across business categories.
   */
  async getInsights(orgId: string): Promise<ExecutiveInsightItem[]> {
    return [
      {
        id: 'ins_1',
        category: 'HEALTH_SUMMARY',
        title: 'Organization Health at Peak Capacity',
        description: 'Overall Health Index is 94/100. Q3 gross margin expanded to 68.4% with strong project delivery and low client churn.',
        impact: 'HIGH',
        actionable: true,
        recommendedAction: 'Maintain current hiring pace for senior engineers to prevent workload burnout.',
      },
      {
        id: 'ins_2',
        category: 'SALES_RECOMMENDATION',
        title: 'Accelerate Enterprise Proposal Sign-offs',
        description: '3 high-value enterprise leads ($380,000 total pipeline) have been in Proposal stage for >12 days.',
        impact: 'HIGH',
        actionable: true,
        recommendedAction: 'Schedule executive sponsor calls with Global Tech and Acme Corp VP of Procurement.',
      },
      {
        id: 'ins_3',
        category: 'PROJECT_RISK',
        title: 'API Integration Milestone Delay Risk',
        description: 'Milestone "API Integration v2" is 3 days behind due to OAuth 2.0 refactoring backlog.',
        impact: 'CRITICAL',
        actionable: true,
        recommendedAction: 'Reassign 1 senior backend dev from internal tool optimization to API sprint.',
      },
      {
        id: 'ins_4',
        category: 'RESOURCE_RISK',
        title: 'Frontend UI Team Over-Allocation',
        description: 'Frontend team load is currently at 94% capacity across 4 concurrent client projects.',
        impact: 'HIGH',
        actionable: true,
        recommendedAction: 'Approve contractor request or adjust milestone deliverables for Sprint 15.',
      },
      {
        id: 'ins_5',
        category: 'CONTRACT_EXPIRATION',
        title: 'Apex Systems Contract Renewal Window Open',
        description: '$120,000 annual contract with Apex Systems enters 30-day renewal notice period next Monday.',
        impact: 'HIGH',
        actionable: true,
        recommendedAction: 'Trigger Sales Agent automated renewal briefing and send updated pricing addendum.',
      },
      {
        id: 'ins_6',
        category: 'MISSED_OPPORTUNITY',
        title: 'Upsell Potential in Financial Services Segment',
        description: 'Client Global Retail Tech has expanded team size by 40% but remains on mid-tier license.',
        impact: 'MEDIUM',
        actionable: true,
        recommendedAction: 'Direct Sales Agent to prepare Enterprise Tier upgrade proposal.',
      },
      {
        id: 'ins_7',
        category: 'KNOWLEDGE_GAP',
        title: 'Documentation Gap in Security Audit SOPs',
        description: 'Search analytics indicate 76 failed queries for SOC2 compliance and data residency policies.',
        impact: 'MEDIUM',
        actionable: true,
        recommendedAction: 'Task Knowledge Assistant with indexing latest SOC2 compliance documentation.',
      },
      {
        id: 'ins_8',
        category: 'EXECUTIVE_RECOMMENDATION',
        title: 'Expand Specialized AI Agent Coverage to HR & Operations',
        description: 'AI Tool Framework shows 98.4% success rate in Sales and PM. HR onboarding automation has high ROI potential.',
        impact: 'HIGH',
        actionable: true,
        recommendedAction: 'Approve creation of HR & Talent Acquisition AI Agent in Q4 roadmap.',
      },
      {
        id: 'ins_9',
        category: 'WEEKLY_ACTION',
        title: 'Executive Weekly Action Checklist',
        description: 'Key C-suite alignment items for this week: 1. Finalize Q3 budget review, 2. Approve AI Agent deployment, 3. Host All-Hands.',
        impact: 'HIGH',
        actionable: true,
        recommendedAction: 'Review weekly executive dashboard metrics prior to Monday strategy meeting.',
      },
    ];
  }
}
