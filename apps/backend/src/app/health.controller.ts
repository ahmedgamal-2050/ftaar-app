import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaHealthIndicator } from './health.indicator';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe (no database)' })
  liveness() {
    return this.health.check([
      () => ({ api: { status: 'up', uptime: process.uptime() } }),
    ]);
  }

  @Get('db')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe (Postgres)' })
  readiness() {
    return this.health.check([() => this.prismaHealth.ping('database')]);
  }
}
