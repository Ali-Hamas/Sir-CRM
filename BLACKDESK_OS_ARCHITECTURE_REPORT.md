# BlackDesk OS - Complete Architecture & Technical Documentation

## Executive Summary

BlackDesk OS is an enterprise SaaS platform built as a **Turborepo monorepo** managed with **pnpm**. It provides a full-featured business operating system with **CRM, Project Management, Knowledge Base, Workflow Automation, Document Management, and an Enterprise AI Platform** with multi-provider LLM support, RAG, AI agents, assistants, and executive dashboards. The backend is built with **NestJS (Node.js)**, the frontend with **Next.js 14 (React)**, and the database layer uses **Prisma ORM targeting MongoDB Atlas** with a secondary **SQLite** setup for local development.

---

## 1. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Monorepo Tool** | Turborepo | ^2.0.4 |
| **Package Manager** | pnpm | 9.1.1 |
| **Runtime** | Node.js | >=20 |
| **Backend Framework** | NestJS | ^10.0 |
| **Frontend Framework** | Next.js | 14.2.3 |
| **UI Library** | React | ^18.2 |
| **CSS Framework** | Tailwind CSS | ^3.4 |
| **State Management** | Zustand | ^4.5 |
| **Forms** | React Hook Form + Zod | ^7.51 / ^3.23 |
| **ORM** | Prisma | ^5.13 |
| **Primary Database** | MongoDB Atlas | (remote cluster) |
| **Secondary Database** | SQLite | (local dev only) |
| **Auth** | Passport.js + JWT | @nestjs/jwt, passport-jwt |
| **Password Hashing** | bcrypt | ^5.1 |
| **Icons** | Lucide React | ^0.378 |
| **Themes** | next-themes | ^0.3 |
| **Real-time** | Socket.IO | ^4.8 |
| **Validation** | class-validator + class-transformer | ^0.14 / ^0.5 |
| **Linting** | ESLint + Prettier | — |
| **Husky** | Git hooks | ^9.0 |

---

## 2. Folder Structure

```
blackdesk-os/
├── .env                          # Root environment variables (MongoDB URL, JWT secret)
├── docker-compose.yml            # PostgreSQL + MinIO (legacy, not currently used)
├── package.json                  # Root workspace config
├── pnpm-workspace.yaml           # Declares apps/* and packages/*
├── turbo.json                    # Turborepo pipeline config
├── apps/
│   ├── backend/                  # NestJS API server (port 3001)
│   │   ├── src/
│   │   │   ├── main.ts           # Bootstrap, CORS, cookie-parser, auto-seed admin
│   │   │   ├── app.module.ts     # Root module importing all 33 feature modules
│   │   │   ├── common/
│   │   │   │   └── roles.ts      # Role constants (SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE, CLIENT)
│   │   │   ├── core/
│   │   │   │   ├── core.module.ts
│   │   │   │   └── prisma/       # PrismaService (wrapper around PrismaClient)
│   │   │   └── modules/          # 33 feature modules (see below)
│   │   └── package.json
│   └── frontend/                 # Next.js 14 App Router (port 3000)
│       ├── src/
│       │   ├── middleware.ts      # Route protection via cookie-based auth
│       │   ├── app/              # App Router pages
│       │   ├── components/       # Shared UI components (layout)
│       │   ├── lib/              # API client, utility functions
│       │   ├── providers/        # AuthProvider, ThemeProvider
│       │   └── store/            # Zustand stores (auth, org)
│       ├── next.config.mjs       # API proxy rewrite to localhost:3001
│       └── tailwind.config.ts
└── packages/
    └── database/                 # @blackdesk/database
        ├── index.ts              # Re-exports @prisma/client
        ├── prisma/
        │   └── schema.prisma     # 124 MongoDB models (2746 lines)
        ├── fix_mongodb_schema.js # Patches Prisma schema for MongoDB compatibility
        ├── push.js               # Runs prisma db push + generate
        ├── setup_db.js           # SQLite setup for AI/search tables
        ├── sync_agents_db.js     # SQLite setup for AI agents tables
        └── sync_executive_db.js  # SQLite setup for executive dashboard tables
```

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ App      │  │ Auth     │  │ Org      │  │ Workspace   │ │
│  │ Router   │  │ Pages    │  │ Pages    │  │ Pages       │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│       │              │             │               │         │
│  ┌────┴──────────────┴─────────────┴───────────────┴──────┐ │
│  │              API Client (lib/api.ts)                     │ │
│  │         (fetch with credentials: 'include')              │ │
│  └─────────────────────────┬───────────────────────────────┘ │
└────────────────────────────┼──────────────────────────────────┘
                             │ HTTP (proxy: /api-proxy -> :3001)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (NestJS :3001)                       │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │ JWT Auth     │  │ Global Pipes   │  │ CORS + Cookie    │ │
│  │ Guard        │  │ (Validation)   │  │ Parser           │ │
│  └──────┬───────┘  └────────────────┘  └──────────────────┘ │
│         │                                                     │
│  ┌──────┴──────────────────────────────────────────────────┐ │
│  │              33 Feature Modules                          │ │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐  │ │
│  │  │ CRM     │ │ Projects │ │ AI     │ │ Workflows    │  │ │
│  │  │ Modules │ │ & Tasks  │ │ Suite  │ │ & Knowledge  │  │ │
│  │  └────┬────┘ └────┬─────┘ └───┬────┘ └──────┬───────┘  │ │
│  └───────┼───────────┼───────────┼──────────────┼──────────┘ │
│          │           │           │              │            │
│  ┌───────┴───────────┴───────────┴──────────────┴──────────┐ │
│  │              PrismaService (MongoDB Client)              │ │
│  └──────────────────────────┬──────────────────────────────┘ │
└─────────────────────────────┼────────────────────────────────┘
                              │
                              ▼
              ┌────────────────────────────┐
              │     MongoDB Atlas           │
              │  (blackdesk cluster)        │
              └────────────────────────────┘
```

---

## 4. Frontend Architecture

### Framework & Routing
- **Next.js 14 App Router** with file-based routing
- Layout nesting: Root → `[orgSlug]` → `[workspaceId]`
- Middleware-based auth protection (cookie check with `access_token`)
- Public routes: login, register, forgot-password, reset-password, verify-email

### State Management
- **Zustand** with two stores:
  - `auth.store.ts` — manages user, isAuthenticated, loading state; provides login/logout/setUser actions
  - `org.store.ts` — manages current organization, workspaces, org members

### API Layer
- `lib/api.ts` — custom `apiFetch` wrapper:
  - Uses `/api-proxy` prefix (rewritten to `localhost:3001` via next.config.mjs)
  - Sends HttpOnly cookies (`credentials: 'include'`)
  - Silent 401 → auto-refresh → retry logic
  - Failed refresh → calls backend logout → redirects to login

### Pages & Routes

| Route | Purpose |
|-------|---------|
| `/` | Home — redirects to org/workspace or onboarding |
| `/auth/login` | Login page |
| `/auth/register` | Registration page |
| `/auth/forgot-password` | Password reset request |
| `/auth/reset-password` | Password reset with token |
| `/onboarding/organization` | Multi-step org creation wizard |
| `/unauthorized` | 403 Access Denied |
| `/[orgSlug]` | Org dashboard — redirects to default workspace |
| `/[orgSlug]/[workspaceId]` | Workspace-scoped app layout |
| `/[orgSlug]/[workspaceId]/crm/companies` | Company list/detail/new/edit |
| `/[orgSlug]/[workspaceId]/crm/contacts` | Contact list/detail/new/edit |
| `/[orgSlug]/[workspaceId]/crm/leads` | Lead list/detail/new/edit |
| `/[orgSlug]/[workspaceId]/crm/opportunities` | Opportunity list/detail/new/edit |
| `/[orgSlug]/[workspaceId]/crm/proposals` | Proposal list/detail/new/edit |
| `/[orgSlug]/[workspaceId]/crm/contracts` | Contract list/detail/new/edit |
| `/[orgSlug]/[workspaceId]/crm/meetings` | Meeting list/detail/new/edit |
| `/[orgSlug]/[workspaceId]/projects` | Project list/new/detail/edit |
| `/[orgSlug]/[workspaceId]/projects/[projectId]/tasks` | Task board (Kanban/List) |
| `/[orgSlug]/[workspaceId]/knowledge` | Knowledge base categories/articles |
| `/[orgSlug]/[workspaceId]/workflows` | Workflow list/new/edit/executions |
| `/[orgSlug]/[workspaceId]/documents` | Document management |
| `/[orgSlug]/[workspaceId]/ai/assistant` | AI Assistant chat |
| `/[orgSlug]/[workspaceId]/ai/chat` | AI Chat conversations |
| `/[orgSlug]/[workspaceId]/ai/agents` | AI Agent management |
| `/[orgSlug]/[workspaceId]/ai/tools` | AI Tool management |
| `/[orgSlug]/[workspaceId]/ai/rag` | RAG index and document management |
| `/[orgSlug]/[workspaceId]/ai/memory` | AI Memory management |
| `/[orgSlug]/[workspaceId]/activity` | Activity feed |
| `/[orgSlug]/[workspaceId]/notifications` | Notification center |
| `/[orgSlug]/[workspaceId]/settings` | Organization settings |
| `/[orgSlug]/[workspaceId]/settings/ai` | AI provider configuration |
| `/[orgSlug]/[workspaceId]/settings/prompts` | Prompt template management |
| `/[orgSlug]/[workspaceId]/roles` | Role & permission management |
| `/[orgSlug]/[workspaceId]/users` | User management |
| `/[orgSlug]/[workspaceId]/teams` | Team management |
| `/[orgSlug]/[workspaceId]/departments` | Department management |
| `/[orgSlug]/[workspaceId]/time-tracking` | Time tracking |
| `/[orgSlug]/[workspaceId]/resources` | Resource management |
| `/[orgSlug]/[workspaceId]/executive-dashboard` | Executive AI dashboard |

### Component Architecture

- **AppLayout** — Main shell with CommandPalette, Sidebar, Topbar, and content area
- **Sidebar** — Collapsible navigation tree with 20+ module entries, org/workspace switcher
- **Topbar** — Breadcrumb, global search (Cmd+K trigger), theme toggle, notifications, user dropdown
- **CommandPalette** — Cmd+K modal for rapid navigation and global search

### UI Libraries Used
- tailwind-merge + clsx (utility class merging)
- next-themes (dark/light mode)
- lucide-react (iconography)
- react-hook-form + zod + @hookform/resolvers (form handling + validation)

---

## 5. Backend Architecture

### Framework
- **NestJS 10** with modular architecture
- **33 feature modules** registered in `app.module.ts`
- **Global PrismaModule** — provides `PrismaService` throughout the app
- **Global validation** via `ValidationPipe` (whitelist + transform)
- **Cookie parser** middleware for HttpOnly cookie auth

### Module Architecture Pattern
Each module follows a consistent pattern:
```
module-name/
├── module-name.module.ts     # @Module decorator, imports/controllers/providers/exports
├── module-name.controller.ts # Route handlers, guards, validation
├── module-name.service.ts    # Business logic, Prisma queries
├── dto/                      # (optional) Data Transfer Objects with class-validator
└── guards/                   # (optional) Module-specific guards
```

### Complete Backend Module Inventory

| # | Module | Purpose | Controller Route |
|---|--------|---------|-----------------|
| 1 | **auth** | Authentication (login, register, refresh, logout, forgot/reset password, me) | `/auth` |
| 2 | **users** | User CRUD (findByEmail, findById, create, update) | (no controller, service only) |
| 3 | **organizations** | Org CRUD with auto-creation of default workspace + membership | `/organizations` |
| 4 | **workspaces** | Workspace management within orgs | `/organizations/:orgId/workspaces` |
| 5 | **team** | Team management | `/organizations/:orgId/teams` |
| 6 | **departments** | Department management | `/organizations/:orgId/departments` |
| 7 | **roles** | Custom role definitions and permissions | `/organizations/:orgId/roles` |
| 8 | **activity** | Activity/audit log for all entity types | (service only, called by other modules) |
| 9 | **notifications** | In-app notification system with Socket.IO gateway | `/organizations/:orgId/notifications` |
| 10 | **documents** | Document/file management with storage and versioning | `/organizations/:orgId/documents` |
| 11 | **companies** | CRM company accounts | `/organizations/:orgId/companies` |
| 12 | **contacts** | CRM contact/person records | `/organizations/:orgId/contacts` |
| 13 | **leads** | CRM lead management with pipeline tracking | `/organizations/:orgId/leads` |
| 14 | **opportunities** | CRM sales pipeline opportunities | `/organizations/:orgId/opportunities` |
| 15 | **meetings** | CRM meetings with participants and action items | `/organizations/:orgId/meetings` |
| 16 | **proposals** | Sales proposals with sections, versions, approvals | `/organizations/:orgId/proposals` |
| 17 | **contracts** | Legal contracts with versions and approvals | `/organizations/:orgId/contracts` |
| 18 | **projects** | Project management with phases and milestones | `/organizations/:orgId/projects` |
| 19 | **tasks** | Task management with Kanban, checklists, dependencies | `/organizations/:orgId/projects/:projectId/tasks` |
| 20 | **time-tracking** | Timesheet entries per user/project/task | `/organizations/:orgId/time-entries` |
| 21 | **resource-management** | Resource allocation to projects | `/organizations/:orgId/resource-allocations` |
| 22 | **knowledge** | Knowledge base with categories, articles, revisions | `/organizations/:orgId/knowledge` |
| 23 | **workflows** | Automation workflows with triggers, conditions, actions, executions | `/organizations/:orgId/workflows` |
| 24 | **search** | Global search across entities | (endpoint TBD) |
| 25 | **ai-providers** | AI provider config (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, Ollama) | `/organizations/:orgId/ai/providers` |
| 26 | **prompts** | Prompt template library with versioning and variables | `/organizations/:orgId/ai/prompts` |
| 27 | **ai-chat** | AI chat conversations with folders and messages | `/organizations/:orgId/ai/chat` |
| 28 | **ai-memory** | AI memory at user/org/workspace levels | `/organizations/:orgId/ai/memory` |
| 29 | **ai-assistant** | Enterprise AI assistant with capabilities, permissions, sessions | `/organizations/:orgId/ai/assistant` |
| 30 | **ai-tools** | AI-callable tools with JSON schema parameters | `/organizations/:orgId/ai/tools` |
| 31 | **rag** | RAG (Retrieval-Augmented Generation) indexing and search | `/organizations/:orgId/ai/rag` |
| 32 | **ai-agents** | Specialized AI agents (Sales, PM, etc.) | `/organizations/:orgId/ai/agents` |
| 33 | **executive-dashboard** | AI-powered executive insights, metrics, alerts, predictions | `/organizations/:orgId/executive-dashboard` |

### Cross-Cutting Concerns

- **Auth**: JWT strategy extracts token from cookies (primary) or Bearer header (fallback)
- **Guards**: `JwtAuthGuard` (authenticated), `RolesGuard` (role-based access)
- **Roles**: SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE, CLIENT (defined in `common/roles.ts`)
- **Logging**: Every mutation logs to `UserActivity` via `ActivityService`
- **Auto-seed**: On empty database, creates admin@blackdesk.com / password123

---

## 6. MongoDB Database Design

### ORM / ODM
- **Prisma 5** with `prisma-client-js` generator
- MongoDB provider via `DATABASE_URL` pointing to MongoDB Atlas
- Schema uses `@map("_id")` on every `@id` field for MongoDB compatibility
- All relations use `onDelete: NoAction, onUpdate: NoAction` (MongoDB constraint)

### Complete Collection Inventory (124 models)

#### Core Identity & Auth (4 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **User** | email (unique), passwordHash, role, firstName, lastName, isEmailVerified, profilePictureUrl | Core user account |
| **RefreshToken** | token (unique), userId, expiresAt, isRevoked | JWT refresh token persistence |
| **VerificationToken** | token (unique), type, userId, expiresAt | Email verification & password reset |
| **Organization** | name, slug (unique), domain, status, logoUrl | Top-level tenant entity |

#### Workspace & Team Structure (6 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Workspace** | name, description, organizationId | Sub-organization workspaces |
| **Department** | name, organizationId, parentId | Department hierarchy |
| **Team** | name, description, departmentId, organizationId | Teams within departments |
| **TeamMember** | userId, teamId (unique pair) | User-team membership |
| **OrganizationMember** | userId, orgId (unique pair), role | User-org membership with role |
| **WorkspaceMember** | userId, workspaceId (unique pair), role | User-workspace membership |

#### Auth & Permissions (3 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Invitation** | email, organizationId, token, role, status, expiresAt | Email invitations to join org |
| **CustomRole** | name, organizationId, description | Custom user-defined roles |
| **RolePermission** | roleId, resource, action (unique triplet) | Granular permissions per role |

#### Activity & Notifications (3 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **UserActivity** | userId, organizationId, action, module, entityType, entityId, metadata | Audit log of user actions |
| **Notification** | userId, organizationId, type, title, message, isRead, entityType, entityId | In-app notifications |
| **NotificationPreference** | userId (unique), emailNotifications, pushNotifications, digestFrequency | Per-user notification settings |

#### Document Management (6 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Folder** | name, parentId, organizationId | Hierarchical folder structure |
| **Document** | name, fileType, fileSize, storagePath, folderId, organizationId | File/document records |
| **DocumentVersion** | documentId, versionNum, filePath, size, uploadedById | Version history |
| **DocumentComment** | documentId, content, createdById | Comments on documents |
| **DocumentTag** | documentId, name (unique pair) | Tags on documents |
| **FavoriteDocument** | documentId, userId (unique pair) | User favorites |

#### CRM — Companies (4 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Company** | name, industry, status, country, assignedToId, organizationId | CRM company accounts |
| **CompanyTag** | companyId, name (unique pair) | Company tags |
| **CompanyNote** | companyId, content, createdById | Notes on companies |
| **CompanyActivity** | companyId, userId, action, metadata | Activity log for companies |

#### CRM — Contacts (4 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Contact** | firstName, lastName, email, jobTitle, companyId, organizationId | CRM contacts |
| **ContactTag** | contactId, name (unique pair) | Contact tags |
| **ContactNote** | contactId, content, createdById | Notes on contacts |
| **ContactActivity** | contactId, userId, action, metadata | Activity log for contacts |

#### CRM — Leads (4 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Lead** | firstName, lastName, email, status, source, stage, assignedToId, organizationId | Lead records |
| **LeadTag** | leadId, name (unique pair) | Lead tags |
| **LeadNote** | leadId, content, createdById | Notes on leads |
| **LeadActivity** | leadId, userId, action, metadata | Activity log for leads |

#### CRM — Opportunities (4 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Opportunity** | name, stage, amount, probability, closeDate, assignedToId, organizationId | Sales pipeline entries |
| **OpportunityTag** | opportunityId, name (unique pair) | Opportunity tags |
| **OpportunityNote** | opportunityId, content, createdById | Notes on opportunities |
| **OpportunityActivity** | opportunityId, userId, action, metadata | Activity log |

#### CRM — Meetings (4 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Meeting** | title, startTime, endTime, location, status, organizationId | Meetings/appointments |
| **MeetingParticipant** | meetingId, userId (unique pair) | Attendees |
| **MeetingNote** | meetingId, content, createdById | Meeting notes |
| **MeetingActionItem** | meetingId, description, assigneeId, status | Action items |

#### CRM — Proposals (5 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Proposal** | title, status, amount, opportunityId, organizationId | Sales proposals |
| **ProposalSection** | proposalId, title, content, sortOrder | Sections within proposals |
| **ProposalVersion** | proposalId, versionNum (unique pair), content | Version history |
| **ProposalApprovalLog** | proposalId, approverId, status, comments | Approval trail |
| **ProposalActivity** | proposalId, userId, action, metadata | Activity log |

#### CRM — Contracts (4 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Contract** | title, status, startDate, endDate, value, organizationId | Legal contracts |
| **ContractVersion** | contractId, versionNum (unique pair) | Version history |
| **ContractApproval** | contractId, approverId, status, comments | Approval trail |
| **ContractActivity** | contractId, userId, action, metadata | Activity log |

#### CRM — Client (1 model)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Client** | companyId (unique), status, assignedToId | Client conversion of companies |

#### Project Management (6 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Project** | name, status, startDate, endDate, clientId, organizationId | Projects |
| **ProjectMember** | projectId, userId (unique pair) | Project team members |
| **ProjectPhase** | projectId, name, sortOrder, startDate, endDate | Project phases |
| **Milestone** | projectId, name, dueDate, status | Milestones |
| **ProjectActivity** | projectId, userId, action, metadata | Activity log |
| **ResourceAllocation** | userId, projectId (unique pair), allocationPercentage | Resource assignment |

#### Tasks (7 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Task** | title, status, priority, stage, projectId, assigneeId, dueDate | Tasks with Kanban support |
| **TaskAssignee** | taskId, userId (unique pair) | Task assignees |
| **TaskComment** | taskId, content, createdById | Comments |
| **TaskAttachment** | taskId, fileName, filePath, uploadedById | Attachments |
| **TaskChecklist** | taskId, title, sortOrder | Checklists |
| **TaskChecklistItem** | checklistId, content, isCompleted | Checklist items |
| **TaskDependency** | taskId, dependsOnId (unique pair) | Task dependency graph |

#### Time Tracking (2 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **TimeEntry** | userId, projectId, taskId, startTime, endTime, duration, description | Timesheet entries |
| **WorkSchedule** | userId, orgId, dayOfWeek (unique pair), startTime, endTime | Per-user work schedules |

#### Knowledge Base (6 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **KnowledgeCategory** | name, description, organizationId, parentId | KB categories |
| **KnowledgeArticle** | title, content, categoryId, status, organizationId | KB articles |
| **KnowledgeRevision** | articleId, versionNum, content, createdById | Article revision history |
| **KnowledgeComment** | articleId, content, createdById | Article comments |
| **KnowledgeFavorite** | articleId, userId (unique pair) | Article favorites |
| **KnowledgeAttachment** | articleId, fileName, filePath, uploadedById | File attachments |

#### Workflow Automation (5 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **Workflow** | name, description, status, organizationId, triggerType | Automation workflows |
| **WorkflowTrigger** | workflowId, type, config | Workflow triggers |
| **WorkflowCondition** | workflowId, field, operator, value, sortOrder | Conditions |
| **WorkflowAction** | workflowId, type, config, sortOrder | Actions |
| **WorkflowExecution** | workflowId, status, triggeredById, inputs, outputs, error | Execution logs |

#### AI Platform — Providers & Models (2 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **AIProvider** | name, providerType, apiKey (encrypted), baseUrl, organizationId | Provider configurations |
| **AIModel** | providerId, modelName, displayName, maxTokens, contextWindow | Models per provider |

#### AI Platform — Prompts (5 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **PromptCategory** | name, description, organizationId | Prompt categories |
| **PromptTemplate** | name, content, categoryId, organizationId | Reusable prompt templates |
| **PromptVersion** | templateId, versionNum (unique pair), content | Version history |
| **PromptVariable** | templateId, key, label, type, defaultValue | Template variables |
| **PromptExecutionLog** | templateId, userId, input, output, tokensUsed, latencyMs | Execution logs |

#### AI Platform — Chat (6 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **AIConversationFolder** | name, organizationId | Conversation folders |
| **AIConversation** | title, folderId, userId, organizationId | Chat threads |
| **AIMessage** | conversationId, role, content, tokensUsed, modelUsed | Messages |
| **AIConversationShare** | conversationId, sharedWithId, permission | Shared conversations |
| **AIConversationPin** | conversationId, userId (unique pair) | Pinned conversations |
| **AIConversationContext** | conversationId, contextData | Preserved context per conversation |

#### AI Platform — Memory (5 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **AIMemoryCategory** | name, organizationId | Memory categories |
| **AIMemory** | categoryId, key, value, scope, userId, organizationId | AI memory entries |
| **AIContext** | entityType, entityId, contextData, organizationId | Context snapshots |
| **AIWorkspaceMemory** | workspaceId, key, value | Workspace-level key-value memory |
| **AIUserPreference** | userId (unique), preferences | Per-user AI preferences |

#### AI Platform — Assistant (5 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **AIAssistant** | name, model, systemPrompt, organizationId | Central enterprise AI assistant |
| **AIAssistantCapability** | assistantId, capability (unique pair) | Capabilities (CRM, PROJECTS, etc.) |
| **AIAssistantPermission** | assistantId, permission (READ, WRITE, etc.) | Assistant permissions |
| **AIAssistantSession** | assistantId, userId, status | Conversation sessions |
| **AIAssistantExecution** | assistantId, userId, input, output, tokensUsed, latencyMs | Execution logs |

#### AI Platform — Tools (5 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **AIToolCategory** | name, organizationId | Tool categories |
| **AITool** | name, key, description, schema, categoryId, organizationId | AI-callable tools |
| **AIToolParameter** | toolId, name (unique pair), type, required, description | Parameters with JSON schema |
| **AIToolPermission** | toolId, role (unique pair) | Role-based access |
| **AIToolExecution** | toolId, userId, input, output, status, latencyMs | Execution logs |

#### RAG Engine (5 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **RAGIndex** | name, description, embeddingModel, chunkSize, organizationId | RAG index configuration |
| **RAGDocument** | indexId, title, source, filePath, status | Indexed documents |
| **RAGChunk** | documentId, content, chunkIndex, tokenCount | Document chunks |
| **RAGEmbedding** | chunkId (unique), vector, model | Vector embeddings |
| **RAGSearch** | indexId, query, resultsCount, latencyMs | Search query logs |
| **RAGSearchResult** | searchId, chunkId, score, rank | Search results |

#### Specialized AI Agents (6 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **AIAgent** | name, type, model, systemPrompt, organizationId | Specialized agents |
| **AIAgentCapability** | agentId, capability (unique pair) | Agent capabilities |
| **AIAgentPrompt** | agentId, promptTemplateId | Agent-specific prompts |
| **AIAgentKnowledgeScope** | agentId, scopeType (unique pair) | Knowledge access scopes |
| **AIAgentToolAccess** | agentId, toolKey (unique pair) | Tool permissions |
| **AIAgentExecution** | agentId, userId, input, output, tokensUsed, latencyMs | Execution logs |

#### Executive Dashboard (5 models)
| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **ExecutiveDashboard** | name, organizationId (unique), config | Per-org dashboard |
| **ExecutiveInsight** | dashboardId, type, title, content, confidence | AI-generated insights |
| **ExecutiveMetric** | dashboardId, name, value, trend, period | Metrics with trends |
| **ExecutiveAlert** | dashboardId, type, severity, title, message, isResolved | Alerts |
| **ExecutivePrediction** | dashboardId, metric, predictedValue, confidence, timeFrame | Predictions |

---

## 7. Authentication & Security

### Authentication Flow

1. **Login**: User submits email/password → `POST /auth/login` → bcrypt verify → JWT tokens generated → Set as HttpOnly cookies
2. **Registration**: `POST /auth/register` → Hash password → Create user → Generate tokens → Set cookies
3. **Token Refresh**: `POST /auth/refresh` → Read `refresh_token` cookie → Verify in DB → Issue new token pair → Rotate refresh token
4. **Logout**: `POST /auth/logout` → Clear cookies

### JWT Implementation
- **Access Token**: 15-minute expiry, stored in `access_token` cookie
- **Refresh Token**: 7-day expiry, stored in `refresh_token` cookie, persisted in RefreshToken collection with revocation support
- **Extraction**: JWT strategy checks cookies first, falls back to Bearer header
- **Secret**: `process.env.JWT_SECRET` with fallback `super-secret-key-for-development`

### Cookie Configuration
| Cookie | HttpOnly | Secure | SameSite | MaxAge |
|--------|----------|--------|----------|--------|
| `access_token` | Yes | Production only | lax | 15 min |
| `refresh_token` | Yes | Production only | lax | 7 days |

### Password Security
- bcrypt with 10 salt rounds
- Reset flow: crypto token → stored in VerificationToken (1 hour expiry)
- Token rotation on password reset (revokes all existing refresh tokens)

### RBAC
- 5 built-in roles: SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE, CLIENT
- Custom roles with granular permissions (RolePermission model)
- RolesGuard checks user.role against required roles
- Organization-level membership with role assignment

### Organization & Workspace Isolation
- All entities scoped by `organizationId`
- Membership enforced via OrganizationMember, WorkspaceMember
- Controllers use `:orgId` path parameter for data isolation

### API Security
- CORS: `origin: true` (all origins allowed in development)
- Global ValidationPipe with whitelist (strips unknown properties)
- No rate limiting implemented
- No CSRF protection implemented

---

## 8. API Documentation

### Auth Module — `/auth`

| Method | Endpoint | Auth | Purpose | Request Body | Response |
|--------|----------|------|---------|-------------|----------|
| POST | `/auth/register` | No | Register new user | `{ email, password, firstName?, lastName? }` | `{ user }` + cookies |
| POST | `/auth/login` | No | Login | `{ email, password }` | `{ user }` + cookies |
| POST | `/auth/refresh` | Cookie | Refresh tokens | — | `{ user }` + cookies |
| POST | `/auth/logout` | No | Clear auth cookies | — | `{ message }` |
| POST | `/auth/forgot-password` | No | Request password reset | `{ email }` | `{ message }` |
| POST | `/auth/reset-password` | No | Reset password | `{ token, password }` | `{ message }` |
| GET | `/auth/me` | JWT | Get current user profile | — | `{ id, email, role }` |

### Organizations Module — `/organizations`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/organizations` | JWT | Create org (auto-adds creator as SUPER_ADMIN, creates default workspace) |
| GET | `/organizations` | JWT | List user's organizations |
| GET | `/organizations/:id` | JWT | Get org by ID or slug |
| PATCH | `/organizations/:id` | JWT+SUPER_ADMIN/ADMIN | Update org |
| DELETE | `/organizations/:id` | JWT+SUPER_ADMIN | Soft-delete org |

### CRM Modules — all under `/organizations/:orgId/`

Each CRM module follows the same CRUD pattern. Here is a representative API map for **Companies** (identical patterns apply to Contacts, Leads, Opportunities):

#### Companies — `/organizations/:orgId/companies`

| Method | Endpoint | Auth+Role | Purpose |
|--------|----------|-----------|---------|
| POST | `/companies` | JWT+EMPLOYEE+ | Create company with tags |
| GET | `/companies` | JWT | List (paginated, filterable by search/status/industry/country/assignedTo) |
| GET | `/companies/stats` | JWT | Aggregate stats (total, byStatus, byIndustry) |
| GET | `/companies/:id` | JWT | Get company with notes, activities, tags |
| PATCH | `/companies/:id` | JWT+EMPLOYEE+ | Update company |
| DELETE | `/companies/:id` | JWT+MANAGER+ | Soft-delete company |
| POST | `/companies/:id/notes` | JWT+EMPLOYEE+ | Add note |
| DELETE | `/companies/:id/notes/:noteId` | JWT+MANAGER+ | Remove note |

#### Contacts — `/organizations/:orgId/contacts`

Identical pattern to Companies, with additional:
| GET | `/contacts/company/:companyId` | JWT | Get contacts by company |

#### Leads — `/organizations/:orgId/leads`

Similar CRUD with lead-specific stats endpoint.

#### Opportunities — `/organizations/:orgId/opportunities`

Similar CRUD with opportunity-specific stats.

#### Meetings — `/organizations/:orgId/meetings`

CRUD + participant management + action items.

#### Proposals — `/organizations/:orgId/proposals`

CRUD + sections + versions + approvals.

#### Contracts — `/organizations/:orgId/contracts`

CRUD + versions + approvals.

### Project Management — `/organizations/:orgId/projects`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/projects` | JWT | Create project |
| GET | `/projects` | JWT | List projects (filterable) |
| GET | `/projects/:id` | JWT | Get project with members, phases, milestones |
| PATCH | `/projects/:id` | JWT | Update project |
| DELETE | `/projects/:id` | JWT+MANAGER+ | Soft-delete |

#### Tasks — `/organizations/:orgId/projects/:projectId/tasks`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/tasks` | JWT | Create task |
| GET | `/tasks` | JWT | List tasks (Kanban stages, filterable) |
| GET | `/tasks/:id` | JWT | Get task with checklists, comments, attachments, dependencies |
| PATCH | `/tasks/:id` | JWT | Update task (stage, assignee, priority, etc.) |
| DELETE | `/tasks/:id` | JWT | Soft-delete |
| POST | `/tasks/:id/checklist` | JWT | Add checklist |
| POST | `/tasks/:id/checklist/:checklistId/items` | JWT | Add checklist item |
| PATCH | `/tasks/checklist-items/:itemId` | JWT | Toggle checklist item |
| DELETE | `/tasks/checklist-items/:itemId` | JWT | Remove checklist item |
| POST | `/tasks/:id/comments` | JWT | Add comment |
| POST | `/tasks/:id/attachments` | JWT | Upload attachment |

### AI Platform — all under `/organizations/:orgId/ai/`

#### AI Providers — `/organizations/:orgId/ai/providers`

| Method | Endpoint | Auth+Role | Purpose |
|--------|----------|-----------|---------|
| POST | `/providers` | JWT+ADMIN | Create provider (encrypted API key, auto-creates default models) |
| GET | `/providers` | JWT | List providers |
| GET | `/models` | JWT | List all enabled models across providers |
| GET | `/providers/:id` | JWT | Get provider details |
| PATCH | `/providers/:id` | JWT+ADMIN | Update provider |
| DELETE | `/providers/:id` | JWT+ADMIN | Soft-delete provider |
| POST | `/providers/:id/test` | JWT+ADMIN | Test connection |

#### AI Chat — `/organizations/:orgId/ai/chat`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/conversations` | JWT | Create conversation |
| GET | `/conversations` | JWT | List conversations |
| GET | `/conversations/:id` | JWT | Get conversation with messages |
| PATCH | `/conversations/:id` | JWT | Update conversation title |
| DELETE | `/conversations/:id` | JWT | Delete conversation |
| POST | `/conversations/:id/messages` | JWT | Send message (AI responds) |
| POST | `/conversations/:id/share` | JWT | Share conversation |
| POST | `/folders` | JWT | Create folder |
| GET | `/folders` | JWT | List folders |

#### AI Memory — `/organizations/:orgId/ai/memory`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/entries` | JWT | Store memory entry |
| GET | `/entries` | JWT | List memory entries |
| DELETE | `/entries/:id` | JWT | Delete memory |
| POST | `/categories` | JWT | Create memory category |
| GET | `/categories` | JWT | List categories |

#### AI Assistant — `/organizations/:orgId/ai/assistant`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/execute` | JWT | Execute assistant with failover |
| GET | `/sessions` | JWT | List sessions |
| POST | `/sessions` | JWT | Create session |
| GET | `/config` | JWT | Get assistant config |
| PATCH | `/config` | JWT+ADMIN | Update assistant config |

#### AI Tools — `/organizations/:orgId/ai/tools`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/tools` | JWT+ADMIN | Create tool definition |
| GET | `/tools` | JWT | List tools |
| GET | `/tools/:id` | JWT | Get tool with parameters |
| PATCH | `/tools/:id` | JWT+ADMIN | Update tool |
| DELETE | `/tools/:id` | JWT+ADMIN | Delete tool |
| POST | `/tools/:id/execute` | JWT | Execute tool |
| POST | `/categories` | JWT+ADMIN | Create category |

#### RAG — `/organizations/:orgId/ai/rag`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/indexes` | JWT+ADMIN | Create RAG index |
| GET | `/indexes` | JWT | List indexes |
| POST | `/indexes/:id/documents` | JWT+ADMIN | Index document |
| GET | `/indexes/:id/documents` | JWT | List indexed documents |
| POST | `/indexes/:id/search` | JWT | Search index |

#### AI Agents — `/organizations/:orgId/ai/agents`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/agents` | JWT+ADMIN | Create agent |
| GET | `/agents` | JWT | List agents |
| GET | `/agents/:id` | JWT | Get agent details |
| PATCH | `/agents/:id` | JWT+ADMIN | Update agent |
| DELETE | `/agents/:id` | JWT+ADMIN | Delete agent |
| POST | `/agents/:id/execute` | JWT | Execute agent |

### Knowledge Base — `/organizations/:orgId/knowledge`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/categories` | JWT | Create category |
| GET | `/categories` | JWT | List categories |
| GET | `/categories/:id` | JWT | Get category with articles |
| PATCH | `/categories/:id` | JWT | Update category |
| DELETE | `/categories/:id` | JWT+MANAGER+ | Delete category |
| POST | `/articles` | JWT | Create article |
| GET | `/articles` | JWT | List articles |
| GET | `/articles/:id` | JWT | Get article with revisions |
| PATCH | `/articles/:id` | JWT | Update article (creates revision) |
| DELETE | `/articles/:id` | JWT+MANAGER+ | Delete article |

### Workflows — `/organizations/:orgId/workflows`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/workflows` | JWT | Create workflow |
| GET | `/workflows` | JWT | List workflows |
| GET | `/workflows/:id` | JWT | Get workflow with trigger/conditions/actions |
| PATCH | `/workflows/:id` | JWT | Update workflow |
| DELETE | `/workflows/:id` | JWT+MANAGER+ | Delete workflow |
| POST | `/workflows/:id/execute` | JWT | Trigger workflow execution |

### Executive Dashboard — `/organizations/:orgId/executive-dashboard`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/` | JWT | Get dashboard with insights, metrics, alerts, predictions |
| POST | `/insights/generate` | JWT+ADMIN | Generate AI insights |
| POST | `/alerts/:id/resolve` | JWT+ADMIN | Resolve alert |

---

## 9. Business Modules

### CRM Suite

| Module | Status | Collections | Backend Services | Frontend Pages | Dependencies |
|--------|--------|------------|-----------------|----------------|-------------|
| **Companies** | Implemented | Company, CompanyTag, CompanyNote, CompanyActivity | CompaniesService, CompaniesController | crm/companies/* | ActivityModule |
| **Contacts** | Implemented | Contact, ContactTag, ContactNote, ContactActivity | ContactsService, ContactsController | crm/contacts/* | ActivityModule |
| **Leads** | Implemented | Lead, LeadTag, LeadNote, LeadActivity | LeadsService, LeadsController | crm/leads/* | ActivityModule |
| **Opportunities** | Implemented | Opportunity, OpportunityTag, OpportunityNote, OpportunityActivity | OpportunitiesService, OpportunitiesController | crm/opportunities/* | ActivityModule |
| **Meetings** | Implemented | Meeting, MeetingParticipant, MeetingNote, MeetingActionItem | MeetingsService, MeetingsController | crm/meetings/* | ActivityModule |
| **Proposals** | Implemented | Proposal, ProposalSection, ProposalVersion, ProposalApprovalLog, ProposalActivity | ProposalsService, ProposalsController | crm/proposals/* | ActivityModule |
| **Contracts** | Implemented | Contract, ContractVersion, ContractApproval, ContractActivity | ContractsService, ContractsController | crm/contracts/* | ActivityModule |
| **Clients** | Schema only | Client | (Not found in services) | Not found | — |

### Project Management

| Module | Status | Collections | Backend Services | Frontend Pages |
|--------|--------|------------|-----------------|----------------|
| **Projects** | Implemented | Project, ProjectMember, ProjectPhase, Milestone, ProjectActivity | ProjectsService, ProjectsController | projects/* |
| **Tasks** | Implemented | Task, TaskAssignee, TaskComment, TaskAttachment, TaskChecklist, TaskChecklistItem, TaskDependency | TasksService, TasksController | projects/[id]/tasks/* |
| **Time Tracking** | Implemented | TimeEntry, WorkSchedule | TimeTrackingService, TimeTrackingController | time-tracking/* |
| **Resource Management** | Implemented | ResourceAllocation | ResourceManagementService, ResourceManagementController | resources/* |

### Knowledge & Documents

| Module | Status | Collections | Backend Services | Frontend Pages |
|--------|--------|------------|-----------------|----------------|
| **Knowledge Base** | Implemented | KnowledgeCategory, KnowledgeArticle, KnowledgeRevision, KnowledgeComment, KnowledgeFavorite, KnowledgeAttachment | KnowledgeService, KnowledgeController | knowledge/* |
| **Documents** | Implemented | Folder, Document, DocumentVersion, DocumentComment, DocumentTag, FavoriteDocument | DocumentsService, DocumentsController | documents/* |

### Automation

| Module | Status | Collections | Backend Services | Frontend Pages |
|--------|--------|------------|-----------------|----------------|
| **Workflows** | Implemented | Workflow, WorkflowTrigger, WorkflowCondition, WorkflowAction, WorkflowExecution | WorkflowsService, WorkflowExecutionService, WorkflowsController | workflows/* |
| **Activity** | Implemented | UserActivity | ActivityService (no controller) | activity/* |
| **Notifications** | Partially | Notification, NotificationPreference | NotificationsService, NotificationsGateway (Socket.IO) | notifications/* |

### Organization & People

| Module | Status | Collections | Backend Services | Frontend Pages |
|--------|--------|------------|-----------------|----------------|
| **Organizations** | Implemented | Organization, OrganizationMember | OrganizationsService, OrganizationsController | onboarding/organization |
| **Workspaces** | Implemented | Workspace, WorkspaceMember | WorkspacesService, WorkspacesController | — |
| **Departments** | Implemented | Department | DepartmentsService, DepartmentsController | departments/* |
| **Teams** | Implemented | Team, TeamMember | TeamService, TeamController | teams/* |
| **Users** | Implemented | User | UsersService (no controller) | users/* |
| **Roles** | Implemented | CustomRole, RolePermission | RolesService, RolesController | roles/* |

---

## 10. AI Architecture

### Overview

The AI Platform is a comprehensive multi-provider, multi-agent system with 8 sub-modules:

```
                    ┌────────────────────┐
                    │   AI Assistant     │
                    │  (Central Agent)   │
                    └──────┬─────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                  ▼
┌────────────────┐ ┌────────────────┐ ┌──────────────────┐
│  AI Chat       │ │  AI Agents     │ │  Executive       │
│  (Conversation)│ │  (Specialized) │ │  Dashboard       │
└────────┬───────┘ └────────┬───────┘ └────────┬─────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────┐
│              AI Provider Factory Service              │
│  (Provider failover, retry logic, fallback response)  │
└──────┬──────────┬──────────┬──────────┬──────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
  ┌──────┐ ┌────────┐ ┌────────┐ ┌──────────┐
  │OpenAI│ │Anthropic│ │ Gemini │ │ DeepSeek │
  └──────┘ │ Claude │ └────────┘ └──────────┘
           └────────┘
  ┌──────────┐ ┌──────────┐
  │OpenRouter│ │  Ollama  │
  └──────────┘ └──────────┘

┌─────────────────────────────────────┐
│  Supporting Systems                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐ │
│  │RAG   │ │Memory│ │Tools │ │Prompt││
│  │Engine│ │System│ │System│ │ Lib │ │
│  └──────┘ └──────┘ └──────┘ └────┘ │
└─────────────────────────────────────┘
```

### AI Provider Adapters

| Provider | Adapter Class | Type | Default Model(s) | Pricing |
|----------|-------------|------|------------------|---------|
| **OpenAI** | `OpenAIAdapter` | Cloud API | gpt-4o, gpt-4o-mini, gpt-4-turbo | $0.0025/$0.01 per 1K |
| **Anthropic** | `ClaudeAdapter` | Cloud API | claude-3-5-sonnet, claude-3-haiku | $0.003/$0.015 per 1K |
| **Gemini** | `GeminiAdapter` | Cloud API | gemini-1.5-pro, gemini-1.5-flash | $0.00125/$0.005 per 1K |
| **DeepSeek** | `DeepSeekAdapter` | Cloud API | deepseek-chat, deepseek-coder | $0.00014/$0.00028 per 1K |
| **OpenRouter** | `OpenRouterAdapter` | Aggregator | auto, llama-3.1-70b | $0.0005/$0.0015 per 1K |
| **Ollama** | `OllamaAdapter` | Local | llama3, mistral | Free (local) |

### AI Execution Flow

1. Request comes to any AI module (chat, assistant, agent, etc.)
2. Module calls `AIProviderFactoryService.executeWithFailover(orgId, provider, model, options)`
3. Factory creates a failover sequence: primary → OpenAI → Anthropic → Gemini → DeepSeek → OpenRouter → Ollama
4. Each adapter attempts execution with 2 retries (500ms backoff)
5. If all providers fail or are not configured, returns structured fallback response
6. API keys are AES-256-GCM encrypted at rest via `AIEncryptionService`

### RAG Engine
- **Configuration**: Per-org indexes with configurable embedding model, chunk size, overlap
- **Ingestion**: Documents → chunks → embeddings stored in RAGEmbedding collection
- **Search**: Query → embed → vector similarity search → return ranked chunks
- **Integration**: RAG context injected into system prompt of every AI execution

### Memory System
- Three scopes: User-level, Workspace-level, Organization-level
- Categories for organization
- Injected into AI execution context as additional context

### Tool Calling
- Tools defined with JSON Schema parameters
- Role-based permissions restrict tool access
- Execution history logged per tool

### AI Agents Framework
- Specialized agents (Sales Agent, PM Agent, etc.)
- Each agent has: capabilities, knowledge scope, tool access, custom prompts
- Agents execute via the failover factory service

### Executive Dashboard
- AI-powered business intelligence
- Automated insight generation
- Metric tracking with trend analysis
- Predictive analytics with confidence ranges
- Alert system with severity levels

---

## 11. External Integrations

### AI Providers (6)
| Provider | Integration Type | Config Storage | Active |
|----------|-----------------|----------------|--------|
| OpenAI | REST API (fetch) | AIProvider model + env var | Yes |
| Anthropic | REST API (fetch) | AIProvider model + env var | Yes |
| Google Gemini | REST API (fetch) | AIProvider model + env var | Yes |
| DeepSeek | REST API (fetch) | AIProvider model + env var | Yes |
| OpenRouter | REST API (fetch) | AIProvider model + env var | Yes |
| Ollama | REST API (fetch, local) | AIProvider model + env var | Yes |

### Storage
- **MinIO** (docker-compose.yml) — S3-compatible object storage for file uploads (defined but actual integration not verified in code)
- **MongoDB Atlas** — Primary database via Prisma

### Email
- SMTP/password reset via console log (no email provider integrated; tokens are logged to console)

### Authentication
- **JWT** via @nestjs/jwt + passport-jwt (self-contained, no OAuth/SAML/SSO)

---

## 12. Current Progress

| Module | Completion | Status | Remaining Work | Known Issues |
|--------|-----------|--------|---------------|--------------|
| Auth | 95% | Implemented | Email verification flow, OAuth providers | Auto-create on login is insecure for production |
| Organizations | 90% | Implemented | Multi-tenant isolation hardening | Org-specific role guard is a TODO comment |
| Workspaces | 90% | Implemented | Workspace-level permission enforcement | — |
| Users | 80% | Implemented | Profile management (avatar, preferences) | No user controller for admin management |
| Departments | 80% | Implemented | Hierarchy management | — |
| Teams | 80% | Implemented | Team-level permissions | — |
| Roles | 70% | Implemented | UI for custom role creation | Backend service exists, frontend may be incomplete |
| Activity | 85% | Implemented | Advanced filtering | Service-only, no direct controller |
| Notifications | 60% | Partial | Real-time delivery via Socket.IO, preference UI | Socket.IO gateway exists but completeness unclear |
| Companies | 90% | Implemented | Bulk import/export | — |
| Contacts | 90% | Implemented | Bulk import/export | — |
| Leads | 85% | Implemented | Lead scoring, pipeline automation | — |
| Opportunities | 85% | Implemented | Win/loss analysis | — |
| Meetings | 80% | Implemented | Calendar integration | — |
| Proposals | 75% | Implemented | E-signature integration | — |
| Contracts | 75% | Implemented | E-signature integration | — |
| Clients | 20% | Schema only | Service layer, API, frontend | Only Prisma model exists |
| Projects | 85% | Implemented | Gantt chart view | — |
| Tasks | 85% | Implemented | Drag-drop Kanban, dependency graph | — |
| Time Tracking | 70% | Implemented | Reporting, approval workflow | WorkSchedule model defined but usage unclear |
| Resource Management | 60% | Partial | Capacity planning, utilization charts | Basic CRUD exists |
| Knowledge Base | 80% | Implemented | Rich text editor, article search | — |
| Documents | 70% | Implemented | File preview, version diff | Storage service exists but actual file storage not verified |
| Workflows | 60% | Partial | Visual workflow builder, triggers | Execution service exists, UI may be incomplete |
| Search | 30% | Partial | Global search across entities | Search module exists but endpoint not clearly defined |
| AI Providers | 85% | Implemented | Usage tracking, cost analytics | Connection test uses randomized latency |
| AI Chat | 80% | Implemented | Streaming responses, file uploads | — |
| AI Memory | 75% | Implemented | Memory consolidation | — |
| AI Assistant | 70% | Implemented | Custom instructions, tool integration | — |
| AI Tools | 70% | Implemented | Tool execution UI | — |
| RAG | 60% | Partial | Embedding providers, chunking strategies | Backend exists but frontend completeness unclear |
| AI Agents | 60% | Partial | Agent marketplace | Backend exists but frontend completeness unclear |
| Prompts | 70% | Implemented | Prompt testing playground | — |
| Executive Dashboard | 50% | Partial | AI insight generation | Data aggregation service exists, UI may be incomplete |
| Settings | 60% | Partial | Full org settings UI | Routes defined, but completeness varies |
| Middleware/Infra | 50% | Partial | Rate limiting, CSRF, compression | Basic CORS + cookie only |

---

## 13. Known Issues & Concerns

### Bugs
1. **Auth auto-creation**: Login auto-creates users if they don't exist (development convenience) — this is a security issue for production
2. **Connection test**: AI provider connection test uses `Math.random()` for latency instead of actual measurement
3. **Prisma MongoDB compatibility**: Multiple schema fix scripts required (`fix_mongodb_schema.js`, `update_schema.js`) to patch the schema for MongoDB — suggests the schema was initially designed for SQLite/PostgreSQL
4. **SQLite + MongoDB dual setup**: The database package has both a Prisma schema targeting MongoDB AND a `setup_db.js` script targeting SQLite — this creates confusion about which database is actually in use

### Missing Features
1. **No email provider** — password reset tokens are logged to console only
2. **No file storage integration** — MinIO is defined in docker-compose but actual upload integration not verified
3. **No OAuth/SSO** — only email/password auth
4. **No rate limiting** — API is unprotected against abuse
5. **No CSRF protection**
6. **No tests found** — no test files detected in the repository
7. **No CI/CD configuration**
8. **No Dockerfile for the application** — only docker-compose with infrastructure services

### Technical Debt
1. **Any types used extensively** — controllers use `@Body() body: any` instead of DTOs in many modules
2. **Prisma type casting** — `(this.prisma as any).aIProvider...` pattern used repeatedly in AI modules
3. **Mixed DB approach** — Prisma schema + raw SQLite scripts for the same data
4. **No pagination defaults** — some list endpoints lack pagination
5. **Console logging** — `console.warn` and `console.log` used instead of proper Logger in some places (e.g., auth.service.ts)
6. **Hardcoded secrets in code** — `super-secret-key-for-development` JWT secret and `blackdesk-enterprise-ai-secret-key-2026` encryption key in source

### Security Concerns
1. **MongoDB credentials in .env** — committed to repository with real credentials
2. **JWT secret fallback in code** — hardcoded fallback value
3. **Encryption secret fallback in code** — hardcoded fallback in AIEncryptionService
4. **CORS with origin: true** — allows any origin in all environments
5. **Auto-create users on login** — could allow account enumeration and unauthorized access
6. **No input rate limiting** — login endpoints are vulnerable to brute force

### Performance Concerns
1. **No indexing strategy documented** — MongoDB indexes not explicitly managed in schema
2. **No query optimization** — N+1 queries possible with Prisma's include patterns
3. **No caching layer** — Redis or similar not implemented
4. **AI failover sequential** — provider failover tests each provider sequentially (no parallel execution)

---

## 14. Architecture Review & Recommendations

### Strengths
- **Well-modularized** — 33 clearly separated NestJS modules with consistent patterns
- **Comprehensive data model** — 124 Prisma models covering all business domains
- **Multi-provider AI architecture** — well-designed adapter pattern with failover
- **Monorepo efficiency** — Turborepo + pnpm workspace for shared packages
- **Feature-rich frontend** — extensive page coverage with responsive layouts

### Recommendations

#### Critical (Production Readiness)
1. **Remove hardcoded secrets** — Move JWT secret, encryption key, and MongoDB credentials to environment variables only with no code fallbacks
2. **Add rate limiting** — Implement `@nestjs/throttler` or similar for auth endpoints
3. **Implement email service** — Replace console.log password reset with actual email provider (SendGrid, SES, etc.)
4. **Remove auto-create on login** — Separate registration from login
5. **Add database indexes** — Define proper MongoDB indexes in Prisma schema for query performance
6. **CORS hardening** — Restrict to specific frontend origin in production

#### High Priority
7. **Add test suite** — Unit + integration tests (Jest is available via NestJS)
8. **Replace `any` types** — Add proper DTOs with class-validator to all controllers
9. **Unify database strategy** — Choose MongoDB or SQLite, not both with migration scripts
10. **Add CSRF protection** — Especially for cookie-based auth
11. **Implement file storage** — Connect MinIO or S3 for document uploads

#### Medium Priority
12. **Add proper logging** — Replace console.x with NestJS Logger throughout
13. **Implement search** — Complete the search module with full-text indexing
14. **Add caching** — Redis for session cache, AI response cache, query cache
15. **Complete client module** — Service + API + frontend for Client conversion
16. **Add pagination defaults** — Consistent pagination across all list endpoints
17. **Audit logging** — Ensure all sensitive operations are logged

#### Low Priority
18. **Add WebSocket monitoring** — Complete Socket.IO gateway for real-time notifications
19. **Implement AI streaming** — Add `executeStream` to provider adapters for real-time chat
20. **Add bulk operations** — Import/export for CRM entities
21. **Build workflow visual editor** — Drag-and-drop workflow builder UI
22. **Add webhook support** — External integration webhooks for workflow automation
23. **Document API** — Add Swagger/OpenAPI decorators to all controllers

---

## 15. File Reference Index

| File | Path | Purpose |
|------|------|---------|
| Root config | `package.json` | Workspace root, scripts, devDependencies |
| Workspace config | `pnpm-workspace.yaml` | Declares apps/* and packages/* |
| Build pipeline | `turbo.json` | Turborepo task configuration |
| Docker services | `docker-compose.yml` | PostgreSQL + MinIO (legacy) |
| Environment | `.env` | MongoDB URL, JWT secret, PORT, FRONTEND_URL |
| Backend entry | `apps/backend/src/main.ts` | Bootstrap, CORS, cookie-parser, auto-seed |
| Backend module | `apps/backend/src/app.module.ts` | Imports all 33 feature modules |
| Prisma client | `packages/database/index.ts` | Re-exports @prisma/client |
| DB schema | `packages/database/prisma/schema.prisma` | 124 MongoDB models |
| Role constants | `apps/backend/src/common/roles.ts` | Role enum |
| Prisma service | `apps/backend/src/core/prisma/prisma.service.ts` | PrismaClient wrapper |
| Frontend entry | `apps/frontend/src/app/layout.tsx` | Root layout |
| Middleware | `apps/frontend/src/middleware.ts` | Route protection |
| API client | `apps/frontend/src/lib/api.ts` | HTTP client with refresh logic |
| Frontend config | `apps/frontend/next.config.mjs` | API proxy rewrite |

---

*Document generated from codebase analysis. All statements are based on actual source code inspection.*
