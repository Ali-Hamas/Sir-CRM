import { Module } from '@nestjs/common';
import { BusinessProcessController } from './business-process.controller';
import { BusinessProcessService } from './business-process.service';
import { BusinessProcessExecutorService } from './business-process-executor.service';
import { BusinessProcessPlannerService } from './business-process-planner.service';
import { BusinessProcessSchedulerService } from './business-process-scheduler.service';
import { BusinessProcessApprovalService } from './business-process-approval.service';
import { BusinessProcessAuditService } from './business-process-audit.service';

@Module({
  controllers: [BusinessProcessController],
  providers: [
    BusinessProcessService,
    BusinessProcessExecutorService,
    BusinessProcessPlannerService,
    BusinessProcessSchedulerService,
    BusinessProcessApprovalService,
    BusinessProcessAuditService,
  ],
  exports: [
    BusinessProcessService,
    BusinessProcessExecutorService,
    BusinessProcessPlannerService,
    BusinessProcessSchedulerService,
    BusinessProcessApprovalService,
    BusinessProcessAuditService,
  ],
})
export class BusinessProcessModule {}
