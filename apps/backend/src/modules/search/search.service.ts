import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface SearchResultItem {
  id: string;
  type: 'company' | 'contact' | 'lead' | 'opportunity' | 'meeting' | 'proposal' | 'contract' | 'project' | 'task' | 'knowledge' | 'document' | 'user' | 'team';
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  badge?: string;
  updatedAt?: Date | string;
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async globalSearch(
    orgId: string,
    userId: string,
    query: string,
    modulesFilter?: string[],
    limitPerModule: number = 5,
  ) {
    if (!query || query.trim().length === 0) {
      return { query: '', totalCount: 0, results: [] };
    }

    const q = query.trim();

    // Record Recent Search asynchronously
    if (q.length >= 2) {
      this.recordRecentSearch(orgId, userId, q).catch(() => null);
    }

    const shouldSearch = (moduleName: string) => {
      if (!modulesFilter || modulesFilter.length === 0 || modulesFilter.includes('all')) return true;
      return modulesFilter.includes(moduleName);
    };

    const searchPromises: Promise<SearchResultItem[]>[] = [];

    // 1. Companies
    if (shouldSearch('companies') || shouldSearch('crm')) {
      searchPromises.push(
        (this.prisma as any).company.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            OR: [{ name: { contains: q } }, { industry: { contains: q } }],
          },
          take: limitPerModule,
        }).then((items: any[]) =>
          items.map((item) => ({
            id: item.id,
            type: 'company' as const,
            title: item.name,
            subtitle: item.industry || 'Company',
            description: item.city || item.country || undefined,
            url: `/crm/companies/${item.id}`,
            updatedAt: item.updatedAt,
          }))
        ).catch(() => [])
      );
    }

    // 2. Contacts
    if (shouldSearch('contacts') || shouldSearch('crm')) {
      searchPromises.push(
        (this.prisma as any).contact.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
              { jobTitle: { contains: q } },
            ],
          },
          take: limitPerModule,
        }).then((items: any[]) =>
          items.map((item) => ({
            id: item.id,
            type: 'contact' as const,
            title: `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email,
            subtitle: item.jobTitle || 'Contact',
            description: item.email,
            url: `/crm/contacts/${item.id}`,
            updatedAt: item.updatedAt,
          }))
        ).catch(() => [])
      );
    }

    // 3. Leads
    if (shouldSearch('leads') || shouldSearch('crm')) {
      searchPromises.push(
        (this.prisma as any).lead.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            OR: [{ title: { contains: q } }, { companyName: { contains: q } }],
          },
          take: limitPerModule,
        }).then((items: any[]) =>
          items.map((item) => ({
            id: item.id,
            type: 'lead' as const,
            title: item.title,
            subtitle: item.companyName || 'Lead',
            description: item.status,
            url: `/crm/leads/${item.id}`,
            updatedAt: item.updatedAt,
          }))
        ).catch(() => [])
      );
    }

    // 4. Opportunities
    if (shouldSearch('opportunities') || shouldSearch('crm')) {
      searchPromises.push(
        (this.prisma as any).opportunity.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            OR: [{ title: { contains: q } }],
          },
          take: limitPerModule,
        }).then((items: any[]) =>
          items.map((item) => ({
            id: item.id,
            type: 'opportunity' as const,
            title: item.title,
            subtitle: item.stage || 'Opportunity',
            description: item.value ? `$${item.value}` : undefined,
            url: `/crm/opportunities/${item.id}`,
            updatedAt: item.updatedAt,
          }))
        ).catch(() => [])
      );
    }

    // 5. Meetings
    if (shouldSearch('meetings') || shouldSearch('crm')) {
      searchPromises.push(
        (this.prisma as any).meeting.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            OR: [{ title: { contains: q } }, { location: { contains: q } }],
          },
          take: limitPerModule,
        }).then((items: any[]) =>
          items.map((item) => ({
            id: item.id,
            type: 'meeting' as const,
            title: item.title,
            subtitle: item.location || 'Meeting',
            description: item.startTime ? new Date(item.startTime).toLocaleDateString() : undefined,
            url: `/crm/meetings/${item.id}`,
            updatedAt: item.updatedAt,
          }))
        ).catch(() => [])
      );
    }

    // 6. Proposals
    if (shouldSearch('proposals') || shouldSearch('crm')) {
      searchPromises.push(
        (this.prisma as any).proposal.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            OR: [{ title: { contains: q } }],
          },
          take: limitPerModule,
        }).then((items: any[]) =>
          items.map((item) => ({
            id: item.id,
            type: 'proposal' as const,
            title: item.title,
            subtitle: item.status || 'Proposal',
            description: item.totalAmount ? `$${item.totalAmount}` : undefined,
            url: `/crm/proposals/${item.id}`,
            updatedAt: item.updatedAt,
          }))
        ).catch(() => [])
      );
    }

    // 7. Contracts
    if (shouldSearch('contracts') || shouldSearch('crm')) {
      searchPromises.push(
        (this.prisma as any).contract.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            OR: [{ title: { contains: q } }],
          },
          take: limitPerModule,
        }).then((items: any[]) =>
          items.map((item) => ({
            id: item.id,
            type: 'contract' as const,
            title: item.title,
            subtitle: item.status || 'Contract',
            description: item.contractValue ? `$${item.contractValue}` : undefined,
            url: `/crm/contracts/${item.id}`,
            updatedAt: item.updatedAt,
          }))
        ).catch(() => [])
      );
    }

    // 8. Projects
    if (shouldSearch('projects')) {
      searchPromises.push(
        (this.prisma as any).project.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            OR: [{ name: { contains: q } }, { key: { contains: q } }, { description: { contains: q } }],
          },
          take: limitPerModule,
        }).then((items: any[]) =>
          items.map((item) => ({
            id: item.id,
            type: 'project' as const,
            title: item.name,
            subtitle: item.key ? `[${item.key}]` : 'Project',
            description: item.description || undefined,
            url: `/projects/${item.id}`,
            updatedAt: item.updatedAt,
          }))
        ).catch(() => [])
      );
    }

    // 9. Tasks
    if (shouldSearch('tasks') || shouldSearch('projects')) {
      searchPromises.push(
        (this.prisma as any).task.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            OR: [{ title: { contains: q } }, { key: { contains: q } }, { description: { contains: q } }],
          },
          take: limitPerModule,
        }).then((items: any[]) =>
          items.map((item) => ({
            id: item.id,
            type: 'task' as const,
            title: item.title,
            subtitle: item.key ? `[${item.key}]` : item.status,
            description: item.description || undefined,
            url: `/projects/tasks/${item.id}`,
            updatedAt: item.updatedAt,
          }))
        ).catch(() => [])
      );
    }

    // 10. Knowledge Articles
    if (shouldSearch('knowledge')) {
      searchPromises.push(
        (this.prisma as any).knowledgeArticle.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            OR: [{ title: { contains: q } }, { summary: { contains: q } }, { content: { contains: q } }],
          },
          take: limitPerModule,
        }).then((items: any[]) =>
          items.map((item) => ({
            id: item.id,
            type: 'knowledge' as const,
            title: item.title,
            subtitle: item.status || 'Article',
            description: item.summary || undefined,
            url: `/knowledge/articles/${item.id}`,
            updatedAt: item.updatedAt,
          }))
        ).catch(() => [])
      );
    }

    // 11. Documents
    if (shouldSearch('documents')) {
      searchPromises.push(
        (this.prisma as any).document.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            OR: [{ name: { contains: q } }, { originalName: { contains: q } }],
          },
          take: limitPerModule,
        }).then((items: any[]) =>
          items.map((item) => ({
            id: item.id,
            type: 'document' as const,
            title: item.name || item.originalName,
            subtitle: item.mimeType || 'File',
            description: item.originalName || undefined,
            url: `/documents`,
            updatedAt: item.updatedAt,
          }))
        ).catch(() => [])
      );
    }

    // 12. Users
    if (shouldSearch('users') || shouldSearch('people')) {
      searchPromises.push(
        (this.prisma as any).user.findMany({
          where: {
            organizationMembers: { some: { organizationId: orgId } },
            OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }],
          },
          take: limitPerModule,
        }).then((items: any[]) =>
          items.map((item) => ({
            id: item.id,
            type: 'user' as const,
            title: `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email,
            subtitle: item.role || 'User',
            description: item.email,
            url: `/users`,
            updatedAt: item.updatedAt,
          }))
        ).catch(() => [])
      );
    }

    // 13. Teams
    if (shouldSearch('teams') || shouldSearch('people')) {
      searchPromises.push(
        (this.prisma as any).team.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            OR: [{ name: { contains: q } }, { description: { contains: q } }],
          },
          take: limitPerModule,
        }).then((items: any[]) =>
          items.map((item) => ({
            id: item.id,
            type: 'team' as const,
            title: item.name,
            subtitle: 'Team',
            description: item.description || undefined,
            url: `/teams`,
            updatedAt: item.updatedAt,
          }))
        ).catch(() => [])
      );
    }

    const nestedResults = await Promise.all(searchPromises);
    const results = nestedResults.flat();

    return {
      query: q,
      totalCount: results.length,
      results,
    };
  }

  private async recordRecentSearch(orgId: string, userId: string, query: string) {
    try {
      const existing = await (this.prisma as any).recentSearch.findFirst({
        where: { organizationId: orgId, userId, query },
      });

      if (!existing) {
        await (this.prisma as any).recentSearch.create({
          data: { organizationId: orgId, userId, query },
        });
      }
    } catch (e) {
      // Ignore background write errors
    }
  }

  async getRecentSearches(orgId: string, userId: string) {
    try {
      const recent = await (this.prisma as any).recentSearch.findMany({
        where: { organizationId: orgId, userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      return recent.map((r: any) => ({ id: r.id, query: r.query, createdAt: r.createdAt }));
    } catch (e) {
      return [];
    }
  }

  async clearRecentSearches(orgId: string, userId: string) {
    try {
      await (this.prisma as any).recentSearch.deleteMany({
        where: { organizationId: orgId, userId },
      });
      return { success: true };
    } catch (e) {
      return { success: true };
    }
  }
}
