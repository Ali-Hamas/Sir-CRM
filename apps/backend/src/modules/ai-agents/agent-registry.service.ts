import { Injectable } from '@nestjs/common';

export interface AgentSpec {
  key: string;
  name: string;
  role: string;
  department: string;
  description: string;
  avatar?: string;
  systemPrompt: string;
  capabilities: Array<{ capability: string; displayName: string; description: string; enabled: boolean }>;
  knowledgeScopes: Array<{ scopeType: string; allowed: boolean }>;
  toolAccesses: Array<{ toolKey: string; allowed: boolean; requiresApproval: boolean }>;
}

@Injectable()
export class AgentRegistryService {
  private readonly defaultAgents: AgentSpec[] = [
    {
      key: 'sales_agent',
      name: 'Sales Agent',
      role: 'Sales Intelligence & Lead Qualification Specialist',
      department: 'Sales',
      description: 'Automates lead qualification, CRM analysis, proposal recommendations, and sales pipeline tracking.',
      systemPrompt: 'You are the Enterprise Sales Agent for BlackDesk OS. You have full visibility over CRM records (Companies, Contacts, Leads, Opportunities, Meetings, Contracts, Proposals). Your goal is to qualify leads, analyze deal pipelines, recommend proposals, summarize customer meetings, and draft follow-up actions.',
      capabilities: [
        { capability: 'LEAD_QUALIFICATION', displayName: 'Lead Qualification', description: 'Evaluate leads based on BANT score and engagement', enabled: true },
        { capability: 'PIPELINE_ANALYSIS', displayName: 'Sales Pipeline Analysis', description: 'Analyze stage velocity, conversion rates, and revenue risks', enabled: true },
        { capability: 'PROPOSAL_RECOMMENDATIONS', displayName: 'Proposal Recommendations', description: 'Suggest pricing, scope, and terms for active leads', enabled: true },
        { capability: 'MEETING_SUMMARIES', displayName: 'Meeting Summaries', description: 'Extract deal insights from sales call transcripts', enabled: true },
        { capability: 'FOLLOWUP_SUGGESTIONS', displayName: 'Follow-up Suggestions', description: 'Generate personalized outreach sequences', enabled: true },
        { capability: 'CRM_SEARCH', displayName: 'CRM Search', description: 'Query companies, contacts, and opportunities', enabled: true },
      ],
      knowledgeScopes: [
        { scopeType: 'CRM_COMPANIES', allowed: true },
        { scopeType: 'CRM_CONTACTS', allowed: true },
        { scopeType: 'CRM_LEADS', allowed: true },
        { scopeType: 'CRM_OPPORTUNITIES', allowed: true },
        { scopeType: 'CRM_MEETINGS', allowed: true },
        { scopeType: 'CRM_CONTRACTS', allowed: true },
        { scopeType: 'CRM_PROPOSALS', allowed: true },
      ],
      toolAccesses: [
        { toolKey: 'crm_search', allowed: true, requiresApproval: false },
        { toolKey: 'crm_qualify_lead', allowed: true, requiresApproval: false },
        { toolKey: 'crm_analyze_pipeline', allowed: true, requiresApproval: false },
        { toolKey: 'crm_generate_proposal_args', allowed: true, requiresApproval: false },
        { toolKey: 'crm_suggest_followup', allowed: true, requiresApproval: false },
      ],
    },
    {
      key: 'project_manager_agent',
      name: 'Project Manager Agent',
      role: 'Project Delivery & Risk Tracking Specialist',
      department: 'Project Management',
      description: 'Tracks project health, flags risks, analyzes deadlines, recommends resource allocation, and reports progress.',
      systemPrompt: 'You are the Project Manager Agent for BlackDesk OS. You monitor Projects, Tasks, Milestones, Time Tracking, and Resource Allocations. Your goal is to detect delivery risks early, prioritize tasks, optimize resource loading, and ensure milestones are hit.',
      capabilities: [
        { capability: 'PROJECT_SUMMARIES', displayName: 'Project Summaries', description: 'Generate high-level and granular sprint/project summaries', enabled: true },
        { capability: 'RISK_DETECTION', displayName: 'Risk Detection', description: 'Identify bottleneck tasks, overdue milestones, and scope creep', enabled: true },
        { capability: 'DEADLINE_ANALYSIS', displayName: 'Deadline Analysis', description: 'Forecast completion dates based on historical velocity', enabled: true },
        { capability: 'RESOURCE_RECOMMENDATIONS', displayName: 'Resource Recommendations', description: 'Balance team workload and suggest task assignments', enabled: true },
        { capability: 'TASK_PRIORITIZATION', displayName: 'Task Prioritization', description: 'Recommend Eisenhower/RICE priority matrix for backlogs', enabled: true },
        { capability: 'PROGRESS_REPORTING', displayName: 'Progress Reporting', description: 'Draft weekly and monthly status reports for stakeholders', enabled: true },
      ],
      knowledgeScopes: [
        { scopeType: 'PROJECTS', allowed: true },
        { scopeType: 'TASKS', allowed: true },
        { scopeType: 'MILESTONES', allowed: true },
        { scopeType: 'TIME_TRACKING', allowed: true },
        { scopeType: 'RESOURCES', allowed: true },
      ],
      toolAccesses: [
        { toolKey: 'projects_summary', allowed: true, requiresApproval: false },
        { toolKey: 'projects_detect_risk', allowed: true, requiresApproval: false },
        { toolKey: 'tasks_prioritize', allowed: true, requiresApproval: false },
        { toolKey: 'resource_allocate', allowed: true, requiresApproval: true },
        { toolKey: 'progress_report_generate', allowed: true, requiresApproval: false },
      ],
    },
    {
      key: 'knowledge_assistant',
      name: 'Knowledge Assistant',
      role: 'Enterprise Knowledge & RAG Intelligence Specialist',
      department: 'Knowledge',
      description: 'Answers internal company questions, summarizes documentation, retrieves knowledge base articles, and recommends content.',
      systemPrompt: 'You are the Knowledge Assistant for BlackDesk OS. You have direct access to the Knowledge Base, Document Library, and RAG Vector Index. Your goal is to deliver accurate answers grounded in enterprise documentation, summarize long documents, and suggest relevant reading.',
      capabilities: [
        { capability: 'ANSWER_QUESTIONS', displayName: 'Answer Internal Questions', description: 'Synthesize verified answers from company knowledge base', enabled: true },
        { capability: 'DOCUMENT_SUMMARIES', displayName: 'Document Summaries', description: 'Extract executive summaries, key terms, and takeaways', enabled: true },
        { capability: 'KNOWLEDGE_RETRIEVAL', displayName: 'Knowledge Retrieval', description: 'Perform hybrid semantic vector search over company documents', enabled: true },
        { capability: 'ARTICLE_RECOMMENDATIONS', displayName: 'Article Recommendations', description: 'Suggest relevant SOPs and documentation for user tasks', enabled: true },
      ],
      knowledgeScopes: [
        { scopeType: 'KNOWLEDGE_BASE', allowed: true },
        { scopeType: 'DOCUMENTS', allowed: true },
        { scopeType: 'RAG_ENGINE', allowed: true },
      ],
      toolAccesses: [
        { toolKey: 'rag_hybrid_search', allowed: true, requiresApproval: false },
        { toolKey: 'knowledge_article_get', allowed: true, requiresApproval: false },
        { toolKey: 'document_summarize', allowed: true, requiresApproval: false },
        { toolKey: 'article_recommend', allowed: true, requiresApproval: false },
      ],
    },
    {
      key: 'meeting_assistant',
      name: 'Meeting Assistant',
      role: 'Meeting Orchestration & Action Item Specialist',
      department: 'Meetings',
      description: 'Generates agendas, summarizes meeting recordings/notes, extracts action items, and suggests follow-up syncs.',
      systemPrompt: 'You are the Meeting Assistant for BlackDesk OS. You manage Meetings, Participant schedules, Project contexts, and CRM contacts. Your goal is to structure high-impact agendas, transcribe/summarize discussions, auto-assign action items to team members, and suggest follow-ups.',
      capabilities: [
        { capability: 'AGENDA_GENERATION', displayName: 'Agenda Generation', description: 'Structure goal-driven meeting agendas with time allocations', enabled: true },
        { capability: 'MEETING_SUMMARIES', displayName: 'Meeting Summaries', description: 'Draft key decisions, discussion topics, and takeaways', enabled: true },
        { capability: 'ACTION_ITEM_EXTRACTION', displayName: 'Action Item Extraction', description: 'Identify deliverables, owners, and due dates from transcript', enabled: true },
        { capability: 'FOLLOWUP_RECOMMENDATIONS', displayName: 'Follow-up Recommendations', description: 'Suggest calendar invites, recap emails, and sync intervals', enabled: true },
      ],
      knowledgeScopes: [
        { scopeType: 'CRM_MEETINGS', allowed: true },
        { scopeType: 'PARTICIPANTS', allowed: true },
        { scopeType: 'PROJECTS', allowed: true },
        { scopeType: 'CRM_CONTACTS', allowed: true },
      ],
      toolAccesses: [
        { toolKey: 'meeting_create_agenda', allowed: true, requiresApproval: false },
        { toolKey: 'meeting_summarize_notes', allowed: true, requiresApproval: false },
        { toolKey: 'meeting_extract_action_items', allowed: true, requiresApproval: false },
        { toolKey: 'meeting_schedule_followup', allowed: true, requiresApproval: false },
      ],
    },
    {
      key: 'finance_assistant',
      name: 'Finance Assistant',
      role: 'Financial Analytics & Contract Audit Specialist',
      department: 'Finance',
      description: 'Provides revenue summaries, analyzes contracts, compares proposals, and surfaces financial insights.',
      systemPrompt: 'You are the Finance Assistant for BlackDesk OS. You inspect Contracts, Proposals, Project Budgets, and CRM Opportunities. Your goal is to deliver revenue forecasts, audit contract payment milestones, compare vendor proposal margins, and highlight financial risks.',
      capabilities: [
        { capability: 'REVENUE_SUMMARIES', displayName: 'Revenue Summaries', description: 'Compile MRR/ARR growth, contract values, and cash flow forecasts', enabled: true },
        { capability: 'CONTRACT_ANALYSIS', displayName: 'Contract Analysis', description: 'Audit payment terms, renewal clauses, and liability limits', enabled: true },
        { capability: 'PROPOSAL_COMPARISONS', displayName: 'Proposal Comparisons', description: 'Compare cost breakdowns, margins, and scope across proposals', enabled: true },
        { capability: 'FINANCIAL_INSIGHTS', displayName: 'Financial Insights', description: 'Flag budget overruns, margin erosion, and billing delays', enabled: true },
      ],
      knowledgeScopes: [
        { scopeType: 'CRM_CONTRACTS', allowed: true },
        { scopeType: 'CRM_PROPOSALS', allowed: true },
        { scopeType: 'PROJECT_BUDGETS', allowed: true },
        { scopeType: 'CRM_OPPORTUNITIES', allowed: true },
      ],
      toolAccesses: [
        { toolKey: 'finance_summarize_revenue', allowed: true, requiresApproval: false },
        { toolKey: 'finance_analyze_contract', allowed: true, requiresApproval: false },
        { toolKey: 'finance_compare_proposals', allowed: true, requiresApproval: false },
        { toolKey: 'finance_budget_audit', allowed: true, requiresApproval: true },
      ],
    },
    {
      key: 'ceo_executive_assistant',
      name: 'CEO Executive Assistant',
      role: 'Executive Intelligence & Organization Health Specialist',
      department: 'Executive',
      description: 'Provides executive dashboard summaries, organization health metrics, KPI summaries, department insights, risk alerts, and weekly briefings.',
      systemPrompt: 'You are the CEO Executive Assistant for BlackDesk OS. You possess organization-wide access across all departments, CRM, Projects, Finance, Knowledge, Workflows, and Teams. Your mission is to provide high-level briefings, monitor organization health, alert the CEO to strategic risks, and summarize weekly performance.',
      capabilities: [
        { capability: 'EXECUTIVE_DASHBOARD_SUMMARIES', displayName: 'Executive Dashboard Summaries', description: 'Synthesize whole-company metrics into C-suite briefings', enabled: true },
        { capability: 'ORGANIZATION_HEALTH', displayName: 'Organization Health', description: 'Evaluate team load, project delivery rates, and sales pipeline health', enabled: true },
        { capability: 'KPI_SUMMARIES', displayName: 'KPI Summaries', description: 'Track target vs actual key performance indicators across teams', enabled: true },
        { capability: 'DEPARTMENT_INSIGHTS', displayName: 'Department Insights', description: 'Compare performance across Sales, Engineering, Product, and Finance', enabled: true },
        { capability: 'RISK_ALERTS', displayName: 'Risk Alerts', description: 'Highlight critical blockers, churn risks, and budget leaks', enabled: true },
        { capability: 'WEEKLY_REPORTS', displayName: 'Weekly Reports', description: 'Generate comprehensive weekly executive briefings', enabled: true },
      ],
      knowledgeScopes: [
        { scopeType: 'ENTIRE_ORGANIZATION', allowed: true },
      ],
      toolAccesses: [
        { toolKey: 'exec_dashboard_summary', allowed: true, requiresApproval: false },
        { toolKey: 'exec_org_health', allowed: true, requiresApproval: false },
        { toolKey: 'exec_kpi_track', allowed: true, requiresApproval: false },
        { toolKey: 'exec_department_insights', allowed: true, requiresApproval: false },
        { toolKey: 'exec_risk_alerts', allowed: true, requiresApproval: false },
        { toolKey: 'exec_weekly_report', allowed: true, requiresApproval: false },
      ],
    },
  ];

  getDefaultAgentsSpecs(): AgentSpec[] {
    return this.defaultAgents;
  }

  getAgentSpec(key: string): AgentSpec | undefined {
    return this.defaultAgents.find((a) => a.key === key);
  }
}
