import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SharedContextService } from './shared-context.service';
import { ExecutionLogger } from './execution-logger.service';

export interface DelegationRequest {
  workflowId: string;
  fromAgentKey: string;
  fromAgentName: string;
  toAgentKey: string;
  toAgentName: string;
  taskDescription: string;
  contextData?: any;
  priority?: number;
  parentDelegationId?: string;
}

@Injectable()
export class DelegationService {
  constructor(
    private prisma: PrismaService,
    private sharedContextService: SharedContextService,
    private logger: ExecutionLogger,
  ) {}

  async delegate(request: DelegationRequest) {
    this.logger.log({
      workflowId: request.workflowId,
      agentKey: request.fromAgentKey,
      agentName: request.fromAgentName,
      event: 'DELEGATE',
      message: `${request.fromAgentName} delegating to ${request.toAgentName}: ${request.taskDescription}`,
    });

    const delegation = await this.prisma.agentDelegation.create({
      data: {
        workflowId: request.workflowId,
        parentDelegationId: request.parentDelegationId ?? null,
        fromAgentKey: request.fromAgentKey,
        fromAgentName: request.fromAgentName,
        toAgentKey: request.toAgentKey,
        toAgentName: request.toAgentName,
        taskDescription: request.taskDescription,
        contextData: request.contextData ? JSON.stringify(request.contextData) : null,
        priority: request.priority ?? 0,
        status: 'PENDING',
      },
    });

    return delegation;
  }

  async acceptDelegation(delegationId: string) {
    return this.prisma.agentDelegation.update({
      where: { id: delegationId },
      data: { status: 'ACCEPTED', startedAt: new Date() },
    });
  }

  async completeDelegation(delegationId: string, responseData: any) {
    const delegation = await this.prisma.agentDelegation.update({
      where: { id: delegationId },
      data: {
        status: 'COMPLETED',
        responseData: JSON.stringify(responseData),
        completedAt: new Date(),
      },
    });

    this.logger.log({
      workflowId: delegation.workflowId,
      agentKey: delegation.toAgentKey,
      agentName: delegation.toAgentName,
      event: 'DELEGATION_COMPLETE',
      message: `${delegation.toAgentName} completed delegation from ${delegation.fromAgentName}`,
    });

    return delegation;
  }

  async failDelegation(delegationId: string, error: string) {
    const delegation = await this.prisma.agentDelegation.update({
      where: { id: delegationId },
      data: {
        status: 'FAILED',
        responseData: JSON.stringify({ error }),
        completedAt: new Date(),
      },
    });

    this.logger.log({
      workflowId: delegation.workflowId,
      agentKey: delegation.toAgentKey,
      agentName: delegation.toAgentName,
      event: 'DELEGATION_FAILED',
      message: `Delegation from ${delegation.fromAgentName} failed: ${error}`,
      level: 'ERROR',
    });

    return delegation;
  }

  async getDelegationTree(workflowId: string) {
    const delegations = await this.prisma.agentDelegation.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'asc' },
    });

    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const d of delegations) {
      map.set(d.id, { ...d, contextData: this.safeParse(d.contextData), responseData: this.safeParse(d.responseData), children: [] });
    }

    for (const d of delegations) {
      const node = map.get(d.id);
      if (d.parentDelegationId && map.has(d.parentDelegationId)) {
        map.get(d.parentDelegationId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private safeParse(json: string | null) {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return json; }
  }
}
