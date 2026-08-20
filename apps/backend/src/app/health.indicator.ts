import { Injectable, Optional } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async ping(key = 'database') {
    const indicator = this.healthIndicatorService.check(key);
    if (!this.prisma) {
      return indicator.down({ message: 'Prisma is not configured' });
    }
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return indicator.up();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unreachable';
      return indicator.down({ message });
    }
  }
}
