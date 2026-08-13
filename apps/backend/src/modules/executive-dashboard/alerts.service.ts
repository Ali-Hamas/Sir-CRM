import { Injectable } from '@nestjs/common';

export interface AlertItem {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  sourceModule: string;
  actionUrl?: string;
  isAcknowledged: boolean;
  createdAt: Date;
}

@Injectable()
export class AlertsService {
  /**
   * Get active executive alerts & risk notifications.
   */
  async getAlerts(orgId: string): Promise<AlertItem[]> {
    return [
      {
        id: 'alt_1',
        severity: 'CRITICAL',
        title: 'Project Milestone Delay Detected',
        message: 'Milestone "API Integration v2" in Project "Enterprise Client Onboarding" is 3 days overdue due to OAuth refactoring.',
        sourceModule: 'PROJECTS',
        actionUrl: '/projects',
        isAcknowledged: false,
        createdAt: new Date(),
      },
      {
        id: 'alt_2',
        severity: 'WARNING',
        title: 'Contract Renewal Window Opening',
        message: 'Apex Systems ($120,000 ARR) enters 30-day renewal notice period. Executive outreach recommended.',
        sourceModule: 'CONTRACTS',
        actionUrl: '/crm/contracts',
        isAcknowledged: false,
        createdAt: new Date(Date.now() - 3600000 * 4),
      },
      {
        id: 'alt_3',
        severity: 'WARNING',
        title: 'High Resource Load in Frontend Team',
        message: 'Frontend development team workload utilization reached 94% across active sprints.',
        sourceModule: 'RESOURCES',
        actionUrl: '/projects/resources',
        isAcknowledged: false,
        createdAt: new Date(Date.now() - 3600000 * 8),
      },
      {
        id: 'alt_4',
        severity: 'INFO',
        title: 'Enterprise RAG Index Sync Complete',
        message: 'RAG Vector Engine successfully indexed 86 knowledge articles and 104 documents with 0 errors.',
        sourceModule: 'KNOWLEDGE',
        actionUrl: '/ai/rag',
        isAcknowledged: true,
        createdAt: new Date(Date.now() - 3600000 * 24),
      },
    ];
  }
}
