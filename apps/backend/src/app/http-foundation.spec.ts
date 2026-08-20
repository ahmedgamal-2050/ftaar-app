import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { setupApp } from '../core/setup-app';

describe('HTTP foundation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
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
      .post('/api/todos')
      .send({ title: 'ok', extra: true })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('does not wrap 204 responses', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/todos')
      .send({ title: 'to delete' })
      .expect(201);
    const id = created.body.data.id as number;
    const res = await request(app.getHttpServer())
      .delete(`/api/todos/${id}`)
      .expect(204);
    expect(res.body).toEqual({});
  });
});
