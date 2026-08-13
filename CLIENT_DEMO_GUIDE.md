# BlackDesk OS — Client Presentation & Demo Guide (v1.0 Production)

Welcome to the **BlackDesk OS Client Presentation Guide**. This document provides executive walkthrough instructions, demo account credentials, sample dataset descriptions, and feature presentation scenarios for delivering a live demonstration of BlackDesk OS v1.0.

---

## 🔑 1. Demo Credentials & Access Points

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin / Executive** | `admin@blackdesk.com` | `password123` | Full enterprise control, system settings, executive dashboard, AI orchestrator, analytics, security audit logs |
| **Client Representative** | `client@blackdesk.com` | `password123` | Client portal, project tracking, shared document center, proposal/contract review, activity feed |

- **Frontend URL**: `http://localhost:3000` (or `http://127.0.0.1:3000`)
- **Backend API Base**: `http://localhost:3001`
- **Default Organization**: `blackdesk-corp` (BlackDesk Enterprise AI Corp)
- **Default Workspace**: `ws-global-ops` (Global Operations Workspace)

---

## 🚀 2. Live Demo Script & Feature Walkthrough

### Scenario A: Executive Overview & Organization Setup (5 mins)
1. **Login & Authentication**:
   - Navigate to `http://localhost:3000/auth/login`.
   - Log in with `admin@blackdesk.com` / `password123`.
   - Highlight the seamless JWT + `HttpOnly` secure cookie session management.
2. **Executive Dashboard**:
   - Navigate to `http://localhost:3000/blackdesk-corp/executive`.
   - Demonstrate real-time enterprise metrics: Active CRM Revenue ($250,000 SLA), Active Projects, Resource Utilization, and System Anomaly Detection.

### Scenario B: Full CRM Pipeline & Client Onboarding (10 mins)
1. **CRM Pipeline Overview**:
   - Navigate to `http://localhost:3000/blackdesk-corp/crm`.
   - Showcase the 7-stage enterprise sales cycle:
     - **Lead**: *Acme Lead* (Qualified Inbound Lead, $250,000 estimated value).
     - **Company**: *Acme Enterprise Global* (Financial Tech Industry).
     - **Contact**: *Alexander Wright* (Chief Technology Officer).
     - **Opportunity**: *Acme Global - BlackDesk OS Enterprise Licensing* (Proposal Sent Stage, 85% Win Probability).
     - **Meeting**: *Enterprise Architecture & Security Review* (Completed status).
     - **Proposal**: *PROP-2026-001 - BlackDesk OS v1.0 Enterprise SLA & Deployment Plan* ($250,000 total value).
     - **Contract**: *CNT-2026-001 - Master Services Agreement* (Active status).

### Scenario C: Project Management & Resource Tracking (7 mins)
1. **Projects & Milestones**:
   - Navigate to `http://localhost:3000/blackdesk-corp/projects`.
   - Open *Enterprise Client Onboarding & Delivery* (`PRJ-BD-001`).
   - View *Milestone 1: Production Audit & Verification* and the associated task *Execute End-to-End Workflow Verification*.
2. **Time Tracking & Resource Management**:
   - Showcase billable time entries (8.0 hours logged by Executive Admin for QA and security profiling).

### Scenario D: Enterprise AI Suite & Autonomous Orchestrator (8 mins)
1. **AI Chat & Prompt Library**:
   - Navigate to `http://localhost:3000/blackdesk-corp/ai/chat`.
   - Showcase conversational assistant integrated with prompt templates and long-term enterprise memory.
2. **AI Agents & Orchestrator**:
   - Navigate to `http://localhost:3000/blackdesk-corp/ai/orchestrator`.
   - Demonstrate multi-agent tool execution (RAG search, document indexing, workflow auto-triggering).

---

## 🛡️ 3. Security & Governance Highlights for Enterprise Clients
- **Database**: MongoDB only (via Prisma ORM configured for MongoDB).
- **Authentication**: JWT + HttpOnly Cookies with CSRF/CORS protection.
- **Authorization**: Granular Role-Based Access Control (RBAC) guards.
- **Audit Logging**: Comprehensive activity audit logging across all enterprise actions.

---

## 📊 4. Post-Demo Presentation Q&A Points
- **Is BlackDesk OS ready for multi-tenant cloud or on-premise deployment?**  
  *Yes. Complete Docker Compose configurations and Nginx reverse-proxy SSL templates are included out of the box.*
- **Can we customize AI providers?**  
  *Yes. BlackDesk OS supports multi-provider LLM registration (OpenAI, Anthropic, Azure OpenAI, custom local endpoints) via the Integration Hub.*
