import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class WidgetService {
  constructor(private readonly prisma: PrismaService) {}

  async getWidgets(dashboardId: string) {
    return this.prisma.analyticsWidget.findMany({
      where: { dashboardId },
      orderBy: { positionY: 'asc' },
    });
  }

  async createWidget(dashboardId: string, data: any) {
    const dashboard = await this.prisma.analyticsDashboard.findUnique({
      where: { id: dashboardId },
    });
    if (!dashboard) throw new NotFoundException('Dashboard not found');

    return this.prisma.analyticsWidget.create({
      data: {
        dashboardId,
        title: data.title,
        type: data.type || 'METRIC_CARD',
        metricKey: data.metricKey || null,
        datasetId: data.datasetId || null,
        config: data.config ? (typeof data.config === 'string' ? data.config : JSON.stringify(data.config)) : null,
        positionX: data.positionX ?? 0,
        positionY: data.positionY ?? 0,
        width: data.width ?? 4,
        height: data.height ?? 3,
      },
    });
  }

  async updateWidget(id: string, data: any) {
    const widget = await this.prisma.analyticsWidget.findUnique({ where: { id } });
    if (!widget) throw new NotFoundException('Widget not found');

    return this.prisma.analyticsWidget.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        metricKey: data.metricKey,
        datasetId: data.datasetId,
        config: data.config ? (typeof data.config === 'string' ? data.config : JSON.stringify(data.config)) : undefined,
        positionX: data.positionX,
        positionY: data.positionY,
        width: data.width,
        height: data.height,
      },
    });
  }

  async deleteWidget(id: string) {
    const widget = await this.prisma.analyticsWidget.findUnique({ where: { id } });
    if (!widget) throw new NotFoundException('Widget not found');

    return this.prisma.analyticsWidget.delete({ where: { id } });
  }
}
