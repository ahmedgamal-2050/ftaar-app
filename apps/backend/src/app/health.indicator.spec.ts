import { Test } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';
import { PrismaHealthIndicator } from './health.indicator';

describe('PrismaHealthIndicator', () => {
  it('reports down when Prisma is missing', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule],
      providers: [PrismaHealthIndicator],
    }).compile();
    const indicator = moduleRef.get(PrismaHealthIndicator);
    const result = await indicator.ping();
    expect(result['database']?.['status']).toBe('down');
  });

  it('reports down when Postgres is unreachable', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule],
      providers: [
        PrismaHealthIndicator,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const indicator = moduleRef.get(PrismaHealthIndicator);
    const result = await indicator.ping();
    expect(result['database']?.['status']).toBe('down');
  });

  it('reports up when Postgres answers', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule],
      providers: [
        PrismaHealthIndicator,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const indicator = moduleRef.get(PrismaHealthIndicator);
    await expect(indicator.ping()).resolves.toEqual({
      database: { status: 'up' },
    });
  });
});
