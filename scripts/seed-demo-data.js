/**
 * BlackDesk OS - Enterprise Client Demo Seeder
 * Populates MongoDB with realistic enterprise demo data across all 29+ modules.
 */

const { PrismaClient } = require('../packages/database');
const bcrypt = require('../apps/backend/node_modules/bcrypt');

const prisma = new PrismaClient();

async function seedDemoData() {
  console.log('===========================================================');
  console.log(' BLACKDESK OS — CLIENT DEMO SEEDER');
  console.log('===========================================================');

  try {
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Seed Enterprise Users
    console.log('[1/6] Seeding Users...');
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@blackdesk.com' },
      update: {},
      create: {
        email: 'admin@blackdesk.com',
        passwordHash: hashedPassword,
        firstName: 'Executive',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        isEmailVerified: true,
        isActive: true,
      },
    });

    const demoClient = await prisma.user.upsert({
      where: { email: 'client@blackdesk.com' },
      update: {},
      create: {
        email: 'client@blackdesk.com',
        passwordHash: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Connor',
        role: 'CLIENT',
        isEmailVerified: true,
        isActive: true,
      },
    });

    console.log(`  ✓ Super Admin: ${adminUser.email}`);
    console.log(`  ✓ Client Demo: ${demoClient.email}`);

    // 2. Seed Organization & Workspace
    console.log('[2/6] Seeding Organization & Workspace...');
    const org = await prisma.organization.upsert({
      where: { slug: 'blackdesk-corp' },
      update: {},
      create: {
        name: 'BlackDesk Enterprise AI Corp',
        slug: 'blackdesk-corp',
        industry: 'Enterprise Software & AI',
      },
    });

    const workspace = await prisma.workspace.upsert({
      where: { id: 'ws-global-ops' },
      update: {},
      create: {
        id: 'ws-global-ops',
        name: 'Global Operations Workspace',
        organizationId: org.id,
        description: 'Main production workspace for enterprise workflows and AI agents.',
      },
    });

    console.log(`  ✓ Organization: ${org.name} (${org.slug})`);
    console.log(`  ✓ Workspace: ${workspace.name} (${workspace.id})`);

    // 3. Seed CRM Pipeline
    console.log('[3/6] Seeding CRM Pipeline...');
    const company = await prisma.company.create({
      data: {
        name: 'Acme Enterprise Global',
        industry: 'Financial Technology',
        organizationId: org.id,
        workspaceId: workspace.id,
        createdById: adminUser.id,
      },
    });

    const contact = await prisma.contact.create({
      data: {
        firstName: 'Alexander',
        lastName: 'Wright',
        email: 'alexander.wright@acme-global.com',
        phone: '+1 (555) 234-5678',
        jobTitle: 'Chief Technology Officer',
        companyId: company.id,
        organizationId: org.id,
        workspaceId: workspace.id,
        createdById: adminUser.id,
      },
    });

    const lead = await prisma.lead.create({
      data: {
        firstName: 'Acme',
        lastName: 'Lead',
        companyName: 'Acme Enterprise Global',
        source: 'INBOUND_WEB',
        status: 'QUALIFIED',
        estimatedValue: 250000,
        organizationId: org.id,
        workspaceId: workspace.id,
        createdById: adminUser.id,
      },
    });

    const opportunity = await prisma.opportunity.create({
      data: {
        name: 'Acme Global - BlackDesk OS Enterprise Licensing',
        estimatedValue: 250000,
        stage: 'PROPOSAL_SENT',
        probability: 85,
        companyId: company.id,
        contactId: contact.id,
        organizationId: org.id,
        workspaceId: workspace.id,
        createdById: adminUser.id,
      },
    });

    const meeting = await prisma.meeting.create({
      data: {
        title: 'Enterprise Architecture & Security Review',
        date: new Date(),
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        status: 'COMPLETED',
        organizationId: org.id,
        workspaceId: workspace.id,
        createdById: adminUser.id,
      },
    });

    const proposal = await prisma.proposal.create({
      data: {
        proposalNumber: 'PROP-2026-001',
        title: 'BlackDesk OS v1.0 Enterprise SLA & Deployment Plan',
        totalValue: 250000,
        status: 'SENT',
        companyId: company.id,
        contactId: contact.id,
        opportunityId: opportunity.id,
        organizationId: org.id,
        workspaceId: workspace.id,
        createdById: adminUser.id,
      },
    });

    const contract = await prisma.contract.create({
      data: {
        contractNumber: 'CNT-2026-001',
        title: 'Master Services Agreement - BlackDesk OS',
        contractValue: 250000,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        companyId: company.id,
        opportunityId: opportunity.id,
        organizationId: org.id,
        workspaceId: workspace.id,
        createdById: adminUser.id,
      },
    });

    console.log(`  ✓ CRM Lead: ${lead.firstName} ${lead.lastName}`);
    console.log(`  ✓ CRM Company: ${company.name}`);
    console.log(`  ✓ CRM Contact: ${contact.firstName} ${contact.lastName}`);
    console.log(`  ✓ CRM Opportunity: ${opportunity.name}`);
    console.log(`  ✓ CRM Meeting: ${meeting.title}`);
    console.log(`  ✓ CRM Proposal: ${proposal.title}`);
    console.log(`  ✓ CRM Contract: ${contract.title}`);

    // 4. Seed Projects & Tasks
    console.log('[4/6] Seeding Projects & Tasks...');
    const project = await prisma.project.create({
      data: {
        projectName: 'Enterprise Client Onboarding & Delivery',
        projectCode: 'PRJ-BD-001',
        description: 'Production rollout of BlackDesk OS v1.0 for client delivery.',
        status: 'IN_PROGRESS',
        organizationId: org.id,
        workspaceId: workspace.id,
        createdById: adminUser.id,
      },
    });

    const milestone = await prisma.milestone.create({
      data: {
        title: 'Milestone 1: Production Audit & Verification',
        description: 'Complete audit of backend APIs, Next.js UI, and MongoDB setup.',
        dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        status: 'COMPLETED',
        projectId: project.id,
      },
    });

    const task = await prisma.task.create({
      data: {
        title: 'Execute End-to-End Workflow Verification',
        description: 'Verify CRM, Project, and AI workflows end-to-end.',
        status: 'COMPLETED',
        priority: 'HIGH',
        projectId: project.id,
        milestoneId: milestone.id,
        reporterId: adminUser.id,
        organizationId: org.id,
        createdById: adminUser.id,
      },
    });

    const timeEntry = await prisma.timeEntry.create({
      data: {
        description: 'Full QA audit, security verification, and performance profiling.',
        date: new Date(),
        duration: 8.0,
        billable: true,
        userId: adminUser.id,
        taskId: task.id,
        projectId: project.id,
        organizationId: org.id,
        createdById: adminUser.id,
      },
    });

    console.log(`  ✓ Project: ${project.projectName}`);
    console.log(`  ✓ Milestone: ${milestone.title}`);
    console.log(`  ✓ Task: ${task.title}`);
    console.log(`  ✓ Time Entry: ${timeEntry.duration} hours logged`);

    // 5. Seed System Activity Log
    console.log('[5/6] Seeding Activity Log...');
    await prisma.userActivity.create({
      data: {
        action: 'SYSTEM_AUDIT_COMPLETED',
        module: 'HEALTH_MODULE',
        metadata: 'Enterprise QA Sprint Day 11 Audit passed with 100% score.',
        userId: adminUser.id,
        organizationId: org.id,
      },
    });

    console.log('  ✓ System Activity Log created.');

    console.log('\n===========================================================');
    console.log(' CLIENT DEMO SEEDING COMPLETED SUCCESSFULLY!');
    console.log('===========================================================');
  } catch (error) {
    console.error('Error during demo seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoData();
