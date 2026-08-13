import { Injectable } from '@nestjs/common';

export interface PlannedStep {
  stepOrder: number;
  name: string;
  type: string;
  config: any;
}

@Injectable()
export class BusinessProcessPlannerService {
  planFromTemplate(template: { steps?: string }): PlannedStep[] {
    if (!template.steps) return [];
    try {
      return JSON.parse(template.steps) as PlannedStep[];
    } catch {
      return [];
    }
  }

  generatePlan(input: { name: string; description?: string; category?: string }): PlannedStep[] {
    const steps: PlannedStep[] = [];
    let order = 0;

    steps.push({
      stepOrder: order++,
      name: 'Validate Input',
      type: 'CONDITION',
      config: { condition: 'input_valid', onFail: 'ABORT' },
    });

    if (input.category === 'LEAD_QUALIFICATION') {
      steps.push(...this.getLeadQualificationSteps(order));
      order += 4;
    } else if (input.category === 'PROPOSAL_GENERATION') {
      steps.push(...this.getProposalGenerationSteps(order));
      order += 5;
    } else if (input.category === 'CLIENT_ONBOARDING') {
      steps.push(...this.getClientOnboardingSteps(order));
      order += 5;
    } else if (input.category === 'PROJECT_INITIALIZATION') {
      steps.push(...this.getProjectInitializationSteps(order));
      order += 4;
    } else {
      steps.push({
        stepOrder: order++,
        name: 'Execute Task',
        type: 'AI_ACTION',
        config: { agentKey: 'default', prompt: input.description || input.name },
      });
    }

    steps.push({
      stepOrder: order++,
      name: 'Review & Complete',
      type: 'APPROVAL',
      config: { roleRequired: 'ADMIN', title: 'Final Review' },
    });

    steps.push({
      stepOrder: order++,
      name: 'Notify Stakeholders',
      type: 'NOTIFICATION',
      config: { channels: ['in_app'] },
    });

    return steps;
  }

  private getLeadQualificationSteps(startOrder: number): PlannedStep[] {
    return [
      { stepOrder: startOrder, name: 'Analyze Lead Data', type: 'AI_ACTION', config: { agentKey: 'sales_agent', prompt: 'Analyze lead data and determine qualification criteria' } },
      { stepOrder: startOrder + 1, name: 'Score Lead', type: 'TOOL_CALL', config: { tool: 'lead_scoring', params: {} } },
      { stepOrder: startOrder + 2, name: 'Review Qualification', type: 'APPROVAL', config: { roleRequired: 'MANAGER', title: 'Lead Qualification Review' } },
      { stepOrder: startOrder + 3, name: 'Assign Lead', type: 'TASK', config: { action: 'assign_lead', assignToRole: 'SALES_REP' } },
    ];
  }

  private getProposalGenerationSteps(startOrder: number): PlannedStep[] {
    return [
      { stepOrder: startOrder, name: 'Gather Requirements', type: 'AI_ACTION', config: { agentKey: 'knowledge_assistant', prompt: 'Gather proposal requirements from context' } },
      { stepOrder: startOrder + 1, name: 'Generate Proposal Draft', type: 'AI_ACTION', config: { agentKey: 'sales_agent', prompt: 'Generate proposal based on requirements' } },
      { stepOrder: startOrder + 2, name: 'Review Proposal', type: 'APPROVAL', config: { roleRequired: 'MANAGER', title: 'Proposal Review' } },
      { stepOrder: startOrder + 3, name: 'Generate Final Document', type: 'TOOL_CALL', config: { tool: 'document_generator', params: { type: 'proposal' } } },
      { stepOrder: startOrder + 4, name: 'Send to Client', type: 'NOTIFICATION', config: { channels: ['email'] } },
    ];
  }

  private getClientOnboardingSteps(startOrder: number): PlannedStep[] {
    return [
      { stepOrder: startOrder, name: 'Create Client Record', type: 'TASK', config: { action: 'create_client_record' } },
      { stepOrder: startOrder + 1, name: 'Set Up Workspace', type: 'TASK', config: { action: 'setup_workspace' } },
      { stepOrder: startOrder + 2, name: 'Configure Access', type: 'TOOL_CALL', config: { tool: 'access_management', params: {} } },
      { stepOrder: startOrder + 3, name: 'Send Welcome Kit', type: 'NOTIFICATION', config: { channels: ['email'], template: 'welcome' } },
      { stepOrder: startOrder + 4, name: 'Schedule Kickoff Meeting', type: 'TASK', config: { action: 'schedule_meeting', meetingType: 'kickoff' } },
    ];
  }

  private getProjectInitializationSteps(startOrder: number): PlannedStep[] {
    return [
      { stepOrder: startOrder, name: 'Define Project Scope', type: 'AI_ACTION', config: { agentKey: 'project_manager_agent', prompt: 'Define project scope from context' } },
      { stepOrder: startOrder + 1, name: 'Break Down Tasks', type: 'AI_ACTION', config: { agentKey: 'project_manager_agent', prompt: 'Break down project into tasks' } },
      { stepOrder: startOrder + 2, name: 'Assign Resources', type: 'TOOL_CALL', config: { tool: 'resource_planner', params: {} } },
      { stepOrder: startOrder + 3, name: 'Review Project Plan', type: 'APPROVAL', config: { roleRequired: 'ADMIN', title: 'Project Plan Review' } },
    ];
  }
}
