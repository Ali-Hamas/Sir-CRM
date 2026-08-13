import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ExecutionCoordinator } from './execution-coordinator.service';
import { SharedContextService } from './shared-context.service';
import { ExecutionLogger } from './execution-logger.service';
import { DelegationService } from './delegation.service';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';

@Injectable()
export class AIOrchestratorService {
  constructor(
    private prisma: PrismaService,
    private coordinator: ExecutionCoordinator,
    private sharedContextService: SharedContextService,
    private logger: ExecutionLogger,
    private delegationService: DelegationService,
  ) {}

  private async resolveOrg(idOrSlug: string) {
    const org = await this.prisma.organization.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], isDeleted: false },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async executeWorkflow(orgIdOrSlug: string, userId: string, dto: ExecuteWorkflowDto) {
    const org = await this.resolveOrg(orgIdOrSlug);

    const workflow = await this.prisma.agentWorkflow.create({
      data: {
        organizationId: org.id,
        userId,
        title: dto.title || `Workflow: ${dto.prompt.substring(0, 80)}${dto.prompt.length > 80 ? '...' : ''}`,
        userPrompt: dto.prompt,
        status: 'PENDING',
      },
    });

    this.logger.log({
      workflowId: workflow.id,
      event: 'WORKFLOW_CREATED',
      message: `Workflow created for prompt: "${dto.prompt.substring(0, 100)}"`,
    });

    const result = await this.coordinator.executeWorkflow(workflow.id, org.id, userId, dto.prompt);

    return result;
  }

  async getWorkflow(orgIdOrSlug: string, workflowId: string) {
    const org = await this.resolveOrg(orgIdOrSlug);

    const workflow = await this.prisma.agentWorkflow.findFirst({
      where: { id: workflowId, organizationId: org.id },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        delegations: { orderBy: { createdAt: 'asc' } },
        conversations: { orderBy: { createdAt: 'asc' } },
        executionGraph: true,
        sharedContexts: true,
      },
    });

    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async listWorkflows(orgIdOrSlug: string, limit = 20, skip = 0) {
    const org = await this.resolveOrg(orgIdOrSlug);

    const [items, total] = await Promise.all([
      this.prisma.agentWorkflow.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          _count: { select: { steps: true, delegations: true } },
        },
      }),
      this.prisma.agentWorkflow.count({ where: { organizationId: org.id } }),
    ]);

    return { items, total, limit, skip };
  }

  async getWorkflowLogs(orgIdOrSlug: string, workflowId: string) {
    await this.resolveOrg(orgIdOrSlug);
    return this.logger.getLogs(workflowId);
  }

  async getSharedContext(orgIdOrSlug: string, workflowId: string) {
    await this.resolveOrg(orgIdOrSlug);
    return this.sharedContextService.getAllContext(workflowId);
  }

  async getDelegationGraph(orgIdOrSlug: string, workflowId: string) {
    await this.resolveOrg(orgIdOrSlug);
    return this.delegationService.getDelegationTree(workflowId);
  }

  async getExecutionGraph(orgIdOrSlug: string, workflowId: string) {
    const org = await this.resolveOrg(orgIdOrSlug);
    const graph = await this.prisma.agentExecutionGraph.findUnique({
      where: { workflowId },
    });
    if (!graph) throw new NotFoundException('Execution graph not found');
    return { ...graph, graphData: JSON.parse(graph.graphData) };
  }
}
