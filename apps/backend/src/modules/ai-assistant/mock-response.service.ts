import { Injectable } from '@nestjs/common';

@Injectable()
export class MockResponseService {
  /**
   * Generates a contextual mock response based on user prompt & assistant capabilities.
   */
  generateMockResponse(prompt: string, capabilities: string[] = []): {
    content: string;
    tokens: number;
    latencyMs: number;
    memoryUsed: string[];
    toolsRequested: string[];
  } {
    const lowerPrompt = prompt.toLowerCase();
    const startTime = Date.now();

    let content = '';
    let memoryUsed: string[] = [];
    let toolsRequested: string[] = [];

    // Analyze prompt keywords to return realistic simulated assistance
    if (lowerPrompt.includes('lead') || lowerPrompt.includes('crm') || lowerPrompt.includes('pipeline') || lowerPrompt.includes('deal')) {
      toolsRequested.push('CRM_SearchLeads', 'CRM_GetPipelineStats');
      memoryUsed.push('CRM Organization Preferences', 'Quarterly Target Q3');
      content = `[Mock AI Assistant — CRM Engine]\n\nBased on your active CRM pipeline:\n- **Total Open Leads**: 42\n- **Highest Score Lead**: Acme Corp ($120,000 estimated value, status: PROSPECT)\n- **Action Recommendation**: Follow up on pending Proposal #PR-2026-004 with Acme Corp before Friday.`;

    } else if (lowerPrompt.includes('project') || lowerPrompt.includes('task') || lowerPrompt.includes('kanban')) {
      toolsRequested.push('Projects_GetMilestones', 'Tasks_FilterByDueDate');
      memoryUsed.push('Project Apollo Workload Schedule');
      content = `[Mock AI Assistant — Project Management Engine]\n\nProject Status Overview:\n- **Active Projects**: 4\n- **Overdue Tasks**: 2 tasks requiring immediate review ("Review Q3 Marketing Plan", "Database Index Migration")\n- **Team Capacity**: 82% allocated. Resource allocation is balanced across current sprints.`;

    } else if (lowerPrompt.includes('workflow') || lowerPrompt.includes('automation') || lowerPrompt.includes('trigger')) {
      toolsRequested.push('Workflow_ListActiveWorkflows', 'Workflow_CheckExecutionLogs');
      memoryUsed.push('Default Automation Trigger Rules');
      content = `[Mock AI Assistant — Workflow Automation Engine]\n\nWorkflow Health System Check:\n- **Active Automation Rules**: 8 active triggers running.\n- **Recent Executions**: 156 executed today (100% success rate).\n- **Latest Trigger**: "New Lead Auto-Assignment" executed 12 minutes ago.`;

    } else if (lowerPrompt.includes('knowledge') || lowerPrompt.includes('article') || lowerPrompt.includes('doc')) {
      toolsRequested.push('Knowledge_GlobalSearch', 'Documents_IndexFilter');
      memoryUsed.push('Enterprise Knowledge Index v2.4');
      content = `[Mock AI Assistant — Knowledge & Document Search]\n\nFound relevant workspace documents:\n1. **Standard Operating Procedures 2026.pdf** (Category: HR & Operations)\n2. **Sales Pipeline & Lead Scoring Guidelines.md** (Category: Sales)\n\nSummary: All corporate documents are currently up-to-date and synced.`;

    } else {
      toolsRequested.push('GlobalSearch_ExecuteQuery', 'Memory_FetchUserPreferences');
      memoryUsed.push('General Workspace Context');
      content = `[Mock AI Assistant — Core Engine]\n\nHello! I am your central Britsync AI Assistant. I am currently monitoring all workspace modules including CRM, Projects, Knowledge, Documents, and Workflows.\n\nHow can I help optimize your operations today?`;
    }

    const latencyMs = Math.floor(Math.random() * 120) + 40; // Simulated latency 40-160ms
    const tokens = Math.floor(prompt.length / 4) + Math.floor(content.length / 4) + 25;

    return {
      content,
      tokens,
      latencyMs,
      memoryUsed,
      toolsRequested,
    };
  }
}
