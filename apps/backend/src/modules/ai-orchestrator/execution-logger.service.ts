import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';

export interface LogEntry {
  workflowId: string;
  stepOrder?: number;
  agentKey?: string;
  agentName?: string;
  event: string;
  message: string;
  data?: any;
  level?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
}

@Injectable()
export class ExecutionLogger {
  private readonly logger = new Logger(ExecutionLogger.name);
  private logs: Map<string, LogEntry[]> = new Map();

  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
  ) {}

  log(entry: LogEntry) {
    const id = entry.workflowId;
    if (!this.logs.has(id)) {
      this.logs.set(id, []);
    }
    this.logs.get(id)!.push({ ...entry, level: entry.level ?? 'INFO' });

    if (entry.level === 'ERROR') {
      this.logger.error(`[${entry.agentKey ?? 'SYSTEM'}] ${entry.message}`);
    } else if (entry.level === 'WARN') {
      this.logger.warn(`[${entry.agentKey ?? 'SYSTEM'}] ${entry.message}`);
    } else {
      this.logger.log(`[${entry.agentKey ?? 'SYSTEM'}] ${entry.message}`);
    }
  }

  async persistLogs(workflowId: string, userId: string, orgId: string) {
    const entries = this.logs.get(workflowId) ?? [];
    if (entries.length === 0) return;

    await this.activityService.logActivity({
      userId,
      organizationId: orgId,
      action: 'AI_ORCHESTRATOR_EXECUTION',
      module: 'AI_ORCHESTRATOR',
      entityType: 'AgentWorkflow',
      entityId: workflowId,
      metadata: JSON.stringify({
        logCount: entries.length,
        errors: entries.filter((e) => e.level === 'ERROR').length,
      }),
    });

    this.logs.delete(workflowId);
  }

  getLogs(workflowId: string): LogEntry[] {
    return this.logs.get(workflowId) ?? [];
  }

  clearLogs(workflowId: string) {
    this.logs.delete(workflowId);
  }
}
