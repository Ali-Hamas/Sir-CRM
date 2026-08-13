import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WorkflowPlannerService, WorkflowPlan } from './workflow-planner.service';
import { DelegationService } from './delegation.service';
import { SharedContextService } from './shared-context.service';
import { ExecutionLogger } from './execution-logger.service';
import { AgentRegistryService } from '../ai-agents/agent-registry.service';
import { AgentFactoryService } from '../ai-agents/agent-factory.service';

@Injectable()
export class ExecutionCoordinator {
  constructor(
    private prisma: PrismaService,
    private planner: WorkflowPlannerService,
    private delegationService: DelegationService,
    private sharedContextService: SharedContextService,
    private logger: ExecutionLogger,
    private agentRegistry: AgentRegistryService,
    private agentFactory: AgentFactoryService,
  ) {}

  async executeWorkflow(workflowId: string, orgId: string, userId: string, prompt: string) {
    const startTime = Date.now();

    await this.prisma.agentWorkflow.update({
      where: { id: workflowId },
      data: { status: 'PLANNING', startedAt: new Date() },
    });

    this.logger.log({ workflowId, event: 'PLANNING', message: 'Analyzing request and creating execution plan...' });

    const plan = this.planner.plan(prompt);

    await this.prisma.agentWorkflow.update({
      where: { id: workflowId },
      data: { executionPlan: JSON.stringify(plan), status: 'EXECUTING' },
    });

    const graphData = {
      nodes: plan.agents.map((a, i) => ({
        id: a.key,
        label: a.name,
        task: a.task,
        order: i,
        status: 'PENDING',
      })),
      edges: plan.agents.slice(1).map((a, i) => ({
        from: plan.agents[i].key,
        to: a.key,
        label: 'delegates to',
      })),
    };

    await this.prisma.agentExecutionGraph.create({
      data: {
        workflowId,
        graphData: JSON.stringify(graphData),
        totalSteps: plan.agents.length,
        status: 'EXECUTING',
        startedAt: new Date(),
      },
    });

    const steps = [];
    for (let i = 0; i < plan.agents.length; i++) {
      const agent = plan.agents[i];
      const step = await this.prisma.agentWorkflowStep.create({
        data: {
          workflowId,
          stepOrder: i + 1,
          agentKey: agent.key,
          agentName: agent.name,
          task: agent.task,
          status: 'PENDING',
        },
      });
      steps.push(step);
    }

    this.logger.log({ workflowId, event: 'PLAN_READY', message: `Execution plan created with ${plan.agents.length} agents.` });

    let previousOutput: string | null = null;

    for (let i = 0; i < plan.agents.length; i++) {
      const agentPlan = plan.agents[i];
      const stepId = steps[i].id;
      const agentSpec = this.agentRegistry.getAgentSpec(agentPlan.key);

      await this.prisma.agentWorkflowStep.update({
        where: { id: stepId },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      this.updateGraphNode(this.prisma, workflowId, agentPlan.key, 'RUNNING');

      this.logger.log({
        workflowId,
        stepOrder: i + 1,
        agentKey: agentPlan.key,
        agentName: agentPlan.name,
        event: 'AGENT_STARTED',
        message: `Agent "${agentPlan.name}" started execution.`,
      });

      const context = await this.sharedContextService.buildCombinedContext(workflowId);

      const stepStart = Date.now();
      let stepStatus = 'COMPLETED';
      let stepError: string | null = null;
      let output = '';

      try {
        output = await this.executeAgentStep(orgId, userId, agentPlan, prompt, context, previousOutput, agentSpec);
        previousOutput = output;

        await this.sharedContextService.setContext(workflowId, {
          contextKey: `${agentPlan.key}_output`,
          contextType: 'AGENT_OUTPUT',
          data: { output, agentKey: agentPlan.key, agentName: agentPlan.name, stepOrder: i + 1 },
          sourceAgentKey: agentPlan.key,
        });
      } catch (err: any) {
        stepStatus = 'FAILED';
        stepError = err.message || 'Unknown error during agent execution';
        output = stepError;
        this.logger.log({
          workflowId,
          stepOrder: i + 1,
          agentKey: agentPlan.key,
          agentName: agentPlan.name,
          event: 'AGENT_FAILED',
          message: `Agent "${agentPlan.name}" failed: ${stepError}`,
          level: 'ERROR',
        });
      }

      const latencyMs = Date.now() - stepStart;

      await this.prisma.agentWorkflowStep.update({
        where: { id: stepId },
        data: {
          status: stepStatus,
          outputData: output,
          completedAt: new Date(),
          latencyMs,
          errorMessage: stepError,
        },
      });

      this.updateGraphNode(this.prisma, workflowId, agentPlan.key, stepStatus);

      if (stepStatus === 'FAILED' && i < plan.agents.length - 1) {
        this.logger.log({
          workflowId,
          event: 'WORKFLOW_CONTINUING',
          message: `Agent "${agentPlan.name}" failed but continuing with remaining agents.`,
          level: 'WARN',
        });
      }
    }

    const finalResponse = await this.buildFinalResponse(workflowId, plan, prompt);

    const totalLatency = Date.now() - startTime;

    await this.prisma.agentWorkflow.update({
      where: { id: workflowId },
      data: {
        status: 'COMPLETED',
        finalResponse,
        completedAt: new Date(),
      },
    });

    await this.prisma.agentExecutionGraph.updateMany({
      where: { workflowId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        totalLatencyMs: totalLatency,
      },
    });

    this.logger.log({
      workflowId,
      event: 'WORKFLOW_COMPLETED',
      message: `Multi-agent workflow completed in ${totalLatency}ms.`,
    });

    await this.logger.persistLogs(workflowId, userId, orgId);

    return this.loadWorkflow(workflowId);
  }

  private async executeAgentStep(
    orgId: string,
    userId: string,
    agentPlan: { key: string; name: string; task: string },
    originalPrompt: string,
    context: Record<string, any>,
    previousOutput: string | null,
    agentSpec: any,
  ): Promise<string> {
    const agentInstances = await this.agentFactory.ensureDefaultAgents(orgId, userId);
    const agent = agentInstances.find((a: any) => a.key === agentPlan.key);
    if (!agent) {
      return this.generateMockResponse(agentPlan, originalPrompt, context, previousOutput);
    }

    return this.generateMockResponse(agentPlan, originalPrompt, context, previousOutput);
  }

  private generateMockResponse(
    agentPlan: { key: string; name: string; task: string },
    prompt: string,
    context: Record<string, any>,
    previousOutput: string | null,
  ): string {
    const deptMap: Record<string, string> = {
      sales_agent: 'Sales',
      project_manager_agent: 'Project Management',
      knowledge_assistant: 'Knowledge',
      meeting_assistant: 'Meetings',
      finance_assistant: 'Finance',
      ceo_executive_assistant: 'Executive',
    };

    const department = deptMap[agentPlan.key] || 'General';

    const prevContext = previousOutput
      ? `\n\n**Context from previous agent:**\n${previousOutput.substring(0, 500)}`
      : '';

    switch (department) {
      case 'Sales':
        return `### Sales Agent Analysis\n**Task:** ${agentPlan.task}\n\n- Lead Qualification: Evaluated top prospects with BANT scores averaging 85/100\n- Pipeline Analysis: Total active deal value: $420,000 across 12 opportunities\n- Recommendations: Prioritize Acme Corp ($145k) and Global Tech ($89k) for executive engagement\n- CRM Data: Retrieved company history, past proposals, and contact details${prevContext}`;

      case 'Project Management':
        return `### Project Manager Analysis\n**Task:** ${agentPlan.task}\n\n- Project Health: Overall portfolio at 92% health score\n- Risks Detected: 1 milestone at risk (API Integration v2 - delayed 3 days)\n- Resource Utilization: 88% across active projects\n- Recommendations: Re-allocate 1 senior dev to clear API bottleneck${prevContext}`;

      case 'Knowledge':
        return `### Knowledge Assistant Analysis\n**Task:** ${agentPlan.task}\n\n- Knowledge Retrieved: Found 5 relevant articles and 3 SOP documents\n- Key Insights: Enterprise standards require JWT auth and tenant isolation\n- RAG Results: Retrieved 8 chunks from vector index with 94% average relevance\n- Recommended Reading: "RBAC & Tenant Isolation Guidelines", "Enterprise Architecture Standards"${prevContext}`;

      case 'Meetings':
        return `### Meeting Assistant Analysis\n**Task:** ${agentPlan.task}\n\n- Past Meetings Reviewed: Found 4 relevant meetings with the client\n- Action Items Pending: 3 follow-ups need attention\n- Agenda Suggestions: Include budget review, timeline discussion, and Q&A session\n- Key Decisions: Client requested extended SLA terms in last sync${prevContext}`;

      case 'Finance':
        return `### Finance Assistant Analysis\n**Task:** ${agentPlan.task}\n\n- Revenue Summary: Current quarter contracted value: $1,280,000\n- Contract Analysis: Net-30 terms, auto-renewal notice 60 days\n- Budget Review: Project budget #104 at 88% consumption with 35% tasks remaining\n- Recommendations: Issue early milestone invoice, renegotiate cloud costs${prevContext}`;

      case 'Executive':
      default:
        return `### CEO Executive Assistant Analysis\n**Task:** ${agentPlan.task}\n\n- Organization Health: 94/100 - Strong Growth trajectory\n- Key Metrics: Revenue pipeline $1.85M (+14% QoQ), Sprint completion 91.2%\n- Strategic Context: Q3 focus on AI Agents rollout and monthly financial reviews\n- Approval Recommendation: Proposal aligns with strategic goals - recommend proceed${prevContext}`;
    }
  }

  private async updateGraphNode(prisma: any, workflowId: string, nodeId: string, status: string) {
    const graph = await prisma.agentExecutionGraph.findUnique({ where: { workflowId } });
    if (!graph) return;

    const graphData = JSON.parse(graph.graphData);
    const node = graphData.nodes.find((n: any) => n.id === nodeId);
    if (node) {
      node.status = status;
    }

    const completed = graphData.nodes.filter((n: any) => n.status === 'COMPLETED' || n.status === 'FAILED').length;
    const failed = graphData.nodes.filter((n: any) => n.status === 'FAILED').length;

    await prisma.agentExecutionGraph.update({
      where: { workflowId },
      data: {
        graphData: JSON.stringify(graphData),
        completedSteps: completed,
        failedSteps: failed,
      },
    });
  }

  private async buildFinalResponse(workflowId: string, plan: WorkflowPlan, originalPrompt: string): Promise<string> {
    const steps = await this.prisma.agentWorkflowStep.findMany({
      where: { workflowId },
      orderBy: { stepOrder: 'asc' },
    });

    const sections = steps
      .filter((s) => s.outputData && s.status === 'COMPLETED')
      .map((s) => {
        const statusIcon = s.status === 'COMPLETED' ? '✅' : '❌';
        return `${statusIcon} **${s.agentName}** (Step ${s.stepOrder})\n${s.outputData}\n`;
      })
      .join('\n---\n');

    return `# Multi-Agent Orchestration Result\n\n**Original Request:** ${originalPrompt}\n\n**Execution Plan:** ${plan.description}\n\n## Agent Contributions\n\n${sections}\n\n---\n*Generated by BlackDesk Enterprise Multi-Agent Orchestrator*`;
  }

  private async loadWorkflow(workflowId: string) {
    return this.prisma.agentWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        delegations: { orderBy: { createdAt: 'asc' } },
        conversations: { orderBy: { createdAt: 'asc' } },
        executionGraph: true,
        sharedContexts: true,
      },
    });
  }
}
