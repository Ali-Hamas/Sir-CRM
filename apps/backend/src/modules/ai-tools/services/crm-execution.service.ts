import { Injectable, NotFoundException } from '@nestjs/common';
import { CompaniesService } from '../../companies/companies.service';
import { ContactsService } from '../../contacts/contacts.service';
import { LeadsService } from '../../leads/leads.service';
import { OpportunitiesService } from '../../opportunities/opportunities.service';
import { MeetingsService } from '../../meetings/meetings.service';
import { ProposalsService } from '../../proposals/proposals.service';
import { ContractsService } from '../../contracts/contracts.service';

@Injectable()
export class CRMExecutionService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly contactsService: ContactsService,
    private readonly leadsService: LeadsService,
    private readonly opportunitiesService: OpportunitiesService,
    private readonly meetingsService: MeetingsService,
    private readonly proposalsService: ProposalsService,
    private readonly contractsService: ContractsService,
  ) {}

  async executeCompanyTool(toolKey: string, orgId: string, userId: string, params: Record<string, any>) {
    switch (toolKey) {
      case 'crm_create_company': {
        const company = await this.companiesService.create(orgId, userId, {
          name: params.name,
          industry: params.industry,
          website: params.website,
          annualRevenue: params.annualRevenue ? Number(params.annualRevenue) : undefined,
          numberOfEmployees: params.numberOfEmployees ? Number(params.numberOfEmployees) : undefined,
          status: params.status || 'PROSPECT',
        });
        return {
          companyId: company.id,
          name: company.name,
          status: company.status,
          summary: `Successfully registered new company "${company.name}" (ID: ${company.id})`,
        };
      }

      case 'crm_update_company': {
        const updated = await this.companiesService.update(params.companyId, orgId, userId, {
          name: params.name,
          industry: params.industry,
          status: params.status,
          assignedToId: params.assignedToId,
        });
        return {
          companyId: updated.id,
          name: updated.name,
          status: updated.status,
          summary: `Successfully updated company "${updated.name}" (ID: ${updated.id})`,
        };
      }

      case 'crm_search_company': {
        const result = await this.companiesService.findAll(orgId, {
          search: params.query,
          industry: params.industry,
        });
        return {
          totalFound: (result as any)?.items?.length || (result as any)?.length || 0,
          companies: (result as any)?.items || result || [],
          summary: `Found ${((result as any)?.items || result || []).length} matching companies for search query "${params.query}"`,
        };
      }

      default:
        throw new NotFoundException(`CRM company tool handler '${toolKey}' not found`);
    }
  }

  async executeContactTool(toolKey: string, orgId: string, userId: string, params: Record<string, any>) {
    switch (toolKey) {
      case 'crm_create_contact': {
        const contact = await this.contactsService.create(orgId, userId, {
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email,
          phone: params.phone,
          companyId: params.companyId,
          jobTitle: params.jobTitle,
        });
        return {
          contactId: contact.id,
          name: `${contact.firstName} ${contact.lastName}`,
          email: contact.email,
          summary: `Created contact profile for "${contact.firstName} ${contact.lastName}" (ID: ${contact.id})`,
        };
      }

      case 'crm_update_contact': {
        const updated = await this.contactsService.update(params.contactId, orgId, userId, {
          jobTitle: params.jobTitle,
          email: params.email,
          phone: params.phone,
          status: params.status,
        });
        return {
          contactId: updated.id,
          name: `${updated.firstName} ${updated.lastName}`,
          summary: `Updated contact record for "${updated.firstName} ${updated.lastName}"`,
        };
      }

      default:
        throw new NotFoundException(`CRM contact tool handler '${toolKey}' not found`);
    }
  }

  async executeLeadTool(toolKey: string, orgId: string, userId: string, params: Record<string, any>) {
    switch (toolKey) {
      case 'crm_create_lead': {
        const lead = await this.leadsService.create(orgId, userId, {
          firstName: params.firstName,
          lastName: params.lastName,
          companyName: params.companyName,
          email: params.email,
          phone: params.phone,
          source: params.source || 'AI_ASSISTANT',
          estimatedValue: params.estimatedValue ? Number(params.estimatedValue) : undefined,
        });
        return {
          leadId: lead.id,
          name: `${lead.firstName} ${lead.lastName}`,
          companyName: lead.companyName,
          summary: `Captured sales lead "${lead.firstName} ${lead.lastName}" at ${lead.companyName} (ID: ${lead.id})`,
        };
      }

      case 'crm_convert_lead': {
        const converted = await this.leadsService.convert(orgId, params.leadId, userId, {
          companyId: params.companyId,
          opportunityName: params.opportunityName,
          estimatedValue: params.estimatedValue ? Number(params.estimatedValue) : undefined,
        });
        return {
          leadId: params.leadId,
          result: converted,
          summary: `Successfully converted lead ${params.leadId} into active opportunity`,
        };
      }

      default:
        throw new NotFoundException(`CRM lead tool handler '${toolKey}' not found`);
    }
  }

  async executePipelineTool(toolKey: string, orgId: string, userId: string, params: Record<string, any>) {
    switch (toolKey) {
      case 'crm_create_opportunity': {
        const opp = await this.opportunitiesService.create(orgId, userId, {
          name: params.name,
          companyId: params.companyId,
          estimatedValue: params.estimatedValue ? Number(params.estimatedValue) : 50000,
          probability: params.probability ? Number(params.probability) : 60,
          stage: params.stage || 'QUALIFICATION',
        });
        return {
          opportunityId: opp.id,
          name: opp.name,
          estimatedValue: opp.estimatedValue,
          summary: `Registered sales opportunity "${opp.name}" (ID: ${opp.id})`,
        };
      }

      case 'crm_create_meeting': {
        const meeting = await this.meetingsService.create(orgId, userId, {
          title: params.title || 'Client Sync Meeting',
          companyId: params.companyId,
          startTime: params.startTime ? new Date(params.startTime) : new Date(),
          endTime: params.endTime ? new Date(params.endTime) : new Date(Date.now() + 1800000),
          notes: params.notes,
        });
        return {
          meetingId: meeting.id,
          title: meeting.title,
          summary: `Scheduled meeting "${meeting.title}" (ID: ${meeting.id})`,
        };
      }

      case 'crm_create_proposal': {
        const proposal = await this.proposalsService.create(orgId, userId, {
          title: params.title,
          companyId: params.companyId,
          totalValue: params.amount ? Number(params.amount) : 25000,
          status: 'DRAFT',
        });
        return {
          proposalId: proposal.id,
          title: proposal.title,
          amount: proposal.totalValue,
          summary: `Created draft sales proposal "${proposal.title}" (ID: ${proposal.id})`,
        };
      }

      case 'crm_create_contract': {
        const contract = await this.contractsService.create(orgId, userId, {
          title: params.title,
          companyId: params.companyId,
          contractValue: params.contractValue ? Number(params.contractValue) : 50000,
          status: 'DRAFT',
        });
        return {
          contractId: contract.id,
          title: contract.title,
          contractValue: contract.contractValue,
          summary: `Created draft contract "${contract.title}" (ID: ${contract.id})`,
        };
      }

      default:
        throw new NotFoundException(`CRM pipeline tool handler '${toolKey}' not found`);
    }
  }
}
