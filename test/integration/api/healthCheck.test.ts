import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../src/server';

import type { Express } from 'express';

describe('Health Check API', () => {
  let app: Express | undefined;

  beforeAll(async () => {
    try {
      app = await createApp();
    } catch (_error) {
      console.warn('⚠️  Database not available, skipping health check integration tests');
      app = undefined;
    }
  });

  describe('GET /api/health-check', () => {
    it('should return healthy status', async function () {
      if (!app) {
        this.skip();
        return;
      }

      const response = await request(app).get('/api/health-check').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Service is healthy');
      expect(response.body.data).toHaveProperty('status', 'ok');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
    });
  });

  describe('GET /api/health-check/detailed', () => {
    it('should return detailed health information', async function () {
      if (!app) {
        this.skip();
        return;
      }

      const response = await request(app).get('/api/health-check/detailed');

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('redis');
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('metrics');
    });
  });

  describe('GET /api/health-check/ready', () => {
    it('should return readiness status', async function () {
      if (!app) {
        this.skip();
        return;
      }

      const response = await request(app).get('/api/health-check/ready');

      expect(response.body).toHaveProperty('status');
      expect(['ready', 'not ready']).toContain(response.body.status);
    });
  });

  describe('GET /api/health-check/live', () => {
    it('should return liveness status', async function () {
      if (!app) {
        this.skip();
        return;
      }

      const response = await request(app).get('/api/health-check/live').expect(200);

      expect(response.body.status).toBe('alive');
    });
  });
});
