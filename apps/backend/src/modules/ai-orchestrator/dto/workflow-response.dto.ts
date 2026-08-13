export class WorkflowResponseDto {
  id: string;
  title: string;
  userPrompt: string;
  finalResponse: string | null;
  status: string;
  executionPlan: any;
  steps: any[];
  delegations: any[];
  conversations: any[];
  executionGraph: any;
  sharedContexts: any[];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
}
