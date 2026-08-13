import { Injectable } from '@nestjs/common';

export interface WorkflowPlan {
  agents: Array<{
    key: string;
    name: string;
    task: string;
    dependsOn?: string[];
  }>;
  description: string;
}

@Injectable()
export class WorkflowPlannerService {
  plan(prompt: string): WorkflowPlan {
    const lower = prompt.toLowerCase();

    if (lower.includes('proposal') || lower.includes('proposal for')) {
      return {
        description: 'Generate a complete client proposal with sales intelligence, knowledge research, financial analysis, meeting coordination, and executive approval.',
        agents: [
          { key: 'sales_agent', name: 'Sales Agent', task: 'Analyze CRM records for client history, pipeline data, and qualification status. Extract company details, past proposals, and opportunity value.' },
          { key: 'knowledge_assistant', name: 'Knowledge Assistant', task: 'Retrieve relevant knowledge base articles, SOP documents, and RAG-indexed content related to the proposal scope.' },
          { key: 'finance_assistant', name: 'Finance Assistant', task: 'Analyze contract terms, pricing models, budget constraints, and past financial data for the client.' },
          { key: 'meeting_assistant', name: 'Meeting Assistant', task: 'Review past meeting notes, action items, and follow-ups with the client. Extract key discussion points relevant to the proposal.' },
          { key: 'ceo_executive_assistant', name: 'CEO Executive Assistant', task: 'Review organization health, strategic priorities, and provide executive-level approval recommendation for the proposal.' },
        ],
      };
    }

    if (lower.includes('project') || lower.includes('task') || lower.includes('sprint') || lower.includes('milestone')) {
      return {
        description: 'Analyze project status, identify risks, and generate recommendations.',
        agents: [
          { key: 'project_manager_agent', name: 'Project Manager Agent', task: 'Analyze project health, milestone status, task completion rates, and resource allocation. Identify risks and bottlenecks.' },
          { key: 'knowledge_assistant', name: 'Knowledge Assistant', task: 'Retrieve relevant project documentation, SOPs, and lessons learned from knowledge base.' },
          { key: 'sales_agent', name: 'Sales Agent', task: 'Cross-reference any client commitments or deliverables that may impact project scope.' },
          { key: 'ceo_executive_assistant', name: 'CEO Executive Assistant', task: 'Provide strategic context and organization-level priorities.' },
        ],
      };
    }

    if (lower.includes('meeting') || lower.includes('agenda') || lower.includes('sync')) {
      return {
        description: 'Prepare meeting agenda, gather context, and coordinate follow-ups.',
        agents: [
          { key: 'meeting_assistant', name: 'Meeting Assistant', task: 'Review past meeting notes, extract pending action items, and suggest agenda structure.' },
          { key: 'project_manager_agent', name: 'Project Manager Agent', task: 'Provide current project status updates and relevant task context for the meeting.' },
          { key: 'sales_agent', name: 'Sales Agent', task: 'Provide any client-related updates or deal progress relevant to the meeting.' },
          { key: 'knowledge_assistant', name: 'Knowledge Assistant', task: 'Retrieve relevant documents and knowledge base articles for meeting preparation.' },
          { key: 'ceo_executive_assistant', name: 'CEO Executive Assistant', task: 'Summarize strategic importance and key talking points for leadership.' },
        ],
      };
    }

    if (lower.includes('finance') || lower.includes('revenue') || lower.includes('budget') || lower.includes('contract')) {
      return {
        description: 'Analyze financial data, contracts, and generate financial insights.',
        agents: [
          { key: 'finance_assistant', name: 'Finance Assistant', task: 'Analyze revenue, contracts, budgets, and financial KPIs. Identify risks and opportunities.' },
          { key: 'sales_agent', name: 'Sales Agent', task: 'Provide sales pipeline data and opportunity values relevant to financial analysis.' },
          { key: 'project_manager_agent', name: 'Project Manager Agent', task: 'Provide project budget consumption and resource cost data.' },
          { key: 'ceo_executive_assistant', name: 'CEO Executive Assistant', task: 'Provide strategic financial context and organizational priorities.' },
        ],
      };
    }

    if (lower.includes('knowledge') || lower.includes('research') || lower.includes('document') || lower.includes('learn')) {
      return {
        description: 'Retrieve and synthesize enterprise knowledge across documents and RAG index.',
        agents: [
          { key: 'knowledge_assistant', name: 'Knowledge Assistant', task: 'Perform comprehensive search across knowledge base, documents, and RAG index. Synthesize findings.' },
          { key: 'meeting_assistant', name: 'Meeting Assistant', task: 'Review meeting notes and action items relevant to the research topic.' },
          { key: 'project_manager_agent', name: 'Project Manager Agent', task: 'Provide project context and related documentation.' },
          { key: 'sales_agent', name: 'Sales Agent', task: 'Cross-reference any CRM data relevant to the knowledge request.' },
        ],
      };
    }

    return {
      description: 'General multi-agent analysis across all enterprise data sources.',
      agents: [
        { key: 'ceo_executive_assistant', name: 'CEO Executive Assistant', task: 'Provide executive overview and organization-wide context for the request.' },
        { key: 'knowledge_assistant', name: 'Knowledge Assistant', task: 'Search knowledge base and documents for relevant information.' },
        { key: 'sales_agent', name: 'Sales Agent', task: 'Provide CRM intelligence relevant to the request.' },
        { key: 'project_manager_agent', name: 'Project Manager Agent', task: 'Provide project and task context relevant to the request.' },
        { key: 'meeting_assistant', name: 'Meeting Assistant', task: 'Gather meeting context relevant to the request.' },
        { key: 'finance_assistant', name: 'Finance Assistant', task: 'Provide financial data relevant to the request.' },
      ],
    };
  }
}
