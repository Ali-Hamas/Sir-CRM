import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MetricsCollectorService } from './metrics-collector.service';

@Injectable()
export class ReportGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsCollector: MetricsCollectorService,
  ) {}

  async getReports(organizationId: string) {
    return this.prisma.analyticsReport.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReportById(organizationId: string, reportId: string) {
    const report = await this.prisma.analyticsReport.findFirst({
      where: { id: reportId, organizationId },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async generateReport(organizationId: string, userId: string, params: { title?: string; type: string; format?: string }) {
    const metrics = await this.metricsCollector.collectAllMetrics(organizationId);

    const typeName = params.type || 'EXECUTIVE_SUMMARY';
    const reportTitle = params.title || `${typeName.replace('_', ' ')} - ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

    const sections = [
      {
        sectionTitle: 'Executive Summary',
        content: `Organization Health Score is currently at ${metrics.overview.healthScore}/100 with an AI Confidence Index of ${metrics.overview.aiConfidenceScore}%. Total active entities managed: ${metrics.overview.totalEntitiesCount}.`,
      },
      {
        sectionTitle: 'CRM & Sales Performance',
        content: `Sales pipeline value stands at $${metrics.crm.salesPipelineValue.toLocaleString()} across ${metrics.crm.totalOpportunities} active opportunities. Win rate is ${metrics.crm.opportunityWinRate}% with lead conversion at ${metrics.crm.leadConversionRate}%.`,
      },
      {
        sectionTitle: 'Projects & Resource Velocity',
        content: `Active projects: ${metrics.projects.activeProjects} / ${metrics.projects.totalProjects}. Task completion rate is ${metrics.projects.taskCompletionRate}% with ${metrics.projects.totalHoursTracked} total hours tracked and ${metrics.projects.resourceUtilizationPercent}% team capacity utilization.`,
      },
      {
        sectionTitle: 'Automation & AI Impact',
        content: `Workflow success rate is ${metrics.workflowsAndProcesses.workflowSuccessRate}%, generating an estimated ${metrics.workflowsAndProcesses.automationSavingsHours} hours of automation time savings. Total AI executions: ${metrics.aiUsage.totalAiExecutions} with ${metrics.aiUsage.totalTokensConsumed.toLocaleString()} tokens consumed.`,
      },
    ];

    const report = await this.prisma.analyticsReport.create({
      data: {
        organizationId,
        title: reportTitle,
        type: typeName,
        status: 'GENERATED',
        summaryText: `Comprehensive ${typeName} performance report generated for organization ${organizationId}. Health Score: ${metrics.overview.healthScore}%.`,
        sectionsJson: JSON.stringify(sections),
        metricsJson: JSON.stringify(metrics),
        format: params.format || 'JSON',
        createdById: userId,
      },
    });

    return report;
  }

  async exportReportFormat(organizationId: string, reportId: string, format: 'JSON' | 'CSV' | 'HTML') {
    const report = await this.getReportById(organizationId, reportId);
    const sections = JSON.parse(report.sectionsJson || '[]');
    const metrics = JSON.parse(report.metricsJson || '{}');

    if (format === 'CSV') {
      let csv = `Report Title,${report.title}\nType,${report.type}\nCreated At,${report.createdAt}\n\n`;
      csv += `Section,Content\n`;
      sections.forEach((s: any) => {
        csv += `"${s.sectionTitle}","${s.content.replace(/"/g, '""')}"\n`;
      });
      return { format: 'CSV', filename: `${report.title.toLowerCase().replace(/\s+/g, '-')}.csv`, content: csv };
    }

    if (format === 'HTML') {
      let html = `<!DOCTYPE html><html><head><title>${report.title}</title><style>body{font-family:sans-serif;padding:20px;color:#1e293b;} h1{color:#0f172a;} .section{margin-bottom:20px;padding:15px;background:#f8fafc;border-left:4px solid #3b82f6;border-radius:4px;}</style></head><body>`;
      html += `<h1>${report.title}</h1><p><strong>Generated:</strong> ${new Date(report.createdAt).toLocaleString()}</p>`;
      html += `<div style="background:#e0f2fe;padding:12px;border-radius:6px;margin-bottom:20px;"><p>${report.summaryText}</p></div>`;
      sections.forEach((s: any) => {
        html += `<div class="section"><h2>${s.sectionTitle}</h2><p>${s.content}</p></div>`;
      });
      html += `</body></html>`;
      return { format: 'HTML', filename: `${report.title.toLowerCase().replace(/\s+/g, '-')}.html`, content: html };
    }

    return { format: 'JSON', filename: `${report.title.toLowerCase().replace(/\s+/g, '-')}.json`, content: JSON.stringify(report, null, 2) };
  }
}
