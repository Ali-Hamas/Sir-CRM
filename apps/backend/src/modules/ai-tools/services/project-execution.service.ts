import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ProjectsService } from '../../projects/projects.service';
import { TasksService } from '../../tasks/tasks.service';

@Injectable()
export class ProjectExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
  ) {}

  async executeProjectTool(toolKey: string, orgId: string, userId: string, params: Record<string, any>) {
    switch (toolKey) {
      case 'projects_create_project': {
        const project = await this.projectsService.create(orgId, userId, {
          projectName: params.projectName,
          projectCode: params.projectCode,
          description: params.description,
          budget: params.budget ? Number(params.budget) : undefined,
          status: 'ACTIVE',
        });
        return {
          projectId: project.id,
          name: project.projectName,
          code: project.projectCode,
          summary: `Initialized workspace project "${project.projectName}" [${project.projectCode}] (ID: ${project.id})`,
        };
      }

      case 'projects_update_project': {
        const updated = await this.projectsService.update(params.projectId, orgId, userId, {
          projectName: params.projectName,
          status: params.status,
          progress: params.progress ? Number(params.progress) : undefined,
          budget: params.budget ? Number(params.budget) : undefined,
        });
        return {
          projectId: updated.id,
          name: updated.projectName,
          status: updated.status,
          summary: `Updated project "${updated.projectName}" status to ${updated.status}`,
        };
      }

      case 'projects_list_projects': {
        const projects = await this.projectsService.findAll(orgId, {
          status: params.status,
        });
        return {
          totalFound: (projects as any)?.items?.length || (projects as any)?.length || 0,
          projects: (projects as any)?.items || projects || [],
          summary: `Fetched ${((projects as any)?.items || projects || []).length} project records`,
        };
      }

      default:
        throw new NotFoundException(`Project tool handler '${toolKey}' not found`);
    }
  }

  async executeTaskTool(toolKey: string, orgId: string, userId: string, params: Record<string, any>) {
    switch (toolKey) {
      case 'projects_create_task': {
        const task = await this.tasksService.create(orgId, userId, {
          projectId: params.projectId,
          title: params.title,
          description: params.description,
          priority: params.priority || 'MEDIUM',
          estimatedHours: params.estimatedHours ? Number(params.estimatedHours) : undefined,
        });
        return {
          taskId: task.id,
          title: task.title,
          status: task.status,
          summary: `Created task "${task.title}" (ID: ${task.id})`,
        };
      }

      case 'projects_assign_task': {
        const updated = await this.tasksService.update(params.taskId, orgId, userId, {
          assignedToId: params.assigneeUserId,
        });
        return {
          taskId: updated.id,
          assignedToId: params.assigneeUserId,
          summary: `Assigned task "${updated.title}" to user ${params.assigneeUserId}`,
        };
      }

      case 'projects_update_task': {
        const updated = await this.tasksService.update(params.taskId, orgId, userId, {
          title: params.title,
          status: params.status,
          priority: params.priority,
        });
        return {
          taskId: updated.id,
          title: updated.title,
          status: updated.status,
          summary: `Updated task "${updated.title}" (Status: ${updated.status})`,
        };
      }

      case 'projects_complete_task': {
        const completed = await this.tasksService.update(params.taskId, orgId, userId, {
          status: 'DONE',
        });
        return {
          taskId: completed.id,
          title: completed.title,
          status: 'DONE',
          summary: `Marked task "${completed.title}" as Completed`,
        };
      }

      default:
        throw new NotFoundException(`Task tool handler '${toolKey}' not found`);
    }
  }
}
