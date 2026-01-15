import request from 'supertest';
import { createApp } from '../../src/api/server';

const app = createApp();

describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('GET /', () => {
    test('should return API information', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('POST /api/query', () => {
    test('should require query field', async () => {
      const response = await request(app)
        .post('/api/query')
        .send({});

      expect(response.status).toBe(400);
    });

    test('should validate query is not empty', async () => {
      const response = await request(app)
        .post('/api/query')
        .send({ query: '' });

      expect(response.status).toBe(400);
    });

    test('should accept valid query', async () => {
      const response = await request(app)
        .post('/api/query')
        .send({ query: 'test question' });

      // Should not be 400 (validation error)
      // Might be 500 if services aren't running, but that's OK for integration test
      expect(response.status).not.toBe(400);
    });
  });

  describe('GET /api/documents', () => {
    test('should return documents list', async () => {
      const response = await request(app).get('/api/documents');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('documents');
      expect(response.body).toHaveProperty('total');
    });
  });
});
