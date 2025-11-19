import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Take Out User', () => {
  let cookieHeader: string | null;

  beforeEach(async () => {
    await TestHelper.refreshDatabase();

    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    const cookies = loginResponse.headers['set-cookie'];
    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  });

  afterEach(async () => {
    await TestHelper.cleanupDatabase();
  });

  describe('Authentication', () => {
    it('should reject take out request without authentication', async () => {
      const response = await supertest(web).post(`${baseUrlTest}/take-out/1`);

      expect(response.status).toBe(401);
    });
  });

  describe('Success Cases', () => {
    it('should successfully take out existing user', async () => {
      // Create user
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'testuser@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      const userId = createResponse.body.data.id;

      // Take out user
      const response = await supertest(web)
        .post(`${baseUrlTest}/take-out/${userId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success to reset password user.');
      expect(response.body.data.active).toBe('Take Out');
      expect(response.body.data.id).toBe(userId);
    });

    it('should set user status to Take Out', async () => {
      // Create user
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      const userId = createResponse.body.data.id;

      // Take out user
      const response = await supertest(web)
        .post(`${baseUrlTest}/take-out/${userId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.active).toBe('Take Out');
    });

    it('should set updated_by to user ID being taken out', async () => {
      // Create user
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      const userId = createResponse.body.data.id;

      // Take out user
      const response = await supertest(web)
        .post(`${baseUrlTest}/take-out/${userId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.updated_by).toBe(userId);
    });

    it('should take out admin user', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/take-out/1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.active).toBe('Take Out');
      expect(response.body.data.id).toBe(1);
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent user ID', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/take-out/999`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The user does not exist!');
    });

    it('should return 404 for zero user ID', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/take-out/0`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The user does not exist!');
    });

    it('should return 404 for negative user ID', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/take-out/-1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The user does not exist!');
    });

    it('should return 404 for very large user ID', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/take-out/999999999`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The user does not exist!');
    });

    it('should return 500 for invalid user ID format', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/take-out/invalid`)
        .set('Cookie', cookieHeader ?? '');

      // Invalid ID format akan menyebabkan error di Prisma
      expect(response.status).toBe(500);
    });
  });

  describe('Multiple Requests', () => {
    it('should handle multiple take out requests for same user', async () => {
      // Create user
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      const userId = createResponse.body.data.id;

      // First take out
      const response1 = await supertest(web)
        .post(`${baseUrlTest}/take-out/${userId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response1.status).toBe(200);
      expect(response1.body.data.active).toBe('Take Out');

      // Second take out (should still work)
      const response2 = await supertest(web)
        .post(`${baseUrlTest}/take-out/${userId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response2.status).toBe(200);
      expect(response2.body.data.active).toBe('Take Out');
    });
  });

  describe('Integration', () => {
    it('should take out user after password reset', async () => {
      // Create user
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      const userId = createResponse.body.data.id;

      // Reset password first
      await supertest(web)
        .post(`${baseUrlTest}/reset-password/${userId}`)
        .set('Cookie', cookieHeader ?? '');

      // Then take out
      const response = await supertest(web)
        .post(`${baseUrlTest}/take-out/${userId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.active).toBe('Take Out');
    });
  });

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      // Create user
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      const userId = createResponse.body.data.id;

      // Take out user
      const response = await supertest(web)
        .post(`${baseUrlTest}/take-out/${userId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.message).toBe('Success to reset password user.');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('updated_by');
    });
  });
});
