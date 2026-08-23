import axios from 'axios';

describe('API', () => {
  it('GET /api returns a message', async () => {
    const res = await axios.get(`/api`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      success: true,
      data: { message: 'Hello API' },
    });
  });

  it('GET /health is public liveness', async () => {
    const res = await axios.get(`/health`);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.status).toBe('ok');
  });

  it('GET /health/db is public readiness', async () => {
    const res = await axios.get(`/health/db`);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.status).toBe('ok');
  });
});
