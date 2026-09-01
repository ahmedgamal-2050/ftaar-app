import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { AppConfigService } from '../core/config/app-config.service';
import { setupApp } from '../core/setup-app';

describe('HTTP foundation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    setupApp(app, app.get(AppConfigService));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('wraps success bodies', async () => {
    const res = await request(app.getHttpServer()).get('/api').expect(200);
    expect(res.body).toEqual({
      success: true,
      data: { message: 'Hello API' },
    });
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('rejects unexpected body fields with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Str0ng!Pass', extra: true })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('exposes public liveness at /health', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
  });

  it('fails readiness at /health/db when Postgres is not wired', async () => {
    await request(app.getHttpServer()).get('/health/db').expect(503);
  });
});
