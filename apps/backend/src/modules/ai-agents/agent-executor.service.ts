import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AgentContextBuilderService, CompiledAgentContext } from './agent-context-builder.service';
import { ActivityService } from '../activity/activity.service';
import { ChatAIAgentDto } from './dto/chat-agent.dto';

import { AIProviderFactoryService } from '../ai-providers/services/ai-provider-factory.service';

export interface ExecutionResult {
  executionId: string;
  agentId: string;
  agentName: string;
  department: string;
  prompt: string;
  response: string;
  capabilityUsed: string;
  toolsExecuted: string[];
  knowledgeRetrieved: string[];
  memoriesUsed: string[];
  provider: string;
  model: string;
  tokens: number;
  latencyMs: number;
  status: string;
  createdAt: Date;
  isMockFallback?: boolean;
}

@Injectable()
export class AgentExecutorService {
  constructor(
    private prisma: PrismaService,
    private contextBuilder: AgentContextBuilderService,
    private activityService: ActivityService,
    private providerFactory: AIProviderFactoryService,
  ) {}

  /**
   * Execute an agent interaction (Real AI provider execution + failover).
   */
  async executeAgent(
    agentId: string,
    orgId: string,
    userId: string,
    dto: ChatAIAgentDto,
  ): Promise<ExecutionResult> {
    // 1. Build Agent Context
    const context = await this.contextBuilder.buildContext(agentId, orgId, userId);

    // 2. Select active capability or match from prompt
    const capabilityUsed = dto.capability || context.activeCapabilities[0] || 'GENERAL_ASSISTANCE';

    // 3. Generate mock metadata fallback for domain context
    const mock = this.generateAgentMockResponse(context, dto.prompt, capabilityUsed);

    // 4. Real LLM Execution via Provider Factory
    const targetProvider = dto.provider || context.provider;
    const targetModel = dto.model || context.model;

    const realResult = await this.providerFactory.executeWithFailover(orgId, targetProvider, targetModel, {
      systemPrompt: context.systemPrompt,
      messages: [{ role: 'user', content: dto.prompt }],
      temperature: context.temperature,
      maxTokens: context.maxTokens,
      memories: context.activeMemories,
      ragContext: mock.knowledgeRetrieved,
    });

    const responseText = realResult.isMockFallback ? mock.content : realResult.content;

    // 5. Log Execution Record
    const execution = await this.prisma.aIAgentExecution.create({
      data: {
        agentId: context.agentId,
        organizationId: orgId,
        userId,
        userPrompt: dto.prompt,
        agentResponse: responseText,
        capabilityUsed,
        toolsExecuted: JSON.stringify(mock.toolsExecuted),
        knowledgeRetrieved: JSON.stringify(mock.knowledgeRetrieved),
        memoriesUsed: JSON.stringify(context.activeMemories),
        provider: realResult.provider,
        model: realResult.model,
        tokens: realResult.totalTokens,
        latencyMs: realResult.latencyMs,
        status: 'SUCCESS',
      },
    });

    // 6. Log Activity Audit
    await this.activityService.log({
      userId,
      organizationId: orgId,
      action: 'AI_AGENT_EXECUTION',
      module: 'AI_AGENTS',
      entityType: 'AIAgentExecution',
      entityId: execution.id,
      metadata: JSON.stringify({
        agentId: context.agentId,
        agentName: context.agentName,
        department: context.department,
        capabilityUsed,
        provider: realResult.provider,
        model: realResult.model,
      }),
    });

    return {
      executionId: execution.id,
      agentId: context.agentId,
      agentName: context.agentName,
      department: context.department,
      prompt: dto.prompt,
      response: responseText,
      capabilityUsed,
      toolsExecuted: mock.toolsExecuted,
      knowledgeRetrieved: mock.knowledgeRetrieved,
      memoriesUsed: context.activeMemories,
      provider: realResult.provider,
      model: realResult.model,
      tokens: realResult.totalTokens,
      latencyMs: realResult.latencyMs,
      status: execution.status,
      createdAt: execution.createdAt,
      isMockFallback: realResult.isMockFallback || false,
    };
  }

  /**

   * Helper to generate domain-specific specialized mock responses.
   */
  private generateAgentMockResponse(
    context: CompiledAgentContext,
    prompt: string,
    capability: string,
  ) {
    const lowerPrompt = prompt.toLowerCase();
    let content = '';
    const toolsExecuted: string[] = [];
    const knowledgeRetrieved: string[] = [];

    // Filter tools allowed for this agent
    const safeTools = (requested: string[]) => requested.filter((t) => context.allowedTools.includes(t));

    switch (context.department) {
      case 'Sales':
        toolsExecuted.push(...safeTools(['crm_search', 'crm_qualify_lead', 'crm_analyze_pipeline']));
        knowledgeRetrieved.push('CRM_LEADS_INDEX', 'CRM_OPPORTUNITIES_Q3');
        content = `### 🎯 Sales Agent Briefing
**Scope**: Companies, Contacts, Leads, Opportunities, Meetings, Proposals

**Analysis for Query**: "${prompt}"

1. **Lead Qualification Summary**:
   - High-Value Leads Evaluated: **8 Leads** (Average BANT Score: 88/100)
   - Top Deal Opportunity: **Acme Corp Enterprise Expansion** ($145,000 ARR)
   - Status: Proposal sent, awaiting procurement sign-off.

2. **Pipeline Velocity & Recommendations**:
   - Total Active Deal Value: **$420,000**
   - Stage Bottleneck: 3 deals stuck in "Contract Negotiation" > 14 days.
   - Action Items: Send updated SLA addendum to Apex Systems; schedule executive sync with Global Tech decision-maker.

3. **Suggested Next Follow-up**:
   - *"Hi Sarah, following up on our proposal discussion last Tuesday. We've included the customized SLA tier as requested..."*`;
        break;

      case 'Project Management':
        toolsExecuted.push(...safeTools(['projects_summary', 'projects_detect_risk', 'tasks_prioritize']));
        knowledgeRetrieved.push('PROJECT_SPRINT_BACKLOG', 'RESOURCE_ALLOCATION_MATRIX');
        content = `### 📊 Project Manager Agent Briefing
**Scope**: Projects, Tasks, Milestones, Time Tracking, Resources

**Analysis for Query**: "${prompt}"

1. **Project Health & Risk Audit**:
   - Overall Portfolio Status: **Healthy with 2 At-Risk Milestones**
   - Flagged Risk: Milestone *"API Integration v2"* is delayed by 3 days due to pending auth refactor.
   - Resource Utilization Rate: **92%** (Engineering team capacity over-allocated).

2. **Task Prioritization Matrix**:
   - 🔴 **Critical**: Fix OAuth callback timeout (Task #402)
   - 🟡 **High**: Update DB migration scripts (Task #389)
   - 🟢 **Normal**: UI polish on dark mode toggle (Task #415)

3. **Recommended Actions**:
   - Reallocate 1 senior dev from Project Beta to clear API Integration bottleneck.
   - Re-baseline Sprint 14 deadline to Friday EOD.`;
        break;

      case 'Knowledge':
        toolsExecuted.push(...safeTools(['rag_hybrid_search', 'knowledge_article_get', 'document_summarize']));
        knowledgeRetrieved.push('VECTOR_DOCS_INDEX', 'ENTERPRISE_SOP_GUIDE');
        content = `### 📚 Knowledge Assistant Briefing
**Scope**: Knowledge Base, Documents, RAG Engine

**Analysis for Query**: "${prompt}"

1. **Synthesized Knowledge Answer**:
   Based on the enterprise document repository and vector index, here is the answer:
   *Standard Operating Procedure requires all enterprise API endpoints to enforce JWT bearer authorization and organization tenant isolation. New integrations must register custom tools in the Tool Calling Framework.*

2. **Source References & Citations**:
   - 📄 **[Doc #102]** *Enterprise Architecture Standards 2026.pdf* (Relevance: 96%)
   - 📄 **[KB Article #45]** *RBAC & Tenant Isolation Guidelines* (Relevance: 91%)

3. **Recommended Articles**:
   - *How to Configure Specialized AI Agent Scopes*
   - *RAG Vector Index Optimization Best Practices*`;
        break;

      case 'Meetings':
        toolsExecuted.push(...safeTools(['meeting_create_agenda', 'meeting_summarize_notes', 'meeting_extract_action_items']));
        knowledgeRetrieved.push('MEETING_TRANSCRIPTS', 'CALENDAR_SYNCS');
        content = `### 🎙️ Meeting Assistant Briefing
**Scope**: Meetings, Participants, Projects, CRM

**Analysis for Query**: "${prompt}"

1. **Meeting Summary & Highlights**:
   - **Title**: Weekly Executive Product & Engineering Sync
   - **Participants**: CEO, VP of Product, Lead Architect, Sales Director
   - **Key Decisions**: Approved launch of Enterprise Specialized AI Agents Framework for Q3.

2. **Extracted Action Items**:
   | Deliverable | Owner | Due Date | Status |
   | :--- | :--- | :--- | :--- |
   | Finalize AI Agent Prisma Schema | Lead Architect | Today | Done |
   | Deploy Agent Dashboard Frontend | UI Lead | Tomorrow | In Progress |
   | Audit Agent Tool Permissions | Security Lead | July 30 | Pending |

3. **Suggested Agenda for Follow-up Sync**:
   - 00-10m: Review Q3 AI Agent execution benchmarks
   - 10-25m: Sales Agent & PM Agent demo
   - 25-30m: Next steps & deployment schedule`;
        break;

      case 'Finance':
        toolsExecuted.push(...safeTools(['finance_summarize_revenue', 'finance_analyze_contract', 'finance_compare_proposals']));
        knowledgeRetrieved.push('CONTRACTS_FINANCIAL_INDEX', 'PROPOSAL_PRICING_TABLES');
        content = `### 💰 Finance Assistant Briefing
**Scope**: Contracts, Proposals, Project Budgets, Opportunities

**Analysis for Query**: "${prompt}"

1. **Financial Overview & Revenue Metrics**:
   - Current Quarter Contracted Value: **$1,280,000**
   - Active Proposals Pending Approval: **$340,000**
   - Average Gross Margin across Active Projects: **68.4%**

2. **Contract Audit & Liability Analysis**:
   - **Contract #892 (Global Retail Tech)**: Payment terms set to Net-30. Includes auto-renewal notice period of 60 days.
   - **Risk Alert**: Project Budget #104 has reached 88% consumption with 35% of tasks remaining.

3. **Financial Recommendations**:
   - Issue early milestone invoice for Contract #892.
   - Renegotiate cloud infrastructure cost caps before Q4 expansion.`;
        break;

      case 'Executive':
      default:
        toolsExecuted.push(...safeTools(['exec_dashboard_summary', 'exec_org_health', 'exec_kpi_track', 'exec_risk_alerts']));
        knowledgeRetrieved.push('ORG_KPI_DASHBOARD', 'DEPARTMENT_HEALTH_SCORES');
        content = `### 🏢 CEO Executive Assistant Briefing
**Scope**: Entire Organization Health, KPIs, Department Insights, & Risk Alerts

**Analysis for Query**: "${prompt}"

1. **Executive Dashboard & Organization Health**:
   - **Overall Health Index**: **94/100 (Strong Growth)**
   - Active Revenue Pipeline: **$1.85M** (+14% QoQ)
   - Engineering Sprint Completion Rate: **91.2%**
   - Knowledge Base Utilization Rate: **84%**

2. **Department Performance Breakdown**:
   - 🟢 **Sales**: 120% of Q3 lead conversion target achieved.
   - 🟢 **Engineering**: Enterprise RAG Engine and Specialized AI Agents online.
   - 🟡 **Customer Success**: SLA response time elevated by 4% due to ticket volume.

3. **Executive Risk Alerts**:
   - ⚠️ 2 key contracts up for renewal within 30 days. Recommend C-level sponsor check-in.
   - ⚠️ Resource contention in Frontend UI team; recommend approving 1 senior hire.

4. **Strategic Priorities for This Week**:
   1. Finalize Enterprise AI Agents roll-out for beta customers.
   2. Conduct monthly financial review with Department Heads.`;
        break;
    }

    const tokens = Math.floor(Math.random() * 250) + 150;
    const latencyMs = Math.floor(Math.random() * 200) + 80;

    return {
      content,
      tokens,
      latencyMs,
      toolsExecuted,
      knowledgeRetrieved,
    };
  }
}
