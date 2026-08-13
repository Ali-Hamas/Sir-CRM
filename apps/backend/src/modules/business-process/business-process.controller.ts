import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BusinessProcessService } from './business-process.service';
import { BusinessProcessExecutorService } from './business-process-executor.service';
import { BusinessProcessApprovalService } from './business-process-approval.service';
import { BusinessProcessSchedulerService } from './business-process-scheduler.service';
import { BusinessProcessAuditService } from './business-process-audit.service';
import { CreateBusinessProcessDto } from './dto/create-business-process.dto';
import { UpdateBusinessProcessDto } from './dto/update-business-process.dto';
import { ExecuteBusinessProcessDto } from './dto/execute-business-process.dto';
import { ApprovalDecisionDto } from './dto/approval-decision.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/business-processes')
export class BusinessProcessController {
  constructor(
    private readonly processService: BusinessProcessService,
    private readonly executorService: BusinessProcessExecutorService,
    private readonly approvalService: BusinessProcessApprovalService,
    private readonly schedulerService: BusinessProcessSchedulerService,
    private readonly auditService: BusinessProcessAuditService,
  ) {}

  @Get('stats')
  getStats(@Param('orgId') orgId: string) {
    return this.processService.getStats(orgId);
  }

  @Post()
  create(@Param('orgId') orgId: string, @Body() dto: CreateBusinessProcessDto) {
    return this.processService.create(orgId, dto);
  }

  @Get()
  findAll(
    @Param('orgId') orgId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    return this.processService.findAll(orgId, category, status, limit ? Number(limit) : 20, skip ? Number(skip) : 0);
  }

  @Get(':id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.processService.findOne(orgId, id);
  }

  @Patch(':id')
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdateBusinessProcessDto) {
    return this.processService.update(orgId, id, dto);
  }

  @Delete(':id')
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.processService.remove(orgId, id);
  }

  @Post(':id/execute')
  execute(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ExecuteBusinessProcessDto,
  ) {
    return this.executorService.execute(orgId, id, req.user.id, dto.inputData, dto.trigger || 'MANUAL');
  }

  @Post(':id/pause')
  pauseExecution(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.executorService.pause(id, orgId);
  }

  @Post(':id/resume')
  resumeExecution(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.executorService.resume(id, orgId);
  }

  @Post(':id/cancel')
  cancelExecution(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.executorService.cancel(id, orgId);
  }

  @Post(':id/retry')
  retryExecution(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.executorService.retry(id, orgId);
  }

  @Get('executions/all')
  findAllExecutions(
    @Param('orgId') orgId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    return this.executorService['prisma'].businessProcessExecution.findMany({
      where: { organizationId: orgId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit ? Number(limit) : 20,
      skip: skip ? Number(skip) : 0,
      include: {
        process: { select: { id: true, name: true, icon: true, color: true } },
        _count: { select: { steps: true, approvals: true } },
      },
    });
  }

  @Get('executions/:executionId')
  getExecution(
    @Param('orgId') orgId: string,
    @Param('executionId') executionId: string,
  ): Promise<any> {
    return this.executorService['prisma'].businessProcessExecution.findFirst({
      where: { id: executionId, organizationId: orgId },
      include: {
        process: true,
        steps: { orderBy: { stepOrder: 'asc' } },
        approvals: {
          include: {
            assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
            decidedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        audits: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  @Get(':id/executions')
  getProcessExecutions(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    return this.executorService['prisma'].businessProcessExecution.findMany({
      where: { organizationId: orgId, processId: id },
      orderBy: { createdAt: 'desc' },
      take: limit ? Number(limit) : 20,
      skip: skip ? Number(skip) : 0,
      include: {
        _count: { select: { steps: true, approvals: true } },
      },
    });
  }

  @Get(':id/executions/:executionId/audit')
  getExecutionAudit(
    @Param('orgId') orgId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.auditService.findByExecution(executionId);
  }

  @Get('approvals/pending')
  getPendingApprovals(@Param('orgId') orgId: string) {
    return this.approvalService.findPendingByOrganization(orgId);
  }

  @Patch('approvals/:approvalId/decide')
  decideApproval(
    @Param('approvalId') approvalId: string,
    @Req() req: any,
    @Body() dto: ApprovalDecisionDto,
  ) {
    return this.approvalService.decide(approvalId, req.user.id, dto.status, dto.comment);
  }

  @Post('schedules')
  createSchedule(@Param('orgId') orgId: string, @Body() dto: CreateScheduleDto, @Req() req: any) {
    return this.schedulerService.create({ ...dto, organizationId: orgId, createdBy: req.user.id });
  }

  @Get('schedules')
  getSchedules(@Param('orgId') orgId: string) {
    return this.schedulerService.findByOrganization(orgId);
  }

  @Patch('schedules/:scheduleId')
  updateSchedule(@Param('scheduleId') scheduleId: string, @Body() dto: CreateScheduleDto) {
    return this.schedulerService.update(scheduleId, dto);
  }

  @Delete('schedules/:scheduleId')
  removeSchedule(@Param('scheduleId') scheduleId: string) {
    return this.schedulerService.remove(scheduleId);
  }

  @Get(':id/audit')
  getProcessAudit(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    return this.auditService.findByProcess(orgId, id, limit ? Number(limit) : 50, skip ? Number(skip) : 0);
  }
}
