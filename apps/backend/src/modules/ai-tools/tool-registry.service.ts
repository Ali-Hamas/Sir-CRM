import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface ToolDefinition {
  key: string;
  name: string;
  description: string;
  categoryName: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredParams: string[];
  optionalParams: string[];
  jsonSchema: any;
  parameters: Array<{
    name: string;
    type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'OBJECT' | 'ARRAY';
    description: string;
    required: boolean;
    defaultValue?: string;
  }>;
}

const CATEGORIES = [
  { name: 'CRM', displayName: 'CRM & Pipeline', description: 'Manage companies, contacts, leads, and opportunities', icon: 'Target', color: 'bg-blue-500' },
  { name: 'PROJECTS', displayName: 'Project & Task Management', description: 'Create projects, manage tasks, and assign members', icon: 'Briefcase', color: 'bg-indigo-500' },
  { name: 'KNOWLEDGE', displayName: 'Knowledge Base', description: 'Search articles and publish documentation', icon: 'BookOpen', color: 'bg-purple-500' },
  { name: 'DOCUMENTS', displayName: 'Document Management', description: 'Upload, download, and index documents', icon: 'FileText', color: 'bg-teal-500' },
  { name: 'WORKFLOW', displayName: 'Workflow Automation', description: 'Execute triggers, actions, and custom workflows', icon: 'Workflow', color: 'bg-amber-500' },
  { name: 'NOTIFICATIONS', displayName: 'Notifications Engine', description: 'Dispatch system notifications & alerts', icon: 'Bell', color: 'bg-rose-500' },
  { name: 'SEARCH', displayName: 'Global Search', description: 'Execute cross-module global search queries', icon: 'Search', color: 'bg-emerald-500' },
];

const PLATFORM_TOOLS: ToolDefinition[] = [
  // --- CRM ---
  {
    key: 'crm_create_company',
    name: 'Create Company',
    description: 'Registers a new company record in the CRM',
    categoryName: 'CRM',
    riskLevel: 'MEDIUM',
    requiredParams: ['name'],
    optionalParams: ['industry', 'website', 'annualRevenue', 'numberOfEmployees'],
    jsonSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Company legal or trade name' },
        industry: { type: 'string', description: 'Industry classification' },
        website: { type: 'string', description: 'Company website URL' },
        annualRevenue: { type: 'number', description: 'Estimated annual revenue in USD' },
        numberOfEmployees: { type: 'integer', description: 'Total headcount' },
      },
      required: ['name'],
    },
    parameters: [
      { name: 'name', type: 'STRING', description: 'Company legal name', required: true },
      { name: 'industry', type: 'STRING', description: 'Industry sector', required: false },
      { name: 'website', type: 'STRING', description: 'Company URL', required: false },
      { name: 'annualRevenue', type: 'NUMBER', description: 'Revenue in USD', required: false },
      { name: 'numberOfEmployees', type: 'NUMBER', description: 'Headcount', required: false },
    ],
  },
  {
    key: 'crm_update_company',
    name: 'Update Company',
    description: 'Updates properties of an existing CRM company record',
    categoryName: 'CRM',
    riskLevel: 'MEDIUM',
    requiredParams: ['companyId'],
    optionalParams: ['name', 'industry', 'status', 'assignedToId'],
    jsonSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'UUID of target company' },
        name: { type: 'string', description: 'Updated company name' },
        status: { type: 'string', enum: ['PROSPECT', 'ACTIVE', 'INACTIVE', 'CLIENT'] },
      },
      required: ['companyId'],
    },
    parameters: [
      { name: 'companyId', type: 'STRING', description: 'Target company UUID', required: true },
      { name: 'name', type: 'STRING', description: 'New company name', required: false },
      { name: 'status', type: 'STRING', description: 'Company status', required: false },
    ],
  },
  {
    key: 'crm_search_company',
    name: 'Search Company',
    description: 'Finds companies matching a search query or industry filter',
    categoryName: 'CRM',
    riskLevel: 'LOW',
    requiredParams: ['query'],
    optionalParams: ['industry', 'limit'],
    jsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or keyword' },
        industry: { type: 'string', description: 'Industry filter' },
      },
      required: ['query'],
    },
    parameters: [
      { name: 'query', type: 'STRING', description: 'Search query', required: true },
      { name: 'industry', type: 'STRING', description: 'Filter by industry', required: false },
    ],
  },
  {
    key: 'crm_create_contact',
    name: 'Create Contact',
    description: 'Creates a new business contact linked to a company',
    categoryName: 'CRM',
    riskLevel: 'MEDIUM',
    requiredParams: ['firstName', 'lastName'],
    optionalParams: ['email', 'phone', 'companyId', 'jobTitle'],
    jsonSchema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        companyId: { type: 'string' },
        jobTitle: { type: 'string' },
      },
      required: ['firstName', 'lastName'],
    },
    parameters: [
      { name: 'firstName', type: 'STRING', description: 'First name', required: true },
      { name: 'lastName', type: 'STRING', description: 'Last name', required: true },
      { name: 'email', type: 'STRING', description: 'Email address', required: false },
      { name: 'companyId', type: 'STRING', description: 'Associated company ID', required: false },
    ],
  },
  {
    key: 'crm_update_contact',
    name: 'Update Contact',
    description: 'Updates an existing contact profile',
    categoryName: 'CRM',
    riskLevel: 'MEDIUM',
    requiredParams: ['contactId'],
    optionalParams: ['jobTitle', 'email', 'phone', 'status'],
    jsonSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string' },
        jobTitle: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['contactId'],
    },
    parameters: [
      { name: 'contactId', type: 'STRING', description: 'Target contact ID', required: true },
      { name: 'jobTitle', type: 'STRING', description: 'New job title', required: false },
    ],
  },
  {
    key: 'crm_create_lead',
    name: 'Create Lead',
    description: 'Captures a new prospect lead in the sales pipeline',
    categoryName: 'CRM',
    riskLevel: 'LOW',
    requiredParams: ['firstName', 'lastName', 'companyName'],
    optionalParams: ['email', 'phone', 'source', 'estimatedValue'],
    jsonSchema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        companyName: { type: 'string' },
        email: { type: 'string' },
        estimatedValue: { type: 'number' },
      },
      required: ['firstName', 'lastName', 'companyName'],
    },
    parameters: [
      { name: 'firstName', type: 'STRING', description: 'Lead first name', required: true },
      { name: 'lastName', type: 'STRING', description: 'Lead last name', required: true },
      { name: 'companyName', type: 'STRING', description: 'Company name', required: true },
    ],
  },
  {
    key: 'crm_convert_lead',
    name: 'Convert Lead',
    description: 'Converts a lead into an active opportunity and contact',
    categoryName: 'CRM',
    riskLevel: 'HIGH',
    requiredParams: ['leadId'],
    optionalParams: ['opportunityName', 'estimatedValue'],
    jsonSchema: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        opportunityName: { type: 'string' },
      },
      required: ['leadId'],
    },
    parameters: [
      { name: 'leadId', type: 'STRING', description: 'Lead UUID to convert', required: true },
    ],
  },
  {
    key: 'crm_create_opportunity',
    name: 'Create Opportunity',
    description: 'Registers a new sales opportunity in the pipeline',
    categoryName: 'CRM',
    riskLevel: 'MEDIUM',
    requiredParams: ['name', 'companyId'],
    optionalParams: ['estimatedValue', 'probability', 'expectedCloseDate'],
    jsonSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        companyId: { type: 'string' },
        estimatedValue: { type: 'number' },
      },
      required: ['name', 'companyId'],
    },
    parameters: [
      { name: 'name', type: 'STRING', description: 'Opportunity title', required: true },
      { name: 'companyId', type: 'STRING', description: 'Company UUID', required: true },
    ],
  },

  // --- PROJECTS ---
  {
    key: 'projects_create_project',
    name: 'Create Project',
    description: 'Initializes a new workspace project',
    categoryName: 'PROJECTS',
    riskLevel: 'HIGH',
    requiredParams: ['projectName', 'projectCode'],
    optionalParams: ['description', 'budget', 'startDate', 'endDate'],
    jsonSchema: {
      type: 'object',
      properties: {
        projectName: { type: 'string' },
        projectCode: { type: 'string' },
        budget: { type: 'number' },
      },
      required: ['projectName', 'projectCode'],
    },
    parameters: [
      { name: 'projectName', type: 'STRING', description: 'Project title', required: true },
      { name: 'projectCode', type: 'STRING', description: 'Unique code key', required: true },
    ],
  },
  {
    key: 'projects_update_project',
    name: 'Update Project',
    description: 'Modifies project status, progress, or manager',
    categoryName: 'PROJECTS',
    riskLevel: 'MEDIUM',
    requiredParams: ['projectId'],
    optionalParams: ['status', 'progress', 'priority', 'budget'],
    jsonSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        status: { type: 'string' },
        progress: { type: 'integer' },
      },
      required: ['projectId'],
    },
    parameters: [
      { name: 'projectId', type: 'STRING', description: 'Project UUID', required: true },
    ],
  },
  {
    key: 'projects_list_projects',
    name: 'List Projects',
    description: 'Fetches projects in the organization matching status filters',
    categoryName: 'PROJECTS',
    riskLevel: 'LOW',
    requiredParams: [],
    optionalParams: ['status', 'priority'],
    jsonSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
      },
    },
    parameters: [
      { name: 'status', type: 'STRING', description: 'Status filter', required: false },
    ],
  },
  {
    key: 'projects_create_task',
    name: 'Create Task',
    description: 'Creates a new task within a project',
    categoryName: 'PROJECTS',
    riskLevel: 'LOW',
    requiredParams: ['projectId', 'title'],
    optionalParams: ['description', 'priority', 'dueDate', 'estimatedHours'],
    jsonSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        title: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
      },
      required: ['projectId', 'title'],
    },
    parameters: [
      { name: 'projectId', type: 'STRING', description: 'Parent project UUID', required: true },
      { name: 'title', type: 'STRING', description: 'Task title', required: true },
    ],
  },
  {
    key: 'projects_assign_task',
    name: 'Assign Task',
    description: 'Assigns a user to a task',
    categoryName: 'PROJECTS',
    riskLevel: 'LOW',
    requiredParams: ['taskId', 'assigneeUserId'],
    optionalParams: [],
    jsonSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        assigneeUserId: { type: 'string' },
      },
      required: ['taskId', 'assigneeUserId'],
    },
    parameters: [
      { name: 'taskId', type: 'STRING', description: 'Task UUID', required: true },
      { name: 'assigneeUserId', type: 'STRING', description: 'User UUID to assign', required: true },
    ],
  },
  {
    key: 'projects_update_task',
    name: 'Update Task',
    description: 'Updates task status, priority, or details',
    categoryName: 'PROJECTS',
    riskLevel: 'LOW',
    requiredParams: ['taskId'],
    optionalParams: ['title', 'status', 'priority', 'dueDate'],
    jsonSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] },
      },
      required: ['taskId'],
    },
    parameters: [
      { name: 'taskId', type: 'STRING', description: 'Task UUID', required: true },
    ],
  },
  {
    key: 'projects_complete_task',
    name: 'Complete Task',
    description: 'Marks a task as completed',
    categoryName: 'PROJECTS',
    riskLevel: 'LOW',
    requiredParams: ['taskId'],
    optionalParams: ['completionNotes'],
    jsonSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
      },
      required: ['taskId'],
    },
    parameters: [
      { name: 'taskId', type: 'STRING', description: 'Task UUID', required: true },
    ],
  },

  // --- KNOWLEDGE ---
  {
    key: 'knowledge_search_articles',
    name: 'Search Articles',
    description: 'Queries knowledge base articles by title or keyword',
    categoryName: 'KNOWLEDGE',
    riskLevel: 'LOW',
    requiredParams: ['query'],
    optionalParams: ['categoryId'],
    jsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        categoryId: { type: 'string' },
      },
      required: ['query'],
    },
    parameters: [
      { name: 'query', type: 'STRING', description: 'Search query', required: true },
    ],
  },
  {
    key: 'knowledge_create_article',
    name: 'Create Article',
    description: 'Publishes a new article to the knowledge base',
    categoryName: 'KNOWLEDGE',
    riskLevel: 'MEDIUM',
    requiredParams: ['title', 'content'],
    optionalParams: ['categoryId', 'summary', 'status'],
    jsonSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        categoryId: { type: 'string' },
      },
      required: ['title', 'content'],
    },
    parameters: [
      { name: 'title', type: 'STRING', description: 'Article title', required: true },
      { name: 'content', type: 'STRING', description: 'Article body text', required: true },
    ],
  },

  // --- DOCUMENTS ---
  {
    key: 'documents_upload',
    name: 'Upload Document',
    description: 'Registers a file document upload metadata in a folder',
    categoryName: 'DOCUMENTS',
    riskLevel: 'MEDIUM',
    requiredParams: ['fileName', 'mimeType', 'size'],
    optionalParams: ['folderId', 'moduleReference'],
    jsonSchema: {
      type: 'object',
      properties: {
        fileName: { type: 'string' },
        mimeType: { type: 'string' },
        size: { type: 'integer' },
      },
      required: ['fileName', 'mimeType', 'size'],
    },
    parameters: [
      { name: 'fileName', type: 'STRING', description: 'File name', required: true },
      { name: 'mimeType', type: 'STRING', description: 'MIME type', required: true },
      { name: 'size', type: 'NUMBER', description: 'Size in bytes', required: true },
    ],
  },
  {
    key: 'documents_download',
    name: 'Download Document',
    description: 'Retrieves secure download link for a document',
    categoryName: 'DOCUMENTS',
    riskLevel: 'LOW',
    requiredParams: ['documentId'],
    optionalParams: [],
    jsonSchema: {
      type: 'object',
      properties: {
        documentId: { type: 'string' },
      },
      required: ['documentId'],
    },
    parameters: [
      { name: 'documentId', type: 'STRING', description: 'Document UUID', required: true },
    ],
  },

  // --- WORKFLOW ---
  {
    key: 'workflow_execute',
    name: 'Execute Workflow',
    description: 'Triggers manual execution of an active workflow',
    categoryName: 'WORKFLOW',
    riskLevel: 'HIGH',
    requiredParams: ['workflowId'],
    optionalParams: ['triggerPayload'],
    jsonSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string' },
        triggerPayload: { type: 'object' },
      },
      required: ['workflowId'],
    },
    parameters: [
      { name: 'workflowId', type: 'STRING', description: 'Workflow UUID', required: true },
    ],
  },

  // --- NOTIFICATIONS ---
  {
    key: 'notifications_send',
    name: 'Send Notification',
    description: 'Dispatches an in-app notification alert to a target user',
    categoryName: 'NOTIFICATIONS',
    riskLevel: 'LOW',
    requiredParams: ['targetUserId', 'title', 'message'],
    optionalParams: ['priority', 'linkUrl'],
    jsonSchema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string' },
        title: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['targetUserId', 'title', 'message'],
    },
    parameters: [
      { name: 'targetUserId', type: 'STRING', description: 'Recipient user ID', required: true },
      { name: 'title', type: 'STRING', description: 'Notification title', required: true },
      { name: 'message', type: 'STRING', description: 'Notification message body', required: true },
    ],
  },

  // --- SEARCH ---
  {
    key: 'search_global',
    name: 'Global Search',
    description: 'Performs cross-module search indexing across all workspace entities',
    categoryName: 'SEARCH',
    riskLevel: 'LOW',
    requiredParams: ['query'],
    optionalParams: ['modules', 'limit'],
    jsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        modules: { type: 'string' },
      },
      required: ['query'],
    },
    parameters: [
      { name: 'query', type: 'STRING', description: 'Search term', required: true },
    ],
  },
];

@Injectable()
export class ToolRegistryService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedCategoriesAndTools();
  }

  /**
   * Seeds categories and platform tools into DB.
   */
  async seedCategoriesAndTools() {
    try {
      for (const cat of CATEGORIES) {
        await this.prisma.aIToolCategory.upsert({
          where: { name: cat.name },
          update: { displayName: cat.displayName, description: cat.description, icon: cat.icon, color: cat.color },
          create: { name: cat.name, displayName: cat.displayName, description: cat.description, icon: cat.icon, color: cat.color },
        });
      }

      for (const toolDef of PLATFORM_TOOLS) {
        const category = await this.prisma.aIToolCategory.findUnique({ where: { name: toolDef.categoryName } });
        if (!category) continue;

        const existingTool = await this.prisma.aITool.findFirst({ where: { key: toolDef.key } });

        const tool = existingTool
          ? await this.prisma.aITool.update({
              where: { id: existingTool.id },
              data: {
                name: toolDef.name,
                description: toolDef.description,
                categoryId: category.id,
                jsonSchema: JSON.stringify(toolDef.jsonSchema),
                requiredParams: JSON.stringify(toolDef.requiredParams),
                optionalParams: JSON.stringify(toolDef.optionalParams),
                riskLevel: toolDef.riskLevel,
              },
            })
          : await this.prisma.aITool.create({
              data: {
                key: toolDef.key,
                name: toolDef.name,
                description: toolDef.description,
                categoryId: category.id,
                jsonSchema: JSON.stringify(toolDef.jsonSchema),
                requiredParams: JSON.stringify(toolDef.requiredParams),
                optionalParams: JSON.stringify(toolDef.optionalParams),
                riskLevel: toolDef.riskLevel,
                enabled: true,
              },
            });

        // Seed Parameters
        for (const param of toolDef.parameters) {
          await this.prisma.aIToolParameter.upsert({
            where: { toolId_name: { toolId: tool.id, name: param.name } },
            update: { type: param.type, description: param.description, required: param.required },
            create: { toolId: tool.id, name: param.name, type: param.type, description: param.description, required: param.required },
          });
        }

        // Seed Default Roles Permissions
        const roles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'];
        for (const role of roles) {
          await this.prisma.aIToolPermission.upsert({
            where: { toolId_role: { toolId: tool.id, role } },
            update: {},
            create: { toolId: tool.id, role, allowed: true, requiresApproval: toolDef.riskLevel === 'HIGH' || toolDef.riskLevel === 'CRITICAL' },
          });
        }
      }
    } catch (error) {
      console.warn('[ToolRegistryService] Could not auto-seed tool registry:', error);
    }
  }

  async getAllCategories() {
    return this.prisma.aIToolCategory.findMany({
      include: { _count: { select: { tools: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getAllTools() {
    const tools = await this.prisma.aITool.findMany({
      include: {
        category: true,
        parameters: true,
        permissions: true,
      },
      orderBy: { key: 'asc' },
    });

    return tools.map((tool) => ({
      ...tool,
      jsonSchema: JSON.parse(tool.jsonSchema || '{}'),
      requiredParams: JSON.parse(tool.requiredParams || '[]'),
      optionalParams: JSON.parse(tool.optionalParams || '[]'),
    }));
  }

  async getToolByKey(key: string) {
    const tool = await this.prisma.aITool.findFirst({
      where: { key },
      include: {
        category: true,
        parameters: true,
        permissions: true,
      },
    });

    if (!tool) return null;

    return {
      ...tool,
      jsonSchema: JSON.parse(tool.jsonSchema || '{}'),
      requiredParams: JSON.parse(tool.requiredParams || '[]'),
      optionalParams: JSON.parse(tool.optionalParams || '[]'),
    };
  }
}
