import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(@Res() res: any) {
    const health = await this.healthService.checkHealth();
    const status = health.status === 'HEALTHY' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(health);
  }

  @Get('readiness')
  async getReadiness(@Res() res: any) {
    const readiness = await this.healthService.checkReadiness();
    const status = readiness.ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(readiness);
  }

  @Get('liveness')
  getLiveness() {
    return this.healthService.checkLiveness();
  }

  @Get('diagnostics')
  getDiagnostics() {
    return this.healthService.getDiagnostics();
  }
}
